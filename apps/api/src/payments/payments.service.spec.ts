import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';

const owner = { id: 'u1', phoneNumber: '+919999999999', name: null, role: 'user' as const };
const stranger = { id: 'u2', phoneNumber: '+918888888888', name: null, role: 'user' as const };
const admin = { id: 'a1', phoneNumber: '+917777777777', name: null, role: 'admin' as const };

const pending = { id: 'p1', userId: 'u1', amount: 500, currency: 'INR', status: 'pending' };
const succeeded = { ...pending, status: 'succeeded' };

function setup() {
  const prisma = {
    payment: {
      create: jest.fn(),
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(),
      update: jest.fn(async ({ where, data }: any) => ({ ...pending, id: where.id, ...data })),
      count: jest.fn(async () => 0),
      groupBy: jest.fn(async () => []),
    },
  };
  return { prisma, service: new PaymentsService(prisma as any) };
}

describe('PaymentsService', () => {
  it('creates a pending payment for the given user', async () => {
    const { prisma, service } = setup();
    prisma.payment.create.mockResolvedValue(pending);
    await service.create('u1', { amount: 500, currency: 'INR' });
    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: { userId: 'u1', amount: 500, currency: 'INR' },
    });
  });

  it('lists only the given user\'s payments, newest first', async () => {
    const { prisma, service } = setup();
    await service.findAllForUser('u1');
    expect(prisma.payment.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('throws for an unknown payment id', async () => {
    const { prisma, service } = setup();
    prisma.payment.findUnique.mockResolvedValue(null);
    await expect(service.findOneFor(owner, 'nope')).rejects.toThrow(NotFoundException);
  });

  it('lets the owner read a payment', async () => {
    const { prisma, service } = setup();
    prisma.payment.findUnique.mockResolvedValue(pending);
    await expect(service.findOneFor(owner, 'p1')).resolves.toEqual(pending);
  });

  it('blocks another user from reading it', async () => {
    const { prisma, service } = setup();
    prisma.payment.findUnique.mockResolvedValue(pending);
    await expect(service.findOneFor(stranger, 'p1')).rejects.toThrow(ForbiddenException);
  });

  it('lets an admin read any payment', async () => {
    const { prisma, service } = setup();
    prisma.payment.findUnique.mockResolvedValue(pending);
    await expect(service.findOneFor(admin, 'p1')).resolves.toEqual(pending);
  });

  it('marks a pending payment as succeeded on confirm', async () => {
    const { prisma, service } = setup();
    prisma.payment.findUnique.mockResolvedValue(pending);
    const result = await service.confirm(owner, 'p1');
    expect(prisma.payment.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { status: 'succeeded' } });
    expect(result.status).toBe('succeeded');
  });

  it('confirming an already succeeded payment changes nothing', async () => {
    const { prisma, service } = setup();
    prisma.payment.findUnique.mockResolvedValue(succeeded);
    await service.confirm(owner, 'p1');
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it('refuses to confirm a refunded payment', async () => {
    const { prisma, service } = setup();
    prisma.payment.findUnique.mockResolvedValue({ ...pending, status: 'refunded' });
    await expect(service.confirm(owner, 'p1')).rejects.toThrow(BadRequestException);
  });

  it('does not let a stranger confirm someone else\'s payment', async () => {
    const { prisma, service } = setup();
    prisma.payment.findUnique.mockResolvedValue(pending);
    await expect(service.confirm(stranger, 'p1')).rejects.toThrow(ForbiddenException);
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it('refunds a succeeded payment', async () => {
    const { prisma, service } = setup();
    prisma.payment.findUnique.mockResolvedValue(succeeded);
    const result = await service.refund('p1');
    expect(result.status).toBe('refunded');
  });

  it('refuses to refund a payment that has not succeeded', async () => {
    const { prisma, service } = setup();
    prisma.payment.findUnique.mockResolvedValue(pending);
    await expect(service.refund('p1')).rejects.toThrow(BadRequestException);
  });

  it('filters the admin list by status and reports the total', async () => {
    const { prisma, service } = setup();
    prisma.payment.count.mockResolvedValue(7);
    const page = await service.listAll({ page: 2, pageSize: 5, status: 'pending' });
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'pending' }, skip: 5, take: 5 }),
    );
    expect(page).toMatchObject({ total: 7, page: 2, pageSize: 5 });
  });

  it('builds a summary with a count for every status', async () => {
    const { prisma, service } = setup();
    prisma.payment.groupBy
      .mockResolvedValueOnce([{ status: 'succeeded', _count: { _all: 3 } }] as any)
      .mockResolvedValueOnce([{ currency: 'INR', _sum: { amount: 1500 } }] as any);
    const summary = await service.summary();
    expect(summary.counts).toEqual({ pending: 0, succeeded: 3, failed: 0, refunded: 0 });
    expect(summary.collected).toEqual([{ currency: 'INR', amount: 1500 }]);
  });
});
