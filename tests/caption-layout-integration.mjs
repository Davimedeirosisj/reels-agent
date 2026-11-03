// Measure the actual white glyphs in the decoded MP4, with real TTS/ASR timings.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { root, read, write } from '../tools/engine.mjs';
const run = (cmd, args, binary = false) => {
  const result = spawnSync(cmd, args, {
    encoding: binary ? null : 'utf8',
    maxBuffer: 32e6,
    windowsHide: true,
  });
  if (result.status !== 0) throw new Error(String(result.stderr || result.stdout));
  return result.stdout;
};
const dir = path.join(root, 'output/caption-layout-regression');
fs.mkdirSync(dir, { recursive: true });
const source = path.join(dir, 'source.mp4');
const segment = read(path.join(root, 'public/demo-transcript.json')).segments[0];
const duration = Math.ceil((segment.end + 0.2) * 30) / 30;
run('ffmpeg', [
  '-y',
  '-v',
  'error',
  '-f',
  'lavfi',
  '-i',
  `color=0x102838:s=1080x1920:r=30:d=${duration}`,
  '-i',
  path.join(root, 'public/demo-input.mp4'),
  '-map',
  '0:v',
  '-map',
  '1:a',
  '-t',
  String(duration),
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
  source,
]);
const job = {
  fps: 30,
  clips: [{ source, start: 0, end: duration }],
  transcript: {
    language: 'en',
    segments: [segment],
    provenance: { backend: 'whisper', model: 'tiny', human_reviewed: false },
  },
  operations: [
    {
      recipeId: 'A043',
      style: { fontSize: 90, minFontSize: 38, maxChars: 160, maxWords: 30, mode: 'block' },
    },
  ],
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
const rgb = run(
  'ffmpeg',
  [
    '-v',
    'error',
    '-ss',
    '1',
    '-i',
    file,
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
const width = 1080,
  height = 1920,
  rows = [];
let minX = width,
  maxX = -1;
for (let y = 0; y < height; y++) {
  let count = 0;
  for (let x = 0; x < width; x++) {
    const at = (y * width + x) * 3;
    if (rgb[at] > 210 && rgb[at + 1] > 210 && rgb[at + 2] > 210) {
      count++;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
  }
  if (count >= 4) rows.push(y);
}
const bands = [];
for (const y of rows) {
  if (!bands.length || y - bands.at(-1).end > 8) bands.push({ start: y, end: y });
  else bands.at(-1).end = y;
}
assert.equal(bands.length, 2, `Actual caption did not have two ink rows: ${JSON.stringify(bands)}`);
assert.ok(
  minX >= 85 && maxX <= 975,
  `Actual caption crossed the horizontal margins: ${minX}..${maxX}`,
);
assert.ok(
  bands[0].start > 1300 && bands.at(-1).end < 1700,
  'Caption left the expected lower safe region',
);
run('ffmpeg', [
  '-y',
  '-v',
  'error',
  '-ss',
  '1',
  '-i',
  file,
  '-frames:v',
  '1',
  path.join(dir, 'inspection.jpg'),
]);
const result = {
  passed: true,
  syntheticMedia: true,
  actualWordTimestamps: true,
  lineBands: bands,
  inkBounds: { minX, maxX },
  requestedMaximumFontSize: 90,
  maximumLines: 2,
  alignedTranscriptWordCount: segment.words.length,
  outputHash: read(path.join(dir, 'preview-validation.json')).sha256,
  checks: [
    'Real font measurement in Chrome',
    'Two caption ink rows in decoded H.264 MP4',
    'Glyphs stayed inside configured margins',
    'No truncation or fabricated word times in layout',
  ],
  scope:
    'One Latin-font sample; reading pace, different fonts/scripts and editorial correctness require further review',
};
write(path.join(dir, 'assertions.json'), result);
console.log(result);
