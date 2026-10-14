import { PaymentsController } from './payments.controller';

describe('PaymentsController', () => {
  const service = {
    create: jest.fn(async () => ({ id: 'p1' })),
    findAllForUser: jest.fn(async () => []),
    findOneFor: jest.fn(async () => ({ id: 'p1' })),
    confirm: jest.fn(async () => ({ id: 'p1', status: 'succeeded' })),
  };
  const controller = new PaymentsController(service as any);
  const user = { id: 'u1', phoneNumber: '+919999999999', name: null, role: 'user' as const };

  beforeEach(() => jest.clearAllMocks());

  it('creates the payment for the logged in user, not a user id from the body', async () => {
    await controller.create(user, { amount: 500, currency: 'INR' });
    expect(service.create).toHaveBeenCalledWith('u1', { amount: 500, currency: 'INR' });
  });

  it('lists the logged in user\'s payments', async () => {
    await controller.findMine(user);
    expect(service.findAllForUser).toHaveBeenCalledWith('u1');
  });

  it('passes the user along when fetching one payment', async () => {
    await controller.findOne(user, 'p1');
    expect(service.findOneFor).toHaveBeenCalledWith(user, 'p1');
  });

  it('passes the user along when confirming', async () => {
    await controller.confirm(user, 'p1');
    expect(service.confirm).toHaveBeenCalledWith(user, 'p1');
  });
});
