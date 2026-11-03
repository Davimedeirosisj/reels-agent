import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root } from '../tools/engine.mjs';
import { rendererFingerprint } from '../tools/fingerprint.mjs';
test('approval fingerprint ignores checkout line endings and binds dependencies and render code', () => {
  const base = path.join(root, 'output/fingerprint-regression');
  fs.mkdirSync(base, { recursive: true });
  const fixture = fs.mkdtempSync(path.join(base, 'source-'));
  fs.mkdirSync(path.join(fixture, 'src'));
  fs.mkdirSync(path.join(fixture, 'tools'));
  const files = [
    'src/component.jsx',
    'tools/engine.mjs',
    'tools/review_page.mjs',
    'tools/fingerprint.mjs',
    'package-lock.json',
  ];
  for (const file of files) fs.writeFileSync(path.join(fixture, file), 'same\ncontent\n');
  const before = rendererFingerprint(fixture);
  for (const file of files) fs.writeFileSync(path.join(fixture, file), 'same\r\ncontent\r\n');
  assert.equal(rendererFingerprint(fixture), before);
  fs.writeFileSync(path.join(fixture, 'package-lock.json'), 'changed dependency\n');
  assert.notEqual(rendererFingerprint(fixture), before);
  const dependencyChanged = rendererFingerprint(fixture);
  fs.writeFileSync(path.join(fixture, 'tools/engine.mjs'), 'changed rendering\n');
  assert.notEqual(rendererFingerprint(fixture), dependencyChanged);
});
