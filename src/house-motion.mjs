export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const easeHouse = (time, start, duration) => {
  const p = clamp01((time - start) / duration);
  return p * p * (3 - 2 * p);
};
export function houseState(frame, fps, mode = 'separate') {
  const t = frame / fps,
    move = easeHouse(t, 0.35, 0.95);
  const separated = mode === 'reunite' ? 1 - move : move;
  return {
    separated,
    roofOpacity: mode === 'reunite' ? 0 : 1 - easeHouse(t, 0.15, 0.55),
    roofLift: easeHouse(t, 0.15, 0.7) * 2.3,
    yaw: -0.32 + t * 0.025,
    centerGlow: mode === 'reunite' ? easeHouse(t, 0.45, 0.95) : 0,
  };
}
export function graphicWindowState(windows, frame, fps) {
  let active = { progress: 0, scale: 1, y: 0 };
  for (const w of windows || []) {
    const t = frame / fps,
      span = w.transitionSeconds ?? 10 / fps;
    if (t < w.start || t > w.end) continue;
    const p = Math.min(easeHouse(t, w.start, span), 1 - easeHouse(t, w.end - span, span));
    if (p > active.progress)
      active = { progress: p, scale: 1 + ((w.scale ?? 0.72) - 1) * p, y: (w.y ?? -210) * p };
  }
  return active;
}
