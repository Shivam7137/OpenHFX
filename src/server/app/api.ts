import { z } from 'zod';
import { transitNearby, transitBoard, TransitError } from '@/server/transit';
import { TRANSIT_DEMO } from './seed';
import { CATEGORIES, type User } from '@/contracts';
import { ApiError, authenticated, checkOrigin, coordinator, currentUser, fail, jsonBody, localDemo, sessionCookie, signOut } from './security';
import { detail, findIssue, matches, participates, publicSummary, requireAuthorityRead } from './domain';
import { contribute, createIssue, createPreparation, engineMode, follow, preparationProjection, progressSummary, reopen } from './reporting';
import { acceptAssignment, assignmentProgress, createTask, publishUpdate, taskProgress } from './workflow';
import { decide } from './decisions';
import { demoCallInfo, initiateDemoCall } from './demo-calls';
import { serveImage, upload } from './uploads';
import { getStore, id, now, type State, type Store } from './store';

const response = (data: unknown, status = 200, extraHeaders?: HeadersInit) => Response.json({ data, ...(data && typeof data === 'object' && 'version' in data ? { version: data.version } : {}) }, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extraHeaders } });
const list = (items: unknown[]) => Response.json({ items, nextCursor: null, syncedAt: now() }, { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
function afterSequence(params: URLSearchParams) {
  const value = params.get('after') || '0';
  if (!/^\d{1,20}$/.test(value)) fail(400, 'VALIDATION_ERROR', 'Use a valid event sequence.');
  return BigInt(value);
}
function mayReadNotification(state: State, eventId: string, actor: User) {
  const event = state.events.find(row => row.id === eventId);
  return !!event && (event.visibility === 'public' || (actor.role === 'coordinator' && participates(state, event.issueId, actor)) || (actor.role === 'worker' && state.tasks.some(row => row.issueId === event.issueId && row.assigneeUserId === actor.id)));
}
function filterIssues(state: State, params: URLSearchParams, user: User | null, source = state.issues) {
  let issues = source;
  const category = params.get('category'); const status = params.get('status'); const q = params.get('q')?.trim().toLowerCase();
  if (category) {
    if (!(CATEGORIES as readonly string[]).includes(category)) fail(400, 'VALIDATION_ERROR', 'Unknown category.');
    issues = issues.filter(row => row.category === category);
  }
  if (status) {
    if (!['reported', 'acknowledged', 'assigned', 'in_progress', 'resolved'].includes(status)) fail(400, 'VALIDATION_ERROR', 'Unknown issue status.');
    issues = issues.filter(row => row.status === status);
  }
  if (q) { if (q.length > 200) fail(400, 'VALIDATION_ERROR', 'Search text is too long.'); issues = issues.filter(row => `${row.reference} ${row.title} ${row.summary} ${row.publicLocationLabel}`.toLowerCase().includes(q)); }
  if (params.get('following') === 'true') { const actor = authenticated(user); issues = issues.filter(row => state.follows.some(f => f.issueId === row.id && f.userId === actor.id)); }
  if (params.has('bbox')) {
    const values = params.get('bbox')!.split(',').map(Number);
    if (values.length !== 4 || values.some(value => !Number.isFinite(value))) fail(400, 'VALIDATION_ERROR', 'Use a valid west,south,east,north bounding box.');
    const [west, south, east, north] = values;
    if (west < -180 || east > 180 || south < -90 || north > 90 || west >= east || south >= north) fail(400, 'VALIDATION_ERROR', 'The bounding box is invalid.');
    issues = issues.filter(row => row.publicLocation.longitude >= west && row.publicLocation.longitude <= east && row.publicLocation.latitude >= south && row.publicLocation.latitude <= north);
  }
  return issues.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 200);
}
export function createApiHandler(store: Store) {
  return async function handle(request: Request): Promise<Response> {
    const requestId = id();
    try {
      const url = new URL(request.url); const path = url.pathname.replace(/^\/api\/v1\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
      if (!url.pathname.startsWith('/api/v1/')) fail(404, 'NOT_FOUND', 'Endpoint not found.');
      const method = request.method; const state = store.read(); const user = currentUser(request, state);
      if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) checkOrigin(request);
      if (path[0] === 'transit' && method === 'GET') {
        if (path.length === 2 && path[1] === 'demo') return response(TRANSIT_DEMO);
        if (path.length === 1) {
          const coordinate = (name: string) => {
            const value = url.searchParams.get(name);
            if (!value?.trim() || !Number.isFinite(Number(value))) fail(400, 'VALIDATION_ERROR', 'Choose a valid map location.');
            return Number(value);
          };
          return response(await transitNearby({ latitude: coordinate('latitude'), longitude: coordinate('longitude') }));
        }
        if (path.length === 3 && path[1] === 'stops') return response(await transitBoard(path[2]));
      }
      if (path[0] === 'health' && path.length === 1 && method === 'GET') return response({ status: 'ok', storage: 'local-sqlite', demoMode: localDemo(request), engineMode: engineMode() });
      if (path[0] === 'session' && path.length === 1) {
        const info = (account: User | null) => ({ user: account, demoMode: localDemo(request), engineMode: engineMode(), accounts: localDemo(request) ? state.users : [] });
        if (method === 'GET') return response(info(user));
        if (method === 'POST') { const input = await jsonBody(request, z.object({ accountId: z.string().min(1) }).strict()); const session = sessionCookie(store, input.accountId, request); return response(info(session.user), 200, { 'Set-Cookie': session.cookie }); }
        if (method === 'DELETE') { signOut(store, request); return response(info(null), 200, { 'Set-Cookie': 'openhfx_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0' }); }
      }
      if (path[0] === 'organizations' && path.length === 1 && method === 'GET') return list(state.organizations);
      if (path[0] === 'teams' && path.length === 1 && method === 'GET') { const actor = coordinator(user); return list(state.teams.filter(row => row.organizationId === actor.organizationId)); }
      if (path[0] === 'attachments') {
        if (path.length === 1 && method === 'POST') return response(await upload(request, store, user), 201);
        if (path.length === 2 && method === 'GET') return serveImage(store, user, path[1]);
      }
      if (path[0] === 'report-preparations') {
        if (path.length === 1 && method === 'POST') return response(await createPreparation(request, store, user), 202);
        if (path.length === 2 && method === 'GET') { const actor = authenticated(user); const preparation = state.preparations.find(row => row.id === path[1] && row.ownerId === actor.id) || fail(404, 'NOT_FOUND', 'Preparation not found.'); return response(preparationProjection(preparation)); }
      }
      if (path[0] === 'issues') {
        if (path.length === 1 && method === 'GET') return list(filterIssues(state, url.searchParams, user).map(row => publicSummary(state, row)));
        if (path.length === 1 && method === 'POST') return response(await createIssue(request, store, user), 201);
        if (path.length === 2 && method === 'GET') return response(detail(state, findIssue(state, path[1]), user));
        if (path.length === 3) {
          if (path[2] === 'contributions' && method === 'POST') return response(await contribute(request, store, user, path[1]), 201);
          if (path[2] === 'follow' && method === 'PUT') return response(await follow(request, store, user, path[1]));
          if (path[2] === 'reopen-requests' && method === 'POST') return response(await reopen(request, store, user, path[1]), 201);
          if (path[2] === 'events' && method === 'GET') { findIssue(state, path[1]); const after = afterSequence(url.searchParams); return list(state.events.filter(row => row.issueId === path[1] && row.visibility === 'public' && BigInt(row.sequence) > after)); }
        }
      }
      if (path[0] === 'notifications') {
        const actor = authenticated(user);
        if (path.length === 1 && method === 'GET') return list(state.notifications.filter(row => row.userId === actor.id && mayReadNotification(state, row.eventId, actor)).reverse().slice(0, 200).map(({ userId: _userId, ...row }) => row));
        if (path.length === 2 && method === 'PATCH') {
          await jsonBody(request, z.object({ read: z.literal(true) }).strict());
          return response(store.transaction(value => { const notification = value.notifications.find(row => row.id === path[1] && row.userId === actor.id && mayReadNotification(value, row.eventId, actor)) || fail(404, 'NOT_FOUND', 'Notification not found.'); notification.readAt ??= now(); const { userId: _userId, ...row } = notification; return row; }));
        }
      }
      if (path[0] === 'authority') {
        const actor = authenticated(user); if (actor.role === 'resident') fail(403, 'FORBIDDEN', 'An authority account is required.');
        if (path[1] === 'inbox' && path.length === 2 && method === 'GET') {
          coordinator(actor); const scope = url.searchParams.get('scope') || 'relevant';
          if (!['relevant', 'assigned'].includes(scope)) fail(400, 'VALIDATION_ERROR', 'Choose relevant or assigned inbox scope.');
          const permitted = state.issues.filter(issue => scope === 'assigned' ? participates(state, issue.id, actor) : matches(state, issue, actor) || participates(state, issue.id, actor));
          return list(filterIssues(state, url.searchParams, actor, permitted).map(issue => publicSummary(state, issue)));
        }
        if (path[1] === 'work' && path.length === 2 && method === 'GET') return list(state.tasks.filter(task => actor.role === 'worker' ? task.assigneeUserId === actor.id : state.assignments.some(a => a.id === task.assignmentId && a.organizationId === actor.organizationId)));
        if (path[1] === 'issues' && path.length >= 3) {
          if (path.length === 3 && method === 'GET') return response(detail(state, findIssue(state, path[2]), actor, true));
          if (path.length === 4) {
            if (path[3] === 'demo-call' && method === 'GET') return response(demoCallInfo(store, actor, path[2]));
            if (path[3] === 'demo-call' && method === 'POST') return response(await initiateDemoCall(request, store, actor, path[2]));
            if (path[3] === 'assignments' && method === 'POST') return response(await acceptAssignment(request, store, actor, path[2]));
            if (path[3] === 'updates' && method === 'POST') return response(await publishUpdate(request, store, actor, path[2]));
            if (path[3] === 'decisions' && method === 'POST') return response(await decide(request, store, actor, path[2]));
            if (path[3] === 'summary' && method === 'GET') { coordinator(actor); requireAuthorityRead(state, findIssue(state, path[2]), actor); return response(progressSummary(state, path[2])); }
            if (path[3] === 'events' && method === 'GET') { const after = afterSequence(url.searchParams); return list(detail(state, findIssue(state, path[2]), actor, true).events.filter(row => BigInt(row.sequence) > after)); }
          }
        }
        if (path[1] === 'assignments' && path.length === 4 && method === 'POST') {
          if (path[3] === 'tasks') return response(await createTask(request, store, actor, path[2]));
          if (path[3] === 'progress') return response(await assignmentProgress(request, store, actor, path[2]));
        }
        if (path[1] === 'tasks' && path.length === 4 && path[3] === 'progress' && method === 'POST') return response(await taskProgress(request, store, actor, path[2]));
      }
      return fail(404, 'NOT_FOUND', 'Endpoint not found.');
    } catch (error) {
      const failure = error instanceof ApiError ? error : error instanceof TransitError ? new ApiError(error.status, error.code, error.message) : new ApiError(503, 'TEMPORARY_FAILURE', 'The service could not complete that request. Please try again.');
      return Response.json({ error: { code: failure.code, message: failure.message, ...(failure.fieldErrors ? { fieldErrors: failure.fieldErrors } : {}) }, requestId }, { status: failure.status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    }
  };
}
export async function handleApi(request: Request) { return createApiHandler(getStore())(request); }
export { createStore } from './store';
