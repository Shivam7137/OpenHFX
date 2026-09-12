import type { Map as MapLibreMap } from 'maplibre-gl';
import { CATEGORIES, type Category, type IssueStatus } from '@/contracts';
import tokens from '../../../docs/design/tokens.json';

// Marker fill carries lifecycle, the interior glyph carries category, and the
// outer ring carries selection (docs/DESIGN_SPEC.md, P01).

export const STATUS_FILL: Record<IssueStatus, string> = {
  reported: tokens.color.ochre,
  // Acknowledged deliberately reuses Reported styling; the exact label appears in the detail.
  acknowledged: tokens.color.ochre,
  assigned: tokens.color.harbour,
  in_progress: tokens.color.harbour,
  resolved: tokens.color.success,
};

/** In progress is distinguished from Assigned by a lighter core, not by colour alone. */
export const LEGEND_ENTRIES: { status: IssueStatus; label: string }[] = [
  { status: 'reported', label: 'Reported' },
  { status: 'assigned', label: 'Assigned' },
  { status: 'in_progress', label: 'In progress' },
  { status: 'resolved', label: 'Resolved' },
];

const GLYPH_BOX = 24;
const GLYPH_SCALE = 2;

const CATEGORY_GLYPHS: Record<Category, string[]> = {
  trees: ['m12 4-4.5 6H10l-5 6.5h5.6V21h2.8v-4.5H19L14 10h2.5Z'],
  access: [
    'M12 6.6a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4Z',
    'M7.6 9.2h8.8M12 9.2v5.2h3.6l2.2 5M12 14.4a4.4 4.4 0 1 0 3.4 7.2',
  ],
  roads: ['M8.5 3 5.5 21M15.5 3l3 18', 'M12 5.5v2.6M12 11.2v2.6M12 16.9v2.6'],
  lighting: ['M12 3.2a6 6 0 0 0-3.4 10.9V17h6.8v-2.9A6 6 0 0 0 12 3.2Z', 'M9.6 20h4.8'],
  waste: ['M4.6 7h14.8M9.5 7V4.2h5V7', 'M6.4 7.6 7.5 20.4h9L17.6 7.6', 'M10.3 11v6M13.7 11v6'],
  other: ['M7.2 12h.01M12 12h.01M16.8 12h.01'],
};

const PRIORITY_BADGE_ID = 'priority-urgent-badge';

const drawGlyph = (paths: string[]): ImageData | null => {
  const canvas = document.createElement('canvas');
  canvas.width = GLYPH_BOX * GLYPH_SCALE;
  canvas.height = GLYPH_BOX * GLYPH_SCALE;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.scale(GLYPH_SCALE, GLYPH_SCALE);
  context.strokeStyle = tokens.color.surface;
  context.fillStyle = tokens.color.surface;
  context.lineWidth = 2;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (const definition of paths) {
    context.stroke(new Path2D(definition));
  }
  return context.getImageData(0, 0, canvas.width, canvas.height);
};

const drawPriorityBadge = (): ImageData | null => {
  const size = 18 * GLYPH_SCALE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.scale(GLYPH_SCALE, GLYPH_SCALE);
  context.beginPath();
  context.arc(9, 9, 8, 0, Math.PI * 2);
  context.fillStyle = tokens.color.ochre;
  context.fill();
  context.lineWidth = 2;
  context.strokeStyle = tokens.color.surface;
  context.stroke();

  context.strokeStyle = tokens.color.surface;
  context.lineWidth = 2;
  context.lineCap = 'round';
  context.stroke(new Path2D('M9 5.2v5M9 12.6v.2'));
  return context.getImageData(0, 0, size, size);
};

/**
 * Cluster counts are drawn as images rather than map glyphs: a style's font
 * stack is the provider's choice, and a missing glyph set stalls the whole
 * style. Counts are generated on demand from `styleimagemissing`.
 */
const CLUSTER_COUNT_PREFIX = 'cluster-count-';
const COUNT_BOX = 32;

const drawClusterCount = (label: string): ImageData | null => {
  const canvas = document.createElement('canvas');
  canvas.width = COUNT_BOX * GLYPH_SCALE;
  canvas.height = COUNT_BOX * GLYPH_SCALE;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.scale(GLYPH_SCALE, GLYPH_SCALE);
  context.fillStyle = tokens.color.surface;
  context.font = `600 15px ${tokens.font.referenceFamily}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, COUNT_BOX / 2, COUNT_BOX / 2);
  return context.getImageData(0, 0, canvas.width, canvas.height);
};

const addImage = (map: MapLibreMap, id: string, image: ImageData | null): boolean => {
  if (!image || map.hasImage(id)) return false;
  map.addImage(id, { width: image.width, height: image.height, data: new Uint8Array(image.data.buffer) }, { pixelRatio: GLYPH_SCALE });
  return true;
};

/** Registers the category glyphs and the reviewed-priority badge with the map. */
export const registerMarkerImages = (map: MapLibreMap) => {
  for (const category of CATEGORIES) {
    addImage(map, `category-${category}`, drawGlyph(CATEGORY_GLYPHS[category]));
  }
  addImage(map, PRIORITY_BADGE_ID, drawPriorityBadge());
};

export const PRIORITY_BADGE_IMAGE = PRIORITY_BADGE_ID;
export const CLUSTER_COUNT_IMAGE_PREFIX = CLUSTER_COUNT_PREFIX;

/**
 * Supplies a cluster-count image the first time the map asks for that number.
 * Returns true when a new image was added, which the caller uses to rebuild the
 * symbol buckets that were already laid out without it.
 */
export const resolveMissingImage = (map: MapLibreMap, imageId: string): boolean => {
  if (!imageId.startsWith(CLUSTER_COUNT_PREFIX)) return false;
  return addImage(map, imageId, drawClusterCount(imageId.slice(CLUSTER_COUNT_PREFIX.length)));
};
