import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Event, EventStatus } from '../events/entities/event.entity';
import { TicketType } from '../tickets/entities/ticket-type.entity';
import { PaymentsService } from '../payments/payments.service';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { PaymentProvider } from '../../common/enums/payment-provider.enum';
import { PayoutAccount } from '../payouts/entities/payout-account.entity';
import { TicketStatus } from '../../common/enums/ticket-status.enum';
import { TeamMember } from '../organizations/entities/team-member.entity';
import { OrgRole } from '../../common/enums/org-role.enum';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

interface CreateOrderInput {
  eventId: string;
  ticketSelections: { ticketTypeId: string; quantity: number }[];
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  attendees?: { name?: string; email?: string }[];
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Event)
    private eventRepo: Repository<Event>,
    @InjectRepository(TicketType)
    private ticketRepo: Repository<TicketType>,
    @InjectRepository(PayoutAccount)
    private payoutRepo: Repository<PayoutAccount>,
    @InjectRepository(TeamMember)
    private teamRepo: Repository<TeamMember>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private paymentsService: PaymentsService,
    private notificationsService: NotificationsService,
  ) {}

  async createOrder(input: CreateOrderInput) {
    const event = await this.eventRepo.findOne({ where: { id: input.eventId } });
    if (!event) throw new NotFoundException('Event not found');
    if (!event.isPublished || event.status !== EventStatus.APPROVED) {
      throw new BadRequestException('Event not published yet');
    }

    const tickets = await this.ticketRepo.findBy({
      id: In(input.ticketSelections.map((t) => t.ticketTypeId)),
    });
    if (tickets.length === 0) throw new NotFoundException('Tickets not found');

    // verify all tickets belong to event
    tickets.forEach((t) => {
      if (t.eventId !== event.id) {
        throw new BadRequestException('Ticket does not belong to event');
      }
    });

    const items: OrderItem[] = [];
    let total = 0;
    let paid = false;
    let currency: string | null = null;

    tickets.forEach((ticket) => {
      const selection = input.ticketSelections.find((s) => s.ticketTypeId === ticket.id);
      if (!selection) return;
      if (selection.quantity <= 0) throw new BadRequestException('Quantity must be greater than zero');
      if (ticket.quantitySold + selection.quantity > ticket.quantityTotal) {
        throw new BadRequestException(`Not enough availability for ${ticket.name}`);
      }
      if (!currency) currency = ticket.currency;
      if (currency && ticket.currency !== currency) {
        throw new BadRequestException('All tickets in an order must use the same currency');
      }
      const itemTotal = ticket.price * selection.quantity;
      total += itemTotal;
      paid = paid || ticket.isPaid;

      const attendees = (input.attendees ?? []).filter(
        (a: any) => (a as any).ticketTypeId === ticket.id,
      );
      const firstAttendee = attendees[0];

      const item = this.orderItemRepo.create({
        ticketTypeId: ticket.id,
        ticketName: ticket.name,
        attendeeName: firstAttendee?.name,
        attendeeEmail: firstAttendee?.email,
        attendees: attendees.slice(0, selection.quantity),
        quantity: selection.quantity,
        unitPrice: ticket.price,
        total: itemTotal,
        qrCode: `${ticket.id}:${Math.random().toString(36).slice(2, 10)}`,
      });
      items.push(item);
    });

    const isFree = !paid || total === 0;

    const order = this.orderRepo.create({
      eventId: event.id,
      buyerName: input.buyerName,
      buyerEmail: input.buyerEmail,
      buyerPhone: input.buyerPhone,
      status: isFree ? OrderStatus.PAID : OrderStatus.PENDING,
      provider: isFree ? PaymentProvider.FREE : this.paymentsService.chooseProvider(event.country),
      currency: currency || 'NGN',
      amount: total,
      items,
    });

    // pick default payout account for split payment if paid
    if (!isFree) {
      const payoutAccount = await this.payoutRepo.findOne({
        where: { organizationId: event.organizationId, isDefault: true, isActive: true },
      });
      if (payoutAccount) {
        order.payoutAccountId = payoutAccount.id;
      } else {
        throw new BadRequestException('Connect a payout account before selling paid tickets');
      }
    }

    const saved = await this.orderRepo.save(order);

    // handle payment or finalize free order
    if (isFree) {
      await this.markTicketsSold(items);
      await this.sendNotifications(items, order);
      return { orderId: saved.id, status: OrderStatus.PAID };
    }

    const paymentInit = await this.paymentsService.startPayment({
      order: saved,
      event,
      items,
      payoutAccountId: order.payoutAccountId,
    });

    saved.providerReference = paymentInit.reference;
    saved.providerCheckoutUrl = paymentInit.checkoutUrl;
    saved.platformFee = paymentInit.platformFee;
    saved.organizerTakeHome = paymentInit.organizerTakeHome;
    await this.orderRepo.save(saved);

    return {
      orderId: saved.id,
      checkoutUrl: paymentInit.checkoutUrl,
      provider: saved.provider,
      reference: paymentInit.reference,
    };
  }

  async checkIn(userId: string, qrCode: string) {
    const item = await this.orderItemRepo.findOne({ where: { qrCode } });
    if (!item) throw new NotFoundException('Ticket not found');
    const order = await this.orderRepo.findOne({ where: { id: item.orderId } });
    if (!order) throw new NotFoundException('Order not found');
    await this.ensureCheckInPermission(userId, order.eventId);
    item.status = TicketStatus.CHECKED_IN;
    await this.orderItemRepo.save(item);
    return { message: 'Checked in', ticket: item };
  }

  async listAttendees(userId: string, eventId: string) {
    await this.ensureCheckInPermission(userId, eventId);
    const orders = await this.orderRepo.find({ where: { eventId, status: OrderStatus.PAID } });
    const orderIds = orders.map((o) => o.id);
    if (orderIds.length === 0) return [];
    return this.orderItemRepo.find({ where: { orderId: In(orderIds) } });
  }

  private async ensureCheckInPermission(userId: string, eventId: string) {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    const membership = await this.teamRepo.findOne({
      where: { userId, organizationId: event.organizationId },
    });
    if (!membership || ![OrgRole.OWNER, OrgRole.ADMIN, OrgRole.MEMBER].includes(membership.role)) {
      throw new ForbiddenException('Not allowed to check in attendees');
    }
  }

  async handlePaymentWebhook(reference: string, success: boolean, provider: PaymentProvider) {
    let order = await this.orderRepo.findOne({ where: { providerReference: reference } });
    if (!order) {
      order = await this.orderRepo.findOne({ where: { id: reference } });
    }
    if (!order) return;
    order.status = success ? OrderStatus.PAID : OrderStatus.FAILED;
    await this.orderRepo.save(order);
    if (success) {
      const items = await this.orderItemRepo.find({ where: { orderId: order.id } });
      await this.markTicketsSold(items);
      await this.sendNotifications(items, order);
    }
  }

  private async markTicketsSold(items: OrderItem[]) {
    const ids = items.map((i) => i.ticketTypeId);
    const tickets = await this.ticketRepo.findBy({ id: In(ids) });
    tickets.forEach((ticket) => {
      const qty = items.find((i) => i.ticketTypeId === ticket.id)?.quantity || 0;
      ticket.quantitySold += qty;
    });
    await this.ticketRepo.save(tickets);
    const itemIds = items.map((i) => i.id).filter(Boolean);
    if (itemIds.length) {
      const storedItems = await this.orderItemRepo.findBy({ id: In(itemIds) });
      storedItems.forEach((item) => {
        item.status = TicketStatus.SOLD;
      });
      await this.orderItemRepo.save(storedItems);
    }
  }

  async listUserTickets(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const buyerOrders = await this.orderRepo.find({
      where: { buyerEmail: user.email, status: OrderStatus.PAID },
    });
    const buyerIds = buyerOrders.map((o) => o.id);

    const itemsFromBuyer = buyerIds.length
      ? await this.orderItemRepo.find({
          where: { orderId: In(buyerIds), status: TicketStatus.SOLD },
        })
      : [];

    const attendeeItems = await this.orderItemRepo.find({
      where: { attendeeEmail: user.email, status: TicketStatus.SOLD },
    });

    return [...itemsFromBuyer, ...attendeeItems];
  }

  async ticketDetail(userId: string, itemId: string) {
    const item = await this.orderItemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Ticket not found');
    await this.ensureTicketOwnership(userId, item);
    return item;
  }

  async ticketDownload(userId: string, itemId: string) {
    const item = await this.orderItemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Ticket not found');
    await this.ensureTicketOwnership(userId, item);
    const content = `Ticket ID: ${item.id}
Order ID: ${item.orderId}
Ticket: ${item.ticketName}
QR: ${item.qrCode}`;
    const base64 = Buffer.from(content, 'utf-8').toString('base64');
    return {
      filename: `ticket-${item.id}.txt`,
      contentType: 'text/plain',
      data: `data:text/plain;base64,${base64}`,
    };
  }

  private async ensureTicketOwnership(userId: string, item: OrderItem) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const order = await this.orderRepo.findOne({ where: { id: item.orderId } });
    if (!order) throw new NotFoundException('Order not found');
    const isBuyer = order.buyerEmail === user.email;
    const isAttendee = item.attendeeEmail === user.email || item.attendees?.some((a) => a.email === user.email);
    if (!isBuyer && !isAttendee) {
      throw new ForbiddenException('Not allowed to view this ticket');
    }
  }

  private async sendNotifications(items: OrderItem[], order: Order) {
    const buyerTitle = 'Your order is confirmed';
    await this.notificationsService.push(
      order.buyerEmail,
      buyerTitle,
      `Order ${order.id} for event ${order.eventId} is confirmed.`,
      'orders',
    );

    for (const item of items) {
      if (item.attendeeEmail) {
        await this.notificationsService.push(
          item.attendeeEmail,
          'Your ticket is ready',
          `Ticket ${item.ticketName} for event ${order.eventId} is ready.`,
          'tickets',
        );
      }
    }
  }
}
