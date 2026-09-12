import { isWithinBounds, publicIssueListSchema, type BoundingBox, type PublicIssueList } from '@/contracts';
import { DEMO_PUBLIC_ISSUES } from '@/data/demo/issues';

// Stand-in for `GET /api/v1/issues?bbox=...` while the backend package (F0/F1
// data) is unbuilt. It returns the contract's list envelope and validates
// against the shared schema, so swapping in the real endpoint is a change of
// transport only. It is not a live subscription and must not be presented as one.

const PAGE_LIMIT = 200;

export const fetchPublicIssuesInBounds = async (bbox: BoundingBox): Promise<PublicIssueList> => {
  const items = DEMO_PUBLIC_ISSUES.filter((issue) => isWithinBounds(issue.publicLocation, bbox)).slice(0, PAGE_LIMIT);

  return publicIssueListSchema.parse({
    items,
    nextCursor: null,
    syncedAt: new Date().toISOString(),
  });
};

/** True while the map is reading the bundled fixture rather than a connected service. */
export const IS_DEMO_SOURCE = true;
