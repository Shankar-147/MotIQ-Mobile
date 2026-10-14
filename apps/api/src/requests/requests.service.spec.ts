import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RequestsService } from './requests.service';

const customer = { id: 'c1', phoneNumber: '+919800000001', name: 'Chitra', role: 'user' as const };
const providerUser = { id: 'u9', phoneNumber: '+919700000001', name: 'Asha', role: 'provider' as const };
const admin = { id: 'a1', phoneNumber: '+919999900000', name: null, role: 'admin' as const };
const profile = { id: 'p1', userId: 'u9' };

function setup() {
  const prisma = {
    serviceRequest: {
      create: jest.fn(async ({ data }: any) => ({ id: 'r1', ...data })),
      findUnique: jest.fn(),
      findFirst: jest.fn(async () => null),
      findMany: jest.fn(async () => []),
      update: jest.fn(async ({ where, data }: any) => ({ id: where.id, customerId: 'c1', baseFare: 25000, fareTotal: 28700, ...data })),
      count: jest.fn(async () => 0),
      groupBy: jest.fn(async () => []),
    },
    providerProfile: { findUnique: jest.fn(async () => profile) },
    requestOffer: {
      findFirst: jest.fn(),
      update: jest.fn(async () => ({})),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    $transaction: jest.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
  };
  const matching = { assignNext: jest.fn(async (id: string) => ({ id, status: 'assigned' })) };
  const fare = { baseFareFor: jest.fn(() => 25000) };
  const payments = { createForRequest: jest.fn(async () => ({})) };
  const service = new RequestsService(prisma as any, matching as any, fare as any, payments as any);
  return { prisma, matching, fare, payments, service };
}

describe('RequestsService: customer', () => {
  it('creates the request for the logged in customer and starts matching', async () => {
    const { prisma, matching, service } = setup();
    const result = await service.create(customer, { issueType: 'flat_tyre', areaName: 'MG Road' });

    const data = (prisma.serviceRequest.create.mock.calls[0] as any)[0].data;
    expect(data.customerId).toBe('c1');
    expect(data.latitude).toBe(12.9756);
    expect(data.baseFare).toBe(25000);
    expect(matching.assignNext).toHaveBeenCalledWith('r1');
    expect(result.status).toBe('assigned');
  });

  it('refuses a request from a provider or an admin', async () => {
    const { prisma, service } = setup();
    await expect(service.create(providerUser, { issueType: 'fuel', areaName: 'MG Road' })).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.create(admin, { issueType: 'fuel', areaName: 'MG Road' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.serviceRequest.create).not.toHaveBeenCalled();
  });

  it('refuses an area it does not know', async () => {
    const { service } = setup();
    await expect(service.create(customer, { issueType: 'fuel', areaName: 'Atlantis' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('lets the customer, the assigned provider and an admin read a request', async () => {
    const { prisma, service } = setup();
    prisma.serviceRequest.findUnique.mockResolvedValue({ id: 'r1', customerId: 'c1', providerId: 'p1' });
    await expect(service.findOneFor(customer, 'r1')).resolves.toMatchObject({ id: 'r1' });
    await expect(service.findOneFor(providerUser, 'r1')).resolves.toMatchObject({ id: 'r1' });
    await expect(service.findOneFor(admin, 'r1')).resolves.toMatchObject({ id: 'r1' });
  });

  it('blocks someone else from reading a request', async () => {
    const { prisma, service } = setup();
    prisma.serviceRequest.findUnique.mockResolvedValue({ id: 'r1', customerId: 'someone', providerId: 'p-other' });
    await expect(service.findOneFor(customer, 'r1')).rejects.toThrow(ForbiddenException);
  });

  it('cancels an open request and withdraws the waiting offer', async () => {
    const { prisma, service } = setup();
    prisma.serviceRequest.findUnique.mockResolvedValue({ id: 'r1', customerId: 'c1', status: 'assigned' });
    const result = await service.cancel('c1', 'r1');
    expect(prisma.requestOffer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { requestId: 'r1', status: 'offered' } }),
    );
    expect(result.status).toBe('cancelled');
  });

  it('cannot cancel a job that is already in progress or finished', async () => {
    const { prisma, service } = setup();
    for (const status of ['in_progress', 'completed', 'cancelled']) {
      prisma.serviceRequest.findUnique.mockResolvedValue({ id: 'r1', customerId: 'c1', status });
      await expect(service.cancel('c1', 'r1')).rejects.toThrow(BadRequestException);
    }
  });

  it('cannot cancel someone else\'s request', async () => {
    const { prisma, service } = setup();
    prisma.serviceRequest.findUnique.mockResolvedValue({ id: 'r1', customerId: 'other', status: 'assigned' });
    await expect(service.cancel('c1', 'r1')).rejects.toThrow(ForbiddenException);
  });

  it('retries matching only for a request with no provider', async () => {
    const { prisma, matching, service } = setup();
    prisma.serviceRequest.findUnique.mockResolvedValue({ id: 'r1', customerId: 'c1', status: 'no_provider' });
    await service.retry('c1', 'r1');
    expect(matching.assignNext).toHaveBeenCalledWith('r1');

    prisma.serviceRequest.findUnique.mockResolvedValue({ id: 'r1', customerId: 'c1', status: 'assigned' });
    await expect(service.retry('c1', 'r1')).rejects.toThrow(BadRequestException);
  });
});

describe('RequestsService: provider', () => {
  it('accepting an offer assigns the job to that provider', async () => {
    const { prisma, service } = setup();
    prisma.requestOffer.findFirst.mockResolvedValue({ id: 'o1' });
    const result = await service.accept('u9', 'r1');
    expect(result.status).toBe('accepted');
    expect(result.providerId).toBe('p1');
    expect(prisma.requestOffer.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'o1' }, data: expect.objectContaining({ status: 'accepted' }) }),
    );
  });

  it('cannot accept when there is no open offer', async () => {
    const { prisma, service } = setup();
    prisma.requestOffer.findFirst.mockResolvedValue(null);
    await expect(service.accept('u9', 'r1')).rejects.toThrow(NotFoundException);
  });

  it('rejecting an offer records it and matches the next provider', async () => {
    const { prisma, matching, service } = setup();
    prisma.requestOffer.findFirst.mockResolvedValue({ id: 'o1' });
    await service.reject('u9', 'r1');
    expect(prisma.requestOffer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'rejected' }) }),
    );
    expect(matching.assignNext).toHaveBeenCalledWith('r1');
  });

  it('moves a job one step at a time', async () => {
    const { prisma, service } = setup();
    prisma.serviceRequest.findUnique.mockResolvedValue({ id: 'r1', providerId: 'p1', status: 'accepted' });
    await expect(service.advance('u9', 'r1', 'en_route')).resolves.toMatchObject({ status: 'en_route' });

    prisma.serviceRequest.findUnique.mockResolvedValue({ id: 'r1', providerId: 'p1', status: 'accepted' });
    await expect(service.advance('u9', 'r1', 'completed')).rejects.toThrow(BadRequestException);
  });

  it('only the assigned provider can move the job', async () => {
    const { prisma, service } = setup();
    prisma.serviceRequest.findUnique.mockResolvedValue({ id: 'r1', providerId: 'p-other', status: 'accepted' });
    await expect(service.advance('u9', 'r1', 'en_route')).rejects.toThrow(ForbiddenException);
  });

  it('completing a job creates the bill for the fare', async () => {
    const { prisma, payments, service } = setup();
    prisma.serviceRequest.findUnique.mockResolvedValue({ id: 'r1', providerId: 'p1', status: 'in_progress' });
    await service.advance('u9', 'r1', 'completed');
    expect(payments.createForRequest).toHaveBeenCalledWith({ id: 'r1', customerId: 'c1', fareTotal: 28700 });
  });

  it('does not create a bill for the steps before completion', async () => {
    const { prisma, payments, service } = setup();
    prisma.serviceRequest.findUnique.mockResolvedValue({ id: 'r1', providerId: 'p1', status: 'arrived' });
    await service.advance('u9', 'r1', 'in_progress');
    expect(payments.createForRequest).not.toHaveBeenCalled();
  });

  it('a user with no provider profile gets a clear error', async () => {
    const { prisma, service } = setup();
    prisma.providerProfile.findUnique.mockResolvedValue(null as any);
    await expect(service.currentFor('u-none')).rejects.toThrow(NotFoundException);
  });
});

describe('RequestsService: admin', () => {
  it('lists requests filtered by status with paging', async () => {
    const { prisma, service } = setup();
    await service.listAll({ page: 2, pageSize: 5, status: 'completed' });
    expect(prisma.serviceRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'completed' }, skip: 5, take: 5 }),
    );
  });

  it('counts requests per status with zero as the default', async () => {
    const { prisma, service } = setup();
    prisma.serviceRequest.groupBy.mockResolvedValue([{ status: 'completed', _count: { _all: 4 } }] as any);
    const counts = await service.countByStatus();
    expect(counts.completed).toBe(4);
    expect(counts.cancelled).toBe(0);
  });
});
