import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import type { User } from '@/contracts';
import type { State, Store } from './store';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fieldErrors?: Record<string, string[]>) { super(message); }
}
export function fail(status: number, code: string, message: string): never { throw new ApiError(status, code, message); }
export function authenticated(user: User | null): User { return user || fail(401, 'UNAUTHENTICATED', 'Sign in to continue.'); }
export function coordinator(user: User | null): User {
  const value = authenticated(user); if (value.role !== 'coordinator') fail(403, 'FORBIDDEN', 'A coordinator account is required.'); return value;
}
export function checkVersion(record: { version: number }, expectedVersion: number) {
  if (record.version !== expectedVersion) throw new ApiError(409, 'VERSION_CONFLICT', 'This record has changed. Refresh and review your draft before trying again.', { expectedVersion: [String(record.version)] });
}
export const version = z.number().int().positive();
export const shortText = z.string().trim().min(1).max(2000);
export const attachmentIds = z.array(z.string().min(1)).max(3).refine(ids => new Set(ids).size === ids.length, 'Duplicate photos are not allowed.');
export const location = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).strict();
export async function jsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) fail(400, 'VALIDATION_ERROR', 'Send a JSON request.');
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 32_768) fail(400, 'VALIDATION_ERROR', 'Request is too large.');
  const reader = request.body?.getReader(); let bytes = 0; const parts: Uint8Array[] = [];
  if (reader) {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      bytes += chunk.value.length; if (bytes > 32_768) { await reader.cancel(); fail(400, 'VALIDATION_ERROR', 'Request is too large.'); }
      parts.push(chunk.value);
    }
  }
  let value: unknown;
  try { value = JSON.parse(Buffer.concat(parts).toString('utf8')); } catch { return fail(400, 'VALIDATION_ERROR', 'Request contains invalid JSON.'); }
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', 'Check the highlighted fields.', z.flattenError(parsed.error).fieldErrors as Record<string, string[]>);
  return parsed.data;
}
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export function currentUser(request: Request, state: State): User | null {
  const token = request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith('openhfx_session='))?.slice('openhfx_session='.length);
  if (!token) return null;
  const session = state.sessions.find(row => row.tokenHash === digest(token) && row.expires > Date.now());
  return state.users.find(row => row.id === session?.userId) || null;
}
const isLoopback = (host: string) => ['localhost', '127.0.0.1', '[::1]', '::1', '::ffff:127.0.0.1'].includes(host.toLowerCase());
function equivalentOrigin(first: URL, second: URL) {
  return first.origin === second.origin || (isLoopback(first.hostname) && isLoopback(second.hostname) && first.protocol === second.protocol && first.port === second.port);
}
export function localDemo(request: Request) {
  const url = new URL(request.url);
  if (process.env.OPENHFX_DEMO_MODE === 'disabled' || !isLoopback(url.hostname)) return false;
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded && forwarded.split(',').some(ip => !isLoopback(ip.trim()))) return false;
  // Next normalizes its internal request URL to localhost while preserving 127.0.0.1 in Host.
  for (const header of ['host', 'x-forwarded-host']) {
    const host = request.headers.get(header);
    if (host) { try { const candidate = new URL(`${url.protocol}//${host}`); if (!equivalentOrigin(url, candidate)) return false; } catch { return false; } }
  }
  if (request.headers.has('forwarded')) return false;
  return true;
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (request.headers.get('sec-fetch-site') === 'cross-site') fail(403, 'FORBIDDEN', 'Cross-site changes are not allowed.');
  if (origin) {
    let allowed = false;
    try { const source = new URL(origin); const target = new URL(request.url); allowed = source.origin === target.origin || (localDemo(request) && equivalentOrigin(source, target)); } catch { /* Opaque origins are not permitted. */ }
    if (!allowed) fail(403, 'FORBIDDEN', 'The request origin is not permitted.');
  }
}
export function sessionCookie(store: Store, accountId: string, request: Request) {
  if (!localDemo(request)) fail(403, 'FORBIDDEN', 'Demo account entry is only available on the local development server.');
  const token = randomBytes(32).toString('hex');
  const user = store.transaction(state => {
    const account = state.users.find(row => row.id === accountId) || fail(400, 'VALIDATION_ERROR', 'Choose an existing demo account.');
    state.sessions = state.sessions.filter(row => row.expires > Date.now());
    state.sessions.push({ tokenHash: digest(token), userId: account.id, expires: Date.now() + 12 * 60 * 60 * 1000 });
    return account;
  });
  return { user, cookie: `openhfx_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}` };
}
export function signOut(store: Store, request: Request) {
  const token = request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith('openhfx_session='))?.slice('openhfx_session='.length);
  if (token) store.transaction(state => { state.sessions = state.sessions.filter(row => row.tokenHash !== digest(token)); });
}
export function mutate<T>(store: Store, request: Request, user: User, body: unknown, callback: (state: State) => T, requireKey = false): T {
  const key = request.headers.get('idempotency-key');
  if (requireKey && !key) fail(400, 'VALIDATION_ERROR', 'An Idempotency-Key is required for this action.');
  if (key && (key.length > 128 || !/^[\w.:-]+$/.test(key))) fail(400, 'VALIDATION_ERROR', 'Use a valid Idempotency-Key.');
  const cacheKey = `${user.id}:${key}`;
  const hash = digest(`${request.method}:${new URL(request.url).pathname}:${JSON.stringify(body)}`);
  return store.transaction(state => {
    if (key && state.idempotency[cacheKey]) {
      const prior = state.idempotency[cacheKey];
      if (prior.hash !== hash) fail(409, 'IDEMPOTENCY_CONFLICT', 'That request key was already used for different content.');
      return prior.result as T;
    }
    const result = callback(state);
    if (key) state.idempotency[cacheKey] = { hash, result, createdAt: Date.now() };
    return result;
  });
}
