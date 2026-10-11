import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProviderGuard } from '../auth/provider.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';

// A provider looking at their own money.
@Controller('providers/me/earnings')
@UseGuards(JwtAuthGuard, ProviderGuard)
export class EarningsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async earnings(@CurrentUser() user: AuthUser) {
    const profile = await this.prisma.providerProfile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      return { paid: 0, waiting: 0, jobs: [] };
    }
    return this.payments.earningsFor(profile.id);
  }
}
