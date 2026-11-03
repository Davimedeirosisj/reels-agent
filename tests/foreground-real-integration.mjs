// Authorized real video is passed explicitly. Only aggregate measurements may
// be published; samples, transcript, alpha and video remain local in output/.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { root, read, write, fileDigest } from '../tools/engine.mjs';
import { prepareForeground } from '../tools/prepare_foreground.mjs';
import { rendererFingerprint } from '../tools/fingerprint.mjs';
if (!process.argv[2])
  throw new Error('Usage: node tests/foreground-real-integration.mjs AUTHORIZED_JOB [seconds]');
const input = read(process.argv[2]),
  duration = Math.min(Number(process.argv[3] || 4), input.clips[0].end - input.clips[0].start);
if (!Number.isFinite(duration) || duration < 2)
  throw new Error('Provide at least two seconds of authorized source');
const dir = path.join(root, 'output/foreground-real-regression');
fs.mkdirSync(dir, { recursive: true });
const job = structuredClone(input);
delete job.approval;
delete job.foregroundPreparation;
delete job.foregroundSrc;
job.fps = 30;
job.width = 1080;
job.height = 1920;
job.clips = [
  {
    ...input.clips[0],
    end: input.clips[0].start + duration,
    camera: [
      { time: 0, scale: 1, x: 50, y: 50 },
      { time: duration, scale: 1.03, x: 50, y: 50 },
    ],
    color: input.clips[0].color || { gain: [0.98, 1, 1.02] },
  },
];
job.title = undefined;
job.music = undefined;
job.sfx = [];
job.captionStyle = { enabled: false };
job.motions = [
  {
    kind: 'title',
    text: 'TESTE',
    layer: 'behind',
    start: 0,
    end: duration,
    fontSize: 200,
    accent: '#ff4fe4',
    position: { x: 85, y: 1000, width: 880, height: 250 },
    evidence: 'Technical occlusion label; not a sermon quote',
  },
];
write(path.join(dir, 'input.json'), job);
const first = await prepareForeground(job, path.join(dir, 'prepared'));
const second = await prepareForeground(job, path.join(dir, 'prepared'));
assert.equal(second.reused, true);
const prepared = read(first.output),
  manifest = read(path.join(dir, 'prepared/prepare-manifest.json'));
assert.equal(first.frames, Math.round(duration * 30));
assert.ok(first.alphaSample.maximum > 200 && first.alphaSample.minimum < 40);
const run = (cmd, args, binary = false) => {
  const result = spawnSync(cmd, args, {
    encoding: binary ? null : 'utf8',
    windowsHide: true,
    maxBuffer: 32e6,
  });
  if (result.status !== 0) throw new Error(String(result.stderr || result.stdout));
  return result.stdout;
};
run(process.execPath, [
  path.join(root, 'tools/engine.mjs'),
  'preview',
  first.output,
  path.join(dir, 'behind'),
]);
const front = structuredClone(prepared);
delete front.foregroundSrc;
delete front.foregroundPreparation;
front.motions[0].layer = 'front';
write(path.join(dir, 'front-job.json'), front);
run(process.execPath, [
  path.join(root, 'tools/engine.mjs'),
  'preview',
  path.join(dir, 'front-job.json'),
  path.join(dir, 'front'),
]);
const at = Math.min(1.2, duration / 2);
const rgb = (file) =>
  run(
    'ffmpeg',
    [
      '-v',
      'error',
      '-ss',
      String(at),
      '-i',
      file,
      '-vf',
      'scale=360:640',
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
const base = rgb(path.join(dir, 'prepared/edited-source.mp4')),
  before = rgb(path.join(dir, 'front/preview.mp4')),
  after = rgb(path.join(dir, 'behind/preview.mp4'));
const alpha = run(
  'ffmpeg',
  [
    '-v',
    'error',
    '-ss',
    String(at),
    '-c:v',
    'libvpx-vp9',
    '-i',
    prepared.foregroundSrc,
    '-vf',
    'alphaextract,scale=360:640',
    '-frames:v',
    '1',
    '-f',
    'rawvideo',
    '-pix_fmt',
    'gray',
    '-',
  ],
  true,
);
let opaque = 0,
  transparent = 0,
  opaqueError = 0,
  transparentError = 0;
for (let pixel = 0; pixel < alpha.length; pixel++) {
  const i = pixel * 3;
  if (
    before[i] - base[i] > 80 &&
    before[i + 1] - base[i + 1] > 80 &&
    before[i + 2] - base[i + 2] > 80 &&
    Math.min(before[i], before[i + 1], before[i + 2]) > 210
  ) {
    if (alpha[pixel] >= 250) {
      opaque++;
      for (let c = 0; c < 3; c++) opaqueError += Math.abs(after[i + c] - base[i + c]);
    }
    if (alpha[pixel] <= 5) {
      transparent++;
      for (let c = 0; c < 3; c++) transparentError += Math.abs(after[i + c] - before[i + c]);
    }
  }
}
opaqueError /= Math.max(1, opaque * 3);
transparentError /= Math.max(1, transparent * 3);
assert.ok(
  opaque > 50 && transparent > 50,
  `Fixture did not cover both occlusion regions: ${opaque}/${transparent}`,
);
assert.ok(opaqueError < 15, `Foreground core changed instead of occluding letters: ${opaqueError}`);
assert.ok(
  transparentError < 20,
  `Background letters failed to remain visible: ${transparentError}`,
);
const stale = structuredClone(prepared);
stale.clips[0].camera[1].scale = 1.1;
write(path.join(dir, 'stale-job.json'), stale);
const rejected = spawnSync(
  process.execPath,
  [path.join(root, 'tools/engine.mjs'), 'validate', path.join(dir, 'stale-job.json')],
  { encoding: 'utf8', windowsHide: true },
);
assert.notEqual(rejected.status, 0);
assert.match(rejected.stderr, /desatualizado/);
for (const [name, file] of [
  ['base', path.join(dir, 'prepared/edited-source.mp4')],
  ['front', path.join(dir, 'front/preview.mp4')],
  ['behind', path.join(dir, 'behind/preview.mp4')],
])
  run('ffmpeg', [
    '-y',
    '-v',
    'error',
    '-ss',
    String(at),
    '-i',
    file,
    '-frames:v',
    '1',
    path.join(dir, name + '.jpg'),
  ]);
const result = {
  passed: true,
  scope:
    'Authorized real-video technical sample only; not editorial approval or proof of all mask edges',
  seconds: duration,
  frames: first.frames,
  sourceFingerprint: rendererFingerprint(root),
  width: 1080,
  height: 1920,
  alphaSample: first.alphaSample,
  fullAlphaDecodePassed: manifest.fullAlphaDecodePassed,
  cacheReuseVerified: second.reused,
  occludedLetterPixels: opaque,
  visibleLetterPixels: transparent,
  meanRgbErrorInOpaqueCore: opaqueError,
  meanRgbErrorInTransparentBackground: transparentError,
  editedSourceSha256: manifest.baseSha256,
  foregroundSha256: manifest.foregroundSha256,
  previewSha256: fileDigest(path.join(dir, 'behind/preview.mp4')),
  staleGeometryRejected: true,
  manualEdgeReviewRequired: true,
  checks: [
    'Edited camera/color/trim prepared before segmentation',
    'Actual VP9 alpha decoded',
    'Text visible in the background and occluded on the person core',
    'Fresh preparation reused without recomputation',
    'Stale camera geometry rejected',
  ],
};
write(path.join(dir, 'assertions.json'), result);
console.log(result);
