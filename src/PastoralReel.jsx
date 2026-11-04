import React from 'react';
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';
import { timeline, captionsForTimeline } from './editorial.mjs';
import { MotionLibrary } from './MotionLibrary';
import { Captions } from './Captions';
import { musicGain } from './captions.mjs';
import { cameraAt, transitionAt } from './camera.mjs';
import { ColorGrade } from './ColorGrade';
import { foregroundAvailable, foregroundActive } from './foreground.mjs';
import {graphicWindowState} from './house-motion.mjs';
export const media = (src) =>
  /^(https?:|data:|blob:)/.test(src) ? src : staticFile(src.replace(/^\//, ''));
const lerp = (f, a, b, x, y) =>
  interpolate(f, [a, b], [x, y], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
function Shot({ clip, fit }) {
  const f = useCurrentFrame(),
    { fps } = useVideoConfig(),
    keys = clip.camera || [{ time: 0, scale: 1, x: 50, y: 50 }];
  const state = cameraAt(keys, f / fps),
    v = (k) => state[k];
  return (
    <AbsoluteFill
      style={{
        transform: `scale(${v('scale')}) rotate(${state.rotate}deg)`,
        transformOrigin: `${v('x', 50)}% ${v('y', 50)}%`,
      }}
    >
      <ColorGrade grade={clip.color}>
        <OffthreadVideo
          src={media(clip.source)}
          trimBefore={clip.trimBefore}
          trimAfter={clip.trimAfter}
          volume={clip.volume ?? 1}
          style={{
            width: '100%',
            height: '100%',
            objectFit: fit,
            objectPosition: `${v('x', 50)}% ${v('y', 50)}%`,
          }}
        />
      </ColorGrade>
    </AbsoluteFill>
  );
}
function TimedMotion({ event, accent }) {
  const frame = useCurrentFrame(),
    { fps } = useVideoConfig(),
    n = Math.round((event.end - event.start) * fps);
  const fade=event.transitionSeconds ? Math.max(1,Math.round(event.transitionSeconds*fps)) : 7;
  const opacity = Math.min(
    lerp(frame, 0, fade, 0, 1),
    lerp(frame, Math.max(fade+1, n-fade), Math.max(fade+2,n), 1, 0),
  );
  return (
    <AbsoluteFill style={{ opacity: event.layout==='hook' ? lerp(frame,Math.max(0,n-8),n,1,0) : opacity, pointerEvents: 'none' }}>
      <MotionLibrary
        {...event}
        variant={event.kind}
        frame={frame}
        fps={fps}
        durationInFrames={n}
        accent={event.accent || accent}
      />
    </AbsoluteFill>
  );
}
export const PastoralReel = ({
  clips = [],
  transcript = { segments: [] },
  title,
  motions = [],
  theme = {},
  captionStyle = {},
  foregroundSrc,
  foregroundPreparation,
  sourceOnly = false,
  music,
  sfx = [],
  debugSafeAreas = false,
}) => {
  const { fps, width } = useVideoConfig(),
    accent = theme.accent || '#e7bd78',
    cuts = timeline(clips, fps),
    captions = captionsForTimeline(transcript.segments, clips, fps);
  const frame = useCurrentFrame(),
    transition = transitionAt(frame, motions, fps, width);
  const windowState=graphicWindowState(theme.graphicWindows,frame,fps);
  const inset=windowState.progress;
  const layers = (layer) =>
    motions
      .filter(
        (m) =>
          (m.layer || 'front') === layer &&
          (layer !== 'behind' || foregroundAvailable(foregroundPreparation, frame)),
      )
      .map((m, i) => (
        <Sequence
          key={i}
          from={Math.round(m.start * fps)}
          durationInFrames={Math.max(1, Math.round(m.end * fps) - Math.round(m.start * fps))}
        >
          <TimedMotion event={m} accent={accent} />
        </Sequence>
      ));
  return (
    <AbsoluteFill
      style={{
        background: theme.background || '#101820',
        overflow: 'hidden',
        color: '#fff',
        fontFamily: theme.fontFamily || 'Arial, sans-serif',
      }}
    >
      {theme.techBackground && <AbsoluteFill style={{background:'radial-gradient(ellipse at 50% 65%,#00D08418,transparent 65%),#07100F'}}/>}
      <AbsoluteFill
        style={{
          transform: `translateX(${transition.x}px) translateY(${windowState.y}px) scale(${transition.scale*windowState.scale})`,
          borderRadius: inset ? 28*inset : 0,
          overflow: 'hidden',
          filter: transition.blur ? `blur(${transition.blur}px)` : undefined,
        }}
      >
        {cuts.map((c, i) => (
          <Sequence key={i} from={c.from} durationInFrames={c.durationInFrames}>
            <Shot clip={c} fit={theme.fit || 'contain'} />
          </Sequence>
        ))}
      </AbsoluteFill>
      {!sourceOnly && (
        <>
          {layers('behind')}
          {foregroundActive({ foregroundSrc, foregroundPreparation, motions, fps }, frame) && (
            <AbsoluteFill>
              <OffthreadVideo
                transparent
                muted
                src={media(foregroundSrc)}
                style={{ width: '100%', height: '100%', objectFit: theme.fit || 'contain' }}
              />
            </AbsoluteFill>
          )}
          {theme.gradient && (
            <AbsoluteFill
              style={{ background: 'linear-gradient(transparent 55%,rgba(0,0,0,.7))' }}
            />
          )}
          {theme.vignette && <AbsoluteFill style={{background:'radial-gradient(ellipse at 50% 40%,transparent 40%,rgba(0,0,0,.24) 100%)',pointerEvents:'none'}}/>}
          {title && (
            <Sequence
              from={Math.round((title.start || 0) * fps)}
              durationInFrames={Math.round((title.duration || 3) * fps)}
            >
              <TimedMotion
                event={{
                  ...title,
                  kind: 'title',
                  start: 0,
                  end: title.duration || 3,
                  position: title.position || { x: 85, y: 190, width: 880 },
                }}
                accent={accent}
              />
            </Sequence>
          )}
          {layers('front')}
          {captionStyle.enabled !== false && (
            <Captions segments={captions} style={captionStyle} accent={accent} />
          )}
          {music && (
            <Audio
              src={media(music.source)}
              volume={(f) =>
                music.duck === false ? (music.volume ?? 0.08) : musicGain(f, captions, music)
              }
              loopVolumeCurveBehavior="extend"
              loop
            />
          )}
          {sfx.map((s, i) => (
            <Sequence
              key={i}
              from={Math.round(s.start * fps)}
              durationInFrames={Math.round(s.duration * fps)}
            >
              <Audio src={media(s.source)} volume={s.volume ?? 0.12} />
            </Sequence>
          ))}
          {debugSafeAreas && (
            <AbsoluteFill
              style={{
                border: 'solid 2px #77ffaa',
                inset: '150px 105px 270px 85px',
                width: 'auto',
                height: 'auto',
              }}
            />
          )}
        </>
      )}
    </AbsoluteFill>
  );
};
