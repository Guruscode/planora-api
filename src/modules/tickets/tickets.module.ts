import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketType } from './entities/ticket-type.entity';
import { Event } from '../events/entities/event.entity';
import { TeamMember } from '../organizations/entities/team-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TicketType, Event, TeamMember])],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
