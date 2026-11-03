import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { root, read, write, fileDigest } from './engine.mjs';
const dir = path.join(root, 'docs', 'validation');
fs.mkdirSync(dir, { recursive: true });
const demoFolder = process.argv[2] || 'output/demo';
const demo = read(path.join(root, demoFolder, 'preview-validation.json'));
const showcase = read(path.join(root, 'output/showcase/validation.json'));
const regression = read(path.join(root, 'output/regression/assertions.json'));
const composition = read(path.join(root, 'output/composition-regression/assertions.json'));
const currentFingerprint = crypto
  .createHash('sha256')
  .update(
    Buffer.concat(
      fs
        .readdirSync(path.join(root, 'src'))
        .sort()
        .map((s) => fs.readFileSync(path.join(root, 'src', s))),
    ),
  )
  .digest('hex');
const renderFingerprint = fs
  .readFileSync(path.join(root, demoFolder, 'review.html'), 'utf8')
  .match(/"rendererHash":"([a-f0-9]{64})"/)?.[1];
if (currentFingerprint !== renderFingerprint)
  throw new Error('Source changed after preview; rerender before publishing current evidence');
const brief = (r) => ({
  statusAtTimeOfRender: r.status,
  sha256: r.sha256,
  duration: r.actualDuration,
  video: {
    codec: r.video.codec_name,
    width: r.video.width,
    height: r.video.height,
    pixelFormat: r.video.pix_fmt,
    frames: r.video.nb_frames,
  },
  audio: {
    codec: r.audio.codec_name,
    sampleRate: r.audio.sample_rate,
    channels: r.audio.channels,
    peakDb: r.peakDb,
    meanDb: r.meanDb,
  },
});
const files = {
  demo: path.join(demoFolder, 'preview.mp4'),
  showcase: 'output/showcase/motions.mp4',
};
for (const [name, file] of Object.entries(files)) {
  const expected = name === 'demo' ? demo : showcase;
  const actual = fileDigest(path.join(root, file));
  if (actual !== expected.sha256) throw new Error(`Hash divergiu: ${name}`);
}
write(path.join(dir, 'render-results.json'), {
  clientDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
    new Date(),
  ),
  recordedAtUtc: new Date().toISOString(),
  scope: 'Synthetic fixtures only',
  demo: brief(demo),
  showcase: brief(showcase),
  regression,
  composition,
  sourceFingerprint: currentFingerprint,
  latestSourceValidatedByRender: true,
  pending:
    'Full individual recipe/reference coverage and human editorial approval remain incomplete. This file records synthetic fixtures; real-sermon-results.json records real preview tests separately.',
  asr: {
    backend: 'whisper',
    model: 'tiny',
    language: 'en',
    segments: 3,
    words: 30,
    observedError: 'Reels transcribed as reals',
    humanReviewed: false,
  },
});
fs.copyFileSync(
  path.join(root, 'output/showcase/components.json'),
  path.join(dir, 'component-intervals.json'),
);
for (const [folder, target] of [
  ['showcase', 'motion-contact-sheet.jpg'],
  [path.relative(path.join(root, 'output'), path.join(root, demoFolder)), 'edit-contact-sheet.jpg'],
])
  fs.copyFileSync(path.join(root, 'output', folder, 'contact-sheet.jpg'), path.join(dir, target));
console.log(
  'Evidence archived with matching preview source fingerprint and MP4 hashes. Full editorial coverage remains open.',
);
