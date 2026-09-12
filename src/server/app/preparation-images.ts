import sharp from 'sharp';
import { EngineError, type EngineImage } from '@/server/engine';
import { fail } from './security';
import type { State, Store } from './store';

/** Public visibility does not authorize sending someone else's photo to an LLM. */
export function ownedPreparationPhotos(state: State, ownerId: string, ids: string[]) {
  return ids.map(id => {
    const photo = state.attachments.find(row => row.id === id && row.ownerId === ownerId);
    return photo || fail(403, 'FORBIDDEN', 'Choose photos uploaded by your account.');
  });
}

export async function preparationImages(store: Store, ownerId: string, ids: string[]): Promise<EngineImage[]> {
  const photos = ownedPreparationPhotos(store.read(), ownerId, ids);
  const images: EngineImage[] = [];
  for (const photo of photos) {
    const source = store.getImage(photo.id);
    if (!source) throw new EngineError('INVALID_INPUT');
    try {
      // Small in-memory derivative: no EXIF, no external URL fetches, original evidence unchanged.
      const bytes = await sharp(source, { limitInputPixels: 40_000_000 }).rotate()
        .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' }).jpeg({ quality: 80 }).toBuffer();
      if (bytes.length > 2 * 1024 * 1024) throw new EngineError('INVALID_INPUT');
      images.push({ mediaType: 'image/jpeg', data: bytes.toString('base64'), description: photo.description });
    } catch { throw new EngineError('INVALID_INPUT'); }
  }
  return images;
}
