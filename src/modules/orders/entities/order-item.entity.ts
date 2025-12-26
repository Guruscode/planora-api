import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { Order } from './order.entity';
import { TicketStatus } from '../../../common/enums/ticket-status.enum';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  order: Order;

  @Column()
  orderId: string;

  @Column()
  ticketTypeId: string;

  @Column()
  ticketName: string;

  @Column({ nullable: true })
  attendeeName?: string;

  @Column({ nullable: true })
  attendeeEmail?: string;

  @Column({ type: 'jsonb', nullable: true })
  attendees?: { name?: string; email?: string }[];

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'int', default: 0 })
  unitPrice: number;

  @Column({ type: 'int', default: 0 })
  total: number;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.AVAILABLE })
  status: TicketStatus;

  @Column({ nullable: true })
  qrCode?: string;
}
