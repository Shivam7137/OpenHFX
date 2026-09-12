import type { Location } from './index';

export interface DemoTransitRoute {
  id: string; name: string; color: string; path: Location[]; durationSeconds: number;
}
export interface DemoTransitScenario {
  isDemo: true;
  routes: DemoTransitRoute[];
  stops: TransitStop[];
  vehicles: { id: string; routeId: string; offsetSeconds: number }[];
}

export interface TransitStop { id: string; code: string; name: string; location: Location; distanceMeters?: number }
export interface TransitDeparture { id: string; route: string; headsign: string; departureAt: string; delaySeconds: number | null }
export interface TransitAlert { id: string; title: string; description: string; url: string | null }
export interface TransitNearby { stops: TransitStop[]; updatedAt: string; source: string; stale: boolean }
export interface TransitBoard {
  stop: TransitStop; departures: TransitDeparture[]; alerts: TransitAlert[];
  updatedAt: string | null; alertsUpdatedAt: string | null;
  stale: boolean; alertsStale: boolean; source: string;
}
