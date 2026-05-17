import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CAMERA_FOV, CAMERA_POS, PLAYFIELD } from '../constants';
import { Penguin } from './Penguin';
import { Skua } from './Skua';
import { Seal } from './Seal';
import { Iceberg } from './Iceberg';
import { Snow } from './Snow';
import { useGameLoop, GameRef } from '../hooks/useGameLoop';
import type { Stick } from '../types';

interface SceneProps {
  state: React.MutableRefObject<GameRef>;
  playing: boolean;
  stickRef: React.MutableRefObject<Stick>;
  onScore: (s: number) => void;
  onGameOver: (final: number) => void;
  onChainBroken?: (lostCount: number) => void;
  playSfx: (k: any) => void;
  haptic?: (k: 'light' | 'heavy') => void;
}

// Follow-camera: each frame, lerp toward `head + (0, 35, 15)` and lookAt(head).
// This is the original game's setup — player stays centered, world scrolls.
function FollowCamera({ state }: { state: React.MutableRefObject<GameRef> }) {
  const { camera, size } = useThree();
  const offset = useRef(new THREE.Vector3(...CAMERA_POS));
  const target = useRef(new THREE.Vector3());

  useEffect(() => {
    const head = state.current.headPos;
    camera.position.set(head.x + CAMERA_POS[0], head.y + CAMERA_POS[1], head.z + CAMERA_POS[2]);
    (camera as THREE.PerspectiveCamera).fov = CAMERA_FOV;
    (camera as THREE.PerspectiveCamera).near = 0.1;
    (camera as THREE.PerspectiveCamera).far = 200;
    camera.lookAt(head.x, 0, head.z);
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }, [camera, size.width, size.height, state]);

  useFrame(() => {
    const head = state.current.headPos;
    target.current.copy(head).add(offset.current);
    camera.position.lerp(target.current, 0.1);
    camera.lookAt(head.x, 0, head.z);
  });
  return null;
}

// Sync every dynamic actor's <group> transform from game-state refs in a single
// useFrame callback. Cheap and avoids one RAF per FollowMesh.
function ActorSync({ state }: { state: React.MutableRefObject<GameRef> }) {
  const leader = useRef<THREE.Group>(null);
  const skuaRef = useRef<THREE.Group>(null);
  const bodyRefs = useRef<Map<number, THREE.Group>>(new Map());
  const babyRefs = useRef<Map<number, THREE.Group>>(new Map());
  const sealRefs = useRef<Map<number, THREE.Group>>(new Map());

  useFrame(() => {
    const d = state.current;
    if (leader.current) {
      leader.current.position.copy(d.headPos);
      leader.current.rotation.y = d.headRot;
    }
    if (skuaRef.current) {
      skuaRef.current.position.copy(d.skuaPos);
      skuaRef.current.rotation.y = d.skuaRot;
    }
    for (const seg of d.bodyParts) {
      const g = bodyRefs.current.get(seg.id);
      if (g) { g.position.copy(seg.position); g.rotation.y = seg.rotation; }
    }
    for (const baby of d.babies) {
      const g = babyRefs.current.get(baby.id);
      if (g) g.position.copy(baby.position);
    }
    for (const seal of d.seals) {
      const g = sealRefs.current.get(seal.id);
      if (g) { g.position.copy(seal.position); g.rotation.y = seal.rotation; }
    }
  });

  const d = state.current;
  return (
    <>
      <group ref={leader}><Penguin isLeader /></group>
      <group ref={skuaRef}><Skua /></group>
      {d.bodyParts.map(seg => (
        <group key={`b_${seg.id}`} ref={el => {
          if (el) bodyRefs.current.set(seg.id, el);
          else bodyRefs.current.delete(seg.id);
        }}>
          <Penguin colorType={seg.colorType} />
        </group>
      ))}
      {d.babies.map(baby => (
        <group key={`s_${baby.id}`} ref={el => {
          if (el) babyRefs.current.set(baby.id, el);
          else babyRefs.current.delete(baby.id);
        }}>
          <Penguin colorType={baby.colorType} />
        </group>
      ))}
      {d.seals.map(seal => (
        <group key={`d_${seal.id}`} ref={el => {
          if (el) sealRefs.current.set(seal.id, el);
          else sealRefs.current.delete(seal.id);
        }}>
          <Seal />
        </group>
      ))}
    </>
  );
}

export function Scene({ state, playing, stickRef, onScore, onGameOver, onChainBroken, playSfx, haptic }: SceneProps) {
  useGameLoop({
    state,
    playing,
    stick: stickRef.current,
    onScore,
    onGameOver,
    onChainBroken,
    playSfx,
    haptic,
  });

  // Re-render only when entity counts change (spawn / pickup / despawn).
  const [, force] = useState(0);
  const lastSizes = useRef({ b: -1, s: -1, p: -1 });
  useFrame(() => {
    const d = state.current;
    if (
      d.babies.length    !== lastSizes.current.b ||
      d.seals.length     !== lastSizes.current.s ||
      d.bodyParts.length !== lastSizes.current.p
    ) {
      lastSizes.current = { b: d.babies.length, s: d.seals.length, p: d.bodyParts.length };
      force(x => x + 1);
    }
  });

  // Stable iceberg list — never changes during a game, so render once.
  const icebergs = useMemo(() => state.current.icebergs, [state.current.icebergs]);

  return (
    <>
      <FollowCamera state={state} />
      <fog attach="fog" args={['#0a2238', PLAYFIELD * 0.9, PLAYFIELD * 2.2]} />
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[18, 38, 8]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={0.5}
        shadow-camera-far={80}
        shadow-bias={-0.0008}
      />
      <hemisphereLight args={['#9bc1e0', '#4a5a78', 0.35]} />

      {/* outer water */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[PLAYFIELD * 4, PLAYFIELD * 4]} />
        <meshStandardMaterial color="#1f4a6b" />
      </mesh>
      {/* darker ring just outside the ice */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <ringGeometry args={[PLAYFIELD / 2 + 2.5, PLAYFIELD / 2 + 12, 64]} />
        <meshStandardMaterial color="#0d2c46" />
      </mesh>
      {/* main ice rink */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[PLAYFIELD / 2 + 4, 64]} />
        <meshStandardMaterial color="#bfd9ea" roughness={0.95} />
      </mesh>
      {/* inner brighter ice */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[PLAYFIELD / 2 - 2, 48]} />
        <meshStandardMaterial color="#e0eef7" roughness={0.85} />
      </mesh>
      {/* hand-placed sea-ice cracks */}
      {[
        { x: -7, z:  3, rot: 0.4,  len: 14, w: 0.30 },
        { x:  5, z: -6, rot: 1.7,  len: 10, w: 0.22 },
        { x:  8, z:  6, rot: -0.6, len: 12, w: 0.28 },
        { x: -3, z: -9, rot: 2.6,  len:  9, w: 0.20 },
        { x:  2, z:  9, rot: 0.9,  len:  7, w: 0.18 },
        { x: -9, z: -2, rot: 1.2,  len:  6, w: 0.16 },
      ].map((c, i) => (
        <mesh
          key={`crack_${i}`}
          rotation={[-Math.PI / 2, 0, c.rot]}
          position={[c.x, 0.01, c.z]}
        >
          <planeGeometry args={[c.w, c.len]} />
          <meshStandardMaterial color="#7ea2b8" transparent opacity={0.55} />
        </mesh>
      ))}

      {icebergs.map(ice => (
        <Iceberg key={ice.id} id={ice.id} position={[ice.position.x, ice.position.y, ice.position.z]} scale={1.4} />
      ))}

      <Snow state={state} />
      <ActorSync state={state} />
    </>
  );
}
