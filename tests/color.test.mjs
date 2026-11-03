import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDENTITY_COLOR, colorMatrix, svgColorMatrix, validateColor } from '../src/color.mjs';
import { applyOperations } from '../src/operations.mjs';
test('color intensity interpolates a real RGB matrix while preserving alpha', () => {
  assert.deepEqual(colorMatrix(), IDENTITY_COLOR);
  const m = colorMatrix({ gain: [2, 1, 0.5], offset: [0.1, 0, 0], intensity: 0.5 });
  assert.deepEqual(m, [1.5, 0, 0, 0.05, 0, 1, 0, 0, 0, 0, 0.75, 0]);
  assert.deepEqual(
    svgColorMatrix({ gain: [2, 1, 0.5] })
      .split(' ')
      .slice(-5)
      .map(Number),
    [0, 0, 0, 1, 0],
  );
});
test('invalid color matrices cannot silently render as a different grade', () => {
  for (const grade of [
    { gain: [1, NaN, 1] },
    { matrix: [1] },
    { intensity: 2 },
    { space: 'unknown' },
    { matrix: IDENTITY_COLOR, gain: [1, 1, 1] },
  ])
    assert.ok(validateColor(grade).length);
});
test('color operations are optional and independent per clip', () => {
  const clips = [
    { source: 'a', start: 0, end: 1 },
    { source: 'b', start: 0, end: 1 },
  ];
  const result = applyOperations({
    clips,
    operations: [{ recipeId: 'A097', clip: 1, color: { gain: [0.9, 1, 1.1] } }],
  });
  assert.equal(result.clips[0].color, undefined);
  assert.equal(clips[1].color, undefined);
  assert.deepEqual(result.clips[1].color.gain, [0.9, 1, 1.1]);
  assert.deepEqual(applyOperations(result), result);
  assert.throws(() => applyOperations({ clips, operations: [{ recipeId: 'A097' }] }), /amostras/);
});
