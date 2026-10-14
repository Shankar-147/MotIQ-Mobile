import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';

const user = { id: 'u1', phoneNumber: '+919999999999', name: 'Asha', role: 'user', status: 'active' };

function setup() {
  const prisma = {
    user: {
      findMany: jest.fn(async () => [user]),
      count: jest.fn(async () => 1),
      findUnique: jest.fn(),
      update: jest.fn(async ({ data }: any) => ({ ...user, ...data })),
      groupBy: jest.fn(async () => []),
    },
  };
  const audit = { record: jest.fn(async () => undefined) };
  return { prisma, audit, service: new AdminUsersService(prisma as any, audit as any) };
}

describe('AdminUsersService', () => {
  it('lists users newest first with paging', async () => {
    const { prisma, service } = setup();
    const page = await service.findAll({ page: 2, pageSize: 10 });
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: 'desc' },
      skip: 10,
      take: 10,
    });
    expect(page).toMatchObject({ total: 1, page: 2, pageSize: 10 });
  });

  it('searches by phone number or name and ignores spaces in the number', async () => {
    const { prisma, service } = setup();
    await service.findAll({ page: 1, pageSize: 20, search: '98 76' });
    const where = (prisma.user.findMany.mock.calls[0] as any)[0].where;
    expect(where.OR[0]).toEqual({ phoneNumber: { contains: '9876' } });
    expect(where.OR[1].name.contains).toBe('98 76');
  });

  it('filters by status', async () => {
    const { prisma, service } = setup();
    await service.findAll({ page: 1, pageSize: 20, status: 'suspended' });
    expect((prisma.user.findMany.mock.calls[0] as any)[0].where.status).toBe('suspended');
  });

  it('finds a user by id', async () => {
    const { prisma, service } = setup();
    prisma.user.findUnique.mockResolvedValue(user);
    await expect(service.findOne('u1')).resolves.toEqual(user);
  });

  it('throws for an unknown user id', async () => {
    const { prisma, service } = setup();
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
  });

  it('suspends a user, stamps the time and writes an audit entry', async () => {
    const { prisma, audit, service } = setup();
    prisma.user.findUnique.mockResolvedValue(user);
    const updated = await service.updateStatus('admin-1', 'u1', 'suspended');
    expect(updated.status).toBe('suspended');
    const data = (prisma.user.update.mock.calls[0] as any)[0].data;
    expect(data.suspendedAt).toBeInstanceOf(Date);
    expect(audit.record).toHaveBeenCalledWith('admin-1', 'user.suspended', 'u1', '+919999999999');
  });

  it('clears the suspension time when a user is reactivated', async () => {
    const { prisma, service } = setup();
    prisma.user.findUnique.mockResolvedValue({ ...user, status: 'suspended' });
    await service.updateStatus('admin-1', 'u1', 'active');
    expect((prisma.user.update.mock.calls[0] as any)[0].data).toEqual({
      status: 'active',
      suspendedAt: null,
    });
  });

  it('rejects a change to the status the user already has', async () => {
    const { prisma, service } = setup();
    prisma.user.findUnique.mockResolvedValue(user);
    await expect(service.updateStatus('admin-1', 'u1', 'active')).rejects.toThrow(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('does not let an admin change their own status', async () => {
    const { prisma, service } = setup();
    await expect(service.updateStatus('u1', 'u1', 'suspended')).rejects.toThrow(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('counts users per status with zero as the default', async () => {
    const { prisma, service } = setup();
    prisma.user.groupBy.mockResolvedValue([{ status: 'suspended', _count: { _all: 2 } }] as any);
    await expect(service.countByStatus()).resolves.toEqual({ active: 0, suspended: 2 });
  });
});
