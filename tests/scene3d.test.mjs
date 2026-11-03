import { test } from 'node:test';
import assert from 'node:assert/strict';
import { camera3dAt, inspectGlb, validateScene3d } from '../src/scene3d.mjs';
test('3D camera is seekable and interpolates position, target and field of view', () => {
  const keys = [
    { time: 0, position: [2, 0, 6], target: [0, 0, 0], fov: 40 },
    { time: 2, position: [-2, 2, 4], target: [0, 1, 0], fov: 50 },
  ];
  const middle = camera3dAt(keys, 1);
  assert.deepEqual(middle, { position: [0, 1, 5], target: [0, 0.5, 0], fov: 45 });
  camera3dAt(keys, 2);
  assert.deepEqual(camera3dAt(keys, 1), middle);
  assert.equal(camera3dAt(keys, 10).fov, 50);
});
const glb = (json) => {
  const text = Buffer.from(
    JSON.stringify(json).padEnd(Math.ceil(JSON.stringify(json).length / 4) * 4, ' '),
  );
  const header = Buffer.alloc(20);
  header.write('glTF');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + text.length, 8);
  header.writeUInt32LE(text.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  return Buffer.concat([header, text]);
};
test('GLB inspection rejects external resources and missing decoders before render', () => {
  assert.equal(inspectGlb(glb({ asset: { version: '2.0' }, meshes: [{}] })).selfContained, true);
  assert.throws(
    () => inspectGlb(glb({ images: [{ uri: 'https://example.com/private.png' }] })),
    /URLs/,
  );
  assert.throws(
    () => inspectGlb(glb({ extensionsRequired: ['KHR_draco_mesh_compression'] })),
    /decodificador/,
  );
});
test('3D scene must carry explicit data and contextual evidence', () => {
  assert.ok(validateScene3d({ kind: 'product3d' }).length);
  assert.deepEqual(
    validateScene3d({
      kind: 'product3d',
      scene: { product: 'book' },
      evidence: 'Authored book illustration',
    }),
    [],
  );
  assert.ok(validateScene3d({ kind: 'ui3d', panels: [{}], evidence: 'fixture' }).length);
});
