import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TicketType } from './entities/ticket-type.entity';
import { Event } from '../events/entities/event.entity';
import { TeamMember } from '../organizations/entities/team-member.entity';
import { TicketKind, TicketVisibility } from '../../common/enums/ticket-type.enum';

interface UpsertTicketInput {
  eventId: string;
  name: string;
  kind: TicketKind;
  isPaid: boolean;
  currency?: string;
  price?: number;
  groupSize?: number;
  visibility?: TicketVisibility;
  description?: string;
  perks?: string[];
  salesStart?: Date;
  salesEnd?: Date;
  quantityTotal: number;
}

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(TicketType)
    private ticketRepo: Repository<TicketType>,
    @InjectRepository(Event)
    private eventRepo: Repository<Event>,
    @InjectRepository(TeamMember)
    private teamRepo: Repository<TeamMember>,
  ) {}

  // ensure caller belongs to the organization that owns the event
  private async assertOrgAccess(userId: string, eventId: string) {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');

    const membership = await this.teamRepo.findOne({
      where: { userId, organizationId: event.organizationId, status: In(['accepted', 'pending']) },
    });

    if (!membership) throw new ForbiddenException('You do not manage this event');
    return event;
  }

  async create(userId: string, input: UpsertTicketInput) {
    const event = await this.assertOrgAccess(userId, input.eventId);

    if (input.salesStart && input.salesEnd && input.salesStart >= input.salesEnd) {
      throw new BadRequestException('Sales end must be after sales start');
    }

    const ticket = this.ticketRepo.create({
      ...input,
      eventId: event.id,
      currency: input.currency || (event.country === 'Nigeria' || event.country === 'NG' ? 'NGN' : 'USD'),
      groupSize: input.groupSize || 1,
      visibility: input.visibility || TicketVisibility.PUBLIC,
      price: input.price ?? 0,
      perks: input.perks?.length ? input.perks : undefined,
    });

    return this.ticketRepo.save(ticket);
  }

  async update(userId: string, id: string, input: Partial<UpsertTicketInput>) {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    await this.assertOrgAccess(userId, ticket.eventId);

    if (input.salesStart && input.salesEnd && input.salesStart >= input.salesEnd) {
      throw new BadRequestException('Sales end must be after sales start');
    }

    Object.assign(ticket, input);
    return this.ticketRepo.save(ticket);
  }

  async listForEvent(userId: string, eventId: string) {
    await this.assertOrgAccess(userId, eventId);
    return this.ticketRepo.find({ where: { eventId }, order: { createdAt: 'ASC' } });
  }

  async listPublic(eventId: string) {
    return this.ticketRepo.find({
      where: { eventId, isActive: true },
      order: { price: 'ASC' },
    });
  }

  async delete(userId: string, id: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    await this.assertOrgAccess(userId, ticket.eventId);
    await this.ticketRepo.remove(ticket);
    return { message: 'Ticket deleted' };
  }
}
