import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { read, write } from './engine.mjs';
import { validateJob } from '../src/editorial.mjs';
import { correctTranscript } from './transcript_corrections.mjs';
const [source, transcriptFile, briefFile, output] = process.argv.slice(2);
if (!source || !transcriptFile || !briefFile || !output)
  throw new Error('Uso: node tools/create_job.mjs VIDEO TRANSCRIPT BRIEF JOB');
const key = (file) =>
  process.platform === 'win32' ? path.resolve(file).toLowerCase() : path.resolve(file);
const validationFile = path.join(path.dirname(output), 'initial-validation.json');
if (
  key(output) === key(validationFile) ||
  [output, validationFile].some((target) =>
    [source, transcriptFile, briefFile].some((input) => key(input) === key(target)),
  )
)
  throw new Error('O job e seu relatório não podem sobrescrever as entradas originais');
const probe = spawnSync('ffprobe', ['-v', 'error', '-show_format', '-of', 'json', source], {
  encoding: 'utf8',
  windowsHide: true,
});
if (probe.status !== 0) throw new Error(probe.stderr);
const duration = Number(JSON.parse(probe.stdout).format.duration),
  brief = read(briefFile),
  rawTranscript = read(transcriptFile);
const { transcript, changes } = correctTranscript(rawTranscript, brief.transcriptCorrections || []);
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
write(validationFile, check);
console.log({
  duration,
  segments: transcript.segments.length,
  corrections: changes.length,
  output,
});
