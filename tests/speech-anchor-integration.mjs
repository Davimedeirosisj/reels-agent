// Local TTS fixture with real ASR word times. No real sermon is published here.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { root, read, write, fileDigest } from '../tools/engine.mjs';
import { applyOperations } from '../src/operations.mjs';
import { rendererFingerprint } from '../tools/fingerprint.mjs';
const run = (command, args, binary = false) => {
  const r = spawnSync(command, args, {
    encoding: binary ? null : 'utf8',
    windowsHide: true,
    maxBuffer: 64e6,
  });
  if (r.status !== 0) throw new Error(String(r.stderr || r.stdout));
  return r.stdout;
};
const dir = path.join(root, 'output/speech-anchor-regression');
fs.mkdirSync(dir, { recursive: true });
const transcript = read(path.join(root, 'public/demo-transcript.json'));
const source = path.join(dir, 'source.mp4');
run('ffmpeg', [
  '-y',
  '-v',
  'error',
  '-i',
  path.join(root, 'public/demo-input.mp4'),
  '-f',
  'lavfi',
  '-i',
  'color=c=0x08141f:s=1080x1920:r=30',
  '-map',
  '1:v',
  '-map',
  '0:a',
  '-c:v',
  'libx264',
  '-preset',
  'veryfast',
  '-c:a',
  'copy',
  '-shortest',
  source,
]);
const job = {
  fps: 30,
  clips: [{ source, start: 5.5, end: 10.5 }],
  transcript,
  captionStyle: { enabled: false },
  audio: { normalize: false },
  motions: [
    {
      kind: 'title',
      text: 'ÂNCORA',
      fontSize: 120,
      position: { x: 85, y: 600, width: 880, height: 200 },
      anchor: { phrase: 'original words' },
      duration: 1.5,
    },
  ],
};
const resolved = applyOperations(job),
  event = resolved.motions[0];
assert.equal(event.resolvedSpeechAnchor.start.granularity, 'word');
assert.ok(event.start > 0.1 && event.end < 4.8);
write(path.join(dir, 'job.json'), job);
run(process.execPath, [
  path.join(root, 'tools/engine.mjs'),
  'preview',
  path.join(dir, 'job.json'),
  dir,
]);
const actual = read(path.join(dir, 'edit_decisions.json'));
assert.equal(actual.motions[0].start, event.start);
assert.equal(actual.motions[0].end, event.end);
const samples = [event.start - 0.1, event.start + 0.5, event.end + 0.1].map((time) => {
  const rgb = run(
    'ffmpeg',
    [
      '-v',
      'error',
      '-ss',
      String(time),
      '-i',
      path.join(dir, 'preview.mp4'),
      '-vf',
      'crop=900:300:75:550,scale=300:100',
      '-frames:v',
      '1',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgb24',
      '-',
    ],
    true,
  );
  let white = 0;
  for (let i = 0; i < rgb.length; i += 3)
    if (Math.min(rgb[i], rgb[i + 1], rgb[i + 2]) > 200) white++;
  return { time, whitePixels: white };
});
assert.equal(samples[0].whitePixels, 0, 'Overlay appeared before its ASR anchor');
assert.ok(samples[1].whitePixels > 300, 'Anchored graphic did not appear in encoded video');
assert.equal(samples[2].whitePixels, 0, 'Overlay failed to end at its configured duration');
run('python', [
  '-X',
  'utf8',
  path.join(root, 'tools/audio_fidelity.py'),
  path.join(dir, 'edit_decisions.json'),
  path.join(dir, 'preview.mp4'),
  path.join(dir, 'audio-fidelity.json'),
]);
const audio = read(path.join(dir, 'audio-fidelity.json'));
assert.equal(audio.passed, true);
const result = {
  passed: true,
  synthetic: true,
  sourceFingerprint: rendererFingerprint(root),
  scope:
    'Synthetic TTS/ASR phrase anchor tested in encoded MP4; not proof of semantic accuracy of a real sermon transcript',
  frames: read(path.join(dir, 'preview-validation.json')).video.nb_frames,
  sourceTrimSeconds: 5.5,
  originalAnchorStart: event.resolvedSpeechAnchor.start.sourceStart,
  editedAnchorStart: event.start,
  editedEventEnd: event.end,
  samples,
  outputHash: fileDigest(path.join(dir, 'preview.mp4')),
  audioComparison: {
    passed: audio.passed,
    minimumCorrelation: audio.minimumCorrelation,
    maximumAbsoluteLagMs: audio.maximumAbsoluteLagMs,
  },
};
write(path.join(dir, 'assertions.json'), result);
console.log(result);
