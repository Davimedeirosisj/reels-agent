import test from 'node:test';
import assert from 'node:assert/strict';
import { houseState, graphicWindowState } from '../src/house-motion.mjs';
import { validateScene3d } from '../src/scene3d.mjs';
test('house motion uses seconds and is deterministic across frame rates', () => {
  for (const t of [0, 0.1, 0.4, 0.8, 1, 2, 3])
    for (const mode of ['separate', 'reunite']) {
      assert.deepEqual(houseState(t * 30, 30, mode), houseState(t * 60, 60, mode));
      const s = houseState(t * 60, 60, mode);
      assert.ok(s.separated >= 0 && s.separated <= 1);
      assert.ok(s.roofOpacity >= 0 && s.roofOpacity <= 1);
    }
  assert.equal(houseState(180, 60, 'separate').separated, 1);
  assert.equal(houseState(180, 60, 'reunite').separated, 0);
});
test('portrait window returns to unmodified source outside the insert', () => {
  const windows = [{ start: 2, end: 5, scale: 0.51, y: -365, transitionSeconds: 0.3 }];
  assert.deepEqual(graphicWindowState(windows, 0, 60), { progress: 0, scale: 1, y: 0 });
  assert.equal(graphicWindowState(windows, 180, 60).scale, 0.51);
  assert.deepEqual(graphicWindowState(windows, 360, 60), { progress: 0, scale: 1, y: 0 });
});
test('house procedural entry requires explicit house design and evidence', () => {
  const good = {
    kind: 'product3d',
    design: 'casa-hotel',
    scene: { product: 'house' },
    evidence: 'Original geometry for a spoken metaphor',
  };
  assert.deepEqual(validateScene3d(good), []);
  assert.ok(validateScene3d({ ...good, design: 'unknown' }).length);
  assert.ok(validateScene3d({ ...good, evidence: undefined }).length);
});
