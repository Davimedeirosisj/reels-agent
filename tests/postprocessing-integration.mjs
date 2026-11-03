// Authored M016 technique study. No external screenshot, model or sermon is
// used. Individual effects are measured in actual rendered pixels.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { bundle } from '@remotion/bundler';
import { selectComposition, renderStill } from '@remotion/renderer';
import { root, read, write, fileDigest } from '../tools/engine.mjs';
import { rendererFingerprint } from '../tools/fingerprint.mjs';
import { mapMedia } from '../src/media-layout.mjs';
import { correctTranscript } from '../tools/transcript_corrections.mjs';
const run = (command, args, binary = false) => {
  const r = spawnSync(command, args, {
    encoding: binary ? null : 'utf8',
    windowsHide: true,
    maxBuffer: 64e6,
  });
  if (r.status !== 0) throw new Error(String(r.stderr || r.stdout));
  return r.stdout;
};
const dir = path.join(root, 'output/postprocessing-regression'),
  assets = path.join(dir, 'assets');
fs.mkdirSync(assets, { recursive: true });
const source = path.join(assets, 'source.mp4'),
  screen = path.join(assets, 'phone.svg');
fs.writeFileSync(
  screen,
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="1256" viewBox="0 0 600 1256">
<rect width="600" height="1256" fill="#091928"/><circle cx="300" cy="300" r="110" fill="#b59bf7"/>
<path d="M280 252l70 48-70 48z" fill="#101820"/><g fill="#f4f2f8" font-family="Arial" text-anchor="middle">
<text x="300" y="520" font-size="46" font-weight="700">REELS AGENT</text><text x="300" y="580" font-size="30">ENSAIO TÉCNICO</text></g>
<g fill="#244258"><rect x="65" y="720" width="470" height="65" rx="16"/><rect x="65" y="820" width="470" height="65" rx="16"/><rect x="65" y="920" width="470" height="65" rx="16"/></g></svg>`,
);
run('ffmpeg', [
  '-y',
  '-v',
  'error',
  '-f',
  'lavfi',
  '-i',
  'color=0x173248:s=1080x1920:r=30:d=6',
  '-i',
  path.join(root, 'public/demo-input.mp4'),
  '-map',
  '0:v',
  '-map',
  '1:a',
  '-t',
  '6',
  '-c:v',
  'libx264',
  '-pix_fmt',
  'yuv420p',
  '-c:a',
  'aac',
  source,
]);
const effects = {
  bloom: { intensity: 0.45, levels: 4, luminanceThreshold: 1 },
  chromaticAberration: { offset: [0.0007, 0.0003] },
  grain: { opacity: 0.025, size: 1, seed: 'authored-m016', animate: true },
};
const job = {
  fps: 30,
  width: 1080,
  height: 1920,
  fixture: { isSermon: false, source: 'Authored geometry, SVG and Windows local TTS' },
  clips: [{ source, start: 0, end: 6 }],
  title: {
    text: 'ENSAIO TÉCNICO · 3D',
    start: 0,
    duration: 6,
    fontSize: 58,
    position: { x: 85, y: 210, width: 880, height: 160 },
  },
  transcript: correctTranscript(read(path.join(root, 'public/demo-transcript.json')), [
    { from: 'reals', to: 'Reels' },
  ]).transcript,
  captionStyle: { mode: 'accessible', fontSize: 60, minFontSize: 48, maxLines: 2 },
  audio: { normalize: false },
  motions: [
    {
      kind: 'ui3d',
      start: 0,
      end: 6,
      evidence: 'Authored technical illustration; not a spoken or sermon claim',
      position: { x: 85, y: 430, width: 880, height: 1040 },
      panels: [
        { label: 'FALA', position: [-2, 0.2, -0.5], rotation: [0, 0.3, 0], size: [1.4, 2.2, 0.07] },
        {
          label: 'CONTEXTO',
          position: [2, 0.4, -0.8],
          rotation: [0, -0.3, 0],
          size: [1.4, 2.2, 0.07],
        },
      ],
      scene: {
        ground: false,
        spin: 0,
        rotation: [0, 0, 0],
        orbit: { radius: 9.5, elevation: 0.6, angle: -0.3, speed: 0.1 },
        phone: { asset: screen },
        postprocessing: effects,
        lights: [
          { type: 'ambient', intensity: 0.6 },
          { type: 'directional', position: [-3, 5, 5], intensity: 2.6, color: '#fff1dc' },
          { type: 'point', position: [3, 2, -2], intensity: 40, color: '#a477ff' },
        ],
        nodes: [
          {
            geometry: 'torus',
            args: [2.5, 0.018, 12, 128],
            position: [0, 0, -1.5],
            color: '#7e51c2',
            emissive: '#a477ff',
            emissiveIntensity: 5,
            toneMapped: false,
          },
        ],
      },
    },
  ],
};
const fingerprint = rendererFingerprint(root);
write(path.join(dir, 'job.json'), job);
run(process.execPath, [
  path.join(root, 'tools/engine.mjs'),
  'preview',
  path.join(dir, 'job.json'),
  dir,
]);
const validation = read(path.join(dir, 'preview-validation.json'));
assert.equal(validation.status, 'passed');
assert.equal(Number(validation.video.nb_frames), 180);
// media_probe describes the source clips. Check the approval binding itself
// for a still image: changing only the screen must invalidate the receipt.
const binding = JSON.parse(
  fs.readFileSync(path.join(dir, 'review.html'), 'utf8').match(/,binding=(\{[^\n;]*\}),keys=/)[1],
);
const receipt = path.join(dir, 'synthetic-review.json');
write(receipt, {
  ...binding,
  messageFaithful: true,
  captionsCorrect: true,
  framingSafe: true,
  audioClear: true,
});
const originalScreen = fs.readFileSync(screen),
  originalJob = fs.readFileSync(path.join(dir, 'job.json'));
try {
  fs.appendFileSync(screen, '\n<!-- changed fixture screen -->');
  const rejected = spawnSync(
    process.execPath,
    [path.join(root, 'tools/engine.mjs'), 'approve', path.join(dir, 'job.json'), receipt],
    { encoding: 'utf8', windowsHide: true },
  );
  assert.notEqual(
    rejected.status,
    0,
    'Changed phone screen did not invalidate the preview receipt',
  );
  assert.match(rejected.stderr, /modificada/);
  assert.deepEqual(fs.readFileSync(path.join(dir, 'job.json')), originalJob);
} finally {
  fs.writeFileSync(screen, originalScreen);
}
const heroFrame = (at) =>
  run(
    'ffmpeg',
    [
      '-v',
      'error',
      '-ss',
      String(at),
      '-i',
      path.join(dir, 'preview.mp4'),
      '-frames:v',
      '1',
      '-vf',
      'crop=880:1040:85:430,scale=220:260',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgb24',
      '-',
    ],
    true,
  );
const heroA = heroFrame(2),
  heroB = heroFrame(4);
const orbitalMotionMeanRgbDifference =
  heroA.reduce((sum, value, index) => sum + Math.abs(value - heroB[index]), 0) / heroA.length;
assert.ok(
  orbitalMotionMeanRgbDifference > 2,
  'Orbital camera produced no substantial motion in encoded MP4',
);
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
const serveUrl = await bundle({ entryPoint: path.join(root, 'src/index.jsx'), publicDir: assets });
const browserExecutable = process.env.REELS_BROWSER,
  chromiumOptions = { gl: process.env.REELS_GL || 'angle' };
const base = {
  ...job,
  title: null,
  transcript: { segments: [] },
  captionStyle: { enabled: false },
  motions: [
    {
      kind: 'light3d',
      start: 0,
      end: 6,
      evidence: 'Authored isolated shader fixture',
      position: { x: 85, y: 400, width: 880, height: 900 },
      scene: {
        ground: false,
        rotation: [0, 0, 0],
        spin: 0,
        camera: [{ time: 0, position: [0, 0, 6] }],
        lights: [{ type: 'ambient', intensity: 2 }],
        nodes: [
          {
            geometry: 'sphere',
            args: [0.6, 64, 48],
            color: '#ffffff',
            emissive: '#ffffff',
            emissiveIntensity: 3,
          },
        ],
      },
    },
  ],
};
const still = async (name, input, frame = 30) => {
  const props = mapMedia(input, (value) => path.basename(value));
  const composition = await selectComposition({
    serveUrl,
    id: 'PastoralReel',
    inputProps: props,
    browserExecutable,
    chromiumOptions,
  });
  const output = path.join(dir, name + '.png');
  await renderStill({
    serveUrl,
    composition,
    inputProps: props,
    browserExecutable,
    chromiumOptions,
    frame,
    imageFormat: 'png',
    output,
  });
  console.log('Rendered ' + name);
  return {
    sha256: fileDigest(output),
    rgb: run(
      'ffmpeg',
      ['-v', 'error', '-i', output, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
      true,
    ),
  };
};
const configured = (finish, plane = false) => {
  const copy = structuredClone(base),
    scene = copy.motions[0].scene;
  if (finish !== undefined) scene.postprocessing = finish;
  if (plane) scene.nodes = [{ geometry: 'plane', args: [2, 2], color: '#666666', roughness: 1 }];
  return copy;
};
const normal = await still('normal', base);
const disabled = await still('disabled', configured({ enabled: false, bloom: true, grain: true }));
assert.equal(normal.sha256, disabled.sha256, 'Disabled effects changed the original scene');
const bloom = await still('bloom', configured({ bloom: { intensity: 0.8, levels: 4 } }));
const ca = await still('chromatic', configured({ chromaticAberration: { offset: [0.01, 0] } }));
const pixel = (buffer, x, y, channel) => buffer[(y * 1080 + x) * 3 + channel];
const regionDifference = (a, b, x, y, width, height) => {
  let sum = 0;
  for (let yy = y; yy < y + height; yy++)
    for (let xx = x; xx < x + width; xx++)
      for (let c = 0; c < 3; c++) sum += Math.abs(pixel(a, xx, yy, c) - pixel(b, xx, yy, c));
  return sum / (width * height * 3);
};
const emptyCornerDifference = regionDifference(normal.rgb, bloom.rgb, 100, 415, 40, 40);
assert.ok(emptyCornerDifference < 0.5, 'Bloom created an opaque/noisy rectangle over the source');
let additionalHaloPixels = 0;
for (let y = 550; y < 1150; y++)
  for (let x = 250; x < 830; x++) {
    const index = (y * 1080 + x) * 3;
    if (
      Math.max(...normal.rgb.subarray(index, index + 3)) < 100 &&
      Math.max(...bloom.rgb.subarray(index, index + 3)) > 120
    )
      additionalHaloPixels++;
  }
assert.ok(additionalHaloPixels > 1000, 'Bright material did not produce a visible halo');
const centroid = (buffer, channel) => {
  let total = 0,
    sum = 0;
  const background = pixel(buffer, 100, 850, channel);
  for (let x = 150; x < 930; x++) {
    const w = Math.max(0, pixel(buffer, x, 850, channel) - background);
    total += w;
    sum += x * w;
  }
  return sum / total;
};
const chromaticSeparation =
  centroid(ca.rgb, 0) - centroid(ca.rgb, 2) - (centroid(normal.rgb, 0) - centroid(normal.rgb, 2));
assert.ok(
  Math.abs(chromaticSeparation) > 8,
  'Chromatic offset did not separate the encoded color edges',
);
const plane = await still('grain-off', configured(undefined, true));
const grainJob = configured({ grain: { opacity: 0.12, seed: 'repeatable', animate: true } }, true);
const grain = await still('grain-a', grainJob);
const later = await still('grain-next-frame', grainJob, 31);
const repeat = await still('grain-repeat', grainJob);
assert.equal(grain.sha256, repeat.sha256, 'Same frame/seed changed across fresh render runs');
assert.notEqual(grain.sha256, later.sha256, 'Animated grain did not vary with the explicit frame');
const changedSeed = await still(
  'grain-other-seed',
  configured({ grain: { opacity: 0.12, seed: 'different', animate: true } }, true),
);
assert.notEqual(grain.sha256, changedSeed.sha256);
const grainDifference = regionDifference(plane.rgb, grain.rgb, 500, 810, 80, 80);
const grainBackgroundDifference = regionDifference(plane.rgb, grain.rgb, 100, 415, 40, 40);
assert.ok(grainDifference > 1, 'Grain was not visible on a flat material');
assert.ok(grainBackgroundDifference < 0.5, 'Grain polluted transparent space');
const hero = await still('hero', job, 60);
assert.equal(rendererFingerprint(root), fingerprint, 'Source changed during the effect regression');
const assertions = {
  passed: true,
  syntheticOnly: true,
  referenceId: 'M016',
  exactReferenceReproduction: false,
  sourceFingerprint: fingerprint,
  outputHash: fileDigest(path.join(dir, 'preview.mp4')),
  frames: 180,
  disabledIdentical: true,
  additionalHaloPixels,
  emptyCornerMeanRgbDifference: emptyCornerDifference,
  chromaticRedBlueSeparationPixels: chromaticSeparation,
  grainMaterialMeanRgbDifference: grainDifference,
  grainBackgroundMeanRgbDifference: grainBackgroundDifference,
  repeatedFrameSha256: grain.sha256,
  sameFrameRepeatIdentical: true,
  frameVariationObserved: true,
  seedVariationObserved: true,
  phoneAssetStaged: true,
  phoneAssetChangeInvalidatedReview: true,
  orbitalCameraFromFrame: true,
  orbitalMotionMeanRgbDifference,
  heroStillSha256: hero.sha256,
  audioComparison: {
    passed: audio.passed,
    minimumCorrelation: audio.minimumCorrelation,
    maximumAbsoluteLagMs: audio.maximumAbsoluteLagMs,
  },
  scope:
    'Authored phone/panels/orbit and isolated bloom/chromatic/grain tests, not the original creator assets or a premium-equivalence approval',
};
write(path.join(dir, 'assertions.json'), assertions);
console.log(assertions);
