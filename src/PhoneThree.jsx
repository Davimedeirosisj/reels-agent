import React, { useMemo, useEffect } from 'react';
import { useLoader } from '@react-three/fiber';
import { staticFile } from 'remotion';
import * as THREE from 'three';
function roundedShape(width, height, radius) {
  const x = -width / 2,
    y = -height / 2,
    s = new THREE.Shape();
  s.moveTo(x + radius, y);
  s.lineTo(x + width - radius, y);
  s.quadraticCurveTo(x + width, y, x + width, y + radius);
  s.lineTo(x + width, y + height - radius);
  s.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  s.lineTo(x + radius, y + height);
  s.quadraticCurveTo(x, y + height, x, y + height - radius);
  s.lineTo(x, y + radius);
  s.quadraticCurveTo(x, y, x + radius, y);
  return s;
}
function PhoneScreen({ texture, shape }) {
  const geometry = useMemo(() => {
    const result = new THREE.ShapeGeometry(shape, 12);
    const position = result.attributes.position,
      uv = result.attributes.uv;
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, position.getX(i) / 1.5 + 0.5, position.getY(i) / 3.14 + 0.5);
    return result;
  }, [shape]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh position={[0, 0, 0.205]} geometry={geometry}>
      <meshStandardMaterial
        map={texture}
        emissiveMap={texture}
        emissive="#ffffff"
        emissiveIntensity={0.45}
        roughness={0.22}
      />
    </mesh>
  );
}
function AssetScreen({ asset, shape }) {
  const uri = /^(data:|https?:)/.test(asset) ? asset : staticFile(asset.replace(/^\//, ''));
  const texture = useLoader(THREE.TextureLoader, uri);
  texture.colorSpace = THREE.SRGBColorSpace;
  return <PhoneScreen texture={texture} shape={shape} />;
}
function LabelScreen({ label, accent, shape }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 1256;
    const c = canvas.getContext('2d');
    c.fillStyle = '#0a1824';
    c.fillRect(0, 0, 600, 1256);
    c.strokeStyle = accent;
    c.lineWidth = 3;
    c.strokeRect(36, 90, 528, 1080);
    c.fillStyle = accent;
    c.font = '800 48px Arial';
    c.textAlign = 'center';
    const lines = [];
    let line = '';
    for (const word of label.split(/\s+/)) {
      if (line && c.measureText(line + ' ' + word).width > 480) {
        lines.push(line);
        line = word;
      } else line += (line ? ' ' : '') + word;
    }
    if (line) lines.push(line);
    lines.forEach((text, i) => c.fillText(text, 300, 560 + i * 65));
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    return result;
  }, [label, accent]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <PhoneScreen texture={texture} shape={shape} />;
}
const extrusion = {
  depth: 0.14,
  bevelEnabled: true,
  bevelSegments: 4,
  steps: 1,
  bevelSize: 0.035,
  bevelThickness: 0.035,
  curveSegments: 12,
};
export function PhoneThree({ phone, accent }) {
  const body = useMemo(() => roundedShape(1.7, 3.4, 0.2), []);
  const screen = useMemo(() => roundedShape(1.5, 3.14, 0.14), []);
  return (
    <group
      position={phone.position || [0, 0, 0.6]}
      rotation={phone.rotation || [0, 0, 0]}
      scale={phone.scale || [1, 1, 1]}
    >
      <mesh castShadow receiveShadow>
        <extrudeGeometry args={[body, extrusion]} />
        <meshStandardMaterial color={phone.color || '#242735'} metalness={0.75} roughness={0.27} />
      </mesh>
      {phone.asset ? (
        <AssetScreen asset={phone.asset} shape={screen} />
      ) : (
        <LabelScreen label={phone.label} accent={accent} shape={screen} />
      )}
      <mesh position={[0, 1.43, 0.22]}>
        <boxGeometry args={[0.4, 0.07, 0.035]} />
        <meshStandardMaterial color="#05070b" roughness={0.2} />
      </mesh>
      <mesh position={[-0.87, 0.6, 0.07]}>
        <boxGeometry args={[0.035, 0.4, 0.09]} />
        <meshStandardMaterial color="#666977" metalness={0.85} roughness={0.25} />
      </mesh>
    </group>
  );
}
