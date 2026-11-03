export function scheduledMedia(items, time) {
  let cursor = 0;
  for (const item of items) {
    const start = item.start ?? cursor,
      end = item.end ?? start + (item.duration ?? 2);
    cursor = end;
    if (time >= start && time < end) return { ...item, localTime: time - start, start, end };
  }
  return null;
}
export function panelRects(
  count,
  { x = 85, y = 650, width = 880, height = 500, gap = 18, layout = 'horizontal' } = {},
) {
  if (!Number.isInteger(count) || count < 1 || count > 6)
    throw new Error('1 a 6 painéis são permitidos');
  const horizontal = layout === 'horizontal',
    size = ((horizontal ? width : height) - gap * (count - 1)) / count;
  return Array.from({ length: count }, (_, i) => ({
    x: x + (horizontal ? i * (size + gap) : 0),
    y: y + (horizontal ? 0 : i * (size + gap)),
    width: horizontal ? size : width,
    height: horizontal ? height : size,
  }));
}
export function mediaReferences(job) {
  const refs = [
    ...job.clips.map((c) => c.source),
    ...(job.foregroundSrc ? [job.foregroundSrc] : []),
    ...(job.music ? [job.music.source] : []),
    ...(job.sfx || []).map((s) => s.source),
  ];
  for (const m of job.motions || []) {
    if (m.asset) refs.push(m.asset);
    for (const key of ['items', 'panels', 'layers'])
      for (const item of m[key] || [])
        if (item && typeof item === 'object' && item.asset) refs.push(item.asset);
  }
  return [...new Set(refs)];
}
export function mapMedia(job, mapper) {
  const props = structuredClone(job),
    mapping = new Map(mediaReferences(job).map((s) => [s, mapper(s)]));
  for (const c of props.clips) c.source = mapping.get(c.source);
  for (const clip of props.foregroundPreparation?.geometry?.clips || [])
    if (mapping.has(clip.source)) clip.source = mapping.get(clip.source);
  for (const item of props.foregroundPreparation?.sourceBinding || [])
    if (mapping.has(item.source)) item.source = mapping.get(item.source);
  for (const s of props.transcript?.segments || [])
    if (s.source && mapping.has(s.source)) s.source = mapping.get(s.source);
  if (props.foregroundSrc) props.foregroundSrc = mapping.get(props.foregroundSrc);
  if (props.music) props.music.source = mapping.get(props.music.source);
  for (const s of props.sfx || []) s.source = mapping.get(s.source);
  for (const m of props.motions || []) {
    if (m.asset) m.asset = mapping.get(m.asset);
    for (const key of ['items', 'panels', 'layers'])
      for (const item of m[key] || [])
        if (item && typeof item === 'object' && item.asset) item.asset = mapping.get(item.asset);
  }
  return props;
}
