export class TransitError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function unavailable(): TransitError {
  return new TransitError(503, 'TEMPORARY_FAILURE', 'Halifax Transit information is temporarily unavailable. Try again shortly.');
}

export interface Cached<T> { value: T; loadedAt: number; stale: boolean }

/** Single-flight memory cache; failures back off even when there is no cached value. */
export function createCache<T>(load: () => Promise<T>, ttl: number, maxAge: number, now = Date.now) {
  let entry: Cached<T> | undefined;
  let pending: Promise<Cached<T>> | undefined;
  let retryAt = 0;
  function fallback(): Cached<T> {
    if (entry && now() - entry.loadedAt <= maxAge) return { ...entry, stale: true };
    throw unavailable();
  }
  return async (): Promise<Cached<T>> => {
    if (entry && now() - entry.loadedAt < ttl && !retryAt) return entry;
    if (pending) return pending;
    if (now() < retryAt) return fallback();
    pending = (async () => {
      try {
        const value = await Promise.resolve().then(load);
        entry = { value, loadedAt: now(), stale: false };
        retryAt = 0;
        return entry;
      } catch {
        retryAt = now() + 30_000;
        return fallback();
      } finally { pending = undefined; }
    })();
    return pending;
  };
}

export const FEEDS = {
  static: 'https://gtfs.halifax.ca/static/google_transit.zip',
  trips: 'https://gtfs.halifax.ca/realtime/TripUpdate/TripUpdates.pb',
  alerts: 'https://gtfs.halifax.ca/realtime/Alert/Alerts.pb',
} as const;

/** No user URL, credentials, redirects, or unbounded response allocations. */
export async function fetchFeed(kind: keyof typeof FEEDS, fetcher: typeof fetch = fetch): Promise<Uint8Array> {
  const limit = kind === 'static' ? 12 * 1024 * 1024 : 5 * 1024 * 1024;
  const response = await fetcher(FEEDS[kind], {
    signal: AbortSignal.timeout(kind === 'static' ? 15_000 : 8_000),
    redirect: 'error', cache: 'no-store', credentials: 'omit',
  });
  if (!response.ok || !response.body) { await response.body?.cancel(); throw unavailable(); }
  if (Number(response.headers.get('content-length') || 0) > limit) { await response.body.cancel(); throw unavailable(); }
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw unavailable(); }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
  return bytes;
}
