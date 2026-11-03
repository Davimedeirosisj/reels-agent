import { MOTION_VARIANTS } from './motion-kinds.mjs';
import { validateGraph, graphLayout } from './diagrams.mjs';
import { validateEducation } from './education.mjs';
import { validateColor } from './color.mjs';
import { validateScene3d } from './scene3d.mjs';
export const frames = (seconds, fps) => Math.round(seconds * fps);
const finite = (n) => typeof n === 'number' && Number.isFinite(n);
// One source of truth for video, audio, captions and the review.
export function timeline(clips, fps) {
  let cursor = 0;
  return clips.map((c) => {
    const trimBefore = frames(c.start, fps),
      trimAfter = frames(c.end, fps);
    const item = {
      ...c,
      from: cursor,
      trimBefore,
      trimAfter,
      durationInFrames: trimAfter - trimBefore,
    };
    cursor += item.durationInFrames;
    return item;
  });
}
export function captionsForTimeline(segments, clips, fps) {
  return timeline(clips, fps).flatMap((c) =>
    segments
      .filter((s) => !s.source || s.source === c.source)
      .flatMap((s) => {
        const start = Math.max(frames(s.start, fps), c.trimBefore),
          end = Math.min(frames(s.end, fps), c.trimAfter);
        if (end <= start) return [];
        const words = (s.words || []).flatMap((w) => {
          const a = Math.max(start, frames(w.start, fps)),
            b = Math.min(end, frames(w.end, fps));
          const pointInside =
            a === b && frames(w.start, fps) >= start && frames(w.start, fps) < end;
          return b > a || pointInside
            ? [{ ...w, from: c.from + a - c.trimBefore, to: c.from + b - c.trimBefore }]
            : [];
        });
        return [
          {
            ...s,
            from: c.from + start - c.trimBefore,
            to: c.from + end - c.trimBefore,
            words,
            partial: start > frames(s.start, fps) || end < frames(s.end, fps),
          },
        ];
      }),
  );
}
export function validateJob(job) {
  const errors = [],
    warnings = [],
    fps = job.fps ?? 30;
  if (!Number.isInteger(fps) || fps < 1 || fps > 120)
    errors.push('fps deve ser inteiro entre 1 e 120');
  for (const k of ['width', 'height'])
    if (job[k] !== undefined && (!Number.isInteger(job[k]) || job[k] < 64 || job[k] % 2))
      errors.push(`${k} deve ser inteiro par >=64`);
  if (!Array.isArray(job.clips) || !job.clips.length) errors.push('clips não pode estar vazio');
  const last = new Map();
  const style = job.captionStyle || {};
  if (
    style.maxLines !== undefined &&
    (!Number.isInteger(style.maxLines) || style.maxLines < 1 || style.maxLines > 4)
  )
    errors.push('captionStyle.maxLines deve ser inteiro entre 1 e 4');
  if (style.maxLines !== undefined) {
    const max = style.fontSize ?? (style.mode === 'accessible' ? 64 : 56),
      min = style.minFontSize ?? 38;
    if (!finite(max) || !finite(min) || min < 16 || max < min)
      errors.push('Tamanhos de legenda inválidos para medição em pixels');
    for (const key of ['left', 'right', 'width', 'letterSpacing'])
      if (style[key] !== undefined && !finite(style[key]))
        errors.push(`captionStyle.${key} deve ser numérico para medição em pixels`);
  }
  for (const [i, c] of (job.clips || []).entries()) {
    for (const error of validateColor(c.color)) errors.push(`clip ${i}: ${error}`);
    if (typeof c.source !== 'string' || !c.source) errors.push(`clip ${i}: source ausente`);
    if (
      !finite(c.start) ||
      !finite(c.end) ||
      c.start < 0 ||
      c.end <= c.start ||
      frames(c.end, fps) <= frames(c.start, fps)
    )
      errors.push(`clip ${i}: intervalo inválido`);
    if (last.has(c.source) && c.start < last.get(c.source))
      errors.push(`clip ${i}: reordenação ou sobreposição da fala`);
    last.set(c.source, c.end);
    if (c.camera) {
      let previousTime = -1;
      if (!Array.isArray(c.camera) || !c.camera.length) errors.push(`clip ${i}: câmera vazia`);
      else
        for (const k of c.camera) {
          if (
            !finite(k.time) ||
            k.time < 0 ||
            k.time <= previousTime ||
            !finite(k.scale) ||
            k.scale < 1 ||
            k.scale > 3
          )
            errors.push(`clip ${i}: câmera inválida`);
          previousTime = k.time;
        }
    }
  }
  let prev = -1;
  for (const [i, s] of (job.transcript?.segments || []).entries()) {
    if (
      !finite(s.start) ||
      !finite(s.end) ||
      s.start < 0 ||
      s.end <= s.start ||
      typeof s.text !== 'string'
    )
      errors.push(`legenda ${i}: inválida`);
    if (s.start < prev) errors.push(`legenda ${i}: timestamps fora de ordem`);
    prev = s.start;
    if (s.text?.length > 170) warnings.push(`legenda ${i}: longa; dividir em unidades de leitura`);
    let end = s.start;
    for (const w of s.words || []) {
      if (
        !finite(w.start) ||
        !finite(w.end) ||
        w.start < end - 0.02 ||
        w.end < w.start ||
        w.end > s.end + 0.05
      )
        errors.push(`legenda ${i}: word timestamps inválidos`);
      end = w.end;
      if (frames(w.end, fps) === frames(w.start, fps))
        warnings.push(
          `legenda ${i}: palavra sem duração mensurável; preservar o texto sem estimar alinhamento`,
        );
    }
  }
  const duration = timeline(job.clips || [], fps).reduce((a, c) => a + c.durationInFrames, 0) / fps;
  for (const [i, m] of (job.motions || []).entries()) {
    for (const error of validateScene3d(m)) errors.push(`motion ${i}: ${error}`);
    if (['flowchart', 'network'].includes(m.kind))
      for (const e of validateGraph(m.graph)) errors.push(`motion ${i}: ${e}`);
    if (['flowchart', 'network'].includes(m.kind) && !validateGraph(m.graph).length) {
      try {
        graphLayout(m.graph, { kind: m.kind });
      } catch (e) {
        errors.push(`motion ${i}: ${e.message}`);
      }
    }
    for (const e of validateEducation(m, m.end - m.start)) errors.push(`motion ${i}: ${e}`);
    if (
      ['flowchart', 'network', 'question-answer', 'interface', 'definition'].includes(m.kind) &&
      !m.evidence
    )
      errors.push(`motion ${i}: registrar origem dos conceitos/relações ilustrados em evidence`);
    if (!MOTION_VARIANTS.includes(m.kind)) errors.push(`motion ${i}: tipo desconhecido ${m.kind}`);
    if (
      !finite(m.start) ||
      !finite(m.end) ||
      m.start < 0 ||
      m.end <= m.start ||
      m.end > duration + 1 / fps
    )
      errors.push(`motion ${i}: intervalo fora da edição`);
    if (m.kind === 'chart' && (!m.values?.length || m.values.some((v) => !finite(v) || v < 0)))
      errors.push(`motion ${i}: dados numéricos reais obrigatórios`);
    if (['chart', 'counter', 'kpi', 'verse', 'quote'].includes(m.kind) && !m.evidence)
      errors.push(`motion ${i}: evidência da citação/dados obrigatória`);
    if (
      ['steps', 'timeline', 'connections', 'circle', 'compare'].includes(m.kind) &&
      (!m.items?.length || m.items.length > 5)
    )
      errors.push(`motion ${i}: fornecer entre 1 e 5 itens legíveis`);
    if (m.position) {
      const p = m.position;
      if (!finite(p.x) || !finite(p.y) || !finite(p.width) || p.width <= 0)
        errors.push(`motion ${i}: posição inválida`);
      else if (
        p.x < 85 ||
        p.y < 150 ||
        p.x + p.width > (job.width || 1080) - 105 ||
        p.y + (p.height || 400) > (job.height || 1920) - 270
      )
        warnings.push(`motion ${i}: verificar safe areas na prévia`);
    }
    if (['broll', 'subject', 'object-wipe'].includes(m.kind) && !m.asset)
      errors.push(`motion ${i}: mídia autorizada obrigatória`);
    if (
      ['split-screen', 'editorial-layout'].includes(m.kind) &&
      (!m.panels?.length || m.panels.length > 6 || m.panels.some((p) => !p.asset))
    )
      errors.push(`motion ${i}: 1 a 6 painéis com mídia são necessários`);
    if (
      ['image-sequence', 'topic-montage'].includes(m.kind) &&
      (!m.items?.length || m.items.some((p) => !p.asset))
    )
      errors.push(`motion ${i}: sequência exige mídia em cada item`);
    if (m.kind === 'depth-scene' && (!m.layers?.length || m.layers.some((p) => !p.asset)))
      errors.push(`motion ${i}: camadas com mídia são necessárias`);
    if (m.layer === 'behind' && !job.foregroundSrc)
      errors.push(`motion ${i}: foreground com alpha necessário para texto atrás do pregador`);
  }
  if (errors.length) return { errors, warnings, durationInFrames: 0, captionCount: 0 };
  const captions = captionsForTimeline(job.transcript?.segments || [], job.clips || [], fps);
  if (captions.some((c) => c.partial))
    warnings.push(
      'Há legendas cortadas nos limites da EDL; conferir as palavras de entrada/saída.',
    );
  if (!(job.transcript?.segments || []).length)
    warnings.push('Sem transcrição: revisão da fala e legendas pendente.');
  return {
    errors,
    warnings,
    durationInFrames: frames(duration, fps),
    captionCount: captions.length,
  };
}
// Proposals preserve whole segments; pauses remain reviewable editorial decisions.
export function proposeCuts(transcript, source, { maxGap = 2, padding = 0.18 } = {}) {
  const groups = [];
  for (const s of transcript.segments || []) {
    if (!s.text?.trim()) continue;
    const last = groups.at(-1);
    if (last && s.start - last.end <= maxGap) last.end = s.end;
    else
      groups.push({
        source,
        start: s.start,
        end: s.end,
        reason: 'Unidade contínua; conferir contexto anterior e posterior.',
      });
  }
  return groups.map((g, i) => ({
    ...g,
    start: Math.max(0, g.start - padding),
    end: Math.min(i + 1 < groups.length ? groups[i + 1].start : g.end + padding, g.end + padding),
  }));
}
