import { AreasController } from '../areas/areas.controller';
import { ProvidersController } from '../providers/providers.controller';
import { ProviderJobsController } from './provider-jobs.controller';
import { RequestsController } from './requests.controller';

const customer = { id: 'c1', phoneNumber: '+919800000001', name: null, role: 'user' as const };
const provider = { id: 'u9', phoneNumber: '+919700000001', name: null, role: 'provider' as const };

describe('RequestsController', () => {
  const service = {
    create: jest.fn(async () => ({ id: 'r1' })),
    findMine: jest.fn(async () => []),
    findOneFor: jest.fn(async () => ({ id: 'r1' })),
    cancel: jest.fn(async () => ({ id: 'r1' })),
    retry: jest.fn(async () => ({ id: 'r1' })),
  };
  const controller = new RequestsController(service as any);

  beforeEach(() => jest.clearAllMocks());

  it('passes the logged in user and the body to create', async () => {
    await controller.create(customer, { issueType: 'battery', areaName: 'MG Road' });
    expect(service.create).toHaveBeenCalledWith(customer, { issueType: 'battery', areaName: 'MG Road' });
  });

  it('lists only the logged in customer\'s requests', async () => {
    await controller.findMine(customer);
    expect(service.findMine).toHaveBeenCalledWith('c1');
  });

  it('cancels and retries as the logged in customer', async () => {
    await controller.cancel(customer, 'r1');
    await controller.retry(customer, 'r1');
    expect(service.cancel).toHaveBeenCalledWith('c1', 'r1');
    expect(service.retry).toHaveBeenCalledWith('c1', 'r1');
  });
});

describe('ProviderJobsController', () => {
  const service = {
    currentFor: jest.fn(async () => ({ offer: null, active: null })),
    historyFor: jest.fn(async () => []),
    accept: jest.fn(async () => ({})),
    reject: jest.fn(async () => ({})),
    advance: jest.fn(async () => ({})),
  };
  const controller = new ProviderJobsController(service as any);

  beforeEach(() => jest.clearAllMocks());

  it('works with the logged in provider\'s user id', async () => {
    await controller.current(provider);
    await controller.history(provider);
    await controller.accept(provider, 'r1');
    await controller.reject(provider, 'r1');
    expect(service.currentFor).toHaveBeenCalledWith('u9');
    expect(service.historyFor).toHaveBeenCalledWith('u9');
    expect(service.accept).toHaveBeenCalledWith('u9', 'r1');
    expect(service.reject).toHaveBeenCalledWith('u9', 'r1');
  });

  it('passes the new status on', async () => {
    await controller.status(provider, 'r1', { status: 'arrived' });
    expect(service.advance).toHaveBeenCalledWith('u9', 'r1', 'arrived');
  });
});

describe('ProvidersController', () => {
  const service = {
    findByUserId: jest.fn(async () => ({ id: 'p1' })),
    addDocument: jest.fn(async () => ({ id: 'd1' })),
    setPresence: jest.fn(async () => ({ id: 'p1' })),
  };
  const controller = new ProvidersController(service as any);

  it('uses the logged in user for profile, documents and presence', async () => {
    await controller.profile(provider);
    await controller.addDocument(provider, { type: 'id_proof', fileUrl: 'https://x/id.jpg' });
    await controller.presence(provider, { online: true, areaName: 'MG Road' });
    expect(service.findByUserId).toHaveBeenCalledWith('u9');
    expect(service.addDocument).toHaveBeenCalledWith('u9', { type: 'id_proof', fileUrl: 'https://x/id.jpg' });
    expect(service.setPresence).toHaveBeenCalledWith('u9', { online: true, areaName: 'MG Road' });
  });
});

describe('AreasController', () => {
  it('lists the areas customers and providers can choose', () => {
    const areas = new AreasController().list();
    expect(areas.length).toBeGreaterThan(5);
    expect(areas[0]).toEqual(
      expect.objectContaining({ name: expect.any(String), latitude: expect.any(Number) }),
    );
  });
});
