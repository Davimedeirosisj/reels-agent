import { timeline } from './editorial.mjs';
const tokens = (text) =>
  String(text ?? '')
    .normalize('NFC')
    .toLocaleLowerCase('pt')
    .match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || [];
const finite = Number.isFinite;
function candidates(job, anchor) {
  if (!anchor || typeof anchor.phrase !== 'string' || !tokens(anchor.phrase).length)
    throw new Error('Âncora precisa de uma frase exata não vazia');
  const desired = tokens(anchor.phrase),
    fps = job.fps || 30;
  if (
    anchor.occurrence !== undefined &&
    (!Number.isInteger(anchor.occurrence) || anchor.occurrence < 1)
  )
    throw new Error('Occurrence da âncora começa em 1');
  if (
    anchor.clip !== undefined &&
    (!Number.isInteger(anchor.clip) || anchor.clip < 0 || anchor.clip >= job.clips.length)
  )
    throw new Error('Clip da âncora inválido');
  if (anchor.granularity !== undefined && !['word', 'segment'].includes(anchor.granularity))
    throw new Error('Granularity da âncora deve ser word ou segment');
  const sources = new Set(job.clips.map((c) => c.source));
  if (sources.size > 1 && (job.transcript?.segments || []).some((s) => !s.source))
    throw new Error('Transcrição sem source é ambígua para âncoras com várias mídias');
  const result = [];
  for (const [clipIndex, clip] of timeline(job.clips, fps).entries()) {
    if (anchor.clip !== undefined && anchor.clip !== clipIndex) continue;
    if (anchor.source !== undefined && anchor.source !== clip.source) continue;
    const segments = (job.transcript?.segments || []).filter(
      (s) => !s.source || s.source === clip.source,
    );
    const hits = [];
    if (anchor.granularity === 'segment') {
      for (const segment of segments)
        if (tokens(segment.text).join('\0') === desired.join('\0'))
          hits.push({ start: segment.start, end: segment.end, granularity: 'segment' });
    } else {
      const stream = [];
      for (const segment of segments) {
        const words = segment.words || [],
          text = words.flatMap((w) => tokens(w.word ?? w.text)).join('\0');
        // A removed or stale word alignment cannot supply precise anchors.
        if (!words.length || text !== tokens(segment.text).join('\0')) {
          stream.push({ token: null });
          continue;
        }
        for (const word of words) {
          const parts = tokens(word.word ?? word.text);
          for (const [partIndex, token] of parts.entries())
            stream.push({ token, word, partIndex, partCount: parts.length });
        }
      }
      for (let at = 0; at <= stream.length - desired.length; at++) {
        const span = stream.slice(at, at + desired.length);
        if (!span.every((item, i) => item.token === desired[i])) continue;
        if (span[0].partIndex !== 0 || span.at(-1).partIndex !== span.at(-1).partCount - 1)
          continue;
        const words = [...new Set(span.map((item) => item.word))];
        if (words.some((w) => !finite(w.start) || !finite(w.end) || w.end < w.start)) continue;
        hits.push({
          start: words[0].start,
          end: words.at(-1).end,
          granularity: 'word',
          firstTimed: words[0].end > words[0].start,
          lastTimed: words.at(-1).end > words.at(-1).start,
        });
      }
    }
    for (const hit of hits) {
      const from = Math.round(hit.start * fps),
        to = Math.round(hit.end * fps);
      if (
        !finite(hit.start) ||
        !finite(hit.end) ||
        from < clip.trimBefore ||
        to > clip.trimAfter ||
        to <= from
      )
        continue;
      result.push({
        ...hit,
        clipIndex,
        source: clip.source,
        sourceStart: hit.start,
        sourceEnd: hit.end,
        fromFrame: clip.from + from - clip.trimBefore,
        toFrame: clip.from + to - clip.trimBefore,
      });
    }
  }
  return result.sort((a, b) => a.fromFrame - b.fromFrame || a.toFrame - b.toFrame);
}
function resolve(job, anchor, defaultEdge) {
  const hits = candidates(job, anchor);
  if (hits.length > 1 && anchor.occurrence === undefined)
    throw new Error(`Âncora ambígua: informe occurrence, clip ou source para a frase`);
  const hit = hits[(anchor.occurrence || 1) - 1];
  if (!hit)
    throw new Error('Frase da âncora não encontrada intacta na edição com timestamps utilizáveis');
  const edge = anchor.edge || defaultEdge,
    offset = anchor.offset ?? 0,
    fps = job.fps || 30;
  if (!['start', 'end'].includes(edge) || !finite(offset))
    throw new Error('Edge/offset da âncora inválido');
  if (hit.granularity === 'word' && !(edge === 'start' ? hit.firstTimed : hit.lastTimed))
    throw new Error('Palavra da âncora sem duração mensurável; escolha outra borda/frase');
  return {
    frame: (edge === 'start' ? hit.fromFrame : hit.toFrame) + Math.round(offset * fps),
    trace: { phrase: anchor.phrase, ...hit, edge, offset },
  };
}
export function resolveSpeechAnchors(job) {
  const result = structuredClone(job),
    fps = job.fps || 30;
  result.motions = (result.motions || []).map((event) => {
    if (!event.anchor && !event.endAnchor) return event;
    if (!event.anchor) throw new Error('EndAnchor precisa de uma âncora inicial');
    const start = resolve(job, event.anchor, 'start');
    let end, endTrace;
    if (event.endAnchor) {
      if (event.duration !== undefined) throw new Error('Escolha duration ou endAnchor, não ambos');
      const target = resolve(job, event.endAnchor, 'end');
      end = target.frame;
      endTrace = target.trace;
    } else if (event.duration !== undefined) {
      if (!finite(event.duration) || event.duration <= 0)
        throw new Error('Duration visual deve ser positiva');
      end = start.frame + Math.round(event.duration * fps);
    } else {
      if (start.trace.granularity === 'word' && !start.trace.lastTimed)
        throw new Error(
          'Fim da frase sem duração mensurável; forneça duration visual ou outra endAnchor',
        );
      end = start.trace.toFrame + Math.round((event.anchor.offset ?? 0) * fps);
    }
    const total = timeline(job.clips, fps).reduce((n, c) => n + c.durationInFrames, 0);
    if (start.frame < 0 || end <= start.frame || end > total)
      throw new Error('Intervalo visual ancorado fora da edição ou sem duração');
    return {
      ...event,
      start: start.frame / fps,
      end: end / fps,
      resolvedSpeechAnchor: {
        start: start.trace,
        ...(endTrace ? { end: endTrace } : {}),
        timingSource:
          start.trace.granularity === 'word'
            ? 'transcript-word-timestamps'
            : 'explicit-whole-segment-timestamps',
      },
    };
  });
  return result;
}
