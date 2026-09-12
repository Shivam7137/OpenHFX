import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import type { transit_realtime as Proto } from 'gtfs-realtime-bindings';
import type { TransitAlert, TransitDeparture, TransitStop } from '@/contracts/transit';
import { unavailable } from './cache';
import { resolveStop, type StaticTransit, type Route } from './static';

export type Feed = Proto.FeedMessage;
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

export function parseRealtime(bytes: Uint8Array): Feed {
  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(bytes);
  // Differential feeds require a different cache/merge contract.
  if (feed.header.incrementality === 1 || feed.entity.length > 25_000) throw unavailable();
  return feed;
}

export function feedTimestamp(feed: Feed | undefined): number | null {
  const value = Number(feed?.header.timestamp);
  return Number.isSafeInteger(value) && value > 0 && value <= 8_640_000_000_000 ? value * 1000 : null;
}

export function isFresh(feed: Feed | undefined, now: number): boolean {
  const timestamp = feedTimestamp(feed);
  return timestamp !== null && now - timestamp <= 120_000 && timestamp - now <= 60_000;
}

interface StopTrip {
  tripId: string; route: Route; direction: number | null; startDate: string; startTime: string;
}

function tripContext(update: Proto.ITripUpdate, data: StaticTransit): StopTrip | undefined {
  const descriptor = update.trip;
  // Halifax publishes a legacy descriptor and a modified-trip alias for the same
  // journey. affectedTripId can identify its preceding trip, while tripProperties
  // identifies the journey these predictions actually describe.
  const tripId = update.tripProperties?.tripId || descriptor.tripId || descriptor.modifiedTrip?.affectedTripId || '';
  const trip = data.trips.get(tripId);
  const replacedTrip = !!update.tripProperties?.tripId && descriptor.tripId !== update.tripProperties.tripId;
  const route = data.routes.get((replacedTrip ? trip?.routeId || descriptor.routeId : descriptor.routeId || trip?.routeId) || '');
  if (!tripId || !route || route.type !== 3) return;
  return { tripId, route,
    direction: own(descriptor, 'directionId') ? descriptor.directionId ?? null : trip?.direction ?? null,
    startDate: update.tripProperties?.startDate || descriptor.startDate || descriptor.modifiedTrip?.startDate || '',
    startTime: update.tripProperties?.startTime || descriptor.startTime || (descriptor.modifiedTrip?.affectedTripId === tripId ? descriptor.modifiedTrip.startTime : '') || '',
  };
}

function stopMatches(update: Proto.TripUpdate.IStopTimeUpdate, stop: TransitStop, data: StaticTransit): boolean {
  const id = update.stopTimeProperties?.assignedStopId || update.stopId;
  return !!id && resolveStop(data, id)?.id === stop.id;
}

export function departuresAt(feed: Feed, data: StaticTransit, stop: TransitStop, now: number): TransitDeparture[] {
  if (!isFresh(feed, now)) return [];
  const departures = new Map<string, TransitDeparture>();
  const updates: { update: Proto.ITripUpdate; context: StopTrip }[] = [];
  const startTimes = new Map<string, Set<string>>();
  for (const entity of feed.entity) {
    const update = entity.tripUpdate;
    if (entity.isDeleted || !update) continue;
    const context = tripContext(update, data);
    if (!context) continue;
    if (own(update, 'timestamp') && (now - Number(update.timestamp) * 1000 > 120_000 || Number(update.timestamp) * 1000 - now > 60_000)) continue;
    updates.push({ update, context });
    const day = `${context.tripId}:${context.startDate}`;
    if (context.startTime) {
      const values = startTimes.get(day) || new Set<string>();
      values.add(context.startTime); startTimes.set(day, values);
    }
  }
  const instance = (context: StopTrip) => `${context.tripId}:${context.startDate}:${context.startTime}`;
  // Running legacy entities sometimes omit startTime. Fill only an unambiguous
  // value; separate frequency runs with different startTime must stay separate.
  for (const { context } of updates) {
    const values = startTimes.get(`${context.tripId}:${context.startDate}`);
    if (!context.startTime && values?.size === 1) context.startTime = [...values][0];
  }
  const cancelledInstances = new Set(updates.filter(({ update }) => [3, 7].includes(update.trip.scheduleRelationship ?? 0)).map(({ context }) => instance(context)));
  const directInstances = new Set(updates.filter(({ update }) => !update.trip.modifiedTrip && update.stopTimeUpdate?.some(entry => stopMatches(entry, stop, data))).map(({ context }) => instance(context)));
  for (const { update, context } of updates) {
    if (cancelledInstances.has(instance(context))) continue;
    // Prefer one complete representation at this stop, preserving repeated stop
    // visits within that representation even if the alias renumbers sequences.
    if (update.trip.modifiedTrip && directInstances.has(instance(context))) continue;
    for (const entry of update.stopTimeUpdate || []) {
      if (!stopMatches(entry, stop, data) || [1, 2].includes(entry.scheduleRelationship ?? 0) || entry.stopTimeProperties?.pickupType === 1) continue;
      // Arrival-only updates and delay-only updates are not departure predictions.
      const predicted = entry.departure;
      const time = Number(predicted?.time);
      if (!predicted || !Number.isSafeInteger(time) || time * 1000 < now || time * 1000 > now + 90 * 60_000) continue;
      const id = [instance(context), stop.id, entry.stopSequence ?? time].join(':');
      const delay = own(predicted, 'delay') && Number.isFinite(predicted.delay) ? predicted.delay! : null;
      departures.set(id, { id, route: context.route.name,
        headsign: entry.stopTimeProperties?.stopHeadsign || update.tripProperties?.tripHeadsign || data.trips.get(context.tripId)?.headsign || context.route.longName || 'Destination unavailable',
        departureAt: new Date(time * 1000).toISOString(), delaySeconds: delay,
      });
    }
  }
  return [...departures.values()].sort((a, b) => a.departureAt.localeCompare(b.departureAt)).slice(0, 8);
}

function translation(value: Proto.ITranslatedString | null | undefined): string {
  const entries = value?.translation || [];
  return (entries.find(entry => entry.language?.toLowerCase().startsWith('en')) || entries.find(entry => !entry.language) || entries[0])?.text || '';
}

function selectorMatches(selector: Proto.IEntitySelector, stop: TransitStop, contexts: StopTrip[], data: StaticTransit): boolean {
  if (selector.stopId && resolveStop(data, selector.stopId)?.id !== stop.id) return false;
  if (!selector.stopId && !selector.routeId && !selector.agencyId && !selector.trip && !own(selector, 'routeType')) return false;
  let candidates = contexts;
  // Explicit stop+route notices (including stop closures with no active predictions)
  // identify their own relevant route. Trip/direction restrictions still need a match.
  if (selector.stopId && !selector.trip && !own(selector, 'directionId')) {
    candidates = [...data.routes.values()].filter(route => route.type === 3).map(route => ({ tripId: '', route, direction: null, startDate: '', startTime: '' }));
  } else if (!selector.stopId && selector.agencyId && !selector.routeId && !selector.trip && !own(selector, 'directionId')) {
    candidates = [...data.routes.values()].filter(route => route.type === 3).map(route => ({ tripId: '', route, direction: null, startDate: '', startTime: '' }));
  }
  return candidates.some(context => {
    if (selector.agencyId && selector.agencyId !== context.route.agency) return false;
    if (selector.routeId && selector.routeId !== context.route.id) return false;
    if (own(selector, 'routeType') && selector.routeType !== context.route.type) return false;
    if (own(selector, 'directionId') && selector.directionId !== context.direction) return false;
    const trip = selector.trip;
    if (trip) {
      if (trip.tripId && trip.tripId !== context.tripId) return false;
      if (trip.routeId && trip.routeId !== context.route.id) return false;
      if (trip.startDate && trip.startDate !== context.startDate) return false;
      if (trip.startTime && trip.startTime !== context.startTime) return false;
      if (own(trip, 'directionId') && trip.directionId !== context.direction) return false;
      // Do not broaden unsupported modified-trip selectors into a systemwide notice.
      if (trip.modifiedTrip) return false;
    }
    return true;
  });
}

export function alertsAt(feed: Feed, trips: Feed | undefined, data: StaticTransit, stop: TransitStop, now: number): TransitAlert[] {
  const contexts: StopTrip[] = [];
  if (trips && isFresh(trips, now)) for (const entity of trips.entity) {
    const update = entity.tripUpdate;
    if (!entity.isDeleted && update && update.stopTimeUpdate?.some(entry => stopMatches(entry, stop, data))) {
      const context = tripContext(update, data);
      if (context) contexts.push(context);
    }
  }
  const alerts = new Map<string, TransitAlert>();
  for (const entity of feed.entity) {
    const alert = entity.alert;
    if (entity.isDeleted || !alert) continue;
    const periods = alert.activePeriod || [];
    if (periods.length && !periods.some(period => (!own(period, 'start') || Number(period.start) * 1000 <= now) && (!own(period, 'end') || Number(period.end) * 1000 > now))) continue;
    if (!alert.informedEntity?.some(selector => selectorMatches(selector, stop, contexts, data))) continue;
    const title = translation(alert.headerText).slice(0, 300);
    if (!title) continue;
    let url: string | null = null;
    try {
      const parsed = new URL(translation(alert.url));
      if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) url = parsed.href;
    } catch { /* Missing or unsafe upstream URLs are not links. */ }
    alerts.set(entity.id, { id: entity.id, title, description: translation(alert.descriptionText).slice(0, 2000), url });
  }
  return [...alerts.values()].slice(0, 12);
}
