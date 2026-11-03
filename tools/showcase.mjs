import path from 'node:path';
import fs from 'node:fs';
import { bundle } from '@remotion/bundler';
import { selectComposition, renderMedia } from '@remotion/renderer';
import { root, write, validateMedia } from './engine.mjs';
import { MOTION_VARIANTS } from '../src/motion-kinds.mjs';
const kinds = MOTION_VARIANTS.filter((k) => k !== 'pause'),
  dir = path.join(root, 'output', 'showcase');
fs.mkdirSync(dir, { recursive: true });
const showcaseAssets = path.join(dir, 'assets');
fs.mkdirSync(showcaseAssets, { recursive: true });
for (const file of ['demo-art.svg', 'demo-foreground.svg', 'showcase-tone.wav'])
  fs.copyFileSync(path.join(root, 'public', file), path.join(showcaseAssets, file));
const serveUrl = await bundle({
  entryPoint: path.join(root, 'src/index.jsx'),
  publicDir: showcaseAssets,
});
const browserExecutable = process.env.REELS_BROWSER,
  chromiumOptions = { gl: process.env.REELS_GL || 'angle' },
  composition = await selectComposition({
    serveUrl,
    id: 'MotionShowcase',
    browserExecutable,
    chromiumOptions,
  });
const file = path.join(dir, 'motions.mp4');
let checkpoint = -1;
await renderMedia({
  serveUrl,
  composition,
  browserExecutable,
  chromiumOptions,
  codec: 'h264',
  audioCodec: 'aac',
  pixelFormat: 'yuv420p',
  colorSpace: 'bt709',
  imageFormat: 'png',
  outputLocation: file,
  concurrency: 3,
  onProgress: ({ progress }) => {
    const step = Math.floor(progress * 10);
    if (step !== checkpoint) {
      checkpoint = step;
      console.log(`Showcase ${step * 10}%`);
    }
  },
});
const report = validateMedia(file, {
  clips: [{ source: 'fixture', start: 0, end: kinds.length * 1.8 }],
});
write(path.join(dir, 'validation.json'), report);
write(path.join(dir, 'components.json'), {
  frameStep: 54,
  fps: 30,
  items: kinds.map((kind, i) => ({
    kind,
    startFrame: i * 54,
    endFrame: (i + 1) * 54 - 1,
    inspectionFrame: i * 54 + 42,
  })),
  note: 'Esses renders comprovam os componentes com dados sintéticos; não comprovam cada receita ou equivalência às referências.',
});
if (report.errors.length) throw new Error(report.errors.join('\n'));
console.log(file);
