// Real RGB/voice regression: reference, camera cast, proposed correction.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { root, read, write } from '../tools/engine.mjs';
const run = (command, args, binary = false) => {
  const r = spawnSync(command, args, {
    encoding: binary ? null : 'utf8',
    windowsHide: true,
    maxBuffer: 32e6,
  });
  if (r.status !== 0) throw new Error(String(r.stderr || r.stdout));
  return r.stdout;
};
const dir = path.join(root, 'output/color-regression');
fs.mkdirSync(dir, { recursive: true });
const patches = [
  [0.42, 0.42, 0.42],
  [0.6, 0.1, 0.1],
  [0.1, 0.1, 0.6],
  [0.48, 0.25, 0.16],
  [0.1, 0.5, 0.1],
  [0.04, 0.04, 0.04],
];
const gamma = (x) =>
  Math.round(255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055));
for (const [name, gains] of [
  ['reference', [1, 1, 1]],
  ['cast', [1.2, 0.9, 0.75]],
]) {
  const width = 360,
    height = 640,
    pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const color = patches[Math.floor(y / (height / 3)) * 2 + Math.floor(x / (width / 2))];
      for (let c = 0; c < 3; c++) pixels[(y * width + x) * 3 + c] = gamma(color[c] * gains[c]);
    }
  const ppm = path.join(dir, `${name}.ppm`);
  fs.writeFileSync(ppm, Buffer.concat([Buffer.from(`P6\n${width} ${height}\n255\n`), pixels]));
  run('ffmpeg', [
    '-y',
    '-v',
    'error',
    '-loop',
    '1',
    '-framerate',
    '30',
    '-i',
    ppm,
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:sample_rate=48000:duration=2.2',
    '-t',
    '2.2',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-colorspace',
    'bt709',
    '-color_primaries',
    'bt709',
    '-color_trc',
    'bt709',
    '-c:a',
    'aac',
    path.join(dir, `${name}.mp4`),
  ]);
}
const source = path.join(dir, 'cast.mp4');
const job = {
  fps: 30,
  clips: [
    { source: path.join(dir, 'reference.mp4'), start: 0, end: 1 },
    { source, start: 0, end: 1 },
    { source, start: 1, end: 2 },
  ],
  captionStyle: { enabled: false },
  audio: { normalize: false },
  theme: { fit: 'contain' },
  title: {
    text: 'TESTE DE COR',
    duration: 3,
    position: { x: 85, y: 1450, width: 880 },
    fontSize: 66,
    accent: '#ffffff',
  },
  colorMatch: {
    referenceClip: 0,
    targets: [2],
    samples: {
      0: { rect: [0.08, 0.08, 0.25, 0.18], label: 'neutral card' },
      2: { rect: [0.08, 0.08, 0.25, 0.18], label: 'neutral card' },
    },
  },
};
write(path.join(dir, 'input.json'), job);
run(process.execPath, [
  path.join(root, 'tools/engine.mjs'),
  'color-plan',
  path.join(dir, 'input.json'),
  path.join(dir, 'proposed.json'),
]);
const proposed = read(path.join(dir, 'proposed.json'));
assert.equal(proposed.clips[0].color, undefined);
assert.equal(proposed.clips[1].color, undefined);
assert.ok(proposed.clips[2].color.gain[0] < 1 && proposed.clips[2].color.gain[2] > 1.2);
run(process.execPath, [
  path.join(root, 'tools/engine.mjs'),
  'preview',
  path.join(dir, 'proposed.json'),
  dir,
]);
const file = path.join(dir, 'preview.mp4');
const sample = (time, x, y) => [
  ...run(
    'ffmpeg',
    [
      '-v',
      'error',
      '-ss',
      String(time),
      '-i',
      file,
      '-vf',
      `crop=80:80:${x}:${y},scale=1:1`,
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
];
const colors = [0.5, 1.5, 2.5].map((t) =>
  [
    [180, 250],
    [720, 250],
    [180, 850],
    [720, 850],
    [180, 1650],
    [720, 1650],
  ].map(([x, y]) => sample(t, x, y)),
);
const error = (a, b) =>
  a.flat().reduce((sum, x, i) => sum + Math.abs(x - b.flat()[i]), 0) / (a.length * 3);
const before = error(colors[1], colors[0]),
  after = error(colors[2], colors[0]);
assert.ok(before > 8, `Fixture does not have a meaningful cast: ${before}`);
assert.ok(
  after < 4 && after < before * 0.35,
  `Correction did not restore reference patches: ${JSON.stringify({ before, after, colors })}`,
);
const result = {
  passed: true,
  synthetic: true,
  sourceGains: [1.2, 0.9, 0.75],
  proposedGains: proposed.clips[2].color.gain,
  meanAbsoluteRgbErrorBefore: before,
  meanAbsoluteRgbErrorAfter: after,
  referencePatches: colors[0],
  castPatches: colors[1],
  correctedPatches: colors[2],
  outputHash: read(path.join(dir, 'preview-validation.json')).sha256,
  checks: [
    'Measured shared neutral patch from decoded source frames',
    'Correction applies only to the selected shot',
    'RGB patch error reduced in the rendered MP4',
    'Full decode, video/audio formats and frame count checked',
  ],
  scope:
    'SDR synthetic multi-camera calibration; skin-tone judgment and actual mixed lighting require visual review',
};
write(path.join(dir, 'assertions.json'), result);
console.log(result);
