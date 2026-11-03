import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root } from '../tools/engine.mjs';
import { assertOutputsDistinct } from '../tools/output_guard.mjs';
test('outputs protect originals through lexical, physical and case aliases', () => {
  const base = path.join(root, 'output/output-guard-regression');
  fs.mkdirSync(base, { recursive: true });
  const dir = fs.mkdtempSync(path.join(base, 'case-')),
    source = path.join(dir, 'source.mp4');
  fs.writeFileSync(source, 'original bytes');
  assert.throws(() => assertOutputsDistinct([source], [source]), /sobrescrever/);
  assert.throws(
    () => assertOutputsDistinct([path.join(dir, 'sub', '..', 'source.mp4')], [source]),
    /sobrescrever/,
  );
  if (process.platform === 'win32')
    assert.throws(() => assertOutputsDistinct([source.toUpperCase()], [source]), /sobrescrever/);
  assert.doesNotThrow(() =>
    assertOutputsDistinct([path.join(dir, 'new', 'preview.mp4')], [source]),
  );
  // A hardlink is a physical alias, even when the file names are unrelated.
  const alias = path.join(dir, 'alias.mp4');
  try {
    fs.linkSync(source, alias);
  } catch (error) {
    if (!['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) throw error;
  }
  if (fs.existsSync(alias))
    assert.throws(() => assertOutputsDistinct([alias], [source]), /sobrescrever/);
  assert.equal(fs.readFileSync(source, 'utf8'), 'original bytes');
});
