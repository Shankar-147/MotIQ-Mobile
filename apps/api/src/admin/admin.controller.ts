import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth-user';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get('users')
  findAll() {
    return this.adminUsersService.findAll();
  }

  @Get('users/:id')
  findOne(@Param('id') id: string) {
    return this.adminUsersService.findOne(id);
  }

  @Patch('users/:id/status')
  updateStatus(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminUsersService.updateStatus(admin.id, id, dto.status);
  }

  @Get('payments')
  findAllPayments() {
    return this.adminUsersService.findAllPayments();
  }
}
