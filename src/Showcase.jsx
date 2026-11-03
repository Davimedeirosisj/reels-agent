import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  Audio,
  staticFile,
} from 'remotion';
import { MotionLibrary, MOTION_VARIANTS } from './MotionLibrary';
export const showcaseKinds = MOTION_VARIANTS.filter((x) => x !== 'pause');
function Example({ kind }) {
  const frame = useCurrentFrame(),
    { fps } = useVideoConfig();
  const props = {
    variant: kind,
    frame,
    fps,
    durationInFrames: 54,
    text: ['counter', 'kpi', 'chart'].includes(kind)
      ? 'Dados de demonstração'
      : 'A MENSAGEM\nORIENTA O VISUAL',
    items: ['Contexto', 'Princípio', 'Aplicação'],
    values: [12, 24, 18],
    labels: ['A', 'B', 'C'],
    value: 24,
    evidence: 'Dados sintéticos, não atribuídos a uma pregação',
    subtitle: 'ENSAIO VISUAL • NÃO É CITAÇÃO BÍBLICA',
    asset: 'demo-art.svg',
    position: { x: 85, y: 650, width: 880 },
  };
  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse at 20% 20%,#17394c,#071019 65%)',
        color: '#fff',
        fontFamily: 'Arial',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 85,
          top: 170,
          color: '#e7bd78',
          letterSpacing: 5,
          fontSize: 24,
        }}
      >
        REELS AGENT / BIBLIOTECA
      </div>
      <div style={{ position: 'absolute', left: 85, top: 250, fontSize: 62, fontWeight: 800 }}>
        {kind.toUpperCase()}
      </div>
      <div style={{ position: 'absolute', left: 85, top: 340, fontSize: 26, color: '#a6b4c0' }}>
        Componente isolado • parâmetros de exemplo
      </div>
      <MotionLibrary {...props} />
      <div style={{ position: 'absolute', left: 85, bottom: 285, color: '#a6b4c0', fontSize: 24 }}>
        Dados e imagens autorais de teste
      </div>
    </AbsoluteFill>
  );
}
export const MotionShowcase = () => (
  <AbsoluteFill>
    {showcaseKinds.map((kind, i) => (
      <Sequence key={kind} from={i * 54} durationInFrames={54}>
        <Example kind={kind} />
      </Sequence>
    ))}
    <Audio src={staticFile('showcase-tone.wav')} volume={0.15} loop />
  </AbsoluteFill>
);
