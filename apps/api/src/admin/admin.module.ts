import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PaymentsModule } from '../payments/payments.module';
import { AdminController } from './admin.controller';
import { AdminUsersService } from './admin-users.service';
import { AuditService } from './audit.service';

@Module({
  imports: [AuthModule, PaymentsModule], // guards, and PaymentsService for refunds
  controllers: [AdminController],
  providers: [AdminUsersService, AuditService],
  exports: [AdminUsersService],
})
export class AdminModule {}
