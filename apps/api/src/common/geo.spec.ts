import { AREAS } from '../areas/areas';
import { distanceKm } from './geo';

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    expect(distanceKm(12.9716, 77.5946, 12.9716, 77.5946)).toBe(0);
  });

  it('gives the same answer in both directions', () => {
    const forward = distanceKm(12.9756, 77.607, 12.9784, 77.6408);
    const back = distanceKm(12.9784, 77.6408, 12.9756, 77.607);
    expect(forward).toBeCloseTo(back, 6);
  });

  it('puts MG Road about 3.7 km from Indiranagar', () => {
    const mg = AREAS.find((a) => a.name === 'MG Road')!;
    const indiranagar = AREAS.find((a) => a.name === 'Indiranagar')!;
    const km = distanceKm(mg.latitude, mg.longitude, indiranagar.latitude, indiranagar.longitude);
    expect(km).toBeGreaterThan(3.5);
    expect(km).toBeLessThan(3.9);
  });

  it('gives roughly 111 km for one degree of latitude', () => {
    expect(distanceKm(10, 77, 11, 77)).toBeCloseTo(111.2, 0);
  });
});
