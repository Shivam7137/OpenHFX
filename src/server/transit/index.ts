import type { Location } from '@/contracts';
import type { TransitBoard, TransitNearby } from '@/contracts/transit';
import { createCache, fetchFeed, TransitError } from './cache';
import { distanceMeters, parseStatic, resolveStop } from './static';
import { alertsAt, departuresAt, feedTimestamp, isFresh, parseRealtime } from './realtime';

export { TransitError } from './cache';
const SOURCE = 'Halifax Transit open data';
const timestamp = (value: number | null) => value === null ? null : new Date(value).toISOString();

/** Injectable fetch/clock keep all automated checks independent of the public feeds. */
export function createTransitService(options: { fetcher?: typeof fetch; now?: () => number } = {}) {
  const now = options.now || Date.now;
  const getStatic = createCache(async () => parseStatic(await fetchFeed('static', options.fetcher)), 6 * 60 * 60_000, 7 * 24 * 60 * 60_000, now);
  const getTrips = createCache(async () => parseRealtime(await fetchFeed('trips', options.fetcher)), 25_000, 120_000, now);
  const getAlerts = createCache(async () => parseRealtime(await fetchFeed('alerts', options.fetcher)), 25_000, 24 * 60 * 60_000, now);

  return {
    async transitNearby(location: Location): Promise<TransitNearby> {
      if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude) || Math.abs(location.latitude) > 90 || Math.abs(location.longitude) > 180) {
        throw new TransitError(400, 'VALIDATION_ERROR', 'Choose a valid map location.');
      }
      const data = await getStatic();
      const stops = [...data.value.stops.values()].map(stop => ({ ...stop, distanceMeters: distanceMeters(location, stop.location) }))
        .filter(stop => stop.distanceMeters <= 3000).sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, 30);
      return { stops, updatedAt: new Date(data.loadedAt).toISOString(), stale: data.stale, source: SOURCE };
    },
    async transitBoard(stopId: string): Promise<TransitBoard> {
      if (!stopId || stopId.length > 100 || !/^[\w.-]+$/.test(stopId)) throw new TransitError(400, 'VALIDATION_ERROR', 'Choose a valid transit stop.');
      const data = await getStatic();
      const stop = resolveStop(data.value, stopId);
      if (!stop) throw new TransitError(404, 'NOT_FOUND', 'This transit stop was not found.');
      const [tripResult, alertResult] = await Promise.allSettled([getTrips(), getAlerts()]);
      const trips = tripResult.status === 'fulfilled' ? tripResult.value : undefined;
      const alerts = alertResult.status === 'fulfilled' ? alertResult.value : undefined;
      const current = now();
      const stale = !trips || trips.stale || !isFresh(trips.value, current);
      const alertsStale = !alerts || alerts.stale || !isFresh(alerts.value, current);
      return { stop, departures: trips && !stale ? departuresAt(trips.value, data.value, stop, current) : [],
        alerts: alerts ? alertsAt(alerts.value, trips?.value, data.value, stop, current) : [],
        updatedAt: timestamp(feedTimestamp(trips?.value)), alertsUpdatedAt: timestamp(feedTimestamp(alerts?.value)),
        stale, alertsStale, source: SOURCE,
      };
    },
  };
}

const service = createTransitService();
export const transitNearby = service.transitNearby;
export const transitBoard = service.transitBoard;
