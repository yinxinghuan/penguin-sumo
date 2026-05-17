import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';

// 8 baby-penguin color variants — high-contrast dark heads that read from top-down.
const BABY_PALETTE = [
  '#101820', '#1a2436', '#2a1a3a', '#3a1f1f',
  '#102a1a', '#1a1838', '#251a10', '#3a2a4a',
];

interface PenguinProps {
  isLeader?: boolean;
  colorType?: number;
  scale?: number;
}

export function Penguin({ isLeader = false, colorType = 0, scale = 1 }: PenguinProps) {
  const palette = useMemo(() => ({
    body: isLeader ? '#1d2330' : BABY_PALETTE[colorType % BABY_PALETTE.length],
    belly: '#f4ecd8',
    beak: '#f7b04a',
    feet: '#f29a3a',
    eye: '#0a0a0a',
    eyeShine: '#ffffff',
    cheek: isLeader ? '#ff6b6b' : '#ffb0c0',
    crown: isLeader ? '#ffd84a' : undefined,
  }), [isLeader, colorType]);

  const s = isLeader ? 1 : 0.72;
  const sz = s * scale;
  const bounceRef = useRef<THREE.Group>(null);
  // Stagger each penguin's hop a bit so the chain isn't perfectly synced.
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }) => {
    const g = bounceRef.current;
    if (!g) return;
    const t = clock.getElapsedTime() * 6 + phase;
    g.position.y = Math.abs(Math.sin(t)) * 0.6;
    g.rotation.z = Math.sin(t) * 0.1;
    g.rotation.x = 0.1;
  });

  return (
    <group scale={sz}>
      {/* contact shadow stays on the ice while the body hops above */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 24]} />
        <meshBasicMaterial color="#0a1a2a" transparent opacity={0.35} />
      </mesh>
      <group ref={bounceRef}>
      {/* body */}
      <RoundedBox args={[0.95, 1.15, 0.85]} radius={0.38} smoothness={6} position={[0, 0.6, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={palette.body} roughness={0.7} />
      </RoundedBox>
      {/* belly — big rounded box that wraps the front for top-down visibility */}
      <RoundedBox args={[0.70, 0.92, 0.40]} radius={0.28} smoothness={5} position={[0, 0.55, 0.30]} castShadow>
        <meshStandardMaterial color={palette.belly} roughness={0.8} />
      </RoundedBox>
      {/* face (faces +z) */}
      <group position={[0, 1.15, 0.18]}>
        {/* eyes */}
        <mesh position={[-0.2, 0.05, 0.36]} castShadow>
          <sphereGeometry args={[0.10, 16, 16]} />
          <meshStandardMaterial color={palette.eye} />
        </mesh>
        <mesh position={[0.2, 0.05, 0.36]} castShadow>
          <sphereGeometry args={[0.10, 16, 16]} />
          <meshStandardMaterial color={palette.eye} />
        </mesh>
        {/* eye shines */}
        <mesh position={[-0.17, 0.10, 0.45]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial color={palette.eyeShine} emissive={palette.eyeShine} emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0.23, 0.10, 0.45]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial color={palette.eyeShine} emissive={palette.eyeShine} emissiveIntensity={0.6} />
        </mesh>
        {/* cheek */}
        <mesh position={[-0.32, -0.12, 0.35]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color={palette.cheek} transparent opacity={0.85} />
        </mesh>
        <mesh position={[0.32, -0.12, 0.35]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color={palette.cheek} transparent opacity={0.85} />
        </mesh>
        {/* beak */}
        <mesh position={[0, -0.12, 0.45]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <coneGeometry args={[0.10, 0.22, 6]} />
          <meshStandardMaterial color={palette.beak} />
        </mesh>
      </group>
      {/* feet */}
      <mesh position={[-0.18, 0.05, 0.42]} castShadow>
        <boxGeometry args={[0.25, 0.08, 0.32]} />
        <meshStandardMaterial color={palette.feet} />
      </mesh>
      <mesh position={[0.18, 0.05, 0.42]} castShadow>
        <boxGeometry args={[0.25, 0.08, 0.32]} />
        <meshStandardMaterial color={palette.feet} />
      </mesh>
      {/* leader crown ring — gold halo so the player can spot themselves */}
      {isLeader && palette.crown && (
        <mesh position={[0, 1.78, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.22, 0.05, 8, 18]} />
          <meshStandardMaterial color={palette.crown} emissive={palette.crown} emissiveIntensity={0.4} />
        </mesh>
      )}
      </group>{/* /bounceRef */}
    </group>
  );
}

// Helper hook for following position/rotation refs without re-rendering.
export function useFollowGroup(group: THREE.Object3D | null, pos: THREE.Vector3, rotY: number) {
  if (!group) return;
  group.position.copy(pos);
  group.rotation.y = rotY;
}
