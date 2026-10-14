import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProviderGuard } from '../auth/provider.guard';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
import { RequestsService } from './requests.service';

// A provider working through their jobs.
@Controller('providers/me/jobs')
@UseGuards(JwtAuthGuard, ProviderGuard)
export class ProviderJobsController {
  constructor(private readonly requests: RequestsService) {}

  @Get('current')
  current(@CurrentUser() user: AuthUser) {
    return this.requests.currentFor(user.id);
  }

  @Get('history')
  history(@CurrentUser() user: AuthUser) {
    return this.requests.historyFor(user.id);
  }

  @Post(':id/accept')
  accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.requests.accept(user.id, id);
  }

  @Post(':id/reject')
  reject(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.requests.reject(user.id, id);
  }

  @Post(':id/status')
  status(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateJobStatusDto,
  ) {
    return this.requests.advance(user.id, id, dto.status);
  }
}
