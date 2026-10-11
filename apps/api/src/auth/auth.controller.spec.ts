import { AuthController } from './auth.controller';

describe('AuthController', () => {
  const authService = {
    requestOtp: jest.fn(async () => undefined),
    verifyOtp: jest.fn(async () => ({ accessToken: 't', expiresIn: 86400 })),
  };
  const prisma = {
    user: {
      update: jest.fn(async ({ data }: any) => ({
        id: 'u1',
        phoneNumber: '+919999999999',
        name: data.name,
        role: 'user',
      })),
    },
  };
  const controller = new AuthController(authService as any, prisma as any);

  beforeEach(() => jest.clearAllMocks());

  it('passes the phone number on when a code is requested', async () => {
    await controller.requestOtp({ phoneNumber: '+919999999999' });
    expect(authService.requestOtp).toHaveBeenCalledWith('+919999999999');
  });

  it('passes phone, code and name on when verifying', async () => {
    await controller.verifyOtp({ phoneNumber: '+919999999999', code: '123456', name: 'Asha' });
    expect(authService.verifyOtp).toHaveBeenCalledWith('+919999999999', '123456', {
      name: 'Asha',
      role: undefined,
      businessName: undefined,
    });
  });

  it('returns the logged in user from me()', () => {
    const user = { id: 'u1', phoneNumber: '+919999999999', name: null, role: 'user' as const };
    expect(controller.me(user)).toBe(user);
  });

  it('updates only the name of the logged in user', async () => {
    const user = { id: 'u1', phoneNumber: '+919999999999', name: null, role: 'user' as const };
    const result = await controller.updateMe(user, { name: 'Asha' });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { name: 'Asha' } });
    expect(result.name).toBe('Asha');
  });
});
