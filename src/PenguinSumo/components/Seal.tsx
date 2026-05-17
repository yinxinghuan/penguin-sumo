import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';

export function Seal() {
  const bounceRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = bounceRef.current;
    if (!g) return;
    const t = clock.getElapsedTime() * 8;
    g.position.y = Math.abs(Math.sin(t)) * 0.5;
    g.rotation.z = Math.sin(t) * 0.12;
  });

  return (
    <group>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.7, 24]} />
        <meshBasicMaterial color="#0a1a2a" transparent opacity={0.35} />
      </mesh>
      <group ref={bounceRef}>
      <RoundedBox args={[0.85, 0.55, 1.3]} radius={0.27} smoothness={6} position={[0, 0.35, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#465464" />
      </RoundedBox>
      {/* belly */}
      <mesh position={[0, 0.18, 0.1]}>
        <boxGeometry args={[0.55, 0.2, 1.0]} />
        <meshStandardMaterial color="#9aaab8" />
      </mesh>
      {/* head bump */}
      <mesh position={[0, 0.55, 0.55]} castShadow>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshStandardMaterial color="#465464" />
      </mesh>
      {/* eyes */}
      <mesh position={[-0.13, 0.62, 0.82]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      <mesh position={[0.13, 0.62, 0.82]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      {/* nose */}
      <mesh position={[0, 0.48, 0.88]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      {/* whisker spots */}
      {[-0.08, 0, 0.08].map((x, i) => (
        <mesh key={i} position={[x, 0.42, 0.86]}>
          <sphereGeometry args={[0.015, 6, 6]} />
          <meshStandardMaterial color="#202020" />
        </mesh>
      ))}
      {/* tail flippers */}
      <mesh position={[0, 0.20, -0.75]} rotation={[0, 0, 0]} castShadow>
        <coneGeometry args={[0.32, 0.45, 4]} />
        <meshStandardMaterial color="#465464" />
      </mesh>
      {/* side flippers */}
      <mesh position={[-0.45, 0.15, 0.0]} rotation={[0, 0, -0.4]} castShadow>
        <boxGeometry args={[0.30, 0.10, 0.35]} />
        <meshStandardMaterial color="#465464" />
      </mesh>
      <mesh position={[0.45, 0.15, 0.0]} rotation={[0, 0, 0.4]} castShadow>
        <boxGeometry args={[0.30, 0.10, 0.35]} />
        <meshStandardMaterial color="#465464" />
      </mesh>
      </group>{/* /bounceRef */}
    </group>
  );
}
