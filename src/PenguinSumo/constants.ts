// Penguin Sumo — physics + AI constants. Inherits the Penguin Rescue engine's
// camera/joystick patterns; everything gameplay-related is new.

// Arena
export const ARENA_RADIUS = 15;          // ice disc radius
export const DANGER_RADIUS = 13.4;       // visual edge warning starts here
export const RING_OUT_RADIUS = 16;       // distance from origin → ringed out
export const PLAYFIELD = ARENA_RADIUS * 2; // legacy alias the engine reads

// Player
export const PLAYER_RADIUS = 0.75;       // body collision radius
export const PLAYER_WALK_SPEED = 6.5;    // baseline movement while not charging
export const PLAYER_CHARGE_WALK = 3.0;   // movement speed while charging
export const FRICTION = 5.0;             // velocity decay per second (idle)

// Charge / burst
export const CHARGE_TIME = 0.55;         // hold this long → fully charged
export const CHARGE_MIN_THRESHOLD = 0.18; // below this, release does nothing
export const BURST_MIN_SPEED = 11;       // burst speed at min charge
export const BURST_MAX_SPEED = 22;       // burst speed at full charge
export const BURST_DURATION = 0.30;      // committed high-speed window
export const DECAY_DURATION = 0.55;      // velocity decays over this window
export const RECOVER_AFTER_BURST = 0.18; // brief input lock after a burst

// Collision
export const COLLISION_ELASTICITY = 0.92; // 1.0 = elastic, lower = less bounce
export const IMPACT_BONK_MIN_SPEED = 4;   // below this, no SFX/screen-flash
export const KO_HISTORY_WINDOW = 2.5;     // last hitter only counts within this many seconds

// Round
export const ROUND_TIME = 60;             // seconds
export const KO_SCORE = 50;               // points per KO when player was last hitter
export const SURVIVAL_PT_PER_SEC = 1;     // points per second alive
export const ALL_DOWN_BONUS = 200;        // bonus when player KOs all 3 AI

// AI personalities — Rookie / Bruiser / Sniper
export interface AiSpec {
  id: string;
  approachSpeed: number;        // baseline approach speed
  chargeTime: number;           // seconds to fill a full charge
  burstSpeed: number;           // burst velocity when released
  recoverTime: number;          // time spent recovering after a burst
  triggerRange: number;         // start charging when target is within this distance
  edgeAvoidance: number;        // 0 = will run off the rink, 1 = stays away from edge
  bodyColor: string;            // body fill — distinct so player can read who's who
  beltColor: string;            // mawashi belt color
}

export const AI_SPECS: AiSpec[] = [
  {
    id: 'rookie',
    approachSpeed: 4.5,
    chargeTime: 1.4,
    burstSpeed: 13,
    recoverTime: 1.3,
    triggerRange: 6.0,
    edgeAvoidance: 0.95,
    bodyColor: '#2a3a30',
    beltColor: '#e8c54a',  // yellow mawashi
  },
  {
    id: 'bruiser',
    approachSpeed: 6.0,
    chargeTime: 0.5,
    burstSpeed: 17,
    recoverTime: 0.7,
    triggerRange: 4.4,
    edgeAvoidance: 0.40,   // dives into the fight, sometimes off the edge
    bodyColor: '#3a2424',
    beltColor: '#22a04a',  // green mawashi
  },
  {
    id: 'sniper',
    approachSpeed: 5.0,
    chargeTime: 2.0,
    burstSpeed: 22,
    recoverTime: 1.8,
    triggerRange: 8.0,
    edgeAvoidance: 0.85,
    bodyColor: '#33274a',
    beltColor: '#5a8be0',  // blue mawashi
  },
];

// Camera — pull up a bit higher than PR so the whole arena fits in view at
// once, plus a touch of follow.
export const CAMERA_POS: [number, number, number] = [0, 26, 11];
export const CAMERA_FOV = 50;

// Grace period before any KO event is counted (workspace CLAUDE.md rule).
export const GRACE_PERIOD = 1.0;
