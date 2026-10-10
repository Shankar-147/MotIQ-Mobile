import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';

const user = { id: 'u1', phoneNumber: '+919999999999', role: 'user', status: 'active' };

function makePrisma() {
  return {
    user: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    payment: { findMany: jest.fn() },
  };
}

describe('AdminUsersService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: AdminUsersService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new AdminUsersService(prisma as any);
  });

  it('lists users newest first', async () => {
    prisma.user.findMany.mockResolvedValue([user]);
    await service.findAll();
    expect(prisma.user.findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' } });
  });

  it('finds a user by id', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    await expect(service.findOne('u1')).resolves.toEqual(user);
  });

  it('throws for an unknown user id', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
  });

  it('updates a user status', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.user.update.mockResolvedValue({ ...user, status: 'suspended' });
    const updated = await service.updateStatus('admin-1', 'u1', 'suspended');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { status: 'suspended' },
    });
    expect(updated.status).toBe('suspended');
  });

  it('refuses to let an admin change their own status', async () => {
    await expect(service.updateStatus('u1', 'u1', 'suspended')).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('lists payments with the owner phone number', async () => {
    prisma.payment.findMany.mockResolvedValue([]);
    await service.findAllPayments();
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: { user: { select: { phoneNumber: true } } } }),
    );
  });
});
