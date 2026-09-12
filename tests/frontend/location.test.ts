import { describe, expect, it } from 'vitest';
import { preparationLocation } from '@/features/reporting/draft';

describe('report preparation location privacy', () => {
  const exact = { latitude: 44.6488123, longitude: -63.5752345 };
  it('keeps explicitly public infrastructure coordinates', () => {
    expect(preparationLocation(exact, false)).toEqual(exact);
  });
  it('coarsens sensitive coordinates to a stable point before engine input', () => {
    const coarse = preparationLocation(exact, true);
    expect(coarse).not.toEqual(exact);
    expect(preparationLocation(exact, true)).toEqual(coarse);
    expect(preparationLocation(coarse, true)).toEqual(coarse);
    expect(Math.abs(coarse.latitude - exact.latitude)).toBeLessThan(0.001);
    expect(Math.abs(coarse.longitude - exact.longitude)).toBeLessThan(0.002);
  });
  it('does not mutate the original confirmed location', () => {
    const copy = { ...exact };
    preparationLocation(exact, true);
    expect(exact).toEqual(copy);
  });
});
