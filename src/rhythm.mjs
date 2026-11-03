import { timeline, frames } from './editorial.mjs';
export function mapSourceBeats(analysis, clips, fps) {
  return timeline(clips, fps)
    .flatMap((c) =>
      (analysis[c.source]?.onsetCandidates || [])
        .filter((t) => t >= c.start && t < c.end)
        .map((t) => (c.from + frames(t, fps) - c.trimBefore) / fps),
    )
    .sort((a, b) => a - b);
}
export function snapVisualEvents(events, beats, { tolerance = 0.12, fps = 30 } = {}) {
  return events.map((e) => {
    if (!e.syncToBeat || !beats.length) return { ...e };
    if (
      e.beatAlignment &&
      Math.abs(e.start - e.beatAlignment.matchedBeat) <= 1 / fps &&
      beats.includes(e.beatAlignment.matchedBeat)
    )
      return { ...e };
    const closest = beats.reduce((a, b) => (Math.abs(b - e.start) < Math.abs(a - e.start) ? b : a));
    if (Math.abs(closest - e.start) > tolerance || closest >= e.end - 1 / fps) return { ...e };
    const start = Math.max(0, frames(closest, fps) / fps);
    return {
      ...e,
      start,
      beatAlignment: { originalStart: e.start, matchedBeat: closest },
      reason: [e.reason, 'Entrada visual aproximada do onset; fala e cortes preservados.']
        .filter(Boolean)
        .join(' '),
    };
  });
}
export function beatsToSources(beats, clips, fps) {
  const result = {};
  for (const c of timeline(clips, fps))
    for (const t of beats) {
      const f = frames(t, fps);
      if (f >= c.from && f < c.from + c.durationInFrames)
        (result[c.source] ??= []).push((f - c.from + c.trimBefore) / fps);
    }
  return result;
}
export function beatCutCandidates(transcript, beats, { tolerance = 0.12 } = {}) {
  // Only propose a beat in a gap between complete transcript segments.
  const candidates = [];
  const segments = transcript.segments || [];
  for (let i = 1; i < segments.length; i++) {
    const previous = segments[i - 1],
      next = segments[i];
    if (!/[.!?]$/.test(previous.text.trim()) || next.start <= previous.end) continue;
    const nearest = beats
      .filter((t) => t >= previous.end && t <= next.start)
      .sort((a, b) => Math.abs(a - next.start) - Math.abs(b - next.start))[0];
    if (nearest !== undefined && Math.abs(nearest - next.start) <= tolerance)
      candidates.push({
        sourceTime: nearest,
        previousSegment: i - 1,
        nextSegment: i,
        reviewRequired: true,
        reason: 'Batida em pausa entre frases completas; contexto precisa de revisão.',
      });
  }
  return candidates;
}
