import { describe, expect, it, vi } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import type { transit_realtime as Proto } from 'gtfs-realtime-bindings';
import { createTransitService, TransitError } from '@/server/transit';
import { createCache, FEEDS, fetchFeed } from '@/server/transit/cache';
import { parseStatic, resolveStop } from '@/server/transit/static';

const NOW = Date.parse('2026-09-12T16:00:00Z');
const seconds = (delta: number) => Math.floor(NOW / 1000) + delta;
const staticBytes = (additionalStops = '') => zipSync({
  'stops.txt': strToU8('stop_id,stop_code,stop_name,stop_lat,stop_lon,location_type\ninternal-1,6001,"Barrington, after Duke",44.65,-63.57,0\ninternal-2,6002,Other stop,44.651,-63.57,0\nfar,9000,Far away,45.5,-63.57,0\nstation,9999,Not a platform,44.65,-63.57,1\n' + additionalStops),
  'routes.txt': strToU8('route_id,agency_id,route_short_name,route_long_name,route_type\nr1,Halifax,1,Spring Garden,3\nr2,Halifax,2,Fairview,3\nferry,Halifax,F1,Ferry,4\n'),
  'trips.txt': strToU8('trip_id,route_id,trip_headsign,direction_id\ntrip1,r1,To Bridge Terminal,0\ntrip2,r2,To Fairview,1\nferry-trip,ferry,To Dartmouth,0\n'),
  'stop_times.txt': strToU8('deliberately ignored'),
});
function realtime(entities: Proto.IFeedEntity[] = [], age = 0) {
  return GtfsRealtimeBindings.transit_realtime.FeedMessage.encode({ header: { gtfsRealtimeVersion: '2.0', timestamp: seconds(-age) }, entity: entities }).finish();
}
function trip(overrides: Partial<Proto.ITripUpdate> = {}, id = 'entity1'): Proto.IFeedEntity {
  return { id, tripUpdate: { trip: { tripId: 'trip1', routeId: 'r1', startDate: '20260912' },
    stopTimeUpdate: [{ stopId: '6001', stopSequence: 4, departure: { time: seconds(300), delay: 40 } }], ...overrides } };
}
function alert(selector: Proto.IEntitySelector, overrides: Partial<Proto.IAlert> = {}, id = 'alert1'): Proto.IFeedEntity {
  return { id, alert: { informedEntity: [selector], headerText: { translation: [{ text: 'Service notice', language: 'en' }] },
    descriptionText: { translation: [{ text: 'Read the official notice.', language: 'en' }] }, ...overrides } };
}
function setup(trips = realtime([trip()]), alerts = realtime(), staticFeed = staticBytes()) {
  const fetcher = vi.fn(async (url: string | URL | Request) => {
    const bytes = String(url) === FEEDS.static ? staticFeed : String(url) === FEEDS.trips ? trips : alerts;
    return new Response(Buffer.from(bytes));
  });
  let current = NOW;
  const service = createTransitService({ fetcher: fetcher as typeof fetch, now: () => current });
  return { ...service, fetcher, advance: (ms: number) => { current += ms; } };
}

describe('official static stop catalogue', () => {
  it('parses quoted names and joins realtime stop codes to stable stop IDs', async () => {
    const service = setup();
    const nearby = await service.transitNearby({ latitude: 44.65, longitude: -63.57 });
    expect(nearby.stops.map(stop => stop.id)).toEqual(['internal-1', 'internal-2']);
    expect(nearby.stops[0]).toMatchObject({ name: 'Barrington, after Duke', code: '6001', distanceMeters: 0 });
    const board = await service.transitBoard('internal-1');
    expect(board.departures[0]).toMatchObject({ route: '1', headsign: 'To Bridge Terminal', delaySeconds: 40 });
    expect(board.stale).toBe(false);
    expect(board.alertsStale).toBe(false);
  });
  it('returns no stops beyond 3 km and rejects invalid coordinates and IDs before upstream calls', async () => {
    const service = setup();
    await expect(service.transitNearby({ latitude: NaN, longitude: 0 })).rejects.toMatchObject({ status: 400 });
    await expect(service.transitBoard('../../private')).rejects.toMatchObject({ status: 400 });
    expect(service.fetcher).not.toHaveBeenCalled();
    expect((await service.transitNearby({ latitude: 0, longitude: 0 })).stops).toEqual([]);
    await expect(service.transitBoard('missing')).rejects.toMatchObject({ status: 404 });
    expect(service.fetcher).toHaveBeenCalledTimes(1);
  });
  it('does not resolve an ambiguous stop_code to an arbitrary stop', () => {
    const bytes = staticBytes('duplicate,6001,Duplicate code,44.65,-63.57,0\n');
    const data = parseStatic(bytes);
    expect(resolveStop(data, '6001')).toBeUndefined();
    expect(resolveStop(data, 'internal-1')?.id).toBe('internal-1');
  });
  it('rejects incomplete and oversized static catalogues', () => {
    expect(() => parseStatic(zipSync({ 'stops.txt': strToU8('stop_id\n1\n') }))).toThrow();
    const oversized = zipSync({ 'stops.txt': new Uint8Array(20 * 1024 * 1024 + 1) });
    expect(() => parseStatic(oversized)).toThrow(TransitError);
  });
});

describe('real predictions only', () => {
  it('suppresses missing, old and implausibly future feed timestamps', async () => {
    for (const age of [121, -61]) {
      const board = await setup(realtime([trip()], age)).transitBoard('6001');
      expect(board.departures).toEqual([]);
      expect(board.stale).toBe(true);
    }
    const missingTimestamp = GtfsRealtimeBindings.transit_realtime.FeedMessage.encode({ header: { gtfsRealtimeVersion: '2.0' }, entity: [trip()] }).finish();
    expect((await setup(missingTimestamp).transitBoard('6001')).stale).toBe(true);
  });
  it('excludes cancelled/deleted trips and skipped/no-data/no-pickup stops', async () => {
    const entities = [
      trip({ trip: { tripId: 'trip1', scheduleRelationship: 3 } }, 'cancelled'),
      trip({ trip: { tripId: 'trip1', scheduleRelationship: 7 } }, 'deleted-trip'),
      { ...trip({}, 'deleted-entity'), isDeleted: true },
      ...[1, 2].map(value => trip({ stopTimeUpdate: [{ stopId: '6001', scheduleRelationship: value, departure: { time: seconds(200) } }] }, `stop-${value}`)),
      trip({ stopTimeUpdate: [{ stopId: '6001', departure: { time: seconds(200) }, stopTimeProperties: { pickupType: 1 } }] }, 'no-pickup'),
      trip({ trip: { tripId: 'ferry-trip', routeId: 'ferry' } }, 'ferry'),
    ];
    expect((await setup(realtime(entities)).transitBoard('6001')).departures).toEqual([]);
  });
  it('ignores arrival-only, delay-only, past, too-far-future and old vehicle updates', async () => {
    const entities = [
      trip({ stopTimeUpdate: [{ stopId: '6001', arrival: { time: seconds(100) } }] }, 'arrival'),
      trip({ stopTimeUpdate: [{ stopId: '6001', departure: { delay: 60 } }] }, 'delay'),
      trip({ stopTimeUpdate: [{ stopId: '6001', departure: { time: seconds(-1) } }] }, 'past'),
      trip({ stopTimeUpdate: [{ stopId: '6001', departure: { time: seconds(5401) } }] }, 'future'),
      trip({ timestamp: seconds(-121) }, 'old'),
    ];
    expect((await setup(realtime(entities)).transitBoard('6001')).departures).toEqual([]);
  });
  it('keeps absent delay unknown and uses the actual realtime headsign', async () => {
    const entity = trip({ tripProperties: { tripHeadsign: 'Airport via Fall River' }, stopTimeUpdate: [{ stopId: '6001', departure: { time: seconds(200) } }] });
    expect((await setup(realtime([entity])).transitBoard('6001')).departures[0]).toMatchObject({ headsign: 'Airport via Fall River', delaySeconds: null });
  });
  it('deduplicates Halifax modified-trip entries, sorts and caps to 8 predictions', async () => {
    const original = trip();
    const modified = trip({ trip: { modifiedTrip: { affectedTripId: 'trip1', startDate: '20260912', startTime: '12:00:00' } } });
    expect((await setup(realtime([original, modified])).transitBoard('6001')).departures).toHaveLength(1);
    const many = Array.from({ length: 12 }, (_, index) => trip({ stopTimeUpdate: [{ stopId: '6001', stopSequence: index, departure: { time: seconds(600 - index * 10) } }] }, `entity-${index}`));
    const board = await setup(realtime(many)).transitBoard('6001');
    expect(board.departures).toHaveLength(8);
    expect(board.departures[0].departureAt).toBe(new Date(seconds(490) * 1000).toISOString());
  });
  it('uses the current trip ID when Halifax modifiedTrip references a preceding journey', async () => {
    const direct = trip({ trip: { tripId: 'trip1', routeId: 'r1', startDate: '20260912' }, vehicle: { id: '3308' }, tripProperties: { tripId: 'trip1', startDate: '20260912' } }, 'current');
    const alias = trip({ trip: { modifiedTrip: { affectedTripId: 'trip2', startDate: '20260912', startTime: '11:30:00' } }, vehicle: { id: '3308' },
      tripProperties: { tripId: 'trip1', startDate: '20260912' }, stopTimeUpdate: [{ stopId: '6001', stopSequence: 9, departure: { time: seconds(300), delay: 40 } }] }, 'previous');
    // Same real journey, different descriptor ID (and possibly sequence numbering).
    const board = await setup(realtime([alias, direct])).transitBoard('6001');
    expect(board.departures).toHaveLength(1);
    expect(board.departures[0]).toMatchObject({ route: '1', headsign: 'To Bridge Terminal' });
    expect(board.departures[0].id).toContain('trip1:20260912:');
  });
  it('preserves distinct frequency instances and genuinely distinct trips at the same time', async () => {
    const first = trip({ trip: { tripId: 'trip1', routeId: 'r1', startDate: '20260912', startTime: '12:00:00' } }, 'frequency-first');
    const second = trip({ trip: { tripId: 'trip1', routeId: 'r1', startDate: '20260912', startTime: '12:10:00' } }, 'frequency-second');
    const another = trip({ trip: { tripId: 'another-trip', routeId: 'r1', startDate: '20260912', startTime: '12:00:00' } }, 'other-bus');
    const board = await setup(realtime([first, second, another])).transitBoard('6001');
    expect(board.departures).toHaveLength(3);
    expect(new Set(board.departures.map(departure => departure.id)).size).toBe(3);
  });
  it('normalizes a missing startTime only when the same journey has one unambiguous value', async () => {
    const direct = trip({ trip: { tripId: 'trip1', routeId: 'r1', startDate: '20260912' } }, 'running');
    const withStart = trip({ trip: { tripId: 'trip1', routeId: 'r1', startDate: '20260912', startTime: '12:00:00' } }, 'with-start');
    expect((await setup(realtime([direct, withStart])).transitBoard('6001')).departures).toHaveLength(1);
  });
  it('does not resurrect a cancelled journey through a modified alias', async () => {
    const cancelled = trip({ trip: { tripId: 'trip1', routeId: 'r1', startDate: '20260912', scheduleRelationship: 3 } });
    const alias = trip({ trip: { modifiedTrip: { affectedTripId: 'trip2', startDate: '20260912' } }, tripProperties: { tripId: 'trip1', startDate: '20260912' } }, 'alias');
    expect((await setup(realtime([cancelled, alias])).transitBoard('6001')).departures).toEqual([]);
  });
  it('uses reassigned stop IDs instead of publishing departures at the old stop', async () => {
    const entity = trip({ stopTimeUpdate: [{ stopId: '6001', stopTimeProperties: { assignedStopId: '6002' }, departure: { time: seconds(100) } }] });
    const service = setup(realtime([entity]));
    expect((await service.transitBoard('6001')).departures).toEqual([]);
    expect((await service.transitBoard('6002')).departures).toHaveLength(1);
  });
});

describe('applicable service notices', () => {
  it('matches stop/route/agency selectors with AND inside each and OR across selectors', async () => {
    const notices = [
      alert({ stopId: '6001', routeId: 'r1', agencyId: 'Halifax' }, {}, 'stop-route'),
      alert({ stopId: '6002', routeId: 'r1' }, {}, 'other-stop'),
      alert({ routeId: 'r2' }, {}, 'other-route'),
      alert({ routeId: 'r1', agencyId: 'Elsewhere' }, {}, 'other-agency'),
      alert({ routeId: 'r1' }, {}, 'route'),
      alert({ agencyId: 'Halifax' }, {}, 'systemwide'),
      alert({}, { informedEntity: [{ stopId: '6002' }, { stopId: '6001' }] }, 'one-matches'),
      alert({ stopId: '6001', routeType: 4 }, {}, 'ferry-only'),
    ];
    const result = await setup(realtime([trip()]), realtime(notices)).transitBoard('6001');
    expect(result.alerts.map(notice => notice.id)).toEqual(['stop-route', 'route', 'systemwide', 'one-matches']);
  });
  it('retains explicit stop closures without current trips but never broadens trip/direction restrictions', async () => {
    const notices = [
      alert({ stopId: '6001', routeId: 'r1' }, {}, 'closure'),
      alert({ stopId: '6001', trip: { tripId: 'trip2' } }, {}, 'other-trip'),
      alert({ stopId: '6001', routeId: 'r1', directionId: 1 }, {}, 'other-direction'),
    ];
    const result = await setup(realtime(), realtime(notices)).transitBoard('6001');
    expect(result.alerts.map(notice => notice.id)).toEqual(['closure']);
  });
  it('checks active periods, translated content, and safe outbound URLs', async () => {
    const notices = [
      alert({ stopId: '6001' }, { activePeriod: [{ start: seconds(1) }] }, 'future'),
      alert({ stopId: '6001' }, { activePeriod: [{ end: seconds(0) }] }, 'expired'),
      alert({ stopId: '6001' }, { activePeriod: [{ start: seconds(-100), end: seconds(100) }], url: { translation: [{ text: 'javascript:alert(1)' }] },
        headerText: { translation: [{ text: 'Francais', language: 'fr' }, { text: 'English notice', language: 'en' }] } }, 'active'),
    ];
    const result = await setup(realtime(), realtime(notices)).transitBoard('6001');
    expect(result.alerts).toEqual([{ id: 'active', title: 'English notice', description: 'Read the official notice.', url: null }]);
  });
  it('distinguishes an unavailable alert feed from a healthy feed with no notices', async () => {
    const service = setup();
    const original = service.fetcher.getMockImplementation()!;
    service.fetcher.mockImplementation(async url => { if (String(url) === FEEDS.alerts) throw new Error('private upstream detail'); return original(url); });
    const board = await service.transitBoard('6001');
    expect(board).toMatchObject({ stale: false, alertsStale: true, alertsUpdatedAt: null, alerts: [] });
    expect(board.departures).toHaveLength(1);
  });
  it('labels an old alert feed and retains active notices without claiming they are current', async () => {
    const result = await setup(realtime([trip()]), realtime([alert({ stopId: '6001' })], 300)).transitBoard('6001');
    expect(result).toMatchObject({ stale: false, alertsStale: true, alertsUpdatedAt: new Date(seconds(-300) * 1000).toISOString() });
    expect(result.alerts).toHaveLength(1);
  });
});

describe('bounded upstream access and caching', () => {
  it('single-flights static/realtime requests and refreshes only after TTL', async () => {
    const service = setup();
    await Promise.all(Array.from({ length: 5 }, () => service.transitBoard('6001')));
    expect(service.fetcher).toHaveBeenCalledTimes(3);
    service.advance(24_999);
    await service.transitBoard('6001');
    expect(service.fetcher).toHaveBeenCalledTimes(3);
    service.advance(2);
    await service.transitBoard('6001');
    expect(service.fetcher).toHaveBeenCalledTimes(5);
  });
  it('backs off failures without cached data and sanitizes upstream errors', async () => {
    let time = NOW;
    const load = vi.fn(async () => { throw new Error('secret upstream response'); });
    const get = createCache(load, 1000, 2000, () => time);
    await expect(get()).rejects.toBeInstanceOf(TransitError);
    await expect(get()).rejects.toThrow('Halifax Transit information is temporarily unavailable');
    expect(load).toHaveBeenCalledTimes(1);
    time += 30_001;
    await expect(get()).rejects.toBeInstanceOf(TransitError);
    expect(load).toHaveBeenCalledTimes(2);
  });
  it('marks failed refreshes stale, suppresses countdowns and retains prior timestamps', async () => {
    const service = setup();
    const first = await service.transitBoard('6001');
    service.advance(26_000);
    service.fetcher.mockRejectedValue(new Error('offline'));
    const next = await service.transitBoard('6001');
    expect(next).toMatchObject({ stale: true, alertsStale: true, departures: [], updatedAt: first.updatedAt });
    const calls = service.fetcher.mock.calls.length;
    await service.transitBoard('6001');
    expect(service.fetcher).toHaveBeenCalledTimes(calls);
  });
  it('limits nearest stops to 30 and static cache stale use to seven days', async () => {
    const manyStops = Array.from({ length: 40 }, (_, i) => `stop-${i},code-${i},Stop ${i},44.65,-63.57,0\n`).join('');
    const service = setup(realtime(), realtime(), staticBytes(manyStops));
    expect((await service.transitNearby({ latitude: 44.65, longitude: -63.57 })).stops).toHaveLength(30);
    service.advance(6 * 60 * 60_000 + 1);
    service.fetcher.mockRejectedValue(new Error('offline'));
    expect((await service.transitNearby({ latitude: 44.65, longitude: -63.57 })).stale).toBe(true);
    service.advance(7 * 24 * 60 * 60_000);
    await expect(service.transitNearby({ latitude: 44.65, longitude: -63.57 })).rejects.toBeInstanceOf(TransitError);
  });
  it('uses fixed feed URLs, disallows redirects, and cancels oversized responses', async () => {
    const fetcher = vi.fn(async () => new Response(new Uint8Array([1, 2]), { headers: { 'content-length': String(13 * 1024 * 1024) } }));
    await expect(fetchFeed('static', fetcher)).rejects.toBeInstanceOf(TransitError);
    expect(fetcher).toHaveBeenCalledWith(FEEDS.static, expect.objectContaining({ redirect: 'error', cache: 'no-store', credentials: 'omit', signal: expect.any(AbortSignal) }));
    const tooLarge = vi.fn(async () => new Response(new Uint8Array(5 * 1024 * 1024 + 1)));
    await expect(fetchFeed('trips', tooLarge)).rejects.toBeInstanceOf(TransitError);
  });
  it('does not treat malformed or differential realtime feeds as fresh empty service', async () => {
    const differential = GtfsRealtimeBindings.transit_realtime.FeedMessage.encode({ header: { gtfsRealtimeVersion: '2.0', incrementality: 1, timestamp: seconds(0) }, entity: [] }).finish();
    for (const bytes of [new Uint8Array([255]), differential]) {
      expect(await setup(bytes).transitBoard('6001')).toMatchObject({ stale: true, departures: [], updatedAt: null });
    }
  });
});
