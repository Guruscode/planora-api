import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Organization } from './organization.entity';
import { OrgRole } from '../../../common/enums/org-role.enum';

@Entity('team_members')
export class TeamMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Organization, (org) => org.teamMembers)
  organization: Organization;

  @Column()
  organizationId: string;

  @Column({ type: 'enum', enum: OrgRole, default: OrgRole.MEMBER })
  role: OrgRole;

  @Column({ default: 'pending' })
  status: 'pending' | 'accepted';

  @CreateDateColumn()
  invitedAt: Date;

  @Column({ nullable: true })
  acceptedAt?: Date;
}