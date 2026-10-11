import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProviderGuard } from '../auth/provider.guard';
import { AddDocumentDto } from './dto/add-document.dto';
import { PresenceDto } from './dto/presence.dto';
import { ProvidersService } from './providers.service';

// A provider managing their own account.
@Controller('providers/me')
@UseGuards(JwtAuthGuard, ProviderGuard)
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Get()
  profile(@CurrentUser() user: AuthUser) {
    return this.providers.findByUserId(user.id);
  }

  @Post('documents')
  addDocument(@CurrentUser() user: AuthUser, @Body() dto: AddDocumentDto) {
    return this.providers.addDocument(user.id, dto);
  }

  @Patch('presence')
  presence(@CurrentUser() user: AuthUser, @Body() dto: PresenceDto) {
    return this.providers.setPresence(user.id, dto);
  }
}
