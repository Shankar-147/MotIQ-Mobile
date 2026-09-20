import { Injectable } from '@nestjs/common';
import { randomInt, createHash, timingSafeEqual } from 'crypto';

interface OtpEntry {
  codeHash: string;
  expiresAt: number;
  attempts: number;
}

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/**
 * In-memory OTP store for local development. Swap for a Redis-backed
 * implementation before production (entries must survive across instances).
 */
@Injectable()
export class OtpStoreService {
  private readonly entries = new Map<string, OtpEntry>();

  generate(phoneNumber: string): string {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    this.entries.set(phoneNumber, {
      codeHash: this.hash(code),
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
    });
    return code;
  }

  verify(phoneNumber: string, code: string): boolean {
    const entry = this.entries.get(phoneNumber);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt || entry.attempts >= MAX_ATTEMPTS) {
      this.entries.delete(phoneNumber);
      return false;
    }

    entry.attempts += 1;

    const candidateHash = Buffer.from(this.hash(code));
    const storedHash = Buffer.from(entry.codeHash);
    const matches =
      candidateHash.length === storedHash.length &&
      timingSafeEqual(candidateHash, storedHash);

    if (matches) {
      this.entries.delete(phoneNumber);
    }
    return matches;
  }

  private hash(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }
}
