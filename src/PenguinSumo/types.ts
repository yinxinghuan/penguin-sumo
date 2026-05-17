import * as THREE from 'three';

export type Phase = 'splash' | 'playing' | 'gameover';

export interface Stick {
  active: boolean;
  x: number; // -1..1
  y: number; // -1..1
}

export type PenguinState =
  | 'idle'        // standing / walking, no charge
  | 'charging'    // holding charge, walking slowly toward stick
  | 'bursting'    // committed high-speed dash
  | 'recover'     // brief input lock after a burst
  | 'falling'     // KO'd, dropping out of the rink
  | 'gone';       // fully off the field, hidden

export interface SumoPenguin {
  id: string;
  isPlayer: boolean;
  aiIx: number;                   // index into AI_SPECS, -1 for player
  position: THREE.Vector3;        // ground position (y=0 unless falling)
  velocity: THREE.Vector3;        // horizontal velocity
  rotation: number;               // facing direction in radians
  state: PenguinState;
  charge: number;                 // 0..1 — how filled the charge meter is
  burstT: number;                 // seconds left in burst phase
  recoverT: number;               // seconds left in recover phase
  // AI scratchpad
  approachTargetIx: number;       // which other penguin we're chasing right now
  // Audio cue flags
  chargeFullCued: boolean;        // played the "fully charged" chime this cycle
  // Bookkeeping
  lastImpactFrom: string | null;  // id of the last penguin that hit us
  lastImpactAt: number;           // time of that hit (for KO_HISTORY_WINDOW)
  fellOutAt: number;              // time when state became 'falling'
  bodyColor: string;              // distinguishing body color
  beltColor: string;              // mawashi belt color
}

// Floating effect (bonk burst, KO splash, charge flash)
export interface FxEvent {
  key: number;
  type: 'bonk' | 'splash' | 'ko' | 'charge';
  x: number;
  z: number;
  born: number;
}
