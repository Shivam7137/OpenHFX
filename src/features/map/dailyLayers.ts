import type { GeoJSONSource, Map } from 'maplibre-gl';
import type { IssueSummary } from '@/contracts';
import type { TransitStop } from '@/contracts/transit';
import { toImpactAreas } from './impactAreas';
import tokens from '../../../docs/design/tokens.json';

export const AREA_SOURCE = 'reported-impact-areas';
export const STOP_SOURCE = 'transit-stops';
export const STOP_LAYER = 'transit-stop-symbols';
export const AREA_LAYER = 'reported-impact-fill';
const stopFeatures = (stops: TransitStop[]): GeoJSON.FeatureCollection<GeoJSON.Point> => ({
  type: 'FeatureCollection', features: stops.map(stop => ({ type: 'Feature', id: stop.id,
    properties: { id: stop.id }, geometry: { type: 'Point', coordinates: [stop.location.longitude, stop.location.latitude] } })),
});

export function addDailyLayers(map: Map, issues: IssueSummary[], stops: TransitStop[]) {
  map.addSource(AREA_SOURCE, { type: 'geojson', data: toImpactAreas(issues) });
  map.addLayer({ id: AREA_LAYER, type: 'fill', source: AREA_SOURCE,
    paint: { 'fill-color': tokens.color.ochre, 'fill-opacity': 0.16 } });
  map.addLayer({ id: 'reported-impact-outline', type: 'line', source: AREA_SOURCE,
    paint: { 'line-color': tokens.color.ochre, 'line-width': 1.5, 'line-dasharray': [3, 2], 'line-opacity': 0.75 } });
  const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = tokens.color.harbour; context.strokeStyle = tokens.color.surface; context.lineWidth = 4;
    context.beginPath(); context.roundRect(4, 4, 56, 56, 12); context.fill(); context.stroke();
    context.lineWidth = 3; context.beginPath(); context.roundRect(20, 14, 24, 32, 5); context.stroke();
    context.strokeRect(24, 19, 16, 12);
    context.fillStyle = tokens.color.surface;
    context.fillRect(23, 36, 4, 4); context.fillRect(37, 36, 4, 4);
    context.fillRect(23, 46, 4, 5); context.fillRect(37, 46, 4, 5);
    map.addImage('halifax-stop', context.getImageData(0, 0, 64, 64), { pixelRatio: 2 });
  }
  map.addSource(STOP_SOURCE, { type: 'geojson', data: stopFeatures(stops) });
  map.addLayer({ id: STOP_LAYER, type: 'symbol', source: STOP_SOURCE,
    layout: { 'icon-image': 'halifax-stop', 'icon-size': 0.85, 'icon-allow-overlap': false } });
  map.addLayer({ id: 'selected-transit-stop', type: 'circle', source: STOP_SOURCE,
    filter: ['==', ['get', 'id'], ''], paint: { 'circle-radius': 20, 'circle-opacity': 0,
      'circle-stroke-color': tokens.color.harbour, 'circle-stroke-width': 3 } });
}

export function updateDailyLayers(map: Map, issues: IssueSummary[], stops: TransitStop[], selectedStopId?: string | null) {
  (map.getSource(AREA_SOURCE) as GeoJSONSource | undefined)?.setData(toImpactAreas(issues));
  (map.getSource(STOP_SOURCE) as GeoJSONSource | undefined)?.setData(stopFeatures(stops));
  if (map.getLayer('selected-transit-stop')) map.setFilter('selected-transit-stop', ['==', ['get', 'id'], selectedStopId ?? '']);
}
