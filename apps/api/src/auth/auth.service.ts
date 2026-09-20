import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OtpStoreService } from './otp-store.service';

interface SessionToken {
  accessToken: string;
  expiresIn: number;
}

const TOKEN_TTL_SECONDS = 60 * 60 * 24; // 24h

@Injectable()
export class AuthService {
  constructor(
    private readonly otpStore: OtpStoreService,
    private readonly jwt: JwtService,
  ) {}

  requestOtp(phoneNumber: string): void {
    const code = this.otpStore.generate(phoneNumber);
    // TODO: send via SMS instead of logging once we pick a provider.
    console.log(`[dev] OTP for ${phoneNumber}: ${code}`);
  }

  verifyOtp(phoneNumber: string, code: string): SessionToken {
    const isValid = this.otpStore.verify(phoneNumber, code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    const accessToken = this.jwt.sign(
      { sub: phoneNumber },
      { expiresIn: TOKEN_TTL_SECONDS },
    );
    return { accessToken, expiresIn: TOKEN_TTL_SECONDS };
  }
}
