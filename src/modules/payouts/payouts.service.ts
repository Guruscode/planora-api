import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayoutAccount } from './entities/payout-account.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { TeamMember } from '../organizations/entities/team-member.entity';
import { PaymentProvider } from '../../common/enums/payment-provider.enum';
import { PaystackService } from '../payments/paystack/paystack.service';
import { StripeService } from '../payments/stripe/stripe.service';

interface ConnectPayoutInput {
  organizationId: string;
  provider: PaymentProvider;
  externalAccountId: string;
  currency?: string;
  bankName?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  isDefault?: boolean;
}

@Injectable()
export class PayoutsService {
  constructor(
    @InjectRepository(PayoutAccount)
    private payoutRepo: Repository<PayoutAccount>,
    @InjectRepository(Organization)
    private orgRepo: Repository<Organization>,
    @InjectRepository(TeamMember)
    private teamRepo: Repository<TeamMember>,
    private paystackService: PaystackService,
    private stripeService: StripeService,
  ) {}

  private async assertOrgAdmin(userId: string, organizationId: string) {
    const membership = await this.teamRepo.findOne({
      where: { userId, organizationId },
    });
    if (!membership) throw new ForbiddenException('Not in organization');
    const org = await this.orgRepo.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');
    return { membership, org };
  }

  async connect(userId: string, input: ConnectPayoutInput) {
    await this.assertOrgAdmin(userId, input.organizationId);

    if (input.isDefault) {
      await this.payoutRepo.update(
        { organizationId: input.organizationId },
        { isDefault: false },
      );
    }

    const payout = this.payoutRepo.create({
      ...input,
      currency: input.currency || (input.provider === PaymentProvider.PAYSTACK ? 'NGN' : 'USD'),
      isDefault: input.isDefault ?? true,
    });

    return this.payoutRepo.save(payout);
  }

  async list(userId: string, organizationId: string) {
    await this.assertOrgAdmin(userId, organizationId);
    return this.payoutRepo.find({ where: { organizationId } });
  }

  async createPaystackSubaccount(userId: string, organizationId: string, payload: {
    bankCode: string;
    accountNumber: string;
    percentageCharge: number;
  }) {
    const { org } = await this.assertOrgAdmin(userId, organizationId);
    const code = await this.paystackService.createSubaccount({
      businessName: org.name,
      settlementBank: payload.bankCode,
      accountNumber: payload.accountNumber,
      percentageCharge: payload.percentageCharge,
    });
    return { subaccountCode: code };
  }

  async createStripeConnect(userId: string, organizationId: string) {
    await this.assertOrgAdmin(userId, organizationId);
    return this.stripeService.createConnectAccount();
  }
}
