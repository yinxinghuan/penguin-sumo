import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  PLAYFIELD, PLAYER_SPEED, SKUA_BASE_SPEED, ICEBERG_AVOID_RADIUS, INITIAL_ICEBERGS,
  MAX_BABIES, SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX, CATCH_RADIUS, THREAT_HIT_RADIUS,
  BODY_FOLLOW_SPEED, SEGMENT_SIZE_BOOST,
  SEAL_SPAWN_INTERVAL, SEAL_MAX, SEAL_SPEED, SEAL_SPAWN_RADIUS,
  SKUA_SCORE_SPEEDUP, SKUA_SCORE_CAP, COLOR_TYPES, SKUA_START,
  GRACE_PERIOD,
} from '../constants';
import type { BabyPenguin, BodySegment, Iceberg, Seal, Stick } from '../types';

export interface GameRef {
  headPos: THREE.Vector3;
  headRot: number;
  skuaPos: THREE.Vector3;
  skuaRot: number;
  babies: BabyPenguin[];
  bodyParts: BodySegment[];
  icebergs: Iceberg[];
  seals: Seal[];
  time: number;
  score: number;
  spawnTimer: number;
  nextSpawnTime: number;
  sealSpawnTimer: number;
  lastChirpTime: number;
  nextSkuaCryTime: number;
  gameOver: boolean;
  initialized: boolean;
}

export function createGameState(): GameRef {
  return {
    headPos: new THREE.Vector3(0, 0, 0),
    headRot: 0,
    skuaPos: new THREE.Vector3(...SKUA_START),
    skuaRot: 0,
    babies: [],
    bodyParts: [],
    icebergs: [],
    seals: [],
    time: 0,
    score: 0,
    spawnTimer: 0,
    nextSpawnTime: 0,
    sealSpawnTimer: 0,
    lastChirpTime: 0,
    nextSkuaCryTime: 2,
    gameOver: false,
    initialized: false,
  };
}

export interface GameLoopParams {
  state: React.MutableRefObject<GameRef>;
  playing: boolean;
  stick: Stick;
  onScore: (s: number) => void;
  onGameOver: (finalScore: number) => void;
  onChainBroken?: (lostCount: number) => void;
  playSfx: (key: 'chirp_short' | 'chirp_help' | 'chirp_happy' | 'skua_cry' | 'bonk' | 'game_over') => void;
  haptic?: (kind: 'light' | 'heavy') => void;
}

export function useGameLoop({ state, playing, stick, onScore, onGameOver, onChainBroken, playSfx, haptic }: GameLoopParams) {
  // Spawn icebergs whenever we encounter an uninitialized state (handles restart).
  if (!state.current.initialized) {
    const list: Iceberg[] = [];
    let attempts = 0;
    while (list.length < INITIAL_ICEBERGS && attempts < 100) {
      attempts++;
      const p = new THREE.Vector3(
        (Math.random() - 0.5) * PLAYFIELD * 0.8,
        0,
        (Math.random() - 0.5) * PLAYFIELD * 0.8,
      );
      // keep player spawn area (origin) clear
      if (p.length() < 4) continue;
      let ok = true;
      for (const o of list) {
        if (p.distanceTo(o.position) < 5) { ok = false; break; }
      }
      if (ok) list.push({ id: `inner_${list.length}`, position: p });
    }
    // border ring of icebergs as visual wall
    const r = PLAYFIELD / 2 + 2.5;
    const ring = Math.floor((2 * Math.PI * r) / 2);
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * Math.PI * 2;
      const jx = (Math.random() - 0.5) * 1.5;
      const jz = (Math.random() - 0.5) * 1.5;
      list.push({ id: `border_${i}`, position: new THREE.Vector3(Math.cos(a) * r + jx, 0, Math.sin(a) * r + jz) });
    }
    state.current.icebergs = list;
    state.current.initialized = true;
  }

  useFrame((_, delta) => {
    const d = state.current;
    if (!playing || d.gameOver) return;
    const c = Math.min(delta, 0.05); // clamp for stability

    d.time += c;
    d.spawnTimer += c;

    // ===== AUDIO CUES =====
    if (d.time > d.lastChirpTime + 1.5) {
      if (d.babies.length > 0 && Math.random() > 0.3) {
        playSfx('chirp_help');
        d.lastChirpTime = d.time + Math.random();
      }
      if (d.bodyParts.length > 0 && Math.random() > 0.4) {
        playSfx('chirp_happy');
        if (d.bodyParts.length > 5 && Math.random() > 0.5) {
          setTimeout(() => playSfx('chirp_happy'), 200);
        }
        d.lastChirpTime = d.time;
      }
    }
    if (d.time > d.nextSkuaCryTime) {
      playSfx('skua_cry');
      d.nextSkuaCryTime = d.time + 1 + Math.random() * 2;
    }

    // ===== PLAYER MOVEMENT =====
    const playerSpeed = PLAYER_SPEED * (1 + d.bodyParts.length * SEGMENT_SIZE_BOOST);
    if (stick.active) {
      const dir = new THREE.Vector3(stick.x, 0, stick.y);
      if (dir.length() > 0.1) {
        d.headPos.addScaledVector(dir, playerSpeed * c);
        d.headRot = Math.atan2(dir.x, dir.z);
      }
    }
    // Original clamp: head can travel up to length PLAYFIELD*2 from origin —
    // a much wider world than what's visible. The camera follows the player,
    // so leaving the ice rink is allowed; you just lose the babies behind.
    const maxLen = PLAYFIELD * 2;
    if (d.headPos.length() > maxLen) d.headPos.setLength(maxLen);

    // ===== BODY CHAIN FOLLOW =====
    d.bodyParts.forEach((seg, i) => {
      const target = i === 0 ? d.headPos : d.bodyParts[i - 1].position;
      const diff = new THREE.Vector3().subVectors(target, seg.position);
      diff.y = 0;
      const distance = diff.length();
      if (distance > 0.001) {
        diff.normalize();
        seg.position.addScaledVector(diff, BODY_FOLLOW_SPEED * c * Math.max(1, distance * 0.8));
        seg.rotation = Math.atan2(diff.x, diff.z);
      }
    });

    // ===== SKUA AI (homes onto player, hovers at y=3 above ice) =====
    const skuaDir = new THREE.Vector3().subVectors(d.headPos, d.skuaPos);
    skuaDir.y = 0;
    if (skuaDir.length() > 0.001) skuaDir.normalize();
    // avoid icebergs
    const avoid = new THREE.Vector3(0, 0, 0);
    for (const ice of d.icebergs) {
      const off = new THREE.Vector3().subVectors(d.skuaPos, ice.position);
      off.y = 0;
      const dist = off.length();
      if (dist < 1 + ICEBERG_AVOID_RADIUS && dist > 0.001) {
        off.normalize();
        const push = (1 + ICEBERG_AVOID_RADIUS - dist) * 5;
        avoid.addScaledVector(off, push);
      }
    }
    skuaDir.add(avoid);
    if (skuaDir.length() > 0.001) skuaDir.normalize();
    const skuaSpeed = SKUA_BASE_SPEED + Math.min(d.score * SKUA_SCORE_SPEEDUP, SKUA_SCORE_CAP);
    d.skuaPos.addScaledVector(skuaDir, skuaSpeed * c);
    d.skuaRot = Math.atan2(skuaDir.x, skuaDir.z);
    // skua hover height bob — keeps the bird airborne above the ice
    d.skuaPos.y = 3 + Math.sin(d.time * 2) * 0.4;

    // ===== SPAWN BABIES =====
    if (d.spawnTimer > d.nextSpawnTime && d.babies.length < MAX_BABIES) {
      d.spawnTimer = 0;
      d.nextSpawnTime = Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN) + SPAWN_INTERVAL_MIN;
      const r = PLAYFIELD / 2 - 2;
      const a = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * r;
      d.babies.push({
        id: Math.random(),
        position: new THREE.Vector3(Math.cos(a) * dist, 15, Math.sin(a) * dist),
        colorType: Math.floor(Math.random() * COLOR_TYPES),
        vy: 0,
      });
    }
    // baby drop physics
    for (const b of d.babies) {
      if (b.position.y > 0 || Math.abs(b.vy) > 0.1) {
        b.vy -= 30 * c;
        b.position.y += b.vy * c;
        if (b.position.y < 0) {
          b.position.y = 0;
          b.vy = Math.abs(b.vy) > 2 ? -b.vy * 0.5 : 0;
        }
      }
    }

    // ===== PICKUP =====
    for (let i = d.babies.length - 1; i >= 0; i--) {
      const baby = d.babies[i];
      if (baby.position.y > 0.5) continue; // wait until on ground
      const dx = baby.position.x - d.headPos.x;
      const dz = baby.position.z - d.headPos.z;
      if (Math.sqrt(dx * dx + dz * dz) < CATCH_RADIUS) {
        playSfx('chirp_short');
        haptic?.('light');
        d.score += 1;
        onScore(d.score);
        d.bodyParts.push({
          id: baby.id,
          position: baby.position.clone(),
          rotation: 0,
          colorType: baby.colorType,
        });
        d.bodyParts[d.bodyParts.length - 1].position.y = 0;
        d.babies.splice(i, 1);
      }
    }

    // ===== SEAL SPAWN + AI =====
    d.sealSpawnTimer += c;
    if (d.sealSpawnTimer > SEAL_SPAWN_INTERVAL && d.seals.length < SEAL_MAX) {
      d.sealSpawnTimer = 0;
      const a = Math.random() * Math.PI * 2;
      d.seals.push({
        id: Math.random(),
        position: new THREE.Vector3(Math.cos(a) * SEAL_SPAWN_RADIUS, 0, Math.sin(a) * SEAL_SPAWN_RADIUS),
        rotation: 0,
      });
    }
    for (const seal of d.seals) {
      const dir = new THREE.Vector3().subVectors(d.headPos, seal.position);
      dir.y = 0;
      if (dir.length() > 0.001) {
        dir.normalize();
        seal.position.addScaledVector(dir, SEAL_SPEED * c);
        seal.rotation = Math.atan2(dir.x, dir.z);
      }
    }

    // ===== SEAL HIT (score reset, drop the babies) =====
    const headGround = new THREE.Vector3(d.headPos.x, 0, d.headPos.z);
    if (d.time > GRACE_PERIOD) for (let i = d.seals.length - 1; i >= 0; i--) {
      const sp = d.seals[i].position;
      const sealGround = new THREE.Vector3(sp.x, 0, sp.z);
      let hit = sealGround.distanceTo(headGround) < THREAT_HIT_RADIUS;
      if (!hit) {
        for (const seg of d.bodyParts) {
          if (sealGround.distanceTo(new THREE.Vector3(seg.position.x, 0, seg.position.z)) < THREAT_HIT_RADIUS) {
            hit = true;
            break;
          }
        }
      }
      if (hit) {
        playSfx('bonk');
        haptic?.('heavy');
        // Lose a RANDOM PORTION of the chain — 40-75% of the current length,
        // always at least 1. The back of the chain (furthest from the leader)
        // takes the hit; the front stays attached. Lets a long chain survive
        // a seal hit without zeroing the run.
        const chainLen = d.bodyParts.length;
        if (chainLen > 0) {
          const fraction = 0.4 + Math.random() * 0.35;
          const lostCount = Math.min(chainLen, Math.max(1, Math.ceil(chainLen * fraction)));
          const lost = d.bodyParts.splice(d.bodyParts.length - lostCount, lostCount);
          // launch each lost segment back as a stray baby
          for (const seg of lost) {
            const a = Math.random() * Math.PI * 2;
            const launch = 5;
            d.babies.push({
              id: Math.random(),
              position: new THREE.Vector3(
                seg.position.x + Math.cos(a) * launch,
                seg.position.y,
                seg.position.z + Math.sin(a) * launch,
              ),
              colorType: seg.colorType,
              vy: Math.random() * 15 + 10,
            });
          }
          d.score = Math.max(0, d.score - lostCount);
          onScore(d.score);
          onChainBroken?.(lostCount);
        }
        d.seals.splice(i, 1);
      }
    }

    // ===== ORCA HIT (GAME OVER) =====
    // 1.5s grace period (workspace CLAUDE.md rule): no death judgment right after start.
    const skuaGround = new THREE.Vector3(d.skuaPos.x, 0, d.skuaPos.z);
    const endGame = () => {
      if (d.gameOver) return;
      d.gameOver = true;
      playSfx('bonk');
      playSfx('game_over');
      haptic?.('heavy');
      onGameOver(d.score);
    };
    if (d.time > GRACE_PERIOD) {
      if (skuaGround.distanceTo(headGround) < THREAT_HIT_RADIUS) endGame();
      for (const seg of d.bodyParts) {
        if (skuaGround.distanceTo(new THREE.Vector3(seg.position.x, 0, seg.position.z)) < THREAT_HIT_RADIUS) {
          endGame();
          break;
        }
      }
    }
  });
}
