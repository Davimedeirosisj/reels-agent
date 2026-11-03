import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { root, read, write, fileDigest, probe, renderSourceVideo } from './engine.mjs';
import { rendererFingerprint } from './fingerprint.mjs';
import { applyOperations } from '../src/operations.mjs';
import { foregroundGeometry } from '../src/foreground.mjs';
import { validateJob, timeline } from '../src/editorial.mjs';
const local = (source) =>
  path.isAbsolute(source) ? source : path.resolve(root, 'public', source.replace(/^\//, ''));
const key = (file) =>
  process.platform === 'win32' ? path.resolve(file).toLowerCase() : path.resolve(file);
async function segment(args) {
  await new Promise((resolve, reject) => {
    const child = spawn('python', [path.join(root, 'tools/segment_subject.py'), ...args], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let errors = '';
    child.stdout.on('data', (bytes) => process.stdout.write(bytes));
    child.stderr.on('data', (bytes) => {
      errors += bytes;
      process.stderr.write(bytes);
    });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Segmentação falhou (${code}): ${errors.slice(-3000)}`)),
    );
  });
}
export async function prepareForeground(input, outputDirectory) {
  const job = applyOperations(input),
    options = job.foregroundOptions || {},
    dir = path.resolve(outputDirectory);
  const check = validateJob({
    ...job,
    foregroundPreparation: undefined,
    foregroundSrc: 'preparing.webm',
  });
  if (check.errors.length) throw new Error(check.errors.join('\n'));
  const model = options.model
    ? path.resolve(options.model)
    : path.join(root, 'cache/models/selfie_segmenter.tflite');
  if (!fs.existsSync(model))
    throw new Error('Instale o modelo de segmentação local antes de preparar a camada');
  const smoothing = options.smoothing ?? 0.15;
  const crf = options.crf ?? 16,
    lossless = options.lossless === true;
  if (!Number.isInteger(crf) || crf < 0 || crf > 63)
    throw new Error('CRF deve ser inteiro entre 0 e 63');
  if (!Number.isFinite(smoothing) || smoothing < 0 || smoothing >= 1)
    throw new Error('Smoothing deve ficar entre 0 e 1, excluindo 1');
  const sourceBinding = [...new Set(job.clips.map((c) => c.source))]
    .sort()
    .map((source) => ({ source, sha256: fileDigest(local(source)) }));
  const geometry = foregroundGeometry(job),
    renderer = rendererFingerprint(root);
  const baseKey = crypto
    .createHash('sha256')
    .update(JSON.stringify({ geometry, sourceBinding, renderer }))
    .digest('hex');
  const state = {
    geometry,
    sourceBinding,
    renderer,
    model: fileDigest(model),
    segmenter: fileDigest(path.join(root, 'tools/segment_subject.py')),
    preparer: fileDigest(fileURLToPath(import.meta.url)),
    options: { smoothing, motionCompensation: options.motionCompensation !== false, crf, lossless },
  };
  const cacheKey = crypto.createHash('sha256').update(JSON.stringify(state)).digest('hex');
  const base = path.join(dir, 'edited-source.mp4'),
    layer = path.join(dir, 'foreground.webm'),
    layerReport = path.join(dir, 'foreground.json'),
    sourceManifestFile = path.join(dir, 'source-manifest.json'),
    sourceValidationFile = path.join(dir, 'source-validation.json'),
    manifestFile = path.join(dir, 'prepare-manifest.json'),
    output = path.join(dir, 'job.with-foreground.json');
  const protectedFiles = [
    base,
    layer,
    layerReport,
    manifestFile,
    output,
    sourceManifestFile,
    sourceValidationFile,
  ];
  if (protectedFiles.some((file) => job.clips.some((c) => key(file) === key(local(c.source)))))
    throw new Error('A preparação não pode sobrescrever a gravação de origem');
  fs.mkdirSync(dir, { recursive: true });
  let manifest = null;
  try {
    if (fs.existsSync(manifestFile)) manifest = read(manifestFile);
  } catch {
    /* An interrupted cache is rebuilt without declaring it valid. */
  }
  let reused = manifest?.cacheKey === cacheKey && [base, layer, layerReport].every(fs.existsSync);
  if (reused)
    reused =
      fileDigest(base) === manifest.baseSha256 &&
      fileDigest(layer) === manifest.foregroundSha256 &&
      fileDigest(layerReport) === manifest.reportSha256;
  if (!reused) {
    let sourceManifest = null;
    try {
      if (fs.existsSync(sourceManifestFile)) sourceManifest = read(sourceManifestFile);
    } catch {
      /* Rebuild an interrupted source render. */
    }
    const baseReused =
      sourceManifest?.baseKey === baseKey &&
      fs.existsSync(base) &&
      fs.existsSync(sourceValidationFile) &&
      fileDigest(base) === sourceManifest.baseSha256 &&
      fileDigest(sourceValidationFile) === sourceManifest.validationSha256;
    if (!baseReused) {
      console.log('Preparando tomadas, câmera e cor para a máscara...');
      const sourceValidation = await renderSourceVideo(job, base);
      write(sourceValidationFile, sourceValidation);
      write(sourceManifestFile, {
        baseKey,
        baseSha256: fileDigest(base),
        validationSha256: fileDigest(sourceValidationFile),
      });
    } else console.log('Reutilizando tomadas validadas; recalculando somente a máscara...');
    const cuts = timeline(job.clips, job.fps || 30)
      .slice(1)
      .map((c) => c.from);
    const args = [
      base,
      layer,
      '--model',
      model,
      '--smoothing',
      String(smoothing),
      '--cut-frames',
      cuts.join(','),
      '--crf',
      String(crf),
    ];
    if (lossless) args.push('--lossless');
    if (options.motionCompensation === false) args.push('--no-motion-compensation');
    await segment(args);
    const masked = read(layerReport),
      video = probe(layer),
      stream = video.streams.find((s) => s.codec_type === 'video');
    if (
      masked.frames !== check.durationInFrames ||
      Math.abs(masked.fps - (job.fps || 30)) > 0.001 ||
      stream.width !== (job.width || 1080) ||
      stream.height !== (job.height || 1920) ||
      video.streams.some((s) => s.codec_type === 'audio')
    )
      throw new Error('A camada não corresponde aos frames/formato da edição');
    const sample = masked.tracks.find((t) => t.bounds);
    if (!sample) throw new Error('Nenhuma região de pessoa utilizável foi detectada');
    const decoded = spawnSync(
      'ffmpeg',
      ['-v', 'error', '-xerror', '-c:v', 'libvpx-vp9', '-i', layer, '-f', 'null', '-'],
      { encoding: 'utf8', windowsHide: true, maxBuffer: 8e6 },
    );
    if (decoded.status !== 0 || decoded.stderr.trim())
      throw new Error('Falha de decodificação integral da camada alpha: ' + decoded.stderr);
    const alpha = spawnSync(
      'ffmpeg',
      [
        '-v',
        'error',
        '-ss',
        String(sample.frame / masked.fps),
        '-c:v',
        'libvpx-vp9',
        '-i',
        layer,
        '-vf',
        'alphaextract,scale=160:284',
        '-frames:v',
        '1',
        '-f',
        'rawvideo',
        '-pix_fmt',
        'gray',
        '-',
      ],
      { windowsHide: true, maxBuffer: 1e6 },
    );
    if (alpha.status !== 0 || !alpha.stdout?.length)
      throw new Error('Alpha não pôde ser decodificado');
    let minimum = 255,
      maximum = 0;
    for (const value of alpha.stdout) {
      minimum = Math.min(minimum, value);
      maximum = Math.max(maximum, value);
    }
    if (maximum < 64) throw new Error('Alpha codificado vazio apesar da detecção');
    if (
      rendererFingerprint(root) !== renderer ||
      sourceBinding.some((item) => fileDigest(local(item.source)) !== item.sha256)
    )
      throw new Error('Código ou mídia mudou durante a preparação; repita com a versão estável');
    manifest = {
      cacheKey,
      baseKey,
      baseReused,
      baseSha256: fileDigest(base),
      foregroundSha256: fileDigest(layer),
      reportSha256: fileDigest(layerReport),
      alphaSample: { frame: sample.frame, minimum, maximum },
      fullAlphaDecodePassed: true,
    };
    write(manifestFile, manifest);
  }
  const report = read(layerReport);
  delete job.approval;
  job.foregroundSrc = layer;
  job.foregroundPreparation = {
    geometry,
    request: structuredClone(job.foregroundOptions || {}),
    rendererFingerprint: renderer,
    sourceBinding,
    foregroundSha256: manifest.foregroundSha256,
    frames: report.frames,
    fps: report.fps,
    modelSha256: report.modelSha256,
    missingRanges: report.missingRanges,
    boundsTrack: report.protectedAreas,
    manualReviewRequired: true,
    trackingScope: 'Union of foreground regions; no identity recognition',
    fullAlphaDecodePassed: true,
  };
  const ready = validateJob(job);
  if (ready.errors.length) throw new Error(ready.errors.join('\n'));
  write(output, job);
  return {
    output,
    reused,
    frames: report.frames,
    emptyFrames: report.emptyFrames,
    alphaSample: manifest.alphaSample,
    manualReviewRequired: true,
  };
}
