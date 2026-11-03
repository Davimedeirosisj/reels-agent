import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export const FINGERPRINT_SCHEME = 'normalized-source-and-lock-v2';
export function rendererFingerprint(root) {
  const walk = (folder) =>
    fs
      .readdirSync(path.join(root, folder), { withFileTypes: true })
      .flatMap((entry) =>
        entry.isDirectory()
          ? walk(folder + '/' + entry.name)
          : entry.isFile()
            ? [folder + '/' + entry.name]
            : [],
      );
  const files = [
    ...walk('src'),
    'package-lock.json',
    'tools/engine.mjs',
    'tools/review_page.mjs',
    'tools/fingerprint.mjs',
    'tools/media_cache.mjs',
    'tools/output_guard.mjs',
    'tools/export_captions.mjs',
  ].sort();
  const digest = crypto.createHash('sha256').update(FINGERPRINT_SCHEME + '\0');
  for (const file of files) {
    const content = fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
    digest.update(file + '\0' + Buffer.byteLength(content) + '\0').update(content);
  }
  return digest.digest('hex');
}
export function assertRendererUnchanged(root, fingerprint) {
  if (rendererFingerprint(root) !== fingerprint)
    throw new Error('O código mudou durante o render; gere uma nova prévia com a versão estável');
}
