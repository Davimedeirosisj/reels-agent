import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cameraAt, transitionAt } from '../src/camera.mjs';
import { scheduledMedia, panelRects, mediaReferences, mapMedia } from '../src/media-layout.mjs';
test('camera paths interpolate position, zoom, rotation and stop at last key', () => {
  const keys = [
    { time: 0, scale: 1, x: 20, rotate: 0 },
    { time: 2, scale: 1.2, x: 80, rotate: 4 },
  ];
  assert.deepEqual(cameraAt(keys, 1), { scale: 1.1, x: 50, y: 50, rotate: 2 });
  assert.equal(cameraAt(keys, 7).scale, 1.2);
});
test('whip switches around the existing cut and leaves audio timing unchanged', () => {
  const e = [{ kind: 'whip', start: 1, end: 2, cut: 1.5 }];
  assert.equal(transitionAt(0, e, 30).x, 0);
  assert.ok(transitionAt(44, e, 30).x > 1000);
  assert.equal(transitionAt(45, e, 30).x, -1080);
  assert.equal(transitionAt(60, e, 30).x, 0);
});
test('media sequence uses exact local time and retains deliberate gaps', () => {
  const a = [
    { asset: 'first', start: 0, end: 1 },
    { asset: 'second', start: 2, end: 4 },
  ];
  assert.equal(scheduledMedia(a, 1.5), null);
  assert.equal(scheduledMedia(a, 2.5).localTime, 0.5);
});
test('split screens fit their box without overlap', () => {
  const p = panelRects(3, { x: 85, y: 200, width: 880, height: 500 });
  assert.equal(p[0].x, 85);
  assert.ok(p[1].x >= p[0].x + p[0].width);
  assert.ok(Math.abs(p[2].x + p[2].width - 965) < 1e-9);
  assert.throws(() => panelRects(0));
});
test('all nested assets participate in staging without modifying original job', () => {
  const job = {
    clips: [{ source: 'speech.mp4' }],
    transcript: { segments: [{ source: 'speech.mp4' }] },
    motions: [
      { kind: 'split-screen', panels: [{ asset: 'photo.png' }] },
      { kind: 'image-sequence', items: [{ asset: 'clip.mp4' }] },
      { kind: 'depth-scene', layers: [{ asset: 'alpha.webm' }] },
    ],
  };
  assert.equal(mediaReferences(job).length, 4);
  const mapped = mapMedia(job, (s) => 'staged/' + s);
  assert.equal(mapped.motions[2].layers[0].asset, 'staged/alpha.webm');
  assert.equal(mapped.transcript.segments[0].source, 'staged/speech.mp4');
  assert.equal(job.clips[0].source, 'speech.mp4');
});
