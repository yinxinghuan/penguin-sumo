import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ARENA_RADIUS, RING_OUT_RADIUS, PLAYER_RADIUS,
  PLAYER_CHARGE_WALK, FRICTION,
  CHARGE_TIME, CHARGE_MIN_THRESHOLD, BURST_MIN_SPEED, BURST_MAX_SPEED,
  BURST_DURATION, DECAY_DURATION, RECOVER_AFTER_BURST,
  COLLISION_ELASTICITY, IMPACT_BONK_MIN_SPEED, KO_HISTORY_WINDOW,
  ROUND_TIME, KO_SCORE, SURVIVAL_PT_PER_SEC, ALL_DOWN_BONUS,
  GRACE_PERIOD, AI_SPECS,
} from '../constants';
import type { SumoPenguin, FxEvent, Stick } from '../types';

export type SfxKey = 'charge' | 'burst' | 'bonk' | 'ko' | 'tick' | 'cheer' | 'win' | 'fail';

export interface GameRef {
  penguins: SumoPenguin[];
  time: number;            // total elapsed
  timeLeft: number;        // round timer countdown
  score: number;
  kos: number;             // KOs the player landed
  initialized: boolean;
  gameOver: boolean;
  // visual feedback queue (read by Scene, drained when consumed)
  fx: FxEvent[];
  // remember the previous stick state so we can detect press→release for burst
  stickWasActive: boolean;
}

export function createGameState(): GameRef {
  return {
    penguins: [],
    time: 0,
    timeLeft: ROUND_TIME,
    score: 0,
    kos: 0,
    initialized: false,
    gameOver: false,
    fx: [],
    stickWasActive: false,
  };
}

function spawnInitial(d: GameRef) {
  // Player at center-south, 3 AI evenly around them.
  const player: SumoPenguin = {
    id: 'player',
    isPlayer: true,
    aiIx: -1,
    position: new THREE.Vector3(0, 0, ARENA_RADIUS * 0.55),
    velocity: new THREE.Vector3(),
    rotation: Math.PI, // facing north toward the others
    state: 'idle',
    charge: 0,
    burstT: 0,
    recoverT: 0,
    approachTargetIx: -1,
    chargeFullCued: false,
    lastImpactFrom: null,
    lastImpactAt: -99,
    fellOutAt: -1,
    species: 'penguin',
    bodyColor: '#1a1a1a',
    beltColor: '#d8453e', // red mawashi for the player — classic
  };
  d.penguins.push(player);
  // Three AI in a triangle on the north half
  const angles = [Math.PI * 1.20, Math.PI * 1.50, Math.PI * 1.80];
  for (let i = 0; i < 3; i++) {
    const spec = AI_SPECS[i % AI_SPECS.length];
    const a = angles[i];
    d.penguins.push({
      id: `ai_${i}`,
      isPlayer: false,
      aiIx: i,
      position: new THREE.Vector3(Math.cos(a) * ARENA_RADIUS * 0.55, 0, Math.sin(a) * ARENA_RADIUS * 0.55),
      velocity: new THREE.Vector3(),
      rotation: a + Math.PI, // face inward
      state: 'idle',
      charge: 0,
      burstT: 0,
      recoverT: 0,
      approachTargetIx: -1,
      chargeFullCued: false,
      lastImpactFrom: null,
      lastImpactAt: -99,
      fellOutAt: -1,
      species: spec.species,
      bodyColor: spec.bodyColor,
      beltColor: spec.beltColor,
    });
  }
}

function emitFx(d: GameRef, type: FxEvent['type'], x: number, z: number) {
  d.fx.push({ key: Math.random(), type, x, z, born: d.time });
  // garbage-collect old fx (>2s) so the array doesn't grow forever
  if (d.fx.length > 24) {
    d.fx = d.fx.filter(f => d.time - f.born < 2);
  }
}

export interface GameLoopParams {
  state: React.MutableRefObject<GameRef>;
  playing: boolean;
  stick: Stick;
  onScore: (s: number) => void;
  onTime: (timeLeft: number) => void;
  onKo: (totalKos: number) => void;
  onGameOver: (final: number, won: boolean) => void;
  onCharge: (charge: number) => void;
  playSfx: (k: SfxKey) => void;
  haptic?: (k: 'light' | 'heavy') => void;
}

export function useGameLoop(p: GameLoopParams) {
  if (!p.state.current.initialized) {
    spawnInitial(p.state.current);
    p.state.current.initialized = true;
  }

  useFrame((_, delta) => {
    const d = p.state.current;
    if (!p.playing || d.gameOver) return;
    const c = Math.min(delta, 0.05);
    d.time += c;
    d.timeLeft = Math.max(0, d.timeLeft - c);
    p.onTime(d.timeLeft);

    const player = d.penguins.find(p => p.isPlayer);
    if (!player) return;

    // -----------------------------------------------------------------------
    // PLAYER INPUT — charging while stick is held; burst on release.
    // -----------------------------------------------------------------------
    if (player.state !== 'falling' && player.state !== 'gone') {
      const stickMag = Math.hypot(p.stick.x, p.stick.y);
      const stickActive = p.stick.active && stickMag > 0.18;

      if (player.state === 'idle' || player.state === 'charging') {
        if (stickActive) {
          // Aim
          player.rotation = Math.atan2(p.stick.x, p.stick.y);
          // Build charge
          const prevCharge = player.charge;
          player.charge = Math.min(1, player.charge + c / CHARGE_TIME);
          if (player.state === 'idle') {
            player.state = 'charging';
            player.chargeFullCued = false;
            p.playSfx('charge');
          }
          // Fully-charged chime + haptic — fires once when charge crosses 1.0
          if (player.charge >= 1 && prevCharge < 1 && !player.chargeFullCued) {
            player.chargeFullCued = true;
            p.playSfx('tick');
            p.haptic?.('light');
          }
          // Slow walk while charging
          const walkSpeed = PLAYER_CHARGE_WALK * (1 - player.charge * 0.35);
          player.velocity.set(
            (p.stick.x / Math.max(stickMag, 0.01)) * walkSpeed,
            0,
            (p.stick.y / Math.max(stickMag, 0.01)) * walkSpeed,
          );
          p.onCharge(player.charge);
        } else {
          // No stick — if we were charging, release the burst now
          if (player.state === 'charging' && player.charge > CHARGE_MIN_THRESHOLD) {
            const speed = BURST_MIN_SPEED + (BURST_MAX_SPEED - BURST_MIN_SPEED) * player.charge;
            player.velocity.set(Math.sin(player.rotation) * speed, 0, Math.cos(player.rotation) * speed);
            player.state = 'bursting';
            player.burstT = BURST_DURATION + DECAY_DURATION;
            p.playSfx('burst');
            p.haptic?.('light');
            emitFx(d, 'charge', player.position.x, player.position.z);
          } else {
            player.state = 'idle';
          }
          player.charge = 0;
          player.chargeFullCued = false;
          p.onCharge(0);
        }
      } else if (player.state === 'bursting') {
        player.burstT -= c;
        // velocity decays through the burst phase — linear ramp from burst speed
        // down to ~zero over the full window
        const decayMul = Math.max(0, player.burstT / (BURST_DURATION + DECAY_DURATION));
        player.velocity.multiplyScalar(0.5 + 0.5 * Math.pow(decayMul, 0.4));
        if (player.burstT <= 0) {
          player.state = 'recover';
          player.recoverT = RECOVER_AFTER_BURST;
        }
      } else if (player.state === 'recover') {
        player.recoverT -= c;
        if (player.recoverT <= 0) player.state = 'idle';
      }
    }

    d.stickWasActive = p.stick.active;

    // -----------------------------------------------------------------------
    // AI — for each non-player penguin, run a short state machine.
    // -----------------------------------------------------------------------
    for (const peng of d.penguins) {
      if (peng.isPlayer) continue;
      if (peng.state === 'falling' || peng.state === 'gone') continue;
      const spec = AI_SPECS[peng.aiIx];
      // Pick a target each tick — nearest non-fallen penguin that isn't us
      let bestDist = Infinity;
      let target: SumoPenguin | null = null;
      for (const other of d.penguins) {
        if (other === peng) continue;
        if (other.state === 'falling' || other.state === 'gone') continue;
        const dx = other.position.x - peng.position.x;
        const dz = other.position.z - peng.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < bestDist) { bestDist = dist; target = other; }
      }
      if (!target) continue;

      if (peng.state === 'idle') {
        // start approaching immediately
        peng.state = 'charging';
        peng.charge = 0;
      }

      if (peng.state === 'charging') {
        const dx = target.position.x - peng.position.x;
        const dz = target.position.z - peng.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        // Move toward target — modulated by edge-avoidance so cautious AIs don't
        // run themselves off the edge while chasing.
        const myR = Math.hypot(peng.position.x, peng.position.z);
        const edgePush = new THREE.Vector3(0, 0, 0);
        if (myR > ARENA_RADIUS * 0.85) {
          edgePush.set(-peng.position.x, 0, -peng.position.z).normalize();
          edgePush.multiplyScalar(spec.edgeAvoidance);
        }
        const desire = new THREE.Vector3(dx, 0, dz);
        if (desire.length() > 0.01) desire.normalize();
        desire.add(edgePush);
        if (desire.length() > 0.01) desire.normalize();
        const walkSpeed = spec.approachSpeed * (1 - peng.charge * 0.30);
        peng.velocity.set(desire.x * walkSpeed, 0, desire.z * walkSpeed);
        peng.rotation = Math.atan2(desire.x, desire.z);

        // Fill charge
        peng.charge = Math.min(1, peng.charge + c / spec.chargeTime);

        // Release burst when fully charged AND target is within trigger range
        if (peng.charge >= 0.98 && dist <= spec.triggerRange) {
          // Aim at target's CURRENT position (no lead — easier on the player)
          const aim = new THREE.Vector3(dx, 0, dz).normalize();
          const speed = spec.burstSpeed;
          peng.velocity.set(aim.x * speed, 0, aim.z * speed);
          peng.rotation = Math.atan2(aim.x, aim.z);
          peng.state = 'bursting';
          peng.burstT = BURST_DURATION + DECAY_DURATION;
          peng.charge = 0;
        }
      } else if (peng.state === 'bursting') {
        peng.burstT -= c;
        const decayMul = Math.max(0, peng.burstT / (BURST_DURATION + DECAY_DURATION));
        peng.velocity.multiplyScalar(0.5 + 0.5 * Math.pow(decayMul, 0.4));
        if (peng.burstT <= 0) {
          peng.state = 'recover';
          peng.recoverT = spec.recoverTime;
        }
      } else if (peng.state === 'recover') {
        peng.recoverT -= c;
        if (peng.recoverT <= 0) peng.state = 'charging';
      }
    }

    // -----------------------------------------------------------------------
    // INTEGRATE — apply velocity to positions; apply friction for idle bodies.
    // -----------------------------------------------------------------------
    for (const peng of d.penguins) {
      if (peng.state === 'falling') {
        // Drop animation — position keeps drifting outward + y falls
        peng.position.x += peng.velocity.x * c;
        peng.position.z += peng.velocity.z * c;
        peng.position.y -= 4 * c + Math.max(0, (d.time - peng.fellOutAt) * 1.6);
        if (peng.position.y < -3) {
          peng.state = 'gone';
        }
        continue;
      }
      if (peng.state === 'gone') continue;

      peng.position.x += peng.velocity.x * c;
      peng.position.z += peng.velocity.z * c;

      // Friction (only outside of burst state)
      if (peng.state !== 'bursting') {
        peng.velocity.x *= Math.exp(-FRICTION * c);
        peng.velocity.z *= Math.exp(-FRICTION * c);
      }
    }

    // -----------------------------------------------------------------------
    // COLLISIONS — pair-wise body checks; momentum exchange along the normal.
    // -----------------------------------------------------------------------
    for (let i = 0; i < d.penguins.length; i++) {
      const a = d.penguins[i];
      if (a.state === 'falling' || a.state === 'gone') continue;
      for (let j = i + 1; j < d.penguins.length; j++) {
        const b = d.penguins[j];
        if (b.state === 'falling' || b.state === 'gone') continue;

        const dx = a.position.x - b.position.x;
        const dz = a.position.z - b.position.z;
        const dist = Math.hypot(dx, dz);
        const minDist = PLAYER_RADIUS * 2;
        if (dist >= minDist || dist < 0.0001) continue;

        // Separate so they don't overlap
        const overlap = minDist - dist;
        const nx = dx / dist;
        const nz = dz / dist;
        a.position.x += nx * overlap * 0.5;
        a.position.z += nz * overlap * 0.5;
        b.position.x -= nx * overlap * 0.5;
        b.position.z -= nz * overlap * 0.5;

        // Velocity along the contact normal
        const v1n = a.velocity.x * nx + a.velocity.z * nz;
        const v2n = b.velocity.x * nx + b.velocity.z * nz;
        const approach = v1n - v2n;
        if (approach > 0) continue; // already separating
        // Elastic-ish exchange with restitution
        const delta = (v1n - v2n) * (1 + COLLISION_ELASTICITY) / 2;
        a.velocity.x -= delta * nx;
        a.velocity.z -= delta * nz;
        b.velocity.x += delta * nx;
        b.velocity.z += delta * nz;

        // Bookkeeping: which side hit harder? Track that for KO attribution.
        const closingSpeed = Math.abs(approach);
        if (closingSpeed >= IMPACT_BONK_MIN_SPEED) {
          // The penguin moving faster INTO the contact is the "attacker"
          const aIntoB = v1n < v2n; // a's vel along n is more negative → a moves into b
          if (aIntoB) {
            b.lastImpactFrom = a.id;
            b.lastImpactAt = d.time;
          } else {
            a.lastImpactFrom = b.id;
            a.lastImpactAt = d.time;
          }
          // bonk feedback at midpoint
          const mx = (a.position.x + b.position.x) / 2;
          const mz = (a.position.z + b.position.z) / 2;
          emitFx(d, 'bonk', mx, mz);
          p.playSfx('bonk');
          if (a.isPlayer || b.isPlayer) p.haptic?.('heavy');
        }
      }
    }

    // -----------------------------------------------------------------------
    // RING-OUT — anyone outside RING_OUT_RADIUS starts falling.
    // -----------------------------------------------------------------------
    if (d.time > GRACE_PERIOD) {
      for (const peng of d.penguins) {
        if (peng.state === 'falling' || peng.state === 'gone') continue;
        const r = Math.hypot(peng.position.x, peng.position.z);
        if (r > RING_OUT_RADIUS) {
          peng.state = 'falling';
          peng.fellOutAt = d.time;
          emitFx(d, 'splash', peng.position.x, peng.position.z);
          p.playSfx('ko');
          // Score attribution — was a recent hit responsible?
          const recent = d.time - peng.lastImpactAt < KO_HISTORY_WINDOW;
          if (recent && peng.lastImpactFrom) {
            const hitter = d.penguins.find(x => x.id === peng.lastImpactFrom);
            if (hitter?.isPlayer && !peng.isPlayer) {
              d.kos += 1;
              d.score += KO_SCORE;
              p.onScore(d.score);
              p.onKo(d.kos);
              p.playSfx('cheer');
              emitFx(d, 'ko', peng.position.x, peng.position.z);
            }
          }
        }
      }
    }

    // -----------------------------------------------------------------------
    // SCORE — running survival bonus per second the player is still in.
    // -----------------------------------------------------------------------
    if (player.state !== 'falling' && player.state !== 'gone') {
      d.score += SURVIVAL_PT_PER_SEC * c;
      p.onScore(d.score);
    }

    // -----------------------------------------------------------------------
    // WIN / LOSE
    // -----------------------------------------------------------------------
    const alive = d.penguins.filter(x => x.state !== 'falling' && x.state !== 'gone');
    const playerAlive = alive.some(x => x.isPlayer);
    const aiAlive = alive.some(x => !x.isPlayer);

    if (!playerAlive && !d.gameOver) {
      d.gameOver = true;
      p.playSfx('fail');
      setTimeout(() => p.onGameOver(Math.floor(d.score), false), 600);
      return;
    }
    if (!aiAlive && playerAlive && !d.gameOver) {
      d.gameOver = true;
      d.score += ALL_DOWN_BONUS;
      p.onScore(d.score);
      p.playSfx('win');
      setTimeout(() => p.onGameOver(Math.floor(d.score), true), 600);
      return;
    }
    if (d.timeLeft <= 0 && !d.gameOver) {
      d.gameOver = true;
      p.playSfx(playerAlive ? 'win' : 'fail');
      setTimeout(() => p.onGameOver(Math.floor(d.score), playerAlive), 600);
      return;
    }
  });
}
