// Pixel widths are supplied by the browser's actual font measurer. This module
// never estimates word timestamps, drops tokens or inserts an ellipsis.
export function layoutCaptionTokens(
  tokens,
  measure,
  { width, maxLines = 2, fontSize = 56, minFontSize = 38, padding = 6, prefix = '' } = {},
) {
  if (
    !(width > 0) ||
    !Number.isInteger(maxLines) ||
    maxLines < 1 ||
    maxLines > 4 ||
    minFontSize > fontSize
  )
    throw new Error('Invalid caption layout constraints');
  const text = (t) => t.word || t.text;
  const partition = (size, count) => {
    const wordWidths = tokens.map((t) => measure(text(t), size) + padding),
      space = measure(' ', size),
      icon = prefix ? measure(prefix + ' ', size) : 0,
      sums = [0];
    for (const w of wordWidths) sums.push(sums.at(-1) + w);
    const target = (sums.at(-1) + space * Math.max(0, tokens.length - 1) + icon) / count,
      memo = new Map();
    const solve = (start, left) => {
      if (start === tokens.length) return left === 0 ? { cost: 0, rows: [] } : null;
      if (left === 0 || tokens.length - start < left) return null;
      const key = `${start}/${left}`;
      if (memo.has(key)) return memo.get(key);
      let best = null;
      for (let end = start + 1; end <= tokens.length - left + 1; end++) {
        const lineWidth =
          sums[end] - sums[start] + space * (end - start - 1) + (start === 0 ? icon : 0);
        if (lineWidth > width) break;
        const tail = solve(end, left - 1);
        if (!tail) continue;
        const cost = (lineWidth - target) ** 2 + tail.cost;
        if (!best || cost < best.cost)
          best = { cost, rows: [tokens.slice(start, end), ...tail.rows] };
      }
      memo.set(key, best);
      return best;
    };
    return solve(0, count);
  };
  for (let size = fontSize; size >= minFontSize; size--)
    for (let count = 1; count <= Math.min(maxLines, tokens.length); count++) {
      const found = partition(size, count);
      if (found) return { rows: found.rows, fontSize: size, overflow: false };
    }
  return { rows: [tokens], fontSize: minFontSize, overflow: true };
}

const measurements = new Map();
export function browserTextMeasurer(style) {
  if (typeof document === 'undefined')
    throw new Error('Font measurement requires the render browser');
  const fontKey = JSON.stringify([
    style.fontFamily,
    style.fontWeight,
    style.fontStyle,
    style.textTransform,
    style.letterSpacing,
  ]);
  return (text, size) => {
    const display =
      style.textTransform === 'uppercase'
        ? text.toUpperCase()
        : style.textTransform === 'lowercase'
          ? text.toLowerCase()
          : text;
    const key = fontKey + '|' + size + '|' + display;
    if (measurements.has(key)) return measurements.get(key);
    const probe = document.createElement('span');
    Object.assign(probe.style, {
      position: 'absolute',
      visibility: 'hidden',
      whiteSpace: 'pre',
      display: 'inline-block',
      left: '-100000px',
      fontFamily: style.fontFamily || 'Arial, sans-serif',
      fontSize: size + 'px',
      fontWeight: String(style.fontWeight || 800),
      fontStyle: style.fontStyle || 'normal',
      letterSpacing: (style.letterSpacing || 0) + 'px',
    });
    probe.textContent = display;
    document.body.appendChild(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    if (measurements.size > 20000) measurements.clear();
    measurements.set(key, width);
    return width;
  };
}
