const mix = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
export function cameraAt(keys, time) {
  if (!keys?.length) return { scale: 1, x: 50, y: 50, rotate: 0 };
  const i = Math.max(
      0,
      keys.findLastIndex((k) => k.time <= time),
    ),
    a = keys[i],
    b = keys[i + 1] || a;
  const t = b === a ? 0 : Math.max(0, Math.min(1, (time - a.time) / (b.time - a.time))),
    u = b.easing === 'linear' ? t : smooth(t);
  return Object.fromEntries(
    Object.entries({ scale: 1, x: 50, y: 50, rotate: 0 }).map(([k, d]) => [
      k,
      mix(a[k] ?? d, b[k] ?? d, u),
    ]),
  );
}
export function transitionAt(frame, events, fps, width = 1080) {
  let x = 0,
    scale = 1,
    blur = 0;
  for (const e of events) {
    if (!['whip', 'zoom-transition'].includes(e.kind)) continue;
    const start = Math.round(e.start * fps),
      end = Math.round(e.end * fps);
    if (frame < start || frame >= end) continue;
    const midpoint = Math.round((e.cut ?? (e.start + e.end) / 2) * fps),
      before = frame < midpoint,
      span = before ? midpoint - start : end - midpoint,
      t = Math.min(1, Math.max(0, (frame - (before ? start : midpoint)) / Math.max(1, span)));
    if (e.kind === 'whip') {
      const direction = e.direction === 'left' ? -1 : 1;
      x = direction * width * (before ? smooth(t) : smooth(t) - 1);
      blur = Math.sin(Math.PI * t) * (e.blur ?? 12);
    } else scale = 1 + (e.amount ?? 0.12) * (before ? smooth(t) : 1 - smooth(t));
  }
  return { x, scale, blur };
}
export function panelCameraAt(panel, frame, fps) {
  return cameraAt(
    panel.camera || [
      { time: 0, scale: 1, x: 50, y: 50 },
      { time: panel.duration || 3, scale: 1.04, x: 50, y: 50 },
    ],
    frame / fps,
  );
}
