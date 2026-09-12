import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { createApiHandler, createStore } from '@/server/app/api';
import type { Store } from '@/server/app/store';
import { DEMO_IDS } from '@/server/app/seed';

let store: Store; let handler: ReturnType<typeof createApiHandler>; let directory: string;
beforeEach(() => { directory = mkdtempSync(join(tmpdir(), 'openhfx-backend-')); store = createStore(directory); handler = createApiHandler(store); });
afterEach(() => { store.close(); rmSync(directory, { recursive: true, force: true }); });
async function call(path: string, method = 'GET', body?: unknown, cookie?: string, key?: string) {
  const headers = new Headers(); if (cookie) headers.set('cookie', cookie); if (body !== undefined) headers.set('content-type', 'application/json');
  if (method !== 'GET') headers.set('idempotency-key', key || randomUUID());
  const result = await handler(new Request(`http://127.0.0.1/api/v1${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
  return { status: result.status, json: await result.json(), cookie: result.headers.get('set-cookie')?.split(';')[0] };
}
async function login(role: string, org?: string, index = 0) {
  const user = store.read().users.filter(row => row.role === role && (!org || row.organizationId === org))[index];
  return (await call('/session', 'POST', { accountId: user.id })).cookie!;
}
const report = (extras = {}) => ({ draftId: randomUUID(), originalDescription: 'A fallen branch blocks the walkway and wheelchair access near the harbour.', title: 'Branch blocks the public walkway', summary: 'A fallen branch obstructs the public walkway and leaves too little room for accessible passage.', category: 'trees', exactLocation: { latitude: 44.6487123, longitude: -63.5729345 }, publicLocationLabel: 'Harbour public walkway', sensitiveLocation: false, attachmentIds: [], ...extras });
const issuePath = `/authority/issues/${DEMO_IDS.issue}`;

describe('identity, persistence and public boundaries', () => {
  it('searches map bounds using sanitized public locations and includes fresh persisted reports', async () => {
    const cookie = await login('resident');
    const created = await call('/issues', 'POST', report({ sensitiveLocation: true }), cookie);
    expect(created.status).toBe(201);
    const { id, publicLocation: point } = created.json.data;
    const box = [point.longitude - 0.000001, point.latitude - 0.000001, point.longitude + 0.000001, point.latitude + 0.000001].join(',');
    const result = await call(`/issues?bbox=${box}`);
    expect(result.status).toBe(200);
    expect(result.json.items.map((issue: { id: string }) => issue.id)).toContain(id);
    expect(result.json.items.find((issue: { id: string }) => issue.id === id)).not.toHaveProperty('exactLocation');
    expect((await call('/issues?bbox=-63.9,44.7,-63.8,44.8')).json.items.map((issue: { id: string }) => issue.id)).not.toContain(id);
    expect((await call('/issues?bbox=-63,45,-64,44')).status).toBe(400);
  });
  it('resolves provisioned identities with HttpOnly cookies and rejects remote entry/CSRF', async () => {
    const info = await call('/session'); expect(info.json.data.accounts).toHaveLength(8);
    const remote = await handler(new Request('https://example.org/api/v1/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accountId: store.read().users[0].id }) }));
    expect(remote.status).toBe(403);
    const crossSite = await handler(new Request('http://127.0.0.1/api/v1/session', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://attacker.example' }, body: JSON.stringify({ accountId: store.read().users[0].id }) }));
    expect(crossSite.status).toBe(403);
    const session = await handler(new Request('http://127.0.0.1/api/v1/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accountId: store.read().users[0].id }) }));
    expect(session.headers.get('set-cookie')).toContain('HttpOnly'); expect(session.headers.get('set-cookie')).toContain('SameSite=Strict');
    const nextHeaders = { 'content-type': 'application/json', host: '127.0.0.1:3000', 'x-forwarded-host': '127.0.0.1:3000', 'x-forwarded-for': '::ffff:127.0.0.1', origin: 'http://127.0.0.1:3000' };
    const nextBody = JSON.stringify({ accountId: store.read().users[0].id });
    expect((await handler(new Request('http://localhost:3000/api/v1/session', { method: 'POST', headers: nextHeaders, body: nextBody }))).status).toBe(200);
    expect((await handler(new Request('http://localhost:3000/api/v1/session', { method: 'POST', headers: { ...nextHeaders, 'x-forwarded-host': 'attacker.example:3000' }, body: nextBody }))).status).toBe(403);
    expect((await handler(new Request('http://localhost:3000/api/v1/session', { method: 'POST', headers: { ...nextHeaders, origin: 'http://127.0.0.1:4000' }, body: nextBody }))).status).toBe(403);
    expect((await call('/issues', 'POST', report())).status).toBe(401);
    const forged = await call('/session', 'POST', { accountId: 'arbitrary', role: 'coordinator' }); expect(forged.status).toBe(400);
  });
  it('persists reports and sessions across store reopen and preserves original wording privately', async () => {
    const cookie = await login('resident');
    const created = await call('/issues', 'POST', report({ sensitiveLocation: true, publicLocationLabel: 'Private house at 123 Secret Street' }), cookie);
    expect(created.status).toBe(201);
    expect(created.json.data).not.toHaveProperty('reporterId'); expect(created.json.data).not.toHaveProperty('exactLocation');
    expect(created.json.data.publicLocationLabel).not.toContain('Secret'); expect(created.json.data.publicLocation.latitude).not.toBe(44.6487123);
    store.close(); store = createStore(directory); handler = createApiHandler(store);
    expect((await call(`/issues/${created.json.data.id}`, 'GET', undefined, cookie)).json.data.following).toBe(true);
    expect((await call('/session', 'GET', undefined, cookie)).json.data.user.role).toBe('resident');
    expect(store.read().issues.find(row => row.id === created.json.data.id)?.originalDescription).toContain('wheelchair');
  });
  it('replays the original creation result and rejects changed payloads and stale versions', async () => {
    const cookie = await login('resident'); const input = report(); const key = randomUUID();
    const first = await call('/issues', 'POST', input, cookie, key);
    const replay = await call('/issues', 'POST', input, cookie, key); expect(replay.json).toEqual(first.json); expect(store.read().issues).toHaveLength(4);
    expect((await call('/issues', 'POST', { ...input, title: 'A different report title' }, cookie, key)).status).toBe(409);
    const parks = await login('coordinator', DEMO_IDS.parks);
    expect((await call(`${issuePath}/updates`, 'POST', { visibility: 'public', text: 'A new recorded update', expectedVersion: 99 }, parks)).json.error.code).toBe('VERSION_CONFLICT');
  });
  it('does not authorize residents, unrelated coordinators or another organization worker', async () => {
    const resident = await login('resident'); const parks = await login('coordinator', DEMO_IDS.parks); const streetsWorker = await login('worker', DEMO_IDS.streets);
    expect((await call('/authority/inbox', 'GET', undefined, resident)).status).toBe(403);
    const lighting = store.read().issues.find(row => row.category === 'lighting')!;
    expect((await call(`/authority/issues/${lighting.id}`, 'GET', undefined, parks)).status).toBe(403);
    const task = store.read().tasks[0];
    expect((await call(`/authority/tasks/${task.id}/progress`, 'POST', { status: 'working', note: 'Attempt', expectedVersion: task.version }, streetsWorker)).status).toBe(403);
    expect((await call(issuePath, 'GET', undefined, parks)).json.data.tasks).toHaveLength(2);
    expect((await call(issuePath, 'GET', undefined, streetsWorker)).json.data.tasks).toHaveLength(1);
  });
  it('rejects unsupported report locations and scopes inbox before applying the result limit', async () => {
    const resident = await login('resident');
    expect((await call('/issues', 'POST', report({ exactLocation: { latitude: 40.7, longitude: -74 } }), resident)).status).toBe(400);
    const parks = await login('coordinator', DEMO_IDS.parks);
    store.transaction(state => {
      const unrelated = state.issues.find(row => row.category === 'lighting')!;
      for (let index = 0; index < 210; index++) state.issues.push({ ...unrelated, id: randomUUID(), updatedAt: '2099-01-01T00:00:00.000Z' });
    });
    const result = await call('/authority/inbox?scope=assigned', 'GET', undefined, parks);
    expect(result.status).toBe(200); expect(result.json.items.map((row: { id: string }) => row.id)).toContain(DEMO_IDS.issue);
  });
  it('keeps private staff text and individual task identities out of public detail, summaries and notifications', async () => {
    const parks = await login('coordinator', DEMO_IDS.parks); const resident = await login('resident');
    await call(`${issuePath}/updates`, 'POST', { visibility: 'staff', text: 'PRIVATE INTERNAL BLOCKER 123', expectedVersion: 1 }, parks);
    const publicView = await call(`/issues/${DEMO_IDS.issue}`); expect(JSON.stringify(publicView.json)).not.toContain('PRIVATE INTERNAL'); expect(publicView.json.data).not.toHaveProperty('tasks'); expect(publicView.json.data).not.toHaveProperty('assignments');
    expect(JSON.stringify((await call('/notifications', 'GET', undefined, resident)).json)).not.toContain('PRIVATE INTERNAL');
    expect(JSON.stringify((await call(`${issuePath}/summary`, 'GET', undefined, parks)).json)).not.toContain('PRIVATE INTERNAL');
    expect(JSON.stringify((await call(issuePath, 'GET', undefined, parks)).json)).toContain('PRIVATE INTERNAL');
    const access = await login('coordinator', DEMO_IDS.access);
    const matching = await call(issuePath, 'GET', undefined, access); expect(matching.status).toBe(200); expect(matching.json.data).not.toHaveProperty('exactLocation'); expect(JSON.stringify(matching.json)).not.toContain('PRIVATE INTERNAL');
    expect(JSON.stringify((await call('/notifications', 'GET', undefined, access)).json)).not.toContain('PRIVATE INTERNAL');
    const streets = await login('coordinator', DEMO_IDS.streets);
    expect(JSON.stringify((await call('/notifications', 'GET', undefined, streets)).json)).toContain('PRIVATE INTERNAL');
  });
});

describe('report preparation lifecycle', () => {
  it('persists a terminal demo suggestion, scopes access to the owner, and never creates an issue', async () => {
    const resident = await login('resident'); const other = await login('resident', undefined, 1);
    const input = { draftId: randomUUID(), originalDescription: 'A fallen branch blocks the public walkway near the harbour.', publicLocation: { latitude: 44.6486, longitude: -63.5729 }, category: 'trees' };
    const queued = await call('/report-preparations', 'POST', input, resident);
    expect(queued.status).toBe(202); expect(queued.json.data.status).toBe('queued');
    expect((await call(`/report-preparations/${queued.json.data.id}`, 'GET', undefined, other)).status).toBe(404);
    await new Promise(resolve => setTimeout(resolve, 25));
    const finished = await call(`/report-preparations/${queued.json.data.id}`, 'GET', undefined, resident);
    expect(finished.json.data.status).toBe('succeeded'); expect(finished.json.data.mode).toBe('demo'); expect(finished.json.data.suggestion.category).toBe('trees'); expect(finished.json.data).not.toHaveProperty('ownerId'); expect(store.read().issues).toHaveLength(3);
  });
  it('allows manual report creation after an explicitly unconfigured preparation', async () => {
    const prior = process.env.OPENHFX_ENGINE_MODE; process.env.OPENHFX_ENGINE_MODE = 'unconfigured';
    try {
      const resident = await login('resident'); const draftId = randomUUID();
      const queued = await call('/report-preparations', 'POST', { draftId, originalDescription: 'A fallen branch blocks the public walkway near the harbour.', publicLocation: { latitude: 44.6486, longitude: -63.5729 } }, resident);
      await new Promise(resolve => setTimeout(resolve, 25));
      const failed = await call(`/report-preparations/${queued.json.data.id}`, 'GET', undefined, resident); expect(failed.json.data.status).toBe('failed'); expect(failed.json.data.error.code).toBe('UNCONFIGURED');
      expect((await call('/issues', 'POST', report({ draftId, preparationId: queued.json.data.id }), resident)).status).toBe(201);
    } finally { if (prior === undefined) delete process.env.OPENHFX_ENGINE_MODE; else process.env.OPENHFX_ENGINE_MODE = prior; }
  });
  it('marks interrupted preparations failed when restarting persistence', () => {
    store.transaction(state => { state.preparations.push({ id: randomUUID(), ownerId: state.users[0].id, draftId: randomUUID(), status: 'running', suggestion: null, error: null, mode: 'demo', provider: null, model: null, promptVersion: 'test', attempts: 0, latencyMs: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); });
    store.close(); store = createStore(directory); handler = createApiHandler(store);
    expect(store.read().preparations[0].status).toBe('failed'); expect(store.read().preparations[0].error?.code).toBe('TEMPORARY_FAILURE');
  });
});

describe('independent assignments and human decisions', () => {
  it('requires both organization completions and lead resolution; task completion alone leaves work open', async () => {
    const parks = await login('coordinator', DEMO_IDS.parks); const streets = await login('coordinator', DEMO_IDS.streets);
    const parksWorker = await login('worker', DEMO_IDS.parks); const streetsWorker = await login('worker', DEMO_IDS.streets);
    const [parksTask, streetsTask] = store.read().tasks; const [parksAssignment, streetsAssignment] = store.read().assignments;
    expect((await call(`/authority/assignments/${parksAssignment.id}/progress`, 'POST', { status: 'complete', nextStep: 'Cleared', expectedVersion: 1 }, parks)).status).toBe(409);
    const completedTask = await call(`/authority/tasks/${parksTask.id}/progress`, 'POST', { status: 'complete', note: 'Branch removed and path checked', expectedVersion: 1 }, parksWorker);
    expect(completedTask.status).toBe(200); expect(store.read().assignments[0].status).toBe('in_progress'); expect(completedTask.json.data.status).toBe('in_progress');
    const completeAssignment = await call(`/authority/assignments/${parksAssignment.id}/progress`, 'POST', { status: 'complete', nextStep: 'Branch cleared; awaiting access work', expectedVersion: store.read().assignments[0].version }, parks);
    expect(completeAssignment.status).toBe(200);
    const blockedResolution = await call(`${issuePath}/decisions`, 'POST', { action: 'resolve', reason: 'Work is done', expectedVersion: completeAssignment.json.data.version }, parks);
    expect(blockedResolution.status).toBe(409);
    await call(`/authority/tasks/${streetsTask.id}/progress`, 'POST', { status: 'complete', note: 'Accessible route restored', expectedVersion: 1 }, streetsWorker);
    const completeStreets = await call(`/authority/assignments/${streetsAssignment.id}/progress`, 'POST', { status: 'complete', nextStep: 'Access restored', expectedVersion: store.read().assignments[1].version }, streets);
    expect(completeStreets.status).toBe(200);
    expect((await call(`${issuePath}/decisions`, 'POST', { action: 'resolve', reason: 'Work is done', expectedVersion: completeStreets.json.data.version }, streets)).status).toBe(403);
    const resolution = await call(`${issuePath}/decisions`, 'POST', { action: 'resolve', reason: 'Branch removed and accessible route checked', expectedVersion: completeStreets.json.data.version }, parks);
    expect(resolution.status).toBe(200); expect(resolution.json.data.status).toBe('resolved');
    const resident = await login('resident', undefined, 1);
    const reopening = await call(`/issues/${DEMO_IDS.issue}/reopen-requests`, 'POST', { reason: 'Debris still obstructs the accessible route', attachmentIds: [] }, resident); expect(reopening.status).toBe(201);
    const reopened = await call(`${issuePath}/decisions`, 'POST', { action: 'accept_reopen', reason: 'A team will review the remaining obstruction', requestId: reopening.json.data.id, expectedVersion: store.read().issues[0].version }, parks);
    expect(reopened.status).toBe(200); expect(reopened.json.data.status).toBe('in_progress'); expect(store.read().assignments[0].status).toBe('in_progress');
  });
  it('uses target assignment/task versions and atomically records blocker plus lifecycle without publishing private note', async () => {
    const worker = await login('worker', DEMO_IDS.parks); const task = store.read().tasks[0];
    const result = await call(`/authority/tasks/${task.id}/progress`, 'POST', { status: 'blocked', note: 'PRIVATE hazard assessment required', expectedVersion: task.version }, worker);
    expect(result.status).toBe(200); expect(store.read().tasks[0].previousActiveStatus).toBe('assigned');
    const publicResult = await call(`/issues/${DEMO_IDS.issue}`); expect(publicResult.json.data.status).toBe('in_progress'); expect(JSON.stringify(publicResult.json)).not.toContain('PRIVATE hazard');
    const next = await call(`/authority/tasks/${task.id}/progress`, 'POST', { status: 'working', note: 'Review completed', expectedVersion: 2 }, worker); expect(next.status).toBe(200); expect(store.read().tasks[0].previousActiveStatus).toBeNull();
  });
  it('makes lead nomination a two-step decision and guards requirement release', async () => {
    const parks = await login('coordinator', DEMO_IDS.parks); const streets = await login('coordinator', DEMO_IDS.streets);
    expect((await call(`${issuePath}/decisions`, 'POST', { action: 'release_requirement', assignmentId: store.read().assignments[0].id, reason: 'Not needed', expectedVersion: 1 }, streets)).status).toBe(403);
    const nominated = await call(`${issuePath}/decisions`, 'POST', { action: 'nominate_lead', targetOrganizationId: DEMO_IDS.streets, reason: 'Access work now leads the response', expectedVersion: 1 }, parks);
    expect(nominated.status).toBe(200); expect(nominated.json.data.leadOrganizationId).toBe(DEMO_IDS.parks);
    const accepted = await call(`${issuePath}/decisions`, 'POST', { action: 'accept_lead', reason: 'Street Response accepts accountability', expectedVersion: nominated.json.data.version }, streets);
    expect(accepted.status).toBe(200); expect(accepted.json.data.leadOrganizationId).toBe(DEMO_IDS.streets);
    const released = await call(`${issuePath}/decisions`, 'POST', { action: 'release_requirement', assignmentId: store.read().assignments[0].id, reason: 'Inspection confirms branch work is unnecessary', expectedVersion: accepted.json.data.version }, streets);
    expect(released.status).toBe(200); expect(store.read().assignments[0].required).toBe(false);
  });
  it('creates required contributing assignments by default and scopes team selection', async () => {
    const resident = await login('resident'); const parks = await login('coordinator', DEMO_IDS.parks); const streets = await login('coordinator', DEMO_IDS.streets);
    const created = await call('/issues', 'POST', report(), resident); const path = `/authority/issues/${created.json.data.id}`;
    const accepted = await call(`${path}/assignments`, 'POST', { purpose: 'Inspect and remove obstruction', required: false, expectedVersion: 1 }, parks);
    expect(accepted.status).toBe(200); expect(accepted.json.data.assignments[0].required).toBe(true);
    expect(accepted.json.data.nextStep).toBe('Assign a field team');
    const contributing = await call(`${path}/assignments`, 'POST', { purpose: 'Restore safe access', required: false, expectedVersion: accepted.json.data.version }, streets);
    expect(contributing.status).toBe(200); expect(contributing.json.data.assignments[1].required).toBe(true);
    const assignment = contributing.json.data.assignments[1]; const parksTeam = store.read().teams[0];
    expect((await call(`/authority/assignments/${assignment.id}/tasks`, 'POST', { purpose: 'Wrong organization team', teamId: parksTeam.id, expectedVersion: assignment.version }, streets)).status).toBe(403);
    const correct = await call(`/authority/assignments/${assignment.id}/tasks`, 'POST', { purpose: 'Restore safe access', teamId: store.read().teams[1].id, expectedVersion: assignment.version }, streets);
    expect(correct.status).toBe(200); expect(correct.json.data.tasks).toHaveLength(1);
  });
  it('updates the public next step from the lead coordinator only and keeps worker notes private', async () => {
    const parks = await login('coordinator', DEMO_IDS.parks); const streets = await login('coordinator', DEMO_IDS.streets); const worker = await login('worker', DEMO_IDS.parks);
    const [parksAssignment, streetsAssignment] = store.read().assignments;
    const lead = await call(`/authority/assignments/${parksAssignment.id}/progress`, 'POST', { status: 'in_progress', nextStep: 'Clear the branch before restoring access', expectedVersion: parksAssignment.version }, parks);
    expect(lead.status).toBe(200); expect(lead.json.data.nextStep).toBe('Clear the branch before restoring access');
    const contributor = await call(`/authority/assignments/${streetsAssignment.id}/progress`, 'POST', { status: 'in_progress', nextStep: 'Check the remaining accessible route', expectedVersion: streetsAssignment.version }, streets);
    expect(contributor.status).toBe(200); expect(contributor.json.data.nextStep).toBe('Clear the branch before restoring access');
    const task = store.read().tasks[0];
    await call(`/authority/tasks/${task.id}/progress`, 'POST', { status: 'blocked', note: 'PRIVATE staff blocker', expectedVersion: task.version }, worker);
    const publicIssue = await call(`/issues/${DEMO_IDS.issue}`);
    expect(publicIssue.json.data.nextStep).toBe('Clear the branch before restoring access'); expect(JSON.stringify(publicIssue.json)).not.toContain('PRIVATE staff blocker');
  });
});

describe('evidence and notifications', () => {
  async function uploadPhoto(cookie: string, bytes: Uint8Array, type = 'image/png') {
    const form = new FormData(); form.set('file', new File([new Uint8Array(bytes)], 'image.png', { type })); form.set('description', 'The blocked public walkway');
    const response = await handler(new Request('http://127.0.0.1/api/v1/attachments', { method: 'POST', headers: { cookie }, body: form })); return { status: response.status, json: await response.json() };
  }
  it('validates real image bytes, strips metadata and protects unattached images by owner', async () => {
    const resident = await login('resident'); const other = await login('resident', undefined, 1);
    expect((await uploadPhoto(resident, Buffer.from('not an image'))).status).toBe(400);
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#ff0000' } }).withMetadata().png().toBuffer();
    expect((await uploadPhoto(resident, png, 'image/jpeg')).status).toBe(400);
    const photo = await uploadPhoto(resident, png); expect(photo.status).toBe(201); expect(photo.json.data.mimeType).toBe('image/webp');
    expect((await handler(new Request(`http://127.0.0.1${photo.json.data.url}`, { headers: { cookie: other } }))).status).toBe(403);
    const served = await handler(new Request(`http://127.0.0.1${photo.json.data.url}`, { headers: { cookie: resident } }));
    const metadata = await sharp(Buffer.from(await served.arrayBuffer())).metadata(); expect(metadata.exif).toBeUndefined(); expect(metadata.icc).toBeUndefined();
    expect((await call('/issues', 'POST', report({ attachmentIds: [photo.json.data.id] }), other)).status).toBe(403);
    const created = await call('/issues', 'POST', report({ attachmentIds: [photo.json.data.id] }), resident); expect(created.status).toBe(201); expect(created.json.data.contributions[0].attachments).toHaveLength(1);
    expect((await handler(new Request(`http://127.0.0.1${photo.json.data.url}`))).status).toBe(200);
  });
  it('adds evidence once, notifies followers once and keeps recipient reads private', async () => {
    const resident = await login('resident'); const other = await login('resident', undefined, 1);
    const key = randomUUID(); const input = { body: 'The remaining route is still obstructed for wheelchairs.', attachmentIds: [] };
    const first = await call(`/issues/${DEMO_IDS.issue}/contributions`, 'POST', input, other, key);
    const replay = await call(`/issues/${DEMO_IDS.issue}/contributions`, 'POST', input, other, key); expect(replay.json).toEqual(first.json);
    const notifications = await call('/notifications', 'GET', undefined, resident); expect(notifications.json.items).toHaveLength(1);
    const notification = notifications.json.items[0]; expect((await call(`/notifications/${notification.id}`, 'PATCH', { read: true }, other)).status).toBe(404);
    expect((await call(`/notifications/${notification.id}`, 'PATCH', { read: true }, resident)).json.data.readAt).toBeTruthy();
    expect((await call('/notifications', 'GET', undefined, other)).json.items).toHaveLength(0);
  });
});
