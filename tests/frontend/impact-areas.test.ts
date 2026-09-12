import { describe, expect, it } from 'vitest';
import { seedState } from '@/server/app/seed';
import { toImpactAreas } from '@/features/map/impactAreas';

describe('reported problem area geometry', () => {
  it('draws a closed metre-scaled polygon centred only on the public location', () => {
    const issue = { ...seedState().issues[0], impactRadiusMeters: 100, publicLocation: { latitude: 44.65, longitude: -63.57 }, exactLocation: { latitude: 44.651234, longitude: -63.571234 } };
    const feature = toImpactAreas([issue]).features[0];
    expect(feature).toBeDefined();
    const ring = feature.geometry.coordinates[0];
    expect(ring[0]).toEqual(ring.at(-1));
    expect(ring[0][0]).toBeCloseTo(-63.57, 6);
    expect(ring[0][1]).toBeCloseTo(44.65089932, 7);
    expect(feature.properties).not.toHaveProperty('exactLocation');
    expect(JSON.stringify(feature)).not.toContain('44.651234');
  });
  it('omits resolved, unknown, and invalid radii without inventing an area', () => {
    const issue = seedState().issues[0];
    for (const radius of [undefined, 0, -1, 501, NaN]) expect(toImpactAreas([{ ...issue, impactRadiusMeters: radius }]).features).toHaveLength(0);
    expect(toImpactAreas([{ ...issue, impactRadiusMeters: 50, status: 'resolved' }]).features).toHaveLength(0);
  });
});
