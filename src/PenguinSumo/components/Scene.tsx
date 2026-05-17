import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CAMERA_FOV, CAMERA_POS, ARENA_RADIUS, RING_OUT_RADIUS } from '../constants';
import { Penguin } from './Penguin';
import { useGameLoop, GameRef, SfxKey } from '../hooks/useGameLoop';
import type { Stick } from '../types';

interface SceneProps {
  state: React.MutableRefObject<GameRef>;
  playing: boolean;
  stickRef: React.MutableRefObject<Stick>;
  onScore: (s: number) => void;
  onTime: (t: number) => void;
  onKo: (n: number) => void;
  onGameOver: (final: number, won: boolean) => void;
  onCharge: (c: number) => void;
  playSfx: (k: SfxKey) => void;
  haptic?: (k: 'light' | 'heavy') => void;
}

// Fixed wide camera — looks at arena origin. Whole rink visible at all times
// so the player can read all 4 wrestlers and the edge danger zone.
function ArenaCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    camera.position.set(CAMERA_POS[0], CAMERA_POS[1], CAMERA_POS[2]);
    (camera as THREE.PerspectiveCamera).fov = CAMERA_FOV;
    (camera as THREE.PerspectiveCamera).near = 0.1;
    (camera as THREE.PerspectiveCamera).far = 200;
    camera.lookAt(0, 0, 0);
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

// Sync every penguin's group transform from state each frame.
function ActorSync({ state }: { state: React.MutableRefObject<GameRef> }) {
  const refs = useRef<Map<string, THREE.Group>>(new Map());

  useFrame(() => {
    const d = state.current;
    for (const peng of d.penguins) {
      const g = refs.current.get(peng.id);
      if (!g) continue;
      g.position.copy(peng.position);
      g.rotation.y = peng.rotation;
      g.userData.charge = peng.charge;
      g.userData.state = peng.state;
      g.visible = peng.state !== 'gone';
    }
  });

  const d = state.current;
  return (
    <>
      {d.penguins.map(peng => (
        <group
          key={peng.id}
          ref={el => {
            if (el) refs.current.set(peng.id, el);
            else refs.current.delete(peng.id);
          }}
        >
          <Penguin
            bodyColor={peng.bodyColor}
            beltColor={peng.beltColor}
            isPlayer={peng.isPlayer}
          />
        </group>
      ))}
    </>
  );
}

// Hand-placed cracks for ice character — same pattern as PR's rink.
const CRACKS = [
  { x: -5,  z:  2, rot: 0.4,  len: 9,  w: 0.22 },
  { x:  3,  z: -4, rot: 1.7,  len: 7,  w: 0.18 },
  { x:  6,  z:  5, rot: -0.6, len: 8,  w: 0.22 },
  { x: -2,  z: -7, rot: 2.6,  len: 6,  w: 0.16 },
  { x:  1,  z:  7, rot: 0.9,  len: 5,  w: 0.14 },
  { x: -7,  z: -1, rot: 1.2,  len: 4,  w: 0.13 },
];

// Edge-danger ring that pulses red when any penguin is near the edge — gives
// the rink a tense "you're about to fall" feeling without scripting per-actor.
function DangerRing({ state }: { state: React.MutableRefObject<GameRef> }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const d = state.current;
    const player = d.penguins.find(p => p.isPlayer);
    const r = player ? Math.hypot(player.position.x, player.position.z) : 0;
    const closeness = Math.max(0, Math.min(1, (r - ARENA_RADIUS * 0.7) / (ARENA_RADIUS * 0.28)));
    const pulse = 0.4 + Math.sin(clock.getElapsedTime() * 6) * 0.25 * closeness;
    matRef.current.emissiveIntensity = pulse * (0.3 + closeness * 1.8);
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
      <ringGeometry args={[ARENA_RADIUS * 0.92, ARENA_RADIUS * 1.00, 64]} />
      <meshStandardMaterial ref={matRef} color="#a8302a" emissive="#d8453e" emissiveIntensity={0.5} />
    </mesh>
  );
}

// Charge ring under the player — fills clockwise as charge grows. Built as a
// pair of ringGeometries swapped by an animated theta length.
function ChargeRing({ state }: { state: React.MutableRefObject<GameRef> }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    const d = state.current;
    const player = d.penguins.find(p => p.isPlayer);
    if (!ringRef.current || !player) return;
    ringRef.current.position.set(player.position.x, 0.04, player.position.z);
    // Use scale instead of regenerating geometry — visual proxy for charge.
    const s = 0.65 + player.charge * 0.35;
    ringRef.current.scale.set(s, 1, s);
    if (matRef.current) {
      matRef.current.opacity = player.state === 'charging' ? 0.85 : (player.state === 'bursting' ? 0.6 : 0.25);
    }
  });
  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.85, 1.05, 32]} />
      <meshBasicMaterial ref={matRef} color="#fff5dd" transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

// "You are here" cyan core ring under the player (always on, brighter than
// the threat rings under AI).
function PlayerRing({ state }: { state: React.MutableRefObject<GameRef> }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const player = state.current.penguins.find(p => p.isPlayer);
    if (!ref.current || !player) return;
    ref.current.position.set(player.position.x, 0.035, player.position.z);
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.45, 0.62, 28]} />
      <meshBasicMaterial color="#38e6ff" transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

// Hover-shadow under each AI — small red disc so AI threats are readable.
function AiRings({ state }: { state: React.MutableRefObject<GameRef> }) {
  const refs = useRef<Map<string, THREE.Mesh>>(new Map());
  useFrame(({ clock }) => {
    const d = state.current;
    const t = clock.getElapsedTime();
    for (const peng of d.penguins) {
      if (peng.isPlayer) continue;
      const m = refs.current.get(peng.id);
      if (!m) continue;
      m.position.set(peng.position.x, 0.035, peng.position.z);
      m.visible = peng.state !== 'gone' && peng.state !== 'falling';
      const mat = m.material as THREE.MeshBasicMaterial;
      const charging = peng.state === 'charging' && peng.charge > 0.5;
      const targetOpacity = charging
        ? 0.45 + (Math.sin(t * 12) + 1) * 0.15 * peng.charge
        : (peng.state === 'recover' ? 0.18 : 0.30);
      mat.opacity = targetOpacity;
    }
  });
  const d = state.current;
  return (
    <>
      {d.penguins.filter(p => !p.isPlayer).map(peng => (
        <mesh
          key={`r_${peng.id}`}
          ref={el => {
            if (el) refs.current.set(peng.id, el);
            else refs.current.delete(peng.id);
          }}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.50, 0.68, 28]} />
          <meshBasicMaterial color="#d8453e" transparent opacity={0.30} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </>
  );
}

export function Scene(props: SceneProps) {
  const { state, playing, stickRef } = props;

  useGameLoop({
    state, playing, stick: stickRef.current,
    onScore: props.onScore,
    onTime: props.onTime,
    onKo: props.onKo,
    onGameOver: props.onGameOver,
    onCharge: props.onCharge,
    playSfx: props.playSfx,
    haptic: props.haptic,
  });

  // Re-render only when penguin count changes (KO removes them after fall anim)
  const [, force] = useState(0);
  const lastSize = useRef(-1);
  useFrame(() => {
    const d = state.current;
    const alive = d.penguins.filter(p => p.state !== 'gone').length;
    if (alive !== lastSize.current) {
      lastSize.current = alive;
      force(x => x + 1);
    }
  });

  const cracks = useMemo(() => CRACKS, []);

  return (
    <>
      <ArenaCamera />
      <fog attach="fog" args={['#0a1c2e', ARENA_RADIUS * 2, ARENA_RADIUS * 4.5]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[18, 38, 8]}
        intensity={1.55}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-camera-near={0.5}
        shadow-camera-far={80}
        shadow-bias={-0.0008}
      />
      <hemisphereLight args={['#9bc1e0', '#4a5a78', 0.35]} />

      {/* outer water — deep blue, where ringed-out penguins fall */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.10, 0]} receiveShadow>
        <planeGeometry args={[ARENA_RADIUS * 6, ARENA_RADIUS * 6]} />
        <meshStandardMaterial color="#0d2540" />
      </mesh>
      {/* darker water ring just outside the rink */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <ringGeometry args={[ARENA_RADIUS, RING_OUT_RADIUS * 2.2, 64]} />
        <meshStandardMaterial color="#08182b" />
      </mesh>
      {/* main ice rink — circular dohyō */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[ARENA_RADIUS, 64]} />
        <meshStandardMaterial color="#bfd9ea" roughness={0.95} />
      </mesh>
      {/* inner brighter ice */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
        <circleGeometry args={[ARENA_RADIUS - 2, 48]} />
        <meshStandardMaterial color="#e0eef7" roughness={0.85} />
      </mesh>
      {/* center hinomaru sun mark */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[1.5, 32]} />
        <meshStandardMaterial color="#d8453e" emissive="#d8453e" emissiveIntensity={0.25} />
      </mesh>
      {/* ice cracks */}
      {cracks.map((c, i) => (
        <mesh
          key={`crack_${i}`}
          rotation={[-Math.PI / 2, 0, c.rot]}
          position={[c.x, 0.015, c.z]}
        >
          <planeGeometry args={[c.w, c.len]} />
          <meshStandardMaterial color="#7ea2b8" transparent opacity={0.45} />
        </mesh>
      ))}

      <DangerRing state={state} />
      <PlayerRing state={state} />
      <ChargeRing state={state} />
      <AiRings state={state} />

      <ActorSync state={state} />
    </>
  );
}
