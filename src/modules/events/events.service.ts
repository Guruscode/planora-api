// src/modules/events/events.service.ts

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Event, EventStatus, EventType } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { TeamMember } from '../organizations/entities/team-member.entity';
import { SavedEvent } from './entities/saved-event.entity';
import { TicketType } from '../tickets/entities/ticket-type.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { OrderStatus } from '../../common/enums/order-status.enum';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(SavedEvent)
    private readonly savedRepo: Repository<SavedEvent>,
    @InjectRepository(TicketType)
    private readonly ticketRepo: Repository<TicketType>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
  ) {}

  // Helper: ensure user belongs to the organization
  private async verifyOrganizationOwnership(userId: string, organizationId: string) {
    const membership = await this.teamMemberRepository.findOne({
      where: { userId, organizationId },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this organization');
    }
  }

  async create(userId: string, organizationId: string, dto: CreateEventDto): Promise<Event> {
    await this.verifyOrganizationOwnership(userId, organizationId);

    if (dto.startDateTime >= dto.endDateTime) {
      throw new BadRequestException('End date/time must be after start date/time');
    }

    const event = this.eventsRepository.create({
      ...dto,
      organizationId,
      status: EventStatus.DRAFT,
      isPublished: false,
    });

    return this.eventsRepository.save(event);
  }

  async findAllByOrganization(userId: string, organizationId: string): Promise<Event[]> {
    await this.verifyOrganizationOwnership(userId, organizationId);

    return this.eventsRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      relations: ['organization'], // optional
    });
  }

  async findDrafts(userId: string, organizationId: string): Promise<Event[]> {
    await this.verifyOrganizationOwnership(userId, organizationId);

    return this.eventsRepository.find({
      where: { organizationId, status: EventStatus.DRAFT },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId?: string, organizationId?: string): Promise<Event> {
    const where: any = { id };

    if (organizationId && userId) {
      await this.verifyOrganizationOwnership(userId, organizationId);
      where.organizationId = organizationId;
    }

    const event = await this.eventsRepository.findOne({
      where,
      relations: ['organization'],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async update(
    id: string,
    userId: string,
    organizationId: string,
    dto: UpdateEventDto,
  ): Promise<Event> {
    const event = await this.findOne(id, userId, organizationId);

    // Prevent updating approved/live events (admin only)
    if ([EventStatus.APPROVED, EventStatus.LIVE, EventStatus.COMPLETED].includes(event.status)) {
      throw new ForbiddenException('Cannot update an approved or live event');
    }

    Object.assign(event, dto);
    return this.eventsRepository.save(event);
  }

  async submitForApproval(id: string, userId: string, organizationId: string): Promise<Event> {
    const event = await this.findOne(id, userId, organizationId);

    if (event.status !== EventStatus.DRAFT) {
      throw new BadRequestException('Only draft events can be submitted for approval');
    }

    // Basic validation before submission
    if (!event.bannerUrl || event.tags.length === 0) {
      throw new BadRequestException('Event must have a banner and at least one tag');
    }

    event.status = EventStatus.PENDING_APPROVAL;
    event.isPublished = true; // now visible in admin panel

    return this.eventsRepository.save(event);
  }

  async delete(id: string, userId: string, organizationId: string): Promise<void> {
    const event = await this.findOne(id, userId, organizationId);

    if ([EventStatus.APPROVED, EventStatus.LIVE].includes(event.status)) {
      throw new ForbiddenException('Cannot delete approved or live events');
    }

    await this.eventsRepository.remove(event);
  }

  async approve(id: string) {
    const event = await this.eventsRepository.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    event.status = EventStatus.APPROVED;
    event.isPublished = true;
    return this.eventsRepository.save(event);
  }

  async reject(id: string, reason?: string) {
    const event = await this.eventsRepository.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    event.status = EventStatus.REJECTED;
    event.isPublished = false;
    return this.eventsRepository.save(event);
  }

  // Public feed - only approved & active events
  async getPublicFeed(filters?: {
    country?: string;
    state?: string;
    tags?: string[];
    upcoming?: boolean;
  }): Promise<Event[]> {
    const qb = this.eventsRepository.createQueryBuilder('event');

    qb.where('event.status = :status', { status: EventStatus.APPROVED })
      .andWhere('event.isActive = true');

    if (filters?.country) {
      qb.andWhere('event.country = :country', { country: filters.country });
    }

    if (filters?.state) {
      qb.andWhere('event.state = :state', { state: filters.state });
    }

    if (filters?.tags && filters.tags.length > 0) {
      qb.andWhere('event.tags && :tags', { tags: filters.tags });
    }

    if (filters?.upcoming !== false) {
      qb.andWhere('event.startDateTime >= CURRENT_TIMESTAMP');
    }

    qb.orderBy('event.startDateTime', 'ASC');

    return qb.getMany();
  }

  async getPublicEventById(id: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: {
        id,
        status: EventStatus.APPROVED,
        isActive: true,
      },
      relations: ['organization'],
    });

    if (!event) {
      throw new NotFoundException('Event not found or not available');
    }

    return event;
  }

  async getRecommended(limit = 5) {
    return this.eventsRepository.find({
      where: { status: EventStatus.APPROVED, isActive: true },
      order: { startDateTime: 'ASC' },
      take: limit,
    });
  }

  // Saved events
  async saveEvent(userId: string, eventId: string) {
    const exists = await this.savedRepo.findOne({ where: { userId, eventId } });
    if (exists) return exists;
    const saved = this.savedRepo.create({ userId, eventId });
    return this.savedRepo.save(saved);
  }

  async unsaveEvent(userId: string, eventId: string) {
    await this.savedRepo.delete({ userId, eventId });
    return { message: 'Removed' };
  }

  async listSaved(userId: string) {
    return this.savedRepo.find({ where: { userId }, relations: ['event'] });
  }

  async analyticsSummary() {
    const total = await this.eventsRepository.count();
    const approved = await this.eventsRepository.count({ where: { status: EventStatus.APPROVED } });
    const pending = await this.eventsRepository.count({ where: { status: EventStatus.PENDING_APPROVAL } });
    const draft = await this.eventsRepository.count({ where: { status: EventStatus.DRAFT } });
    return { total, approved, pending, draft };
  }

  async eventMetrics(eventId: string) {
    const event = await this.eventsRepository.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');

    const tickets = await this.ticketRepo.find({ where: { eventId } });
    const totalQty = tickets.reduce((sum, t) => sum + t.quantityTotal, 0);
    const soldQty = tickets.reduce((sum, t) => sum + t.quantitySold, 0);
    const revenue = tickets.reduce((sum, t) => sum + t.price * t.quantitySold, 0);

    const orders = await this.orderRepo.find({ where: { eventId, status: OrderStatus.PAID } });
    const orderIds = orders.map((o) => o.id);
    const items = orderIds.length
      ? await this.orderItemRepo.find({ where: { orderId: In(orderIds) } })
      : [];

    const perTicket = tickets.map((t) => {
      const sold = items
        .filter((i) => i.ticketTypeId === t.id && i.status !== 'refunded')
        .reduce((sum, i) => sum + i.quantity, 0);
      const checkedIn = items
        .filter((i) => i.ticketTypeId === t.id && i.status === 'checked_in')
        .reduce((sum, i) => sum + i.quantity, 0);
      const revenue = sold * t.price;
      return {
        id: t.id,
        name: t.name,
        isPaid: t.isPaid,
        price: t.price,
        sold,
        available: t.quantityTotal - t.quantitySold,
        checkedIn,
        revenue,
      };
    });

    return {
      eventId,
      tickets: tickets.length,
      totalQty,
      soldQty,
      availableQty: totalQty - soldQty,
      revenue,
      perTicket,
    };
  }
}
