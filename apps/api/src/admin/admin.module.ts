import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PaymentsModule } from '../payments/payments.module';
import { ProvidersModule } from '../providers/providers.module';
import { RequestsModule } from '../requests/requests.module';
import { AdminController } from './admin.controller';
import { AdminUsersService } from './admin-users.service';
import { AuditService } from './audit.service';

@Module({
  // Guards, plus the services the admin screens read from.
  imports: [AuthModule, PaymentsModule, ProvidersModule, RequestsModule],
  controllers: [AdminController],
  providers: [AdminUsersService, AuditService],
  exports: [AdminUsersService],
})
export class AdminModule {}
