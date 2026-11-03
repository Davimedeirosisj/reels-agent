import fs from 'node:fs';
import path from 'node:path';
import { rendererFingerprint, FINGERPRINT_SCHEME } from './fingerprint.mjs';
import { root, read, write, fileDigest } from './engine.mjs';
const dir = path.join(root, 'docs', 'validation');
fs.mkdirSync(dir, { recursive: true });
const demoFolder = process.argv[2] || 'output/demo';
const demo = read(path.join(root, demoFolder, 'preview-validation.json'));
const showcase = read(path.join(root, 'output/showcase/validation.json'));
const regression = read(path.join(root, 'output/regression/assertions.json'));
const composition = read(path.join(root, 'output/composition-regression/assertions.json'));
const currentFingerprint = rendererFingerprint(root);
const currentBinding = (folder) => {
  const html = fs.readFileSync(path.join(root, folder, 'review.html'), 'utf8');
  const payload = html.match(/,binding=(\{[^\n;]*\}),keys=/)?.[1];
  if (!payload) throw new Error('Current review binding not found: ' + folder);
  return JSON.parse(payload);
};
const renderFingerprint = currentBinding(demoFolder).rendererHash;
if (currentFingerprint !== renderFingerprint)
  throw new Error('Source changed after preview; rerender before publishing current evidence');
if (showcase.sourceFingerprint !== currentFingerprint)
  throw new Error('Gallery source fingerprint is missing or stale');
const additional = {};
const correction = read(path.join(root, 'output/transcript-correction-regression/assertions.json'));
if (
  !correction.passed ||
  correction.correctionToolSha256 !==
    fileDigest(path.join(root, 'tools/transcript_corrections.mjs')) ||
  correction.createJobToolSha256 !== fileDigest(path.join(root, 'tools/create_job.mjs'))
)
  throw new Error('Transcript correction evidence is stale');
additional.transcriptCorrection = correction;
for (const [assertions, folder] of [
  [regression, 'regression'],
  [composition, 'composition-regression'],
]) {
  if (
    !assertions.passed ||
    assertions.sourceFingerprint !== currentFingerprint ||
    currentBinding('output/' + folder).rendererHash !== currentFingerprint ||
    fileDigest(path.join(root, 'output', folder, 'preview.mp4')) !== assertions.outputHash
  )
    throw new Error('Core cut/composition evidence is stale: ' + folder);
}
for (const [name, folder] of [
  ['foreground', 'foreground-real-regression'],
  ['foregroundCache', 'foreground-cache-regression'],
  ['foregroundTimeline', 'foreground-timeline-regression'],
]) {
  const assertions = read(path.join(root, 'output', folder, 'assertions.json'));
  if (!assertions.passed || assertions.sourceFingerprint !== currentFingerprint)
    throw new Error('Foreground evidence is stale: ' + name);
  if (
    name === 'foreground' &&
    fileDigest(path.join(root, 'output', folder, 'behind/preview.mp4')) !== assertions.previewSha256
  )
    throw new Error('Foreground preview changed after comparison');
  if (
    name === 'foregroundTimeline' &&
    fileDigest(path.join(root, 'output', folder, 'preview.mp4')) !== assertions.previewSha256
  )
    throw new Error('Foreground timeline preview changed after comparison');
  additional[name] = assertions;
}
for (const [name, folder] of [
  ['color', 'color-regression'],
  ['captionLayout', 'caption-layout-regression'],
  ['three', 'scene3d-regression'],
]) {
  const place = path.join('output', folder),
    assertions = read(path.join(root, place, 'assertions.json'));
  if (
    !assertions.passed ||
    currentBinding(place).rendererHash !== currentFingerprint ||
    fileDigest(path.join(root, place, 'preview.mp4')) !== assertions.outputHash
  )
    throw new Error('Additional render evidence mismatched: ' + name);
  additional[name] = assertions;
}
const review = read(path.join(root, 'output/review-regression/assertions.json'));
if (!review.passed || review.sourceFingerprint !== currentFingerprint)
  throw new Error('Review browser test is stale');
const approval = read(path.join(root, 'output/approval-regression/assertions.json'));
if (
  !approval.passed ||
  approval.sourceFingerprint !== currentFingerprint ||
  fileDigest(path.join(root, 'output/approval-regression/final.mp4')) !== approval.finalSha256
)
  throw new Error('Final export regression is stale');
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
  scope:
    'Synthetic editing fixtures plus authorized real-video technical foreground samples; aggregates only',
  demo: brief(demo),
  showcase: brief(showcase),
  regression,
  composition,
  ...additional,
  review,
  approval,
  sourceFingerprint: currentFingerprint,
  fingerprintScheme: FINGERPRINT_SCHEME,
  latestSourceValidatedByRender: true,
  pending:
    'Full individual recipe/reference coverage and human editorial approval remain incomplete. This file records synthetic fixtures and technical foreground samples; real-sermon-results.json records the full real preview separately.',
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
