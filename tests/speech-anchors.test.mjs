import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyOperations } from '../src/operations.mjs';
const base = {
  fps: 30,
  clips: [{ source: 'source', start: 1, end: 5 }],
  transcript: {
    segments: [
      {
        start: 0,
        end: 5,
        text: 'A paz de Deus. Paz.',
        words: [
          { word: 'A', start: 0, end: 0.2 },
          { word: 'paz', start: 1.2, end: 1.6 },
          { word: 'de', start: 1.6, end: 1.8 },
          { word: 'Deus.', start: 1.8, end: 2.4 },
          { word: 'Paz.', start: 3, end: 3.4 },
        ],
      },
    ],
  },
};
const resolve = (event, settings = {}) =>
  applyOperations({ ...base, ...settings, motions: [{ kind: 'impact', text: 'PAZ', ...event }] })
    .motions[0];
test('speech anchors map an intact phrase through trimming using measured word boundaries', () => {
  const event = resolve({ anchor: { phrase: 'PAZ de Deus' }, duration: 1.5 });
  assert.equal(event.start, 0.2);
  assert.equal(event.end, 1.7);
  assert.equal(event.resolvedSpeechAnchor.start.sourceStart, 1.2);
  assert.equal(event.resolvedSpeechAnchor.start.clipIndex, 0);
  assert.equal(base.transcript.segments[0].words[1].start, 1.2);
});
test('repeated anchors require an explicit occurrence and count only retained matches', () => {
  assert.throws(() => resolve({ anchor: { phrase: 'paz' }, duration: 1 }), /ambígua/);
  assert.equal(resolve({ anchor: { phrase: 'paz', occurrence: 2 }, duration: 0.5 }).start, 2);
  const event = resolve(
    { anchor: { phrase: 'paz' }, duration: 0.5 },
    { clips: [{ source: 'source', start: 2.5, end: 5 }] },
  );
  assert.equal(event.start, 0.5);
});
test('absent, partially cut, unaligned and point-only word anchors are rejected', () => {
  assert.throws(() => resolve({ anchor: { phrase: 'alegria' } }), /não encontrada/);
  assert.throws(() => resolve({ anchor: { phrase: 'A paz' } }), /não encontrada/);
  assert.throws(
    () =>
      resolve(
        { anchor: { phrase: 'paz de Deus' } },
        { clips: [{ source: 'source', start: 1.3, end: 5 }] },
      ),
    /não encontrada/,
  );
  const point = {
    segments: [{ start: 1, end: 2, text: 'paz', words: [{ word: 'paz', start: 1.5, end: 1.5 }] }],
  };
  assert.throws(
    () => resolve({ anchor: { phrase: 'paz' }, duration: 1 }, { transcript: point }),
    /não encontrada|mensurável/,
  );
  const unaligned = { segments: [{ start: 1, end: 2, text: 'paz', words: [] }] };
  assert.throws(
    () => resolve({ anchor: { phrase: 'paz' }, duration: 1 }, { transcript: unaligned }),
    /não encontrada/,
  );
});
test('coarse segment anchoring is explicit, covers the whole phrase and never guesses substrings', () => {
  const transcript = { segments: [{ start: 1.1, end: 2.1, text: 'Paz de Deus.' }] };
  const event = resolve(
    { anchor: { phrase: 'Paz de Deus', granularity: 'segment' } },
    { transcript },
  );
  assert.equal(event.start, 0.1);
  assert.equal(event.end, 1.1);
  assert.equal(event.resolvedSpeechAnchor.timingSource, 'explicit-whole-segment-timestamps');
  assert.throws(
    () => resolve({ anchor: { phrase: 'Deus', granularity: 'segment' } }, { transcript }),
    /não encontrada/,
  );
});
test('end anchors, deliberate frame offsets and repeated application are deterministic', () => {
  const input = {
    ...base,
    motions: [
      {
        kind: 'impact',
        text: 'PAZ',
        anchor: { phrase: 'paz de Deus', offset: 0.1 },
        endAnchor: { phrase: 'paz', occurrence: 2 },
      },
    ],
  };
  const first = applyOperations(input);
  assert.equal(first.motions[0].start, 0.3);
  assert.equal(first.motions[0].end, 2.4);
  assert.deepEqual(applyOperations(first), first);
  assert.equal(
    JSON.stringify(applyOperations(JSON.parse(JSON.stringify(first)))),
    JSON.stringify(first),
  );
  assert.throws(
    () =>
      resolve({
        anchor: { phrase: 'paz de Deus' },
        duration: 2,
        endAnchor: { phrase: 'paz', occurrence: 2 },
      }),
    /duration ou endAnchor/,
  );
});
test('anchors do not conceal missing source identity or timing ambiguity with beat snapping', () => {
  assert.throws(
    () =>
      resolve(
        { anchor: { phrase: 'paz de Deus' }, duration: 1 },
        { clips: [...base.clips, { source: 'other', start: 5, end: 6 }] },
      ),
    /sem source/,
  );
  assert.throws(
    () =>
      resolve(
        { anchor: { phrase: 'paz de Deus' }, duration: 1, syncToBeat: true },
        { rhythm: { alignVisuals: true, beats: [0.3] } },
      ),
    /syncToBeat/,
  );
  const combined = {
    segments: [
      { start: 1, end: 3, text: 'de Deus', words: [{ word: 'de Deus', start: 1, end: 2 }] },
    ],
  };
  assert.throws(
    () => resolve({ anchor: { phrase: 'Deus' }, duration: 1 }, { transcript: combined }),
    /não encontrada/,
  );
});
test('a point timestamp at a phrase end requires an explicit visual duration or another end anchor', () => {
  const transcript = {
    segments: [
      {
        start: 1,
        end: 2,
        text: 'Paz Deus',
        words: [
          { word: 'Paz', start: 1.2, end: 1.4 },
          { word: 'Deus', start: 1.5, end: 1.5 },
        ],
      },
    ],
  };
  assert.throws(
    () => resolve({ anchor: { phrase: 'Paz Deus' } }, { transcript }),
    /Fim da frase sem duração/,
  );
  assert.equal(resolve({ anchor: { phrase: 'Paz Deus' }, duration: 0.8 }, { transcript }).end, 1);
});
