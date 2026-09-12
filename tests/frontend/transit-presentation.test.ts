import { expect, it } from 'vitest';
import { currentDepartures, predictionFeedIsFresh } from '@/features/transit/presentation';
import type { TransitBoard } from '@/contracts/transit';

it('expires predictions on the client even if a refresh fails or the tab sleeps', () => {
  const now = Date.parse('2026-09-12T17:00:00Z');
  const board: TransitBoard = {
    stop: { id: '1', code: '1', name: 'Test stop', location: { latitude: 44.65, longitude: -63.57 } },
    departures: [{ id: 'a', route: '1', headsign: 'Terminal', departureAt: '2026-09-12T17:05:00Z', delaySeconds: null },
      { id: 'b', route: '2', headsign: 'Terminal', departureAt: '2026-09-12T16:59:00Z', delaySeconds: null }],
    alerts: [], updatedAt: '2026-09-12T16:59:00Z', alertsUpdatedAt: null, stale: false, alertsStale: true, source: 'Halifax Transit',
  };
  expect(currentDepartures(board, now).map(d => d.id)).toEqual(['a']);
  expect(currentDepartures(board, now + 61_000)).toEqual([]);
  expect(currentDepartures({ ...board, stale: true }, now)).toEqual([]);
  expect(currentDepartures({ ...board, updatedAt: null }, now)).toEqual([]);
  expect(predictionFeedIsFresh({ ...board, updatedAt: 'invalid' }, now)).toBe(false);
  expect(predictionFeedIsFresh({ ...board, updatedAt: '2026-09-12T17:01:01Z' }, now)).toBe(false);
  expect(predictionFeedIsFresh(board, now)).toBe(true);
});
