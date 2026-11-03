export function captionPages(segments, { maxChars = 42, maxWords = 8, mode = 'karaoke' } = {}) {
  return segments.flatMap((s) => {
    if (!s.words?.length) return [s];
    const pages = [];
    let group = [];
    const flush = () => {
      if (group.length)
        pages.push({
          ...s,
          words: group,
          text: group.map((w) => w.word || w.text).join(' '),
          from: group[0].from,
          to: group.at(-1).to,
        });
      group = [];
    };
    for (const w of s.words) {
      const prev = group.at(-1),
        text = group.map((t) => t.word || t.text).join(' ');
      if (
        group.length &&
        (mode === 'word' ||
          group.length >= maxWords ||
          text.length + (w.word || w.text).length + 1 > maxChars ||
          w.from - prev.to > 10)
      )
        flush();
      group.push(w);
      if (/[.!?;:]$/.test(w.word || w.text)) flush();
    }
    flush();
    return pages;
  });
}
// Music gain uses actual speech ranges; it does not invent word timing from text.
export function musicGain(
  frame,
  speech,
  { volume = 0.1, duckVolume = 0.035, rampFrames = 9 } = {},
) {
  let gain = volume;
  for (const s of speech) {
    const distance = frame < s.from ? s.from - frame : frame >= s.to ? frame - s.to : 0;
    const t = Math.max(0, 1 - distance / rampFrames);
    gain = Math.min(gain, volume + (duckVolume - volume) * t);
  }
  return gain;
}
