import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captionPages, musicGain } from '../src/captions.mjs';
import { captionsForTimeline } from '../src/editorial.mjs';
test('untimed final word survives a natural segment end but not an exclusive clip end', () => {
  const raw = [{ start: 0, end: 1, text: 'Sai rindo.', words: [
    { word: 'Sai', start: 0, end: 1 },
    { word: 'rindo.', start: 1, end: 1 },
  ] }];
  const retained = captionsForTimeline(raw, [{ source: 'fixture', start: 0, end: 2 }], 60);
  for (const mode of ['semantic', 'word']) {
    const pages = captionPages(retained, { mode });
    assert.deepEqual(pages.flatMap(p => p.words.map(w => w.word)), ['Sai', 'rindo.']);
    assert.equal(pages.flatMap(p => p.words).at(-1).from, 60);
    assert.equal(pages.flatMap(p => p.words).at(-1).to, 60);
    assert.ok(pages.every(p => p.to > p.from));
  }
  const trimmed = captionsForTimeline(raw, [
    { source: 'fixture', start: 0, end: 1 },
    { source: 'fixture', start: 1, end: 2 },
  ], 60);
  assert.deepEqual(trimmed.flatMap(s => s.words.map(w => w.word)), ['Sai']);
});
const words = [
  { word: 'Preserve', from: 0, to: 8 },
  { word: 'o', from: 8, to: 12 },
  { word: 'contexto.', from: 12, to: 30 },
  { word: 'Sempre.', from: 40, to: 60 },
];
test('optional pause threshold keeps a short phrase readable without changing word times', () => {
  const raw=[{from:0,to:90,words:[{word:'Aquele',from:0,to:7},{word:'momento',from:24,to:45},{word:'de',from:45,to:51},{word:'mesa',from:51,to:90}]}];
  assert.equal(captionPages(raw).length,2);
  const pages=captionPages(raw,{gapFrames:30});
  assert.equal(pages.length,1);
  assert.deepEqual(pages[0].words,raw[0].words);
  assert.equal(pages[0].from,0);
  assert.equal(pages[0].to,90);
});
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
test('point timestamps retain every word through cuts and word pagination without invented timing', () => {
  const raw = [
    {
      start: 0,
      end: 2,
      text: 'O que é que adianta?',
      words: [
        { word: 'O', start: 0, end: 0.1 },
        { word: 'que', start: 0.1, end: 0.1 },
        { word: 'é', start: 0.1, end: 0.2 },
        { word: 'que', start: 0.2, end: 0.2 },
        { word: 'adianta?', start: 0.2, end: 1.5 },
        { word: 'mesmo?', start: 1.5, end: 1.5 },
      ],
    },
  ];
  const segments = captionsForTimeline(raw, [{ source: 'fixture', start: 0, end: 2 }], 30);
  for (const mode of ['karaoke', 'word']) {
    const pages = captionPages(segments, { mode });
    assert.equal(
      pages
        .flatMap((p) => p.words)
        .map((w) => w.word)
        .join(' '),
      'O que é que adianta? mesmo?',
    );
    assert.ok(pages.every((p) => p.to > p.from));
    assert.equal(pages.flatMap((p) => p.words).filter((w) => w.from === w.to).length, 3);
  }
});
