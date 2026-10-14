import { HttpException } from '@nestjs/common';
import { OtpStoreService } from './otp-store.service';

// A tiny in-memory stand-in for the otp_challenge table.
function fakePrisma() {
  const rows = new Map<string, any>();
  return {
    otpChallenge: {
      findUnique: jest.fn(async ({ where }: any) => rows.get(where.phoneNumber) ?? null),
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const current = rows.get(where.phoneNumber);
        const next = current ? { ...current, ...update } : { ...create };
        rows.set(where.phoneNumber, next);
        return next;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const current = rows.get(where.phoneNumber);
        const next = { ...current, attempts: current.attempts + (data.attempts?.increment ?? 0) };
        rows.set(where.phoneNumber, next);
        return next;
      }),
      deleteMany: jest.fn(async ({ where }: any) => {
        rows.delete(where.phoneNumber);
        return { count: 1 };
      }),
    },
  };
}

describe('OtpStoreService', () => {
  let store: OtpStoreService;

  beforeEach(() => {
    store = new OtpStoreService(fakePrisma() as any);
  });

  afterEach(() => jest.useRealTimers());

  it('verifies a code that was just generated', async () => {
    const code = await store.generate('+919999999999');
    expect(await store.verify('+919999999999', code)).toBe(true);
  });

  it('generates a six digit code', async () => {
    expect(await store.generate('+919999999999')).toMatch(/^\d{6}$/);
  });

  it('rejects a wrong code', async () => {
    await store.generate('+919999999999');
    expect(await store.verify('+919999999999', '000000')).toBe(false);
  });

  it('rejects verification for a number with no pending OTP', async () => {
    expect(await store.verify('+918888888888', '123456')).toBe(false);
  });

  it('a code can only be used once', async () => {
    const code = await store.generate('+919999999999');
    expect(await store.verify('+919999999999', code)).toBe(true);
    expect(await store.verify('+919999999999', code)).toBe(false);
  });

  it('locks out after too many wrong attempts', async () => {
    const code = await store.generate('+919999999999');
    for (let i = 0; i < 5; i++) {
      await store.verify('+919999999999', '000000');
    }
    expect(await store.verify('+919999999999', code)).toBe(false);
  });

  it('still accepts the right code after four wrong tries', async () => {
    const code = await store.generate('+919999999999');
    for (let i = 0; i < 4; i++) {
      await store.verify('+919999999999', '000000');
    }
    expect(await store.verify('+919999999999', code)).toBe(true);
  });

  it('rejects a code after it has expired', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T10:00:00Z'));
    const code = await store.generate('+919999999999');
    jest.setSystemTime(new Date('2026-01-01T10:05:01Z'));
    expect(await store.verify('+919999999999', code)).toBe(false);
  });

  it('blocks a second request within 60 seconds', async () => {
    await store.generate('+919999999999');
    await expect(store.generate('+919999999999')).rejects.toThrow(HttpException);
  });

  it('allows a new request after the cooldown', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T10:00:00Z'));
    await store.generate('+919999999999');
    jest.setSystemTime(new Date('2026-01-01T10:01:01Z'));
    await expect(store.generate('+919999999999')).resolves.toMatch(/^\d{6}$/);
  });

  it('does not block a different number', async () => {
    await store.generate('+919999999999');
    await expect(store.generate('+918888888888')).resolves.toMatch(/^\d{6}$/);
  });
});
