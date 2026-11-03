// Read-only inventory. It does not install tools or download models.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root, write } from './engine.mjs';
import { rendererFingerprint, FINGERPRINT_SCHEME } from './fingerprint.mjs';
const probe = (command, args) => {
  const r = spawnSync(command, args, { encoding: 'utf8', windowsHide: true, timeout: 30000 });
  return { available: r.status === 0, version: r.status === 0 ? r.stdout.split(/\r?\n/)[0] : null };
};
const packages = Object.fromEntries(
  [
    'remotion',
    '@remotion/renderer',
    '@remotion/bundler',
    '@remotion/three',
    '@react-three/fiber',
    'three',
    'react',
  ].map((name) => {
    const file = path.join(root, 'node_modules', name, 'package.json');
    return [name, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).version : null];
  }),
);
const python = spawnSync(
  'python',
  [
    '-c',
    [
      'import importlib.metadata as m, json, pathlib, sys',
      'names=["openai-whisper","faster-whisper","torch","mediapipe","opencv-python","numpy"]',
      'versions={}',
      'for name in names:',
      ' try: versions[name]=m.version(name)',
      ' except m.PackageNotFoundError: versions[name]=None',
      'cache=pathlib.Path.home()/".cache"/"whisper"',
      'print(json.dumps({"version":sys.version.split()[0],"packages":versions,"cachedWhisperModels":[p.stem for p in cache.glob("*.pt")]}))',
    ].join('\n'),
  ],
  { encoding: 'utf8', windowsHide: true, timeout: 30000 },
);
const report = {
  rendererFingerprint: rendererFingerprint(root),
  fingerprintScheme: FINGERPRINT_SCHEME,
  checkedAtUtc: new Date().toISOString(),
  platform: process.platform,
  node: process.version,
  ffmpeg: probe('ffmpeg', ['-version']),
  ffprobe: probe('ffprobe', ['-version']),
  packages,
  python: python.status === 0 ? JSON.parse(python.stdout) : { available: false },
  configuredBrowserExists: Boolean(
    process.env.REELS_BROWSER && fs.existsSync(process.env.REELS_BROWSER),
  ),
  segmentationModelAvailable: fs.existsSync(
    path.join(root, 'cache/models/selfie_segmenter.tflite'),
  ),
  faceDetectorModelAvailable: fs.existsSync(
    path.join(root, 'cache/models/blaze_face_short_range.tflite'),
  ),
  note: 'Installed versions and local files only. See render results for runtime proof. A missing browser environment variable does not mean Remotion cannot manage its own browser.',
};
if (process.argv[2]) write(path.resolve(process.argv[2]), report);
console.log(JSON.stringify(report, null, 2));
if (!report.ffmpeg.available || !report.ffprobe.available || !packages.remotion)
  process.exitCode = 1;
