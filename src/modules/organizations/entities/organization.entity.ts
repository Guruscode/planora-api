// src/modules/organizations/entities/organization.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TeamMember } from './team-member.entity';
import { Event } from '../../events/entities/event.entity';

import { OrgRole } from '../../../common/enums/org-role.enum';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true, nullable: true })
  slug?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  logoUrl?: string;

  @Column({ nullable: true })
  website?: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => TeamMember, (member) => member.organization, { cascade: true })
  teamMembers: TeamMember[];

  @OneToMany(() => Event, (event) => event.organization)
  events: Event[];
}
