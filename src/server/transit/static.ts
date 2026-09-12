import { unzipSync, strFromU8 } from 'fflate';
import { parse } from 'csv-parse/sync';
import type { Location } from '@/contracts';
import type { TransitStop } from '@/contracts/transit';
import { unavailable } from './cache';

export interface Route { id: string; name: string; longName: string; agency: string; type: number }
export interface Trip { id: string; routeId: string; headsign: string; direction: number | null }
export interface StaticTransit {
  stops: Map<string, TransitStop>; stopCodes: Map<string, string>;
  routes: Map<string, Route>; trips: Map<string, Trip>;
}

export function parseStatic(bytes: Uint8Array): StaticTransit {
  const allowed = new Set(['stops.txt', 'routes.txt', 'trips.txt']);
  let expanded = 0;
  const files = unzipSync(bytes, { filter: file => {
    if (!allowed.has(file.name)) return false;
    expanded += file.originalSize;
    if (expanded > 20 * 1024 * 1024) throw unavailable();
    return true;
  } });
  function rows(name: string): Record<string, string>[] {
    if (!files[name]) throw unavailable();
    return parse(strFromU8(files[name]), { columns: true, bom: true, skip_empty_lines: true, max_record_size: 16_384 });
  }
  const stops = new Map<string, TransitStop>();
  const stopCodes = new Map<string, string>();
  const ambiguousCodes = new Set<string>();
  for (const row of rows('stops.txt')) {
    const latitude = Number(row.stop_lat), longitude = Number(row.stop_lon);
    if (!row.stop_id || !row.stop_name || !row.stop_lat || !row.stop_lon || (row.location_type && row.location_type !== '0') || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) continue;
    const code = row.stop_code || row.stop_id;
    stops.set(row.stop_id, { id: row.stop_id, code, name: row.stop_name, location: { latitude, longitude } });
    if (stopCodes.has(code)) ambiguousCodes.add(code);
    stopCodes.set(code, row.stop_id);
  }
  for (const code of ambiguousCodes) stopCodes.delete(code);
  const routes = new Map<string, Route>();
  for (const row of rows('routes.txt')) {
    if (row.route_id) routes.set(row.route_id, { id: row.route_id, name: row.route_short_name || row.route_id, longName: row.route_long_name || '', agency: row.agency_id || '', type: Number(row.route_type) });
  }
  const trips = new Map<string, Trip>();
  for (const row of rows('trips.txt')) {
    if (row.trip_id && routes.has(row.route_id)) trips.set(row.trip_id, { id: row.trip_id, routeId: row.route_id, headsign: row.trip_headsign || '', direction: row.direction_id === '0' || row.direction_id === '1' ? Number(row.direction_id) : null });
  }
  if (!stops.size || !routes.size || !trips.size) throw unavailable();
  return { stops, stopCodes, routes, trips };
}

export function resolveStop(data: StaticTransit, id: string): TransitStop | undefined {
  return data.stops.get(id) || data.stops.get(data.stopCodes.get(id) || '');
}

export function distanceMeters(a: Location, b: Location): number {
  const radians = Math.PI / 180;
  const lat = (b.latitude - a.latitude) * radians;
  const lon = (b.longitude - a.longitude) * radians;
  const value = Math.sin(lat / 2) ** 2 + Math.cos(a.latitude * radians) * Math.cos(b.latitude * radians) * Math.sin(lon / 2) ** 2;
  return Math.round(6_371_000 * 2 * Math.asin(Math.min(1, Math.sqrt(value))));
}
