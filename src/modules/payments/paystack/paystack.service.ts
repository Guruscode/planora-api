import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// paystack-sdk exports default/class + named Paystack
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PaystackSdk = require('paystack-sdk');
import * as crypto from 'crypto';

interface InitPaymentInput {
  email: string;
  amount: number;
  currency: string;
  reference: string;
  metadata?: Record<string, any>;
  subaccount?: string; // payout account id for split
  platformFee?: number;
}

@Injectable()
export class PaystackService {
  private client: any;

  constructor(private configService: ConfigService) {
    const secret = this.configService.get<string>('paystack.secretKey');
    if (secret) {
      const Client = PaystackSdk.default || PaystackSdk.Paystack || PaystackSdk;
      this.client = new Client(secret);
    }
  }

  async initializePayment(input: InitPaymentInput): Promise<{ authorizationUrl: string; reference: string }> {
    if (!this.client) throw new BadRequestException('Paystack not configured');

    const payload: any = {
      email: input.email,
      amount: input.amount,
      currency: input.currency || 'NGN',
      reference: input.reference,
      metadata: input.metadata || {},
    };

    // split payment: forward remainder to subaccount, keep platform fee
    if (input.subaccount) {
      payload.subaccount = input.subaccount;
      if (input.platformFee && input.platformFee > 0) {
        payload.bearer = 'subaccount';
        payload.transaction_charge = input.platformFee;
      }
    }

    const res = await this.client.transaction.initialize(payload);
    return {
      authorizationUrl: res.data.authorization_url,
      reference: res.data.reference,
    };
  }

  async createSubaccount(params: {
    businessName: string;
    settlementBank: string;
    accountNumber: string;
    percentageCharge: number;
  }) {
    if (!this.client) throw new BadRequestException('Paystack not configured');
    const res = await this.client.subaccount.create({
      business_name: params.businessName,
      settlement_bank: params.settlementBank,
      account_number: params.accountNumber,
      percentage_charge: params.percentageCharge,
    });
    return res.data?.subaccount_code;
  }

  verifyWebhook(rawBody: Buffer, signature: string): boolean {
    const secret = this.configService.get<string>('paystack.webhookSecret');
    if (!secret || !signature) return false;
    const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
    return hash === signature;
  }
}
