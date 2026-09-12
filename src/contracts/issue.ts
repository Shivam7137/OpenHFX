import { z } from 'zod';
import { categorySchema, issueStatusSchema, locationPrecisionSchema, prioritySchema } from './enums';
import { latLngSchema } from './geo';

// PublicIssue is the sanitized projection defined in docs/SYSTEM_CONTRACTS.md.
// It must never gain reporter identity, exact private coordinates, staff notes,
// assignee IDs, storage keys, or raw AI output.

export const publicOrganizationProgressSchema = z.object({
  organizationId: z.string(),
  organizationName: z.string(),
  isLead: z.boolean(),
  progressText: z.string(),
});

export const publicIssueSchema = z.object({
  id: z.string(),
  reference: z.string(),
  title: z.string(),
  summary: z.string(),
  category: categorySchema,
  publicLocation: latLngSchema,
  publicLocationLabel: z.string(),
  locationPrecision: locationPrecisionSchema,
  status: issueStatusSchema,
  /** Present only once an authority has reviewed priority. */
  reviewedPriority: prioritySchema.nullable(),
  publishedNextStep: z.string().nullable(),
  organizationProgress: z.array(publicOrganizationProgressSchema),
  evidenceCount: z.number().int().min(0),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  version: z.number().int().min(1),
  isDemo: z.boolean(),
});

export type PublicOrganizationProgress = z.infer<typeof publicOrganizationProgressSchema>;
export type PublicIssue = z.infer<typeof publicIssueSchema>;

/** Envelope shape returned by every `/api/v1` list endpoint. */
export const publicIssueListSchema = z.object({
  items: z.array(publicIssueSchema),
  nextCursor: z.string().nullable(),
  syncedAt: z.iso.datetime(),
});

export type PublicIssueList = z.infer<typeof publicIssueListSchema>;
