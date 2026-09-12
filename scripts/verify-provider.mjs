import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

// Explicit opt-in: this creates one preparation and can incur model charges.
assert.ok(process.argv.includes('--live'), 'Use --live to authorize one paid fictional-report preparation.');
const base = 'http://127.0.0.1:3000';
let cookie = '';
async function call(path, body) {
  const response = await fetch(`${base}/api/v1${path}`, {
    method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(15_000),
    headers: { Origin: base, ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (response.headers.has('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
  const payload = await response.json();
  assert.ok(response.ok, `Local endpoint ${path} returned HTTP ${response.status}.`);
  return payload.data;
}
const session = await call('/session');
assert.equal(session.demoMode, true, 'This check requires local fictional accounts.');
assert.equal(session.engineMode, 'provider', 'Provider mode must be explicitly enabled.');
const resident = session.accounts.find(account => account.role === 'resident');
assert.ok(resident);
await call('/session', { accountId: resident.id });
const attachmentIds = [];
if (process.argv.includes('--with-image')) {
  // Synthetic fixture only, no real location, faces, identifying data, or published incident.
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#82a77b"/><rect x="200" width="240" height="480" fill="#c7c7bf"/><path d="M120 300 L520 230 M330 266 L390 165 M260 275 L195 210" stroke="#684932" stroke-width="24" fill="none"/><text x="20" y="40" font-size="22">Fictional test: branch across a walkway</text></svg>';
  const bytes = await sharp(Buffer.from(svg)).png().toBuffer();
  const form = new FormData(); form.set('file', new File([bytes], 'fictional-walkway.png', { type: 'image/png' }));
  form.set('description', 'Synthetic illustration for an integration test, not a real incident photo.');
  const response = await fetch(`${base}/api/v1/attachments`, { method: 'POST', headers: { Origin: base, Cookie: cookie }, body: form, signal: AbortSignal.timeout(15_000) });
  assert.ok(response.ok, `Synthetic upload returned HTTP ${response.status}.`);
  attachmentIds.push((await response.json()).data.id);
}
let preparation = await call('/report-preparations', {
  draftId: randomUUID(),
  originalDescription: 'Fictional integration test only: a fallen branch blocks a public walkway near the harbour. No real incident or personal data.',
  publicLocation: { latitude: 44.6488, longitude: -63.5752 }, category: 'trees', attachmentIds,
});
const deadline = Date.now() + 30_000;
while (['queued', 'running'].includes(preparation.status) && Date.now() < deadline) {
  await new Promise(resolve => setTimeout(resolve, 500));
  preparation = await call(`/report-preparations/${preparation.id}`);
}
// Print only safe metadata, never keys, request headers, or model response text.
console.log(JSON.stringify({ status: preparation.status, mode: preparation.mode, provider: preparation.provider,
  model: preparation.model, attempts: preparation.attempts, latencyMs: preparation.latencyMs,
  images: attachmentIds.length, category: preparation.suggestion?.category ?? null, errorCode: preparation.error?.code ?? null }, null, 2));
assert.equal(preparation.status, 'succeeded', 'Live preparation did not succeed; inspect the safe error code above.');
assert.equal(preparation.provider, 'anthropic');
assert.equal(preparation.suggestion.category, 'trees');
