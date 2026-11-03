const decorations = new Set(['particles', 'light', 'flash', 'glitch', 'trail']);
function settings(job) {
  if (job.pace && (typeof job.pace !== 'object' || Array.isArray(job.pace)))
    throw new Error('Ritmo precisa de uma configuração');
  const p = {
    mode: 'review',
    minStartGapSeconds: 0.25,
    maxConcurrent: 3,
    maxDelaySeconds: 0.5,
    ...job.pace,
  };
  if (
    !['review', 'adjust'].includes(p.mode) ||
    !Number.isFinite(p.minStartGapSeconds) ||
    p.minStartGapSeconds < 0 ||
    !Number.isFinite(p.maxDelaySeconds) ||
    p.maxDelaySeconds < 0 ||
    !Number.isInteger(p.maxConcurrent) ||
    p.maxConcurrent < 1
  )
    throw new Error('Configuração de ritmo visual inválida');
  return p;
}
const peak = (events) => {
  const edges = events
    .flatMap((e) => [
      [e.start, 1],
      [e.end, -1],
    ])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let active = 0,
    maximum = 0;
  for (const [, delta] of edges) {
    active += delta;
    maximum = Math.max(maximum, active);
  }
  return maximum;
};
export function applyVisualPace(input) {
  const job = structuredClone(input);
  if (!job.pace) return job;
  const p = settings(job);
  if (p.mode !== 'adjust') return job;
  const fps = job.fps || 30,
    round = (x) => Math.round(x * fps);
  const indexKey = Symbol('pace-index'),
    minimumGap = Math.ceil(p.minStartGapSeconds * fps - 1e-9),
    maximumDelay = Math.floor(p.maxDelaySeconds * fps + 1e-9);
  const duration = (job.clips || []).reduce((n, c) => n + round(c.end) - round(c.start), 0);
  const events = (job.motions || []).map((event, index) => {
    const trace = event.paceAdjustment,
      unchanged = trace && event.start === trace.appliedStart && event.end === trace.appliedEnd;
    const copy = {
      ...event,
      [indexKey]: index,
      start: unchanged ? trace.originalStart : event.start,
      end: unchanged ? trace.originalEnd : event.end,
    };
    delete copy.paceAdjustment;
    return copy;
  });
  const flexible = (e) =>
    e.paceFlexible === true &&
    decorations.has(e.kind) &&
    !e.text?.trim() &&
    !e.items?.length &&
    !e.values?.length &&
    !e.asset &&
    !e.anchor &&
    !e.syncToBeat;
  const scheduled = events.filter((e) => !flexible(e)),
    resolved = new Map();
  for (const event of events
    .filter(flexible)
    .sort((a, b) => a.start - b.start || a[indexKey] - b[indexKey])) {
    const start = round(event.start),
      length = round(event.end) - start;
    let selected = null;
    for (
      let candidate = start;
      candidate <= Math.min(start + maximumDelay, duration - length);
      candidate++
    ) {
      const next = { ...event, start: candidate / fps, end: (candidate + length) / fps };
      const close = scheduled.some((e) => Math.abs(round(e.start) - candidate) < minimumGap);
      const overlaps = scheduled
        .filter((e) => e.start < next.end && e.end > next.start)
        .map((e) => ({ start: Math.max(e.start, next.start), end: Math.min(e.end, next.end) }));
      if (!close && peak([...overlaps, next]) <= p.maxConcurrent) {
        selected = next;
        break;
      }
    }
    const next = selected || event;
    if (next.start !== event.start)
      next.paceAdjustment = {
        originalStart: event.start,
        originalEnd: event.end,
        appliedStart: next.start,
        appliedEnd: next.end,
      };
    scheduled.push(next);
    resolved.set(event[indexKey], next);
  }
  job.motions = events.map((e) => {
    const { [indexKey]: index, ...event } = resolved.get(e[indexKey]) || e;
    return event;
  });
  return job;
}
export function analyzeVisualPace(job) {
  const p = settings(job),
    events = (job.motions || [])
      .filter((e) => e.kind !== 'pause')
      .sort((a, b) => a.start - b.start);
  const crowdedStarts = [];
  for (let i = 1; i < events.length; i++)
    if (events[i].start - events[i - 1].start < p.minStartGapSeconds - 1e-9)
      crowdedStarts.push({
        start: events[i - 1].start,
        end: events[i].start,
        gapSeconds: events[i].start - events[i - 1].start,
      });
  const maximumConcurrent = peak(events);
  return {
    mode: p.mode,
    eventCount: events.length,
    maximumConcurrent,
    crowdedStarts,
    concurrencyWarning: maximumConcurrent > p.maxConcurrent,
    adjustmentCount: events.filter((e) => e.paceAdjustment).length,
    scope:
      'Visual entrance spacing only; speech, cuts, captions, anchored events and SFX are not retimed',
  };
}
