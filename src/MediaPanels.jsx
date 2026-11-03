import React from 'react';
import { Img, OffthreadVideo, Sequence, staticFile } from 'remotion';
import { scheduledMedia, panelRects } from './media-layout.mjs';
import { panelCameraAt } from './camera.mjs';
const source = (s) => (/^(https?:|data:)/.test(s) ? s : staticFile(s.replace(/^\//, '')));
function Panel({ item, rect, frame, fps, transparent = false }) {
  const camera = panelCameraAt(item, frame, fps),
    style = {
      width: '100%',
      height: '100%',
      objectFit: item.fit || 'cover',
      objectPosition: `${camera.x}% ${camera.y}%`,
      transform: `scale(${camera.scale}) rotate(${camera.rotate}deg)`,
    };
  return (
    <div
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        borderRadius: item.radius ?? 18,
        overflow: 'hidden',
        background: transparent ? 'transparent' : item.background || '#071019',
      }}
    >
      {item.assetType === 'video' ? (
        <OffthreadVideo
          muted
          transparent={transparent}
          src={source(item.asset)}
          trimBefore={Math.round((item.trimStart || 0) * fps)}
          style={style}
        />
      ) : (
        <Img src={source(item.asset)} style={style} />
      )}
      {item.label && (
        <div
          style={{
            position: 'absolute',
            left: 20,
            bottom: 18,
            right: 20,
            fontSize: 26,
            color: '#fff',
            textShadow: '0 2px 8px #000',
          }}
        >
          {item.label}
        </div>
      )}
    </div>
  );
}
export function MediaPanels({
  variant,
  frame,
  fps,
  durationInFrames,
  position = { x: 85, y: 650, width: 880, height: 500 },
  panels = [],
  items = [],
  layers = [],
  asset,
  assetType = 'image',
  camera,
  layout = 'horizontal',
  gap = 18,
}) {
  if (variant === 'split-screen' || variant === 'editorial-layout') {
    const rects = panelRects(panels.length, { ...position, layout, gap });
    return (
      <>
        {panels.map((item, i) => (
          <Panel key={i} item={item} rect={item.position || rects[i]} frame={frame} fps={fps} />
        ))}
      </>
    );
  }
  if (variant === 'image-sequence' || variant === 'topic-montage') {
    const item = scheduledMedia(items, frame / fps);
    if (!item) return null;
    return (
      <Sequence
        key={item.start}
        from={Math.round(item.start * fps)}
        durationInFrames={Math.max(1, Math.round(item.end * fps) - Math.round(item.start * fps))}
        layout="none"
      >
        <Panel
          item={item}
          rect={{ ...position, height: position.height || 500 }}
          frame={frame - Math.round(item.start * fps)}
          fps={fps}
        />
      </Sequence>
    );
  }
  if (variant === 'depth-scene')
    return (
      <div
        style={{
          position: 'absolute',
          left: position.x,
          top: position.y,
          width: position.width,
          height: position.height || 550,
          perspective: 1200,
          overflow: 'hidden',
        }}
      >
        {layers.map((item, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              transform: `translateX(${Math.sin(frame / 75) * (item.depth || 0) * 0.1}px) scale(${1 + (item.depth || 0) / 1800})`,
            }}
          >
            <Panel
              item={item}
              rect={{ x: 0, y: 0, width: position.width, height: position.height || 550 }}
              frame={frame}
              fps={fps}
              transparent={!!item.transparent}
            />
          </div>
        ))}
      </div>
    );
  return (
    <Panel
      item={{ asset, assetType, camera, duration: durationInFrames / fps }}
      rect={{ ...position, height: position.height || 500 }}
      frame={frame}
      fps={fps}
      transparent={variant === 'subject'}
    />
  );
}
