// All numbers mirror the original 老鹰抓小猫 game so the feel matches 1:1.
// Theme swap: cats→baby penguins, eagle→skua, dogs→seals, trees→icebergs.

export const PLAYFIELD = 30;            // dc — ground side length
export const PLAYER_SPEED = 12;         // UQ — base movement speed
export const SKUA_BASE_SPEED = 3.5;     // BQ — skua homes toward player at this speed
export const ICEBERG_AVOID_RADIUS = 1.2;// zQ — skua avoidance of icebergs
export const INITIAL_ICEBERGS = 8;      // VQ — inner-field iceberg count

export const MAX_BABIES = 15;           // max active baby penguins on field
export const SPAWN_INTERVAL_MIN = 1;    // baby penguin spawn 1..3s
export const SPAWN_INTERVAL_MAX = 3;
export const CATCH_RADIUS = 2;          // head→baby pickup
export const THREAT_HIT_RADIUS = 1.5;   // skua / seal hit radius
export const BODY_FOLLOW_SPEED = 3;     // segments chase the leader
export const SEGMENT_SIZE_BOOST = 0.02; // player speed grows +2% per segment

export const SEAL_SPAWN_INTERVAL = 5;   // every 5s, max 3
export const SEAL_MAX = 3;
export const SEAL_SPEED = 3;
export const SEAL_SPAWN_RADIUS = 20;

export const SKUA_SCORE_SPEEDUP = 0.1;  // skua speed = BQ + min(score*0.1, 5)
export const SKUA_SCORE_CAP = 5;

export const COLOR_TYPES = 8;           // baby penguin color variants

// Camera — same downward angle as the original (35, 15) but pulled closer so
// the leader reads at a chunkier scale on the screen. Ratio 22/9.4 ≈ 35/15
// preserves the camera tilt; distance drops from 38 → 24 (~63%).
export const CAMERA_POS: [number, number, number] = [0, 22, 9.4];
export const CAMERA_FOV = 50;

// Skua start: same as the original eagle — INSIDE the iceberg ring at
// (-10, 3, -10), distance ~14.1 from the player. Putting it outside the ring
// gets it stuck on the dense border icebergs and the player never dies.
export const SKUA_START: [number, number, number] = [-10, 3, -10];

// Grace period before kill/threat collision is evaluated. With the original
// start position the skua reaches the player in ~4s, so a short grace is fine.
export const GRACE_PERIOD = 1.5;
