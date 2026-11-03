import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captionPages, musicGain } from '../src/captions.mjs';
const words = [
  { word: 'Preserve', from: 0, to: 8 },
  { word: 'o', from: 8, to: 12 },
  { word: 'contexto.', from: 12, to: 30 },
  { word: 'Sempre.', from: 40, to: 60 },
];
test('caption pagination preserves all words and timestamps', () => {
  const pages = captionPages([{ text: 'Preserve o contexto. Sempre.', from: 0, to: 60, words }], {
    maxChars: 15,
  });
  assert.deepEqual(
    pages.flatMap((p) => p.words),
    words,
  );
  assert.equal(pages.at(-1).to, 60);
});
test('word captions and quiet gaps require real word timestamps', () => {
  assert.equal(captionPages([{ from: 0, to: 60, words }], { mode: 'word' }).length, 4);
  assert.equal(
    captionPages([{ from: 0, to: 60, text: 'Sem alinhamento por palavra' }], { mode: 'word' })
      .length,
    1,
  );
});
test('music ducks during speech and recovers smoothly in silence', () => {
  const speech = [{ from: 30, to: 60 }];
  assert.equal(musicGain(0, speech), 0.1);
  assert.ok(musicGain(25, speech) > 0.035 && musicGain(25, speech) < 0.1);
  assert.ok(Math.abs(musicGain(40, speech) - 0.035) < 1e-9);
  assert.equal(musicGain(80, speech), 0.1);
});
