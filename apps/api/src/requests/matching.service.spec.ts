import { MatchingService, pickNearest } from './matching.service';

// Two providers: Indiranagar is nearer to MG Road than Whitefield.
const indiranagar = { id: 'a', latitude: 12.9784, longitude: 77.6408 } as any;
const whitefield = { id: 'b', latitude: 12.9698, longitude: 77.75 } as any;
const mgRoad = { latitude: 12.9756, longitude: 77.607 };

describe('pickNearest', () => {
  it('returns null when there are no providers', () => {
    expect(pickNearest([], mgRoad.latitude, mgRoad.longitude)).toBeNull();
  });

  it('chooses the closest provider whatever the order', () => {
    const one = pickNearest([whitefield, indiranagar], mgRoad.latitude, mgRoad.longitude);
    const two = pickNearest([indiranagar, whitefield], mgRoad.latitude, mgRoad.longitude);
    expect(one?.provider.id).toBe('a');
    expect(two?.provider.id).toBe('a');
    expect(one!.distanceKm).toBeCloseTo(3.7, 0);
  });

  it('ignores a provider without a location', () => {
    const lost = { id: 'c', latitude: null, longitude: null } as any;
    expect(pickNearest([lost], mgRoad.latitude, mgRoad.longitude)).toBeNull();
    expect(pickNearest([lost, whitefield], mgRoad.latitude, mgRoad.longitude)?.provider.id).toBe('b');
  });
});

function setup(candidates: any[], asked: string[] = []) {
  const request = { id: 'r1', issueType: 'flat_tyre', latitude: mgRoad.latitude, longitude: mgRoad.longitude };
  const prisma = {
    serviceRequest: {
      findUniqueOrThrow: jest.fn(async () => request),
      update: jest.fn(async ({ data }: any) => ({ ...request, ...data })),
    },
    requestOffer: {
      findMany: jest.fn(async () => asked.map((providerId) => ({ providerId }))),
      create: jest.fn(async ({ data }: any) => data),
    },
    $transaction: jest.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
  };
  const providers = { findAvailable: jest.fn(async () => candidates) };
  const fare = { calculate: jest.fn(() => ({ baseFare: 25000, distanceCharge: 3700, total: 28700 })) };
  const service = new MatchingService(prisma as any, providers as any, fare as any);
  return { prisma, providers, fare, service };
}

describe('MatchingService.assignNext', () => {
  it('offers the request to the nearest provider and prices it by distance', async () => {
    const { prisma, fare, service } = setup([whitefield, indiranagar]);
    const result = await service.assignNext('r1');

    expect(prisma.requestOffer.create).toHaveBeenCalledWith({ data: { requestId: 'r1', providerId: 'a' } });
    expect(fare.calculate).toHaveBeenCalledWith('flat_tyre', 3.7);
    expect(result.status).toBe('assigned');
    expect(result.fareTotal).toBe(28700);
  });

  it('does not ask a provider who has already been asked', async () => {
    const { providers, service } = setup([indiranagar], ['b']);
    await service.assignNext('r1');
    expect(providers.findAvailable).toHaveBeenCalledWith(['b']);
  });

  it('marks the request as having no provider when nobody is available', async () => {
    const { prisma, service } = setup([]);
    const result = await service.assignNext('r1');
    expect(result.status).toBe('no_provider');
    expect(prisma.requestOffer.create).not.toHaveBeenCalled();
  });
});
