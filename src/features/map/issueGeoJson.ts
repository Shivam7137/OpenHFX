import type { PublicIssue } from '@/contracts';
import { toGeoJsonPosition } from '@/contracts';

export type IssueFeatureProperties = {
  id: string;
  reference: string;
  title: string;
  category: PublicIssue['category'];
  status: PublicIssue['status'];
  isUrgent: boolean;
};

export type IssueFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Point, IssueFeatureProperties>;

/** Only map-rendering fields cross into the source; the sheet reads the full record by ID. */
export const toIssueFeatureCollection = (issues: PublicIssue[]): IssueFeatureCollection => ({
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
      isUrgent: issue.reviewedPriority === 'urgent',
    },
  })),
});
