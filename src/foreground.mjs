const geometryTransitions = (events) =>
  (events || [])
    .filter((m) => ['whip', 'zoom-transition'].includes(m.kind))
    .map((m) => ({
      kind: m.kind,
      start: m.start,
      end: m.end,
      cut: m.cut,
      direction: m.direction,
      blur: m.blur,
      amount: m.amount,
    }));
// A prepared alpha video is tied to the edited source, not to typography/music.
export function foregroundGeometry(job) {
  return structuredClone({
    fps: job.fps || 30,
    width: job.width || 1080,
    height: job.height || 1920,
    fit: job.theme?.fit || 'contain',
    background: job.theme?.background || '#101820',
    clips: (job.clips || []).map((c) => ({
      source: c.source,
      start: c.start,
      end: c.end,
      camera: c.camera || null,
      color: c.color || null,
    })),
    transitions: geometryTransitions(job.motions),
  });
}
export function sourceOnlyJob(job) {
  return {
    fps: job.fps || 30,
    width: job.width || 1080,
    height: job.height || 1920,
    sourceOnly: true,
    clips: structuredClone(job.clips),
    theme: { ...job.theme, gradient: false },
    motions: geometryTransitions(job.motions),
    captionStyle: { enabled: false },
    audio: { normalize: false },
  };
}
export function foregroundMatches(job) {
  if (!job.foregroundPreparation) return true;
  return (
    JSON.stringify(job.foregroundPreparation.request || {}) ===
      JSON.stringify(job.foregroundOptions || {}) &&
    JSON.stringify(job.foregroundPreparation.geometry) === JSON.stringify(foregroundGeometry(job))
  );
}
export function foregroundAvailable(preparation, frame) {
  return !(preparation?.missingRanges || []).some((r) => frame >= r.from && frame < r.to);
}
export function foregroundActive(job, frame) {
  const fps = job.fps || 30;
  return (
    Boolean(job.foregroundSrc) &&
    foregroundAvailable(job.foregroundPreparation, frame) &&
    (job.motions || []).some(
      (event) =>
        event.layer === 'behind' &&
        frame >= Math.round(event.start * fps) &&
        frame < Math.round(event.end * fps),
    )
  );
}
