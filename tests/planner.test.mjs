import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestMotions } from '../src/planner.mjs';
const job = {
  clips: [{ source: 'v', start: 0, end: 10 }],
  transcript: {
    segments: [
      { start: 1, end: 4, text: 'Guarde a palavra!' },
      { start: 6, end: 9, text: 'Preserve o contexto.' },
    ],
  },
};
test('a quiet plan can choose no graphics', () => {
  assert.deepEqual(suggestMotions(job), []);
  assert.deepEqual(
    suggestMotions({ ...job, brief: { style: 'contemplative', references: ['V01'] } }),
    [],
  );
});
test('explicit references guide proposals using verbatim excerpts', () => {
  const events = suggestMotions({ ...job, brief: { references: ['V08'] } });
  assert.equal(events[0].kind, 'terminal');
  assert.equal(events[0].text, job.transcript.segments[0].text);
  assert.equal(events[0].referenceId, 'V08');
});
test('does not manufacture quantitative claims from a numeric-looking visual reference', () => {
  assert.deepEqual(suggestMotions({ ...job, brief: { references: ['V04'] } }), []);
});
