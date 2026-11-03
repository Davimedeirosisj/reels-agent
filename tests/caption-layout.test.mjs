import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutCaptionTokens } from '../src/caption-layout.mjs';
const tokens = 'Preserve a mensagem e todo o seu contexto'
  .split(' ')
  .map((word, i) => ({ word, from: i * 10, to: i * 10 + 10 }));
const measure = (text, size) => text.length * size * 0.5;
test('balanced lines preserve tokens and timestamps while fitting measured width', () => {
  const result = layoutCaptionTokens(tokens, measure, {
    width: 350,
    fontSize: 40,
    minFontSize: 20,
    maxLines: 2,
  });
  assert.equal(result.rows.length, 2);
  assert.equal(result.overflow, false);
  assert.deepEqual(result.rows.flat(), tokens);
  for (const row of result.rows)
    assert.ok(measure(row.map((t) => t.word).join(' '), result.fontSize) + row.length * 6 <= 350);
});
test('single-line captions remain single-line and overflow cannot silently truncate words', () => {
  assert.equal(layoutCaptionTokens(tokens, measure, { width: 2000 }).rows.length, 1);
  const result = layoutCaptionTokens([{ word: 'long'.repeat(200) }], measure, {
    width: 100,
    maxLines: 2,
    fontSize: 40,
    minFontSize: 30,
  });
  assert.equal(result.overflow, true);
  assert.equal(result.rows[0][0].word.length, 800);
});
