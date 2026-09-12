// Stages MapLibre's worker bundle into public/maplibre/ so the browser loads it
// from a stable URL. MapLibre resolves its own worker with
// `new URL(..., import.meta.url)`, which the bundler rewrites to the page URL,
// leaving the worker to parse HTML and never answer. Serving the worker
// ourselves and calling setWorkerUrl avoids that. The files are copied from the
// installed package, so they always match the pinned version.
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distribution = join(dirname(require.resolve('maplibre-gl/package.json')), 'dist');
const destination = join(root, 'public/maplibre');

mkdirSync(destination, { recursive: true });
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(join(distribution, file), join(destination, file));
}
console.log('Staged MapLibre worker into public/maplibre/');
