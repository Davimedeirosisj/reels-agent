import React from 'react';
import { useCurrentFrame } from 'remotion';
import { captionPages } from './captions.mjs';
export function Captions({ segments, style = {}, accent }) {
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
    ...custom
  } = style;
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
  return (
    <div
      style={{
        ...base,
        clipPath:
          mode === 'mask' ? `inset(0 ${Math.max(0, 100 - (f - s.from) * 20)}% 0 0)` : undefined,
      }}
    >
      {icon && <span aria-hidden="true">{icon} </span>}
      {tokens.map((w, i) => {
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
              color: highlight ? accent : '#fff',
              background: box || mode === 'accessible' ? 'rgba(0,0,0,.86)' : undefined,
              padding: '4px 3px',
              textShadow: mode === 'accessible' ? 'none' : '0 2px 8px #000',
            }}
          >
            {w.word || w.text}
            {i < tokens.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </div>
  );
}
