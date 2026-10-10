import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { OtpStoreService } from './otp-store.service';
import { normalizePhone } from './phone';

interface SessionToken {
  accessToken: string;
  expiresIn: number;
}

const TOKEN_TTL_SECONDS = 60 * 60 * 24; // 24h

@Injectable()
export class AuthService {
  private readonly adminPhones: Set<string>;

  constructor(
    private readonly otpStore: OtpStoreService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const raw = config.get<string>('ADMIN_PHONES') ?? '';
    this.adminPhones = new Set(
      raw.split(',').map((p) => p.trim()).filter(Boolean).map(normalizePhone),
    );
  }

  requestOtp(phoneNumber: string): void {
    const phone = normalizePhone(phoneNumber);
    const code = this.otpStore.generate(phone);
    // TODO: send via SMS instead of logging once we pick a provider.
    console.log(`[dev] OTP for ${phone}: ${code}`);
  }

  async verifyOtp(phoneNumber: string, code: string): Promise<SessionToken> {
    const phone = normalizePhone(phoneNumber);
    if (!this.otpStore.verify(phone, code)) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const isAdmin = this.adminPhones.has(phone);
    const user = await this.prisma.user.upsert({
      where: { phoneNumber: phone },
      create: { phoneNumber: phone, role: isAdmin ? 'admin' : 'user' },
      update: isAdmin ? { role: 'admin' } : {},
    });
    if (user.status === 'suspended') {
      throw new ForbiddenException('Account suspended');
    }

    const accessToken = this.jwt.sign({ sub: user.id }, { expiresIn: TOKEN_TTL_SECONDS });
    return { accessToken, expiresIn: TOKEN_TTL_SECONDS };
  }
}
