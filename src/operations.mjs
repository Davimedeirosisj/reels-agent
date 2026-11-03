import { recipeById, recipeEvent } from './recipes.mjs';
import { mapSourceBeats, snapVisualEvents, beatCutCandidates, beatsToSources } from './rhythm.mjs';
export function applyOperations(input) {
  const job = structuredClone(input),
    fps = job.fps || 30;
  job.motions = (job.motions || []).map((m) =>
    m.recipeId && !m.kind ? recipeEvent(m.recipeId, m) : m,
  );
  for (const op of job.operations || []) {
    const recipe = recipeById(op.recipeId),
      n = Number(recipe.id.slice(1));
    if (recipe.status === 'pending')
      throw new Error(`${recipe.id}: ${recipe.behavior} ainda pendente`);
    if (recipe.kind === 'captions')
      job.captionStyle = { ...job.captionStyle, ...recipe.defaults, ...op.style };
    else if (recipe.kind === 'theme') job.theme = { ...job.theme, ...op.theme };
    else if (recipe.kind === 'camera') {
      const targets = op.clip === undefined ? job.clips : [job.clips[op.clip]];
      if (targets.some((c) => !c)) throw new Error('Clip de câmera inexistente');
      for (const c of targets) {
        const duration = c.end - c.start;
        c.camera = op.keys || [
          { time: 0, scale: 1, x: 50, y: 50 },
          { time: duration, scale: op.scale ?? 1.08, x: op.x ?? 50, y: op.y ?? 50 },
        ];
      }
    } else if (recipe.kind === 'post') {
      if (n === 14) job.rhythm = { ...job.rhythm, suggestCuts: true };
      else if (n === 91) job.rhythm = { ...job.rhythm, alignVisuals: true };
      else if (n === 92) job.audio = { ...job.audio, ...op.audio, normalize: true };
      else if (n === 93) job.sfx = [...(job.sfx || []), ...(op.sfx || [])];
      else if (n === 94) job.debugSafeAreas = true;
      else if (n === 95) {
        job.quality = { ...job.quality, ...op.quality };
        job.review = { ...job.review, transcriptEditor: true };
      } else if (n === 96) job.quality = { ...job.quality, ...op.quality };
      else if (n === 97) {
        if (op.match) job.colorMatch = { ...job.colorMatch, ...op.match };
        if (op.color) {
          const targets = op.clip === undefined ? job.clips : [job.clips[op.clip]];
          if (targets.some((c) => !c)) throw new Error('Clip de cor inexistente');
          for (const clip of targets) clip.color = structuredClone(op.color);
        }
        if (!op.match && !op.color)
          throw new Error('A097 precisa de color manual ou match com amostras explícitas');
      } else if (n === 100) {
        job.width = op.width ?? 1080;
        job.height = op.height ?? 1920;
      }
    } else job.motions.push(recipeEvent(recipe.id, op));
  }
  if (job.operations?.length)
    job.appliedRecipes = [
      ...(job.appliedRecipes || []),
      ...job.operations.map((op) => op.recipeId),
    ];
  delete job.operations;
  if (job.rhythm) {
    const beats =
      job.rhythm.beats || mapSourceBeats(job.rhythm.sourceAnalysis || {}, job.clips, fps);
    job.rhythm.beats = beats;
    if (job.rhythm.alignVisuals)
      job.motions = snapVisualEvents(job.motions, beats, {
        tolerance: job.rhythm.tolerance ?? 0.12,
        fps,
      });
    if (job.rhythm.suggestCuts) {
      const bySource = beatsToSources(beats, job.clips, fps);
      job.rhythm.cutCandidates = Object.entries(bySource).flatMap(([source, onsets]) =>
        beatCutCandidates(
          {
            segments: (job.transcript?.segments || []).filter(
              (s) => !s.source || s.source === source,
            ),
          },
          onsets,
          { tolerance: job.rhythm.tolerance ?? 0.12 },
        ).map((c) => ({ ...c, source })),
      );
    }
  }
  return job;
}
