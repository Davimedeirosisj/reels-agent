// Corrections are proposals. Never infer new word timings or semantic approval.
const normalize = (text) => String(text).trim().replace(/\s+/gu, ' ');
const wordText = (word) => normalize(word.word ?? word.text ?? '');
function matcher(from, sensitive) {
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, sensitive ? 'gu' : 'giu');
}
function alignedText(segment) {
  const words = segment.words || [];
  let text = '';
  const spans = words.map((word, index) => {
    const token = wordText(word),
      start = text.length + (text ? 1 : 0);
    text += (text ? ' ' : '') + token;
    return { index, start, end: text.length, word };
  });
  const aligned =
    words.length > 0 &&
    text === normalize(segment.text) &&
    words.every((w) => Number.isFinite(w.start) && Number.isFinite(w.end));
  return { text: aligned ? text : normalize(segment.text), spans: aligned ? spans : [], aligned };
}
export function correctTranscript(input, corrections = []) {
  const transcript = structuredClone(input),
    changes = [];
  if (!Array.isArray(transcript.segments) || !Array.isArray(corrections))
    throw new Error('Transcrição e correções precisam de listas válidas');
  for (const [requestIndex, correction] of corrections.entries()) {
    if (
      !correction ||
      typeof correction.from !== 'string' ||
      !correction.from.trim() ||
      typeof correction.to !== 'string' ||
      !correction.to.trim()
    )
      throw new Error(
        'Correção precisa de from/to não vazios; remoção de fala não é correção ortográfica',
      );
    const from = normalize(correction.from),
      to = normalize(correction.to);
    const scoped = correction.start !== undefined || correction.end !== undefined;
    if (
      scoped &&
      (!Number.isFinite(correction.start) ||
        !Number.isFinite(correction.end) ||
        correction.start < 0 ||
        correction.end <= correction.start)
    )
      throw new Error('Correção temporal precisa de start/end válidos na gravação original');
    if (
      correction.segment !== undefined &&
      (!Number.isInteger(correction.segment) ||
        correction.segment < 0 ||
        correction.segment >= transcript.segments.length)
    )
      throw new Error('Índice de segmento da correção inválido');
    if (
      correction.occurrence !== undefined &&
      (!Number.isInteger(correction.occurrence) || correction.occurrence < 1)
    )
      throw new Error('Occurrence deve ser um inteiro positivo, começando em 1');
    const candidates = [];
    for (const [index, segment] of transcript.segments.entries()) {
      if (correction.segment !== undefined && correction.segment !== index) continue;
      if (correction.source !== undefined && correction.source !== segment.source) continue;
      const aligned = alignedText(segment);
      for (const match of aligned.text.matchAll(matcher(from, correction.caseSensitive === true))) {
        const spans = aligned.spans.filter(
          (s) => s.start < match.index + match[0].length && s.end > match.index,
        );
        const start = spans.length ? spans[0].word.start : segment.start;
        const end = spans.length ? spans.at(-1).word.end : segment.end;
        // An unaligned phrase may only be corrected when its whole segment is
        // inside the requested interval. Do not guess which occurrence was said.
        if (scoped && !(start >= correction.start && end <= correction.end)) continue;
        candidates.push({
          index,
          segment,
          ...aligned,
          match,
          spans,
          startTime: start,
          endTime: end,
        });
      }
    }
    const selected =
      correction.occurrence === undefined
        ? candidates
        : [candidates[correction.occurrence - 1]].filter(Boolean);
    if (!selected.length)
      throw new Error(
        `Correção ${requestIndex + 1}: nenhuma ocorrência exata no intervalo informado`,
      );
    if (selected.length > 1 && correction.all !== true)
      throw new Error(
        `Correção ${requestIndex + 1} ambígua: use start/end, segment, occurrence ou all explícito`,
      );
    const groups = new Map();
    for (const candidate of selected) {
      if (!groups.has(candidate.index)) groups.set(candidate.index, []);
      groups.get(candidate.index).push(candidate);
    }
    for (const [index, matches] of groups) {
      const segment = transcript.segments[index],
        before = segment.text;
      let text = matches[0].text;
      const reset = matches.some((c) => !c.aligned || c.spans.length !== 1 || /\s/u.test(to));
      for (const candidate of [...matches].sort((a, b) => b.match.index - a.match.index)) {
        const { match } = candidate;
        text = text.slice(0, match.index) + to + text.slice(match.index + match[0].length);
        if (!reset) {
          const span = candidate.spans[0],
            word = segment.words[span.index],
            field = word.word !== undefined ? 'word' : 'text';
          const token = wordText(word),
            offset = match.index - span.start;
          word[field] = token.slice(0, offset) + to + token.slice(offset + match[0].length);
        }
        changes.push({
          from,
          to,
          segment: index,
          start: candidate.startTime,
          end: candidate.endTime,
          ...(segment.source ? { source: segment.source } : {}),
          wordAlignmentReset: reset,
        });
      }
      segment.text = text;
      if (reset) {
        delete segment.words;
        segment.wordAlignment = {
          status: 'removed-after-text-correction',
          requiresRealignment: true,
        };
      }
      for (const change of changes.filter((c) => c.segment === index && c.before === undefined)) {
        change.before = before;
        change.after = text;
      }
    }
  }
  if (changes.length)
    transcript.provenance = {
      ...transcript.provenance,
      agentOrthographicCorrections: [
        ...(transcript.provenance?.agentOrthographicCorrections || []),
        ...changes,
      ],
      human_reviewed: false,
    };
  return { transcript, changes };
}
