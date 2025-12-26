import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider } from '../../common/enums/payment-provider.enum';
import { Order } from '../orders/entities/order.entity';
import { Event } from '../events/entities/event.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { StripeService } from './stripe/stripe.service';
import { PaystackService } from './paystack/paystack.service';

@Injectable()
export class PaymentsService {
  constructor(
    private configService: ConfigService,
    private stripeService: StripeService,
    private paystackService: PaystackService,
  ) {}

  chooseProvider(country?: string): PaymentProvider {
    if (!country) return PaymentProvider.STRIPE;
    const normalized = country.toLowerCase();
    if (normalized === 'nigeria' || normalized === 'ng') return PaymentProvider.PAYSTACK;
    if (normalized === 'united states' || normalized === 'usa' || normalized === 'us') {
      return PaymentProvider.STRIPE;
    }
    return PaymentProvider.STRIPE;
  }

  async startPayment(params: {
    order: Order;
    event: Event;
    items: OrderItem[];
    payoutAccountId?: string;
  }): Promise<{ checkoutUrl?: string; reference: string; platformFee: number; organizerTakeHome: number }> {
    const platformFeePercent = Number(this.configService.get('stripe.platformFeePercent') ?? 10);
    const platformFee = Math.round((params.order.amount * platformFeePercent) / 100);
    const organizerTakeHome = Math.max(params.order.amount - platformFee, 0);

    const provider = this.chooseProvider(params.event.country);
    if (provider === PaymentProvider.PAYSTACK) {
      const init = await this.paystackService.initializePayment({
        email: params.order.buyerEmail,
        amount: params.order.amount,
        currency: params.order.currency,
        reference: params.order.id,
        metadata: {
          orderId: params.order.id,
          eventId: params.event.id,
          items: params.items.map((i) => ({ name: i.ticketName, qty: i.quantity })),
        },
        subaccount: params.payoutAccountId,
        platformFee,
      });
      return {
        checkoutUrl: init.authorizationUrl,
        reference: init.reference,
        platformFee,
        organizerTakeHome,
      };
    }

    const stripeInit = await this.stripeService.createPaymentIntent({
      amount: params.order.amount,
      currency: params.order.currency?.toLowerCase() || 'usd',
      applicationFee: platformFee,
      transferDestination: params.payoutAccountId,
      metadata: {
        orderId: params.order.id,
        eventId: params.event.id,
      },
    });

    return {
      checkoutUrl: stripeInit.checkoutUrl,
      reference: stripeInit.reference,
      platformFee,
      organizerTakeHome,
    };
  }
}
