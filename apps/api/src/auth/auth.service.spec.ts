import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

function setup(options: { otpValid: boolean; userStatus?: 'active' | 'suspended'; admins?: string }) {
  const otpStore = {
    generate: jest.fn(async () => '123456'),
    verify: jest.fn(async () => options.otpValid),
  };
  const jwt = { sign: jest.fn(() => 'signed.token') };
  const prisma = {
    user: {
      upsert: jest.fn(async ({ create }: any) => ({
        id: 'user-1',
        phoneNumber: create.phoneNumber,
        role: create.role,
        status: options.userStatus ?? 'active',
      })),
    },
  };
  const config = { get: jest.fn(() => options.admins ?? '') };
  const service = new AuthService(otpStore as any, jwt as any, prisma as any, config as any);
  return { service, otpStore, jwt, prisma };
}

describe('AuthService', () => {
  it('requests a code for the normalised phone number', async () => {
    const { service, otpStore } = setup({ otpValid: true });
    await service.requestOtp('98765 43210');
    expect(otpStore.generate).toHaveBeenCalledWith('+919876543210');
  });

  it('returns a token carrying the user id and role when the code is right', async () => {
    const { service, jwt } = setup({ otpValid: true });
    const result = await service.verifyOtp('+919999999999', '123456');
    expect(result).toEqual({ accessToken: 'signed.token', expiresIn: 86400 });
    expect(jwt.sign).toHaveBeenCalledWith(
      { sub: 'user-1', role: 'user' },
      { expiresIn: 86400 },
    );
  });

  it('throws Unauthorized and creates no user when the code is wrong', async () => {
    const { service, prisma } = setup({ otpValid: false });
    await expect(service.verifyOtp('+919999999999', '000000')).rejects.toThrow(UnauthorizedException);
    expect(prisma.user.upsert).not.toHaveBeenCalled();
  });

  it('gives the admin role to a number on the admin list', async () => {
    const { service, jwt } = setup({ otpValid: true, admins: '+919999900000' });
    await service.verifyOtp('+919999900000', '123456');
    expect(jwt.sign).toHaveBeenCalledWith(
      { sub: 'user-1', role: 'admin' },
      { expiresIn: 86400 },
    );
  });

  it('refuses to log in a suspended user', async () => {
    const { service, jwt } = setup({ otpValid: true, userStatus: 'suspended' });
    await expect(service.verifyOtp('+919999999999', '123456')).rejects.toThrow(ForbiddenException);
    expect(jwt.sign).not.toHaveBeenCalled();
  });
});
