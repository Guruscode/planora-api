import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('provider')
  getProvider(@Query('country') country?: string) {
    return { provider: this.paymentsService.chooseProvider(country) };
  }
}
