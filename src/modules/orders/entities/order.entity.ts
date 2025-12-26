import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from '../../../common/enums/order-status.enum';
import { PaymentProvider } from '../../../common/enums/payment-provider.enum';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Event, (event) => event.id, { onDelete: 'SET NULL' })
  event: Event;

  @Column()
  eventId: string;

  @Column()
  buyerName: string;

  @Column()
  buyerEmail: string;

  @Column({ nullable: true })
  buyerPhone?: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'enum', enum: PaymentProvider, default: PaymentProvider.FREE })
  provider: PaymentProvider;

  @Column({ nullable: true })
  providerReference?: string;

  @Column({ nullable: true })
  providerCheckoutUrl?: string;

  @Column({ type: 'varchar', default: 'NGN' })
  currency: string;

  @Column({ type: 'int', default: 0 })
  amount: number; // total in minor units

  @Column({ type: 'int', default: 0 })
  platformFee: number; // our fee in minor units

  @Column({ type: 'int', default: 0 })
  organizerTakeHome: number; // amount to transfer to organizer

  @Column({ nullable: true })
  payoutAccountId?: string; // link to payouts table (provider-specific id)

  @Column({ nullable: true })
  qrCodeData?: string; // payload for check-in / download

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
