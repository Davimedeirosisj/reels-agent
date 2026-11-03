// Every collision is rejected before probing or writing the protected bytes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { root, write, fileDigest } from '../tools/engine.mjs';
import { rendererFingerprint } from '../tools/fingerprint.mjs';
const base = path.join(root, 'output/output-guard-regression');
fs.mkdirSync(base, { recursive: true });
const dir = fs.mkdtempSync(path.join(base, 'cli-')),
  jobFile = path.join(dir, 'job.json');
let checked = 0;
for (const command of ['preview', 'final'])
  for (const name of [
    `${command}.mp4`,
    `${command}.raw.mp4`,
    'transcript.json',
    'captions.srt',
    'captions.vtt',
  ]) {
    const source = path.join(dir, name);
    fs.writeFileSync(source, 'protected original bytes');
    const before = fileDigest(source);
    write(jobFile, { clips: [{ source, start: 0, end: 1 }], captionStyle: { enabled: false } });
    const r = spawnSync(
      process.execPath,
      [path.join(root, 'tools/engine.mjs'), command, jobFile, dir],
      { encoding: 'utf8', windowsHide: true },
    );
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /não pode sobrescrever/);
    assert.equal(fileDigest(source), before);
    checked++;
  }
const source = path.join(dir, 'clean.mp4');
fs.writeFileSync(source, 'protected original bytes');
const collidingJob = path.join(dir, 'edit_decisions.json');
write(collidingJob, { clips: [{ source, start: 0, end: 1 }] });
const before = fileDigest(collidingJob);
const r = spawnSync(
  process.execPath,
  [path.join(root, 'tools/engine.mjs'), 'preview', collidingJob, dir],
  { encoding: 'utf8', windowsHide: true },
);
assert.notEqual(r.status, 0);
assert.match(r.stderr, /não pode sobrescrever/);
assert.equal(fileDigest(collidingJob), before);
checked++;
const result = {
  passed: true,
  scope: 'Actual engine CLI rejects source/job collisions before media probing or writes',
  collisionsRejected: checked,
  allOriginalBytesPreserved: true,
  sourceFingerprint: rendererFingerprint(root),
};
write(path.join(base, 'assertions.json'), result);
console.log(result);
