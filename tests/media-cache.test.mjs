import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root } from '../tools/engine.mjs';
import { cacheMedia, stageCachedMedia, fileDigest } from '../tools/media_cache.mjs';
test('immutable media is cached once and staged without modifying source files', () => {
  const base = path.join(root, 'output/cache-regression');
  fs.mkdirSync(base, { recursive: true });
  const folder = fs.mkdtempSync(path.join(base, 'case-')),
    source = path.join(folder, 'source.bin'),
    cache = path.join(folder, 'cache');
  fs.writeFileSync(source, Buffer.alloc(65536, 7));
  const first = cacheMedia(source, cache),
    second = cacheMedia(source, cache);
  assert.equal(second.reused, true);
  assert.equal(first.file, second.file);
  const a = stageCachedMedia(first, path.join(folder, 'a.bin')),
    b = stageCachedMedia(second, path.join(folder, 'b.bin'));
  assert.equal(fileDigest(a.file), fileDigest(source));
  assert.equal(fileDigest(b.file), fileDigest(source));
  if (a.method === 'hardlink') assert.equal(fs.statSync(a.file).ino, fs.statSync(first.file).ino);
  fs.writeFileSync(source, Buffer.alloc(65536, 9));
  const changed = cacheMedia(source, cache);
  assert.notEqual(changed.file, first.file);
  assert.equal(fileDigest(a.file), first.sha256);
});
