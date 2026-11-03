import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
export const TRANSITION_KINDS = ['match-shape', 'object-wipe', 'layer-slide', 'type-wipe'];
export function Transition({
  variant,
  frame,
  durationInFrames,
  accent,
  text = '',
  asset,
  fromShape = 'circle',
  toShape = 'square',
  layers = 4,
}) {
  const p = Math.min(1, Math.max(0, frame / Math.max(1, durationInFrames - 1))),
    wave = Math.sin(p * Math.PI);
  if (variant === 'match-shape')
    return (
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 180,
          height: 180,
          background: accent,
          transform: `translate(-50%,-50%) rotate(${p * 90}deg) scale(${1 + wave * 16})`,
          borderRadius: `${fromShape === toShape ? (fromShape === 'circle' ? 50 : 0) : (fromShape === 'circle' ? 1 - p : p) * 50}%`,
        }}
      />
    );
  if (variant === 'object-wipe')
    return (
      <AbsoluteFill
        style={{
          transform: `translateX(${(p * 2 - 1) * 2200}px)`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Img
          src={/^(https?:|data:)/.test(asset) ? asset : staticFile(asset)}
          style={{ width: '150%', height: '150%', objectFit: 'contain' }}
        />
      </AbsoluteFill>
    );
  if (variant === 'type-wipe')
    return (
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Arial',
          fontWeight: 900,
          fontSize: 120,
          color: accent,
          transform: `scale(${0.5 + wave * 30})`,
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </AbsoluteFill>
    );
  return (
    <AbsoluteFill>
      {Array.from({ length: layers }, (_, i) => {
        const t = Math.min(1, Math.max(0, (p - i * 0.045) / (1 - (layers - 1) * 0.045))),
          w = Math.sin(t * Math.PI);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              top: `${(i * 100) / layers}%`,
              height: `${100 / layers + 0.1}%`,
              width: '100%',
              background: i % 2 ? accent : '#fff',
              transform: `translateX(${(t < 0.5 ? 1 - w : w - 1) * 100}%)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}
