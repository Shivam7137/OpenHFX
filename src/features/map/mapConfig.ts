import type { BoundingBox } from '@/contracts';

// The basemap is supplied by a configured open style/tile provider. MapLibre GL
// JS is only the renderer; it ships no basemap of its own. The default below is
// OpenFreeMap, an OpenStreetMap-derived open provider that needs no API key.
// Point NEXT_PUBLIC_MAP_STYLE_URL at your own style or self-hosted tiles before
// treating this as a production service.

export const MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/positron';

export const MAP_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ??
  '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>';

/**
 * Opening demo view: the Halifax peninsula. The centre sits south of the
 * peninsula's midpoint so the markers land in the map area above the sheet
 * rather than behind it.
 */
export const HALIFAX_PENINSULA = {
  center: [-63.583, 44.6337] as [number, number],
  zoom: 12.5,
  minZoom: 9,
  maxZoom: 18,
};

/** Used to seed the first issue query before the map reports its own bounds. */
export const HALIFAX_PENINSULA_BBOX: BoundingBox = [-63.63, 44.61, -63.53, 44.68];

export const CLUSTER_RADIUS_PX = 56;
export const CLUSTER_MAX_ZOOM = 14;

/** Half of the tap box used for hit testing, in CSS pixels, so a 28 px marker still has a 48 px target. */
export const TAP_TOLERANCE_PX = 12;

/** Served from public/maplibre by scripts/copy-map-worker.mjs. */
export const MAP_WORKER_URL = '/maplibre/maplibre-gl-worker.mjs';

export const SOURCE_ID = 'public-issues';
export const LAYER_IDS = {
  clusters: 'public-issue-clusters',
  clusterCount: 'public-issue-cluster-count',
  selectionRing: 'public-issue-selection-ring',
  emphasisRing: 'public-issue-emphasis-ring',
  markers: 'public-issue-markers',
  categoryIcons: 'public-issue-category-icons',
  priorityBadges: 'public-issue-priority-badges',
} as const;
