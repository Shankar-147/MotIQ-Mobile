import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { AuthUser } from '../auth/auth-user';

const owner: AuthUser = { id: 'u1', phoneNumber: '+919999999999', role: 'user' };
const stranger: AuthUser = { id: 'u2', phoneNumber: '+918888888888', role: 'user' };
const admin: AuthUser = { id: 'a1', phoneNumber: '+917777777777', role: 'admin' };

const stored = { id: 'p1', userId: 'u1', amount: 500, currency: 'INR', status: 'pending' };

function makePrisma() {
  return {
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe('PaymentsService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: PaymentsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new PaymentsService(prisma as any);
  });

  it('creates a payment for the given user', async () => {
    prisma.payment.create.mockResolvedValue(stored);
    await service.create('u1', { amount: 500, currency: 'INR' });
    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: { userId: 'u1', amount: 500, currency: 'INR' },
    });
  });

  it('lists only the given user\'s payments', async () => {
    prisma.payment.findMany.mockResolvedValue([stored]);
    await service.findAllForUser('u1');
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' } }),
    );
  });

  it('throws for an unknown payment id', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    await expect(service.findOneFor(owner, 'nope')).rejects.toThrow(NotFoundException);
  });

  it('lets the owner read their payment', async () => {
    prisma.payment.findUnique.mockResolvedValue(stored);
    await expect(service.findOneFor(owner, 'p1')).resolves.toEqual(stored);
  });

  it('blocks another user from reading it', async () => {
    prisma.payment.findUnique.mockResolvedValue(stored);
    await expect(service.findOneFor(stranger, 'p1')).rejects.toThrow(ForbiddenException);
  });

  it('lets an admin read any payment', async () => {
    prisma.payment.findUnique.mockResolvedValue(stored);
    await expect(service.findOneFor(admin, 'p1')).resolves.toEqual(stored);
  });

  it('marks a payment as succeeded on confirm', async () => {
    prisma.payment.findUnique.mockResolvedValue(stored);
    prisma.payment.update.mockResolvedValue({ ...stored, status: 'succeeded' });
    const result = await service.confirmPayment(owner, 'p1');
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { status: 'succeeded' },
    });
    expect(result.status).toBe('succeeded');
  });

  it('does not let a stranger confirm someone else\'s payment', async () => {
    prisma.payment.findUnique.mockResolvedValue(stored);
    await expect(service.confirmPayment(stranger, 'p1')).rejects.toThrow(ForbiddenException);
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });
});
