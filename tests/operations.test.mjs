import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyOperations } from '../src/operations.mjs';
import { qualityReview, contrastRatio } from '../src/quality.mjs';
const base = {
  clips: [{ source: 'v', start: 0, end: 5 }],
  transcript: { segments: [] },
  motions: [],
};
test('prompt operations configure captions/camera/audio instead of fake overlays', () => {
  const result = applyOperations({
    ...base,
    operations: [{ recipeId: 'A041' }, { recipeId: 'A086', scale: 1.12 }, { recipeId: 'A092' }],
  });
  assert.equal(result.captionStyle.mode, 'word');
  assert.equal(result.clips[0].camera[1].scale, 1.12);
  assert.equal(result.audio.normalize, true);
  assert.equal(result.motions.length, 0);
  assert.deepEqual(applyOperations(result), result);
});
test('recipes can be mixed without sharing one global style', () => {
  const r = applyOperations({
    ...base,
    motions: [{ recipeId: 'A008', start: 0, end: 1, text: 'Mensagem' }],
    operations: [{ recipeId: 'A064', start: 2, end: 4, text: 'Pregador' }],
  });
  assert.deepEqual(
    r.motions.map((m) => m.kind),
    ['tracking', 'lower-third'],
  );
});
test('safe-area review respects time and subject geometry', () => {
  const q = qualityReview({
    ...base,
    motions: [
      { start: 1, end: 2, kind: 'title', position: { x: 100, y: 200, width: 300, height: 100 } },
      { start: 3, end: 4, kind: 'title', position: { x: 100, y: 200, width: 300, height: 100 } },
    ],
    protectedAreas: [
      { x: 120, y: 220, width: 100, height: 100, start: 0, end: 2.5, label: 'rosto' },
    ],
  });
  assert.equal(q.protectedAreaConflicts.length, 1);
  assert.equal(q.protectedAreaConflicts[0].motion, 0);
});
test('contrast and reading-rate checks do not imply editorial approval', () => {
  assert.equal(contrastRatio('#ffffff', '#000000'), 21);
  const q = qualityReview({
    ...base,
    transcript: { segments: [{ start: 0, end: 0.2, text: 'Muitas palavras neste instante.' }] },
  });
  assert.equal(q.captionReadingWarnings.length, 1);
  assert.equal(q.scope.includes('permanece'), true);
});
