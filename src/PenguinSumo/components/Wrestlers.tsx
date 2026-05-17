// AlterU All-Star sumo wrestlers. The player is always a penguin (see
// Penguin.tsx). These are the three opponent species pulled from the rest of
// the 3D-series cast: the Sheep dancer (Pied Piper / Beat Drop), the Wolf
// bouncer (Piper / Beat Drop), and the Sheepdog herder (Pied Piper). Each
// shares the same sumo trappings — mawashi belt at the waist, knot at the
// back, apron at the front, topknot on the head — so they read together as
// "wrestlers in the same bout" rather than four unrelated mascots.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';

interface WrestlerCommon {
  bodyColor: string;
  beltColor: string;
  isPlayer?: boolean;
  scale?: number;
}

function useBounce(speed = 5) {
  const ref = useRef<THREE.Group>(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.getElapsedTime() * speed + phase;
    g.position.y = Math.abs(Math.sin(t)) * 0.32;
    g.rotation.z = Math.sin(t) * 0.05;
    g.rotation.x = 0.04;
  });
  return ref;
}

// Shared sumo gear — belt + apron + topknot. Used by every wrestler so the
// "we're in the same bout" silhouette holds.
function SumoGear({ beltColor }: { beltColor: string }) {
  return (
    <>
      <mesh position={[0, 0.30, 0]} castShadow>
        <cylinderGeometry args={[0.62, 0.62, 0.22, 24]} />
        <meshStandardMaterial color={beltColor} roughness={0.55} />
      </mesh>
      <RoundedBox args={[0.20, 0.20, 0.08]} radius={0.03} smoothness={3}
                  position={[0, 0.32, -0.55]} castShadow>
        <meshStandardMaterial color={beltColor} roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[0.42, 0.32, 0.04]} radius={0.04} smoothness={3}
                  position={[0, 0.16, 0.55]} castShadow>
        <meshStandardMaterial color={beltColor} roughness={0.55} />
      </RoundedBox>
      <mesh position={[0, 1.65, 0]} castShadow>
        <sphereGeometry args={[0.12, 14, 10]} />
        <meshStandardMaterial color="#0a0a0e" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.80, -0.04]} castShadow rotation={[0.3, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 0.18, 8]} />
        <meshStandardMaterial color="#0a0a0e" roughness={0.85} />
      </mesh>
    </>
  );
}

function PlayerCrown() {
  return (
    <mesh position={[0, 2.05, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
      <torusGeometry args={[0.24, 0.05, 8, 18]} />
      <meshStandardMaterial color="#ffd84a" emissive="#ffd84a" emissiveIntensity={0.55} />
    </mesh>
  );
}

// ============================================================================
// Sheep wrestler — woolly chunky body (Pied Piper / Beat Drop dancer DNA).
// Fluffy cloud-of-bumps wool over a wide body, dark head poking forward,
// floppy ears, hooves. Reads as the most "harmless-looking" wrestler — fits
// the Rookie personality.
// ============================================================================
export function SheepWrestler({ bodyColor, beltColor, isPlayer = false, scale = 1 }: WrestlerCommon) {
  const bounce = useBounce(5);
  return (
    <group scale={scale}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 24]} />
        <meshBasicMaterial color="#0a1a2a" transparent opacity={0.45} />
      </mesh>
      <group ref={bounce}>
        {/* main wool body — three overlapping rounded boxes for the cloud look */}
        <RoundedBox args={[1.15, 1.10, 1.00]} radius={0.46} smoothness={6} position={[0, 0.6, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={bodyColor} roughness={0.95} />
        </RoundedBox>
        <RoundedBox args={[0.55, 0.55, 0.50]} radius={0.26} smoothness={4} position={[-0.45, 0.85, 0.18]} castShadow>
          <meshStandardMaterial color={bodyColor} roughness={0.95} />
        </RoundedBox>
        <RoundedBox args={[0.55, 0.55, 0.50]} radius={0.26} smoothness={4} position={[0.45, 0.85, -0.18]} castShadow>
          <meshStandardMaterial color={bodyColor} roughness={0.95} />
        </RoundedBox>

        {/* head — dark sphere poking forward */}
        <mesh position={[0, 1.05, 0.55]} castShadow>
          <sphereGeometry args={[0.32, 18, 14]} />
          <meshStandardMaterial color="#2a1f1a" roughness={0.8} />
        </mesh>
        {/* muzzle — lighter band */}
        <mesh position={[0, 0.95, 0.78]} castShadow>
          <sphereGeometry args={[0.18, 14, 10]} />
          <meshStandardMaterial color="#3a2c25" roughness={0.85} />
        </mesh>
        {/* eyes */}
        <mesh position={[-0.13, 1.15, 0.78]}>
          <sphereGeometry args={[0.045, 10, 10]} />
          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[ 0.13, 1.15, 0.78]}>
          <sphereGeometry args={[0.045, 10, 10]} />
          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.5} />
        </mesh>
        {/* ears — flat triangles drooping out from the side */}
        <mesh position={[-0.28, 1.15, 0.48]} rotation={[0, 0, -0.6]} castShadow>
          <coneGeometry args={[0.11, 0.26, 8]} />
          <meshStandardMaterial color="#2a1f1a" />
        </mesh>
        <mesh position={[ 0.28, 1.15, 0.48]} rotation={[0, 0,  0.6]} castShadow>
          <coneGeometry args={[0.11, 0.26, 8]} />
          <meshStandardMaterial color="#2a1f1a" />
        </mesh>

        <SumoGear beltColor={beltColor} />

        {/* hooves */}
        <mesh position={[-0.22, 0.05, 0.42]} castShadow>
          <boxGeometry args={[0.18, 0.08, 0.28]} />
          <meshStandardMaterial color="#2a1f1a" />
        </mesh>
        <mesh position={[0.22, 0.05, 0.42]} castShadow>
          <boxGeometry args={[0.18, 0.08, 0.28]} />
          <meshStandardMaterial color="#2a1f1a" />
        </mesh>

        {isPlayer && <PlayerCrown />}
      </group>
    </group>
  );
}

// ============================================================================
// Wolf wrestler — lean predator silhouette (Piper / Beat Drop bouncer DNA).
// Box body slightly narrower than the sheep, dark back ridge, long muzzle,
// pointed ears, glowing yellow eyes. Fits the Bruiser personality.
// ============================================================================
export function WolfWrestler({ bodyColor, beltColor, isPlayer = false, scale = 1 }: WrestlerCommon) {
  const bounce = useBounce(5);
  return (
    <group scale={scale}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 24]} />
        <meshBasicMaterial color="#0a1a2a" transparent opacity={0.45} />
      </mesh>
      <group ref={bounce}>
        {/* body — slightly leaner than the penguin/sheep */}
        <RoundedBox args={[0.95, 1.15, 1.05]} radius={0.34} smoothness={5} position={[0, 0.6, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={bodyColor} roughness={0.85} />
        </RoundedBox>
        {/* dark back ridge along the spine */}
        <RoundedBox args={[0.32, 1.0, 0.82]} radius={0.10} smoothness={4} position={[0, 0.92, -0.08]} castShadow>
          <meshStandardMaterial color="#2e2a25" roughness={0.85} />
        </RoundedBox>
        {/* belly lighter band */}
        <RoundedBox args={[0.55, 0.55, 0.40]} radius={0.20} smoothness={4} position={[0, 0.55, 0.40]} castShadow>
          <meshStandardMaterial color="#7a7570" roughness={0.85} />
        </RoundedBox>

        {/* head — box shape with a long muzzle */}
        <RoundedBox args={[0.45, 0.42, 0.55]} radius={0.16} smoothness={4} position={[0, 1.10, 0.50]} castShadow>
          <meshStandardMaterial color={bodyColor} roughness={0.85} />
        </RoundedBox>
        {/* long muzzle */}
        <RoundedBox args={[0.28, 0.24, 0.44]} radius={0.10} smoothness={4} position={[0, 1.00, 0.84]} castShadow>
          <meshStandardMaterial color="#3a3631" roughness={0.85} />
        </RoundedBox>
        {/* nose */}
        <mesh position={[0, 1.04, 1.06]} castShadow>
          <sphereGeometry args={[0.065, 12, 10]} />
          <meshStandardMaterial color="#0a0a0a" />
        </mesh>
        {/* glowing yellow eyes */}
        <mesh position={[-0.13, 1.22, 0.78]} castShadow>
          <sphereGeometry args={[0.055, 10, 10]} />
          <meshStandardMaterial color="#ffdc4a" emissive="#ffa820" emissiveIntensity={1.0} />
        </mesh>
        <mesh position={[ 0.13, 1.22, 0.78]} castShadow>
          <sphereGeometry args={[0.055, 10, 10]} />
          <meshStandardMaterial color="#ffdc4a" emissive="#ffa820" emissiveIntensity={1.0} />
        </mesh>
        {/* pointed ears */}
        <mesh position={[-0.18, 1.46, 0.40]} rotation={[0.1, 0, -0.15]} castShadow>
          <coneGeometry args={[0.10, 0.32, 4]} />
          <meshStandardMaterial color="#3e3a35" />
        </mesh>
        <mesh position={[ 0.18, 1.46, 0.40]} rotation={[0.1, 0,  0.15]} castShadow>
          <coneGeometry args={[0.10, 0.32, 4]} />
          <meshStandardMaterial color="#3e3a35" />
        </mesh>

        <SumoGear beltColor={beltColor} />

        {/* paws */}
        <mesh position={[-0.22, 0.05, 0.42]} castShadow>
          <boxGeometry args={[0.20, 0.08, 0.30]} />
          <meshStandardMaterial color="#3a3631" />
        </mesh>
        <mesh position={[0.22, 0.05, 0.42]} castShadow>
          <boxGeometry args={[0.20, 0.08, 0.30]} />
          <meshStandardMaterial color="#3a3631" />
        </mesh>

        {isPlayer && <PlayerCrown />}
      </group>
    </group>
  );
}

// ============================================================================
// Sheepdog wrestler — border collie pattern (Pied Piper protagonist DNA).
// Black body with a big white chest blaze + white muzzle + perked ears.
// Fits the Sniper personality — patient, calculating.
// ============================================================================
export function SheepdogWrestler({ bodyColor, beltColor, isPlayer = false, scale = 1 }: WrestlerCommon) {
  const bounce = useBounce(5);
  return (
    <group scale={scale}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 24]} />
        <meshBasicMaterial color="#0a1a2a" transparent opacity={0.45} />
      </mesh>
      <group ref={bounce}>
        {/* main body — black */}
        <RoundedBox args={[1.00, 1.15, 1.05]} radius={0.36} smoothness={5} position={[0, 0.6, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={bodyColor} roughness={0.75} />
        </RoundedBox>
        {/* white chest blaze */}
        <RoundedBox args={[0.65, 0.85, 0.45]} radius={0.26} smoothness={5} position={[0, 0.55, 0.36]} castShadow>
          <meshStandardMaterial color="#f4ecd8" roughness={0.85} />
        </RoundedBox>
        {/* white back stripe — collie marking */}
        <RoundedBox args={[0.22, 0.58, 1.0]} radius={0.08} smoothness={4} position={[0, 0.86, 0]} castShadow>
          <meshStandardMaterial color="#f4ecd8" roughness={0.85} />
        </RoundedBox>

        {/* head — black */}
        <RoundedBox args={[0.50, 0.50, 0.55]} radius={0.20} smoothness={5} position={[0, 1.15, 0.45]} castShadow>
          <meshStandardMaterial color={bodyColor} roughness={0.75} />
        </RoundedBox>
        {/* white muzzle */}
        <RoundedBox args={[0.30, 0.28, 0.35]} radius={0.12} smoothness={4} position={[0, 1.02, 0.74]} castShadow>
          <meshStandardMaterial color="#f4ecd8" roughness={0.85} />
        </RoundedBox>
        {/* nose */}
        <mesh position={[0, 1.07, 0.92]} castShadow>
          <sphereGeometry args={[0.065, 12, 10]} />
          <meshStandardMaterial color="#0a0a0a" />
        </mesh>
        {/* eyes */}
        <mesh position={[-0.13, 1.28, 0.74]} castShadow>
          <sphereGeometry args={[0.050, 10, 10]} />
          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[ 0.13, 1.28, 0.74]} castShadow>
          <sphereGeometry args={[0.050, 10, 10]} />
          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[-0.13, 1.28, 0.78]}>
          <sphereGeometry args={[0.023, 8, 8]} />
          <meshStandardMaterial color="#0a0a0a" />
        </mesh>
        <mesh position={[ 0.13, 1.28, 0.78]}>
          <sphereGeometry args={[0.023, 8, 8]} />
          <meshStandardMaterial color="#0a0a0a" />
        </mesh>
        {/* ears — triangular pointing back */}
        <mesh position={[-0.20, 1.46, 0.32]} rotation={[0.2, 0, -0.2]} castShadow>
          <coneGeometry args={[0.12, 0.28, 4]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>
        <mesh position={[ 0.20, 1.46, 0.32]} rotation={[0.2, 0,  0.2]} castShadow>
          <coneGeometry args={[0.12, 0.28, 4]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>

        <SumoGear beltColor={beltColor} />

        {/* paws — white */}
        <mesh position={[-0.22, 0.05, 0.42]} castShadow>
          <boxGeometry args={[0.20, 0.08, 0.30]} />
          <meshStandardMaterial color="#f4ecd8" roughness={0.85} />
        </mesh>
        <mesh position={[0.22, 0.05, 0.42]} castShadow>
          <boxGeometry args={[0.20, 0.08, 0.30]} />
          <meshStandardMaterial color="#f4ecd8" roughness={0.85} />
        </mesh>

        {isPlayer && <PlayerCrown />}
      </group>
    </group>
  );
}
