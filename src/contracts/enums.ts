import { z } from 'zod';

// Canonical enums from docs/SYSTEM_CONTRACTS.md. Serialized values and display
// labels are shared by both experiences; do not add values here alone.

export const CATEGORIES = ['access', 'trees', 'roads', 'lighting', 'waste', 'other'] as const;
export const ISSUE_STATUSES = ['reported', 'acknowledged', 'assigned', 'in_progress', 'resolved'] as const;
export const PRIORITIES = ['standard', 'priority', 'urgent'] as const;
export const LOCATION_PRECISIONS = ['exact', 'approximate'] as const;

export const categorySchema = z.enum(CATEGORIES);
export const issueStatusSchema = z.enum(ISSUE_STATUSES);
export const prioritySchema = z.enum(PRIORITIES);
export const locationPrecisionSchema = z.enum(LOCATION_PRECISIONS);

export type Category = z.infer<typeof categorySchema>;
export type IssueStatus = z.infer<typeof issueStatusSchema>;
export type Priority = z.infer<typeof prioritySchema>;
export type LocationPrecision = z.infer<typeof locationPrecisionSchema>;

export const CATEGORY_LABELS: Record<Category, string> = {
  access: 'Access',
  trees: 'Trees',
  roads: 'Roads',
  lighting: 'Lighting',
  waste: 'Waste',
  other: 'Other',
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  reported: 'Reported',
  acknowledged: 'Acknowledged',
  assigned: 'Assigned',
  in_progress: 'In progress',
  resolved: 'Resolved',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  standard: 'Standard',
  priority: 'Priority',
  urgent: 'Urgent',
};
