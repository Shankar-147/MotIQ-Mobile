import { AdminController } from './admin.controller';

describe('AdminController', () => {
  const users = {
    findAll: jest.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 20 })),
    findOne: jest.fn(async () => ({ id: 'u1' })),
    updateStatus: jest.fn(async () => ({ id: 'u1', status: 'suspended' })),
    countByStatus: jest.fn(async () => ({ active: 3, suspended: 1 })),
  };
  const payments = {
    listAll: jest.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 20 })),
    refund: jest.fn(async () => ({ id: 'p1', amount: 500, currency: 'INR', status: 'refunded' })),
    summary: jest.fn(async () => ({ counts: {}, collected: [] })),
  };
  const audit = {
    record: jest.fn(async () => undefined),
    list: jest.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 20 })),
  };
  const controller = new AdminController(users as any, payments as any, audit as any);
  const admin = { id: 'a1', phoneNumber: '+917777777777', name: null, role: 'admin' as const };

  beforeEach(() => jest.clearAllMocks());

  it('combines user and payment numbers for the dashboard', async () => {
    const stats = await controller.stats();
    expect(stats.users).toEqual({ active: 3, suspended: 1 });
    expect(stats.payments).toBeDefined();
  });

  it('passes the acting admin along when changing a status', async () => {
    await controller.updateStatus(admin, 'u1', { status: 'suspended' });
    expect(users.updateStatus).toHaveBeenCalledWith('a1', 'u1', 'suspended');
  });

  it('records an audit entry when a payment is refunded', async () => {
    await controller.refund(admin, 'p1');
    expect(payments.refund).toHaveBeenCalledWith('p1');
    expect(audit.record).toHaveBeenCalledWith('a1', 'payment.refunded', 'p1', '500 INR');
  });

  it('reads the audit log through the audit service', async () => {
    await controller.listAudit({ page: 1, pageSize: 20 });
    expect(audit.list).toHaveBeenCalled();
  });
});
