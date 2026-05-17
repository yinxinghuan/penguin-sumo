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

// Camera rig — subtle follow on the player (~15% influence), burst push-in
// when the player is dashing, and impact shake driven by recent bonk fx in
// the state queue. Always looks at the player so the wrestler stays roughly
// centered without losing the arena edges.
function CameraRig({ state }: { state: React.MutableRefObject<GameRef> }) {
  const { camera, size } = useThree();
  const lookAtTarget = useMemo(() => new THREE.Vector3(), []);
  const desiredPos = useMemo(() => new THREE.Vector3(), []);
  const shakeT = useRef(0);
  const seenBonks = useRef<Set<number>>(new Set());

  useEffect(() => {
    camera.position.set(CAMERA_POS[0], CAMERA_POS[1], CAMERA_POS[2]);
    (camera as THREE.PerspectiveCamera).fov = CAMERA_FOV;
    (camera as THREE.PerspectiveCamera).near = 0.1;
    (camera as THREE.PerspectiveCamera).far = 200;
    camera.lookAt(0, 0, 0);
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }, [camera, size.width, size.height]);

  useFrame((_, delta) => {
    const d = state.current;
    const player = d.penguins.find(p => p.isPlayer);
    if (!player) return;
    const c = Math.min(delta, 0.05);

    // Trigger shake on new bonks (any new bonk or ko fx since last frame)
    for (const fx of d.fx) {
      if (fx.type !== 'bonk' && fx.type !== 'ko') continue;
      if (seenBonks.current.has(fx.key)) continue;
      seenBonks.current.add(fx.key);
      shakeT.current = Math.max(shakeT.current, fx.type === 'ko' ? 0.45 : 0.22);
    }
    shakeT.current = Math.max(0, shakeT.current - c);
    const shakeMag = Math.pow(shakeT.current / 0.45, 1.2) * 0.55;
    const sx = (Math.random() - 0.5) * shakeMag;
    const sz = (Math.random() - 0.5) * shakeMag * 0.6;

    // Subtle follow — bias camera 15% toward player
    const fx = player.position.x * 0.15;
    const fz = player.position.z * 0.15;
    // Burst kick — pull camera in (lower y, closer z) while player is bursting
    let kickY = 0, kickZ = 0;
    if (player.state === 'bursting') {
      const burstFrac = Math.max(0, player.burstT / 0.5);
      kickY = burstFrac * 1.2;
      kickZ = burstFrac * 0.6;
    }

    desiredPos.set(
      CAMERA_POS[0] + fx + sx,
      CAMERA_POS[1] - kickY,
      CAMERA_POS[2] + fz - kickZ + sz,
    );
    camera.position.lerp(desiredPos, 0.18);
    lookAtTarget.set(player.position.x * 0.35, 0, player.position.z * 0.35);
    camera.lookAt(lookAtTarget);
  });
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

// Charge ring under the player — pulses + color-lerps from white → amber →
// red as the charge fills. Reads as a power gauge orbiting the player.
function ChargeRing({ state }: { state: React.MutableRefObject<GameRef> }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const lerpColor = useMemo(() => new THREE.Color(), []);
  const cWhite = useMemo(() => new THREE.Color('#fff5dd'), []);
  const cAmber = useMemo(() => new THREE.Color('#ff9d00'), []);
  const cRed = useMemo(() => new THREE.Color('#ff2030'), []);
  useFrame(({ clock }) => {
    const d = state.current;
    const player = d.penguins.find(p => p.isPlayer);
    if (!ringRef.current || !matRef.current || !player) return;
    ringRef.current.position.set(player.position.x, 0.04, player.position.z);
    const charge = player.charge;
    const s = 0.7 + charge * 0.45;
    ringRef.current.scale.set(s, 1, s);
    // Color: white → amber midway → red at full
    if (charge < 0.5) lerpColor.copy(cWhite).lerp(cAmber, charge / 0.5);
    else              lerpColor.copy(cAmber).lerp(cRed,   (charge - 0.5) / 0.5);
    matRef.current.color.copy(lerpColor);
    // Opacity / pulse
    const basePulse = 0.5 + Math.sin(clock.getElapsedTime() * 10) * 0.18 * charge;
    if (player.state === 'charging') matRef.current.opacity = 0.6 + basePulse * 0.5 + charge * 0.25;
    else if (player.state === 'bursting') matRef.current.opacity = 0.85;
    else matRef.current.opacity = 0.25;
  });
  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.85, 1.10, 32]} />
      <meshBasicMaterial ref={matRef} color="#fff5dd" transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

// Direction-and-power arrow that extends in front of the player as they
// charge. Tells you exactly which way the dash will fire and roughly how
// hard. Hidden when not charging. Built from a thin plane stretched along Z
// with a small triangle tip mesh at the end.
function ChargeArrow({ state }: { state: React.MutableRefObject<GameRef> }) {
  const shaftRef = useRef<THREE.Mesh>(null);
  const tipRef = useRef<THREE.Mesh>(null);
  const shaftMat = useRef<THREE.MeshBasicMaterial>(null);
  const tipMat = useRef<THREE.MeshBasicMaterial>(null);
  const lerpColor = useMemo(() => new THREE.Color(), []);
  const cWhite = useMemo(() => new THREE.Color('#fff5dd'), []);
  const cAmber = useMemo(() => new THREE.Color('#ff9d00'), []);
  const cRed = useMemo(() => new THREE.Color('#ff2030'), []);

  useFrame(() => {
    const d = state.current;
    const player = d.penguins.find(p => p.isPlayer);
    if (!shaftRef.current || !tipRef.current || !shaftMat.current || !tipMat.current || !player) return;

    const charging = player.state === 'charging' && player.charge > 0.05;
    shaftRef.current.visible = charging;
    tipRef.current.visible = charging;
    if (!charging) return;

    const charge = player.charge;
    // Forward unit vector (player's local +Z direction)
    const fx = Math.sin(player.rotation);
    const fz = Math.cos(player.rotation);
    // Arrow length scales with charge — visible enough at low charge to read
    // direction, dramatic at full charge.
    const length = 0.9 + charge * 3.4;
    // Shaft: position at player + forward * (length/2), oriented along the
    // forward axis. PlaneGeometry is XY; rotate -90° X to lay flat, then yaw
    // so its long axis aligns with the forward vector.
    const midX = player.position.x + fx * length * 0.5;
    const midZ = player.position.z + fz * length * 0.5;
    shaftRef.current.position.set(midX, 0.045, midZ);
    shaftRef.current.rotation.set(-Math.PI / 2, 0, -player.rotation);
    shaftRef.current.scale.set(0.32 + charge * 0.10, length, 1);
    // Tip: position at player + forward * length, oriented along forward
    const tipX = player.position.x + fx * length;
    const tipZ = player.position.z + fz * length;
    tipRef.current.position.set(tipX, 0.05, tipZ);
    tipRef.current.rotation.set(-Math.PI / 2, 0, -player.rotation);
    const tipSize = 0.55 + charge * 0.35;
    tipRef.current.scale.set(tipSize, tipSize, 1);
    // Color: white → amber → red as charge fills
    if (charge < 0.5) lerpColor.copy(cWhite).lerp(cAmber, charge / 0.5);
    else              lerpColor.copy(cAmber).lerp(cRed,   (charge - 0.5) / 0.5);
    shaftMat.current.color.copy(lerpColor);
    tipMat.current.color.copy(lerpColor);
    const op = 0.55 + charge * 0.35;
    shaftMat.current.opacity = op;
    tipMat.current.opacity = op + 0.1;
  });

  return (
    <>
      {/* Shaft — thin plane stretched along its local Y (which becomes forward
          after rotation -PI/2 around X) */}
      <mesh ref={shaftRef}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={shaftMat}
          color="#fff5dd"
          transparent
          opacity={0.6}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Triangular tip at the head of the arrow */}
      <mesh ref={tipRef}>
        <shapeGeometry args={[arrowTipShape()]} />
        <meshBasicMaterial
          ref={tipMat}
          color="#fff5dd"
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </>
  );
}

// Triangle pointing along +Y in local XY plane (becomes +forward after -PI/2 X rot)
function arrowTipShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-0.45, 0);
  s.lineTo( 0.45, 0);
  s.lineTo( 0,    0.85);
  s.lineTo(-0.45, 0);
  return s;
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

// AI charge telegraph — same arrow shape as the player's but rendered red
// so the player can see which way each AI is about to dash. Length scales
// with the AI's charge progress; only visible while the AI is charging.
function AiTelegraphs({ state }: { state: React.MutableRefObject<GameRef> }) {
  const shaftRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  const tipRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  useFrame(() => {
    const d = state.current;
    for (const peng of d.penguins) {
      if (peng.isPlayer) continue;
      const shaft = shaftRefs.current.get(peng.id);
      const tip = tipRefs.current.get(peng.id);
      if (!shaft || !tip) continue;
      const visible = peng.state === 'charging' && peng.charge > 0.20;
      shaft.visible = visible;
      tip.visible = visible;
      if (!visible) continue;
      const fx = Math.sin(peng.rotation);
      const fz = Math.cos(peng.rotation);
      const length = 0.7 + peng.charge * 2.6;
      shaft.position.set(peng.position.x + fx * length * 0.5, 0.042, peng.position.z + fz * length * 0.5);
      shaft.rotation.set(-Math.PI / 2, 0, -peng.rotation);
      shaft.scale.set(0.20 + peng.charge * 0.08, length, 1);
      tip.position.set(peng.position.x + fx * length, 0.046, peng.position.z + fz * length);
      tip.rotation.set(-Math.PI / 2, 0, -peng.rotation);
      const tipS = 0.35 + peng.charge * 0.25;
      tip.scale.set(tipS, tipS, 1);
      const mat1 = shaft.material as THREE.MeshBasicMaterial;
      const mat2 = tip.material as THREE.MeshBasicMaterial;
      mat1.opacity = 0.35 + peng.charge * 0.45;
      mat2.opacity = 0.55 + peng.charge * 0.40;
    }
  });
  const d = state.current;
  return (
    <>
      {d.penguins.filter(p => !p.isPlayer).map(peng => (
        <group key={`tg_${peng.id}`}>
          <mesh
            ref={el => {
              if (el) shaftRefs.current.set(peng.id, el);
              else shaftRefs.current.delete(peng.id);
            }}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color="#ff3a4a" transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh
            ref={el => {
              if (el) tipRefs.current.set(peng.id, el);
              else tipRefs.current.delete(peng.id);
            }}
          >
            <shapeGeometry args={[arrowTipShape()]} />
            <meshBasicMaterial color="#ff3a4a" transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// Impact bursts — expanding ring + flash sphere at each bonk / KO. Animation
// is driven by FxEvent.born vs current game time so multiple bonks can stack.
function ImpactBursts({ state }: { state: React.MutableRefObject<GameRef> }) {
  const refs = useRef<Map<number, { ring: THREE.Mesh | null; ringMat: THREE.MeshBasicMaterial | null; flash: THREE.Mesh | null; flashMat: THREE.MeshBasicMaterial | null; }>>(new Map());
  const [, force] = useState(0);
  const lastSeen = useRef<Set<number>>(new Set());

  useFrame(() => {
    const d = state.current;
    // Detect new fx → trigger React render to mount new meshes
    let changed = false;
    for (const fx of d.fx) {
      if (fx.type !== 'bonk' && fx.type !== 'ko') continue;
      if (!lastSeen.current.has(fx.key)) {
        lastSeen.current.add(fx.key);
        changed = true;
      }
    }
    // Clean up old refs (fx already aged out of d.fx)
    const liveKeys = new Set(d.fx.map(f => f.key));
    for (const k of Array.from(refs.current.keys())) {
      if (!liveKeys.has(k)) {
        refs.current.delete(k);
        lastSeen.current.delete(k);
        changed = true;
      }
    }
    if (changed) force(x => x + 1);
    // Animate live ones
    for (const fx of d.fx) {
      if (fx.type !== 'bonk' && fx.type !== 'ko') continue;
      const r = refs.current.get(fx.key);
      if (!r) continue;
      const age = d.time - fx.born;
      const dur = fx.type === 'ko' ? 1.0 : 0.45;
      const t = Math.min(1, age / dur);
      if (r.ring && r.ringMat) {
        const s = 0.25 + t * (fx.type === 'ko' ? 3.5 : 2.4);
        r.ring.scale.set(s, 1, s);
        r.ringMat.opacity = (1 - t) * 0.85;
      }
      if (r.flash && r.flashMat) {
        const s = 1 - t * 0.6;
        r.flash.scale.set(s, s, s);
        r.flashMat.opacity = (1 - t) * 0.5;
      }
    }
  });

  const d = state.current;
  return (
    <>
      {d.fx
        .filter(f => f.type === 'bonk' || f.type === 'ko')
        .map(fx => {
          const ensure = (key: number) => {
            if (!refs.current.has(key)) refs.current.set(key, { ring: null, ringMat: null, flash: null, flashMat: null });
            return refs.current.get(key)!;
          };
          return (
            <group key={fx.key} position={[fx.x, 0.06, fx.z]}>
              <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                ref={el => { const r = ensure(fx.key); r.ring = el; r.ringMat = el ? (el.material as THREE.MeshBasicMaterial) : null; }}
              >
                <ringGeometry args={[0.45, 0.65, 28]} />
                <meshBasicMaterial color={fx.type === 'ko' ? '#38e6ff' : '#ffd84a'} transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} />
              </mesh>
              <mesh
                ref={el => { const r = ensure(fx.key); r.flash = el; r.flashMat = el ? (el.material as THREE.MeshBasicMaterial) : null; }}
              >
                <sphereGeometry args={[0.5, 14, 10]} />
                <meshBasicMaterial color={fx.type === 'ko' ? '#cfe0f0' : '#fff5dd'} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
              </mesh>
            </group>
          );
        })}
    </>
  );
}

// Burst trail — small fading circles spawned behind a penguin while bursting.
// Uses a fixed pool of 32 particles reused round-robin. No React re-renders.
function BurstTrails({ state }: { state: React.MutableRefObject<GameRef> }) {
  const POOL = 36;
  const trails = useRef<{ x: number; z: number; born: number; live: boolean }[]>([]);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const cursor = useRef(0);
  if (trails.current.length === 0) {
    for (let i = 0; i < POOL; i++) trails.current.push({ x: 0, z: 0, born: -99, live: false });
  }
  useFrame(() => {
    const d = state.current;
    const t = d.time;
    // Emit: any penguin in 'bursting' state spawns 1 trail per frame
    for (const peng of d.penguins) {
      if (peng.state !== 'bursting') continue;
      const slot = trails.current[cursor.current % POOL];
      slot.x = peng.position.x;
      slot.z = peng.position.z;
      slot.born = t;
      slot.live = true;
      cursor.current++;
    }
    // Animate
    for (let i = 0; i < POOL; i++) {
      const s = trails.current[i];
      const m = refs.current[i];
      if (!m) continue;
      if (!s.live) { m.visible = false; continue; }
      const age = t - s.born;
      const DUR = 0.55;
      if (age > DUR) { s.live = false; m.visible = false; continue; }
      m.visible = true;
      const lifeT = age / DUR;
      m.position.set(s.x, 0.06, s.z);
      const sc = 0.35 + lifeT * 1.4;
      m.scale.set(sc, 1, sc);
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - lifeT) * 0.45;
    }
  });
  return (
    <>
      {Array.from({ length: POOL }, (_, i) => (
        <mesh
          key={`tr_${i}`}
          ref={el => { refs.current[i] = el; }}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
        >
          <ringGeometry args={[0.50, 0.72, 18]} />
          <meshBasicMaterial color="#38e6ff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </>
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
      <CameraRig state={state} />
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
      <ChargeArrow state={state} />
      <AiRings state={state} />
      <AiTelegraphs state={state} />
      <BurstTrails state={state} />

      <ActorSync state={state} />

      <ImpactBursts state={state} />
    </>
  );
}
