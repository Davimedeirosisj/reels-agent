// Ground truth is the synthetic local TTS fixture, not an inferred sermon quote.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { root, read, write, fileDigest } from '../tools/engine.mjs';
const transcriptFile = path.join(root, 'public/demo-transcript.json');
const raw = read(transcriptFile),
  before = fileDigest(transcriptFile);
const word = raw.segments
  .flatMap((s) => s.words || [])
  .find((w) => w.word?.toLowerCase() === 'reals');
assert.ok(word, 'Generate the documented local Whisper/TTS demo fixture first');
const dir = path.join(root, 'output/transcript-correction-regression');
fs.mkdirSync(dir, { recursive: true });
const brief = path.join(dir, 'brief.json'),
  output = path.join(dir, 'job.json');
write(brief, {
  fixture: { isSermon: false },
  transcriptCorrections: [
    { from: 'reals', to: 'Reels', start: Math.max(0, word.start - 0.001), end: word.end + 0.001 },
  ],
});
const source = path.join(root, 'public/demo-input.mp4'),
  script = path.join(root, 'tools/create_job.mjs');
const run = (out) =>
  spawnSync(process.execPath, [script, source, transcriptFile, brief, out], {
    encoding: 'utf8',
    windowsHide: true,
  });
const built = run(output);
assert.equal(built.status, 0, built.stderr);
const job = read(output),
  aligned = job.transcript.segments
    .flatMap((s) => s.words || [])
    .find((w) => w.start === word.start && w.end === word.end);
assert.equal(aligned.word, 'Reels');
assert.equal(job.transcript.provenance.human_reviewed, false);
assert.equal(fileDigest(transcriptFile), before);
for (const target of [source, transcriptFile, brief, path.join(dir, 'initial-validation.json')]) {
  const rejected = run(target);
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /não podem sobrescrever/);
}
assert.equal(fileDigest(transcriptFile), before);
const result = {
  passed: true,
  scope: 'Synthetic TTS/Whisper CLI correction and input preservation; no editorial approval',
  knownAsrSpellingCorrected: true,
  realWordTimesRetained: true,
  originalTranscriptUnchanged: true,
  inputOverwriteAttemptsRejected: 4,
  correctionToolSha256: fileDigest(path.join(root, 'tools/transcript_corrections.mjs')),
  createJobToolSha256: fileDigest(script),
};
write(path.join(dir, 'assertions.json'), result);
console.log(result);
