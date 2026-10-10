import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AdminGuard } from './admin.guard';

function contextFor(req: Record<string, unknown>) {
  return { switchToHttp: () => ({ getRequest: () => req }) } as any;
}

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({ secret: 'test-secret' });
  const findUnique = jest.fn();
  const guard = new JwtAuthGuard(jwt, { user: { findUnique } } as any);

  beforeEach(() => findUnique.mockReset());

  it('rejects a request with no token', async () => {
    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token signed with another secret', async () => {
    const forged = new JwtService({ secret: 'other' }).sign({ sub: 'u1' });
    const req = { headers: { authorization: `Bearer ${forged}` } };
    await expect(guard.canActivate(contextFor(req))).rejects.toThrow(UnauthorizedException);
  });

  it('attaches the user for a valid token', async () => {
    findUnique.mockResolvedValue({
      id: 'u1',
      phoneNumber: '+919999999999',
      role: 'user',
      status: 'active',
    });
    const req: any = { headers: { authorization: `Bearer ${jwt.sign({ sub: 'u1' })}` } };
    await expect(guard.canActivate(contextFor(req))).resolves.toBe(true);
    expect(req.user).toEqual({ id: 'u1', phoneNumber: '+919999999999', role: 'user' });
  });

  it('locks out a suspended user even with a valid token', async () => {
    findUnique.mockResolvedValue({ id: 'u1', phoneNumber: 'x', role: 'user', status: 'suspended' });
    const req = { headers: { authorization: `Bearer ${jwt.sign({ sub: 'u1' })}` } };
    await expect(guard.canActivate(contextFor(req))).rejects.toThrow(ForbiddenException);
  });
});

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  it('lets admins through', () => {
    expect(guard.canActivate(contextFor({ user: { role: 'admin' } }))).toBe(true);
  });

  it('blocks regular users', () => {
    expect(() => guard.canActivate(contextFor({ user: { role: 'user' } }))).toThrow(
      ForbiddenException,
    );
  });
});
