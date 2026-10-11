import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

/**
 * Keeps one pending OTP per phone number in the otp_challenge table.
 * Only a hash of the code is stored, never the code itself.
 */
@Injectable()
export class OtpStoreService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(phoneNumber: string): Promise<string> {
    const existing = await this.prisma.otpChallenge.findUnique({ where: { phoneNumber } });
    if (existing && Date.now() - existing.issuedAt.getTime() < RESEND_COOLDOWN_MS) {
      throw new HttpException(
        'Please wait before requesting another code',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const now = Date.now();
    const data = {
      codeHash: this.hash(code),
      expiresAt: new Date(now + OTP_TTL_MS),
      attempts: 0,
      issuedAt: new Date(now),
    };
    await this.prisma.otpChallenge.upsert({
      where: { phoneNumber },
      create: { phoneNumber, ...data },
      update: data,
    });
    return code;
  }

  async verify(phoneNumber: string, code: string): Promise<boolean> {
    const entry = await this.prisma.otpChallenge.findUnique({ where: { phoneNumber } });
    if (!entry) return false;

    if (Date.now() > entry.expiresAt.getTime() || entry.attempts >= MAX_ATTEMPTS) {
      await this.prisma.otpChallenge.deleteMany({ where: { phoneNumber } });
      return false;
    }

    // Count the attempt before comparing, so the limit also applies to a
    // correct code typed on the last allowed try.
    await this.prisma.otpChallenge.update({
      where: { phoneNumber },
      data: { attempts: { increment: 1 } },
    });

    const candidate = Buffer.from(this.hash(code));
    const stored = Buffer.from(entry.codeHash);
    const matches = candidate.length === stored.length && timingSafeEqual(candidate, stored);

    if (matches) {
      await this.prisma.otpChallenge.deleteMany({ where: { phoneNumber } });
    }
    return matches;
  }

  private hash(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }
}
