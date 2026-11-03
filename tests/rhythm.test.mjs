import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapSourceBeats, snapVisualEvents, beatCutCandidates } from '../src/rhythm.mjs';
test('maps measured onsets through cuts and excludes removed media', () => {
  assert.deepEqual(
    mapSourceBeats(
      { v: { onsetCandidates: [0.5, 1.5, 2.5] } },
      [
        { source: 'v', start: 0, end: 1 },
        { source: 'v', start: 2, end: 3 },
      ],
      30,
    ),
    [0.5, 1.5],
  );
});
test('beat snapping changes only explicitly opted-in visual entries', () => {
  const events = [
    { kind: 'impact', start: 0.96, end: 2, syncToBeat: true },
    { kind: 'title', start: 0.96, end: 2 },
  ];
  const result = snapVisualEvents(events, [1]);
  assert.equal(result[0].start, 1);
  assert.equal(result[0].end, 2);
  assert.equal(result[1].start, 0.96);
  assert.equal(events[0].start, 0.96);
});
test('no beat cut is proposed inside a sentence or word', () => {
  const transcript = {
    segments: [
      { start: 0, end: 2, text: 'Uma frase.' },
      { start: 3, end: 4, text: 'Outra frase.' },
    ],
  };
  assert.equal(beatCutCandidates(transcript, [1, 3.1]).length, 0);
  assert.equal(beatCutCandidates(transcript, [2.95]).length, 1);
});
test('beat alignment is idempotent for approval fingerprints', () => {
  const events = [{ kind: 'impact', start: 0.96, end: 2, syncToBeat: true }];
  const one = snapVisualEvents(events, [1]);
  assert.deepEqual(snapVisualEvents(one, [1]), one);
});
