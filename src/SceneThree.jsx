import React, { useMemo, useLayoutEffect } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { useLoader, useThree } from '@react-three/fiber';
import { staticFile } from 'remotion';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { camera3dAt } from './scene3d.mjs';
const source = (asset) =>
  /^(data:|https?:)/.test(asset) ? asset : staticFile(asset.replace(/^\//, ''));
function CameraRig({ state }) {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.position.set(...state.position);
    camera.lookAt(...state.target);
    camera.fov = state.fov;
    camera.updateProjectionMatrix();
  }, [camera, ...state.position, ...state.target, state.fov]);
  return null;
}
function printedTexture(text, background, accent, ui = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 1024;
  const c = canvas.getContext('2d');
  c.fillStyle = background;
  c.fillRect(0, 0, 768, 1024);
  c.strokeStyle = accent;
  c.lineWidth = 3;
  c.strokeRect(42, 42, 684, 940);
  c.fillStyle = accent;
  c.font = `700 ${ui ? 48 : 72}px Arial`;
  c.textAlign = 'center';
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/)) {
    if (c.measureText(line + ' ' + word).width > 620 && line) {
      lines.push(line);
      line = word;
    } else line += (line ? ' ' : '') + word;
  }
  if (line) lines.push(line);
  lines.forEach((value, i) => c.fillText(value, 384, ui ? 160 + i * 65 : 420 + i * 90));
  if (ui) {
    for (let i = 0; i < 4; i++) {
      c.fillStyle = i === 1 ? accent : '#2a485a';
      c.fillRect(85, 340 + i * 125, 598, i === 1 ? 70 : 45);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function Book({ text, accent, scene }) {
  const texture = useMemo(
    () => printedTexture(text, scene.coverColor || '#102c3b', accent),
    [text, accent, scene.coverColor],
  );
  return (
    <group>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.82, 2.72, 0.38]} />
        <meshStandardMaterial color="#e9dfca" roughness={0.85} />
      </mesh>
      {[-0.24, 0.24].map((z) => (
        <mesh key={z} position={[0, 0, z]} castShadow>
          <boxGeometry args={[2, 2.9, 0.08]} />
          <meshStandardMaterial color={scene.coverColor || '#102c3b'} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.285]}>
        <planeGeometry args={[1.94, 2.84]} />
        <meshStandardMaterial map={texture} roughness={0.45} />
      </mesh>
      <mesh position={[-0.98, 0, 0]} castShadow>
        <boxGeometry args={[0.12, 2.9, 0.56]} />
        <meshStandardMaterial color={accent} metalness={0.45} roughness={0.4} />
      </mesh>
      {Array.from({ length: 18 }, (_, i) => (
        <mesh key={i} position={[0.92, 0, -0.17 + i * 0.02]}>
          <boxGeometry args={[0.006, 2.65, 0.002]} />
          <meshStandardMaterial color="#c8baa3" />
        </mesh>
      ))}
    </group>
  );
}
function ImportedModel({ asset }) {
  const gltf = useLoader(GLTFLoader, source(asset));
  const prepared = useMemo(() => {
    const clone = gltf.scene.clone(true),
      bounds = new THREE.Box3().setFromObject(clone),
      size = bounds.getSize(new THREE.Vector3()),
      center = bounds.getCenter(new THREE.Vector3());
    const scale = 3 / Math.max(size.x, size.y, size.z, 0.001);
    clone.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return { clone, scale, position: center.multiplyScalar(-scale).toArray() };
  }, [gltf]);
  return (
    <group scale={prepared.scale} position={prepared.position}>
      <primitive object={prepared.clone} />
    </group>
  );
}
function ImagePanel({ panel, index, count, accent }) {
  return panel.asset ? (
    <AssetPanel panel={panel} index={index} count={count} />
  ) : (
    <LabelPanel panel={panel} index={index} count={count} accent={accent} />
  );
}
function PanelMesh({ texture, index, count, panel }) {
  const position = panel.position || [
    (index - (count - 1) / 2) * 1.75,
    Math.sin(index * 1.4) * 0.3,
    -Math.abs(index - (count - 1) / 2) * 0.6,
  ];
  return (
    <mesh
      position={position}
      rotation={panel.rotation || [0, (index - (count - 1) / 2) * -0.2, 0]}
      castShadow
    >
      <boxGeometry args={panel.size || [1.55, 2.3, 0.07]} />
      <meshStandardMaterial map={texture} color="#ffffff" roughness={0.45} />
    </mesh>
  );
}
function AssetPanel(props) {
  const texture = useLoader(THREE.TextureLoader, source(props.panel.asset));
  texture.colorSpace = THREE.SRGBColorSpace;
  return <PanelMesh {...props} texture={texture} />;
}
function LabelPanel(props) {
  const texture = useMemo(
    () =>
      printedTexture(props.panel.label, props.panel.background || '#0a2333', props.accent, true),
    [props.panel.label, props.panel.background, props.accent],
  );
  return <PanelMesh {...props} texture={texture} />;
}
function Primitive({ node }) {
  const args =
    node.args ||
    {
      box: [1, 1, 1],
      sphere: [0.8, 48, 32],
      cylinder: [0.6, 0.6, 1.7, 48],
      torus: [0.7, 0.18, 24, 64],
      plane: [5, 5],
    }[node.geometry];
  return (
    <mesh
      position={node.position}
      rotation={node.rotation}
      scale={node.scale}
      castShadow
      receiveShadow
    >
      {React.createElement(node.geometry + 'Geometry', { args })}
      <meshStandardMaterial
        color={node.color || '#d4b376'}
        metalness={node.metalness ?? 0.15}
        roughness={node.roughness ?? 0.4}
      />
    </mesh>
  );
}
export function SceneThree({
  variant,
  frame,
  fps,
  scene = {},
  asset,
  panels = [],
  text,
  accent,
  position,
}) {
  const width = Math.round(position?.width || 880),
    height = Math.round(position?.height || 760),
    time = frame / fps,
    camera = camera3dAt(scene.camera, time),
    rotation = scene.rotation || [0.08, -0.25, 0],
    spin = scene.spin ?? 0.12;
  const lights = scene.lights || [
    { type: 'ambient', intensity: 0.65 },
    { type: 'directional', position: [-3, 5, 4], intensity: 3, color: '#fff0d8' },
    { type: 'point', position: [3, 2, -2], intensity: 22, color: accent },
  ];
  return (
    <div
      style={{
        position: 'absolute',
        left: position?.x ?? 85,
        top: position?.y ?? 550,
        width,
        height,
      }}
    >
      <ThreeCanvas
        width={width}
        height={height}
        dpr={1}
        shadows={{ type: THREE.PCFShadowMap }}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        camera={{ position: camera.position, fov: camera.fov }}
      >
        <CameraRig state={camera} />
        {lights.map((light, i) =>
          React.createElement(light.type + 'Light', {
            key: i,
            intensity: light.intensity,
            color: light.color || '#fff',
            position: light.position,
            ...(light.type !== 'ambient'
              ? { castShadow: true, 'shadow-mapSize': [1024, 1024], 'shadow-bias': -0.001 }
              : {}),
          }),
        )}
        <group rotation={[rotation[0], rotation[1] + time * spin, rotation[2]]}>
          {variant === 'product3d' &&
            (asset ? (
              <ImportedModel asset={asset} />
            ) : scene.product === 'book' ? (
              <Book text={text} accent={accent} scene={scene} />
            ) : null)}
          {variant === 'ui3d' &&
            panels.map((panel, i) => (
              <ImagePanel key={i} panel={panel} index={i} count={panels.length} accent={accent} />
            ))}
          {(scene.nodes || []).map((node, i) => (
            <Primitive key={i} node={node} />
          ))}
        </group>
        {scene.ground !== false && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.65, 0]} receiveShadow>
            <planeGeometry args={[200, 200]} />
            <shadowMaterial opacity={0.28} />
          </mesh>
        )}
      </ThreeCanvas>
    </div>
  );
}
