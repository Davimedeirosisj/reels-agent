import { captionPages } from './captions.mjs';
import { timeline, captionsForTimeline } from './editorial.mjs';
import { captionAppearance } from './accessibility.mjs';
import { analyzeVisualPace } from './pace.mjs';
export { contrastRatio } from './accessibility.mjs';
export const intersects = (a, b) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const overlaps = (a, b) => a.start < b.end && a.end > b.start;
export function qualityReview(job) {
  const fps = job.fps || 30,
    cuts = timeline(job.clips, fps),
    captions = captionsForTimeline(job.transcript?.segments || [], job.clips, fps),
    pages = captionPages(captions, job.captionStyle),
    reading = [];
  for (const [i, page] of pages.entries()) {
    const duration = (page.to - page.from) / fps,
      wordCount = page.words?.length || page.text.trim().split(/\s+/).length;
    if (wordCount / Math.max(duration, 0.001) > (job.quality?.maxWordsPerSecond ?? 4))
      reading.push({
        page: i,
        words: wordCount,
        seconds: duration,
        start: page.from / fps,
        end: page.to / fps,
        reason: 'Velocidade de leitura alta; revisar paginação e a gravação, sem inventar tempos.',
      });
  }
  const conflicts = [];
  for (const [i, m] of (job.motions || []).entries()) {
    if (['particles', 'light', 'pause'].includes(m.kind)) continue;
    const rect = m.position || { x: 85, y: 650, width: 880, height: 400 };
    for (const zone of job.protectedAreas || [])
      if (overlaps(m, zone) && intersects({ ...rect, height: rect.height || 400 }, zone))
        conflicts.push({
          motion: i,
          area: zone.label || 'sujeito',
          reason: 'Evento visual intercepta área protegida no mesmo período.',
        });
  }
  const cutLengths = cuts.map((c, i) => ({ index: i, seconds: c.durationInFrames / fps }));
  return {
    captionReadingWarnings: reading,
    protectedAreaConflicts: conflicts,
    cutLengths,
    tooShortCuts: cutLengths.filter((c) => c.seconds < (job.quality?.minCutSeconds ?? 0.25)),
    captionContrast:
      job.captionStyle?.enabled === false
        ? { enabled: false, minimumContrast: null }
        : captionAppearance(job.captionStyle),
    visualPace: analyzeVisualPace(job),
    scope:
      'Heurísticas de leitura/posição, sem certificação de acessibilidade ou fidelidade bíblica. Avaliação visual e editorial permanece necessária.',
  };
}
