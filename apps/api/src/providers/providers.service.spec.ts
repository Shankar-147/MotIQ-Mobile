import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProvidersService, summariseRating } from './providers.service';

const approved = {
  id: 'p1',
  userId: 'u1',
  businessName: 'Asha Auto Care',
  verification: 'approved',
  online: false,
  latitude: null,
  longitude: null,
  areaName: null,
  documents: [],
};

function setup() {
  const prisma = {
    providerProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn(async () => []),
      count: jest.fn(async () => 0),
      update: jest.fn(async ({ data }: any) => ({ ...approved, ...data })),
    },
    providerDocument: { create: jest.fn(async ({ data }: any) => ({ id: 'd1', ...data })) },
    rating: {
      aggregate: jest.fn(async () => ({ _avg: { stars: null }, _count: { _all: 0 } })),
      groupBy: jest.fn(async () => []),
    },
  };
  return { prisma, service: new ProvidersService(prisma as any) };
}

describe('ProvidersService', () => {
  it('throws when the account has no provider profile', async () => {
    const { prisma, service } = setup();
    prisma.providerProfile.findUnique.mockResolvedValue(null);
    await expect(service.findByUserId('u1')).rejects.toThrow(NotFoundException);
  });

  it('stores a document against the provider', async () => {
    const { prisma, service } = setup();
    prisma.providerProfile.findUnique.mockResolvedValue(approved);
    await service.addDocument('u1', { type: 'driving_license', fileUrl: 'https://x/dl.jpg' });
    expect(prisma.providerDocument.create).toHaveBeenCalledWith({
      data: { providerId: 'p1', type: 'driving_license', fileUrl: 'https://x/dl.jpg' },
    });
  });

  it('refuses to go online before approval', async () => {
    const { prisma, service } = setup();
    prisma.providerProfile.findUnique.mockResolvedValue({ ...approved, verification: 'pending' });
    await expect(service.setPresence('u1', { online: true, areaName: 'MG Road' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.providerProfile.update).not.toHaveBeenCalled();
  });

  it('needs a known area to go online', async () => {
    const { prisma, service } = setup();
    prisma.providerProfile.findUnique.mockResolvedValue(approved);
    await expect(service.setPresence('u1', { online: true })).rejects.toThrow(BadRequestException);
    await expect(service.setPresence('u1', { online: true, areaName: 'Atlantis' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('goes online with the coordinates of the chosen area', async () => {
    const { prisma, service } = setup();
    prisma.providerProfile.findUnique.mockResolvedValue(approved);
    await service.setPresence('u1', { online: true, areaName: 'Indiranagar' });
    expect(prisma.providerProfile.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { online: true, areaName: 'Indiranagar', latitude: 12.9784, longitude: 77.6408 },
    });
  });

  it('remembers the last area when going online again', async () => {
    const { prisma, service } = setup();
    prisma.providerProfile.findUnique.mockResolvedValue({
      ...approved,
      areaName: 'Hebbal',
      latitude: 13.0358,
      longitude: 77.597,
    });
    await service.setPresence('u1', { online: true });
    expect((prisma.providerProfile.update.mock.calls[0] as any)[0].data.areaName).toBe('Hebbal');
  });

  it('can always go offline, even when not approved', async () => {
    const { prisma, service } = setup();
    prisma.providerProfile.findUnique.mockResolvedValue({ ...approved, verification: 'rejected', online: true });
    await service.setPresence('u1', { online: false });
    expect(prisma.providerProfile.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { online: false },
    });
  });

  it('only offers approved, online providers who are not on a job', async () => {
    const { prisma, service } = setup();
    await service.findAvailable(['x']);
    const where = (prisma.providerProfile.findMany.mock.calls[0] as any)[0].where;
    expect(where.verification).toBe('approved');
    expect(where.online).toBe(true);
    expect(where.id).toEqual({ notIn: ['x'] });
    expect(where.requests.none.status.in).toContain('assigned');
    expect(where.requests.none.status.in).toContain('in_progress');
  });

  it('cannot approve a provider with no documents', async () => {
    const { prisma, service } = setup();
    prisma.providerProfile.findUnique.mockResolvedValue({ ...approved, verification: 'pending', documents: [] });
    await expect(service.review('p1', { decision: 'approved' })).rejects.toThrow(BadRequestException);
    expect(prisma.providerProfile.update).not.toHaveBeenCalled();
  });

  it('approves a provider who has documents and records the note', async () => {
    const { prisma, service } = setup();
    prisma.providerProfile.findUnique.mockResolvedValue({
      ...approved,
      verification: 'pending',
      documents: [{ id: 'd1' }],
    });
    await service.review('p1', { decision: 'approved', note: 'Looks fine' });
    const data = (prisma.providerProfile.update.mock.calls[0] as any)[0].data;
    expect(data.verification).toBe('approved');
    expect(data.reviewNote).toBe('Looks fine');
    expect(data.reviewedAt).toBeInstanceOf(Date);
  });

  it('takes a rejected provider offline at once', async () => {
    const { prisma, service } = setup();
    prisma.providerProfile.findUnique.mockResolvedValue({ ...approved, online: true, documents: [] });
    await service.review('p1', { decision: 'rejected' });
    expect((prisma.providerProfile.update.mock.calls[0] as any)[0].data.online).toBe(false);
  });

  it('filters the admin list by verification status', async () => {
    const { prisma, service } = setup();
    await service.listForAdmin({ page: 1, pageSize: 10, verification: 'pending' });
    expect((prisma.providerProfile.findMany.mock.calls[0] as any)[0].where).toEqual({
      verification: 'pending',
    });
  });

  it('shows a provider with no ratings as no average and a count of zero', async () => {
    const { prisma, service } = setup();
    prisma.providerProfile.findUnique.mockResolvedValue(approved);
    const profile = await service.profileFor('u1');
    expect(profile.rating).toEqual({ average: null, count: 0 });
  });

  it('works out the average from the ratings and shows one decimal', async () => {
    const { prisma, service } = setup();
    prisma.providerProfile.findUnique.mockResolvedValue(approved);
    prisma.rating.aggregate.mockResolvedValue({ _avg: { stars: 4.333333 }, _count: { _all: 3 } } as any);
    const profile = await service.profileFor('u1');
    expect(profile.rating).toEqual({ average: 4.3, count: 3 });
    expect((prisma.rating.aggregate.mock.calls[0] as any)[0].where).toEqual({ providerId: 'p1' });
  });

  it('adds each provider\'s rating to the admin list with a single query', async () => {
    const { prisma, service } = setup();
    prisma.providerProfile.findMany.mockResolvedValue([{ ...approved, id: 'p1' }, { ...approved, id: 'p2' }] as any);
    prisma.rating.groupBy.mockResolvedValue([
      { providerId: 'p1', _avg: { stars: 4.5 }, _count: { _all: 2 } },
    ] as any);

    const page = (await service.listForAdmin({ page: 1, pageSize: 10 })) as any;

    expect(page.items[0].rating).toEqual({ average: 4.5, count: 2 });
    expect(page.items[1].rating).toEqual({ average: null, count: 0 });
    expect(prisma.rating.groupBy).toHaveBeenCalledTimes(1);
  });

  it('includes the rating when the admin opens one provider', async () => {
    const { prisma, service } = setup();
    prisma.providerProfile.findUnique.mockResolvedValue(approved);
    prisma.rating.aggregate.mockResolvedValue({ _avg: { stars: 5 }, _count: { _all: 1 } } as any);
    const profile = await service.getForAdmin('p1');
    expect(profile.rating).toEqual({ average: 5, count: 1 });
  });
});

describe('summariseRating', () => {
  it('rounds to one decimal', () => {
    expect(summariseRating(4.25, 4)).toEqual({ average: 4.3, count: 4 });
    expect(summariseRating(3.04, 5)).toEqual({ average: 3, count: 5 });
  });

  it('reports no average when there are no ratings', () => {
    expect(summariseRating(null, 0)).toEqual({ average: null, count: 0 });
    expect(summariseRating(0, 0)).toEqual({ average: null, count: 0 });
  });
});
