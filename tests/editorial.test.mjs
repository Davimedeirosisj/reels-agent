import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timeline, captionsForTimeline, validateJob, proposeCuts } from '../src/editorial.mjs';
const clips = [
  { source: 'a.mp4', start: 1, end: 3 },
  { source: 'a.mp4', start: 6, end: 8 },
];
test('cuts remap video/audio/word timestamps', () => {
  assert.deepEqual(
    timeline(clips, 30).map((c) => [c.from, c.trimBefore, c.trimAfter]),
    [
      [0, 30, 90],
      [60, 180, 240],
    ],
  );
  const c = captionsForTimeline(
    [
      {
        start: 6.2,
        end: 7,
        text: 'Permaneça fiel.',
        words: [
          { start: 6.2, end: 6.6, word: 'Permaneça' },
          { start: 6.6, end: 7, word: 'fiel.' },
        ],
      },
    ],
    clips,
    30,
  );
  assert.equal(c[0].from, 66);
  assert.equal(c[0].words[1].to, 90);
});
test('rejects reordering, zero durations, charts without evidence and missing cutouts', () => {
  const b = {
    clips: [...clips].reverse(),
    motions: [{ start: 0, end: 1, kind: 'chart', values: [5] }],
  };
  assert.match(validateJob(b).errors.join(' '), /reordenação/);
  assert.match(validateJob(b).errors.join(' '), /evidência/);
  assert.ok(validateJob({ clips: [{ source: 'a', start: 1, end: 1 }] }).errors.length);
  assert.match(
    validateJob({
      clips,
      motions: [{ kind: 'kinetic', layer: 'behind', start: 0, end: 1 }],
    }).errors.join(' '),
    /alpha/,
  );
});
test('proposals keep sentence boundaries and chronological order', () => {
  const c = proposeCuts(
    {
      segments: [
        { start: 1, end: 2, text: 'Uma frase.' },
        { start: 7, end: 9, text: 'Outra frase.' },
      ],
    },
    'a',
  );
  assert.ok(Math.abs(c[0].start - 0.82) < 1e-9);
  assert.deepEqual(
    c.map((c) => c.end),
    [2.18, 9.18],
  );
  assert.ok(c[1].start > c[0].end);
});
test('partial subtitles are flagged for review', () => {
  assert.ok(
    validateJob({
      clips,
      transcript: { segments: [{ start: 0, end: 2, text: 'Uma frase completa.' }] },
    }).warnings.some((w) => w.includes('limites')),
  );
});
