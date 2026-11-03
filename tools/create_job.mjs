import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { read, write } from './engine.mjs';
import { validateJob } from '../src/editorial.mjs';
const [source, transcriptFile, briefFile, output] = process.argv.slice(2);
if (!source || !transcriptFile || !briefFile || !output)
  throw new Error('Uso: node tools/create_job.mjs VIDEO TRANSCRIPT BRIEF JOB');
const probe = spawnSync('ffprobe', ['-v', 'error', '-show_format', '-of', 'json', source], {
  encoding: 'utf8',
  windowsHide: true,
});
if (probe.status !== 0) throw new Error(probe.stderr);
const duration = Number(JSON.parse(probe.stdout).format.duration),
  brief = read(briefFile),
  transcript = read(transcriptFile),
  changes = [];
for (const correction of brief.transcriptCorrections || []) {
  const regex = new RegExp(correction.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'giu');
  for (const segment of transcript.segments) {
    if (regex.test(segment.text)) {
      changes.push({ ...correction, start: segment.start, end: segment.end });
      segment.text = segment.text.replace(regex, correction.to);
    }
    regex.lastIndex = 0;
    for (const word of segment.words || []) word.word = word.word.replace(regex, correction.to);
  }
}
if (changes.length)
  transcript.provenance = {
    ...transcript.provenance,
    agentOrthographicCorrections: changes,
    human_reviewed: false,
  };
const { transcriptCorrections, ...settings } = brief;
const job = {
  fps: 30,
  width: 1080,
  height: 1920,
  ...settings,
  clips: brief.clips || [{ source: path.resolve(source), start: 0, end: duration }],
  transcript,
};
const check = validateJob(job);
if (check.errors.length) throw new Error(check.errors.join('\n'));
write(output, job);
write(path.join(path.dirname(output), 'initial-validation.json'), check);
console.log({
  duration,
  segments: transcript.segments.length,
  corrections: changes.length,
  output,
});
