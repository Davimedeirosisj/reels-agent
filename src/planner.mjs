import { captionsForTimeline } from './editorial.mjs';
// Conservative suggestions with traceable excerpts. The caller may replace the whole plan.
const referenceStyles = {
  V01: 'kinetic',
  V02: 'title',
  V03: 'impact',
  V04: 'counter',
  V05: 'tracking',
  V06: 'cube3d',
  V07: 'steps',
  V08: 'terminal',
  V09: 'blueprint',
  V10: 'cards3d',
  'PM-001': 'kinetic',
  'PM-002': 'steps',
  'PM-003': 'shapes',
  'PM-004': 'particles',
  'PM-005': 'chart',
};
export function suggestMotions(job, { verifiedReferences = [] } = {}) {
  const brief = job.brief || {},
    fps = job.fps || 30;
  if (brief.motion === 'none' || brief.style === 'contemplative') return [];
  const captions = captionsForTimeline(job.transcript?.segments || [], job.clips, fps),
    events = [];
  const verified = new Map(verifiedReferences.map((r) => [r.id, r]));
  const explicit = brief.references?.find((r) => referenceStyles[r] || verified.has(r)),
    requested =
      referenceStyles[explicit] || verified.get(explicit)?.runtimeTechniqueCandidates?.[0];
  for (const annotation of brief.visualAnnotations || []) {
    if (annotation.kind === 'question-answer') {
      const q = captions[annotation.questionCaptionIndex],
        a = captions[annotation.answerCaptionIndex];
      if (!q || !a || q.partial || a.partial || a.from <= q.from) continue;
      events.push({
        kind: 'question-answer',
        start: q.from / fps,
        end: a.to / fps,
        question: q.text,
        answer: a.text,
        answerAt: (a.from - q.from) / fps,
        evidence:
          'Trechos literais da transcrição; relação pergunta/resposta indicada no briefing.',
        referenceId: annotation.referenceId || explicit || 'A074',
        reason: 'Pergunta e resposta fornecidas como anotação editorial; conferir contexto.',
        position: annotation.position || brief.motionPosition,
      });
    } else if (['flowchart', 'network', 'interface', 'definition'].includes(annotation.kind)) {
      const c = captions[annotation.captionIndex];
      if (!c || c.partial || !annotation.evidence) continue;
      events.push({
        ...annotation,
        start: c.from / fps,
        end: c.to / fps,
        referenceId: annotation.referenceId || explicit,
        reason:
          'Relações e conteúdo visual fornecidos no briefing, sem inferir causalidade da fala.',
      });
    }
  }
  for (const [index, c] of captions.entries()) {
    const clean = c.text.trim(),
      words = clean.split(/\s+/),
      timed = c.to - c.from;
    if (c.partial || timed < fps * 1.4) continue;
    let kind, reason;
    if (
      requested &&
      ['terminal', 'blueprint', 'tracking', 'kinetic', 'title', 'impact'].includes(requested)
    ) {
      kind = requested;
      reason = `Referência ${explicit} solicitada; trecho literal da transcrição.`;
    } else if (brief.style === 'dynamic' && words.length <= 8 && /[!?]$/.test(clean)) {
      kind = 'impact';
      reason = 'Frase curta enfática; confirmar intenção e contexto na revisão.';
    } else continue;
    if (events.length && c.from / fps - events.at(-1).end < 2) continue;
    events.push({
      kind,
      start: c.from / fps,
      end: c.to / fps,
      text: clean,
      referenceId: explicit || 'PM-001',
      reason,
      transcriptSegment: index,
      position: brief.motionPosition || { x: 85, y: 650, width: 880 },
    });
  }
  return events;
}
