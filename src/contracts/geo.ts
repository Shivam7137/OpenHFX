import { z } from 'zod';

// JSON carries { latitude, longitude }; GeoJSON carries [longitude, latitude].
// Keep every conversion in this module so the order can never drift.

export const latLngSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type LatLng = z.infer<typeof latLngSchema>;

/** [west, south, east, north], the order used by `GET /issues?bbox=`. */
export type BoundingBox = readonly [number, number, number, number];

export const toGeoJsonPosition = ({ latitude, longitude }: LatLng): [number, number] => [longitude, latitude];

export const fromGeoJsonPosition = ([longitude, latitude]: [number, number]): LatLng => ({ latitude, longitude });

export const bboxToParam = (bbox: BoundingBox): string => bbox.join(',');

export const isWithinBounds = ({ latitude, longitude }: LatLng, [west, south, east, north]: BoundingBox): boolean =>
  latitude >= south && latitude <= north && longitude >= west && longitude <= east;
