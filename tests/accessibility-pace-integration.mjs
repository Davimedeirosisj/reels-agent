// Synthetic TTS/Whisper fixture. Native subtitle decoding and browser playback
// are checked separately from nominal contrast and actual encoded pixels.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { openBrowser } from '@remotion/renderer';
import { root, read, write, fileDigest } from '../tools/engine.mjs';
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
const dir = path.join(root, 'output/accessibility-pace-regression');
fs.mkdirSync(dir, { recursive: true });
const source = path.join(dir, 'source.mp4');
run('ffmpeg', [
  '-y',
  '-v',
  'error',
  '-f',
  'lavfi',
  '-i',
  'color=white:s=1080x1920:r=30:d=2.5',
  '-f',
  'lavfi',
  '-i',
  'color=0x08141f:s=1080x1920:r=30:d=2.5',
  '-i',
  path.join(root, 'public/demo-input.mp4'),
  '-filter_complex',
  '[0:v][1:v]concat=n=2:v=1:a=0[v]',
  '-map',
  '[v]',
  '-map',
  '2:a',
  '-t',
  '5',
  '-c:v',
  'libx264',
  '-preset',
  'veryfast',
  '-c:a',
  'copy',
  source,
]);
const job = {
  theme: { accent: '#ff00ff' },
  fps: 30,
  clips: [{ source, start: 0, end: 5 }],
  transcript: read(path.join(root, 'public/demo-transcript.json')),
  operations: [
    { recipeId: 'A050', style: { maxWords: 6, maxChars: 40 } },
    {
      recipeId: 'A096',
      pace: { mode: 'adjust', minStartGapSeconds: 0.6, maxConcurrent: 2, maxDelaySeconds: 0.8 },
    },
  ],
  motions: [
    { kind: 'flash', start: 3.6, end: 4.2, accent: '#ffffff' },
    { kind: 'flash', start: 3.7, end: 4.3, accent: '#ffffff', paceFlexible: true },
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
const resolved = read(path.join(dir, 'edit_decisions.json'));
assert.equal(resolved.motions[1].start, 4.2);
assert.equal(resolved.motions[1].end, 4.8);
const quality = read(path.join(dir, 'editorial_quality.json'));
assert.equal(quality.captionContrast.minimumContrast, 21);
assert.equal(quality.visualPace.adjustmentCount, 1);
const pixels = (time, filter = 'crop=890:450:85:1200') =>
  run(
    'ffmpeg',
    [
      '-v',
      'error',
      '-ss',
      String(time),
      '-i',
      path.join(dir, 'preview.mp4'),
      '-vf',
      filter,
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
const region = pixels(1),
  darkRegion = pixels(2.8);
const count = (buffer) => {
  let black = 0,
    magenta = 0;
  for (let i = 0; i < buffer.length; i += 3) {
    if (Math.max(buffer[i], buffer[i + 1], buffer[i + 2]) < 10) black++;
    if (buffer[i] > 150 && buffer[i + 2] > 150 && buffer[i + 1] < 100) magenta++;
  }
  return { black, magenta };
};
const whiteBackground = count(region),
  darkBackground = count(darkRegion);
assert.ok(whiteBackground.black > 4000, 'Readable backplate missing over white video');
assert.ok(darkBackground.black > 3000, 'Readable backplate missing over dark video');
assert.equal(whiteBackground.magenta, 0);
const peak = Array.from(pixels(4.5, 'crop=10:10:500:500')).reduce((a, b) => a + b, 0) / 300;
const after = Array.from(pixels(4.9, 'crop=10:10:500:500')).reduce((a, b) => a + b, 0) / 300;
assert.ok(peak > after + 10, 'Delayed decorative flash did not appear in encoded video');
run('ffmpeg', [
  '-y',
  '-v',
  'error',
  '-f',
  'srt',
  '-i',
  path.join(dir, 'captions.srt'),
  '-f',
  'webvtt',
  path.join(dir, 'roundtrip.vtt'),
]);
assert.ok(fs.readFileSync(path.join(dir, 'roundtrip.vtt'), 'utf8').includes('demonstration'));
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
const html = fs.readFileSync(path.join(dir, 'review.html'));
const media = fs.readFileSync(path.join(dir, 'preview.mp4'));
const server = http.createServer((req, res) => {
  const isVideo = req.url === '/preview.mp4';
  res.setHeader('Content-Type', isVideo ? 'video/mp4' : 'text/html; charset=utf-8');
  res.end(isVideo ? media : html);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser, track;
try {
  browser = await openBrowser('chrome', {
    browserExecutable: process.env.REELS_BROWSER,
    logLevel: 'error',
  });
  const page = await browser.newPage({
    context: () => null,
    logLevel: 'error',
    indent: false,
    pageIndex: 0,
    onBrowserLog: null,
    onLog: () => {},
  });
  await page.goto({ url: `http://127.0.0.1:${server.address().port}/`, timeout: 30000 });
  track = await page.evaluate(async () => {
    const element = document.getElementById('caption-track');
    element.track.mode = 'hidden';
    for (let i = 0; i < 100 && element.readyState !== 2; i++)
      await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      loaded: element.readyState === 2,
      cues: element.track.cues?.length || 0,
      firstStart: element.track.cues?.[0]?.startTime,
      inlineBlob: element.src.startsWith('blob:'),
    };
  });
  assert.ok(
    track.loaded && track.inlineBlob && track.cues > 0,
    'Native browser captions failed to load',
  );
  assert.equal(track.firstStart, 0);
} finally {
  if (browser) await browser.close({ silent: true });
  await new Promise((resolve) => server.close(resolve));
}
const result = {
  passed: true,
  synthetic: true,
  sourceFingerprint: rendererFingerprint(root),
  outputHash: fileDigest(path.join(dir, 'preview.mp4')),
  frames: 150,
  nominalWorstCaseContrast: quality.captionContrast.minimumContrast,
  whiteBackground,
  darkBackground,
  adjustedDecorationStart: resolved.motions[1].start,
  flashLumaSamples: { during: peak, after },
  nativeSrtDecodePassed: true,
  nativeBrowserTrack: track,
  srtSha256: fileDigest(path.join(dir, 'captions.srt')),
  vttSha256: fileDigest(path.join(dir, 'captions.vtt')),
  audioComparison: {
    passed: audio.passed,
    minimumCorrelation: audio.minimumCorrelation,
    maximumAbsoluteLagMs: audio.maximumAbsoluteLagMs,
  },
  scope:
    'Caption legibility/sidecar/visual pace fixture; not complete accessibility certification, sound description or editorial approval',
};
write(path.join(dir, 'assertions.json'), result);
console.log(result);
