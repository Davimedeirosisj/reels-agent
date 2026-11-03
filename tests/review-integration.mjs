// Exercise the actual local HTML controls in Chrome with a synthetic binding.
// This does not approve any real sermon or engine job.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { openBrowser } from '@remotion/renderer';
import { makeReviewPage } from '../tools/review_page.mjs';
import { root, write } from '../tools/engine.mjs';
import { rendererFingerprint } from '../tools/fingerprint.mjs';
const job = {
  clips: [{ source: 'fixture', start: 10, end: 12 }],
  transcript: {
    segments: [
      {
        start: 10,
        end: 11,
        text: 'Texto de teste.',
        words: [
          { word: 'Texto', start: 10, end: 10.3 },
          { word: 'de teste.', start: 10.3, end: 11 },
        ],
      },
    ],
  },
  approval: { jobHash: 'old-fixture-only' },
  motions: [
    {
      kind: 'title',
      text: 'Texto',
      start: 0,
      end: 0.7,
      anchor: { phrase: 'Texto' },
      resolvedSpeechAnchor: { start: { source: 'fixture', sourceStart: 10, sourceEnd: 10.3 } },
    },
  ],
};
const binding = {
  jobHash: 'fixture-only',
  assetHash: 'fixture-only',
  rendererHash: 'fixture-only',
};
const pageHtml = makeReviewPage(job, binding, { warnings: [] });
const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(pageHtml);
  } else {
    res.statusCode = 204;
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await openBrowser('chrome', {
    browserExecutable: process.env.REELS_BROWSER,
    logLevel: 'error',
  });
  const page = await browser.newPage({
    context: () => null,
    logLevel: 'error',
    indent: false,
    pageIndex: 0,
    onBrowserLog: null,
    onLog: () => {},
  });
  await page.goto({ url: `http://127.0.0.1:${server.address().port}/`, timeout: 30000 });
  const result = await page.evaluate(async () => {
    const alerts = [],
      downloads = [];
    window.alert = (message) => alerts.push(message);
    let pending = Promise.resolve();
    URL.createObjectURL = (blob) => {
      pending = blob.text().then((text) => downloads.push(JSON.parse(text)));
      return 'blob:fixture-only';
    };
    HTMLAnchorElement.prototype.click = function () {};
    const input = document.querySelector('textarea');
    input.value = 'Texto corrigido.';
    ['messageFaithful', 'captionsCorrect', 'framingSafe', 'audioClear'].forEach(
      (id) => (document.getElementById(id).checked = true),
    );
    document.getElementById('save').click();
    const blocked =
      downloads.length === 0 && alerts.some((message) => message.includes('correções'));
    document.getElementById('corrections').click();
    await pending;
    const corrected = downloads[0];
    document.getElementById('keep-anchor-timing').checked = true;
    document.getElementById('corrections').click();
    await pending;
    const manualTiming = downloads[1];
    input.value = 'Texto de teste.';
    document.getElementById('save').click();
    await pending;
    return {
      blocked,
      corrected,
      manualTiming,
      review: downloads[2],
      seek: document.querySelector('[data-seek]').dataset.seek,
    };
  });
  assert.equal(result.blocked, true);
  assert.equal(result.corrected.approval, undefined);
  assert.deepEqual(result.corrected.transcript.segments[0].words, []);
  assert.equal(result.corrected.transcript.segments[0].start, 10);
  assert.equal(result.corrected.transcript.segments[0].text, 'Texto corrigido.');
  assert.equal(result.corrected.motions[0].anchorReview.status, 'needs-realignment');
  assert.equal(result.manualTiming.motions[0].anchor, undefined);
  assert.equal(result.manualTiming.motions[0].end, 0.7);
  assert.equal(result.review.jobHash, 'fixture-only');
  assert.equal(result.seek, '0');
  const report = {
    passed: true,
    syntheticBindingOnly: true,
    sourceFingerprint: rendererFingerprint(root),
    checks: [
      'HTML correction controls ran in Chrome',
      'Approval blocked while transcript edits are pending',
      'Corrected job clears old approval and word alignment',
      'Real phrase timestamp retained',
      'Review binds only the unchanged preview',
      'Seek time remapped from the source EDL',
      'Edited speech anchors require realignment by default',
      'Explicit checkbox keeps prior visual times without word timing invention',
    ],
  };
  write(path.join(root, 'output/review-regression/assertions.json'), report);
  console.log(report);
} finally {
  if (browser) await browser.close({ silent: true });
  await new Promise((resolve) => server.close(resolve));
}
