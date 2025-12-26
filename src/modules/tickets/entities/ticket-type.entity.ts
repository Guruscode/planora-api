import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { TicketKind, TicketVisibility } from '../../../common/enums/ticket-type.enum';

@Entity('ticket_types')
export class TicketType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Event, (event) => event.id, { onDelete: 'CASCADE' })
  event: Event;

  @Column()
  eventId: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: TicketKind, default: TicketKind.SINGLE })
  kind: TicketKind;

  @Column({ type: 'boolean', default: false })
  isPaid: boolean;

  @Column({ type: 'varchar', default: 'NGN' })
  currency: string;

  @Column({ type: 'int', default: 0 })
  price: number; // minor units (kobo/cents)

  @Column({ type: 'int', default: 1 })
  groupSize: number;

  @Column({ type: 'enum', enum: TicketVisibility, default: TicketVisibility.PUBLIC })
  visibility: TicketVisibility;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'simple-array', nullable: true })
  perks?: string[];

  @Column({ type: 'timestamp', nullable: true })
  salesStart?: Date;

  @Column({ type: 'timestamp', nullable: true })
  salesEnd?: Date;

  @Column({ type: 'int', default: 0 })
  quantityTotal: number;

  @Column({ type: 'int', default: 0 })
  quantitySold: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
