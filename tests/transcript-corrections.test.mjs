import { test } from 'node:test';
import assert from 'node:assert/strict';
import { correctTranscript } from '../tools/transcript_corrections.mjs';
const input = {
  segments: [
    {
      start: 0,
      end: 4,
      text: 'A fala. A palavra.',
      words: [
        { word: 'A', start: 0, end: 0.2 },
        { word: 'fala.', start: 0.2, end: 1 },
        { word: 'A', start: 2, end: 2.2 },
        { word: 'palavra.', start: 2.2, end: 4 },
      ],
    },
  ],
  provenance: { human_reviewed: true },
};
test('time-scoped corrections change the intended occurrence and retain measured word times', () => {
  const result = correctTranscript(input, [{ from: 'A', to: 'IA', start: 0, end: 1 }]);
  assert.equal(result.transcript.segments[0].text, 'IA fala. A palavra.');
  assert.equal(result.transcript.segments[0].words[2].word, 'A');
  assert.equal(result.transcript.segments[0].words[0].end, 0.2);
  assert.equal(result.transcript.provenance.human_reviewed, false);
  assert.equal(input.segments[0].text, 'A fala. A palavra.');
  assert.equal(result.changes[0].before, input.segments[0].text);
});
test('ambiguous and substring matches never silently alter other statements', () => {
  assert.throws(() => correctTranscript(input, [{ from: 'A', to: 'IA' }]), /ambígua/);
  const other = { segments: [{ start: 0, end: 1, text: 'café' }] };
  assert.throws(() => correctTranscript(other, [{ from: 'fé', to: 'PAZ' }]), /nenhuma ocorrência/);
  assert.throws(() => correctTranscript(input, [{ from: '', to: 'X' }]), /não vazios/);
  assert.throws(() => correctTranscript(input, [{ from: 'A', to: '' }]), /remoção de fala/);
});
test('multiword corrections reset word alignment instead of keeping stale captions', () => {
  const result = correctTranscript(input, [{ from: 'A fala', to: 'Uma frase', start: 0, end: 1 }]);
  const segment = result.transcript.segments[0];
  assert.equal(segment.text, 'Uma frase. A palavra.');
  assert.equal(segment.words, undefined);
  assert.equal(segment.start, 0);
  assert.equal(segment.end, 4);
  assert.equal(segment.wordAlignment.requiresRealignment, true);
});
test('explicit occurrence/all, alternate word fields and point timestamps remain supported', () => {
  const nth = correctTranscript(input, [{ from: 'A', to: 'IA', occurrence: 2 }]);
  assert.equal(nth.transcript.segments[0].text, 'A fala. IA palavra.');
  const all = correctTranscript(input, [{ from: 'A', to: 'IA', all: true }]);
  assert.equal(all.transcript.segments[0].text, 'IA fala. IA palavra.');
  const point = {
    segments: [
      { start: 0, end: 1, text: 'grafia', words: [{ text: 'grafia', start: 0.5, end: 0.5 }] },
    ],
  };
  const corrected = correctTranscript(point, [{ from: 'grafia', to: 'Grafia', start: 0, end: 1 }]);
  assert.equal(corrected.transcript.segments[0].words[0].text, 'Grafia');
  assert.equal(corrected.transcript.segments[0].words[0].start, 0.5);
  assert.equal(corrected.transcript.segments[0].words[0].end, 0.5);
});
test('partial time scopes cannot pretend to locate unaligned words', () => {
  const unaligned = { segments: [{ start: 0, end: 4, text: 'A fala. A palavra.' }] };
  assert.throws(
    () => correctTranscript(unaligned, [{ from: 'A', to: 'IA', start: 0, end: 1 }]),
    /nenhuma ocorrência/,
  );
  assert.throws(
    () => correctTranscript(input, [{ from: 'A', to: 'IA', start: 2, end: 1 }]),
    /start\/end/,
  );
  assert.throws(
    () => correctTranscript(input, [{ from: 'A', to: 'IA', occurrence: 0 }]),
    /Occurrence/,
  );
});
