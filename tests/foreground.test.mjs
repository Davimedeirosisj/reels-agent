import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sourceOnlyJob,
  foregroundGeometry,
  foregroundMatches,
  foregroundAvailable,
  foregroundActive,
} from '../src/foreground.mjs';
import { mapMedia } from '../src/media-layout.mjs';
const job = {
  clips: [
    {
      source: 'speech.mp4',
      start: 1,
      end: 4,
      camera: [
        { time: 0, scale: 1 },
        { time: 3, scale: 1.1 },
      ],
      color: { gain: [1, 0.95, 1] },
    },
  ],
  theme: { fit: 'cover', gradient: true },
  motions: [
    { kind: 'kinetic', start: 0, end: 2, layer: 'behind' },
    { kind: 'whip', start: 0.8, end: 1.2, cut: 1, blur: 10 },
  ],
  title: { text: 'Message' },
  captionStyle: { enabled: true },
  music: { source: 'music.wav' },
};
test('foreground source preparation keeps geometry and camera transitions while removing overlays', () => {
  const base = sourceOnlyJob(job);
  assert.equal(base.sourceOnly, true);
  assert.deepEqual(base.clips, job.clips);
  assert.deepEqual(
    base.motions.map((m) => m.kind),
    ['whip'],
  );
  assert.equal(base.theme.gradient, false);
  assert.equal(base.title, undefined);
  assert.equal(base.foregroundSrc, undefined);
  assert.equal(base.music, undefined);
});
test('stale geometry invalidates a prepared alpha while typography can change', () => {
  const prepared = {
    ...job,
    foregroundSrc: 'alpha.webm',
    foregroundPreparation: { geometry: foregroundGeometry(job) },
  };
  assert.equal(foregroundMatches(prepared), true);
  assert.equal(foregroundMatches({ ...prepared, title: { text: 'New title' } }), true);
  const changed = structuredClone(prepared);
  changed.clips[0].camera[1].scale = 1.3;
  assert.equal(foregroundMatches(changed), false);
  const staged = mapMedia(prepared, (s) => 'staged-' + s);
  assert.equal(foregroundMatches(staged), true);
});
test('behind graphics are suppressed during recorded foreground detection gaps', () => {
  const prepared = { missingRanges: [{ from: 10, to: 15 }] };
  assert.equal(foregroundAvailable(prepared, 9), true);
  assert.equal(foregroundAvailable(prepared, 10), false);
  assert.equal(foregroundAvailable(prepared, 15), true);
});
test('foreground is composited only on frames with an active behind graphic', () => {
  const prepared = {
    fps: 30,
    foregroundSrc: 'alpha.webm',
    motions: [
      { layer: 'behind', start: 1.01, end: 2.01 },
      { layer: 'front', start: 3, end: 4 },
    ],
    foregroundPreparation: { missingRanges: [{ from: 45, to: 48 }] },
  };
  assert.equal(foregroundActive(prepared, 29), false);
  assert.equal(foregroundActive(prepared, 30), true);
  assert.equal(foregroundActive(prepared, 45), false);
  assert.equal(foregroundActive(prepared, 48), true);
  assert.equal(foregroundActive(prepared, 60), false);
  assert.equal(foregroundActive(prepared, 100), false);
});
