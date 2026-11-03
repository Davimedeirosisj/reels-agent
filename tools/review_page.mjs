import { captionsForTimeline } from '../src/editorial.mjs';
import { exportSrt } from './export_captions.mjs';
export function reviseTranscript(job, changes, { anchorTiming = 'realign' } = {}) {
  if (!['realign', 'keep-preview'].includes(anchorTiming))
    throw new Error('Escolha uma política de tempo para as âncoras');
  const copy = structuredClone(job),
    segments = copy.transcript?.segments || [],
    revisions = [];
  for (const [index, text] of Object.entries(changes)) {
    const i = Number(index),
      segment = segments[i],
      replacement = String(text).trim();
    if (!Number.isInteger(i) || !segment || !replacement)
      throw new Error('Selecione uma legenda válida e mantenha seu texto.');
    if (replacement === segment.text) continue;
    revisions.push({
      segment: i,
      previousText: segment.text,
      correctedText: replacement,
      wordAlignmentReset: true,
    });
    segment.text = replacement;
    segment.words = [];
  }
  if (!revisions.length) throw new Error('Nenhuma correção de texto encontrada.');
  const anchorAdjustments = [];
  for (const [index, event] of (copy.motions || []).entries()) {
    if (!event.anchor && !event.endAnchor) continue;
    const traces = [event.resolvedSpeechAnchor?.start, event.resolvedSpeechAnchor?.end].filter(
      Boolean,
    );
    const affected = revisions.filter((revision) => {
      const segment = segments[revision.segment];
      return (
        !traces.length ||
        traces.some(
          (trace) =>
            (!segment.source || segment.source === trace.source) &&
            trace.sourceStart < segment.end &&
            trace.sourceEnd > segment.start,
        )
      );
    });
    if (!affected.length) continue;
    const status = anchorTiming === 'keep-preview' ? 'manual-preview-timing' : 'needs-realignment';
    if (
      anchorTiming === 'keep-preview' &&
      (!Number.isFinite(event.start) || !Number.isFinite(event.end) || event.end <= event.start)
    )
      throw new Error('Não há um intervalo de prévia válido para preservar nessa âncora');
    event.anchorReview = {
      status,
      segments: affected.map((r) => r.segment),
      previousAnchor: event.anchor,
      previousEndAnchor: event.endAnchor,
      previousResolution: event.resolvedSpeechAnchor,
      previewStart: event.start,
      previewEnd: event.end,
      manualReviewRequired: true,
    };
    anchorAdjustments.push({ motion: index, status, segments: affected.map((r) => r.segment) });
    if (anchorTiming === 'keep-preview') {
      delete event.anchor;
      delete event.endAnchor;
      delete event.resolvedSpeechAnchor;
      event.paceFlexible = false;
      event.syncToBeat = false;
    }
  }
  if (anchorAdjustments.length)
    copy.review = {
      ...copy.review,
      anchorAdjustments: [
        ...(copy.review?.anchorAdjustments || []).filter(
          (old) => !anchorAdjustments.some((next) => next.motion === old.motion),
        ),
        ...anchorAdjustments,
      ].sort((a, b) => a.motion - b.motion),
    };
  delete copy.approval;
  copy.transcript.provenance = {
    ...copy.transcript.provenance,
    human_reviewed: false,
    manualTextRevisions: [...(copy.transcript.provenance?.manualTextRevisions || []), ...revisions],
  };
  return copy;
}
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
export function makeReviewPage(job, binding, check) {
  const keys = ['messageFaithful', 'captionsCorrect', 'framingSafe', 'audioClear'],
    segments = job.transcript?.segments || [],
    fps = job.fps || 30;
  const mapped = captionsForTimeline(
    segments.map((s, i) => ({ ...s, originalIndex: i })),
    job.clips,
    fps,
  );
  const entries = segments
    .map((s, i) => {
      const part = mapped.find((c) => c.originalIndex === i),
        time = part ? part.from / fps : null;
      return `<div class="entry"><button type="button" data-seek="${time ?? ''}" ${time === null ? 'disabled' : ''}>${time === null ? 'Fora da edição' : time.toFixed(2) + 's'}</button><label>Legenda ${i + 1}<textarea data-index="${i}" rows="3">${escape(s.text)}</textarea></label>${s.words?.some((w) => w.end === w.start) ? '<small>Há palavra sem duração mensurável. Confira com o áudio.</small>' : ''}</div>`;
    })
    .join('');
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Revisar o corte — Reels Agent</title>
<style>body{font:18px system-ui;background:#101820;color:#eee;max-width:1000px;margin:30px auto;padding:20px}video{max-height:65vh;max-width:100%;display:block;margin:auto}label{display:block;margin:18px 0}button{padding:12px 18px;border:0;border-radius:6px;cursor:pointer}textarea{display:block;box-sizing:border-box;width:100%;font:18px system-ui;padding:12px;color:#eee;background:#152a37;border:1px solid #537080;border-radius:5px}.entry{border-top:1px solid #37505e;padding:16px 0}small{color:#e7bd78}pre{white-space:pre-wrap}summary{cursor:pointer;font-weight:bold;margin:25px 0}</style>
<h1>Revisar o corte</h1><video id="player" controls src="preview.mp4"><track id="caption-track" kind="captions" label="Legendas" srclang="${escape(job.transcript?.language || 'pt')}"></video><p>Compare a fala, as legendas, o enquadramento e o áudio com a gravação original.</p>
<details><summary>Conferir e corrigir as legendas (${segments.length})</summary><p>Ouça cada trecho e corrija a grafia quando necessário. Uma alteração de texto remove o alinhamento por palavra desse trecho; a legenda passa a usar o intervalo original da frase. Gere outra prévia para revisar as correções.</p>${entries}${job.motions?.some((m) => m.anchor) ? '<label><input type="checkbox" id="keep-anchor-timing"> Manter os tempos dos gráficos desta prévia nos trechos corrigidos</label><small>Sem essa opção, gráficos ligados às legendas alteradas precisarão ser sincronizados novamente. Mesmo mantendo o tempo, confira o texto e a entrada dos gráficos na nova prévia.</small>' : ''}<button id="corrections">Baixar job com correções</button></details>
<details><summary>Cortes e alertas técnicos</summary><pre>${escape(JSON.stringify({ clips: job.clips, warnings: check.warnings }, null, 2))}</pre></details>
${keys.map((k, i) => `<label><input type="checkbox" id="${k}"> ${['A fala e o contexto foram preservados', 'As legendas estão corretas e sincronizadas', 'O rosto e os textos estão visíveis', 'O áudio está claro'][i]}</label>`).join('')}
<button id="save">Salvar aprovação desta prévia</button><p id="status" role="status"></p>
<script>const job=${safeJson(job)},binding=${safeJson(binding)},keys=${safeJson(keys)};
const captionUrl=URL.createObjectURL(new Blob([${safeJson(exportSrt(job, 'vtt'))}],{type:'text/vtt'}));document.getElementById('caption-track').src=captionUrl;
window.addEventListener('beforeunload',()=>URL.revokeObjectURL(captionUrl));
const reviseTranscript=${reviseTranscript.toString()};
const edits=()=>Object.fromEntries([...document.querySelectorAll('textarea')].filter(el=>el.value.trim()!==job.transcript.segments[Number(el.dataset.index)].text).map(el=>[el.dataset.index,el.value]));
const download=(name,value)=>{const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
document.querySelectorAll('[data-seek]').forEach(button=>button.onclick=()=>{if(button.dataset.seek==='')return;const player=document.getElementById('player');player.currentTime=Number(button.dataset.seek);player.play();});
document.getElementById('corrections').onclick=()=>{try{const corrected=reviseTranscript(job,edits(),{anchorTiming:document.getElementById('keep-anchor-timing')?.checked?'keep-preview':'realign'});download('job-corrigido.json',corrected);document.getElementById('status').textContent=corrected.review?.anchorAdjustments?.some(item=>item.status==='needs-realignment')?'Correções salvas. Há gráficos que precisam ser sincronizados novamente antes da nova prévia.':'Correções salvas. Gere e revise uma nova prévia antes de aprovar.';}catch(error){document.getElementById('status').textContent=error.message;}};
document.getElementById('save').onclick=()=>{if(Object.keys(edits()).length)return alert('Há correções de texto. Baixe o job corrigido e gere uma nova prévia.');const checks=Object.fromEntries(keys.map(k=>[k,document.getElementById(k).checked]));if(!keys.every(k=>checks[k]))return alert('Conclua os quatro pontos de revisão.');download('review.json',{...binding,...checks});};</script></html>`;
}
