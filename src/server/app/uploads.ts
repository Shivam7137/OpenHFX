import sharp from 'sharp';
import type { User } from '@/contracts';
import { authenticated, fail } from './security';
import { id, type Store } from './store';

const MAX_BYTES = 10 * 1024 * 1024;
export async function upload(request: Request, store: Store, actor: User | null) {
  const user = authenticated(actor);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('multipart/form-data;')) fail(400, 'VALIDATION_ERROR', 'Upload a photo using multipart form data.');
  const limit = MAX_BYTES + 64 * 1024;
  if (Number(request.headers.get('content-length') || 0) > limit) fail(400, 'VALIDATION_ERROR', 'Photos must be 10 MB or smaller.');
  const reader = request.body?.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  if (!reader) fail(400, 'VALIDATION_ERROR', 'Choose a photo.');
  while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > limit) { await reader.cancel(); fail(400, 'VALIDATION_ERROR', 'Photos must be 10 MB or smaller.'); } chunks.push(part.value); }
  let form: FormData;
  try { form = await new Request(request.url, { method: 'POST', headers: { 'content-type': request.headers.get('content-type')! }, body: Buffer.concat(chunks) }).formData(); }
  catch { return fail(400, 'VALIDATION_ERROR', 'The photo upload could not be read.'); }
  const file = form.get('file'); const description = form.get('description');
  if (!(file instanceof File) || typeof description !== 'string' || !description.trim() || description.trim().length > 2000) fail(400, 'VALIDATION_ERROR', 'Choose a photo and add a short description.');
  if (form.getAll('file').length !== 1 || file.size > MAX_BYTES || file.size === 0 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) fail(400, 'VALIDATION_ERROR', 'Use one JPEG, PNG, or WebP photo up to 10 MB.');
  let bytes: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(input, { limitInputPixels: 40_000_000, animated: false }).metadata();
    const expected = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
    if (metadata.format !== expected || (metadata.pages || 1) > 1) fail(400, 'VALIDATION_ERROR', 'The photo content must match its file type and be a still image.');
    bytes = await sharp(input, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  } catch { return fail(400, 'VALIDATION_ERROR', 'This image is invalid or too large to process. Use a JPEG, PNG, or WebP photo.'); }
  const photo = { id: id(), ownerId: user.id, issueId: null, url: '', description: description.trim(), mimeType: 'image/webp', bytes: bytes.length };
  photo.url = `/api/v1/attachments/${photo.id}`;
  store.transaction(state => { store.putImage(photo.id, bytes); state.attachments.push(photo); });
  return { id: photo.id, url: photo.url, description: photo.description, mimeType: photo.mimeType, bytes: photo.bytes };
}
export function serveImage(store: Store, actor: User | null, attachmentId: string) {
  const photo = store.read().attachments.find(row => row.id === attachmentId) || fail(404, 'NOT_FOUND', 'Photo not found.');
  if (!photo.issueId && photo.ownerId !== actor?.id) fail(403, 'FORBIDDEN', 'This photo is private until attached to a report.');
  const bytes = store.getImage(photo.id) || fail(404, 'NOT_FOUND', 'Photo not found.');
  return new Response(Buffer.from(bytes), { headers: { 'Content-Type': photo.mimeType, 'Content-Length': String(bytes.byteLength), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline; filename="evidence.webp"' } });
}
