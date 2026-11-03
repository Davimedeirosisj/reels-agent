// Explicit authorized short preparation; never download private video in tests.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { root, read, write, fileDigest } from '../tools/engine.mjs';
import { prepareForeground } from '../tools/prepare_foreground.mjs';
import { rendererFingerprint } from '../tools/fingerprint.mjs';
if (!process.argv[2])
  throw new Error('Usage: node tests/foreground-cache-integration.mjs AUTHORIZED_PREPARED_JOB');
const preparedFile = path.resolve(process.argv[2]);
const sourceDir = path.dirname(preparedFile),
  input = read(preparedFile);
if (!input.foregroundPreparation || input.foregroundPreparation.frames > 150)
  throw new Error('Use an already validated short sample, at most 150 frames');
const dir = path.join(root, 'output/foreground-cache-regression');
fs.mkdirSync(dir, { recursive: true });
const runDir = fs.mkdtempSync(path.join(dir, 'case-'));
for (const file of ['edited-source.mp4', 'source-validation.json', 'source-manifest.json'])
  fs.copyFileSync(path.join(sourceDir, file), path.join(runDir, file));
const base = path.join(runDir, 'edited-source.mp4');
const before = { hash: fileDigest(base), modified: fs.statSync(base).mtimeMs };
const job = structuredClone(input);
delete job.foregroundSrc;
delete job.foregroundPreparation;
job.foregroundOptions = { ...job.foregroundOptions, crf: 18, lossless: false };
const first = await prepareForeground(job, runDir);
const manifest = read(path.join(runDir, 'prepare-manifest.json'));
assert.equal(first.reused, false);
assert.equal(
  manifest.baseReused,
  true,
  'Changing mask encoding must not render the edited source again',
);
assert.equal(fileDigest(base), before.hash);
assert.equal(fs.statSync(base).mtimeMs, before.modified);
const second = await prepareForeground(job, runDir);
assert.equal(second.reused, true);
const result = {
  passed: true,
  scope:
    'Authorized short sample; reuses validated edited-source after a missing mask manifest and changed encoder quality',
  sourceFingerprint: rendererFingerprint(root),
  frames: first.frames,
  editedSourceReused: true,
  editedSourceSha256: before.hash,
  editedSourceModificationTimeUnchanged: true,
  regeneratedMaskQualityCrf: 18,
  regeneratedMaskSha256: manifest.foregroundSha256,
  fullAlphaDecodePassed: manifest.fullAlphaDecodePassed,
  secondPreparationFullyReused: second.reused,
};
write(path.join(dir, 'assertions.json'), result);
console.log(result);
