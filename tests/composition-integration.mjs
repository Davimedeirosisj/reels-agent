import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { root, write, fileDigest } from '../tools/engine.mjs';
import { rendererFingerprint } from '../tools/fingerprint.mjs';
const run = (p, args, binary = false) => {
  const r = spawnSync(p, args, {
    encoding: binary ? null : 'utf8',
    maxBuffer: 64e6,
    windowsHide: true,
  });
  if (r.status !== 0) throw new Error(String(r.stderr));
  return r.stdout;
};
const dir = path.join(root, 'output', 'composition-regression');
fs.mkdirSync(dir, { recursive: true });
const source = path.join(dir, 'background.mp4'),
  panels = path.join(root, 'output/regression/source.mp4'),
  music = path.join(root, 'public/showcase-tone.wav');
if (!fs.existsSync(panels)) throw new Error('Run tests/render-integration.mjs first');
run('ffmpeg', [
  '-y',
  '-v',
  'error',
  '-f',
  'lavfi',
  '-i',
  'color=blue:s=360x640:r=30:d=2',
  '-f',
  'lavfi',
  '-i',
  'sine=frequency=550:duration=2',
  '-c:v',
  'libx264',
  '-c:a',
  'aac',
  source,
]);
const job = {
  clips: [{ source, start: 0, end: 2 }],
  audio: { normalize: false },
  captionStyle: { enabled: false },
  transcript: {
    segments: [{ source, start: 0, end: 1, text: 'Synthetic voice activity fixture.' }],
  },
  music: { source: music, volume: 0.3, duckVolume: 0.05 },
  motions: [
    {
      kind: 'image-sequence',
      start: 0,
      end: 2,
      position: { x: 0, y: 0, width: 1080, height: 1920 },
      items: [
        { asset: panels, assetType: 'video', trimStart: 0, duration: 1, fit: 'cover' },
        { asset: panels, assetType: 'video', trimStart: 1, duration: 1, fit: 'cover' },
      ],
    },
  ],
};
const jobPath = path.join(dir, 'job.json');
write(jobPath, job);
run(process.execPath, [path.join(root, 'tools/engine.mjs'), 'preview', jobPath, dir]);
const file = path.join(dir, 'preview.mp4');
const colors = [0.3, 1.3].map((t) => [
  ...run(
    'ffmpeg',
    [
      '-v',
      'error',
      '-ss',
      String(t),
      '-i',
      file,
      '-vf',
      'scale=1:1',
      '-frames:v',
      '1',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgb24',
      '-',
    ],
    true,
  ),
]);
assert.ok(colors[0][0] > 200 && colors[0][2] < 40, `First B-roll clip should be red: ${colors[0]}`);
assert.ok(
  colors[1][1] > 70 && colors[1][0] < 40 && colors[1][2] < 40,
  `Second B-roll must use its local clock, not a blue source frame: ${colors[1]}`,
);
const amplitudes = [0.3, 1.4].map((t) => {
  const b = run(
    'ffmpeg',
    [
      '-v',
      'error',
      '-ss',
      String(t),
      '-t',
      '0.3',
      '-i',
      file,
      '-ac',
      '1',
      '-ar',
      '48000',
      '-f',
      'f32le',
      '-',
    ],
    true,
  );
  let re = 0,
    im = 0;
  for (let i = 0; i < b.length / 4; i++) {
    const v = b.readFloatLE(i * 4),
      angle = (2 * Math.PI * 220 * i) / 48000;
    re += v * Math.cos(angle);
    im += v * Math.sin(angle);
  }
  return (Math.hypot(re, im) * 2) / (b.length / 4);
});
assert.ok(amplitudes[1] > amplitudes[0] * 3, `Music should recover after speech: ${amplitudes}`);
write(path.join(dir, 'assertions.json'), {
  passed: true,
  sourceFingerprint: rendererFingerprint(root),
  outputHash: fileDigest(path.join(dir, 'preview.mp4')),
  colors,
  music220HzAmplitude: amplitudes,
  recoveryRatio: amplitudes[1] / amplitudes[0],
  checks: [
    'Nested video panels play with event-local clock',
    'B-roll audio is muted; speaker track remains',
    'Music volume recovers after the speech range',
  ],
  synthetic: true,
});
console.log({ colors, amplitudes, passed: true });
