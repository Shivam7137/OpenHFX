import type { IssueSummary } from '@/contracts';

export function toImpactAreas(issues: IssueSummary[]): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  return { type: 'FeatureCollection', features: issues.flatMap(issue => {
    const radius = issue.impactRadiusMeters;
    if (!radius || !Number.isFinite(radius) || radius < 0 || radius > 500 || issue.status === 'resolved') return [];
    const lat = issue.publicLocation.latitude * Math.PI / 180;
    const lng = issue.publicLocation.longitude * Math.PI / 180;
    const angular = radius / 6_371_000;
    const ring: number[][] = [];
    for (let step = 0; step < 64; step++) {
      const bearing = step * 2 * Math.PI / 64;
      const y = Math.asin(Math.sin(lat) * Math.cos(angular) + Math.cos(lat) * Math.sin(angular) * Math.cos(bearing));
      const x = lng + Math.atan2(Math.sin(bearing) * Math.sin(angular) * Math.cos(lat), Math.cos(angular) - Math.sin(lat) * Math.sin(y));
      ring.push([x * 180 / Math.PI, y * 180 / Math.PI]);
    }
    ring.push([...ring[0]]);
    return [{ type: 'Feature' as const, id: issue.id, properties: { id: issue.id, status: issue.status, radius }, geometry: { type: 'Polygon' as const, coordinates: [ring] } }];
  }) };
}
