import type { Location } from '@/contracts';

/** Same order as the existing GET /issues?bbox= contract. */
export type BoundingBox = readonly [west: number, south: number, east: number, north: number];
export const toGeoJsonPosition = ({ latitude, longitude }: Location): [number, number] => [longitude, latitude];
export const isWithinBounds = ({ latitude, longitude }: Location, [west, south, east, north]: BoundingBox) =>
  latitude >= south && latitude <= north && longitude >= west && longitude <= east;
