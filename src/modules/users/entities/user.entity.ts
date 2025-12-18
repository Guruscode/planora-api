import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '../../../common/enums/user-role.enum';
import * as bcrypt from 'bcrypt';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')  // ← THIS LINE CHANGED
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  fullName?: string;

  @Column({ nullable: true })
  photoUrl?: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.GUEST })
  role: UserRole;

  @Column({ select: false })  // ← KEEP THIS
  password: string;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ default: false })
  isPhoneVerified: boolean;

  @Column({ nullable: true })
  otpCode?: string;

  @Column({ nullable: true })
  otpExpiresAt?: Date;

  @Column({ nullable: true })
  refreshToken?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  inviteCode?: string;

  @Column({ nullable: true })
  inviteCodeExpiresAt?: Date;

  
  // Optional: auto-generate UUID if not provided (extra safety)
  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

// ONE hashPassword method — final version
  @BeforeInsert()
  @BeforeUpdate()
  private async hashPassword() {
    if (this.password && !this.password.startsWith('$2b$')) {
      console.log('Hashing password for:', this.email);
      this.password = await bcrypt.hash(this.password, 12);
    }
  }
  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}