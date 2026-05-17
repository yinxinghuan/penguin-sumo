// Penguin Sumo — physics + AI constants. Inherits the Penguin Rescue engine's
// camera/joystick patterns; everything gameplay-related is new.

// Arena
export const ARENA_RADIUS = 15;          // ice disc radius
export const DANGER_RADIUS = 13.4;       // visual edge warning starts here
export const RING_OUT_RADIUS = 16;       // distance from origin → ringed out
export const PLAYFIELD = ARENA_RADIUS * 2; // legacy alias the engine reads

// Player
export const PLAYER_RADIUS = 1.05;       // body collision radius (matched to
                                         // ~1.4× wrestler mesh scale below)
export const PLAYER_WALK_SPEED = 7.5;    // baseline movement while not charging
export const PLAYER_CHARGE_WALK = 3.4;   // movement speed while charging
export const FRICTION = 5.0;             // velocity decay per second (idle)
export const WRESTLER_VISUAL_SCALE = 1.4; // scale prop fed into mesh components

// Charge / burst — heavier punch since wrestlers are bigger and the user
// expects a meaty hit when releasing the slingshot.
export const CHARGE_TIME = 0.42;          // hold this long → fully charged
export const CHARGE_MIN_THRESHOLD = 0.15; // below this, release does nothing
export const BURST_MIN_SPEED = 15;        // burst speed at min charge
export const BURST_MAX_SPEED = 34;        // burst speed at full charge
export const BURST_DURATION = 0.34;       // committed high-speed window
export const DECAY_DURATION = 0.60;       // velocity decays over this window
export const RECOVER_AFTER_BURST = 0.16;  // brief input lock after a burst

// Collision — cartoon over-elastic: bounce HARDER than realistic so a clean
// dash sends the opponent flying. Values >1.0 add energy to the exchange,
// which is exactly the comic "WHAM" we want.
export const COLLISION_ELASTICITY = 1.22;
export const IMPACT_BONK_MIN_SPEED = 4;   // below this, no SFX/screen-flash
export const KO_HISTORY_WINDOW = 2.5;     // last hitter only counts within this many seconds

// Round
export const ROUND_TIME = 60;             // seconds
export const KO_SCORE = 50;               // points per KO when player was last hitter
export const SURVIVAL_PT_PER_SEC = 1;     // points per second alive
export const ALL_DOWN_BONUS = 200;        // bonus when player KOs all 3 AI

// Wrestler species — the player is always a penguin; AI cycle through the
// AlterU 3D-series cast so each bout feels like an all-star brawl.
export type WrestlerSpecies = 'penguin' | 'sheep' | 'wolf' | 'sheepdog';

// AI personalities — Rookie / Bruiser / Sniper, each tied to a species.
export interface AiSpec {
  id: string;
  species: WrestlerSpecies;
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
    species: 'sheep',           // peaceful, timid, easy to push
    approachSpeed: 4.5,
    chargeTime: 1.4,
    burstSpeed: 13,
    recoverTime: 1.3,
    triggerRange: 6.0,
    edgeAvoidance: 0.95,
    bodyColor: '#f4ecd8',       // wool cream
    beltColor: '#e8c54a',       // yellow mawashi
  },
  {
    id: 'bruiser',
    species: 'wolf',            // aggressive predator
    approachSpeed: 6.0,
    chargeTime: 0.5,
    burstSpeed: 17,
    recoverTime: 0.7,
    triggerRange: 4.4,
    edgeAvoidance: 0.40,
    bodyColor: '#5a5650',       // grey wolf fur
    beltColor: '#22a04a',       // green mawashi
  },
  {
    id: 'sniper',
    species: 'sheepdog',        // patient, calculating
    approachSpeed: 5.0,
    chargeTime: 2.0,
    burstSpeed: 22,
    recoverTime: 1.8,
    triggerRange: 8.0,
    edgeAvoidance: 0.85,
    bodyColor: '#161616',       // border collie black
    beltColor: '#5a8be0',       // blue mawashi
  },
];

// Camera — closer pull-in so the wrestlers read at chunky scale. Whole arena
// still fits because of the wide aspect on mobile portrait viewports.
export const CAMERA_POS: [number, number, number] = [0, 20, 8.5];
export const CAMERA_FOV = 50;

// Grace period before any KO event is counted (workspace CLAUDE.md rule).
export const GRACE_PERIOD = 1.0;
