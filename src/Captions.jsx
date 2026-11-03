import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { captionPages } from './captions.mjs';
import { layoutCaptionTokens, browserTextMeasurer } from './caption-layout.mjs';
import { captionAppearance } from './accessibility.mjs';
export function Captions({ segments, style = {}, accent }) {
  const { width: videoWidth } = useVideoConfig();
  const f = useCurrentFrame(),
    s = captionPages(segments, style).find((x) => f >= x.from && f < x.to);
  if (!s) return null;
  const {
    enabled,
    box,
    mode = 'karaoke',
    maxChars,
    maxWords,
    semanticWords = [],
    icon,
    maxLines = mode === 'accessible' ? 2 : undefined,
    minFontSize = 38,
    boxColor,
    boxOpacity,
    ...custom
  } = style;
  const appearance = captionAppearance(style);
  const base = {
    position: 'absolute',
    bottom: 270,
    left: 85,
    right: 105,
    textAlign: 'center',
    fontFamily: 'Arial, sans-serif',
    fontWeight: 800,
    fontSize: mode === 'accessible' ? 64 : 56,
    lineHeight: 1.2,
    color: '#fff',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    ...custom,
  };
  const tokens = s.words?.length ? s.words : [{ word: s.text, from: s.from, to: s.to }];
  // Untimed segment text may wrap visually; all pieces retain the segment's
  // original timing rather than pretending to be individually aligned words.
  const layoutTokens = !s.words?.length
    ? s.text.split(/\s+/).map((word) => ({ ...tokens[0], word }))
    : tokens;
  const layout = maxLines
    ? layoutCaptionTokens(layoutTokens, browserTextMeasurer(base), {
        width: base.width ?? videoWidth - Number(base.left) - Number(base.right),
        maxLines,
        fontSize: base.fontSize,
        minFontSize,
        prefix: icon || '',
      })
    : { rows: [tokens], fontSize: base.fontSize };
  if (layout.overflow)
    throw new Error(
      'Legenda não cabe nas linhas configuradas. Revise palavras por página, largura ou tamanho mínimo; nenhum texto foi omitido.',
    );
  const renderTokens = (row) =>
    row.map((w, i) => {
      const semantic = semanticWords.some((k) =>
        (w.word || w.text).toLocaleLowerCase().includes(k.toLocaleLowerCase()),
      );
      const highlight =
        mode === 'semantic'
          ? semantic
          : mode === 'block' || mode === 'accessible'
            ? false
            : f >= w.from && f < w.to;
      return (
        <span
          key={i}
          style={{
            color: highlight ? accent : appearance.color,
            background: appearance.background,
            padding: '4px 3px',
            textShadow: mode === 'accessible' ? 'none' : '0 2px 8px #000',
          }}
        >
          {w.word || w.text}
          {i < row.length - 1 ? ' ' : ''}
        </span>
      );
    });
  return (
    <div
      data-caption-font-size={layout.fontSize}
      data-caption-lines={layout.rows.length}
      style={{
        ...base,
        fontSize: layout.fontSize,
        clipPath:
          mode === 'mask' ? `inset(0 ${Math.max(0, 100 - (f - s.from) * 20)}% 0 0)` : undefined,
      }}
    >
      {maxLines
        ? layout.rows.map((row, i) => (
            <div key={i} style={{ whiteSpace: 'nowrap' }}>
              {i === 0 && icon && <span aria-hidden="true">{icon} </span>}
              {renderTokens(row)}
            </div>
          ))
        : layout.rows.map((row, i) => (
            <React.Fragment key={i}>
              {i > 0 && <br />}
              {i === 0 && icon && <span aria-hidden="true">{icon} </span>}
              {renderTokens(row)}
            </React.Fragment>
          ))}
    </div>
  );
}
