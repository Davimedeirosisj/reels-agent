import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recipes, recipeEvent } from '../src/recipes.mjs';
import { hash } from '../tools/engine.mjs';
test('100 authored prompts retain distinct records and explicitly expose missing behavior', () => {
  assert.equal(recipes.length, 100);
  assert.equal(new Set(recipes.map((r) => r.id)).size, 100);
  assert.equal(recipes[3].behavior, 'requires-alpha');
  assert.equal(recipes[96].behavior, 'per-clip-color-matrix-and-measured-neutral-patch-match');
  assert.throws(() => recipeEvent('A097', {}), /etapa/);
});
test('approval fingerprint changes when editorial content or styling is edited', () => {
  const a = { clips: [{ source: 'a', start: 0, end: 1 }] };
  assert.equal(hash(a), hash({ ...a, approval: {} }));
  assert.notEqual(hash(a), hash({ ...a, clips: [{ source: 'a', start: 0, end: 2 }] }));
});
