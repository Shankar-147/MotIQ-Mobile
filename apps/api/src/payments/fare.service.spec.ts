import { BASE_FARE, FareService, PER_KM_CHARGE } from './fare.service';

const make = (percent?: string) =>
  new FareService({ get: (key: string) => (key === 'COMMISSION_PERCENT' ? percent : undefined) } as any);

describe('FareService', () => {
  it('uses a different base fare for each kind of problem', () => {
    const fare = make();
    expect(fare.baseFareFor('flat_tyre')).toBe(BASE_FARE.flat_tyre);
    expect(fare.baseFareFor('towing')).toBeGreaterThan(fare.baseFareFor('flat_tyre'));
  });

  it('charges the base fare alone when the provider is at the same spot', () => {
    expect(make().calculate('battery', 0)).toEqual({
      baseFare: BASE_FARE.battery,
      distanceCharge: 0,
      total: BASE_FARE.battery,
    });
  });

  it('adds a charge for every kilometre', () => {
    const result = make().calculate('flat_tyre', 3.7);
    expect(result.distanceCharge).toBe(Math.round(3.7 * PER_KM_CHARGE));
    expect(result.total).toBe(BASE_FARE.flat_tyre + result.distanceCharge);
  });

  it('splits 15 percent to the platform by default', () => {
    expect(make().split(40500)).toEqual({ commission: 6075, providerAmount: 34425 });
  });

  it('always splits into two parts that add up to the total', () => {
    const fare = make();
    for (const total of [1, 99, 28700, 33333, 100001]) {
      const { commission, providerAmount } = fare.split(total);
      expect(commission + providerAmount).toBe(total);
    }
  });

  it('reads the commission percentage from configuration', () => {
    expect(make('20').split(10000)).toEqual({ commission: 2000, providerAmount: 8000 });
  });
});
