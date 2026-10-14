import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EarningsController } from './earnings.controller';
import { FareService } from './fare.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [AuthModule], // for the guards
  controllers: [PaymentsController, EarningsController],
  providers: [PaymentsService, FareService],
  // Requests need the fare and the payment; Admin lists and refunds payments.
  exports: [PaymentsService, FareService],
})
export class PaymentsModule {}
