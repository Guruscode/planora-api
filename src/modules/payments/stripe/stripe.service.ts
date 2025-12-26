import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

interface CreatePaymentIntentInput {
  amount: number;
  currency: string;
  applicationFee: number;
  transferDestination?: string | null;
  metadata?: Record<string, string>;
}

@Injectable()
export class StripeService {
  private stripe: Stripe | null;

  constructor(private configService: ConfigService) {
    const secret = this.configService.get<string>('stripe.secretKey');
    this.stripe = secret ? new Stripe(secret) : null;
  }

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<{ reference: string; checkoutUrl?: string }> {
    if (!this.stripe) throw new BadRequestException('Stripe not configured');

    const intent = await this.stripe.paymentIntents.create({
      amount: input.amount,
      currency: input.currency,
      payment_method_types: ['card'],
      metadata: input.metadata,
      application_fee_amount: input.applicationFee,
      transfer_data: input.transferDestination
        ? {
            destination: input.transferDestination,
          }
        : undefined,
    });

    return {
      reference: intent.id,
      checkoutUrl: undefined,
    };
  }

  async createConnectAccount(): Promise<{ accountId: string; onboardingUrl: string }> {
    if (!this.stripe) throw new BadRequestException('Stripe not configured');
    const account = await this.stripe.accounts.create({
      type: 'express',
    });
    const accountLink = await this.stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${this.configService.get('app.frontendUrl')}/payout/stripe/refresh`,
      return_url: `${this.configService.get('app.frontendUrl')}/payout/stripe/return`,
      type: 'account_onboarding',
    });
    return { accountId: account.id, onboardingUrl: accountLink.url };
  }

  async verifyWebhook(rawBody: Buffer, signature: string) {
    if (!this.stripe) throw new BadRequestException('Stripe not configured');
    const secret = this.configService.get<string>('stripe.webhookSecret');
    if (!secret) throw new BadRequestException('Stripe webhook secret missing');
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }
}
