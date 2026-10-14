import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminGuard } from './admin.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

function contextFor(req: Record<string, unknown>) {
  return { switchToHttp: () => ({ getRequest: () => req }) } as any;
}

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({ secret: 'test-secret' });
  const findUnique = jest.fn();
  const guard = new JwtAuthGuard(jwt, { user: { findUnique } } as any);

  beforeEach(() => findUnique.mockReset());

  it('rejects a request with no token', async () => {
    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a token signed with another secret', async () => {
    const forged = new JwtService({ secret: 'other' }).sign({ sub: 'u1' });
    const req = { headers: { authorization: `Bearer ${forged}` } };
    await expect(guard.canActivate(contextFor(req))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a token for a user that no longer exists', async () => {
    findUnique.mockResolvedValue(null);
    const req = { headers: { authorization: `Bearer ${jwt.sign({ sub: 'gone' })}` } };
    await expect(guard.canActivate(contextFor(req))).rejects.toThrow(UnauthorizedException);
  });

  it('puts the user on the request for a valid token', async () => {
    findUnique.mockResolvedValue({
      id: 'u1',
      phoneNumber: '+919999999999',
      name: 'Asha',
      role: 'user',
      status: 'active',
    });
    const req: any = { headers: { authorization: `Bearer ${jwt.sign({ sub: 'u1' })}` } };
    await expect(guard.canActivate(contextFor(req))).resolves.toBe(true);
    expect(req.user).toEqual({ id: 'u1', phoneNumber: '+919999999999', name: 'Asha', role: 'user' });
  });

  it('blocks a suspended user even with a valid token', async () => {
    findUnique.mockResolvedValue({ id: 'u1', phoneNumber: 'x', name: null, role: 'user', status: 'suspended' });
    const req = { headers: { authorization: `Bearer ${jwt.sign({ sub: 'u1' })}` } };
    await expect(guard.canActivate(contextFor(req))).rejects.toThrow(ForbiddenException);
  });
});

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  it('lets an admin through', () => {
    expect(guard.canActivate(contextFor({ user: { role: 'admin' } }))).toBe(true);
  });

  it('blocks a normal user', () => {
    expect(() => guard.canActivate(contextFor({ user: { role: 'user' } }))).toThrow(ForbiddenException);
  });
});
