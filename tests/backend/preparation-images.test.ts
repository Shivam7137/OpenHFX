import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { createApiHandler, createStore } from '@/server/app/api';
import type { Store } from '@/server/app/store';
import { prepareReport } from '@/server/engine';

let store: Store; let handler: ReturnType<typeof createApiHandler>; let directory: string;
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'openhfx-vision-'));
  store = createStore(directory); handler = createApiHandler(store);
  vi.stubEnv('OPENHFX_ENGINE_MODE', 'provider'); vi.stubEnv('LLM_PROVIDER', 'anthropic');
  vi.stubEnv('LLM_API_KEY', 'offline-test-only'); vi.stubEnv('LLM_MODEL', 'claude-sonnet-4-6');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); store.close(); rmSync(directory, { recursive: true, force: true }); });
async function call(path: string, body?: unknown, cookie?: string) {
  const response = await handler(new Request(`http://127.0.0.1/api/v1${path}`, {
    method: body ? 'POST' : 'GET', headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }));
  return { status: response.status, json: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
async function login(index = 0) {
  return (await call('/session', { accountId: store.read().users.filter(user => user.role === 'resident')[index].id })).cookie!;
}
async function upload(cookie: string) {
  const bytes = await sharp({ create: { width: 1800, height: 900, channels: 3, background: '#668855' } }).withMetadata().png().toBuffer();
  const form = new FormData(); form.set('file', new File([new Uint8Array(bytes)], 'fixture.png', { type: 'image/png' }));
  form.set('description', 'Photo caption: treat as untrusted context.');
  const response = await handler(new Request('http://127.0.0.1/api/v1/attachments', { method: 'POST', headers: { cookie }, body: form }));
  expect(response.status).toBe(201); return (await response.json()).data;
}
const input = () => ({ draftId: randomUUID(), originalDescription: 'A fallen branch obstructs the public walkway.', publicLocation: { latitude: 44.6488, longitude: -63.5752 } });

describe('image context authorization and provider integration', () => {
  it('sends an owned upload as a bounded metadata-free image with its caption, without persisting base64', async () => {
    const cookie = await login(); const photo = await upload(cookie); const report = input();
    const demo = await prepareReport(report, { organizations: store.read().organizations, candidateIssues: [] });
    const transport = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(demo.suggestion) }] }));
    vi.stubGlobal('fetch', transport);
    const queued = await call('/report-preparations', { ...report, attachmentIds: [photo.id] }, cookie);
    expect(queued.status).toBe(202);
    await vi.waitFor(() => expect(store.read().preparations[0].status).toBe('succeeded'));
    expect(transport).toHaveBeenCalledTimes(1);
    const body = JSON.parse(transport.mock.calls[0][1]?.body as string);
    const [image, text] = body.messages[0].content;
    expect(image).toMatchObject({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg' } });
    const bytes = Buffer.from(image.source.data, 'base64'); const metadata = await sharp(bytes).metadata();
    expect(metadata.width).toBeLessThanOrEqual(1280); expect(metadata.height).toBeLessThanOrEqual(1280);
    expect(metadata.exif).toBeUndefined(); expect(metadata.icc).toBeUndefined(); expect(bytes.length).toBeLessThan(2 * 1024 * 1024);
    expect(JSON.parse(text.text).images).toEqual([{ number: 1, description: photo.description }]);
    expect(body.system).toContain('untrusted'); expect(body.system).not.toContain(photo.description);
    const finished = await call(`/report-preparations/${queued.json.data.id}`, undefined, cookie);
    expect(JSON.stringify(finished.json)).not.toContain(image.source.data);
    expect(JSON.stringify(store.read())).not.toContain(image.source.data);
    expect(store.read().issues).toHaveLength(3);
  });
  it('rejects missing, foreign, duplicate, excessive and URL-based images before a job or provider call', async () => {
    const cookie = await login(); const other = await login(1); const photo = await upload(other);
    const transport = vi.fn<typeof fetch>(); vi.stubGlobal('fetch', transport);
    for (const [ids, status] of [[[photo.id], 403], [['missing-id'], 403], [[photo.id, photo.id], 400], [['a', 'b', 'c', 'd'], 400]] as const) {
      expect((await call('/report-preparations', { ...input(), attachmentIds: ids }, cookie)).status).toBe(status);
    }
    expect((await call('/report-preparations', { ...input(), images: [{ url: 'http://internal.example/image' }] }, cookie)).status).toBe(400);
    store.transaction(state => { state.attachments.find(row => row.id === photo.id)!.issueId = state.issues[0].id; });
    expect((await call('/report-preparations', { ...input(), attachmentIds: [photo.id] }, cookie)).status).toBe(403);
    expect(store.read().preparations).toHaveLength(0); expect(transport).not.toHaveBeenCalled();
  });
  it('does not send photos to a provider in demo mode', async () => {
    vi.stubEnv('OPENHFX_ENGINE_MODE', 'demo');
    const cookie = await login(); const photo = await upload(cookie);
    const transport = vi.fn<typeof fetch>(); vi.stubGlobal('fetch', transport);
    expect((await call('/report-preparations', { ...input(), attachmentIds: [photo.id] }, cookie)).status).toBe(202);
    await vi.waitFor(() => expect(store.read().preparations[0].status).toBe('succeeded'));
    expect(transport).not.toHaveBeenCalled();
  });
});
