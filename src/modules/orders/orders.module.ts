import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Event } from '../events/entities/event.entity';
import { TicketType } from '../tickets/entities/ticket-type.entity';
import { TeamMember } from '../organizations/entities/team-member.entity';
import { PaymentsModule } from '../payments/payments.module';
import { PayoutAccount } from '../payouts/entities/payout-account.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Event, TicketType, TeamMember, PayoutAccount, User]),
    PaymentsModule,
    NotificationsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
