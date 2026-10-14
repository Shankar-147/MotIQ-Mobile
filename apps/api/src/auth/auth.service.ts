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

export interface SignupDetails {
  name?: string;
  role?: 'user' | 'provider';
  businessName?: string;
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
    const list = config.get<string>('ADMIN_PHONES') ?? '';
    this.adminPhones = new Set(
      list.split(',').map((p) => p.trim()).filter(Boolean).map(normalizePhone),
    );
  }

  async requestOtp(phoneNumber: string): Promise<void> {
    const phone = normalizePhone(phoneNumber);
    const code = await this.otpStore.generate(phone);
    // TODO: send by SMS once a provider is chosen. Until then it is logged.
    console.log(`[dev] OTP for ${phone}: ${code}`);
  }

  // `signup` only matters the first time a number logs in: it says whether
  // this person is a customer or a service provider.
  async verifyOtp(
    phoneNumber: string,
    code: string,
    signup: SignupDetails = {},
  ): Promise<SessionToken> {
    const phone = normalizePhone(phoneNumber);
    if (!(await this.otpStore.verify(phone, code))) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // First successful login creates the user (and the provider profile
    // for someone signing up as a provider).
    const isAdmin = this.adminPhones.has(phone);
    const role = isAdmin ? 'admin' : signup.role === 'provider' ? 'provider' : 'user';
    const user = await this.prisma.user.upsert({
      where: { phoneNumber: phone },
      create: {
        phoneNumber: phone,
        name: signup.name,
        role,
        providerProfile:
          role === 'provider'
            ? { create: { businessName: signup.businessName || signup.name || 'Service provider' } }
            : undefined,
      },
      update: isAdmin ? { role: 'admin' } : {},
    });
    if (user.status === 'suspended') {
      throw new ForbiddenException('This account is suspended');
    }

    const accessToken = this.jwt.sign(
      { sub: user.id, role: user.role },
      { expiresIn: TOKEN_TTL_SECONDS },
    );
    return { accessToken, expiresIn: TOKEN_TTL_SECONDS };
  }
}
