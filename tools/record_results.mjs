import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { root, read, write } from './engine.mjs';
const dir = path.join(root, 'docs', 'validation');
fs.mkdirSync(dir, { recursive: true });
const demo = read(path.join(root, 'output/demo/preview-validation.json'));
const showcase = read(path.join(root, 'output/showcase/validation.json'));
const regression = read(path.join(root, 'output/regression/assertions.json'));
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
const files = { demo: 'output/demo/preview.mp4', showcase: 'output/showcase/motions.mp4' };
for (const [name, file] of Object.entries(files)) {
  const expected = name === 'demo' ? demo : showcase;
  const actual = crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(root, file)))
    .digest('hex');
  if (actual !== expected.sha256) throw new Error(`Hash divergiu: ${name}`);
}
write(path.join(dir, 'render-results.json'), {
  clientDate: '2026-11-02',
  scope: 'Synthetic fixtures only',
  demo: brief(demo),
  showcase: brief(showcase),
  regression,
  latestSourceValidatedByRender: false,
  pending:
    'Renderer was changed after these renders: caption pagination/ducking, layout fixes, explicit BT.709 + PNG and stricter pixel checks. Rerender required. Escalation approval review failed due to account usage limit.',
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
  ['demo', 'edit-contact-sheet.jpg'],
])
  fs.copyFileSync(path.join(root, 'output', folder, 'contact-sheet.jpg'), path.join(dir, target));
console.log('Evidence archived with hashes; current source render remains unverified.');
