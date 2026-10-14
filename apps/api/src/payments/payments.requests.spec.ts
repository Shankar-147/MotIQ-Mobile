import { FareService } from './fare.service';
import { PaymentsService } from './payments.service';

// Payments that come from a finished job: the bill, the split and earnings.
function setup() {
  const prisma = {
    payment: {
      create: jest.fn(async ({ data }: any) => ({ id: 'pay1', ...data })),
      findMany: jest.fn(async () => []),
    },
  };
  const fare = new FareService({ get: () => '15' } as any);
  return { prisma, service: new PaymentsService(prisma as any, fare) };
}

describe('PaymentsService: bills for finished jobs', () => {
  it('bills the customer the fare and records the split', async () => {
    const { prisma, service } = setup();
    await service.createForRequest({ id: 'r1', customerId: 'c1', fareTotal: 40500 });
    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: {
        userId: 'c1',
        requestId: 'r1',
        amount: 40500,
        commissionAmount: 6075,
        providerAmount: 34425,
        currency: 'INR',
      },
    });
  });

  it('the commission and the provider amount add up to the amount billed', async () => {
    const { service } = setup();
    const bill: any = await service.createForRequest({ id: 'r1', customerId: 'c1', fareTotal: 33333 });
    expect(bill.commissionAmount + bill.providerAmount).toBe(bill.amount);
  });

  it('adds up what a provider has been paid and what is still waiting', async () => {
    const { prisma, service } = setup();
    prisma.payment.findMany.mockResolvedValue([
      { status: 'succeeded', providerAmount: 34425 },
      { status: 'succeeded', providerAmount: 20000 },
      { status: 'pending', providerAmount: 10000 },
      { status: 'refunded', providerAmount: 5000 },
    ] as any);
    const result = await service.earningsFor('p1');
    expect(result.paid).toBe(54425);
    expect(result.waiting).toBe(10000);
    expect(result.jobs).toHaveLength(4);
  });

  it('only looks at payments for requests this provider did', async () => {
    const { prisma, service } = setup();
    await service.earningsFor('p1');
    expect((prisma.payment.findMany.mock.calls[0] as any)[0].where).toEqual({ request: { providerId: 'p1' } });
  });
});
