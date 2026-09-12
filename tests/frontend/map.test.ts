import { describe, expect, it } from 'vitest';
import { seedState } from '@/server/app/seed';
import { toIssueFeatureCollection } from '@/features/map/issueGeoJson';
import { isWithinBounds } from '@/features/map/geo';

describe('persisted issue map projection', () => {
  it('uses stable IDs and only public coordinates even when given an authority detail', () => {
    const issue = { ...seedState().issues[0], publicLocation: { latitude: 44.65, longitude: -63.57 },
      exactLocation: { latitude: 44.651234, longitude: -63.571234 }, locationPrecision: 'approximate' as const };
    const result = toIssueFeatureCollection([issue]);
    expect(result.features[0].id).toBe(issue.id);
    expect(result.features[0].geometry.coordinates).toEqual([-63.57, 44.65]);
    expect(result.features[0].properties.approximate).toBe(true);
    expect(JSON.stringify(result)).not.toContain('44.651234');
    expect(result.features[0].properties).not.toHaveProperty('exactLocation');
    expect(result.features[0].properties).not.toHaveProperty('reporterId');
  });
  it('only marks an urgent priority after human review', () => {
    const issue = { ...seedState().issues[0], priority: 'urgent' as const, priorityReviewed: false };
    expect(toIssueFeatureCollection([issue]).features[0].properties.isUrgent).toBe(false);
    expect(toIssueFeatureCollection([{ ...issue, priorityReviewed: true }]).features[0].properties.isUrgent).toBe(true);
  });
  it('reflects the latest status with the same feature ID and supports empty filters', () => {
    const issue = seedState().issues[0];
    const next = toIssueFeatureCollection([{ ...issue, status: 'resolved', version: issue.version + 1 }]);
    expect(next.features[0].id).toBe(issue.id);
    expect(next.features[0].properties.status).toBe('resolved');
    expect(toIssueFeatureCollection([]).features).toEqual([]);
  });
  it('matches west,south,east,north bounds without swapping coordinate order', () => {
    expect(isWithinBounds({ latitude: 44.65, longitude: -63.57 }, [-63.58, 44.64, -63.56, 44.66])).toBe(true);
    expect(isWithinBounds({ latitude: 44.65, longitude: -63.6 }, [-63.58, 44.64, -63.56, 44.66])).toBe(false);
  });
});
