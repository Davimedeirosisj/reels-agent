import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePostprocessing } from '../src/postprocessing.mjs';
import { validateScene3d, sceneCameraAt } from '../src/scene3d.mjs';
import { mediaReferences, mapMedia } from '../src/media-layout.mjs';
test('3D finish is optional and explicit zero settings leave the original scene untouched', () => {
  for (const input of [
    undefined,
    false,
    {},
    { enabled: false, bloom: true },
    {
      bloom: { intensity: 0 },
      grain: { opacity: 0 },
      chromaticAberration: { offset: [0, 0] },
    },
  ])
    assert.equal(resolvePostprocessing(input), null);
  const config = { bloom: true, grain: { seed: 'provided', animate: false } };
  const before = JSON.stringify(config),
    resolved = resolvePostprocessing(config);
  assert.equal(resolved.grain.seed, 'provided');
  assert.equal(resolved.grain.animate, false);
  assert.ok(resolved.bloom.intensity > 0);
  assert.equal(resolved.chromaticAberration, null);
  assert.equal(JSON.stringify(config), before);
});
test('invalid finish parameters fail before a long GPU render', () => {
  for (const config of [
    true,
    { bloom: { intensity: -1 } },
    { bloom: { levels: 2.5 } },
    { grain: { seed: null } },
    { grain: { opacity: 0.5 } },
    { grain: { animate: 'yes' } },
    { chromaticAberration: { offset: [1, 0] } },
    { bloom: { toString: 1 } },
    { noise: true },
  ])
    assert.throws(() => resolvePostprocessing(config));
  assert.ok(
    validateScene3d({
      kind: 'light3d',
      evidence: 'test',
      scene: {
        nodes: [{ geometry: 'sphere', emissiveIntensity: -1 }],
      },
    }).length,
  );
});
test('orbital camera follows a circle with explicit target and seeks without history', () => {
  const scene = { orbit: { radius: 6, elevation: 1, angle: 0.2, speed: 0.1, target: [1, 2, 3] } };
  const at = sceneCameraAt(scene, 7);
  assert.ok(Math.abs(Math.hypot(at.position[0] - 1, at.position[2] - 3) - 6) < 1e-10);
  assert.equal(at.position[1], 3);
  sceneCameraAt(scene, 100);
  assert.deepEqual(sceneCameraAt(scene, 7), at);
  assert.notDeepEqual(sceneCameraAt(scene, 0), at);
  assert.ok(
    validateScene3d({
      kind: 'ui3d',
      panels: [{ label: 'Provided' }],
      evidence: 'test',
      scene: { ...scene, camera: [{ time: 0, position: [0, 0, 6] }] },
    }).some((x) => x.includes('sobreposição')),
  );
});
test('phone screen assets participate in media staging and approval binding', () => {
  const job = {
    clips: [{ source: 'video.mp4' }],
    motions: [
      {
        kind: 'ui3d',
        evidence: 'Provided screen',
        panels: [{ label: 'Example' }],
        scene: { phone: { asset: 'screen.png' } },
      },
    ],
  };
  assert.deepEqual(mediaReferences(job), ['video.mp4', 'screen.png']);
  const mapped = mapMedia(job, (value) => 'staged/' + value);
  assert.equal(mapped.motions[0].scene.phone.asset, 'staged/screen.png');
  assert.equal(job.motions[0].scene.phone.asset, 'screen.png');
  assert.deepEqual(validateScene3d(job.motions[0]), []);
  assert.ok(validateScene3d({ ...job.motions[0], scene: { phone: {} } }).length);
});
test('phone content rejects empty and non-text values before loading textures', () => {
  for (const phone of [
    { asset: '' },
    { asset: ' ' },
    { asset: 42, label: 'Provided' },
    { asset: 'screen.png', label: 42 },
    { label: false },
    { label: ' ' },
  ])
    assert.ok(
      validateScene3d({
        kind: 'ui3d',
        evidence: 'fixture',
        panels: [{ label: 'Panel' }],
        scene: { phone },
      }).some((x) => x.includes('Telefone')),
    );
});
