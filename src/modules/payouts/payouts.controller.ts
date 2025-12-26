import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PayoutsService } from './payouts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentProvider } from '../../common/enums/payment-provider.enum';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

class ConnectPayoutDto {
  @IsUUID()
  organizationId: string;

  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @IsString()
  externalAccountId: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankCode?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  isDefault?: boolean;
}

@ApiTags('payouts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('payouts')
export class PayoutsController {
  constructor(private payoutsService: PayoutsService) {}

  @Post()
  connect(@CurrentUser('userId') userId: string, @Body() body: ConnectPayoutDto) {
    return this.payoutsService.connect(userId, body);
  }

  @Get()
  list(@CurrentUser('userId') userId: string, @Query('organizationId') organizationId: string) {
    return this.payoutsService.list(userId, organizationId);
  }

  @Post('paystack/subaccount')
  createPaystackSub(
    @CurrentUser('userId') userId: string,
    @Body() body: { organizationId: string; bankCode: string; accountNumber: string; percentageCharge: number },
  ) {
    return this.payoutsService.createPaystackSubaccount(userId, body.organizationId, body);
  }

  @Post('stripe/connect')
  createStripeConnect(
    @CurrentUser('userId') userId: string,
    @Body() body: { organizationId: string },
  ) {
    return this.payoutsService.createStripeConnect(userId, body.organizationId);
  }
}
