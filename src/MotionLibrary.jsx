import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, staticFile, interpolate, spring } from 'remotion';
const ease = (f, a, b, x = 0, y = 1) =>
  interpolate(f, [a, b], [x, y], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
const src = (s) => (/^(https?:|data:)/.test(s) ? s : staticFile(s.replace(/^\//, '')));
const textStyle = {
  fontFamily: 'Arial, sans-serif',
  fontWeight: 800,
  lineHeight: 1.05,
  overflowWrap: 'break-word',
  whiteSpace: 'pre-wrap',
};
import { MOTION_VARIANTS, MEDIA_KINDS } from './motion-kinds.mjs';
import { MediaPanels } from './MediaPanels';
import { Transition, TRANSITION_KINDS } from './Transitions';
import { DiagramGraphic } from './DiagramGraphic';
import { EducationalGraphic } from './EducationalGraphic';
import { SceneThree } from './SceneThree';
import { SCENE3D_KINDS } from './scene3d.mjs';
export { MOTION_VARIANTS } from './motion-kinds.mjs';
export function MotionLibrary({
  variant = 'kinetic',
  frame: f,
  fps,
  durationInFrames = 90,
  accent = '#e7bd78',
  text = '',
  position = { x: 85, y: 650, width: 880 },
  fontSize = 82,
  fontFamily = 'Arial, sans-serif',
  mode = 'words',
  items = [],
  values = [],
  labels = [],
  evidence,
  asset,
  assetType = 'image',
  rotate = 0,
  subtitle = '',
  value = 0,
  suffix = '',
  count = 24,
  seed = 7,
  ...options
}) {
  if (!MOTION_VARIANTS.includes(variant)) throw new Error(`Motion inconnu: ${variant}`);
  const p = ease(f, 0, 25),
    s = spring({ frame: f, fps, config: { damping: 18, stiffness: 130 } }),
    box = {
      position: 'absolute',
      left: position.x,
      top: position.y,
      width: position.width,
      color: '#fff',
    };
  const words = text.split(/\s+/).filter(Boolean);
  if (SCENE3D_KINDS.includes(variant))
    return (
      <SceneThree
        {...options}
        variant={variant}
        frame={f}
        fps={fps}
        position={position}
        asset={asset}
        panels={options.panels}
        text={text}
        accent={accent}
      />
    );
  if (['flowchart', 'network'].includes(variant))
    return (
      <DiagramGraphic
        {...options}
        variant={variant}
        frame={f}
        fps={fps}
        durationInFrames={durationInFrames}
        accent={accent}
        position={position}
        fontSize={Math.min(fontSize, 30)}
      />
    );
  if (['question-answer', 'interface', 'definition'].includes(variant))
    return (
      <EducationalGraphic
        {...options}
        variant={variant}
        frame={f}
        fps={fps}
        accent={accent}
        position={position}
        text={text}
      />
    );
  if (MEDIA_KINDS.includes(variant))
    return (
      <MediaPanels
        {...options}
        variant={variant}
        frame={f}
        fps={fps}
        durationInFrames={durationInFrames}
        position={position}
        items={items}
        asset={asset}
        assetType={assetType}
      />
    );
  if (TRANSITION_KINDS.includes(variant))
    return (
      <Transition
        {...options}
        variant={variant}
        frame={f}
        durationInFrames={durationInFrames}
        accent={accent}
        text={text}
        asset={asset}
      />
    );
  if (variant === 'zoom-transition')
    return !text ? null : (
      <div
        style={{
          ...box,
          transform: `scale(${1 + Math.sin((Math.PI * f) / durationInFrames) * 0.2})`,
          border: `2px solid ${accent}`,
          padding: 40,
          fontSize: 60,
        }}
      >
        {text}
      </div>
    );
  if (variant === 'pause') return null;
  if (
    [
      'title',
      'kinetic',
      'tracking',
      'perspective',
      'mask',
      'trail',
      'impact',
      'lines',
      'parallax',
    ].includes(variant)
  ) {
    const parts =
      variant === 'lines' ? text.split('\n') : mode === 'letters' ? Array.from(text) : words;
    return (
      <div
        style={{
          ...box,
          ...textStyle,
          fontFamily,
          fontSize,
          letterSpacing: variant === 'tracking' ? ease(f, 0, 30, 20, 0) : -1,
          transform: `perspective(900px) rotateY(${variant === 'perspective' ? ease(f, 0, 35, -35, 0) : 0}deg) translateX(${variant === 'parallax' ? Math.sin(f / 40) * 22 : 0}px)`,
          overflow: variant === 'mask' ? 'hidden' : undefined,
        }}
      >
        {parts.map((w, i) => {
          const delay = mode === 'letters' ? i * 2 : i * 5,
            enter = spring({
              frame: f - delay,
              fps,
              config: {
                damping: variant === 'impact' ? 10 : 22,
                stiffness: variant === 'impact' ? 200 : 120,
              },
            });
          return (
            <span
              key={i}
              style={{
                display: variant === 'lines' ? 'block' : 'inline-block',
                marginRight: mode === 'letters' ? 0 : 18,
                color: i === 1 ? accent : '#fff',
                opacity: ease(f, delay, delay + 9),
                transform: `translateY(${(1 - enter) * (variant === 'mask' ? 130 : 40)}px) scale(${variant === 'impact' ? 0.5 + enter * 0.5 : 1}) rotate(${rotate}deg)`,
                textShadow:
                  variant === 'trail'
                    ? `-8px 6px 0 ${accent}45,-16px 12px 0 ${accent}18`
                    : variant === 'kinetic'
                      ? `0 0 25px ${accent}66`
                      : undefined,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    );
  }
  if (variant === 'particles')
    return (
      <AbsoluteFill>
        {Array.from({ length: Math.min(count, 120) }, (_, i) => {
          const r = ((i * 7919 + seed * 13) % 997) / 997,
            x = r * 1080,
            y = (((i * 451 + seed) % 1900) - f * (0.3 + r) + 1900) % 1920;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: 3 + r * 7,
                height: 3 + r * 7,
                borderRadius: 999,
                background: accent,
                opacity: 0.1 + r * 0.4,
                boxShadow: `0 0 ${8 + r * 15}px ${accent}`,
              }}
            />
          );
        })}
      </AbsoluteFill>
    );
  if (variant === 'shapes')
    return (
      <div style={box}>
        <svg viewBox="0 0 880 380" width="100%">
          <g transform={`translate(440 180) rotate(${f * 0.35}) scale(${s})`}>
            <circle r="130" fill="none" stroke={accent} strokeWidth="2" />
            <rect
              x="-90"
              y="-90"
              width="180"
              height="180"
              rx="24"
              fill={accent + '22'}
              stroke={accent}
              strokeWidth="3"
            />
            <path d="M -190 80 L 0 -140 L 190 80 Z" fill="none" stroke="white" strokeWidth="2" />
          </g>
        </svg>
      </div>
    );
  if (variant === 'terminal')
    return (
      <div
        style={{
          ...box,
          background: 'rgba(7,13,22,.93)',
          border: '1px solid #ffffff26',
          borderRadius: 22,
          padding: 30,
          boxShadow: '0 22px 80px #0008',
          transform: `translateY(${(1 - s) * 35}px)`,
        }}
      >
        <div style={{ display: 'flex', gap: 9, marginBottom: 25 }}>
          {['#f46a69', '#e7bd78', '#81c9b2'].map((c) => (
            <div key={c} style={{ background: c, width: 12, height: 12, borderRadius: 20 }} />
          ))}
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 38, lineHeight: 1.4, color: accent }}>
          {text.slice(0, Math.floor(f * 1.3))}
          <span style={{ opacity: f % 30 < 15 ? 1 : 0 }}>▌</span>
        </div>
      </div>
    );
  if (variant === 'blueprint')
    return (
      <div
        style={{
          ...box,
          backgroundImage: `linear-gradient(${accent}12 1px,transparent 1px),linear-gradient(90deg,${accent}12 1px,transparent 1px)`,
          backgroundSize: '32px 32px',
          padding: 30,
          border: `1px solid ${accent}44`,
        }}
      >
        <svg viewBox="0 0 820 230" width="100%">
          <path
            d="M 60 160 H 300 L 390 60 H 780"
            stroke={accent}
            strokeWidth="2"
            fill="none"
            strokeDasharray="900"
            strokeDashoffset={900 * (1 - p)}
          />
          <circle cx="60" cy="160" r="14" fill={accent} />
          <foreignObject x="410" y="8" width="370" height="140">
            <div
              xmlns="http://www.w3.org/1999/xhtml"
              style={{ fontSize: 28, lineHeight: 1.2, color: '#fff', overflowWrap: 'break-word' }}
            >
              {text}
            </div>
          </foreignObject>
          <path d="M 50 210 H 770" stroke="white" opacity=".25" />
          {Array.from({ length: 25 }, (_, i) => (
            <path
              key={i}
              d={`M ${50 + i * 30} 205 v ${i % 5 ? 10 : 20}`}
              stroke="white"
              opacity=".4"
            />
          ))}
        </svg>
      </div>
    );
  if (['steps', 'timeline', 'connections', 'circle'].includes(variant)) {
    return (
      <div style={box}>
        <svg viewBox="0 0 880 540" width="100%">
          {variant === 'connections' && <circle cx="440" cy="60" r="12" fill={accent} />}{' '}
          {items.map((item, i) => {
            const angle = (i / items.length) * Math.PI * 2 - Math.PI / 2,
              horizontal = ['timeline', 'connections'].includes(variant),
              x =
                variant === 'circle'
                  ? 440 + 170 * Math.cos(angle)
                  : horizontal
                    ? 90 + (i * 700) / Math.max(1, items.length - 1)
                    : 90,
              y =
                variant === 'circle'
                  ? 240 + 170 * Math.sin(angle)
                  : horizontal
                    ? 220
                    : 60 + i * 100,
              enter = ease(f, i * 9, i * 9 + 15);
            return (
              <g key={i} opacity={enter}>
                <path
                  d={
                    variant === 'circle' || variant === 'connections'
                      ? `M440 ${variant === 'circle' ? 240 : 60} L${x} ${y}`
                      : variant === 'timeline'
                        ? `M90 220 L${x} 220`
                        : `M90 60 L90 ${y}`
                  }
                  stroke={accent}
                  strokeWidth="2"
                />
                <circle cx={x} cy={y} r="24" fill={accent} />
                <text x={x} y={y + 9} textAnchor="middle" fontSize="24" fill="#101820">
                  {i + 1}
                </text>
                <foreignObject
                  x={horizontal || variant === 'circle' ? x - 85 : x + 50}
                  y={horizontal || variant === 'circle' ? y + 40 : y - 18}
                  width={horizontal || variant === 'circle' ? 170 : 660}
                  height="100"
                >
                  <div
                    xmlns="http://www.w3.org/1999/xhtml"
                    style={{
                      fontSize: 30,
                      lineHeight: 1.15,
                      color: 'white',
                      textAlign: horizontal || variant === 'circle' ? 'center' : 'left',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {typeof item === 'string' ? item : item.label}
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }
  if (variant === 'compare')
    return (
      <div style={{ ...box, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              padding: 30,
              borderTop: `4px solid ${i ? accent : '#ffffff66'}`,
              background: '#101820df',
              fontSize: 42,
              ...textStyle,
              transform: `translateY(${(1 - s) * (i ? 50 : -50)}px)`,
            }}
          >
            {typeof item === 'string' ? item : item.label}
          </div>
        ))}
      </div>
    );
  if (['chart', 'kpi', 'counter'].includes(variant)) {
    if (!evidence) throw new Error('Dados numéricos exigem evidence');
    if (variant !== 'chart')
      return (
        <div style={{ ...box, ...textStyle, fontSize: fontSize * 1.8, color: accent }}>
          {Math.round(value * p).toLocaleString('pt-BR')}
          {suffix}
          <div style={{ fontSize: 32, color: 'white', marginTop: 16 }}>{text}</div>
        </div>
      );
    const max = Math.max(1, ...values);
    return (
      <div style={{ ...box, background: '#101820eb', padding: 32, borderRadius: 20 }}>
        <div style={{ fontSize: 30, marginBottom: 32 }}>{text}</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22, height: 300 }}>
          {values.map((v, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{v}</div>
              <div
                style={{
                  height: ((220 * v) / max) * p,
                  background: i === values.length - 1 ? accent : '#ffffff99',
                  borderRadius: '8px 8px 0 0',
                }}
              />
              <div style={{ fontSize: 22, marginTop: 15 }}>{labels[i]}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (['quote', 'verse'].includes(variant))
    return (
      <div
        style={{
          ...box,
          padding: '35px 0 35px 34px',
          borderLeft: `5px solid ${accent}`,
          ...textStyle,
          fontSize: 58,
          transform: `translateY(${(1 - s) * 30}px)`,
        }}
      >
        <div style={{ fontFamily: 'Georgia,serif', fontWeight: 400, lineHeight: 1.25 }}>
          “{text}”
        </div>
        <div style={{ fontSize: 24, color: accent, marginTop: 22, letterSpacing: 3 }}>
          {subtitle}
        </div>
      </div>
    );
  if (['lower-third', 'cta', 'brand', 'frame'].includes(variant))
    return variant === 'frame' ? (
      <AbsoluteFill style={{ border: `12px solid ${accent}`, opacity: p }} />
    ) : (
      <div
        style={{
          ...box,
          ...textStyle,
          background: variant === 'brand' ? 'transparent' : '#101820ed',
          padding: 30,
          borderLeft: `5px solid ${accent}`,
          fontSize: 54,
          transform: `translateX(${(1 - s) * -150}px)`,
        }}
      >
        {asset && (
          <Img
            src={src(asset)}
            style={{ maxWidth: 180, maxHeight: 100, objectFit: 'contain', marginBottom: 24 }}
          />
        )}
        {text}
        <div style={{ fontSize: 25, color: accent, marginTop: 15, fontWeight: 400 }}>
          {subtitle}
        </div>
      </div>
    );
  if (['broll', 'subject'].includes(variant)) {
    if (!asset) throw new Error('Mídia autorizada obrigatória');
    const style = {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      transform: `scale(${1 + p * 0.05})`,
    };
    return (
      <div
        style={{
          ...box,
          height: position.height || 490,
          overflow: 'hidden',
          borderRadius: variant === 'broll' ? 20 : 0,
        }}
      >
        {assetType === 'video' ? (
          <OffthreadVideo muted src={src(asset)} style={style} />
        ) : (
          <Img src={src(asset)} style={style} />
        )}
      </div>
    );
  }
  if (['cards3d', 'cube3d', 'isometric'].includes(variant))
    return (
      <div style={{ ...box, height: 500, perspective: 1100 }}>
        <div
          style={{
            position: 'absolute',
            left: '25%',
            top: 60,
            width: 330,
            height: 330,
            transformStyle: 'preserve-3d',
            transform:
              variant === 'isometric'
                ? `rotateX(55deg) rotateZ(-45deg) translateZ(${Math.sin(f / 40) * 15}px)`
                : `rotateX(${-12 + Math.sin(f / 45) * 8}deg) rotateY(${variant === 'cube3d' ? f * 0.8 : ease(f, 0, 60, -28, 18)}deg)`,
          }}
        >
          {(variant === 'cube3d' ? Array.from({ length: 6 }) : Array.from({ length: 3 })).map(
            (_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: 330,
                  height: 330,
                  backfaceVisibility: 'hidden',
                  background:
                    i % 2
                      ? `linear-gradient(140deg,#f4e2c0,${accent})`
                      : 'linear-gradient(140deg,#172d3b,#061019)',
                  border: `1px solid ${accent}88`,
                  borderRadius: variant === 'cards3d' ? 24 : 0,
                  transform:
                    variant !== 'cube3d'
                      ? `translateZ(${i * 65}px) translateX(${i * 18}px)`
                      : [
                          `translateZ(165px)`,
                          `rotateY(90deg) translateZ(165px)`,
                          `rotateY(180deg) translateZ(165px)`,
                          `rotateY(-90deg) translateZ(165px)`,
                          `rotateX(90deg) translateZ(165px)`,
                          `rotateX(-90deg) translateZ(165px)`,
                        ][i],
                  boxShadow: '0 20px 60px #0006',
                  display: 'grid',
                  placeItems: 'center',
                  padding: 30,
                  textAlign: 'center',
                  fontSize: 42,
                  fontWeight: 800,
                  color: i % 2 ? '#132635' : '#fff',
                }}
              >
                {items[i]?.label || items[i] || text}
              </div>
            ),
          )}
        </div>
      </div>
    );
  if (variant === 'light')
    return (
      <AbsoluteFill
        style={{
          background: `conic-gradient(from ${f / 6}deg at 50% 20%,transparent,${accent}33,transparent,transparent)`,
          filter: 'blur(25px)',
        }}
      />
    );
  if (['wipe', 'radial', 'whip', 'flash', 'morph'].includes(variant)) {
    const progress = ease(f, 0, durationInFrames - 1),
      wave = Math.sin(progress * Math.PI);
    return (
      <AbsoluteFill
        style={{
          background: accent,
          opacity: variant === 'flash' ? wave * 0.16 : 1,
          clipPath:
            variant === 'radial'
              ? `circle(${wave * 100}% at 50% 50%)`
              : variant === 'morph'
                ? `inset(${(1 - wave) * 48}% round ${60 * (1 - progress)}px)`
                : `inset(0 ${progress < 0.5 ? (1 - wave) * 100 : 0}% 0 ${progress >= 0.5 ? (1 - wave) * 100 : 0}%)`,
          transform: variant === 'whip' ? `translateX(${(progress * 2 - 1) * 1080}px)` : undefined,
        }}
      />
    );
  }
  return null;
}
