// Real regression: verify the removed green shot/tone do not leak into output.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { root, write } from '../tools/engine.mjs';
const cmd = (p, a, binary = false) => {
  const r = spawnSync(p, a, {
    encoding: binary ? null : 'utf8',
    maxBuffer: 32e6,
    windowsHide: true,
  });
  if (r.status !== 0) throw new Error(String(r.stderr));
  return r.stdout;
};
const dir = path.join(root, 'output', 'regression');
fs.mkdirSync(dir, { recursive: true });
const source = path.join(dir, 'source.mp4');
cmd('ffmpeg', [
  '-y',
  '-v',
  'error',
  '-f',
  'lavfi',
  '-i',
  'color=red:s=360x640:r=30:d=1',
  '-f',
  'lavfi',
  '-i',
  'color=green:s=360x640:r=30:d=1',
  '-f',
  'lavfi',
  '-i',
  'color=blue:s=360x640:r=30:d=1',
  '-f',
  'lavfi',
  '-i',
  'sine=frequency=440:duration=1',
  '-f',
  'lavfi',
  '-i',
  'sine=frequency=660:duration=1',
  '-f',
  'lavfi',
  '-i',
  'sine=frequency=880:duration=1',
  '-filter_complex',
  '[0:v][3:a][1:v][4:a][2:v][5:a]concat=n=3:v=1:a=1[v][a]',
  '-map',
  '[v]',
  '-map',
  '[a]',
  '-c:v',
  'libx264',
  '-c:a',
  'aac',
  source,
]);
const job = {
  clips: [
    { source, start: 0, end: 1 },
    { source, start: 2, end: 3 },
  ],
  theme: { fit: 'cover' },
  captionStyle: { enabled: false },
  audio: { normalize: false },
};
const jobFile = path.join(dir, 'job.json');
write(jobFile, job);
cmd(process.execPath, [path.join(root, 'tools/engine.mjs'), 'preview', jobFile, dir]);
const preview = path.join(dir, 'preview.mp4');
const colors = [0.3, 1.3].map((time) => [
  ...cmd(
    'ffmpeg',
    [
      '-v',
      'error',
      '-ss',
      String(time),
      '-i',
      preview,
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
assert.ok(
  colors[0][0] > 200 && colors[0][1] < 40 && colors[0][2] < 40,
  `First cut not red: ${colors[0]}`,
);
assert.ok(
  colors[1][2] > 200 && colors[1][0] < 40 && colors[1][1] < 40,
  `Second cut not blue: ${colors[1]}`,
);
const frequencies = [0.2, 1.2].map((t) => {
  const bytes = cmd(
    'ffmpeg',
    [
      '-v',
      'error',
      '-ss',
      String(t),
      '-t',
      '0.6',
      '-i',
      preview,
      '-ac',
      '1',
      '-ar',
      '44100',
      '-f',
      's16le',
      '-',
    ],
    true,
  );
  let changes = 0;
  for (let i = 2; i < bytes.length; i += 2)
    if (bytes.readInt16LE(i - 2) <= 0 && bytes.readInt16LE(i) > 0) changes++;
  return changes / 0.6;
});
assert.ok(Math.abs(frequencies[0] - 440) < 10, `First audio cut incorrect: ${frequencies[0]}`);
assert.ok(Math.abs(frequencies[1] - 880) < 10, `Second audio cut incorrect: ${frequencies[1]}`);
write(path.join(dir, 'assertions.json'), {
  passed: true,
  colors,
  frequencies,
  removedSourceInterval: [1, 2],
  checks: ['Red shot then blue shot', '440 Hz then 880 Hz', 'Green shot and 660 Hz removed'],
  synthetic: true,
});
console.log({ colors, frequencies, passed: true });
