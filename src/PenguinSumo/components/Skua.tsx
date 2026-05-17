import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Antarctic skua: brown-feathered raptor with a hooked yellow beak.
// Pose: wings spread, body angled forward, locked-on stare.
export function Skua() {
  const lWing = useRef<THREE.Group>(null);
  const rWing = useRef<THREE.Group>(null);

  // Wing flap animation
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const flap = Math.sin(t * 6) * 0.6;
    if (lWing.current) lWing.current.rotation.z =  flap;
    if (rWing.current) rWing.current.rotation.z = -flap;
  });

  // Slate / charcoal palette — far enough from the seal's blue-grey to read as
  // a distinct threat, and away from coffee-brown.
  const bodyColor  = '#2e2820';
  const bellyColor = '#6b5f4f';
  const wingDark   = '#15110c';
  const beak       = '#ffaa2e';

  return (
    <group rotation={[0.15, 0, 0]}>
      {/* contact shadow on ice */}
      <mesh position={[0, -2.98, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.8, 32]} />
        <meshBasicMaterial color="#000" transparent opacity={0.42} />
      </mesh>

      {/* body — torpedo shape angled forward */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <capsuleGeometry args={[0.45, 0.9, 6, 12]} />
        <meshStandardMaterial color={bodyColor} flatShading roughness={0.7} />
      </mesh>
      {/* tan belly stripe — visible from below / side */}
      <mesh position={[0, -0.20, 0.10]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <capsuleGeometry args={[0.30, 0.65, 4, 10]} />
        <meshStandardMaterial color={bellyColor} roughness={0.8} />
      </mesh>

      {/* head */}
      <mesh position={[0, 0.18, 0.78]} castShadow>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshStandardMaterial color={bodyColor} roughness={0.7} />
      </mesh>
      {/* eye whites + black pupils — angry look */}
      <mesh position={[-0.13, 0.24, 1.00]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshStandardMaterial color="#fff8d6" />
      </mesh>
      <mesh position={[0.13, 0.24, 1.00]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshStandardMaterial color="#fff8d6" />
      </mesh>
      <mesh position={[-0.13, 0.21, 1.06]}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      <mesh position={[0.13, 0.21, 1.06]}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      {/* angry brow ridges (small dark wedges above eyes) */}
      <mesh position={[-0.13, 0.36, 1.02]} rotation={[0, 0, 0.35]}>
        <boxGeometry args={[0.20, 0.05, 0.10]} />
        <meshStandardMaterial color={wingDark} />
      </mesh>
      <mesh position={[0.13, 0.36, 1.02]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.20, 0.05, 0.10]} />
        <meshStandardMaterial color={wingDark} />
      </mesh>

      {/* upper hooked beak */}
      <mesh position={[0, 0.05, 1.15]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.12, 0.45, 6]} />
        <meshStandardMaterial color={beak} roughness={0.4} />
      </mesh>
      {/* beak hook (small downward tip) */}
      <mesh position={[0, -0.05, 1.32]} rotation={[1.0, 0, 0]} castShadow>
        <coneGeometry args={[0.07, 0.18, 5]} />
        <meshStandardMaterial color={beak} roughness={0.4} />
      </mesh>
      {/* lower beak */}
      <mesh position={[0, -0.10, 1.10]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.10, 0.30, 6]} />
        <meshStandardMaterial color="#d99632" roughness={0.5} />
      </mesh>

      {/* spread wings — flap via refs */}
      <group ref={lWing} position={[-0.42, 0.05, 0.05]}>
        <mesh position={[-0.8, 0, 0]} rotation={[0, 0, -0.15]} castShadow>
          <boxGeometry args={[1.7, 0.10, 0.55]} />
          <meshStandardMaterial color={wingDark} flatShading roughness={0.8} />
        </mesh>
        {/* wing tip darker */}
        <mesh position={[-1.55, 0, 0]} castShadow>
          <boxGeometry args={[0.4, 0.08, 0.35]} />
          <meshStandardMaterial color="#2a1810" flatShading />
        </mesh>
      </group>
      <group ref={rWing} position={[0.42, 0.05, 0.05]}>
        <mesh position={[0.8, 0, 0]} rotation={[0, 0, 0.15]} castShadow>
          <boxGeometry args={[1.7, 0.10, 0.55]} />
          <meshStandardMaterial color={wingDark} flatShading roughness={0.8} />
        </mesh>
        <mesh position={[1.55, 0, 0]} castShadow>
          <boxGeometry args={[0.4, 0.08, 0.35]} />
          <meshStandardMaterial color="#2a1810" flatShading />
        </mesh>
      </group>

      {/* tail feathers — fan back */}
      <mesh position={[0, 0.05, -0.7]} rotation={[Math.PI / 2.2, 0, 0]} castShadow>
        <coneGeometry args={[0.35, 0.55, 5]} />
        <meshStandardMaterial color={wingDark} flatShading />
      </mesh>

      {/* dangling clawed feet */}
      <mesh position={[-0.14, -0.50, 0.10]} castShadow>
        <boxGeometry args={[0.08, 0.30, 0.10]} />
        <meshStandardMaterial color="#5a3a1f" />
      </mesh>
      <mesh position={[0.14, -0.50, 0.10]} castShadow>
        <boxGeometry args={[0.08, 0.30, 0.10]} />
        <meshStandardMaterial color="#5a3a1f" />
      </mesh>
      {/* claws (small triangles) */}
      <mesh position={[-0.14, -0.68, 0.18]} rotation={[0.5, 0, 0]}>
        <coneGeometry args={[0.06, 0.18, 4]} />
        <meshStandardMaterial color="#1c1208" />
      </mesh>
      <mesh position={[0.14, -0.68, 0.18]} rotation={[0.5, 0, 0]}>
        <coneGeometry args={[0.06, 0.18, 4]} />
        <meshStandardMaterial color="#1c1208" />
      </mesh>
    </group>
  );
}
