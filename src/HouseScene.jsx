import React, { useLayoutEffect } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import { houseState } from './house-motion.mjs';

function Block({
  at = [0, 0, 0],
  size = [1, 1, 1],
  color = '#47635b',
  rotation = [0, 0, 0],
  opacity = 1,
}) {
  return (
    <mesh position={at} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={0.65}
        metalness={0.08}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}
function Chair({ x, z, rotate = 0 }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotate, 0]}>
      <Block at={[0, 0.35, 0]} size={[0.38, 0.08, 0.4]} color="#c59664" />
      <Block at={[0, 0.62, -0.18]} size={[0.38, 0.5, 0.07]} color="#c59664" />
      {[-0.13, 0.13].flatMap((a) =>
        [-0.13, 0.13].map((b) => (
          <Block key={`${a}:${b}`} at={[a, 0.16, b]} size={[0.04, 0.35, 0.04]} color="#34433d" />
        )),
      )}
    </group>
  );
}
function Table({ scale = 1 }) {
  return (
    <group scale={scale}>
      <Block at={[0, 0.65, 0]} size={[1.3, 0.12, 0.85]} color="#d2aa78" />
      {[-0.5, 0.5].flatMap((x) =>
        [-0.28, 0.28].map((z) => (
          <Block key={`${x}:${z}`} at={[x, 0.3, z]} size={[0.07, 0.6, 0.07]} color="#c59664" />
        )),
      )}
      <Chair x={-0.88} z={0} rotate={Math.PI / 2} />
      <Chair x={0.88} z={0} rotate={-Math.PI / 2} />
      {[-0.35, 0.35].map((x) => (
        <mesh key={x} position={[x, 0.73, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.17, 24]} />
          <meshStandardMaterial color="#f3eadb" />
        </mesh>
      ))}
    </group>
  );
}
function Room({ x, z, index }) {
  return (
    <group position={[x, 0, z]}>
      <Block at={[0, -0.09, 0]} size={[2.45, 0.18, 1.95]} color="#c3b89f" />
      <Block at={[0, 0.38, -0.96]} size={[2.45, 0.86, 0.1]} color="#568875" />
      <Block at={[-1.17, 0.38, 0]} size={[0.1, 0.86, 1.95]} color="#375b51" />
      <Block at={[0, 0.01, 0.91]} size={[2.45, 0.025, 0.025]} color="#49e6d1" />
      {index === 0 ? (
        <Table scale={0.65} />
      ) : index === 1 ? (
        <>
          <Block at={[0, 0.2, 0]} size={[1.4, 0.4, 0.65]} color="#0c5344" />
          <Block at={[0, 0.48, -0.27]} size={[1.4, 0.35, 0.16]} color="#0c5344" />
          <Block at={[0.4, 0.58, -0.85]} size={[0.85, 0.52, 0.06]} color="#111a19" />
          <Block at={[0.4, 0.58, -0.811]} size={[0.74, 0.41, 0.01]} color="#49e6d1" />
        </>
      ) : index === 2 ? (
        <>
          <Block at={[0, 0.27, 0]} size={[1.3, 0.5, 1.3]} color="#b49e81" />
          <Block at={[0, 0.55, 0]} size={[1.28, 0.1, 1.27]} color="#d9dcc8" />
          <Block at={[0, 0.63, -0.4]} size={[0.9, 0.1, 0.3]} color="#f4f1e9" />
        </>
      ) : (
        <>
          <Table scale={0.65} />
          <Block at={[0, 0.5, 0]} size={[0.4, 0.06, 0.33]} color="#084d3b" />
        </>
      )}
    </group>
  );
}
function Rig() {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.lookAt(0, 0.3, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}
export function HouseScene({ frame, fps, mode = 'separate' }) {
  const s = houseState(frame, fps, mode),
    gap = s.separated * 0.65;
  return (
    <ThreeCanvas
      width={970}
      height={860}
      style={{ position: 'absolute', left: 55, top: 440 }}
      dpr={1}
      shadows
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
      camera={{ position: [8.8, 9.8, 12.4], fov: 37 }}
    >
      <Rig />
      <ambientLight intensity={1.5} />
      <directionalLight
        position={[-4, 9, 5]}
        intensity={3.4}
        color="#fff0da"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[4, 3, -4]} intensity={35} color="#49e6d1" />
      <group rotation={[0, s.yaw, 0]}>
        <Block at={[0, -0.23, 0]} size={[8.8, 0.14, 7.3]} color="#132c25" />
        {[-1, 1].flatMap((sx, a) =>
          [-1, 1].map((sz, b) => (
            <Room key={`${a}:${b}`} x={sx * (1.85 + gap)} z={sz * (1.55 + gap)} index={a * 2 + b} />
          )),
        )}
        {s.centerGlow > 0 && (
          <group scale={s.centerGlow} position={[0, 0, 0]}>
            <Table scale={0.6} />
          </group>
        )}
        {s.roofOpacity > 0.001 && (
          <group position={[0, 1.45 + s.roofLift, 0]}>
            <Block
              at={[-1.6, 0.35, 0]}
              size={[3.4, 0.12, 5.4]}
              rotation={[0, 0, 0.3]}
              color="#0c8061"
              opacity={s.roofOpacity}
            />
            <Block
              at={[1.6, 0.35, 0]}
              size={[3.4, 0.12, 5.4]}
              rotation={[0, 0, -0.3]}
              color="#11a077"
              opacity={s.roofOpacity}
            />
          </group>
        )}
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.32, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <shadowMaterial opacity={0.3} />
      </mesh>
    </ThreeCanvas>
  );
}
