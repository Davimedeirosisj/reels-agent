// Only the original red/blue color-and-tone fixture is approved by this test.
// It never reads, approves or exports a real sermon job.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { root, read, write, fileDigest } from '../tools/engine.mjs';
import { rendererFingerprint } from '../tools/fingerprint.mjs';
const dir = path.join(root, 'output/approval-regression');
fs.mkdirSync(dir, { recursive: true });
const prior = path.join(root, 'output/regression'),
  job = read(path.join(prior, 'job.json'));
if (!read(path.join(prior, 'assertions.json')).passed)
  throw new Error('Synthetic color/tone regression must pass first');
const expectedSource = path.join(prior, 'source.mp4');
assert.ok(
  job.clips.every((c) => c.source === expectedSource),
  'This test accepts only its exact synthetic fixture source',
);
const binding = JSON.parse(
  fs.readFileSync(path.join(prior, 'review.html'), 'utf8').match(/,binding=(\{[^\n;]*\}),keys=/)[1],
);
assert.equal(binding.rendererHash, rendererFingerprint(root));
const jobFile = path.join(dir, 'job.json');
write(jobFile, job);
const call = (args, shouldFail = false) => {
  const result = spawnSync(process.execPath, [path.join(root, 'tools/engine.mjs'), ...args], {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 8e6,
  });
  if (shouldFail) {
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /aprova|revisão/i);
  } else if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result;
};
call(['final', jobFile, dir], true);
const receipt = path.join(dir, 'synthetic-review.json');
write(receipt, {
  ...binding,
  messageFaithful: true,
  captionsCorrect: true,
  framingSafe: true,
  audioClear: true,
});
call(['approve', jobFile, receipt]);
call(['final', jobFile, dir]);
const validation = read(path.join(dir, 'final-validation.json'));
assert.equal(validation.status, 'passed');
const changed = read(jobFile);
changed.title = { text: 'Different fixture title' };
const changedFile = path.join(dir, 'changed-job.json');
write(changedFile, changed);
call(['final', changedFile, path.join(dir, 'blocked')], true);
const report = {
  passed: true,
  syntheticFixtureOnly: true,
  realSermonApproved: false,
  sourceFingerprint: rendererFingerprint(root),
  finalSha256: fileDigest(path.join(dir, 'final.mp4')),
  frames: validation.video.nb_frames,
  checks: [
    'Final export rejected before approval',
    'Known synthetic color/tone fixture accepted with its matching receipt',
    'Final MP4 fully decoded and validated',
    'Changed editorial job rejected after approval',
  ],
};
write(path.join(dir, 'assertions.json'), report);
console.log(report);
