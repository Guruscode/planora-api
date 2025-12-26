import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { Event } from './entities/event.entity';
import { TeamMember } from '../organizations/entities/team-member.entity';
import { SavedEvent } from './entities/saved-event.entity';
import { TicketType } from '../tickets/entities/ticket-type.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Event, TeamMember, SavedEvent, TicketType, Order, OrderItem])],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
