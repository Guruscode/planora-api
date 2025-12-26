import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StripeService } from './stripe/stripe.service';
import { PaystackService } from './paystack/paystack.service';

@Module({
  imports: [ConfigModule],
  providers: [PaymentsService, StripeService, PaystackService],
  controllers: [PaymentsController],
  exports: [PaymentsService, StripeService, PaystackService],
})
export class PaymentsModule {}
