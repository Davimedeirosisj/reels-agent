import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateJob, proposeCuts } from '../src/editorial.mjs';
import { suggestMotions } from '../src/planner.mjs';
import { applyOperations } from '../src/operations.mjs';
import { qualityReview } from '../src/quality.mjs';
import { mediaReferences, mapMedia } from '../src/media-layout.mjs';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
export const write = (p, data) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
};
export const hash = (job) => {
  const { approval, ...body } = job;
  return crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
};
function run(program, args) {
  const r = spawnSync(program, args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`${program} falhou (${r.status}): ${r.stderr || r.stdout}`);
  return r;
}
const probe = (p) =>
  JSON.parse(
    run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', p]).stdout,
  );
function localFile(source) {
  if (/^https?:/.test(source)) throw new Error('Baixe e autorize a mídia local antes do render');
  const p = path.isAbsolute(source)
    ? source
    : path.resolve(root, 'public', source.replace(/^\//, ''));
  if (!fs.statSync(p).isFile()) throw new Error(`Mídia ausente: ${p}`);
  return p;
}
export function fileDigest(file) {
  const digest = crypto.createHash('sha256'),
    buffer = Buffer.alloc(1024 * 1024),
    fd = fs.openSync(file, 'r');
  try {
    let count;
    while ((count = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0)
      digest.update(buffer.subarray(0, count));
  } finally {
    fs.closeSync(fd);
  }
  return digest.digest('hex');
}
function assetHash(job) {
  const entries = mediaReferences(job)
    .sort()
    .map((s) => [s, fileDigest(localFile(s))]);
  return crypto.createHash('sha256').update(JSON.stringify(entries)).digest('hex');
}
function rendererHash() {
  const files = fs
    .readdirSync(path.join(root, 'src'))
    .sort()
    .map((s) => fs.readFileSync(path.join(root, 'src', s)));
  return crypto.createHash('sha256').update(Buffer.concat(files)).digest('hex');
}
function inspectAssets(job) {
  const inspections = {};
  for (const c of job.clips) {
    const p = localFile(c.source);
    const m = (inspections[c.source] ??= probe(p));
    if (!m.streams.some((s) => s.codec_type === 'video')) throw new Error(`Sem vídeo: ${c.source}`);
    if (c.end > Number(m.format.duration) + 0.035)
      throw new Error(`Corte excede a mídia: ${c.source}`);
  }
  return inspections;
}
function stage(job, id) {
  const assets = path.join(root, 'public', '.jobs', id);
  fs.mkdirSync(assets, { recursive: true });
  const mapping = new Map();
  const copy = (source) => {
    if (!mapping.has(source)) {
      const p = localFile(source),
        name = crypto.createHash('sha1').update(p).digest('hex').slice(0, 12) + path.extname(p);
      fs.copyFileSync(p, path.join(assets, name));
      mapping.set(source, name);
    }
    return mapping.get(source);
  };
  return { props: mapMedia(job, copy), publicDir: assets };
}
export function validateMedia(file, job) {
  const meta = probe(file),
    v = meta.streams.find((s) => s.codec_type === 'video'),
    a = meta.streams.find((s) => s.codec_type === 'audio'),
    expected = validateJob(job).durationInFrames / (job.fps || 30);
  const errors = [];
  if (!v || v.width !== (job.width || 1080) || v.height !== (job.height || 1920))
    errors.push('Dimensões de vídeo incorretas');
  if (v?.codec_name !== 'h264') errors.push('Codec de vídeo diferente de H.264');
  if (v?.pix_fmt !== 'yuv420p') errors.push('Formato de pixel diferente de yuv420p');
  if (v?.nb_frames && Number(v.nb_frames) !== validateJob(job).durationInFrames)
    errors.push('Quantidade de frames divergente da EDL');
  if (!a) errors.push('Stream de áudio ausente');
  if (a?.codec_name !== 'aac') errors.push('Codec de áudio diferente de AAC');
  if (a && v && Math.abs(Number(a.duration) - Number(v.duration)) > 0.12)
    errors.push('Durações de áudio e vídeo divergentes');
  if (Math.abs(Number(meta.format.duration) - expected) > 0.16)
    errors.push('Duração divergente da EDL');
  const decoded = run('ffmpeg', ['-v', 'error', '-xerror', '-i', file, '-f', 'null', '-']);
  if (decoded.stderr.trim()) errors.push(decoded.stderr.trim());
  const volume = run('ffmpeg', [
    '-hide_banner',
    '-i',
    file,
    '-af',
    'volumedetect',
    '-f',
    'null',
    '-',
  ]).stderr;
  const peak = Number(volume.match(/max_volume:\s*(-?[\d.]+)/)?.[1]);
  const mean = Number(volume.match(/mean_volume:\s*(-?[\d.]+)/)?.[1]);
  if (!Number.isFinite(peak) || peak >= 0) errors.push('Pico de áudio inválido ou clipado');
  return {
    status: errors.length ? 'failed' : 'passed',
    errors,
    expectedDuration: expected,
    actualDuration: Number(meta.format.duration),
    video: v,
    audio: a,
    peakDb: peak,
    meanDb: mean,
    sha256: fileDigest(file),
    editorialReview: 'required',
  };
}
function normalize(input, output, options = {}) {
  const i = options.integrated ?? -16,
    tp = options.truePeak ?? -1.5,
    lra = options.range ?? 11;
  const first = run('ffmpeg', [
    '-hide_banner',
    '-i',
    input,
    '-af',
    `loudnorm=I=${i}:TP=${tp}:LRA=${lra}:print_format=json`,
    '-f',
    'null',
    '-',
  ]).stderr;
  const measured = JSON.parse(first.slice(first.lastIndexOf('{'), first.lastIndexOf('}') + 1));
  if (!Number.isFinite(Number(measured.input_i)))
    throw new Error('Áudio silencioso; normalização não aplicável');
  const filter = `loudnorm=I=${i}:TP=${tp}:LRA=${lra}:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true:print_format=json`;
  const second = run('ffmpeg', [
    '-y',
    '-hide_banner',
    '-i',
    input,
    '-c:v',
    'copy',
    '-af',
    filter,
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-ar',
    '48000',
    '-movflags',
    '+faststart',
    output,
  ]);
  return { measured, processing: second.stderr };
}
function reviewPage(dir, job, check, id) {
  const escape = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const binding = { jobHash: id, assetHash: assetHash(job), rendererHash: rendererHash() };
  const checklist = ['messageFaithful', 'captionsCorrect', 'framingSafe', 'audioClear'];
  fs.writeFileSync(
    path.join(dir, 'review.html'),
    `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Revisão — Reels Agent</title>
 <style>body{font:18px system-ui;background:#101820;color:#eee;max-width:1000px;margin:40px auto;padding:20px}video{max-height:70vh;max-width:100%}label{display:block;margin:20px 0}button{padding:16px}pre{white-space:pre-wrap}</style>
 <h1>Revisar o corte</h1><video controls src="preview.mp4"></video><p>Compare com a gravação original antes de aprovar.</p><pre>${escape(JSON.stringify({ clips: job.clips, warnings: check.warnings }, null, 2))}</pre>
 ${checklist.map((k, i) => `<label><input type="checkbox" id="${k}"> ${['A fala e o contexto foram preservados', 'As legendas estão corretas e sincronizadas', 'O rosto e os textos estão visíveis', 'O áudio está claro'][i]}</label>`).join('')}
 <button id="save">Salvar revisão</button><script>document.getElementById('save').onclick=()=>{
 const keys=${JSON.stringify(checklist)},checks=Object.fromEntries(keys.map(k=>[k,document.getElementById(k).checked]));
 if(!keys.every(k=>checks[k]))return alert('Conclua a revisão dos quatro pontos.');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({...${JSON.stringify(binding)},...checks},null,2)],{type:'application/json'}));a.download='review.json';a.click();};</script></html>`,
  );
}
async function main() {
  const [command, jobPath, ...args] = process.argv.slice(2);
  if (!command || !jobPath)
    throw new Error(
      'Uso: node tools/engine.mjs validate|plan|preview|approve|final job.json [diretório ou review.json]',
    );
  const job = applyOperations(read(jobPath));
  const check = validateJob(job);
  if (check.errors.length) throw new Error(check.errors.join('\n'));
  if (command === 'plan') {
    const source = job.clips[0].source,
      metadata = probe(localFile(source));
    job.clips = proposeCuts(job.transcript, source);
    for (const c of job.clips) c.end = Math.min(c.end, Number(metadata.format.duration));
    if (job.brief?.suggestMotions) {
      const verifiedPath = path.join(root, 'prompts', 'external-verified.json');
      const verifiedReferences = fs.existsSync(verifiedPath) ? read(verifiedPath).entries : [];
      job.motions = suggestMotions(job, { verifiedReferences });
    }
    delete job.approval;
    write(args[0] || jobPath.replace(/\.json$/, '.proposed.json'), job);
    return;
  }
  if (command === 'validate') {
    const assets = inspectAssets(job);
    console.log(
      JSON.stringify(
        { ...check, review: qualityReview(job), assets: Object.keys(assets) },
        null,
        2,
      ),
    );
    return;
  }
  if (command === 'approve') {
    const review = read(args[0]);
    if (
      review.jobHash !== hash(job) ||
      review.assetHash !== assetHash(job) ||
      review.rendererHash !== rendererHash() ||
      !['messageFaithful', 'captionsCorrect', 'framingSafe', 'audioClear'].every(
        (k) => review[k] === true,
      )
    )
      throw new Error('Revisão incompleta ou EDL/mídia/composição modificada');
    job.approval = {
      jobHash: hash(job),
      assetHash: assetHash(job),
      rendererHash: rendererHash(),
      checks: review,
    };
    write(jobPath, job);
    return;
  }
  if (!['preview', 'final'].includes(command)) throw new Error(`Comando desconhecido: ${command}`);
  if (
    command === 'final' &&
    (job.approval?.jobHash !== hash(job) ||
      job.approval?.assetHash !== assetHash(job) ||
      job.approval?.rendererHash !== rendererHash())
  )
    throw new Error(
      'Aprovação editorial vinculada à EDL, mídia e composição é obrigatória para final',
    );
  const assets = inspectAssets(job),
    id = hash(job),
    staged = stage(job, id),
    props = staged.props,
    dir = path.resolve(args[0] || path.join(root, 'output', id.slice(0, 12)));
  fs.mkdirSync(dir, { recursive: true });
  write(path.join(dir, 'edit_decisions.json'), job);
  write(path.join(dir, 'transcript.json'), job.transcript || { segments: [] });
  write(path.join(dir, 'media_probe.json'), assets);
  write(path.join(dir, 'editorial_quality.json'), qualityReview(job));
  if (command === 'final') props.debugSafeAreas = false;
  const { bundle } = await import('@remotion/bundler');
  const { selectComposition, renderMedia } = await import('@remotion/renderer');
  const serveUrl = await bundle({
    entryPoint: path.join(root, 'src', 'index.jsx'),
    publicDir: staged.publicDir,
    onProgress: () => {},
  });
  const browserExecutable = process.env.REELS_BROWSER;
  const composition = await selectComposition({
    serveUrl,
    id: 'PastoralReel',
    inputProps: props,
    browserExecutable,
  });
  const raw = path.join(dir, `${command}.raw.mp4`),
    file = path.join(dir, `${command}.mp4`);
  let lastProgress = 0;
  await renderMedia({
    composition,
    serveUrl,
    browserExecutable,
    codec: 'h264',
    audioCodec: 'aac',
    pixelFormat: 'yuv420p',
    colorSpace: 'bt709',
    imageFormat: 'png',
    outputLocation: raw,
    inputProps: props,
    concurrency: 2,
    onProgress: ({ progress, renderedFrames, encodedFrames }) => {
      const now = Date.now();
      if (progress === 1 || now - lastProgress >= 10000) {
        console.log(
          `Render ${Math.round(progress * 100)}% — frames ${renderedFrames}/${composition.durationInFrames}, codificados ${encodedFrames}`,
        );
        lastProgress = now;
      }
    },
  });
  if (job.audio?.normalize === false) fs.copyFileSync(raw, file);
  else write(path.join(dir, `${command}-audio.json`), normalize(raw, file, job.audio));
  const report = validateMedia(file, job);
  write(path.join(dir, `${command}-validation.json`), report);
  fs.writeFileSync(
    path.join(dir, 'quality_report.md'),
    `# Verificação técnica\n\nEstado: ${report.status}\n\nArquivo: ${path.basename(file)}\nSHA-256: ${report.sha256}\nDuração esperada: ${report.expectedDuration}s; obtida: ${report.actualDuration}s\nPico: ${report.peakDb} dBFS; média: ${report.meanDb} dBFS\n\n${check.warnings.join('\n')}\n\nRevisão editorial: ${command === 'final' ? 'aprovação vinculada à EDL' : 'pendente; abrir review.html'}. Testes de mídia não comprovam fidelidade teológica.\n`,
  );
  if (command === 'preview') reviewPage(dir, job, check, id);
  if (report.errors.length) throw new Error(report.errors.join('\n'));
  console.log(file);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch((e) => {
    console.error(e.stack || e);
    process.exitCode = 1;
  });
