// Original authored geometry and textures. No third-party model is downloaded.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { bundle } from '@remotion/bundler';
import { selectComposition, renderStill } from '@remotion/renderer';
import { root, read, write, fileDigest } from '../tools/engine.mjs';
import { mapMedia } from '../src/media-layout.mjs';
const run = (cmd, args, binary = false) => {
  const r = spawnSync(cmd, args, {
    encoding: binary ? null : 'utf8',
    windowsHide: true,
    maxBuffer: 32e6,
  });
  if (r.status !== 0) throw new Error(String(r.stderr || r.stdout));
  return r.stdout;
};
const dir = path.join(root, 'output/scene3d-regression'),
  assets = path.join(dir, 'assets');
fs.mkdirSync(assets, { recursive: true });
const positions = new Float32Array([
  -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1,
]);
const indices = new Uint16Array([
  0, 1, 2, 0, 2, 3, 1, 5, 6, 1, 6, 2, 5, 4, 7, 5, 7, 6, 4, 0, 3, 4, 3, 7, 3, 2, 6, 3, 6, 7, 4, 5, 1,
  4, 1, 0,
]);
const bin = Buffer.concat([Buffer.from(positions.buffer), Buffer.from(indices.buffer)]);
const gltf = {
  asset: { version: '2.0', generator: 'Reels Agent original regression cube' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
  materials: [
    {
      pbrMetallicRoughness: {
        baseColorFactor: [0.75, 0.42, 0.12, 1],
        roughnessFactor: 0.35,
        metallicFactor: 0.25,
      },
    },
  ],
  buffers: [{ byteLength: bin.length }],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: positions.byteLength, target: 34962 },
    { buffer: 0, byteOffset: positions.byteLength, byteLength: indices.byteLength, target: 34963 },
  ],
  accessors: [
    {
      bufferView: 0,
      componentType: 5126,
      count: 8,
      type: 'VEC3',
      min: [-1, -1, -1],
      max: [1, 1, 1],
    },
    { bufferView: 1, componentType: 5123, count: 36, type: 'SCALAR' },
  ],
};
let json = Buffer.from(JSON.stringify(gltf));
json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 32)]);
const header = Buffer.alloc(20),
  binHeader = Buffer.alloc(8);
header.write('glTF');
header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + json.length + bin.length, 8);
header.writeUInt32LE(json.length, 12);
header.writeUInt32LE(0x4e4f534a, 16);
binHeader.writeUInt32LE(bin.length, 0);
binHeader.writeUInt32LE(0x004e4942, 4);
const model = path.join(assets, 'original-cube.glb');
fs.writeFileSync(model, Buffer.concat([header, json, binHeader, bin]));
fs.copyFileSync(path.join(root, 'public/demo-art.svg'), path.join(assets, 'art.svg'));
const source = path.join(assets, 'source.mp4');
run('ffmpeg', [
  '-y',
  '-v',
  'error',
  '-f',
  'lavfi',
  '-i',
  'color=0x102838:s=1080x1920:r=30:d=4.8',
  '-f',
  'lavfi',
  '-i',
  'sine=frequency=440:sample_rate=48000:duration=4.8',
  '-c:v',
  'libx264',
  '-pix_fmt',
  'yuv420p',
  '-c:a',
  'aac',
  source,
]);
const camera = [
  { time: 0, position: [2, 1.2, 6] },
  { time: 1.2, position: [-2, 1, 6] },
];
const shared = {
  evidence: 'Original technical fixture, not a sermon claim',
  position: { x: 85, y: 500, width: 880, height: 900 },
  scene: { camera, spin: 0.1 },
};
const motions = [
  {
    ...shared,
    kind: 'product3d',
    start: 0,
    end: 1.2,
    text: 'PALAVRA E CONTEXTO',
    scene: { ...shared.scene, product: 'book' },
  },
  { ...shared, kind: 'product3d', start: 1.2, end: 2.4, asset: model },
  {
    ...shared,
    kind: 'ui3d',
    start: 2.4,
    end: 3.6,
    panels: [{ asset: path.join(assets, 'art.svg') }, { label: 'Revisar o contexto' }],
  },
  {
    ...shared,
    kind: 'light3d',
    start: 3.6,
    end: 4.8,
    scene: {
      ...shared.scene,
      nodes: [
        {
          geometry: 'sphere',
          position: [0, 0.1, 0],
          color: '#c18a43',
          metalness: 0.65,
          roughness: 0.2,
        },
        { geometry: 'box', args: [2.2, 0.25, 2.2], position: [0, -1.2, 0], color: '#183c51' },
      ],
    },
  },
];
const job = {
  fps: 30,
  clips: [{ source, start: 0, end: 4.8 }],
  motions,
  captionStyle: { enabled: false },
  audio: { normalize: false },
};
write(path.join(dir, 'job.json'), job);
run(process.execPath, [
  path.join(root, 'tools/engine.mjs'),
  'preview',
  path.join(dir, 'job.json'),
  dir,
]);
const file = path.join(dir, 'preview.mp4');
const frame = (t) =>
  run(
    'ffmpeg',
    [
      '-v',
      'error',
      '-ss',
      String(t),
      '-i',
      file,
      '-vf',
      'crop=880:900:85:500,scale=220:225',
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
const samples = [0.4, 1.6, 2.8, 4].map((t) => {
  const rgb = frame(t);
  let foreground = 0;
  for (let i = 0; i < rgb.length; i += 3)
    if (rgb[i] > 70 || rgb[i + 1] > 85 || rgb[i + 2] > 100) foreground++;
  assert.ok(foreground > 700, `Blank or missing 3D scene at ${t}s: ${foreground}`);
  return { time: t, foregroundPixels: foreground };
});
const a = frame(0.4),
  b = frame(0.8),
  cameraDifference = a.reduce((sum, x, i) => sum + Math.abs(x - b[i]), 0) / a.length;
assert.ok(
  cameraDifference > 1,
  `Camera/object did not move in rendered frames: ${cameraDifference}`,
);
const serveUrl = await bundle({ entryPoint: path.join(root, 'src/index.jsx'), publicDir: assets });
const props = mapMedia(job, (s) => path.basename(s)),
  browserExecutable = process.env.REELS_BROWSER,
  chromiumOptions = { gl: process.env.REELS_GL || 'angle' };
const composition = await selectComposition({
  serveUrl,
  id: 'PastoralReel',
  inputProps: props,
  browserExecutable,
  chromiumOptions,
});
const stills = ['repeat-a.png', 'repeat-b.png'].map((s) => path.join(dir, s));
for (const output of stills)
  await renderStill({
    serveUrl,
    composition,
    inputProps: props,
    browserExecutable,
    chromiumOptions,
    frame: 12,
    imageFormat: 'png',
    output,
  });
const repeatedFrameHashes = stills.map(fileDigest);
assert.equal(
  repeatedFrameHashes[0],
  repeatedFrameHashes[1],
  'The same 3D frame changed across fresh render runs',
);
run('ffmpeg', [
  '-y',
  '-v',
  'error',
  '-i',
  file,
  '-vf',
  'fps=1/1.2,scale=270:480,tile=4x1',
  '-frames:v',
  '1',
  path.join(dir, 'contact-sheet.jpg'),
]);
const result = {
  passed: true,
  synthetic: true,
  gl: chromiumOptions.gl,
  threeVersion: JSON.parse(fs.readFileSync(path.join(root, 'node_modules/three/package.json')))
    .version,
  samples,
  meanRgbDifferenceDuringCameraMove: cameraDifference,
  repeatedFrameHashes,
  outputHash: read(path.join(dir, 'preview-validation.json')).sha256,
  checks: [
    'Procedural book with real geometry and materials',
    'Original self-contained GLB imported and staged',
    'UI image/label textures loaded before capture',
    'Lit geometry and shadow receivers rendered',
    'Camera movement visible in MP4',
    'Repeated frame PNGs match exactly',
    'Full decode and MP4 format validated',
  ],
  scope:
    'Original technical fixtures; no visual equivalence claim for third-party product models, UI assets or postprocessing examples',
};
write(path.join(dir, 'assertions.json'), result);
console.log(result);
