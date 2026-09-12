import { z } from 'zod';
import { CATEGORIES, type EngineContext, type Location, type PreparationInput, type ReportSuggestion } from '../../contracts';
import { EngineError, type SafeCandidate, type SafeOrganization } from './types';

export const ENGINE_LIMITS = Object.freeze({
  deadlineMs: 20_000, outputTokens: 1_000, outputCharacters: 12_000,
  candidateRadiusKm: 2, candidates: 12, contextCandidates: 500, organizations: 100,
});

const id = z.string().trim().min(1).max(160);
const category = z.enum(CATEGORIES);
const location = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) });
const ids = z.array(id).max(3).refine(items => new Set(items).size === items.length);
export const reportSuggestionSchema = z.object({
  title: z.string().trim().min(8).max(100),
  summary: z.string().trim().min(20).max(500),
  category,
  suggestedOrganizationIds: ids,
  possibleRelatedIssueIds: ids,
  clarificationQuestions: z.array(z.string().trim().min(1).max(160)).max(2),
  suggestedNextSteps: z.array(z.string().trim().min(1).max(200)).max(3),
  prioritySuggestion: z.enum(['standard', 'priority', 'urgent']),
  priorityReason: z.string().trim().min(1).max(240),
}).strict();

const inputSchema = z.object({
  draftId: id,
  originalDescription: z.string().trim().min(20).max(2000),
  publicLocation: location,
  category: category.optional(),
});
const contextSchema = z.object({
  organizations: z.array(z.object({
    id, name: z.string().trim().min(1).max(200), categoryIds: z.array(category).max(6),
    serviceArea: z.object({ south: z.number().min(-90).max(90), north: z.number().min(-90).max(90),
      west: z.number().min(-180).max(180), east: z.number().min(-180).max(180) })
      .refine(area => area.south <= area.north),
    isDemo: z.boolean(),
  })).max(ENGINE_LIMITS.organizations),
  candidateIssues: z.array(z.object({
    id, title: z.string().max(100), summary: z.string().max(500), category,
    publicLocation: location,
    status: z.enum(['reported', 'acknowledged', 'assigned', 'in_progress', 'resolved']),
    updatedAt: z.string().datetime(),
  })).max(ENGINE_LIMITS.contextCandidates),
});

export function distanceKm(a: Location, b: Location): number {
  const radians = Math.PI / 180;
  const h = Math.sin((b.latitude - a.latitude) * radians / 2) ** 2
    + Math.cos(a.latitude * radians) * Math.cos(b.latitude * radians)
    * Math.sin((b.longitude - a.longitude) * radians / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function prepareContext(rawInput: PreparationInput, rawContext: EngineContext) {
  const parsedInput = inputSchema.safeParse(rawInput);
  const parsedContext = contextSchema.safeParse(rawContext);
  if (!parsedInput.success || !parsedContext.success) throw new EngineError('INVALID_INPUT');
  const input = parsedInput.data;
  const context = parsedContext.data;
  if (new Set(context.organizations.map(org => org.id)).size !== context.organizations.length
    || new Set(context.candidateIssues.map(issue => issue.id)).size !== context.candidateIssues.length) {
    throw new EngineError('INVALID_INPUT');
  }
  const organizations: SafeOrganization[] = context.organizations.filter(org => {
    const area = org.serviceArea;
    const point = input.publicLocation;
    const withinLongitude = area.west <= area.east
      ? point.longitude >= area.west && point.longitude <= area.east
      : point.longitude >= area.west || point.longitude <= area.east;
    return point.latitude >= area.south && point.latitude <= area.north && withinLongitude
      && (!input.category || org.categoryIds.includes(input.category));
  }).map(({ id, name, categoryIds }) => ({ id, name, categoryIds }));
  const candidates: SafeCandidate[] = context.candidateIssues
    .filter(issue => (!input.category || issue.category === input.category)
      && distanceKm(input.publicLocation, issue.publicLocation) <= ENGINE_LIMITS.candidateRadiusKm)
    .sort((a, b) => distanceKm(input.publicLocation, a.publicLocation) - distanceKm(input.publicLocation, b.publicLocation)
      || a.id.localeCompare(b.id))
    .slice(0, ENGINE_LIMITS.candidates)
    .map(({ id, title, summary, category, publicLocation }) => ({ id, title, summary, category, publicLocation }));
  return { input, organizations, candidates };
}

export type PreparedContext = ReturnType<typeof prepareContext>;

export function validateSuggestion(raw: unknown, context: PreparedContext, attempts: number): ReportSuggestion {
  let output = raw;
  try {
    if (typeof output === 'string') {
      if (output.length > ENGINE_LIMITS.outputCharacters) throw new Error();
      output = JSON.parse(output);
    } else if ((JSON.stringify(output)?.length ?? Infinity) > ENGINE_LIMITS.outputCharacters) throw new Error();
  } catch { throw new EngineError('INVALID_OUTPUT', attempts); }
  const parsed = reportSuggestionSchema.safeParse(output);
  if (!parsed.success) throw new EngineError('INVALID_OUTPUT', attempts);
  const result = parsed.data;
  const eligibleOrganizations = new Set(context.organizations.filter(org => org.categoryIds.includes(result.category)).map(org => org.id));
  const eligibleIssues = new Set(context.candidates.filter(issue => issue.category === result.category).map(issue => issue.id));
  if (result.suggestedOrganizationIds.some(id => !eligibleOrganizations.has(id))
    || result.possibleRelatedIssueIds.some(id => !eligibleIssues.has(id))) throw new EngineError('INVALID_OUTPUT', attempts);
  return result;
}
