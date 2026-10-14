import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

@Module({
  imports: [AuthModule], // for the guards
  controllers: [ProvidersController],
  providers: [ProvidersService],
  // Requests need findAvailable() for matching; Admin needs the review calls.
  exports: [ProvidersService],
})
export class ProvidersModule {}
