import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CAMERA_FOV, CAMERA_POS, ARENA_RADIUS, RING_OUT_RADIUS } from '../constants';
import { Penguin } from './Penguin';
import { SheepWrestler, WolfWrestler, SheepdogWrestler } from './Wrestlers';
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
  onImpact: (kind: 'bonk' | 'ko', power: number, x: number, z: number) => void;
  onPlayerScreen: (x: number, y: number) => void;
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
      shakeT.current = Math.max(shakeT.current, fx.type === 'ko' ? 0.65 : 0.35);
    }
    shakeT.current = Math.max(0, shakeT.current - c);
    // Punchier shake — wider amplitude + high-frequency wobble. Settle curve
    // stays Math.pow(..., 1.2) so it tails off naturally.
    const shakeMag = Math.pow(shakeT.current / 0.45, 1.2) * 1.4;
    const sx = (Math.random() - 0.5) * shakeMag;
    const sz = (Math.random() - 0.5) * shakeMag * 0.7;
    const sy = (Math.random() - 0.5) * shakeMag * 0.4;

    // Subtle follow — bias camera 15% toward player
    let fxC = player.position.x * 0.15;
    let fzC = player.position.z * 0.15;
    // Look-ahead — while charging, push the camera in the AIM direction by
    // charge × constant so the player can see more of what's ahead. Reverses
    // the slingshot feel: finger pulls back → camera pushes forward.
    if (player.state === 'charging' && player.charge > 0) {
      const aimX = Math.sin(player.rotation);
      const aimZ = Math.cos(player.rotation);
      const push = player.charge * 2.6;
      fxC += aimX * push;
      fzC += aimZ * push;
    }
    // Burst kick — pull camera in (lower y, closer z) while player is bursting
    let kickY = 0, kickZ = 0;
    if (player.state === 'bursting') {
      const burstFrac = Math.max(0, player.burstT / 0.5);
      kickY = burstFrac * 1.2;
      kickZ = burstFrac * 0.6;
    }

    desiredPos.set(
      CAMERA_POS[0] + fxC + sx,
      CAMERA_POS[1] - kickY + sy,
      CAMERA_POS[2] + fzC - kickZ + sz,
    );
    // Faster lerp during shake so the wobble actually shows up
    const lerpRate = shakeT.current > 0 ? 0.55 : 0.18;
    camera.position.lerp(desiredPos, lerpRate);
    // Look-at also biases forward so the player isn't always perfectly centered
    let laX = player.position.x * 0.35;
    let laZ = player.position.z * 0.35;
    if (player.state === 'charging' && player.charge > 0) {
      const aimX = Math.sin(player.rotation);
      const aimZ = Math.cos(player.rotation);
      laX += aimX * player.charge * 2.0;
      laZ += aimZ * player.charge * 2.0;
    }
    lookAtTarget.set(laX, 0, laZ);
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
      // Tumble while ringed-out — spin around the body's X axis (forward roll)
      // and slight Z tilt so the wrestler reads as "knocked over."
      if (peng.state === 'falling') {
        g.rotation.x = peng.tumbleRoll;
        g.rotation.z = Math.sin(peng.tumbleRoll * 0.6) * 0.4;
      } else {
        g.rotation.x = 0;
        g.rotation.z = 0;
      }
      g.userData.charge = peng.charge;
      g.userData.state = peng.state;
      g.visible = peng.state !== 'gone';
    }
  });

  const d = state.current;
  return (
    <>
      {d.penguins.map(peng => {
        const Mesh =
          peng.species === 'sheep'    ? SheepWrestler :
          peng.species === 'wolf'     ? WolfWrestler :
          peng.species === 'sheepdog' ? SheepdogWrestler :
                                         Penguin;
        return (
          <group
            key={peng.id}
            ref={el => {
              if (el) refs.current.set(peng.id, el);
              else refs.current.delete(peng.id);
            }}
          >
            <Mesh
              bodyColor={peng.bodyColor}
              beltColor={peng.beltColor}
              isPlayer={peng.isPlayer}
            />
          </group>
        );
      })}
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

// Project the player's world position to screen pixels each frame and report
// it back to the HUD so the slingshot rubber band can connect its 3D source
// (penguin) to its 2D target (finger / joystick stick).
function PlayerScreenTracker({ state, onPos }: { state: React.MutableRefObject<GameRef>; onPos: (x: number, y: number) => void }) {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const player = state.current.penguins.find(p => p.isPlayer);
    if (!player) return;
    v.set(player.position.x, 1.0, player.position.z);
    v.project(camera);
    const px = (v.x * 0.5 + 0.5) * size.width;
    const py = (-v.y * 0.5 + 0.5) * size.height;
    onPos(px, py);
  });
  return null;
}

// Forward direction arrow — RED chevron-shaped plane on the floor pointing
// where the dash will fire. Length + brightness scale with charge. The
// in-world charge feedback now lives entirely on this arrow + the joystick
// rubber band (drawn in the HUD layer outside this canvas); the old white
// ChargeRing and the backward rubber-band trail are gone, since stacking
// three near-white shapes on the floor was visually noisy.
function ChargeArrow({ state }: { state: React.MutableRefObject<GameRef> }) {
  const shaftRef = useRef<THREE.Mesh>(null);
  const tipRef = useRef<THREE.Mesh>(null);
  const shaftMat = useRef<THREE.MeshBasicMaterial>(null);
  const tipMat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    const d = state.current;
    const player = d.penguins.find(p => p.isPlayer);
    if (!shaftRef.current || !tipRef.current || !shaftMat.current || !tipMat.current || !player) return;

    const charging = player.state === 'charging' && player.charge > 0.05;
    shaftRef.current.visible = charging;
    tipRef.current.visible = charging;
    if (!charging) return;

    const charge = player.charge;
    const fx = Math.sin(player.rotation);
    const fz = Math.cos(player.rotation);
    // Min length so the direction is immediately readable even at low charge
    const length = 1.4 + charge * 3.2;
    const midX = player.position.x + fx * length * 0.5;
    const midZ = player.position.z + fz * length * 0.5;
    shaftRef.current.position.set(midX, 0.045, midZ);
    shaftRef.current.rotation.set(-Math.PI / 2, 0, -player.rotation);
    shaftRef.current.scale.set(0.36 + charge * 0.10, length, 1);
    const tipX = player.position.x + fx * length;
    const tipZ = player.position.z + fz * length;
    tipRef.current.position.set(tipX, 0.05, tipZ);
    tipRef.current.rotation.set(-Math.PI / 2, 0, -player.rotation);
    const tipSize = 0.85 + charge * 0.45;
    tipRef.current.scale.set(tipSize, tipSize, 1);
    // Brightness builds with charge but the hue stays solidly red so the
    // arrow always reads as "dash this way."
    const baseOp = 0.7 + charge * 0.3;
    shaftMat.current.opacity = baseOp;
    tipMat.current.opacity = Math.min(1, baseOp + 0.15);
  });

  return (
    <>
      <mesh ref={shaftRef}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={shaftMat}
          color="#ff2a3a"
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={tipRef}>
        <shapeGeometry args={[arrowTipShape()]} />
        <meshBasicMaterial
          ref={tipMat}
          color="#ff4a5a"
          transparent
          opacity={0.95}
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

// AI charge telegraph — forward red arrow + backward "virtual-slingshot"
// stretch tail. The AI doesn't have a real finger, so the tail behind it
// stands in for the user's slingshot pull. Same red color as the player's
// HUD rubber-band, so the player learns the language by watching: "red
// stretch behind → red arrow forward → dash forward."
function AiTelegraphs({ state }: { state: React.MutableRefObject<GameRef> }) {
  const shaftRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  const tipRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  const tailRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  useFrame(() => {
    const d = state.current;
    for (const peng of d.penguins) {
      if (peng.isPlayer) continue;
      const shaft = shaftRefs.current.get(peng.id);
      const tip = tipRefs.current.get(peng.id);
      const tail = tailRefs.current.get(peng.id);
      if (!shaft || !tip || !tail) continue;
      const visible = peng.state === 'charging' && peng.charge > 0.20;
      shaft.visible = visible;
      tip.visible = visible;
      tail.visible = visible;
      if (!visible) continue;
      const fx = Math.sin(peng.rotation);
      const fz = Math.cos(peng.rotation);
      const length = 1.0 + peng.charge * 2.8;
      shaft.position.set(peng.position.x + fx * length * 0.5, 0.042, peng.position.z + fz * length * 0.5);
      shaft.rotation.set(-Math.PI / 2, 0, -peng.rotation);
      shaft.scale.set(0.26 + peng.charge * 0.08, length, 1);
      tip.position.set(peng.position.x + fx * length, 0.046, peng.position.z + fz * length);
      tip.rotation.set(-Math.PI / 2, 0, -peng.rotation);
      const tipS = 0.55 + peng.charge * 0.35;
      tip.scale.set(tipS, tipS, 1);
      // Backward "stretch tail" — same length, opposite direction. Tapered
      // narrower than the forward shaft so it reads as the elastic, not as
      // another arrow.
      const tailLen = 0.5 + peng.charge * 2.0;
      tail.position.set(peng.position.x - fx * tailLen * 0.5, 0.041, peng.position.z - fz * tailLen * 0.5);
      tail.rotation.set(-Math.PI / 2, 0, -peng.rotation + Math.PI);
      tail.scale.set(0.14 + peng.charge * 0.06, tailLen, 1);

      const mat1 = shaft.material as THREE.MeshBasicMaterial;
      const mat2 = tip.material as THREE.MeshBasicMaterial;
      const mat3 = tail.material as THREE.MeshBasicMaterial;
      mat1.opacity = 0.65 + peng.charge * 0.30;
      mat2.opacity = 0.80 + peng.charge * 0.20;
      mat3.opacity = 0.45 + peng.charge * 0.30;
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
            <meshBasicMaterial color="#ff2a3a" transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh
            ref={el => {
              if (el) tipRefs.current.set(peng.id, el);
              else tipRefs.current.delete(peng.id);
            }}
          >
            <shapeGeometry args={[arrowTipShape()]} />
            <meshBasicMaterial color="#ff4a5a" transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          {/* backward stretch tail */}
          <mesh
            ref={el => {
              if (el) tailRefs.current.set(peng.id, el);
              else tailRefs.current.delete(peng.id);
            }}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color="#ff2a3a" transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// Impact bursts — expanding ring + flash sphere at each bonk / KO / splash.
// Animation is driven by FxEvent.born vs current game time so multiple bonks
// can stack. 'splash' is the water-impact effect; bigger ring + droplet
// specks that arc upward.
function ImpactBursts({ state }: { state: React.MutableRefObject<GameRef> }) {
  const refs = useRef<Map<number, { ring: THREE.Mesh | null; ringMat: THREE.MeshBasicMaterial | null; flash: THREE.Mesh | null; flashMat: THREE.MeshBasicMaterial | null; }>>(new Map());
  const [, force] = useState(0);
  const lastSeen = useRef<Set<number>>(new Set());

  useFrame(() => {
    const d = state.current;
    // Detect new fx → trigger React render to mount new meshes
    let changed = false;
    for (const fx of d.fx) {
      if (fx.type !== 'bonk' && fx.type !== 'ko' && fx.type !== 'splash') continue;
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
      if (fx.type !== 'bonk' && fx.type !== 'ko' && fx.type !== 'splash') continue;
      const r = refs.current.get(fx.key);
      if (!r) continue;
      const age = d.time - fx.born;
      const dur = fx.type === 'splash' ? 1.4 : fx.type === 'ko' ? 1.0 : 0.45;
      const t = Math.min(1, age / dur);
      if (r.ring && r.ringMat) {
        const maxScale = fx.type === 'splash' ? 4.5 : fx.type === 'ko' ? 3.5 : 2.4;
        const s = 0.25 + t * maxScale;
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
        .filter(f => f.type === 'bonk' || f.type === 'ko' || f.type === 'splash')
        .map(fx => {
          const ensure = (key: number) => {
            if (!refs.current.has(key)) refs.current.set(key, { ring: null, ringMat: null, flash: null, flashMat: null });
            return refs.current.get(key)!;
          };
          // Color & spoke count per fx type
          const ringColor = fx.type === 'ko' ? '#38e6ff' : fx.type === 'splash' ? '#9fc8e8' : '#ffd84a';
          const flashColor = fx.type === 'ko' ? '#cfe0f0' : fx.type === 'splash' ? '#cfe6f5' : '#fff5dd';
          const spokes = fx.type === 'splash' ? 10 : 6;
          // Y-position: bonk/ko slightly above floor, splash AT water level
          const baseY = fx.type === 'splash' ? -0.08 : 0.07;
          return (
            <group key={fx.key} position={[fx.x, baseY, fx.z]}>
              <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                ref={el => { const r = ensure(fx.key); r.ring = el; r.ringMat = el ? (el.material as THREE.MeshBasicMaterial) : null; }}
              >
                <ringGeometry args={[0.45, fx.type === 'splash' ? 0.92 : 0.78, 32]} />
                <meshBasicMaterial color={ringColor} transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
              </mesh>
              <mesh
                ref={el => { const r = ensure(fx.key); r.flash = el; r.flashMat = el ? (el.material as THREE.MeshBasicMaterial) : null; }}
              >
                <sphereGeometry args={[fx.type === 'splash' ? 0.85 : 0.65, 14, 10]} />
                <meshBasicMaterial color={flashColor} transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
              </mesh>
              {/* radial spokes — for splash these read as droplets arcing
                  outward from the impact point */}
              {Array.from({ length: spokes }).map((_, i) => {
                const a = (i / spokes) * Math.PI * 2;
                const stretch = fx.type === 'splash' ? 1.6 : 1.2;
                const dist = fx.type === 'splash' ? 1.1 : 0.8;
                return (
                  <mesh
                    key={i}
                    rotation={[-Math.PI / 2, 0, -a]}
                    position={[Math.cos(a) * dist, 0, Math.sin(a) * dist]}
                    scale={[fx.type === 'splash' ? 0.06 : 0.10, stretch, 1]}
                  >
                    <planeGeometry args={[1, 1]} />
                    <meshBasicMaterial color={flashColor} transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} />
                  </mesh>
                );
              })}
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
    onImpact: props.onImpact,
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
      <ChargeArrow state={state} />
      <AiRings state={state} />
      <AiTelegraphs state={state} />
      <BurstTrails state={state} />

      <ActorSync state={state} />

      <ImpactBursts state={state} />
      <PlayerScreenTracker state={state} onPos={props.onPlayerScreen} />
    </>
  );
}
