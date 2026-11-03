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
    scene: {
      product: 'book',
      spin: 0.18,
      camera: [
        { time: 0, position: [2, 1, 6] },
        { time: 1.8, position: [-1, 1, 6] },
      ],
      nodes:
        kind === 'light3d'
          ? [
              {
                geometry: 'sphere',
                position: [0, 0.15, 0],
                color: '#e7bd78',
                metalness: 0.6,
                roughness: 0.25,
              },
              { geometry: 'box', args: [2.2, 0.25, 2.2], position: [0, -1.2, 0], color: '#143248' },
            ]
          : [],
    },
    graph: {
      nodes: [
        { id: 'a', label: 'Contexto' },
        { id: 'b', label: 'Ensino' },
        { id: 'c', label: 'Aplicação' },
        { id: 'd', label: 'Reflexão' },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'c' },
        { from: 'b', to: 'd' },
        { from: 'c', to: 'd' },
      ],
    },
    question: 'O que orienta o visual?',
    answer: 'A mensagem e seu contexto.',
    answerAt: 0.7,
    term: 'Contexto',
    ui: {
      title: 'Ilustração do fluxo de edição',
      rows: [
        { id: 'speech', label: 'Trecho', value: '' },
        { id: 'review', label: 'Revisar o contexto', kind: 'check', checked: false },
      ],
      steps: [
        {
          at: 0,
          target: 'speech',
          action: 'type',
          value: 'Preservar a mensagem',
          charsPerSecond: 25,
        },
        { at: 0.8, target: 'review', action: 'select' },
        { at: 1.1, target: 'review', action: 'toggle', value: true },
      ],
    },
    text:
      kind === 'definition'
        ? 'O trecho anterior e posterior que ajuda a compreender a fala.'
        : ['counter', 'kpi', 'chart'].includes(kind)
          ? 'Dados de demonstração'
          : 'A MENSAGEM\nORIENTA O VISUAL',
    items: ['image-sequence', 'topic-montage'].includes(kind)
      ? [
          { asset: 'demo-art.svg', duration: 0.9, label: 'Primeiro tópico' },
          { asset: 'demo-foreground.svg', duration: 0.9, label: 'Segundo tópico' },
        ]
      : ['Contexto', 'Princípio', 'Aplicação'],
    panels: [
      { asset: 'demo-art.svg', label: 'Contexto' },
      { asset: 'demo-foreground.svg', label: 'Aplicação' },
    ],
    layers: [
      { asset: 'demo-art.svg', depth: 0 },
      { asset: 'demo-foreground.svg', depth: 160, transparent: true },
    ],
    values: [12, 24, 18],
    labels: ['A', 'B', 'C'],
    value: 24,
    evidence: 'Dados sintéticos, não atribuídos a uma pregação',
    subtitle: 'ENSAIO VISUAL • NÃO É CITAÇÃO BÍBLICA',
    asset: ['product3d', 'ui3d', 'light3d'].includes(kind) ? undefined : 'demo-art.svg',
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
