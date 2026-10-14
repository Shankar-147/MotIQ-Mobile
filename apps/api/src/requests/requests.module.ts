import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PaymentsModule } from '../payments/payments.module';
import { ProvidersModule } from '../providers/providers.module';
import { MatchingService } from './matching.service';
import { ProviderJobsController } from './provider-jobs.controller';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

@Module({
  imports: [AuthModule, ProvidersModule, PaymentsModule],
  controllers: [RequestsController, ProviderJobsController],
  providers: [RequestsService, MatchingService],
  exports: [RequestsService], // Admin lists requests and counts them
})
export class RequestsModule {}
