// Authorized technical cuts; not a proposed editorial cut or a published sermon.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { root, read, write, fileDigest } from '../tools/engine.mjs';
import { prepareForeground } from '../tools/prepare_foreground.mjs';
import { rendererFingerprint } from '../tools/fingerprint.mjs';
if (!process.argv[2])
  throw new Error('Usage: node tests/foreground-timeline-integration.mjs AUTHORIZED_JOB');
const input = read(process.argv[2]),
  source = input.clips[0];
if (source.end - source.start < 9) throw new Error('Nine seconds of authorized source required');
const dir = path.join(root, 'output/foreground-timeline-regression');
fs.mkdirSync(dir, { recursive: true });
const camera = [
  { time: 0, scale: 1, x: 50, y: 50 },
  { time: 3, scale: 1.02, x: 50, y: 50 },
];
const job = {
  fps: 30,
  width: 1080,
  height: 1920,
  theme: { fit: 'contain' },
  captionStyle: { enabled: false },
  audio: { normalize: false },
  clips: [
    { source: source.source, start: source.start, end: source.start + 3, camera },
    { source: source.source, start: source.start + 6, end: source.start + 9, camera },
  ],
  motions: [
    {
      kind: 'title',
      text: 'TESTE',
      start: 0,
      end: 6,
      layer: 'behind',
      fontSize: 200,
      position: { x: 85, y: 1000, width: 880, height: 250 },
      evidence: 'Technical timeline label; not a sermon quote',
    },
    { kind: 'zoom-transition', start: 2.9, end: 3.1, cut: 3, amount: 0.03 },
  ],
};
const prepared = await prepareForeground(job, path.join(dir, 'prepared'));
const layer = read(path.join(dir, 'prepared/foreground.json'));
assert.equal(layer.frames, 180);
assert.equal(
  layer.tracks[90].sceneCut,
  true,
  'Temporal smoothing must reset at the exact edit boundary',
);
const ready = read(prepared.output);
assert.equal(ready.foregroundPreparation.geometry.clips.length, 2);
assert.equal(ready.foregroundPreparation.geometry.transitions[0].cut, 3);
const run = (command, args) => {
  const result = spawnSync(command, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 32e6 });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout;
};
run(process.execPath, [path.join(root, 'tools/engine.mjs'), 'preview', prepared.output, dir]);
run('python', [
  '-X',
  'utf8',
  path.join(root, 'tools/audio_fidelity.py'),
  prepared.output,
  path.join(dir, 'preview.mp4'),
  path.join(dir, 'audio-fidelity.json'),
]);
const video = read(path.join(dir, 'preview-validation.json')),
  audio = read(path.join(dir, 'audio-fidelity.json'));
assert.equal(video.status, 'passed');
assert.equal(Number(video.video.nb_frames), 180);
assert.equal(audio.passed, true);
const result = {
  passed: true,
  scope:
    'Authorized technical six-second cut/zoom/alpha sample; not an editorial proposal or approval',
  sourceFingerprint: rendererFingerprint(root),
  clips: 2,
  frames: 180,
  cutFrame: 90,
  temporalMaskResetAtCut: true,
  cameraAndGeometryTransitionPrepared: true,
  fullAlphaDecodePassed: ready.foregroundPreparation.fullAlphaDecodePassed,
  emptyFrames: layer.emptyFrames,
  previewSha256: fileDigest(path.join(dir, 'preview.mp4')),
  audioComparison: {
    passed: audio.passed,
    sampledWindows: audio.windows.length,
    windowSeconds: audio.windowSeconds,
    minimumCorrelation: audio.minimumCorrelation,
    maximumAbsoluteLagMs: audio.maximumAbsoluteLagMs,
  },
  manualEdgeAndEditorialReviewRequired: true,
};
write(path.join(dir, 'assertions.json'), result);
console.log(result);
