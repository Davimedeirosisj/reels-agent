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
import { SCENE3D_KINDS, inspectGlb } from '../src/scene3d.mjs';
import { makeReviewPage } from './review_page.mjs';
import {
  rendererFingerprint,
  FINGERPRINT_SCHEME,
  assertRendererUnchanged,
} from './fingerprint.mjs';
import { assertOutputsDistinct } from './output_guard.mjs';
import { sourceOnlyJob } from '../src/foreground.mjs';
import { fileDigest, cacheMedia, stageCachedMedia } from './media_cache.mjs';
export { fileDigest } from './media_cache.mjs';
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
function run(program, args, options = {}) {
  const r = spawnSync(program, args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
    ...options,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`${program} falhou (${r.status}): ${r.stderr || r.stdout}`);
  return r;
}
export const probe = (p) =>
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
function assetHash(job) {
  const entries = mediaReferences(job)
    .sort()
    .map((s) => [s, fileDigest(localFile(s))]);
  return crypto.createHash('sha256').update(JSON.stringify(entries)).digest('hex');
}
function rendererHash() {
  return rendererFingerprint(root);
}
function inspectAssets(job) {
  const inspections = {};
  if (job.foregroundPreparation) {
    if (job.foregroundPreparation.rendererFingerprint !== rendererFingerprint(root))
      throw new Error('Motor mudou; prepare novamente a camada de recorte alinhada');
    for (const item of job.foregroundPreparation.sourceBinding || [])
      if (fileDigest(localFile(item.source)) !== item.sha256)
        throw new Error('Mídia original mudou; prepare o recorte novamente');
    if (
      !job.foregroundSrc ||
      fileDigest(localFile(job.foregroundSrc)) !== job.foregroundPreparation.foregroundSha256
    )
      throw new Error('Camada de recorte mudou; prepare e revise novamente');
  }
  for (const event of job.motions || [])
    if (SCENE3D_KINDS.includes(event.kind) && event.asset)
      inspectGlb(fs.readFileSync(localFile(event.asset)));
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
  const parent = path.join(root, 'public', '.jobs');
  fs.mkdirSync(parent, { recursive: true });
  const assets = fs.mkdtempSync(path.join(parent, id.slice(0, 12) + '-')),
    mapping = new Map(),
    entries = [],
    hashes = [];
  for (const source of mediaReferences(job).sort()) {
    const p = localFile(source),
      cached = cacheMedia(p, path.join(root, 'cache', 'media')),
      name = crypto.createHash('sha1').update(p).digest('hex').slice(0, 12) + path.extname(p);
    entries.push(stageCachedMedia(cached, path.join(assets, name)));
    hashes.push([source, cached.sha256]);
    mapping.set(source, name);
  }
  return {
    props: mapMedia(job, (s) => mapping.get(s)),
    publicDir: assets,
    entries,
    snapshotHash: crypto.createHash('sha256').update(JSON.stringify(hashes)).digest('hex'),
  };
}
function verifyStage(job, staged) {
  if (
    assetHash(job) !== staged.snapshotHash ||
    staged.entries.some((entry) => fileDigest(entry.file) !== entry.sha256)
  )
    throw new Error('Mídia mudou durante o render; a prévia não pode ser aprovada');
}
export function validateMedia(file, job, { videoOnly = false } = {}) {
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
  if (!videoOnly && !a) errors.push('Stream de áudio ausente');
  if (!videoOnly && a?.codec_name !== 'aac') errors.push('Codec de áudio diferente de AAC');
  if (videoOnly && a) errors.push('Preparação visual deve ficar sem áudio');
  if (a && v && Math.abs(Number(a.duration) - Number(v.duration)) > 0.12)
    errors.push('Durações de áudio e vídeo divergentes');
  if (Math.abs(Number(meta.format.duration) - expected) > 0.16)
    errors.push('Duração divergente da EDL');
  const decoded = run('ffmpeg', ['-v', 'error', '-xerror', '-i', file, '-f', 'null', '-']);
  if (decoded.stderr.trim()) errors.push(decoded.stderr.trim());
  const volume = videoOnly
    ? ''
    : run('ffmpeg', ['-hide_banner', '-i', file, '-af', 'volumedetect', '-f', 'null', '-']).stderr;
  const peak = videoOnly ? null : Number(volume.match(/max_volume:\s*(-?[\d.]+)/)?.[1]);
  const mean = videoOnly ? null : Number(volume.match(/mean_volume:\s*(-?[\d.]+)/)?.[1]);
  if (!videoOnly && (!Number.isFinite(peak) || peak >= 0))
    errors.push('Pico de áudio inválido ou clipado');
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
    videoOnly,
  };
}
export async function renderSourceVideo(input, file) {
  const job = sourceOnlyJob(applyOperations(input)),
    check = validateJob(job),
    renderFingerprint = rendererHash();
  if (check.errors.length) throw new Error(check.errors.join('\n'));
  inspectAssets(job);
  const output = path.resolve(file),
    key = (p) => (process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p));
  if (job.clips.some((c) => key(localFile(c.source)) === key(output)))
    throw new Error('A preparação não pode sobrescrever a gravação de origem');
  assertOutputsDistinct([output], mediaReferences(job).map(localFile));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const staged = stage(job, hash(job));
  const { bundle } = await import('@remotion/bundler'),
    { selectComposition, renderMedia } = await import('@remotion/renderer');
  const serveUrl = await bundle({
      entryPoint: path.join(root, 'src/index.jsx'),
      publicDir: staged.publicDir,
      onProgress: () => {},
    }),
    browserExecutable = process.env.REELS_BROWSER;
  const composition = await selectComposition({
    serveUrl,
    id: 'PastoralReel',
    inputProps: staged.props,
    browserExecutable,
  });
  let last = 0;
  await renderMedia({
    serveUrl,
    composition,
    inputProps: staged.props,
    browserExecutable,
    codec: 'h264',
    muted: true,
    pixelFormat: 'yuv420p',
    colorSpace: 'bt709',
    imageFormat: 'png',
    outputLocation: output,
    concurrency: 2,
    onProgress: ({ progress }) => {
      if (progress === 1 || Date.now() - last > 10000) {
        console.log(`Preparação visual ${Math.round(progress * 100)}%`);
        last = Date.now();
      }
    },
  });
  verifyStage(job, staged);
  assertRendererUnchanged(root, renderFingerprint);
  const report = validateMedia(output, job, { videoOnly: true });
  assertRendererUnchanged(root, renderFingerprint);
  if (report.errors.length) throw new Error(report.errors.join('\n'));
  return report;
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
function reviewPage(dir, job, check, id, renderFingerprint, assetFingerprint) {
  const binding = {
    jobHash: id,
    assetHash: assetFingerprint,
    rendererHash: renderFingerprint,
    fingerprintScheme: FINGERPRINT_SCHEME,
  };
  fs.writeFileSync(path.join(dir, 'review.html'), makeReviewPage(job, binding, check));
}
async function main() {
  const [command, jobPath, ...args] = process.argv.slice(2);
  if (!command || !jobPath)
    throw new Error(
      'Uso: node tools/engine.mjs validate|plan|color-plan|foreground|preview|approve|final job.json [diretório ou review.json]',
    );
  const job = applyOperations(read(jobPath));
  if (command === 'foreground') {
    const { prepareForeground } = await import('./prepare_foreground.mjs');
    const result = await prepareForeground(job, args[0] || path.join(root, 'output', 'foreground'));
    console.log(result);
    return;
  }
  const check = validateJob(job);
  if (check.errors.length) throw new Error(check.errors.join('\n'));
  if (command === 'color-plan') {
    const output = path.resolve(args[0] || jobPath.replace(/\.json$/, '.color-proposed.json'));
    assertOutputsDistinct([output], [jobPath, ...mediaReferences(job).map(localFile)]);
    const measured = run(
      'python',
      [
        path.join(root, 'tools/match_color.py'),
        '-',
        output,
        '--public-dir',
        path.join(root, 'public'),
      ],
      { input: JSON.stringify(job) },
    );
    const proposed = validateJob(read(output));
    if (proposed.errors.length) throw new Error(proposed.errors.join('\n'));
    console.log(measured.stdout.trim());
    return;
  }
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
    const output = args[0] || jobPath.replace(/\.json$/, '.proposed.json');
    assertOutputsDistinct([output], [jobPath, ...mediaReferences(job).map(localFile)]);
    const planned = applyOperations(job),
      validation = validateJob(planned);
    if (validation.errors.length) throw new Error(validation.errors.join('\n'));
    write(output, planned);
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
  const id = hash(job),
    dir = path.resolve(args[0] || path.join(root, 'output', id.slice(0, 12)));
  assertOutputsDistinct(
    [
      `${command}.mp4`,
      `${command}.raw.mp4`,
      `${command}-audio.json`,
      `${command}-validation.json`,
      'edit_decisions.json',
      'transcript.json',
      'media_probe.json',
      'editorial_quality.json',
      'quality_report.md',
      ...(command === 'preview' ? ['review.html'] : []),
    ].map((file) => path.join(dir, file)),
    [jobPath, ...mediaReferences(job).map(localFile)],
  );
  const renderFingerprint = rendererHash();
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
    staged = stage(job, id),
    props = staged.props;
  if (
    command === 'final' &&
    (job.approval?.assetHash !== staged.snapshotHash ||
      job.approval?.rendererHash !== renderFingerprint ||
      job.approval?.jobHash !== id)
  )
    throw new Error('As entradas mudaram após a aprovação; revise uma nova prévia');
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
  const chromiumOptions = SCENE3D_KINDS.some((kind) => job.motions?.some((m) => m.kind === kind))
    ? { gl: process.env.REELS_GL || 'angle' }
    : undefined;
  const composition = await selectComposition({
    serveUrl,
    id: 'PastoralReel',
    inputProps: props,
    browserExecutable,
    chromiumOptions,
  });
  const raw = path.join(dir, `${command}.raw.mp4`),
    file = path.join(dir, `${command}.mp4`);
  let lastProgress = 0;
  await renderMedia({
    composition,
    serveUrl,
    browserExecutable,
    chromiumOptions,
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
  verifyStage(job, staged);
  assertRendererUnchanged(root, renderFingerprint);
  if (job.audio?.normalize === false) fs.copyFileSync(raw, file);
  else write(path.join(dir, `${command}-audio.json`), normalize(raw, file, job.audio));
  const report = validateMedia(file, job);
  verifyStage(job, staged);
  assertRendererUnchanged(root, renderFingerprint);
  report.rendererFingerprint = renderFingerprint;
  write(path.join(dir, `${command}-validation.json`), report);
  fs.writeFileSync(
    path.join(dir, 'quality_report.md'),
    `# Verificação técnica\n\nEstado: ${report.status}\n\nArquivo: ${path.basename(file)}\nSHA-256: ${report.sha256}\nDuração esperada: ${report.expectedDuration}s; obtida: ${report.actualDuration}s\nPico: ${report.peakDb} dBFS; média: ${report.meanDb} dBFS\n\n${check.warnings.join('\n')}\n\nRevisão editorial: ${command === 'final' ? 'aprovação vinculada à EDL' : 'pendente; abrir review.html'}. Testes de mídia não comprovam fidelidade teológica.\n`,
  );
  if (report.errors.length) throw new Error(report.errors.join('\n'));
  if (command === 'preview')
    reviewPage(dir, job, check, id, renderFingerprint, staged.snapshotHash);
  console.log(file);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch((e) => {
    console.error(e.stack || e);
    process.exitCode = 1;
  });
