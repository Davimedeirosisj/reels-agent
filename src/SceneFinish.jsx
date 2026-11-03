import React, { useMemo, useLayoutEffect, useEffect } from 'react';
import { EffectComposer, ChromaticAberration, ToneMapping } from '@react-three/postprocessing';
import { Effect, BloomEffect, BlendFunction, ToneMappingMode } from 'postprocessing';
import { Uniform, Vector2 } from 'three';
import { random } from 'remotion';
import { resolvePostprocessing } from './postprocessing.mjs';

class TransparentBloomEffect extends BloomEffect {
  constructor(options) {
    super({ ...options, mipmapBlur: true });
    // The stock blur texture has opaque alpha, including its black background.
    // Keep its radiance while preserving the original geometry's coverage.
    this.setFragmentShader(`
      uniform highp sampler2D map;
      uniform float intensity;
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        outputColor = vec4(texture2D(map, uv).rgb * intensity, 0.0);
      }
    `);
  }
}
function TransparentBloom({ intensity, luminanceThreshold, luminanceSmoothing, radius, levels }) {
  const effect = useMemo(
    () =>
      new TransparentBloomEffect({
        intensity,
        luminanceThreshold,
        luminanceSmoothing,
        radius,
        levels,
      }),
    [intensity, luminanceThreshold, luminanceSmoothing, radius, levels],
  );
  useEffect(() => () => effect.dispose(), [effect]);
  return <primitive object={effect} />;
}

// Own shader: all temporal variation comes from an explicit frame/seed pair.
// Reconstruct alpha for light spread into transparent pixels. Noise never
// creates opacity in empty space, so the sermon beneath the canvas stays clear.
const shader = `
uniform float amount;
uniform float grainSize;
uniform float frameSeed;
uniform vec2 pixelSize;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float peak = max(max(inputColor.r, inputColor.g), inputColor.b);
  float encodedPeak = peak <= 0.0031308 ? 12.92 * peak : 1.055 * pow(max(peak, 0.0), 1.0 / 2.4) - 0.055;
  float coverage = max(inputColor.a, clamp(encodedPeak, 0.0, 1.0));
  vec2 cell = floor(uv * pixelSize / grainSize);
  float value = fract(sin(dot(cell, vec2(12.9898, 78.233)) + frameSeed * 113.17) * 43758.5453) - 0.5;
  // Grain strength is perceptual sRGB, not linear radiance: dark material must
  // not acquire disproportionately bright speckles before output encoding.
  vec3 radiance = max(inputColor.rgb, vec3(0.0));
  vec3 encoded = mix(12.92 * radiance, 1.055 * pow(radiance, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), radiance));
  encoded = clamp(encoded + value * amount * coverage, vec3(0.0), vec3(coverage));
  vec3 color = mix(encoded / 12.92, pow((encoded + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), encoded));
  outputColor = vec4(color, coverage);
}`;
class FrameFinishEffect extends Effect {
  constructor() {
    super('ReelsFrameFinish', shader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['amount', new Uniform(0)],
        ['grainSize', new Uniform(1)],
        ['frameSeed', new Uniform(0)],
        ['pixelSize', new Uniform(new Vector2(1, 1))],
      ]),
    });
  }
}
function FrameFinish({ frame, grain, width, height }) {
  const effect = useMemo(() => new FrameFinishEffect(), []);
  useLayoutEffect(() => {
    effect.uniforms.get('amount').value = grain?.opacity || 0;
    effect.uniforms.get('grainSize').value = grain?.size || 1;
    effect.uniforms.get('pixelSize').value.set(width, height);
    effect.uniforms.get('frameSeed').value = random(
      `${grain?.seed ?? 'reels-agent'}:${grain?.animate ? frame : 0}`,
    );
  }, [effect, frame, grain?.opacity, grain?.size, grain?.seed, grain?.animate, width, height]);
  useEffect(() => () => effect.dispose(), [effect]);
  return <primitive object={effect} />;
}
export function SceneFinish({ config, frame, width, height }) {
  const effects = resolvePostprocessing(config);
  if (!effects) return null;
  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      {effects.bloom && <TransparentBloom {...effects.bloom} />}
      {effects.chromaticAberration && (
        <ChromaticAberration offset={effects.chromaticAberration.offset} />
      )}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <FrameFinish frame={frame} grain={effects.grain} width={width} height={height} />
    </EffectComposer>
  );
}
