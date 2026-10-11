import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProvidersService } from './providers.service';

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
});
