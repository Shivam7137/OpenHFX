import type { Map as MapLibreMap } from 'maplibre-gl';
import tokens from '../../../docs/design/tokens.json';

// The basemap comes from a third-party open style, so its layer names are not
// ours to rely on. These overrides pull water, parks, and the land background
// towards the harbour palette and mute commercial points of interest
// (docs/DESIGN_SPEC.md, P01). They are cosmetic by design: a style that names
// its layers differently simply keeps its own colours.

const WATER = /water|ocean|sea|bathymetry/i;
const GREEN = /park|grass|wood|forest|golf|pitch|cemetery|garden|scrub/i;
const COMMERCIAL_LABEL = /poi|place_label_other|business|shop|commercial/i;

export const applyBrandOverrides = (map: MapLibreMap) => {
  const layers = map.getStyle()?.layers ?? [];

  for (const layer of layers) {
    try {
      if (layer.type === 'background') {
        map.setPaintProperty(layer.id, 'background-color', tokens.color.paper);
        continue;
      }

      if (layer.type === 'fill') {
        if (WATER.test(layer.id)) map.setPaintProperty(layer.id, 'fill-color', tokens.color.seaGlass);
        else if (GREEN.test(layer.id)) map.setPaintProperty(layer.id, 'fill-color', tokens.color.park);
        continue;
      }

      if (layer.type === 'symbol' && COMMERCIAL_LABEL.test(layer.id)) {
        map.setLayoutProperty(layer.id, 'visibility', 'none');
      }
    } catch {
      // A provider style may not expose the property we assumed; its own
      // appearance is an acceptable outcome and never blocks the map.
    }
  }
};
