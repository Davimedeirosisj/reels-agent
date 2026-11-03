import React from 'react';
import { Composition } from 'remotion';
import { PastoralReel } from './PastoralReel';
import { validateJob } from './editorial.mjs';
import { MotionShowcase, showcaseKinds } from './Showcase';
const defaults = {
  clips: [{ source: 'demo-input.mp4', start: 0, end: 5 }],
  transcript: { segments: [] },
  motions: [],
  theme: { fit: 'contain' },
};
export const RemotionRoot = () => (
  <>
    <Composition
      id="PastoralReel"
      component={PastoralReel}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={defaults}
      calculateMetadata={({ props }) => {
        const v = validateJob(props);
        if (v.errors.length) throw new Error(v.errors.join('\n'));
        return {
          durationInFrames: v.durationInFrames,
          fps: props.fps || 30,
          width: props.width || 1080,
          height: props.height || 1920,
        };
      }}
    />
    <Composition
      id="MotionShowcase"
      component={MotionShowcase}
      durationInFrames={showcaseKinds.length * 54}
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);
