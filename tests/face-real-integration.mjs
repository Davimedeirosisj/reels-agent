// Explicit local authorized preparation only. Source footage and coordinates stay private.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { root, read, write, fileDigest } from '../tools/engine.mjs';
import { rendererFingerprint } from '../tools/fingerprint.mjs';
import { auditFaces } from '../tools/spatial_audit.mjs';
if (!process.argv[2])
  throw new Error('Usage: node tests/face-real-integration.mjs AUTHORIZED_PREPARED_JOB');
const jobFile = path.resolve(process.argv[2]),
  preparedDir = path.dirname(jobFile),
  job = read(jobFile);
if (!job.foregroundPreparation || job.foregroundPreparation.frames > 150)
  throw new Error('Use a validated short preparation, at most 150 frames');
const dir = path.join(root, 'output/face-regression');
fs.mkdirSync(dir, { recursive: true });
const reportFile = path.join(dir, 'real-sample.json');
const run = spawnSync(
  'python',
  [
    '-X',
    'utf8',
    path.join(root, 'tools/track_faces.py'),
    path.join(preparedDir, 'edited-source.mp4'),
    reportFile,
  ],
  { encoding: 'utf8', windowsHide: true, maxBuffer: 8e6 },
);
assert.equal(run.status, 0, run.stderr);
const faces = read(reportFile);
assert.equal(faces.frames, job.foregroundPreparation.frames);
assert.ok(faces.samplesWithFaces > 0);
assert.equal(faces.continuousFaceCoverageProven, false);
const area = faces.protectedAreas.find((a) => !a.uncertain);
assert.ok(area);
const testJob = structuredClone(job);
delete testJob.title;
testJob.motions = [
  {
    kind: 'title',
    text: 'TESTE',
    start: area.start,
    end: area.end,
    position: { x: area.x, y: area.y, width: area.width, height: area.height },
  },
];
const covered = auditFaces(testJob, faces, preparedDir);
assert.equal(covered.uniqueEventsWithPotentialConflicts, 1);
testJob.motions[0].position = { x: area.x, y: area.y - 40, width: 20, height: 20 };
const clear = auditFaces(testJob, faces, preparedDir);
assert.equal(clear.uniqueEventsWithPotentialConflicts, 0);
const stale = structuredClone(faces);
stale.sourceSha256 = 'stale';
assert.throws(() => auditFaces(testJob, stale, preparedDir), /não corresponde/);
const result = {
  passed: true,
  sourceFingerprint: rendererFingerprint(root),
  scope:
    'Authorized short real sample; model inference and rectangle collision detection only, not continuous face or raster approval',
  decodedFrames: faces.frames,
  sampledFrames: faces.sampleCount,
  samplesWithFaces: faces.samplesWithFaces,
  modelSha256: faces.modelSha256,
  sourceVideoSha256: faces.sourceSha256,
  actualFaceOverlapFlagged: covered.uniqueEventsWithPotentialConflicts === 1,
  separateRectangleNotFlagged: clear.uniqueEventsWithPotentialConflicts === 0,
  mismatchedVideoRejected: true,
  continuousFaceCoverageProven: false,
  trackerToolSha256: fileDigest(path.join(root, 'tools/track_faces.py')),
  auditToolSha256: fileDigest(path.join(root, 'tools/spatial_audit.mjs')),
};
write(path.join(dir, 'assertions.json'), result);
console.log(result);
