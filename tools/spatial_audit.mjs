import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { root, read, write, fileDigest, hash } from './engine.mjs';
import { rendererFingerprint } from './fingerprint.mjs';
import { foregroundGeometry, foregroundMatches } from '../src/foreground.mjs';
import { validateJob } from '../src/editorial.mjs';
import { qualityReview } from '../src/quality.mjs';
import { applyOperations } from '../src/operations.mjs';
import { assertOutputsDistinct } from './output_guard.mjs';
import { mediaReferences } from '../src/media-layout.mjs';
export function auditFaces(input, faces, preparedDirectory) {
  const job = applyOperations(input),
    prepared = job.foregroundPreparation;
  if (
    !prepared ||
    !foregroundMatches(job) ||
    prepared.rendererFingerprint !== rendererFingerprint(root)
  )
    throw new Error('Use um job preparado com a geometria e versão atuais');
  const manifest = read(path.join(preparedDirectory, 'source-manifest.json'));
  const baseKey = crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        geometry: foregroundGeometry(job),
        sourceBinding: prepared.sourceBinding,
        renderer: prepared.rendererFingerprint,
      }),
    )
    .digest('hex');
  const base = path.join(preparedDirectory, 'edited-source.mp4');
  if (
    baseKey !== manifest.baseKey ||
    fileDigest(base) !== manifest.baseSha256 ||
    faces.sourceSha256 !== manifest.baseSha256
  )
    throw new Error('Localização facial não corresponde às tomadas editadas atuais');
  for (const item of prepared.sourceBinding) {
    const source = path.isAbsolute(item.source)
      ? item.source
      : path.join(root, 'public', item.source.replace(/^\//, ''));
    if (fileDigest(source) !== item.sha256)
      throw new Error('Mídia original mudou após a localização');
  }
  if (
    faces.frames !== validateJob(job).durationInFrames ||
    faces.width !== (job.width || 1080) ||
    faces.height !== (job.height || 1920) ||
    Math.abs(faces.fps - (job.fps || 30)) > 0.001
  )
    throw new Error('Dimensões/frames da localização facial não correspondem ao job');
  const motions = [...(job.motions || [])];
  if (job.title)
    motions.push({
      ...job.title,
      kind: 'title',
      start: job.title.start || 0,
      end: (job.title.start || 0) + (job.title.duration || 3),
      position: job.title.position || { x: 85, y: 190, width: 880, height: 400 },
    });
  const regions = faces.protectedAreas.map((zone, index) => ({ ...zone, label: String(index) }));
  const reviewed = qualityReview({ ...job, motions, protectedAreas: regions });
  const conflicts = reviewed.protectedAreaConflicts.map((item) => ({
    ...item,
    area: 'detected-face-region-union',
    regionIndex: Number(item.area),
    start: Math.max(motions[item.motion].start, regions[Number(item.area)].start),
    end: Math.min(motions[item.motion].end, regions[Number(item.area)].end),
    eventType: item.motion === (job.motions || []).length ? 'opening-title' : 'motion',
    layer: motions[item.motion]?.layer || 'front',
    requiresMaskEdgeReview: motions[item.motion]?.layer === 'behind',
  }));
  return {
    jobHash: hash(job),
    sourceFingerprint: rendererFingerprint(root),
    sourceVideoSha256: manifest.baseSha256,
    faceModelSha256: faces.modelSha256,
    decodedFrames: faces.frames,
    sampledFrames: faces.sampleCount,
    samplesWithFaces: faces.samplesWithFaces,
    samplesTouchingFrameEdge: faces.samplesTouchingFrameEdge,
    missingDetectionIntervalCount: faces.unknownIntervals.length,
    missingDetectionIntervals: faces.unknownIntervals.map((range) => ({
      ...range,
      start: range.from / faces.fps,
      end: range.to / faces.fps,
    })),
    potentialFaceConflicts: conflicts,
    uniqueEventsWithPotentialConflicts: new Set(conflicts.map((c) => c.motion)).size,
    continuousFaceCoverageProven: false,
    manualReviewRequired: true,
    scope:
      'Measured sampled face regions versus declared event rectangles; no identity recognition or automatic framing approval',
    unassessed: [
      'Actual animated glyph/3D bounds',
      'Caption raster bounds',
      'Decorative light/particle layers',
      'Hands, microphone and Bible',
    ],
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [jobFile, faceFile, output] = process.argv.slice(2);
  if (!jobFile || !faceFile || !output)
    throw new Error('Uso: node tools/spatial_audit.mjs JOB_PREPARADO FACES_JSON AUDIT_JSON');
  // This is an analysis report; it never edits the job or writes a review receipt.
  const input = read(jobFile),
    preparedDirectory = path.dirname(path.resolve(jobFile));
  const inputs = [
    jobFile,
    faceFile,
    path.join(preparedDirectory, 'edited-source.mp4'),
    path.join(preparedDirectory, 'source-manifest.json'),
    ...mediaReferences(input).map((source) =>
      path.isAbsolute(source) ? source : path.join(root, 'public', source.replace(/^\//, '')),
    ),
  ];
  assertOutputsDistinct([output], inputs);
  const result = auditFaces(input, read(faceFile), preparedDirectory);
  write(output, result);
  console.log({
    sampledFrames: result.sampledFrames,
    potentialFaceConflicts: result.uniqueEventsWithPotentialConflicts,
    manualReviewRequired: true,
  });
}
