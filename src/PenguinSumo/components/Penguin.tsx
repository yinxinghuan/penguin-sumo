import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';

interface PenguinProps {
  bodyColor: string;
  beltColor: string;
  isPlayer?: boolean;
  scale?: number;
}

// Sumo wrestler penguin. Same body silhouette as the PR penguin (rounded box
// torso + chunky belly + flat-disc face), but with a colored mawashi belt
// wrapped around the waist and a knotted apron drop in front. The body color
// distinguishes which AI personality this is (rookie/bruiser/sniper); the
// belt color further reinforces ID. The player wears the classic red
// mawashi + has the gold "leader" halo from PR for instant recognition.
export function Penguin({ bodyColor, beltColor, isPlayer = false, scale = 1 }: PenguinProps) {
  const palette = useMemo(() => ({
    body: bodyColor,
    belly: '#f4ecd8',
    beak: '#f7b04a',
    feet: '#f29a3a',
    eye: '#0a0a0a',
    eyeShine: '#ffffff',
    cheek: isPlayer ? '#ff6b6b' : '#d59ba0',
  }), [bodyColor, isPlayer]);

  const sz = scale;
  const bounceRef = useRef<THREE.Group>(null);
  // Stagger hops so 4 penguins don't bob in sync.
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }) => {
    const g = bounceRef.current;
    if (!g) return;
    const t = clock.getElapsedTime() * 5 + phase;
    g.position.y = Math.abs(Math.sin(t)) * 0.35;
    g.rotation.z = Math.sin(t) * 0.06;
    g.rotation.x = 0.05;
  });

  return (
    <group scale={sz}>
      {/* contact shadow stays on the ice while the body hops above */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 24]} />
        <meshBasicMaterial color="#0a1a2a" transparent opacity={0.45} />
      </mesh>
      <group ref={bounceRef}>
        {/* body — chunkier than PR's penguin (sumos are wide) */}
        <RoundedBox args={[1.1, 1.15, 0.95]} radius={0.42} smoothness={6} position={[0, 0.6, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={palette.body} roughness={0.7} />
        </RoundedBox>
        {/* belly */}
        <RoundedBox args={[0.80, 0.92, 0.42]} radius={0.30} smoothness={5} position={[0, 0.55, 0.35]} castShadow>
          <meshStandardMaterial color={palette.belly} roughness={0.8} />
        </RoundedBox>

        {/* MAWASHI belt — wraps the waist horizontally, distinguishing color */}
        <mesh position={[0, 0.30, 0]} castShadow>
          <cylinderGeometry args={[0.62, 0.62, 0.22, 24]} />
          <meshStandardMaterial color={beltColor} roughness={0.6} />
        </mesh>
        {/* belt knot — slight rectangle on the back */}
        <RoundedBox args={[0.20, 0.20, 0.08]} radius={0.03} smoothness={3}
                    position={[0, 0.32, -0.55]} castShadow>
          <meshStandardMaterial color={beltColor} roughness={0.5} />
        </RoundedBox>
        {/* belt apron — short panel hanging down in front */}
        <RoundedBox args={[0.42, 0.32, 0.04]} radius={0.04} smoothness={3}
                    position={[0, 0.16, 0.55]} castShadow>
          <meshStandardMaterial color={beltColor} roughness={0.55} />
        </RoundedBox>

        {/* face (faces +z) */}
        <group position={[0, 1.15, 0.18]}>
          <mesh position={[-0.2, 0.05, 0.36]} castShadow>
            <sphereGeometry args={[0.10, 16, 16]} />
            <meshStandardMaterial color={palette.eye} />
          </mesh>
          <mesh position={[0.2, 0.05, 0.36]} castShadow>
            <sphereGeometry args={[0.10, 16, 16]} />
            <meshStandardMaterial color={palette.eye} />
          </mesh>
          <mesh position={[-0.17, 0.10, 0.45]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color={palette.eyeShine} emissive={palette.eyeShine} emissiveIntensity={0.6} />
          </mesh>
          <mesh position={[0.23, 0.10, 0.45]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color={palette.eyeShine} emissive={palette.eyeShine} emissiveIntensity={0.6} />
          </mesh>
          {/* fierce eyebrow ridges — sumo "kishi" stare */}
          <mesh position={[-0.20, 0.20, 0.34]} rotation={[0, 0, -0.3]}>
            <boxGeometry args={[0.16, 0.04, 0.04]} />
            <meshStandardMaterial color={palette.eye} />
          </mesh>
          <mesh position={[ 0.20, 0.20, 0.34]} rotation={[0, 0,  0.3]}>
            <boxGeometry args={[0.16, 0.04, 0.04]} />
            <meshStandardMaterial color={palette.eye} />
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

        {/* topknot — small dark dome on the head, sumo chonmage */}
        <mesh position={[0, 1.65, 0]} castShadow>
          <sphereGeometry args={[0.12, 14, 10]} />
          <meshStandardMaterial color="#0a0a0e" roughness={0.85} />
        </mesh>
        <mesh position={[0, 1.80, -0.04]} castShadow rotation={[0.3, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.06, 0.18, 8]} />
          <meshStandardMaterial color="#0a0a0e" roughness={0.85} />
        </mesh>

        {/* feet — kept simple, slightly wider stance for sumo footing */}
        <mesh position={[-0.22, 0.05, 0.42]} castShadow>
          <boxGeometry args={[0.28, 0.08, 0.34]} />
          <meshStandardMaterial color={palette.feet} />
        </mesh>
        <mesh position={[0.22, 0.05, 0.42]} castShadow>
          <boxGeometry args={[0.28, 0.08, 0.34]} />
          <meshStandardMaterial color={palette.feet} />
        </mesh>

        {/* player crown halo — gold ring so the player spots themselves fast */}
        {isPlayer && (
          <mesh position={[0, 2.05, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.24, 0.05, 8, 18]} />
            <meshStandardMaterial color="#ffd84a" emissive="#ffd84a" emissiveIntensity={0.55} />
          </mesh>
        )}
      </group>
    </group>
  );
}
