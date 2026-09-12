import type { IssueSummary } from '@/contracts';
import { toGeoJsonPosition } from './geo';

export type IssueFeatureProperties = {
  id: string;
  reference: string;
  title: string;
  category: IssueSummary['category'];
  status: IssueSummary['status'];
  approximate: boolean;
  isUrgent: boolean;
};

export type IssueFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Point, IssueFeatureProperties>;

/** Only map-rendering fields cross into the source; the sheet reads the full record by ID. */
export const toIssueFeatureCollection = (issues: IssueSummary[]): IssueFeatureCollection => ({
  type: 'FeatureCollection',
  features: issues.map((issue) => ({
    type: 'Feature',
    id: issue.id,
    geometry: { type: 'Point', coordinates: toGeoJsonPosition(issue.publicLocation) },
    properties: {
      id: issue.id,
      reference: issue.reference,
      title: issue.title,
      category: issue.category,
      status: issue.status,
      isUrgent: issue.priorityReviewed && issue.priority === 'urgent',
      approximate: issue.locationPrecision === 'approximate',
    },
  })),
});
