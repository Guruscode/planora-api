// src/entities/event.entity.ts  (or src/modules/events/entities/event.entity.ts)

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';

export enum EventStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  LIVE = 'live', // optionally when event starts
  COMPLETED = 'completed',
}

export enum EventType {
  PHYSICAL = 'physical',
  VIRTUAL = 'virtual',
  HYBRID = 'hybrid',
}

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ nullable: true })
  bannerUrl?: string;

  @Column({ type: 'timestamp' })
  startDateTime: Date;

  @Column({ type: 'timestamp' })
  endDateTime: Date;

  @Column({
    type: 'enum',
    enum: EventType,
    default: EventType.PHYSICAL,
  })
  type: EventType;

  // Location fields
  @Column()
  country: string;

  @Column()
  state: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  locationName?: string;

  // Virtual fields
  @Column({ nullable: true })
  virtualUrl?: string;

  @Column({ nullable: true })
  customUrlSlug?: string; // e.g., planorra/explore/[slug]

  // Social links
  @Column({ nullable: true })
  instagram?: string;

  @Column({ nullable: true })
  twitter?: string;

  @Column({ nullable: true })
  facebook?: string;

  // Tags
  @Column('simple-array', { default: [] })
  tags: string[];

  // Timezone
  @Column({ default: 'Africa/Lagos' })
  timezone: string;

  // Approval & status
  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.DRAFT,
  })
  status: EventStatus;

  @Column({ default: false })
  isPublished: boolean; // Organizer can save as draft

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization, (org) => org.events, { onDelete: 'CASCADE' })
  @JoinColumn()
  organization: Organization;

  @Column()
  organizationId: string;

  // Later: OneToMany ticket types, orders, etc.
  // @OneToMany(() => TicketType, (ticket) => ticket.event, { cascade: true })
  // ticketTypes: TicketType[];
}
