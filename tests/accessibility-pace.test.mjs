import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  contrastRatio,
  worstCaseCaptionContrast,
  validateCaptionAccessibility,
} from '../src/accessibility.mjs';
import { applyOperations } from '../src/operations.mjs';
import { analyzeVisualPace } from '../src/pace.mjs';
import { exportSrt } from '../tools/export_captions.mjs';
test('accessible caption contrast accounts for transparency and rejects unreadable styles', () => {
  assert.equal(contrastRatio('#fff', '#000'), 21);
  assert.equal(worstCaseCaptionContrast('#888', '#000', 0), 1);
  assert.ok(worstCaseCaptionContrast('#fff', '#000', 0.86) < 21);
  assert.deepEqual(validateCaptionAccessibility({ mode: 'accessible' }), []);
  assert.ok(
    validateCaptionAccessibility({ mode: 'accessible', color: '#777777', boxColor: '#888888' })
      .length,
  );
  assert.ok(validateCaptionAccessibility({ mode: 'accessible', boxOpacity: 0.1 }).length);
  assert.ok(validateCaptionAccessibility({ mode: 'accessible', opacity: 0.2 }).length);
});
test('SRT follows edited frames and retains zero-duration words on an adjacent page', () => {
  const job = {
    fps: 30,
    clips: [{ source: 'a', start: 1, end: 3 }],
    transcript: {
      segments: [
        {
          start: 1,
          end: 3,
          text: 'Paz de Deus.',
          words: [
            { word: 'Paz', start: 1.2, end: 1.6 },
            { word: 'de', start: 1.6, end: 1.6 },
            { word: 'Deus.', start: 1.6, end: 2.4 },
          ],
        },
      ],
    },
  };
  const srt = exportSrt(job);
  assert.ok(srt.includes('00:00:00,200 --> 00:00:01,400'));
  assert.ok(srt.includes('Paz de Deus.'));
  assert.equal(srt.match(/ --> /g).length, 1);
  const vtt = exportSrt(job, 'vtt');
  assert.ok(vtt.startsWith('WEBVTT\n\n'));
  assert.ok(vtt.includes('00:00:00.200 --> 00:00:01.400'));
});
test('pace preserves user metadata and obeys fractional limits at the frame boundary', () => {
  const job = {
    fps: 30,
    clips: [{ source: 'a', start: 0, end: 2 }],
    motions: [
      { kind: 'title', text: 'Palavra', start: 0, end: 0.2, index: 37 },
      { kind: 'light', start: 0, end: 0.1, paceFlexible: true, index: 42 },
    ],
    pace: { mode: 'adjust', minStartGapSeconds: 0.21, maxDelaySeconds: 0.25 },
  };
  const adjusted = applyOperations(job);
  assert.equal(adjusted.motions[1].start, 7 / 30);
  assert.equal(adjusted.motions[1].index, 42);
  assert.equal(adjusted.motions[0].index, 37);
  const bounded = applyOperations({ ...job, pace: { ...job.pace, maxDelaySeconds: 0.05 } });
  assert.equal(bounded.motions[1].start, 0);
});
test('pace delays only explicitly flexible decoration and preserves spoken content and locked anchors', () => {
  const job = {
    fps: 30,
    clips: [{ source: 'a', start: 0, end: 4 }],
    transcript: { segments: [] },
    motions: [
      { kind: 'title', text: 'Dados', start: 0, end: 1 },
      { kind: 'light', start: 0.1, end: 0.4, paceFlexible: true },
      { kind: 'flash', start: 0.1, end: 0.3, paceFlexible: true },
    ],
    operations: [
      {
        recipeId: 'A096',
        pace: { mode: 'adjust', minStartGapSeconds: 0.3, maxConcurrent: 3, maxDelaySeconds: 1 },
      },
    ],
  };
  const result = applyOperations(job);
  assert.equal(result.motions[0].start, 0);
  assert.equal(result.motions[1].start, 0.3);
  assert.equal(result.motions[2].start, 0.6);
  assert.deepEqual(result.clips, job.clips);
  assert.deepEqual(result.transcript, job.transcript);
  assert.equal(analyzeVisualPace(result).adjustmentCount, 2);
  assert.equal(
    JSON.stringify(applyOperations(JSON.parse(JSON.stringify(result)))),
    JSON.stringify(result),
  );
});
test('pace review does not force spacing on the editor and unschedulable decoration is flagged', () => {
  const base = {
    clips: [{ source: 'a', start: 0, end: 1 }],
    transcript: { segments: [] },
    motions: [
      { kind: 'title', text: 'Palavra', start: 0, end: 1 },
      { kind: 'light', start: 0, end: 0.5, paceFlexible: true },
    ],
    pace: { mode: 'review', minStartGapSeconds: 0.5, maxConcurrent: 1 },
  };
  assert.equal(applyOperations(base).motions[1].start, 0);
  assert.ok(analyzeVisualPace(base).concurrencyWarning);
  const adjusted = applyOperations({
    ...base,
    pace: { ...base.pace, mode: 'adjust', maxDelaySeconds: 0 },
  });
  assert.equal(adjusted.motions[1].start, 0);
  assert.ok(analyzeVisualPace(adjusted).crowdedStarts.length);
});
