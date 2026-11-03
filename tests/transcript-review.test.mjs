import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviseTranscript, makeReviewPage } from '../tools/review_page.mjs';
const job = {
  clips: [{ source: 'fixture', start: 0, end: 2 }],
  transcript: {
    segments: [
      {
        start: 0,
        end: 1,
        text: 'Uma palavra.',
        words: [
          { word: 'Uma', start: 0, end: 0.5 },
          { word: 'palavra.', start: 0.5, end: 1 },
        ],
      },
    ],
  },
  approval: { jobHash: 'old' },
};
test('manual text changes reset approval and word alignment while preserving real phrase times', () => {
  const revised = reviseTranscript(job, { 0: 'Uma mensagem.' });
  assert.equal(revised.approval, undefined);
  assert.equal(revised.transcript.segments[0].end, 1);
  assert.deepEqual(revised.transcript.segments[0].words, []);
  assert.equal(job.transcript.segments[0].words.length, 2);
  assert.equal(revised.transcript.provenance.manualTextRevisions[0].wordAlignmentReset, true);
  assert.throws(() => reviseTranscript(job, { 0: '' }), /texto/);
});
test('review page escapes transcript markup in HTML and script data', () => {
  const payload = '</script><img src=x onerror=alert(1)>';
  const malicious = structuredClone(job);
  malicious.transcript.segments[0].text = payload;
  const page = makeReviewPage(malicious, { jobHash: 'known' }, { warnings: [] });
  assert.equal(page.includes(payload), false);
  assert.ok(page.includes('\\u003c/script>'));
  assert.ok(page.includes('job-corrigido.json'));
});
