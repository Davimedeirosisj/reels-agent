// Publish technical metadata only. Never publish the private source, transcript,
// footage paths, sermon stills or editorial job through this report.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { root, read, write, fileDigest } from './engine.mjs';
import { captionsForTimeline } from '../src/editorial.mjs';
import { captionPages } from '../src/captions.mjs';
const folder = path.resolve(process.argv[2] || 'output/real-validation/render-v2');
const report = read(path.join(folder, 'preview-validation.json'));
const fidelity = read(path.join(folder, 'audio-fidelity.json'));
const job = read(path.join(folder, 'edit_decisions.json'));
const quality = read(path.join(folder, 'editorial_quality.json'));
const loudnessLog = path.join(folder, 'final-loudness.log');
const loudnessJson = fs.existsSync(loudnessLog)
  ? fs.readFileSync(loudnessLog, 'utf8').match(/\{\s*"input_i"[\s\S]*?\}/)?.[0]
  : null;
const loudness = loudnessJson ? JSON.parse(loudnessJson) : null;
const sourceFingerprint = crypto
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
const binding = fs
  .readFileSync(path.join(folder, 'review.html'), 'utf8')
  .match(/"rendererHash":"([a-f0-9]{64})"/)?.[1];
if (sourceFingerprint !== binding) throw new Error('Source changed since this render');
if (report.status !== 'passed' || !fidelity.passed)
  throw new Error('Validation must pass before archiving');
if (fileDigest(path.join(folder, 'preview.mp4')) !== report.sha256)
  throw new Error('Rendered MP4 no longer matches its validation hash');
const inspected = Object.values(read(path.join(folder, 'media_probe.json')));
const segments = job.transcript?.segments || [];
const pages = captionPages(
  captionsForTimeline(segments, job.clips, job.fps || 30),
  job.captionStyle,
);
const spokenText = segments
  .flatMap((s) => s.words || [])
  .map((w) => w.word || w.text)
  .join(' ');
const captionText = pages
  .flatMap((s) => s.words || [])
  .map((w) => w.word || w.text)
  .join(' ');
const result = {
  recordedAtUtc: new Date().toISOString(),
  scope: 'User-authorized real sermon preview; technical metadata only',
  sourceFingerprint,
  latestSourceValidatedByRender: true,
  mp4: {
    status: report.status,
    sha256: report.sha256,
    duration: report.actualDuration,
    expectedVideoDuration: report.expectedDuration,
    video: {
      codec: report.video.codec_name,
      width: report.video.width,
      height: report.video.height,
      fps: report.video.avg_frame_rate,
      frames: report.video.nb_frames,
      pixelFormat: report.video.pix_fmt,
      colorSpace: report.video.color_space,
    },
    audio: {
      codec: report.audio.codec_name,
      sampleRate: report.audio.sample_rate,
      channels: report.audio.channels,
      peakDb: report.peakDb,
      meanDb: report.meanDb,
      integratedLufs: loudness ? Number(loudness.input_i) : undefined,
      truePeakDbtp: loudness ? Number(loudness.input_tp) : undefined,
    },
    fullDecodePassed: true,
  },
  edit: {
    clipCount: job.clips.length,
    fullSourceRetainedInOrder:
      job.clips.length === 1 &&
      job.clips[0].start === 0 &&
      Math.abs(job.clips[0].end - Number(inspected[0].format.duration)) <= 1 / (job.fps || 30),
    addedMusic: Boolean(job.music),
    sfxCount: job.sfx?.length || 0,
    motionCount: job.motions?.length || 0,
    fit: job.theme?.fit || 'contain',
    protectedAreaConflictCount: quality.protectedAreaConflicts.length,
    captionReadingWarningCount: quality.captionReadingWarnings.length,
  },
  transcription: {
    backend: job.transcript?.provenance?.backend,
    model: job.transcript?.provenance?.model,
    humanReviewed: job.transcript?.provenance?.human_reviewed === true,
    agentOrthographicCorrectionCount:
      job.transcript?.provenance?.agentOrthographicCorrections?.length || 0,
    segmentCount: segments.length,
    wordCount: segments.reduce((n, s) => n + (s.words?.length || 0), 0),
    pointTimestampCount: segments.flatMap((s) => s.words || []).filter((w) => w.start === w.end)
      .length,
    pointTimestampHandling:
      'Text retained on adjacent caption pages; no estimated word duration or active highlight',
    allAlignedTranscriptWordsRetainedInCaptionPages: spokenText === captionText,
  },
  audioComparison: {
    passed: fidelity.passed,
    sampledWindows: fidelity.windows.length,
    windowSeconds: fidelity.windowSeconds,
    minimumCorrelation: fidelity.minimumCorrelation,
    maximumAbsoluteLagMs: fidelity.maximumAbsoluteLagMs,
    scope: fidelity.scope,
  },
  editorialApproval: false,
  limitations: [
    'Human listening and full transcript review remain required; ASR is a draft.',
    'Sampled waveform agreement does not certify full semantic/theological fidelity.',
    'Four source-frame person masks were inspected privately; lectern/glass/finger edges still require review. No full-video alpha applied.',
    'No premium equivalence claim for all external references; their assets and exact timing remain separately unverified.',
    'GoBold was unavailable; installed Arial was used. Source media, transcript and stills remain local.',
  ],
};
write(path.join(root, 'docs/validation/real-sermon-results.json'), result);
console.log('Archived technical aggregates only; editorial approval remains pending.');
