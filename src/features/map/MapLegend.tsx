'use client';

import { STATUS_FILL, LEGEND_ENTRIES } from './markerImages';

/** Acknowledged shares Reported styling; its exact label appears in the issue detail. */
export function MapLegend() {
  return (
    <div className="legend" aria-label="Marker legend">
      {LEGEND_ENTRIES.map(({ status, label }) => (
        <span key={status} className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: STATUS_FILL[status] }} aria-hidden />
          {label}
        </span>
      ))}
    </div>
  );
}
