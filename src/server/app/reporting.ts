import { z } from 'zod';
import { CATEGORIES, type PreparationInput, type User } from '@/contracts';
import { EngineError, PROMPT_VERSION, distanceKm, prepareReport, summarizeProgress } from '@/server/engine';
import { attachmentIds, authenticated, fail, jsonBody, location, mutate, shortText } from './security';
import { addEvent, attachOwned, bump, detail, findIssue, publicSummary } from './domain';
import { id, now, type State, type Store, type StoredPreparation } from './store';
import { configuredProvider } from './provider';
import { ownedPreparationPhotos, preparationImages } from './preparation-images';

export const engineMode = () => ['demo', 'provider', 'unconfigured'].includes(process.env.OPENHFX_ENGINE_MODE || '') ? process.env.OPENHFX_ENGINE_MODE as 'demo' | 'provider' | 'unconfigured' : 'demo';
const preparationSchema = z.object({ draftId: shortText, originalDescription: z.string().trim().min(20).max(2000), publicLocation: location, category: z.enum(CATEGORIES).optional(), attachmentIds: attachmentIds.default([]) }).strict();
const createSchema = z.object({ draftId: shortText, originalDescription: z.string().trim().min(20).max(2000), title: z.string().trim().min(8).max(100), summary: z.string().trim().min(20).max(500), category: z.enum(CATEGORIES), exactLocation: location, publicLocationLabel: z.string().trim().min(1).max(160), sensitiveLocation: z.boolean(), attachmentIds, preparationId: z.string().optional(), relatedIssueId: z.string().optional() }).strict();
export function preparationProjection({ ownerId: _ownerId, ...value }: StoredPreparation) { return value; }
export async function createPreparation(request: Request, store: Store, actor: User | null) {
  const user = authenticated(actor); const input = await jsonBody(request, preparationSchema);
  const preparation = store.transaction(state => {
    ownedPreparationPhotos(state, user.id, input.attachmentIds);
    if (state.preparations.filter(row => row.ownerId === user.id && ['queued', 'running'].includes(row.status)).length >= 3) fail(429, 'RATE_LIMITED', 'Please wait for the current preparations to finish.');
    const value: StoredPreparation = { id: id(), ownerId: user.id, draftId: input.draftId, status: 'queued', suggestion: null, error: null, mode: engineMode(), provider: null, model: null, promptVersion: PROMPT_VERSION, attempts: 0, latencyMs: null, createdAt: now(), updatedAt: now() };
    state.preparations.push(value); return value;
  });
  // Detached engine completion only updates its preparation, never the resident's issue.
  setTimeout(() => { void runPreparation(store, preparation.id, input, user.id); }, 0);
  return preparationProjection(preparation);
}
async function runPreparation(store: Store, preparationId: string, input: PreparationInput, ownerId: string) {
  try {
    const context = store.transaction(state => {
      const record = state.preparations.find(row => row.id === preparationId)!;
      record.status = 'running'; record.updatedAt = now();
      return { mode: record.mode, organizations: state.organizations, candidateIssues: state.issues.filter(issue => distanceKm(input.publicLocation, issue.publicLocation) <= 2).sort((a, b) => distanceKm(input.publicLocation, a.publicLocation) - distanceKm(input.publicLocation, b.publicLocation)).slice(0, 12).map(issue => publicSummary(state, issue)) };
    });
    const result = await prepareReport(input, context, { mode: context.mode, ...(context.mode === 'provider' ? {
      provider: configuredProvider(), images: await preparationImages(store, ownerId, input.attachmentIds ?? []),
    } : {}) });
    store.transaction(state => {
      const record = state.preparations.find(row => row.id === preparationId)!;
      if (record.status !== 'running') return;
      Object.assign(record, result, { status: 'succeeded', updatedAt: now(), error: null });
    });
  } catch (error) {
    const typed = error instanceof EngineError ? error : null;
    try { store.transaction(state => {
      const record = state.preparations.find(row => row.id === preparationId)!;
      record.status = 'failed'; record.attempts = typed?.attempts || 0; record.updatedAt = now();
      record.error = { code: typed?.code || 'TEMPORARY_FAILURE', message: typed?.message || 'Suggestions are unavailable. Your report can still be submitted.' };
    }); } catch { /* The store may have closed during test/server shutdown. Restart recovery marks interrupted jobs failed. */ }
  }
}
export async function createIssue(request: Request, store: Store, actor: User | null) {
  const user = authenticated(actor); const input = await jsonBody(request, createSchema);
  return mutate(store, request, user, input, state => {
    const covered = state.organizations.some(org => org.categoryIds.includes(input.category) && input.exactLocation.latitude >= org.serviceArea.south && input.exactLocation.latitude <= org.serviceArea.north && input.exactLocation.longitude >= org.serviceArea.west && input.exactLocation.longitude <= org.serviceArea.east);
    if (!covered) fail(400, 'VALIDATION_ERROR', 'This local prototype supports reports in the Halifax demo area only (latitude 44.50–44.85, longitude -63.85–-63.40). Choose a location inside that area.');
    if (input.preparationId) {
      const preparation = state.preparations.find(row => row.id === input.preparationId && row.ownerId === user.id);
      if (!preparation || preparation.draftId !== input.draftId) fail(403, 'FORBIDDEN', 'That preparation does not belong to this draft.');
    }
    if (input.relatedIssueId) findIssue(state, input.relatedIssueId);
    const createdAt = now(); const issueId = id();
    // One stable 100 m grid point; the sensitive street label is never published.
    const metersLatitude = 111_320;
    const latitude = Math.round(input.exactLocation.latitude * metersLatitude / 100) * 100 / metersLatitude;
    const metersLongitude = 111_320 * Math.max(0.01, Math.cos(latitude * Math.PI / 180));
    const publicLocation = input.sensitiveLocation ? { latitude, longitude: Math.round(input.exactLocation.longitude * metersLongitude / 100) * 100 / metersLongitude } : input.exactLocation;
    const issue = { id: issueId, reference: `HFX-${String(145 + state.issues.length - 3).padStart(4, '0')}`, reporterId: user.id, originalDescription: input.originalDescription, title: input.title, summary: input.summary, category: input.category, exactLocation: input.exactLocation, publicLocation,
      publicLocationLabel: input.sensitiveLocation ? 'Approximate area · exact location private' : input.publicLocationLabel,
      locationPrecision: input.sensitiveLocation ? 'approximate' as const : 'exact' as const, status: 'reported' as const, priority: 'standard' as const, priorityReviewed: false, leadOrganizationId: null, leadOrganizationName: null, needsInformation: false, nextStep: 'Awaiting authority review', evidenceCount: 0, followersCount: 1, version: 1, createdAt, updatedAt: createdAt, isDemo: true, nominatedLeadId: null, relatedIssueId: input.relatedIssueId || null };
    state.issues.push(issue); state.follows.push({ userId: user.id, issueId });
    const photos = attachOwned(state, input.attachmentIds, issueId, user);
    if (photos.length) state.contributions.push({ id: id(), issueId, authorId: user.id, authorName: 'Reporting resident', body: 'Photo evidence attached to the original report.', attachments: photos, createdAt });
    addEvent(state, issue, user, 'issue.created', 'Demo report saved. Awaiting authority review; no external authority has been contacted.');
    return detail(state, issue, user);
  }, true);
}
export async function contribute(request: Request, store: Store, actor: User | null, issueId: string) {
  const user = authenticated(actor);
  const input = await jsonBody(request, z.object({ body: z.string().trim().max(2000), attachmentIds }).strict().refine(value => value.body.length > 0 || value.attachmentIds.length > 0, 'Add a note or ready photo.'));
  return mutate(store, request, user, input, state => {
    const issue = findIssue(state, issueId);
    const contribution = { id: id(), issueId, authorId: user.id, authorName: 'Resident', body: input.body, attachments: attachOwned(state, input.attachmentIds, issueId, user), createdAt: now() };
    state.contributions.push(contribution); bump(issue); addEvent(state, issue, user, 'evidence.added', 'A resident added evidence to this report.');
    const { authorId: _authorId, ...publicContribution } = contribution; return publicContribution;
  }, true);
}
export async function follow(request: Request, store: Store, actor: User | null, issueId: string) {
  const user = authenticated(actor); const input = await jsonBody(request, z.object({ following: z.boolean() }).strict());
  return mutate(store, request, user, input, state => {
    findIssue(state, issueId); state.follows = state.follows.filter(row => row.issueId !== issueId || row.userId !== user.id);
    if (input.following) state.follows.push({ userId: user.id, issueId }); return input;
  });
}
export async function reopen(request: Request, store: Store, actor: User | null, issueId: string) {
  const user = authenticated(actor); const input = await jsonBody(request, z.object({ reason: shortText, attachmentIds }).strict());
  return mutate(store, request, user, input, state => {
    const issue = findIssue(state, issueId);
    if (issue.status !== 'resolved') fail(409, 'VERSION_CONFLICT', 'Only resolved issues can receive a reopening request.');
    const photos = attachOwned(state, input.attachmentIds, issueId, user);
    const value = { id: id(), issueId, authorId: user.id, attachmentIds: input.attachmentIds, reason: input.reason, createdAt: now(), accepted: false };
    state.reopenRequests.push(value);
    state.contributions.push({ id: id(), issueId, authorId: user.id, authorName: 'Resident', body: input.reason, attachments: photos, createdAt: value.createdAt });
    bump(issue); addEvent(state, issue, user, 'reopen.requested', 'A resident requested another review of this resolved issue.');
    return { id: value.id, reason: value.reason, createdAt: value.createdAt, accepted: value.accepted };
  });
}
export function progressSummary(state: State, issueId: string) {
  return summarizeProgress(state.events.filter(row => row.issueId === issueId && row.visibility === 'public').map(row => ({ ...row, organizationName: state.organizations.find(org => org.id === row.organizationId)?.name || 'Resident' })));
}
