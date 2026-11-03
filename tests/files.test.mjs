import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileDigest } from '../tools/engine.mjs';
test('streamed file fingerprints cover complete files beyond one buffer', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reels-digest-')),
    file = path.join(dir, 'fixture.bin'),
    data = Buffer.alloc(2 * 1024 * 1024 + 17);
  for (let i = 0; i < data.length; i++) data[i] = i % 251;
  try {
    fs.writeFileSync(file, data);
    assert.equal(fileDigest(file), crypto.createHash('sha256').update(data).digest('hex'));
  } finally {
    fs.unlinkSync(file);
    fs.rmdirSync(dir);
  }
});
