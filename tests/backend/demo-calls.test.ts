import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApiHandler, createStore } from '@/server/app/api';
import { DEMO_IDS } from '@/server/app/seed';

let directory: string;
let store: ReturnType<typeof createStore>;
let handler: ReturnType<typeof createApiHandler>;
const endpoint = `/authority/issues/${DEMO_IDS.issue}/demo-call`;
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'openhfx-call-'));
  store = createStore(directory); handler = createApiHandler(store);
  vi.stubEnv('OPENHFX_DISPATCHER_URL', 'http://127.0.0.1:3001');
  vi.stubEnv('OPENHFX_DISPATCHER_TOKEN', 'test-bridge-token-with-at-least-32-characters');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); store.close(); rmSync(directory, { recursive: true, force: true }); });
async function call(path: string, method = 'GET', body?: unknown, cookie?: string) {
  const response = await handler(new Request(`http://127.0.0.1/api/v1${path}`, { method, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) }));
  return { status: response.status, json: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
async function login(role: string, organizationId?: string) {
  const actor = store.read().users.find(user => user.role === role && (!organizationId || user.organizationId === organizationId))!;
  return (await call('/session', 'POST', { accountId: actor.id })).cookie!;
}
function urgent() { store.transaction(state => { const issue = state.issues.find(i => i.id === DEMO_IDS.issue)!; issue.priority = 'urgent'; issue.priorityReviewed = true; }); }
const input = { expectedVersion: 1, confirmed: true };
describe('coordinator urgent demo calls', () => {
  it('requires a participating coordinator and reviewed urgent unresolved demo issue', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    expect((await call(endpoint, 'POST', input)).status).toBe(401);
    for (const role of ['resident', 'worker']) expect((await call(endpoint, 'POST', input, await login(role))).status).toBe(403);
    expect((await call(endpoint, 'POST', input, await login('coordinator', DEMO_IDS.access))).status).toBe(403);
    const cookie = await login('coordinator', DEMO_IDS.parks);
    expect((await call(endpoint, 'POST', input, cookie)).status).toBe(409);
    urgent();
    expect((await call(endpoint, 'POST', { ...input, to: '+19025550100' }, cookie)).status).toBe(400);
    expect((await call(endpoint, 'POST', { ...input, confirmed: false }, cookie)).status).toBe(400);
    expect((await call(endpoint, 'POST', { ...input, expectedVersion: 999 }, cookie)).status).toBe(409);
    store.transaction(state => { state.issues.find(i => i.id === DEMO_IDS.issue)!.status = 'resolved'; });
    expect((await call(endpoint, 'POST', input, cookie)).status).toBe(409);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('sends public details once, persists the attempt and records only a staff event', async () => {
    urgent();
    const fetch = vi.fn(async () => Response.json({ data: { status: 'accepted', providerCallId: `CA${'a'.repeat(32)}` } })); vi.stubGlobal('fetch', fetch);
    const cookie = await login('coordinator', DEMO_IDS.parks);
    const results = await Promise.all([call(endpoint, 'POST', input, cookie), call(endpoint, 'POST', input, cookie)]);
    expect(results.map(r => r.status)).toEqual([200, 200]);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:3001/api/integrations/openhfx/calls');
    const body = JSON.parse(String(init.body));
    expect(body.issueId).toBe(DEMO_IDS.issue);
    expect(body).not.toHaveProperty('exactLocation');
    expect(body).not.toHaveProperty('originalDescription');
    const current = await call(endpoint, 'GET', undefined, cookie);
    expect(current.json.data.call.status).toBe('accepted');
    expect((await call(`/issues/${DEMO_IDS.issue}`)).json.data.events.some((e: { type: string }) => e.type.startsWith('demo_call.'))).toBe(false);
    expect(store.read().events.filter(e => e.type === 'demo_call.accepted')).toHaveLength(1);
    store.close(); store = createStore(directory); handler = createApiHandler(store);
    await call(endpoint, 'POST', input, cookie);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('keeps an uncertain attempt locked and never claims delivery or automatically retries', async () => {
    urgent(); const fetch = vi.fn(async () => { throw new Error('private connection details'); }); vi.stubGlobal('fetch', fetch);
    const cookie = await login('coordinator', DEMO_IDS.parks);
    const result = await call(endpoint, 'POST', input, cookie);
    expect(result.json.data.status).toBe('uncertain');
    await call(endpoint, 'POST', input, cookie);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result.json)).not.toContain('private');
  });
  it('fails closed when unconfigured and exposes no token', async () => {
    urgent(); vi.stubEnv('OPENHFX_DISPATCHER_TOKEN', '');
    const cookie = await login('coordinator', DEMO_IDS.parks);
    expect((await call(endpoint, 'GET', undefined, cookie)).json.data.configured).toBe(false);
    expect((await call(endpoint, 'POST', input, cookie)).status).toBe(503);
  });
  it('allows correction after a definite Dispatcher preflight rejection', async () => {
    urgent(); const cookie = await login('coordinator', DEMO_IDS.parks);
    const fetch = vi.fn(async () => Response.json({ error: { code: 'CALLS_UNCONFIGURED' } }, { status: 503 })); vi.stubGlobal('fetch', fetch);
    expect((await call(endpoint, 'POST', input, cookie)).status).toBe(503);
    expect((await call(endpoint, 'GET', undefined, cookie)).json.data.call).toBeNull();
    fetch.mockImplementation(async () => Response.json({ data: { status: 'accepted', providerCallId: `CA${'a'.repeat(32)}` } }));
    expect((await call(endpoint, 'POST', input, cookie)).json.data.status).toBe('accepted');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('rejects remote initiation and never forwards an unmarked real issue', async () => {
    urgent(); const cookie = await login('coordinator', DEMO_IDS.parks);
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const remote = await handler(new Request(`https://example.org/api/v1${endpoint}`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(input) }));
    expect(remote.status).toBe(403);
    store.transaction(state => { state.issues.find(i => i.id === DEMO_IDS.issue)!.isDemo = false; });
    expect((await call(endpoint, 'POST', input, cookie)).status).toBe(409);
    expect(fetch).not.toHaveBeenCalled();
  });
});
