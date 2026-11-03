import fs from 'node:fs';
import path from 'node:path';
import { read, write, root } from './engine.mjs';
import { proposeCuts } from '../src/editorial.mjs';
const transcript = read(path.join(root, 'public/demo-transcript.json'));
const clips = proposeCuts(transcript, 'demo-input.mp4', { maxGap: 1, padding: 0.15 });
clips.forEach(
  (c) =>
    (c.camera = [
      { time: 0, scale: 1, x: 50, y: 45 },
      { time: c.end - c.start, scale: 1.03, x: 50, y: 45 },
    ]),
);
const duration =
  clips.reduce((s, c) => s + Math.round(c.end * 30) - Math.round(c.start * 30), 0) / 30;
const job = {
  fps: 30,
  width: 1080,
  height: 1920,
  fixture: { source: 'FFmpeg testsrc2 + Windows Zira local TTS', isSermon: false },
  clips,
  transcript,
  title: { text: 'DEMONSTRAÇÃO\nDO MOTOR', start: 0, duration: 2.5, fontSize: 72 },
  captionStyle: { box: true, fontSize: 50 },
  theme: { fit: 'cover', accent: '#e7bd78' },
  audio: { normalize: true },
  motions: [
    {
      kind: 'lower-third',
      start: 0,
      end: Math.min(3, duration),
      text: 'MÍDIA SINTÉTICA',
      subtitle: 'Voz TTS • transcrição Whisper real',
      position: { x: 85, y: 1290, width: 880 },
      fontSize: 36,
    },
    {
      kind: 'terminal',
      start: 3,
      end: Math.min(5.5, duration),
      text: 'Preservar as palavras e a sequência.',
      position: { x: 85, y: 660, width: 880 },
    },
    {
      kind: 'steps',
      start: 5.5,
      end: Math.min(8, duration),
      items: ['Inspecionar', 'Editar', 'Conferir'],
      position: { x: 85, y: 650, width: 880 },
    },
    { kind: 'particles', start: 8, end: Math.min(10, duration), count: 18 },
    {
      kind: 'blueprint',
      start: 10,
      end: Math.min(12.5, duration),
      text: 'A mensagem orienta o visual',
      position: { x: 85, y: 690, width: 880 },
    },
  ].filter((m) => m.end > m.start),
};
write(path.join(root, 'public/demo-props.json'), job);
// A different authored plate for image/subject overlays. No borrowed media.
fs.writeFileSync(
  path.join(root, 'public/demo-art.svg'),
  '<svg xmlns="http://www.w3.org/2000/svg" width="880" height="500" viewBox="0 0 880 500"><rect width="880" height="500" rx="30" fill="#122e40"/><circle cx="440" cy="250" r="150" fill="none" stroke="#e7bd78" stroke-width="3"/><path d="M180 340L340 180L500 340L660 180" fill="none" stroke="#fff" stroke-width="6"/><text x="440" y="440" text-anchor="middle" fill="white" font-family="Arial" font-size="24">ILUSTRAÇÃO AUTORAL DE TESTE</text></svg>',
);
console.log({
  clips: clips.length,
  duration,
  segments: transcript.segments.length,
  words: transcript.segments.reduce((n, s) => n + s.words.length, 0),
});
