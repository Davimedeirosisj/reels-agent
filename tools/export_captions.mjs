import { captionsForTimeline } from '../src/editorial.mjs';
import { captionPages } from '../src/captions.mjs';
const stamp = (frame, fps) => {
  const ms = Math.round((frame / fps) * 1000);
  const h = Math.floor(ms / 3600000),
    m = Math.floor(ms / 60000) % 60,
    s = Math.floor(ms / 1000) % 60;
  return (
    [h, m, s].map((v) => String(v).padStart(2, '0')).join(':') +
    ',' +
    String(ms % 1000).padStart(3, '0')
  );
};
export function exportSrt(job, format = 'srt') {
  if (!['srt', 'vtt'].includes(format)) throw new Error('Formato de legenda inválido');
  const fps = job.fps || 30;
  const pages = captionPages(
    captionsForTimeline(job.transcript?.segments || [], job.clips, fps),
    job.captionStyle,
  );
  const body = pages
    .map((page, index) => {
      const text = String(page.text).replace(/\r?\n/g, ' ').trim();
      if (!text || !Number.isFinite(page.from) || !Number.isFinite(page.to) || page.to <= page.from)
        throw new Error('Legenda SRT sem texto ou intervalo real utilizável');
      // Escape markup interpreted by some subtitle players; do not hide words.
      const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const time = (frame) =>
        format === 'srt' ? stamp(frame, fps) : stamp(frame, fps).replace(',', '.');
      return `${index + 1}\n${time(page.from)} --> ${time(page.to)}\n${safe}\n`;
    })
    .join('\n');
  return (format === 'vtt' ? 'WEBVTT\n\n' : '') + body;
}
