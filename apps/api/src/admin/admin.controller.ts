import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PageQuery } from '../common/pagination';
import { ListPaymentsQuery } from '../payments/dto/list-payments.query';
import { PaymentsService } from '../payments/payments.service';
import { AdminUsersService } from './admin-users.service';
import { AuditService } from './audit.service';
import { ListUsersQuery } from './dto/list-users.query';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

// Logged in AND an admin. JwtAuthGuard runs first and sets request.user,
// then AdminGuard checks its role.
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly users: AdminUsersService,
    private readonly payments: PaymentsService,
    private readonly audit: AuditService,
  ) {}

  @Get('stats')
  async stats() {
    const [users, payments] = await Promise.all([
      this.users.countByStatus(),
      this.payments.summary(),
    ]);
    return { users, payments };
  }

  @Get('users')
  findAll(@Query() query: ListUsersQuery) {
    return this.users.findAll(query);
  }

  @Get('users/:id')
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Patch('users/:id/status')
  updateStatus(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.users.updateStatus(admin.id, id, dto.status);
  }

  @Get('payments')
  listPayments(@Query() query: ListPaymentsQuery) {
    return this.payments.listAll(query);
  }

  @Post('payments/:id/refund')
  async refund(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    const payment = await this.payments.refund(id);
    await this.audit.record(admin.id, 'payment.refunded', id, `${payment.amount} ${payment.currency}`);
    return payment;
  }

  @Get('audit')
  listAudit(@Query() query: PageQuery) {
    return this.audit.list(query);
  }
}
