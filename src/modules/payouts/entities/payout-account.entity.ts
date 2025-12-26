import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { PaymentProvider } from '../../../common/enums/payment-provider.enum';

@Entity('payout_accounts')
export class PayoutAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Organization, (org) => org.id, { onDelete: 'CASCADE' })
  organization: Organization;

  @Column()
  organizationId: string;

  @Column({ type: 'enum', enum: PaymentProvider })
  provider: PaymentProvider;

  // Stripe: account id; Paystack: subaccount code or bank details
  @Column()
  externalAccountId: string;

  @Column({ nullable: true })
  bankName?: string;

  @Column({ nullable: true })
  bankCode?: string;

  @Column({ nullable: true })
  accountNumber?: string;

  @Column({ nullable: true })
  accountName?: string;

  @Column({ type: 'varchar', default: 'NGN' })
  currency: string;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
