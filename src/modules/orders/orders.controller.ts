import { Body, Controller, Get, Post, Query, Req, UseGuards, BadRequestException, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentProvider } from '../../common/enums/payment-provider.enum';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, Min, ValidateNested, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StripeService } from '../payments/stripe/stripe.service';
import { PaystackService } from '../payments/paystack/paystack.service';
import type { Request } from 'express';

class TicketSelectionDto {
  @IsUUID()
  ticketTypeId: string;

  @Min(1)
  quantity: number;
}

class AttendeeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsUUID()
  ticketTypeId: string;
}

class CreateOrderDto {
  @IsUUID()
  eventId: string;

  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TicketSelectionDto)
  ticketSelections: TicketSelectionDto[];

  @IsString()
  @IsNotEmpty()
  buyerName: string;

  @IsEmail()
  buyerEmail: string;

  @IsOptional()
  @IsString()
  buyerPhone?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AttendeeDto)
  attendees?: AttendeeDto[];
}

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private stripeService: StripeService,
    private paystackService: PaystackService,
  ) {}

  @Public()
  @Post()
  create(@Body() body: CreateOrderDto) {
    return this.ordersService.createOrder(body);
  }

  // Webhook endpoint to be wired via provider webhooks (configure routes in paystack/stripe controllers)
  @Public()
  @Post('webhook/paystack')
  async paystackWebhook(@Req() req: Request) {
    const raw = (req as any).rawBody as Buffer;
    const signature = req.headers['x-paystack-signature'] as string;
    if (!this.paystackService.verifyWebhook(raw, signature)) {
      throw new BadRequestException('Invalid Paystack signature');
    }
    const payload = JSON.parse(raw.toString());
    const reference = payload?.data?.reference;
    const status = payload?.data?.status;
    if (reference) {
      await this.ordersService.handlePaymentWebhook(reference, status === 'success', PaymentProvider.PAYSTACK);
    }
    return { received: true };
  }

  @Public()
  @Post('webhook/stripe')
  async stripeWebhook(@Req() req: Request) {
    const raw = (req as any).rawBody as Buffer;
    const sig = req.headers['stripe-signature'] as string;
    const event = await this.stripeService.verifyWebhook(raw, sig);
    const reference = (event.data?.object as any)?.id;
    const paid =
      event.type === 'payment_intent.succeeded' ||
      (event.data?.object as any)?.status === 'succeeded';
    if (reference) {
      await this.ordersService.handlePaymentWebhook(reference, paid, PaymentProvider.STRIPE);
    }
    return { received: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('check-in')
  async checkIn(@Body('qr') qr: string, @CurrentUser('userId') userId: string) {
    return this.ordersService.checkIn(userId, qr);
  }

  @UseGuards(JwtAuthGuard)
  @Get('attendees')
  async listAttendees(@Query('eventId') eventId: string, @CurrentUser('userId') userId: string) {
    return this.ordersService.listAttendees(userId, eventId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my/tickets')
  async myTickets(@CurrentUser('userId') userId: string) {
    return this.ordersService.listUserTickets(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('ticket/:itemId')
  async ticketDetail(@Param('itemId') itemId: string, @CurrentUser('userId') userId: string) {
    return this.ordersService.ticketDetail(userId, itemId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('ticket/:itemId/download')
  async ticketDownload(@Param('itemId') itemId: string, @CurrentUser('userId') userId: string) {
    return this.ordersService.ticketDownload(userId, itemId);
  }
}
