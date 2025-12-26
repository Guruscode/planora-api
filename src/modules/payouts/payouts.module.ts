import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';
import { PayoutAccount } from './entities/payout-account.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { TeamMember } from '../organizations/entities/team-member.entity';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [TypeOrmModule.forFeature([PayoutAccount, Organization, TeamMember]), PaymentsModule],
  controllers: [PayoutsController],
  providers: [PayoutsService],
  exports: [PayoutsService],
})
export class PayoutsModule {}
