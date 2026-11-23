import type {
  CircuitDefinition,
  CircuitId,
  TrackFrame,
  Vec3,
} from './types';

function vecSub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vecLen(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

function vecNorm(v: Vec3): Vec3 {
  const len = vecLen(v);
  if (len < 1e-8) return { x: 0, y: 0, z: 1 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function vecCross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function vecDot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

export function wrapProgress(t: number): number {
  const m = t % 1;
  return m < 0 ? m + 1 : m;
}

export function shortestProgressDelta(fromT: number, toT: number): number {
  let diff = wrapProgress(toT) - wrapProgress(fromT);
  if (diff > 0.5) diff -= 1;
  if (diff < -0.5) diff += 1;
  return diff;
}

export const CIRCUITS: Record<CircuitId, CircuitDefinition> = {
  // LV 1: GRAND SOLAR CANYON (~3,500m) — 5-zone sunlit megacanyon with Twin-Route Sun Bowl,
  // Desert Oasis River Plunge, Heliostat Solar Valley, Pinball Bumpers & Slingshot Turbo Gates!
  'solar-canyon': {
    id: 'solar-canyon',
    biome: 'canyon',
    name: 'Solar Canyon',
    subtitle: 'Grand 5-zone sandstone megacanyon, oasis river plunge, pinball bumpers & slingshot gates',
    laps: 2,
    trackWidth: 40,
    skyTopColor: '#1b2c5c',
    skyHorizonColor: '#f7a562',
    fogColor: '#e89d65',
    terrainPrimary: '#bc5e3b',
    terrainAccent: '#863c2b',
    controlPoints: [
      // Zone 1: Wide Grand Solar Launch Straight -> Red-Rock Arch Climb
      { x: 0, y: 12, z: 0, bank: 0, width: 42 },
      { x: 0, y: 14, z: -215, bank: 0, width: 40 },
      { x: 92, y: 24, z: -425, bank: -0.18, width: 44 },
      // Zone 2: Colossal 58m Banked Sun Bowl & Twin-Route Mesa Plaza
      { x: 265, y: 38, z: -565, bank: -0.24, width: 54 },
      { x: 480, y: 46, z: -525, bank: -0.26, width: 58 },
      { x: 635, y: 38, z: -360, bank: -0.22, width: 52 },
      // Zone 3: Downhill Plunge into Shimmering Desert Oasis River Basin
      { x: 675, y: 20, z: -155, bank: 0.14, width: 38 },
      { x: 555, y: 8, z: 22, bank: 0.22, width: 34 },
      { x: 438, y: 10, z: 180, bank: -0.16, width: 46 },
      // Zone 4: Heliostat Solar Dish Valley & Rhythmic Canyon S-Bends
      { x: 530, y: 20, z: 368, bank: -0.22, width: 42 },
      { x: 418, y: 32, z: 535, bank: -0.2, width: 32 },
      { x: 242, y: 26, z: 485, bank: 0.2, width: 30 },
      { x: 132, y: 34, z: 615, bank: -0.24, width: 48 },
      // Zone 5: Southern Monument Basin & Wide Spectator Finish Straight
      { x: -55, y: 40, z: 630, bank: -0.25, width: 54 },
      { x: -230, y: 30, z: 540, bank: -0.22, width: 48 },
      { x: -260, y: 20, z: 360, bank: -0.16, width: 40 },
      { x: -150, y: 14, z: 225, bank: -0.12, width: 40 },
      { x: -14, y: 12, z: 170, bank: -0.04, width: 42 },
    ],
    boostPads: [
      // Welcoming opening boost pad visible straight ahead from the starting grid
      { id: 'sc-bp-1', t: 0.036, lateral: 0, width: 11, length: 22 },
      // Apex-exit booster climbing toward the Sun Bowl
      { id: 'sc-bp-2', t: 0.145, lateral: -6.0, width: 10.5, length: 21 },
      // Twin-route Sun Bowl LEFT high-speed double-boost chain
      { id: 'sc-bp-3', t: 0.195, lateral: -12.0, width: 10.5, length: 21 },
      { id: 'sc-bp-4', t: 0.250, lateral: -10.5, width: 10.5, length: 21 },
      // Oasis River exit slingshot into Oasis Lagoon Plaza
      { id: 'sc-bp-5', t: 0.452, lateral: -7.0, width: 10.5, length: 21 },
      // Heliostat Solar Valley climb booster
      { id: 'sc-bp-6', t: 0.548, lateral: 0, width: 10, length: 20 },
      // Canyon S-bend exit booster
      { id: 'sc-bp-7', t: 0.618, lateral: 5.5, width: 10, length: 20 },
      // Southern Monument Basin RIGHT fast-lane booster
      { id: 'sc-bp-8', t: 0.772, lateral: 11.5, width: 10.5, length: 21 },
      // Spectator Finish Straight finale booster
      { id: 'sc-bp-9', t: 0.954, lateral: 0, width: 11.5, length: 22 },
    ],
    jumpRamps: [
      { id: 'sc-rmp-1', t: 0.088, lateral: 5.5, width: 13, length: 19, launchVel: 24.0, speedBoost: 16 },
      { id: 'sc-rmp-2', t: 0.484, lateral: 8.5, width: 13.5, length: 19, launchVel: 25.0, speedBoost: 17 },
      { id: 'sc-rmp-3', t: 0.778, lateral: -11.5, width: 13.5, length: 19, launchVel: 24.8, speedBoost: 16 },
    ],
    updrafts: [
      { id: 'sc-up-1', t: 0.222, lateral: 12.5, radius: 8.2, liftVel: 27.5, colorHex: 0x2df9f2 },
      { id: 'sc-up-2', t: 0.695, lateral: -9.5, radius: 8.0, liftVel: 27.0, colorHex: 0xffd166 },
    ],
    warpTunnels: [
      { id: 'sc-wt-1', tStart: 0.335, tEnd: 0.382, ringCount: 5, speedBonus: 25, colorHex: 0xffb703 },
      { id: 'sc-wt-2', tStart: 0.895, tEnd: 0.935, ringCount: 5, speedBonus: 26, colorHex: 0x2df9f2 },
    ],
    rings: [
      { id: 'sc-r-1', t: 0.025, lateral: 0, heightOffset: 2.2, radius: 3.0, elevated: false },
      { id: 'sc-r-2', t: 0.064, lateral: 4.5, heightOffset: 2.2, radius: 3.0, elevated: false },
      { id: 'sc-r-3', t: 0.102, lateral: 5.5, heightOffset: 6.6, radius: 3.4, elevated: true },
      { id: 'sc-r-4', t: 0.165, lateral: -7.5, heightOffset: 2.2, radius: 3.0, elevated: false },
      { id: 'sc-r-5', t: 0.218, lateral: -11.5, heightOffset: 2.2, radius: 3.0, elevated: false },
      { id: 'sc-r-6', t: 0.238, lateral: 12.5, heightOffset: 8.0, radius: 3.5, elevated: true },
      { id: 'sc-r-7', t: 0.296, lateral: 0, heightOffset: 2.2, radius: 3.0, elevated: false },
      { id: 'sc-r-8', t: 0.360, lateral: 0, heightOffset: 2.4, radius: 3.1, elevated: false },
      { id: 'sc-r-9', t: 0.436, lateral: -6.5, heightOffset: 2.2, radius: 3.0, elevated: false },
      { id: 'sc-r-10', t: 0.498, lateral: 8.5, heightOffset: 7.0, radius: 3.5, elevated: true },
      { id: 'sc-r-11', t: 0.562, lateral: 4.0, heightOffset: 2.2, radius: 3.0, elevated: false },
      { id: 'sc-r-12', t: 0.634, lateral: 5.0, heightOffset: 2.2, radius: 3.0, elevated: false },
      { id: 'sc-r-13', t: 0.712, lateral: -9.5, heightOffset: 8.0, radius: 3.5, elevated: true },
      { id: 'sc-r-14', t: 0.768, lateral: 11.5, heightOffset: 2.2, radius: 3.0, elevated: false },
      { id: 'sc-r-15', t: 0.793, lateral: -11.5, heightOffset: 7.0, radius: 3.5, elevated: true },
      { id: 'sc-r-16', t: 0.872, lateral: 0, heightOffset: 2.2, radius: 3.0, elevated: false },
      { id: 'sc-r-17', t: 0.918, lateral: 0, heightOffset: 2.4, radius: 3.1, elevated: false },
      { id: 'sc-r-18', t: 0.978, lateral: 0, heightOffset: 2.2, radius: 3.0, elevated: false },
    ],
    hazards: [
      // Level 1 activates only the first 2 slow-telegraphed EMP barriers, widely spaced!
      { id: 'sc-hz-1', t: 0.580, lateral: -6.0, width: 8.5, phaseOffset: 0.0, cycleDuration: 4.8 },
      { id: 'sc-hz-2', t: 0.852, lateral: 0, width: 8.5, phaseOffset: 1.4, cycleDuration: 4.8, moveAmplitude: 6.5, moveSpeed: 0.9 },
      { id: 'sc-hz-3', t: 0.318, lateral: -4.0, width: 8.5, phaseOffset: 2.0, cycleDuration: 4.5 },
      { id: 'sc-hz-4', t: 0.715, lateral: 5.5, width: 8.5, phaseOffset: 0.8, cycleDuration: 4.5 },
    ],
    obstacles: [
      // Wide Sun Bowl central sandstone split-pillar creating twin 22m+ passing lanes
      { id: 'sc-ob-1', kind: 'rock-pillar', t: 0.206, lateral: 0, radius: 3.2, height: 13.5 },
      // Fun Solar Pinball Bumper Orbs in Sun Bowl exit (bouncy +15% boost & +100 pts!)
      { id: 'sc-ob-2', kind: 'bumper-orb', t: 0.288, lateral: -6.0, radius: 2.5, height: 3.4, bounceForce: 24 },
      { id: 'sc-ob-3', kind: 'bumper-orb', t: 0.308, lateral: 6.0, radius: 2.5, height: 3.4, bounceForce: 24 },
      // Patrolling Oasis Canyon Recon Drone (steerable or hop-overable!)
      { id: 'sc-ob-4', kind: 'hover-drone', t: 0.422, lateral: 0, radius: 2.2, height: 3.0, moveAmplitude: 7.0, moveSpeed: 1.0, phaseOffset: 0.4 },
      // Oasis Lagoon Pinball Bumper opposite Jump Ramp #2
      { id: 'sc-ob-5', kind: 'bumper-orb', t: 0.484, lateral: -9.5, radius: 2.5, height: 3.4, bounceForce: 24 },
      // Heliostat Valley Patrolling Recon Drone
      { id: 'sc-ob-6', kind: 'hover-drone', t: 0.652, lateral: 0, radius: 2.1, height: 3.0, moveAmplitude: 6.0, moveSpeed: 0.95, phaseOffset: 1.8 },
      // Southern Monument Basin split-pillar (54m wide -> huge left ramp & right boost lanes!)
      { id: 'sc-ob-7', kind: 'rock-pillar', t: 0.752, lateral: 1.0, radius: 3.2, height: 13.0 },
      // Monument Basin Pinball Bumper on right exit
      { id: 'sc-ob-8', kind: 'bumper-orb', t: 0.818, lateral: 9.0, radius: 2.5, height: 3.4, bounceForce: 24 },
    ],
    speedGates: [
      // Floating Slingshot Turbo Gates rewarding aerial jumps, updraft chains & sprint lines!
      { id: 'sc-sg-1', t: 0.114, lateral: 5.5, heightOffset: 4.8, radius: 5.4, speedBonus: 22, colorHex: 0x2df9f2 },
      { id: 'sc-sg-2', t: 0.258, lateral: 11.5, heightOffset: 5.6, radius: 5.6, speedBonus: 22, colorHex: 0xffd166 },
      { id: 'sc-sg-3', t: 0.512, lateral: 8.5, heightOffset: 4.8, radius: 5.4, speedBonus: 22, colorHex: 0x2df9f2 },
      { id: 'sc-sg-4', t: 0.806, lateral: -11.0, heightOffset: 5.0, radius: 5.4, speedBonus: 22, colorHex: 0xffd166 },
      { id: 'sc-sg-5', t: 0.968, lateral: 0, heightOffset: 2.6, radius: 5.6, speedBonus: 24, colorHex: 0x2df9f2 },
    ],
  },

  // LV 2: GLACIER SPIRE (~3,800m) — 6-Zone Counter-Clockwise Alpine Grand Circuit!
  // Features 56m vertical relief, shatterable Frost Crystals, Blue-Ice Slip-Glide Rinks,
  // Blizzard Crosswind Ridges, Frozen Fjord Lake, Cryo-Geyser Updrafts & Aurora Amphitheater.
  'glacier-spire': {
    id: 'glacier-spire',
    biome: 'glacier',
    name: 'Glacier Spire',
    subtitle: '6-zone alpine summit plunge, shatterable cryo-crystals, blue-ice rinks & aurora amphitheater',
    laps: 2,
    trackWidth: 42,
    skyTopColor: '#071b3d',
    skyHorizonColor: '#7be3f6',
    fogColor: '#78d2ea',
    terrainPrimary: '#86c2de',
    terrainAccent: '#3e6f99',
    controlPoints: [
      // Zone 1: Frostbound Launch Straight & Opening Glacier Arch Ascent
      { x: 0, y: 14, z: 0, bank: 0, width: 42 },
      { x: 0, y: 18, z: -225, bank: 0, width: 42 },
      { x: -95, y: 36, z: -425, bank: 0.22, width: 48 },
      // Zone 2: High Crystal Summit Spire (64m alpine peak!) & 58m Banked Blue-Ice Bowl
      { x: -295, y: 58, z: -545, bank: 0.30, width: 56 },
      { x: -505, y: 64, z: -485, bank: 0.32, width: 58 },
      // Zone 3: Blizzard Crosswind Ridge & 56m Vertical Cryo Plunge through Aurora Warp Tunnel #1
      { x: -650, y: 44, z: -330, bank: 0.22, width: 46 },
      { x: -685, y: 20, z: -130, bank: -0.14, width: 34 },
      { x: -630, y: 8, z: 85, bank: -0.18, width: 38 },
      // Zone 4: Expansive Mirrored Frozen Fjord Lake & 56m Iceberg Drift Rink
      { x: -545, y: 8, z: 285, bank: 0.16, width: 52 },
      { x: -400, y: 10, z: 455, bank: 0.24, width: 56 },
      { x: -215, y: 12, z: 545, bank: 0.18, width: 50 },
      // Zone 5: Technical Alpine Observatory S-Bends & Crosswind Ridge #2
      { x: -30, y: 24, z: 625, bank: -0.22, width: 34 },
      { x: 130, y: 36, z: 650, bank: -0.26, width: 32 },
      { x: 305, y: 38, z: 585, bank: 0.26, width: 30 },
      { x: 370, y: 28, z: 430, bank: 0.24, width: 42 },
      // Zone 6: 54m Aurora Borealis Amphitheater & Final Warp Sprint
      { x: 300, y: 22, z: 270, bank: 0.26, width: 54 },
      { x: 155, y: 18, z: 215, bank: 0.18, width: 46 },
      { x: 18, y: 15, z: 155, bank: 0.12, width: 42 },
    ],
    boostPads: [
      { id: 'gl-bp-1', t: 0.032, lateral: 0, width: 11.0, length: 20 },
      { id: 'gl-bp-2', t: 0.135, lateral: 7.0, width: 10.5, length: 20 },
      { id: 'gl-bp-3', t: 0.215, lateral: -13.0, width: 11.0, length: 20 },
      { id: 'gl-bp-4', t: 0.340, lateral: -5.5, width: 10.0, length: 20 },
      { id: 'gl-bp-5', t: 0.460, lateral: 6.0, width: 10.5, length: 20 },
      { id: 'gl-bp-6', t: 0.545, lateral: -11.0, width: 11.0, length: 20 },
      { id: 'gl-bp-7', t: 0.650, lateral: 0, width: 10.0, length: 20 },
      { id: 'gl-bp-8', t: 0.775, lateral: -4.5, width: 10.0, length: 20 },
      { id: 'gl-bp-9', t: 0.855, lateral: -12.0, width: 11.0, length: 20 },
      { id: 'gl-bp-10', t: 0.955, lateral: 0, width: 11.5, length: 22 },
    ],
    jumpRamps: [
      { id: 'gl-rmp-1', t: 0.088, lateral: -5.5, width: 13.5, length: 19, launchVel: 25.5, speedBoost: 16 },
      { id: 'gl-rmp-2', t: 0.425, lateral: 6.5, width: 13.0, length: 19, launchVel: 26.0, speedBoost: 17 },
      { id: 'gl-rmp-3', t: 0.585, lateral: 10.5, width: 14.0, length: 20, launchVel: 27.0, speedBoost: 18 },
      { id: 'gl-rmp-4', t: 0.872, lateral: 12.0, width: 14.0, length: 20, launchVel: 27.5, speedBoost: 18 },
    ],
    updrafts: [
      { id: 'gl-up-1', t: 0.235, lateral: 13.0, radius: 8.5, liftVel: 28.5, colorHex: 0x7efcf7 },
      { id: 'gl-up-2', t: 0.625, lateral: -9.5, radius: 8.2, liftVel: 28.0, colorHex: 0x38bdf8 },
      { id: 'gl-up-3', t: 0.805, lateral: 7.5, radius: 8.0, liftVel: 27.5, colorHex: 0x5eead4 },
    ],
    warpTunnels: [
      { id: 'gl-wt-1', tStart: 0.345, tEnd: 0.395, ringCount: 5, speedBonus: 26, colorHex: 0x38bdf8 },
      { id: 'gl-wt-2', tStart: 0.912, tEnd: 0.948, ringCount: 5, speedBonus: 27, colorHex: 0x5eead4 },
    ],
    rings: [
      { id: 'gl-r-1', t: 0.024, lateral: 0, heightOffset: 2.2, radius: 3.0, elevated: false },
      { id: 'gl-r-2', t: 0.062, lateral: -4.5, heightOffset: 2.2, radius: 3.0, elevated: false },
      { id: 'gl-r-3', t: 0.097, lateral: -5.5, heightOffset: 6.8, radius: 3.4, elevated: true },
      { id: 'gl-r-4', t: 0.148, lateral: 7.5, heightOffset: 2.2, radius: 3.0, elevated: false },
      { id: 'gl-r-5', t: 0.205, lateral: -13.0, heightOffset: 2.2, radius: 3.0, elevated: false },
      { id: 'gl-r-6', t: 0.244, lateral: 13.0, heightOffset: 8.2, radius: 3.5, elevated: true },
      { id: 'gl-r-7', t: 0.295, lateral: 4.0, heightOffset: 2.2, radius: 3.0, elevated: false },
      { id: 'gl-r-8', t: 0.370, lateral: 0, heightOffset: 2.4, radius: 3.1, elevated: false },
      { id: 'gl-r-9', t: 0.436, lateral: 6.5, heightOffset: 7.0, radius: 3.4, elevated: true },
      { id: 'gl-r-10', t: 0.530, lateral: -8.0, heightOffset: 2.2, radius: 3.0, elevated: false },
      { id: 'gl-r-11', t: 0.594, lateral: 10.5, heightOffset: 7.4, radius: 3.5, elevated: true },
      { id: 'gl-r-12', t: 0.635, lateral: -9.5, heightOffset: 8.2, radius: 3.5, elevated: true },
      { id: 'gl-r-13', t: 0.680, lateral: 0, heightOffset: 2.2, radius: 3.0, elevated: false },
      { id: 'gl-r-14', t: 0.768, lateral: -4.5, heightOffset: 2.2, radius: 3.0, elevated: false },
      { id: 'gl-r-15', t: 0.816, lateral: 7.5, heightOffset: 7.8, radius: 3.5, elevated: true },
      { id: 'gl-r-16', t: 0.881, lateral: 12.0, heightOffset: 7.4, radius: 3.5, elevated: true },
      { id: 'gl-r-17', t: 0.930, lateral: 0, heightOffset: 2.4, radius: 3.1, elevated: false },
      { id: 'gl-r-18', t: 0.982, lateral: 0, heightOffset: 2.2, radius: 3.0, elevated: false },
    ],
    hazards: [
      // Level 2 activates the first 3 EMP barriers (2 sweeping, 1 static) with clean telegraphing
      { id: 'gl-hz-1', t: 0.302, lateral: 0, width: 9.0, phaseOffset: 0.2, cycleDuration: 4.3, moveAmplitude: 8.0, moveSpeed: 1.15 },
      { id: 'gl-hz-2', t: 0.502, lateral: -5.5, width: 8.8, phaseOffset: 1.3, cycleDuration: 4.2 },
      { id: 'gl-hz-3', t: 0.720, lateral: 0, width: 9.0, phaseOffset: 2.1, cycleDuration: 4.1, moveAmplitude: 7.0, moveSpeed: 1.25 },
      { id: 'gl-hz-4', t: 0.822, lateral: -5.5, width: 8.8, phaseOffset: 0.8, cycleDuration: 4.2 },
    ],
    obstacles: [
      // 58m High Crystal Summit Bowl split by a gleaming Glacial Ice Spire (twin 23m+ lanes!)
      { id: 'gl-ob-1', kind: 'ice-spire', t: 0.222, lateral: 0, radius: 3.1, height: 14.0 },
      // Shatterable Cryo-Crystals: smash through with ZERO slowdown for +140 pts, +22% boost & surge!
      { id: 'gl-ob-2', kind: 'frost-crystal', t: 0.160, lateral: -6.5, radius: 2.4, height: 4.0, colorHex: 0x7efcf7 },
      { id: 'gl-ob-3', kind: 'frost-crystal', t: 0.315, lateral: 6.5, radius: 2.4, height: 4.0, colorHex: 0x38bdf8 },
      // Crystal Slalom sculpted Ice Spire on plunge exit
      { id: 'gl-ob-4', kind: 'ice-spire', t: 0.442, lateral: -6.5, radius: 2.8, height: 13.0 },
      // Frozen Fjord smashable Frost Crystals & patrolling Cryo-Drone
      { id: 'gl-ob-5', kind: 'frost-crystal', t: 0.482, lateral: 7.0, radius: 2.4, height: 4.0, colorHex: 0x7efcf7 },
      { id: 'gl-ob-6', kind: 'hover-drone', t: 0.562, lateral: 6.0, radius: 2.1, height: 3.0, moveAmplitude: 7.5, moveSpeed: 1.15, phaseOffset: 0.6 },
      { id: 'gl-ob-7', kind: 'frost-crystal', t: 0.608, lateral: -9.5, radius: 2.4, height: 4.0, colorHex: 0x5eead4 },
      // Observatory S-Bend patrolling Cryo-Drone (steerable or hop-overable)
      { id: 'gl-ob-8', kind: 'hover-drone', t: 0.752, lateral: 0, radius: 2.1, height: 3.0, moveAmplitude: 5.5, moveSpeed: 1.2, phaseOffset: 1.7 },
      // 54m Aurora Amphitheater central Glacial Ice Spire divider
      { id: 'gl-ob-9', kind: 'ice-spire', t: 0.858, lateral: 0.5, radius: 3.1, height: 14.0 },
      // Amphitheater exit smashable Frost Crystal
      { id: 'gl-ob-10', kind: 'frost-crystal', t: 0.896, lateral: -10.5, radius: 2.4, height: 4.0, colorHex: 0x7efcf7 },
    ],
    speedGates: [
      { id: 'gl-sg-1', t: 0.102, lateral: -5.5, heightOffset: 5.0, radius: 5.4, speedBonus: 22, colorHex: 0x67e8f9 },
      { id: 'gl-sg-2', t: 0.252, lateral: 12.5, heightOffset: 5.8, radius: 5.6, speedBonus: 23, colorHex: 0x5eead4 },
      { id: 'gl-sg-3', t: 0.599, lateral: 10.5, heightOffset: 5.2, radius: 5.6, speedBonus: 23, colorHex: 0x38bdf8 },
      { id: 'gl-sg-4', t: 0.886, lateral: 12.0, heightOffset: 5.4, radius: 5.6, speedBonus: 24, colorHex: 0x67e8f9 },
      { id: 'gl-sg-5', t: 0.972, lateral: 0, heightOffset: 2.6, radius: 5.6, speedBonus: 24, colorHex: 0x5eead4 },
    ],
    icePatches: [
      // Glacial Blue-Ice Slip-Glide Sheets: silky low-friction drift carving + +13..14 m/s speed surge!
      { id: 'gl-ice-1', tStart: 0.185, tEnd: 0.245, lateral: -12.0, width: 19.0, speedBonus: 13 },
      { id: 'gl-ice-2', tStart: 0.515, tEnd: 0.578, lateral: -5.0, width: 24.0, speedBonus: 14 },
      { id: 'gl-ice-3', tStart: 0.835, tEnd: 0.892, lateral: -11.0, width: 20.0, speedBonus: 13 },
    ],
    windZones: [
      // Exposed high-altitude Alpine Blizzard Crosswind Gust Corridors!
      { id: 'gl-wnd-1', tStart: 0.275, tEnd: 0.318, force: 16.5, colorHex: 0xe0f7ff },
      { id: 'gl-wnd-2', tStart: 0.688, tEnd: 0.732, force: -17.5, colorHex: 0xbaf2ff },
    ],
  },

  // LV 3: BIOLUME JUNGLE (~4,000m) — 6-Zone Serpentine Alien Canopy Grand Circuit!
  // Features 48m vertical canopy relief, Bouncy Giant Toadstool Spring-Pads, Floating Pollen Blooms,
  // Luminous Nectar Flow Streams, 60m Biolume Lagoon Plaza & Queen-Cap Amphitheater!
  'biolume-jungle': {
    id: 'biolume-jungle',
    biome: 'biolume',
    name: 'Biolume Jungle',
    subtitle: '6-zone mushroom canopy, bouncy toadstool spring-pads, pollen bursts & glowing nectar streams',
    laps: 2,
    trackWidth: 42,
    skyTopColor: '#051521',
    skyHorizonColor: '#1a756b',
    fogColor: '#145858',
    terrainPrimary: '#103c39',
    terrainAccent: '#2dd4bf',
    controlPoints: [
      // Zone 1: Emerald Launch Runway & Vine Arch Ascent
      { x: 0, y: 12, z: 0, bank: 0, width: 42 },
      { x: 0, y: 15, z: -225, bank: 0, width: 44 },
      { x: 115, y: 32, z: -435, bank: -0.22, width: 50 },
      // Zone 2: Towering Giant Mushroom Canopy Terrace (56m peak, 58m wide split bowl!)
      { x: 325, y: 52, z: -535, bank: -0.28, width: 58 },
      { x: 525, y: 56, z: -435, bank: -0.26, width: 54 },
      // Zone 3: Winding S-Curve Vine Gorge & Emerald Biolume Warp Tunnel #1
      { x: 615, y: 36, z: -245, bank: -0.18, width: 38 },
      { x: 505, y: 20, z: -70, bank: 0.24, width: 32 },
      { x: 620, y: 12, z: 120, bank: -0.24, width: 44 },
      // Zone 4: Expansive 60m Biolume Lagoon & Floating Lily-Pad Basin
      { x: 565, y: 8, z: 340, bank: -0.22, width: 60 },
      { x: 400, y: 10, z: 515, bank: -0.24, width: 56 },
      { x: 210, y: 18, z: 615, bank: -0.18, width: 46 },
      // Zone 5: Western Firefly Canopy Switchbacks & Vine Bridge (tightest w=30 Standard apex!)
      { x: 10, y: 32, z: 650, bank: 0.16, width: 34 },
      { x: -185, y: 42, z: 600, bank: -0.26, width: 32 },
      { x: -295, y: 34, z: 480, bank: -0.24, width: 30 },
      // Zone 6: 54m Queen-Cap Amphitheater & Firefly Finale Straight
      { x: -265, y: 24, z: 330, bank: -0.22, width: 54 },
      { x: -145, y: 18, z: 235, bank: -0.16, width: 48 },
      { x: -22, y: 13, z: 145, bank: -0.12, width: 42 },
    ],
    boostPads: [
      { id: 'bj-bp-1', t: 0.032, lateral: 0, width: 11.0, length: 20 },
      { id: 'bj-bp-2', t: 0.128, lateral: -7.0, width: 10.5, length: 20 },
      { id: 'bj-bp-3', t: 0.225, lateral: 13.0, width: 11.0, length: 20 },
      { id: 'bj-bp-4', t: 0.340, lateral: 5.5, width: 10.0, length: 20 },
      { id: 'bj-bp-5', t: 0.452, lateral: -5.5, width: 10.5, length: 20 },
      { id: 'bj-bp-6', t: 0.545, lateral: 12.5, width: 11.0, length: 20 },
      { id: 'bj-bp-7', t: 0.655, lateral: 0, width: 10.0, length: 20 },
      { id: 'bj-bp-8', t: 0.775, lateral: 4.5, width: 10.0, length: 20 },
      { id: 'bj-bp-9', t: 0.858, lateral: 11.5, width: 11.0, length: 20 },
      { id: 'bj-bp-10', t: 0.958, lateral: 0, width: 11.5, length: 22 },
    ],
    jumpRamps: [
      { id: 'bj-rmp-1', t: 0.088, lateral: 5.5, width: 13.5, length: 19, launchVel: 26.0, speedBoost: 17 },
      { id: 'bj-rmp-2', t: 0.488, lateral: -9.5, width: 13.5, length: 19, launchVel: 27.0, speedBoost: 18 },
      { id: 'bj-rmp-3', t: 0.798, lateral: 0, width: 13.0, length: 19, launchVel: 26.5, speedBoost: 17 },
      { id: 'bj-rmp-4', t: 0.888, lateral: -11.5, width: 14.0, length: 20, launchVel: 27.5, speedBoost: 18 },
    ],
    updrafts: [
      { id: 'bj-up-1', t: 0.240, lateral: -12.5, radius: 8.5, liftVel: 29.0, colorHex: 0x34d399 },
      { id: 'bj-up-2', t: 0.585, lateral: 13.0, radius: 8.6, liftVel: 30.0, colorHex: 0xe879f9 },
      { id: 'bj-up-3', t: 0.840, lateral: -10.0, radius: 8.2, liftVel: 28.5, colorHex: 0x2df9f2 },
    ],
    warpTunnels: [
      { id: 'bj-wt-1', tStart: 0.345, tEnd: 0.395, ringCount: 5, speedBonus: 28, colorHex: 0x34d399 },
      { id: 'bj-wt-2', tStart: 0.680, tEnd: 0.725, ringCount: 5, speedBonus: 27, colorHex: 0xe879f9 },
    ],
    rings: [
      { id: 'bj-r-1', t: 0.022, lateral: 0, heightOffset: 2.2, radius: 3.0, elevated: false },
      { id: 'bj-r-2', t: 0.060, lateral: 4.5, heightOffset: 2.2, radius: 3.0, elevated: false },
      { id: 'bj-r-3', t: 0.098, lateral: 5.5, heightOffset: 7.2, radius: 3.4, elevated: true },
      { id: 'bj-r-4', t: 0.160, lateral: -8.5, heightOffset: 2.2, radius: 3.0, elevated: false },
      { id: 'bj-r-5', t: 0.214, lateral: -12.5, heightOffset: 7.4, radius: 3.5, elevated: true },
      { id: 'bj-r-6', t: 0.252, lateral: -12.5, heightOffset: 8.6, radius: 3.5, elevated: true },
      { id: 'bj-r-7', t: 0.305, lateral: 4.0, heightOffset: 2.2, radius: 3.0, elevated: false },
      { id: 'bj-r-8', t: 0.370, lateral: 0, heightOffset: 2.4, radius: 3.1, elevated: false },
      { id: 'bj-r-9', t: 0.435, lateral: 6.5, heightOffset: 7.2, radius: 3.5, elevated: true },
      { id: 'bj-r-10', t: 0.500, lateral: -9.5, heightOffset: 7.8, radius: 3.5, elevated: true },
      { id: 'bj-r-11', t: 0.548, lateral: -12.0, heightOffset: 2.2, radius: 3.0, elevated: false },
      { id: 'bj-r-12', t: 0.598, lateral: 13.0, heightOffset: 8.8, radius: 3.5, elevated: true },
      { id: 'bj-r-13', t: 0.702, lateral: 0, heightOffset: 2.4, radius: 3.1, elevated: false },
      { id: 'bj-r-14', t: 0.762, lateral: -4.5, heightOffset: 2.2, radius: 3.0, elevated: false },
      { id: 'bj-r-15', t: 0.810, lateral: 0, heightOffset: 7.6, radius: 3.4, elevated: true },
      { id: 'bj-r-16', t: 0.854, lateral: -10.0, heightOffset: 8.2, radius: 3.5, elevated: true },
      { id: 'bj-r-17', t: 0.900, lateral: -11.5, heightOffset: 7.6, radius: 3.5, elevated: true },
      { id: 'bj-r-18', t: 0.978, lateral: 0, heightOffset: 2.2, radius: 3.0, elevated: false },
    ],
    hazards: [
      // Level 3 activates the first 3 EMP barriers with crisp Standard-tier telegraph timing
      { id: 'bj-hz-1', t: 0.285, lateral: 0, width: 9.2, phaseOffset: 0.3, cycleDuration: 4.1, moveAmplitude: 9.0, moveSpeed: 1.25 },
      { id: 'bj-hz-2', t: 0.520, lateral: 0, width: 9.6, phaseOffset: 1.4, cycleDuration: 4.0, moveAmplitude: 11.5, moveSpeed: 1.3 },
      { id: 'bj-hz-3', t: 0.742, lateral: -4.5, width: 8.8, phaseOffset: 2.2, cycleDuration: 4.0 },
      { id: 'bj-hz-4', t: 0.928, lateral: 0, width: 9.0, phaseOffset: 0.9, cycleDuration: 4.1, moveAmplitude: 8.0, moveSpeed: 1.2 },
    ],
    obstacles: [
      // 58m Mushroom Canopy Terrace split by a glowing Fungal Stalk Divider (twin 23m+ lanes!)
      { id: 'bj-ob-1', kind: 'spore-stalk', t: 0.212, lateral: 0, radius: 3.1, height: 14.5 },
      // Bouncy Giant Toadstool Spring-Pads: launch UFO skyward (+26 m/s vy, +160 pts, +24% boost!)
      { id: 'bj-ob-2', kind: 'spore-pad', t: 0.196, lateral: -12.5, radius: 3.2, height: 2.6, bounceForce: 26.5, colorHex: 0xf472b6 },
      { id: 'bj-ob-3', kind: 'spore-pad', t: 0.422, lateral: 6.5, radius: 3.2, height: 2.6, bounceForce: 26.5, colorHex: 0x34d399 },
      // Floating Biolume Pollen Blooms: burst cleanly with zero slowdown for +130 pts & +25% boost!
      { id: 'bj-ob-4', kind: 'pollen-orb', t: 0.152, lateral: 8.0, radius: 2.4, height: 4.2, colorHex: 0xfde047 },
      { id: 'bj-ob-5', kind: 'pollen-orb', t: 0.318, lateral: -6.5, radius: 2.4, height: 4.2, colorHex: 0xf472b6 },
      // 60m Biolume Lagoon Plaza split-stalk + Bouncy Toadstool + Pollen Bloom + Patrolling Spore-Drone!
      { id: 'bj-ob-6', kind: 'spore-stalk', t: 0.558, lateral: 0.5, radius: 3.2, height: 15.0 },
      { id: 'bj-ob-7', kind: 'spore-pad', t: 0.568, lateral: -13.0, radius: 3.3, height: 2.6, bounceForce: 27.5, colorHex: 0xe879f9 },
      { id: 'bj-ob-8', kind: 'pollen-orb', t: 0.625, lateral: -8.5, radius: 2.4, height: 4.2, colorHex: 0x34d399 },
      { id: 'bj-ob-9', kind: 'hover-drone', t: 0.760, lateral: 0, radius: 2.1, height: 3.0, moveAmplitude: 5.5, moveSpeed: 1.22, phaseOffset: 0.8 },
      // 54m Queen-Cap Amphitheater glowing fungal divider + Bouncy Toadstool + final Pollen Bloom!
      { id: 'bj-ob-10', kind: 'spore-stalk', t: 0.865, lateral: 0, radius: 3.1, height: 14.5 },
      { id: 'bj-ob-11', kind: 'spore-pad', t: 0.876, lateral: 11.5, radius: 3.2, height: 2.6, bounceForce: 27.0, colorHex: 0x34d399 },
      { id: 'bj-ob-12', kind: 'pollen-orb', t: 0.916, lateral: 9.0, radius: 2.4, height: 4.2, colorHex: 0xfde047 },
    ],
    speedGates: [
      { id: 'bj-sg-1', t: 0.105, lateral: 5.5, heightOffset: 5.2, radius: 5.4, speedBonus: 23, colorHex: 0x34d399 },
      { id: 'bj-sg-2', t: 0.218, lateral: -12.5, heightOffset: 6.2, radius: 5.8, speedBonus: 24, colorHex: 0xf472b6 },
      { id: 'bj-sg-3', t: 0.506, lateral: -9.5, heightOffset: 5.6, radius: 5.6, speedBonus: 24, colorHex: 0x2df9f2 },
      { id: 'bj-sg-4', t: 0.896, lateral: 11.5, heightOffset: 6.0, radius: 5.6, speedBonus: 25, colorHex: 0x34d399 },
      { id: 'bj-sg-5', t: 0.974, lateral: 0, heightOffset: 2.6, radius: 5.6, speedBonus: 25, colorHex: 0xf472b6 },
    ],
    nectarStreams: [
      // Luminous Biolume Nectar Flow Currents: continuous +26%/s plasma recharge + +11..12 m/s surge + gentle flow stabilization!
      { id: 'bj-nc-1', tStart: 0.175, tEnd: 0.242, lateral: 12.5, width: 16.0, speedBonus: 11, boostRegenPerSec: 26, colorHex: 0x34d399 },
      { id: 'bj-nc-2', tStart: 0.525, tEnd: 0.592, lateral: 12.0, width: 18.0, speedBonus: 12, boostRegenPerSec: 28, colorHex: 0xf472b6 },
      { id: 'bj-nc-3', tStart: 0.828, tEnd: 0.882, lateral: 11.5, width: 16.0, speedBonus: 12, boostRegenPerSec: 26, colorHex: 0x2df9f2 },
    ],
  },

  // LV 4: NEBULA RIDGE (~4,220m, Challenger) — MASSIVE 7-ZONE TRUE 3D FIGURE-8 COSMIC OVERPASS with 52m bridge clearance,
  // Zero-G Moon-Jump Sky Strips, Gravity Pulse Wells, Crackable Cosmic Star-Cores & Obsidian-Amethyst Meteor Spires!
  'nebula-ridge': {
    id: 'nebula-ridge',
    biome: 'nebula',
    name: 'Nebula Ridge',
    subtitle: 'True 3D Figure-8 cosmic overpass, Zero-G sky strips, Gravity Pulse Wells & Star-Cores',
    laps: 3,
    trackWidth: 38,
    hasOverpass: true,
    skyTopColor: '#0e1438',
    skyHorizonColor: '#d0769a',
    fogColor: '#8d5b86',
    terrainPrimary: '#5e3458',
    terrainAccent: '#392045',
    // Genuine 3D Figure-8 Crossing at (x=0, z=-220): lower launch underpass y=12m, soaring Skyway Overpass Bridge y=64m (52m clearance!)
    controlPoints: [
      { x: 0, y: 12, z: 80, bank: 0, width: 38 },          // P0: Starlight Launch Grid facing towering Overpass!
      { x: 0, y: 12, z: -220, bank: 0, width: 36 },        // P1: FIGURE-8 UNDERPASS (y=12m, 52m beneath P8!)
      { x: -70, y: 18, z: -480, bank: 0.16, width: 46 },   // P2: Deep Nebula Acceleration Chute
      { x: -280, y: 30, z: -640, bank: 0.28, width: 58 },  // P3: Zone 2 — Northwest Supernova Bowl (58m wide!)
      { x: -520, y: 46, z: -560, bank: 0.3, width: 54 },   // P4: Outer Nebula Rim Sweep
      { x: -620, y: 58, z: -340, bank: 0.24, width: 44 },  // P5: Star-Crown High Crest
      { x: -450, y: 63, z: -215, bank: 0.12, width: 36 },  // P6: Skyway Zero-G Approach
      { x: -230, y: 64, z: -220, bank: 0.04, width: 32 },  // P7: Zone 3 — Skyway Overpass Entry
      { x: 0, y: 64, z: -220, bank: 0, width: 30 },        // P8: FIGURE-8 OVERPASS BRIDGE (y=64m, 52m directly over P1!)
      { x: 235, y: 61, z: -225, bank: -0.06, width: 34 },  // P9: Overpass Exit Sky-Launch
      { x: 470, y: 46, z: -320, bank: -0.24, width: 48 },  // P10: Zone 4 — Eastern Asteroid Belt Plunge
      { x: 640, y: 28, z: -150, bank: -0.28, width: 52 },  // P11: Meteor Cascade Sweeper
      { x: 540, y: 18, z: 75, bank: 0.22, width: 34 },     // P12: Zone 5 — Asteroid Technical S-Chicane
      { x: 625, y: 14, z: 275, bank: -0.26, width: 46 },   // P13: Pulsar Canyon Switchback
      { x: 450, y: 9, z: 465, bank: -0.26, width: 60 },    // P14: Zone 6 — Southern Zero-G Gravity Well Arena (60m wide!)
      { x: 215, y: 8, z: 515, bank: -0.22, width: 56 },    // P15: Deep Gravity Basin Apex (lowest y=8m)
      { x: 35, y: 12, z: 410, bank: -0.14, width: 44 },    // P16: Wormhole Return Curve
      { x: -15, y: 12, z: 245, bank: -0.05, width: 38 },   // P17: Zone 7 — Wormhole Sprint Straight
      { x: 0, y: 12, z: 160, bank: 0, width: 38 },         // P18: Finish Line Alignment
    ],
    boostPads: [
      { id: 'nb-bp-1', t: 0.032, lateral: 0, width: 10.5, length: 20 },
      { id: 'nb-bp-2', t: 0.115, lateral: 5.5, width: 10, length: 19 },
      { id: 'nb-bp-3', t: 0.215, lateral: -9.0, width: 10.5, length: 20 },
      { id: 'nb-bp-4', t: 0.305, lateral: 7.0, width: 10, length: 19 },
      { id: 'nb-bp-5', t: 0.395, lateral: 0, width: 9.5, length: 19 },
      { id: 'nb-bp-6', t: 0.460, lateral: 0, width: 9.5, length: 22 }, // Center of 64m Figure-8 Overpass Bridge!
      { id: 'nb-bp-7', t: 0.560, lateral: -7.5, width: 10, length: 20 },
      { id: 'nb-bp-8', t: 0.655, lateral: 8.5, width: 10, length: 20 },
      { id: 'nb-bp-9', t: 0.748, lateral: -5.5, width: 9.5, length: 19 },
      { id: 'nb-bp-10', t: 0.845, lateral: 9.0, width: 10.5, length: 20 },
      { id: 'nb-bp-11', t: 0.945, lateral: 0, width: 10.5, length: 22 },
    ],
    jumpRamps: [
      { id: 'nb-rmp-1', t: 0.088, lateral: -5.5, width: 12.5, length: 18, launchVel: 25.5, speedBoost: 18 },
      { id: 'nb-rmp-2', t: 0.348, lateral: -4.5, width: 12.0, length: 18, launchVel: 25.0, speedBoost: 17 },
      { id: 'nb-rmp-3', t: 0.525, lateral: 4.5, width: 12.5, length: 18, launchVel: 26.5, speedBoost: 19 },
      { id: 'nb-rmp-4', t: 0.805, lateral: -8.0, width: 13.0, length: 18, launchVel: 26.0, speedBoost: 18 },
    ],
    updrafts: [
      { id: 'nb-up-1', t: 0.255, lateral: 10.5, radius: 8.5, liftVel: 28.5, colorHex: 0xc084fc },
      { id: 'nb-up-2', t: 0.618, lateral: -10.5, radius: 8.5, liftVel: 29.0, colorHex: 0x38bdf8 },
      { id: 'nb-up-3', t: 0.885, lateral: 8.5, radius: 8.5, liftVel: 28.5, colorHex: 0xf472b6 },
    ],
    warpTunnels: [
      { id: 'nb-wt-1', tStart: 0.435, tEnd: 0.490, ringCount: 6, speedBonus: 32, colorHex: 0xe879f9 }, // 64m Skyway Overpass Warp Tunnel!
      { id: 'nb-wt-2', tStart: 0.915, tEnd: 0.965, ringCount: 5, speedBonus: 30, colorHex: 0x38bdf8 }, // Wormhole Sprint Home!
    ],
    lowGravityZones: [
      { id: 'nb-zg-1', tStart: 0.080, tEnd: 0.145, lateral: -4.5, width: 18, gravityScale: 0.46, speedBonus: 10, colorHex: 0xa855f7 },
      { id: 'nb-zg-2', tStart: 0.338, tEnd: 0.415, lateral: 0, width: 18, gravityScale: 0.46, speedBonus: 11, colorHex: 0xe879f9 },
      { id: 'nb-zg-3', tStart: 0.795, tEnd: 0.875, lateral: -3.0, width: 22, gravityScale: 0.45, speedBonus: 11, colorHex: 0x818cf8 },
    ],
    speedGates: [
      { id: 'nb-sg-1', t: 0.068, lateral: 0, heightOffset: 3.6, radius: 5.8, speedBonus: 19, colorHex: 0x38bdf8 },
      { id: 'nb-sg-2', t: 0.275, lateral: -6.0, heightOffset: 3.6, radius: 5.8, speedBonus: 20, colorHex: 0xe879f9 },
      { id: 'nb-sg-3', t: 0.482, lateral: 0, heightOffset: 3.8, radius: 5.8, speedBonus: 22, colorHex: 0xf472b6 },
      { id: 'nb-sg-4', t: 0.695, lateral: 4.5, heightOffset: 3.6, radius: 5.8, speedBonus: 20, colorHex: 0x38bdf8 },
      { id: 'nb-sg-5', t: 0.905, lateral: 0, heightOffset: 3.6, radius: 6.0, speedBonus: 21, colorHex: 0xc084fc },
    ],
    obstacles: [
      // 3 Obsidian-Amethyst Meteor Split-Spires placed ONLY in wide 52m..60m cosmic arenas (>=18m clearance both sides!)
      { id: 'nb-ms-1', kind: 'meteor-spire', t: 0.185, lateral: 2.0, radius: 2.7, height: 15.0, colorHex: 0xa855f7 },
      { id: 'nb-ms-2', kind: 'meteor-spire', t: 0.590, lateral: -2.0, radius: 2.7, height: 15.0, colorHex: 0xc084fc },
      { id: 'nb-ms-3', kind: 'meteor-spire', t: 0.828, lateral: 3.0, radius: 2.8, height: 15.5, colorHex: 0xe879f9 },
      // 3 Gravity Pulse Wells — orbital slingshot vortices that whip UFOs forward (+14 m/s, +26% boost, +175 PTS)!
      { id: 'nb-gw-1', kind: 'gravity-well', t: 0.235, lateral: 7.0, radius: 3.0, height: 4.8, bounceForce: 15, colorHex: 0xf59e0b },
      { id: 'nb-gw-2', kind: 'gravity-well', t: 0.638, lateral: -6.5, radius: 3.0, height: 4.8, bounceForce: 15, colorHex: 0xe879f9 },
      { id: 'nb-gw-3', kind: 'gravity-well', t: 0.865, lateral: -8.0, radius: 3.1, height: 4.8, bounceForce: 16, colorHex: 0x38bdf8 },
      // 4 Crackable Cosmic Star-Cores — supernova plasma geodes (+150 PTS, +28% boost, zero slowdown, respawn each lap!)
      { id: 'nb-sc-1', kind: 'star-core', t: 0.155, lateral: -8.5, radius: 2.3, height: 4.6, colorHex: 0xfbbf24 },
      { id: 'nb-sc-2', kind: 'star-core', t: 0.375, lateral: 6.5, radius: 2.3, height: 4.6, colorHex: 0xf472b6 },
      { id: 'nb-sc-3', kind: 'star-core', t: 0.542, lateral: -7.5, radius: 2.3, height: 4.6, colorHex: 0xfbbf24 },
      { id: 'nb-sc-4', kind: 'star-core', t: 0.775, lateral: 7.5, radius: 2.3, height: 4.6, colorHex: 0x38bdf8 },
      // 2 Patrolling Deep-Space Security Drones — crisp Challenger-tier lane timing
      { id: 'nb-hd-1', kind: 'hover-drone', t: 0.328, lateral: 0, radius: 2.0, height: 3.4, moveAmplitude: 10.5, moveSpeed: 1.55, phaseOffset: 0.5, colorHex: 0xf43f5e },
      { id: 'nb-hd-2', kind: 'hover-drone', t: 0.722, lateral: 0, radius: 2.0, height: 3.4, moveAmplitude: 9.0, moveSpeed: 1.65, phaseOffset: 2.1, colorHex: 0xf43f5e },
    ],
    rings: [
      { id: 'nb-r-1', t: 0.020, lateral: 0, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'nb-r-2', t: 0.055, lateral: 3.5, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'nb-r-3', t: 0.104, lateral: -5.5, heightOffset: 8.6, radius: 3.6, elevated: true }, // Zero-G Moon Jump #1!
      { id: 'nb-r-4', t: 0.135, lateral: -3.5, heightOffset: 5.5, radius: 3.3, elevated: true },
      { id: 'nb-r-5', t: 0.200, lateral: -10.5, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'nb-r-6', t: 0.268, lateral: 10.5, heightOffset: 9.0, radius: 3.6, elevated: true }, // Updraft #1 sky ring
      { id: 'nb-r-7', t: 0.315, lateral: 6.5, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'nb-r-8', t: 0.365, lateral: -4.5, heightOffset: 9.2, radius: 3.6, elevated: true }, // Zero-G Star-Crown Jump #2!
      { id: 'nb-r-9', t: 0.455, lateral: 0, heightOffset: 2.8, radius: 3.3, elevated: false }, // Dead center of 64m Overpass!
      { id: 'nb-r-10', t: 0.505, lateral: 2.0, heightOffset: 2.4, radius: 3.0, elevated: false },
      { id: 'nb-r-11', t: 0.542, lateral: 4.5, heightOffset: 8.4, radius: 3.5, elevated: true }, // Overpass plunge jump!
      { id: 'nb-r-12', t: 0.605, lateral: 8.5, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'nb-r-13', t: 0.630, lateral: -10.5, heightOffset: 9.0, radius: 3.6, elevated: true }, // Updraft #2 sky ring
      { id: 'nb-r-14', t: 0.710, lateral: -5.0, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'nb-r-15', t: 0.760, lateral: 5.5, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'nb-r-16', t: 0.822, lateral: -8.0, heightOffset: 9.2, radius: 3.6, elevated: true }, // Zero-G Arena Jump #4!
      { id: 'nb-r-17', t: 0.896, lateral: 8.5, heightOffset: 8.8, radius: 3.6, elevated: true }, // Updraft #3 sky ring
      { id: 'nb-r-18', t: 0.955, lateral: 0, heightOffset: 2.4, radius: 3.1, elevated: false }, // Wormhole Finish!
    ],
    hazards: [
      { id: 'nb-hz-1', t: 0.170, lateral: 0, width: 9.0, phaseOffset: 0.3, cycleDuration: 4.0, moveAmplitude: 10.0, moveSpeed: 1.35 },
      { id: 'nb-hz-2', t: 0.422, lateral: 4.5, width: 8.5, phaseOffset: 1.4, cycleDuration: 3.9 },
      { id: 'nb-hz-3', t: 0.675, lateral: 0, width: 9.2, phaseOffset: 2.2, cycleDuration: 3.9, moveAmplitude: 11.0, moveSpeed: 1.45 },
      { id: 'nb-hz-4', t: 0.892, lateral: -5.5, width: 8.8, phaseOffset: 0.8, cycleDuration: 3.9 },
    ],
  },

  // LV 5: OBSIDIAN CALDERA (~2,400m) — Massive molten crater rim, erupting thermal geysers & lava canyon bridge
  'obsidian-caldera': {
    id: 'obsidian-caldera',
    biome: 'volcano',
    name: 'Obsidian Caldera',
    subtitle: 'Colossal volcanic crater rims, thermal magma geysers & glowing lava chasms',
    laps: 3,
    trackWidth: 38,
    skyTopColor: '#1e0e24',
    skyHorizonColor: '#e86a38',
    fogColor: '#cf5e34',
    terrainPrimary: '#36232a',
    terrainAccent: '#d9481e',
    controlPoints: [
      { x: 0, y: 14, z: 0, bank: 0, width: 38 },
      { x: 0, y: 16, z: -205, bank: 0, width: 40 },
      { x: 145, y: 34, z: -400, bank: -0.26, width: 52 }, // Volcanic North Rim
      { x: 365, y: 46, z: -380, bank: -0.3, width: 58 }, // Giant Molten Crater Bowl
      { x: 495, y: 30, z: -200, bank: -0.22, width: 40 },
      { x: 375, y: 12, z: -45, bank: 0.24, width: 29 }, // Narrow Obsidian Lava Bridge
      { x: 255, y: 14, z: 75, bank: 0.22, width: 34 },
      { x: 405, y: 26, z: 220, bank: -0.28, width: 54 }, // Southern Magma Cauldron
      { x: 300, y: 40, z: 395, bank: -0.26, width: 52 },
      { x: 110, y: 30, z: 410, bank: -0.2, width: 44 },
      { x: -35, y: 20, z: 270, bank: -0.14, width: 38 },
      { x: -20, y: 15, z: 130, bank: -0.08, width: 38 },
    ],
    boostPads: [
      { id: 'oc-bp-1', t: 0.05, lateral: 0, width: 10.5, length: 20 },
      { id: 'oc-bp-2', t: 0.17, lateral: -7.0, width: 10, length: 19 },
      { id: 'oc-bp-3', t: 0.30, lateral: 7.5, width: 10.5, length: 20 },
      { id: 'oc-bp-4', t: 0.45, lateral: 0, width: 9.0, length: 19 },
      { id: 'oc-bp-5', t: 0.61, lateral: -8.0, width: 10.5, length: 20 },
      { id: 'oc-bp-6', t: 0.77, lateral: 6.5, width: 10, length: 20 },
      { id: 'oc-bp-7', t: 0.91, lateral: 0, width: 10.5, length: 20 },
    ],
    jumpRamps: [
      { id: 'oc-rmp-1', t: 0.11, lateral: 6.0, width: 12.5, length: 18, launchVel: 26.5, speedBoost: 18 },
      { id: 'oc-rmp-2', t: 0.38, lateral: 0, width: 13, length: 18, launchVel: 27.5, speedBoost: 19 },
      { id: 'oc-rmp-3', t: 0.68, lateral: 7.5, width: 13.5, length: 19, launchVel: 28.0, speedBoost: 19 },
      { id: 'oc-rmp-4', t: 0.85, lateral: -5.0, width: 12.5, length: 18, launchVel: 26.5, speedBoost: 18 },
    ],
    updrafts: [
      { id: 'oc-up-1', t: 0.24, lateral: -10.0, radius: 8.5, liftVel: 30.0, colorHex: 0xff6b2b },
      { id: 'oc-up-2', t: 0.56, lateral: 9.0, radius: 8.5, liftVel: 30.0, colorHex: 0xffb703 },
      { id: 'oc-up-3', t: 0.79, lateral: -8.5, radius: 8.0, liftVel: 29.0, colorHex: 0xff6b2b },
    ],
    warpTunnels: [
      { id: 'oc-wt-1', tStart: 0.43, tEnd: 0.49, ringCount: 4, speedBonus: 30, colorHex: 0xff8a3d },
      { id: 'oc-wt-2', tStart: 0.89, tEnd: 0.95, ringCount: 4, speedBonus: 30, colorHex: 0xffd166 },
    ],
    rings: [
      { id: 'oc-r-1', t: 0.03, lateral: 0, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'oc-r-2', t: 0.132, lateral: 6.0, heightOffset: 7.6, radius: 3.4, elevated: true },
      { id: 'oc-r-3', t: 0.20, lateral: -7.5, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'oc-r-4', t: 0.264, lateral: -10.0, heightOffset: 8.8, radius: 3.5, elevated: true },
      { id: 'oc-r-5', t: 0.33, lateral: 7.0, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'oc-r-6', t: 0.402, lateral: 0, heightOffset: 8.0, radius: 3.5, elevated: true },
      { id: 'oc-r-7', t: 0.46, lateral: 0, heightOffset: 2.4, radius: 3.1, elevated: false },
      { id: 'oc-r-8', t: 0.584, lateral: 9.0, heightOffset: 8.8, radius: 3.5, elevated: true },
      { id: 'oc-r-9', t: 0.64, lateral: -7.5, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'oc-r-10', t: 0.704, lateral: 7.5, heightOffset: 8.2, radius: 3.5, elevated: true },
      { id: 'oc-r-11', t: 0.814, lateral: -8.5, heightOffset: 8.5, radius: 3.5, elevated: true },
      { id: 'oc-r-12', t: 0.872, lateral: -5.0, heightOffset: 7.6, radius: 3.4, elevated: true },
      { id: 'oc-r-13', t: 0.93, lateral: 0, heightOffset: 2.4, radius: 3.1, elevated: false },
    ],
    hazards: [
      { id: 'oc-hz-1', t: 0.21, lateral: 0, width: 9.5, phaseOffset: 0.0, cycleDuration: 4.0, moveAmplitude: 12.5, moveSpeed: 1.45 },
      { id: 'oc-hz-2', t: 0.51, lateral: 0, width: 9.0, phaseOffset: 1.1, cycleDuration: 3.9, moveAmplitude: 8.5, moveSpeed: 1.35 },
      { id: 'oc-hz-3', t: 0.65, lateral: 0, width: 9.6, phaseOffset: 2.0, cycleDuration: 3.9, moveAmplitude: 13.0, moveSpeed: 1.5 },
      { id: 'oc-hz-4', t: 0.82, lateral: -5.0, width: 9.2, phaseOffset: 0.7, cycleDuration: 3.8, moveAmplitude: 9.5, moveSpeed: 1.4 },
    ],
  },

  // LV 6: NEON MEGACITY (~2,550m) — NEW CREATIVE SCI-FI SKYLINE BIOME with skyscrapers, holo-billboards & Figure-8 Skyline Overpass!
  'neon-megacity': {
    id: 'neon-megacity',
    biome: 'cybercity',
    name: 'Neon Megacity',
    subtitle: 'Elevated skyline expressway, glowing skyscrapers, Figure-8 bridge & turbo tunnels',
    laps: 3,
    trackWidth: 38,
    hasOverpass: true,
    skyTopColor: '#0b102c',
    skyHorizonColor: '#58296b',
    fogColor: '#371d54',
    terrainPrimary: '#161b33',
    terrainAccent: '#ec4899',
    // Grand Figure-8 Downtown Skyline Highway crossing cleanly at (x=0, z=-210): lower y=16, upper y=56 (40m clearance!)
    controlPoints: [
      { x: 0, y: 16, z: 75, bank: 0, width: 38 },
      { x: 0, y: 16, z: -210, bank: 0, width: 38 }, // DOWNTOWN UNDERPASS (y=16)
      { x: 135, y: 24, z: -410, bank: -0.22, width: 48 },
      { x: 350, y: 38, z: -440, bank: -0.28, width: 56 }, // East Tower Hyper-Turn
      { x: 445, y: 52, z: -265, bank: -0.24, width: 48 },
      { x: 270, y: 56, z: -200, bank: -0.06, width: 34 }, // Skyline Express Approach
      { x: 0, y: 56, z: -210, bank: 0, width: 34 }, // SKYLINE OVERPASS BRIDGE (y=56!)
      { x: -265, y: 52, z: -215, bank: 0.08, width: 36 },
      { x: -435, y: 38, z: -95, bank: 0.26, width: 54 }, // West Holo-Plaza
      { x: -380, y: 24, z: 145, bank: 0.24, width: 50 },
      { x: -195, y: 18, z: 265, bank: 0.18, width: 44 },
      { x: -20, y: 16, z: 215, bank: 0.1, width: 38 },
    ],
    boostPads: [
      { id: 'nm-bp-1', t: 0.045, lateral: 0, width: 10.5, length: 20 },
      { id: 'nm-bp-2', t: 0.16, lateral: -7.5, width: 10, length: 20 },
      { id: 'nm-bp-3', t: 0.30, lateral: 6.5, width: 10, length: 20 },
      { id: 'nm-bp-4', t: 0.49, lateral: 0, width: 10, length: 21 }, // Skyline Overpass
      { id: 'nm-bp-5', t: 0.63, lateral: 8.0, width: 10.5, length: 20 },
      { id: 'nm-bp-6', t: 0.77, lateral: -7.0, width: 10, length: 20 },
      { id: 'nm-bp-7', t: 0.91, lateral: 0, width: 10.5, length: 20 },
    ],
    jumpRamps: [
      { id: 'nm-rmp-1', t: 0.12, lateral: 5.5, width: 12.5, length: 18, launchVel: 27.0, speedBoost: 19 },
      { id: 'nm-rmp-2', t: 0.37, lateral: -6.0, width: 12.5, length: 18, launchVel: 27.5, speedBoost: 19 },
      { id: 'nm-rmp-3', t: 0.69, lateral: 6.0, width: 13.5, length: 19, launchVel: 28.5, speedBoost: 20 },
      { id: 'nm-rmp-4', t: 0.85, lateral: 0, width: 13, length: 18, launchVel: 27.0, speedBoost: 19 },
    ],
    updrafts: [
      { id: 'nm-up-1', t: 0.24, lateral: 9.5, radius: 8.5, liftVel: 30.0, colorHex: 0x2df9f2 },
      { id: 'nm-up-2', t: 0.60, lateral: -9.5, radius: 8.5, liftVel: 30.5, colorHex: 0xf472b6 },
      { id: 'nm-up-3', t: 0.80, lateral: 8.0, radius: 8.2, liftVel: 29.5, colorHex: 0x2df9f2 },
    ],
    warpTunnels: [
      { id: 'nm-wt-1', tStart: 0.45, tEnd: 0.53, ringCount: 5, speedBonus: 32, colorHex: 0x2df9f2 }, // Overpass Cyber Warp Tunnel!
      { id: 'nm-wt-2', tStart: 0.89, tEnd: 0.95, ringCount: 4, speedBonus: 30, colorHex: 0xf472b6 },
    ],
    rings: [
      { id: 'nm-r-1', t: 0.03, lateral: 0, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'nm-r-2', t: 0.142, lateral: 5.5, heightOffset: 7.8, radius: 3.5, elevated: true },
      { id: 'nm-r-3', t: 0.20, lateral: -7.0, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'nm-r-4', t: 0.264, lateral: 9.5, heightOffset: 8.8, radius: 3.5, elevated: true },
      { id: 'nm-r-5', t: 0.392, lateral: -6.0, heightOffset: 8.0, radius: 3.5, elevated: true },
      { id: 'nm-r-6', t: 0.485, lateral: 0, heightOffset: 2.6, radius: 3.2, elevated: false },
      { id: 'nm-r-7', t: 0.56, lateral: 4.5, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'nm-r-8', t: 0.624, lateral: -9.5, heightOffset: 9.0, radius: 3.5, elevated: true },
      { id: 'nm-r-9', t: 0.714, lateral: 6.0, heightOffset: 8.4, radius: 3.5, elevated: true },
      { id: 'nm-r-10', t: 0.824, lateral: 8.0, heightOffset: 8.6, radius: 3.5, elevated: true },
      { id: 'nm-r-11', t: 0.872, lateral: 0, heightOffset: 7.8, radius: 3.5, elevated: true },
      { id: 'nm-r-12', t: 0.93, lateral: 0, heightOffset: 2.4, radius: 3.1, elevated: false },
    ],
    hazards: [
      { id: 'nm-hz-1', t: 0.21, lateral: 0, width: 9.5, phaseOffset: 0.1, cycleDuration: 3.9, moveAmplitude: 13.0, moveSpeed: 1.5 },
      { id: 'nm-hz-2', t: 0.42, lateral: 0, width: 9.0, phaseOffset: 1.0, cycleDuration: 3.8, moveAmplitude: 9.5, moveSpeed: 1.45 },
      { id: 'nm-hz-3', t: 0.66, lateral: 0, width: 9.8, phaseOffset: 1.9, cycleDuration: 3.8, moveAmplitude: 13.5, moveSpeed: 1.55 },
      { id: 'nm-hz-4', t: 0.81, lateral: 0, width: 9.2, phaseOffset: 0.7, cycleDuration: 3.8, moveAmplitude: 10.5, moveSpeed: 1.45 },
    ],
  },

  // LV 7: AETHER RINGWAY (~2,600m) — Grand sunlit cloud-sea citadel, giant 58m sky-plazas, astrolabe ring gates & aerial chains
  'aether-ringway': {
    id: 'aether-ringway',
    biome: 'aether',
    name: 'Aether Ringway',
    subtitle: 'Sunlit sky-citadel cloud sea, 58m mega-plazas, orbital rings & sky-chain jumps',
    laps: 3,
    trackWidth: 40,
    skyTopColor: '#123978',
    skyHorizonColor: '#f7d89c',
    fogColor: '#dfcaab',
    terrainPrimary: '#6d8bb5',
    terrainAccent: '#d9b56c',
    controlPoints: [
      { x: 0, y: 22, z: 0, bank: 0, width: 40 },
      { x: 0, y: 26, z: -220, bank: 0, width: 44 },
      { x: 140, y: 44, z: -430, bank: -0.24, width: 58 }, // North Cloud-Sea Sky Plaza
      { x: 375, y: 56, z: -440, bank: -0.28, width: 56 }, // Orbital Summit
      { x: 525, y: 38, z: -250, bank: -0.2, width: 38 },
      { x: 400, y: 20, z: -50, bank: 0.24, width: 32 }, // Golden Sky Ribbon
      { x: 225, y: 24, z: 65, bank: 0.18, width: 44 },
      { x: 350, y: 38, z: 245, bank: -0.26, width: 58 }, // South Citadel Mega-Plaza
      { x: 205, y: 46, z: 425, bank: -0.24, width: 52 },
      { x: 10, y: 38, z: 400, bank: -0.18, width: 46 },
      { x: -120, y: 28, z: 255, bank: -0.16, width: 42 },
      { x: -55, y: 23, z: 120, bank: -0.08, width: 40 },
    ],
    boostPads: [
      { id: 'ae-bp-1', t: 0.045, lateral: 0, width: 11, length: 21 },
      { id: 'ae-bp-2', t: 0.16, lateral: -9.5, width: 10.5, length: 20 },
      { id: 'ae-bp-3', t: 0.29, lateral: 8.0, width: 10.5, length: 20 },
      { id: 'ae-bp-4', t: 0.44, lateral: 0, width: 9.5, length: 20 },
      { id: 'ae-bp-5', t: 0.59, lateral: -9.5, width: 11, length: 21 },
      { id: 'ae-bp-6', t: 0.74, lateral: 7.5, width: 10.5, length: 20 },
      { id: 'ae-bp-7', t: 0.89, lateral: 0, width: 11, length: 21 },
    ],
    jumpRamps: [
      { id: 'ae-rmp-1', t: 0.10, lateral: 0, width: 14, length: 19, launchVel: 28.5, speedBoost: 20 },
      { id: 'ae-rmp-2', t: 0.24, lateral: 9.0, width: 14, length: 19, launchVel: 29.0, speedBoost: 20 },
      { id: 'ae-rmp-3', t: 0.54, lateral: -6.5, width: 13.5, length: 18, launchVel: 27.5, speedBoost: 19 },
      { id: 'ae-rmp-4', t: 0.70, lateral: 8.5, width: 14.5, length: 19, launchVel: 29.5, speedBoost: 21 },
      { id: 'ae-rmp-5', t: 0.84, lateral: -6.0, width: 13.5, length: 18, launchVel: 28.0, speedBoost: 19 },
    ],
    updrafts: [
      { id: 'ae-up-1', t: 0.19, lateral: -11.0, radius: 9.0, liftVel: 31.5, colorHex: 0xfde047 },
      { id: 'ae-up-2', t: 0.63, lateral: 11.0, radius: 9.0, liftVel: 31.5, colorHex: 0x38bdf8 },
      { id: 'ae-up-3', t: 0.80, lateral: -9.0, radius: 8.5, liftVel: 30.5, colorHex: 0xfde047 },
    ],
    warpTunnels: [
      { id: 'ae-wt-1', tStart: 0.36, tEnd: 0.43, ringCount: 5, speedBonus: 32, colorHex: 0xfde047 },
      { id: 'ae-wt-2', tStart: 0.90, tEnd: 0.96, ringCount: 5, speedBonus: 32, colorHex: 0x38bdf8 },
    ],
    rings: [
      { id: 'ae-r-1', t: 0.03, lateral: 0, heightOffset: 2.3, radius: 3.0, elevated: false },
      { id: 'ae-r-2', t: 0.122, lateral: 0, heightOffset: 8.2, radius: 3.5, elevated: true },
      { id: 'ae-r-3', t: 0.214, lateral: -11.0, heightOffset: 9.2, radius: 3.6, elevated: true },
      { id: 'ae-r-4', t: 0.264, lateral: 9.0, heightOffset: 8.4, radius: 3.5, elevated: true },
      { id: 'ae-r-5', t: 0.39, lateral: 0, heightOffset: 2.5, radius: 3.2, elevated: false },
      { id: 'ae-r-6', t: 0.48, lateral: -4.0, heightOffset: 2.3, radius: 3.0, elevated: false },
      { id: 'ae-r-7', t: 0.562, lateral: -6.5, heightOffset: 8.0, radius: 3.5, elevated: true },
      { id: 'ae-r-8', t: 0.654, lateral: 11.0, heightOffset: 9.2, radius: 3.6, elevated: true },
      { id: 'ae-r-9', t: 0.724, lateral: 8.5, heightOffset: 8.6, radius: 3.6, elevated: true },
      { id: 'ae-r-10', t: 0.824, lateral: -9.0, heightOffset: 8.8, radius: 3.5, elevated: true },
      { id: 'ae-r-11', t: 0.862, lateral: -6.0, heightOffset: 8.0, radius: 3.5, elevated: true },
      { id: 'ae-r-12', t: 0.93, lateral: 0, heightOffset: 2.5, radius: 3.2, elevated: false },
    ],
    hazards: [
      { id: 'ae-hz-1', t: 0.20, lateral: 0, width: 9.8, phaseOffset: 0.0, cycleDuration: 3.9, moveAmplitude: 14.5, moveSpeed: 1.55 },
      { id: 'ae-hz-2', t: 0.45, lateral: 0, width: 9.0, phaseOffset: 1.0, cycleDuration: 3.8, moveAmplitude: 9.0, moveSpeed: 1.45 },
      { id: 'ae-hz-3', t: 0.66, lateral: 0, width: 10.0, phaseOffset: 1.9, cycleDuration: 3.8, moveAmplitude: 15.0, moveSpeed: 1.6 },
      { id: 'ae-hz-4', t: 0.81, lateral: 0, width: 9.4, phaseOffset: 0.6, cycleDuration: 3.7, moveAmplitude: 11.0, moveSpeed: 1.5 },
    ],
  },

  // LV 8: QUANTUM PRISM (~2,750m) — NEW MASTER FINALE! Massive prismatic figure-8 rollercoaster with floating crystal octahedrons, 3 warp tunnels & mega-updrafts!
  'quantum-prism': {
    id: 'quantum-prism',
    biome: 'quantum',
    name: 'Quantum Prism',
    subtitle: 'Epic prismatic dimension, colossal Figure-8 spiral, triple warp tunnels & zero-G lifts',
    laps: 4,
    trackWidth: 40,
    hasOverpass: true,
    skyTopColor: '#12082e',
    skyHorizonColor: '#a855f7',
    fogColor: '#4c1d95',
    terrainPrimary: '#1e1040',
    terrainAccent: '#fbbf24',
    // Monumental 14-point Figure-8 rollercoaster crossing at (x=0, z=-225): lower y=16, upper sky-bridge y=58 (42m clearance!)
    controlPoints: [
      { x: 0, y: 16, z: 85, bank: 0, width: 40 },
      { x: 0, y: 16, z: -225, bank: 0, width: 40 }, // QUANTUM UNDERPASS (y=16)
      { x: -145, y: 28, z: -445, bank: 0.26, width: 52 },
      { x: -375, y: 46, z: -485, bank: 0.3, width: 58 }, // North-West Prism Bowl
      { x: -495, y: 60, z: -305, bank: 0.26, width: 50 }, // High Cosmic Apex
      { x: -305, y: 58, z: -215, bank: 0.08, width: 36 },
      { x: 0, y: 58, z: -225, bank: 0, width: 34 }, // PRISMATIC OVERPASS BRIDGE (y=58, 42m high!)
      { x: 295, y: 56, z: -235, bank: -0.1, width: 36 },
      { x: 485, y: 42, z: -115, bank: -0.28, width: 58 }, // East Quantum Amphitheater
      { x: 445, y: 24, z: 135, bank: -0.26, width: 52 },
      { x: 265, y: 34, z: 325, bank: -0.22, width: 48 }, // Roller-coaster crest
      { x: 80, y: 24, z: 390, bank: -0.18, width: 46 },
      { x: -115, y: 18, z: 300, bank: -0.14, width: 42 },
      { x: -45, y: 16, z: 195, bank: -0.06, width: 40 },
    ],
    boostPads: [
      { id: 'qm-bp-1', t: 0.04, lateral: 0, width: 11, length: 22 },
      { id: 'qm-bp-2', t: 0.14, lateral: 8.5, width: 10.5, length: 20 },
      { id: 'qm-bp-3', t: 0.26, lateral: -7.5, width: 10.5, length: 20 },
      { id: 'qm-bp-4', t: 0.44, lateral: 0, width: 10, length: 22 }, // Overpass launch
      { id: 'qm-bp-5', t: 0.58, lateral: -9.0, width: 11, length: 21 },
      { id: 'qm-bp-6', t: 0.71, lateral: 8.0, width: 10.5, length: 20 },
      { id: 'qm-bp-7', t: 0.83, lateral: -6.5, width: 10.5, length: 20 },
      { id: 'qm-bp-8', t: 0.93, lateral: 0, width: 11, length: 22 },
    ],
    jumpRamps: [
      { id: 'qm-rmp-1', t: 0.10, lateral: -6.0, width: 13.5, length: 19, launchVel: 28.5, speedBoost: 20 },
      { id: 'qm-rmp-2', t: 0.32, lateral: 6.5, width: 13.5, length: 19, launchVel: 29.0, speedBoost: 21 },
      { id: 'qm-rmp-3', t: 0.62, lateral: 8.5, width: 14.5, length: 19, launchVel: 30.0, speedBoost: 22 },
      { id: 'qm-rmp-4', t: 0.78, lateral: -6.0, width: 14, length: 19, launchVel: 29.0, speedBoost: 21 },
    ],
    updrafts: [
      { id: 'qm-up-1', t: 0.21, lateral: -10.5, radius: 9.0, liftVel: 32.0, colorHex: 0xc084fc },
      { id: 'qm-up-2', t: 0.54, lateral: 10.5, radius: 9.0, liftVel: 32.0, colorHex: 0x2df9f2 },
      { id: 'qm-up-3', t: 0.74, lateral: -9.5, radius: 8.8, liftVel: 31.5, colorHex: 0xfbbf24 },
      { id: 'qm-up-4', t: 0.88, lateral: 8.5, radius: 8.5, liftVel: 30.5, colorHex: 0xc084fc },
    ],
    warpTunnels: [
      { id: 'qm-wt-1', tStart: 0.40, tEnd: 0.47, ringCount: 5, speedBonus: 34, colorHex: 0xfbbf24 }, // Overpass Golden Warp Tunnel!
      { id: 'qm-wt-2', tStart: 0.66, tEnd: 0.71, ringCount: 4, speedBonus: 32, colorHex: 0x2df9f2 },
      { id: 'qm-wt-3', tStart: 0.91, tEnd: 0.97, ringCount: 5, speedBonus: 34, colorHex: 0xc084fc },
    ],
    rings: [
      { id: 'qm-r-1', t: 0.03, lateral: 0, heightOffset: 2.3, radius: 3.0, elevated: false },
      { id: 'qm-r-2', t: 0.122, lateral: -6.0, heightOffset: 8.2, radius: 3.6, elevated: true },
      { id: 'qm-r-3', t: 0.17, lateral: 8.0, heightOffset: 2.3, radius: 3.0, elevated: false },
      { id: 'qm-r-4', t: 0.232, lateral: -10.5, heightOffset: 9.4, radius: 3.6, elevated: true },
      { id: 'qm-r-5', t: 0.342, lateral: 6.5, heightOffset: 8.4, radius: 3.6, elevated: true },
      { id: 'qm-r-6', t: 0.435, lateral: 0, heightOffset: 2.6, radius: 3.3, elevated: false },
      { id: 'qm-r-7', t: 0.562, lateral: 10.5, heightOffset: 9.4, radius: 3.6, elevated: true },
      { id: 'qm-r-8', t: 0.642, lateral: 8.5, heightOffset: 8.6, radius: 3.6, elevated: true },
      { id: 'qm-r-9', t: 0.685, lateral: 0, heightOffset: 2.5, radius: 3.2, elevated: false },
      { id: 'qm-r-10', t: 0.762, lateral: -9.5, heightOffset: 9.2, radius: 3.6, elevated: true },
      { id: 'qm-r-11', t: 0.802, lateral: -6.0, heightOffset: 8.4, radius: 3.6, elevated: true },
      { id: 'qm-r-12', t: 0.902, lateral: 8.5, heightOffset: 8.8, radius: 3.6, elevated: true },
      { id: 'qm-r-13', t: 0.945, lateral: 0, heightOffset: 2.6, radius: 3.3, elevated: false },
    ],
    hazards: [
      { id: 'qm-hz-1', t: 0.19, lateral: 0, width: 10.0, phaseOffset: 0.0, cycleDuration: 3.8, moveAmplitude: 14.5, moveSpeed: 1.6 },
      { id: 'qm-hz-2', t: 0.37, lateral: 0, width: 9.2, phaseOffset: 0.9, cycleDuration: 3.7, moveAmplitude: 10.0, moveSpeed: 1.5 },
      { id: 'qm-hz-3', t: 0.58, lateral: 0, width: 10.2, phaseOffset: 1.7, cycleDuration: 3.8, moveAmplitude: 15.0, moveSpeed: 1.65 },
      { id: 'qm-hz-4', t: 0.75, lateral: 0, width: 9.8, phaseOffset: 2.4, cycleDuration: 3.7, moveAmplitude: 13.0, moveSpeed: 1.55 },
      { id: 'qm-hz-5', t: 0.86, lateral: 0, width: 9.4, phaseOffset: 1.2, cycleDuration: 3.7, moveAmplitude: 11.0, moveSpeed: 1.5 },
    ],
  },
};

export interface BakedTrack {
  def: CircuitDefinition;
  sampleCount: number;
  totalLength: number;
  frames: TrackFrame[];
  minimapPoints: Array<{ x: number; y: number }>;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

function sampleRawPoint(
  pts: CircuitDefinition['controlPoints'],
  defaultWidth: number,
  u: number,
): { pos: Vec3; bank: number; width: number } {
  const n = pts.length;
  const wrapped = wrapProgress(u) * n;
  const i1 = Math.floor(wrapped) % n;
  const localT = wrapped - Math.floor(wrapped);
  const i0 = (i1 - 1 + n) % n;
  const i2 = (i1 + 1) % n;
  const i3 = (i1 + 2) % n;

  const p0 = pts[i0];
  const p1 = pts[i1];
  const p2 = pts[i2];
  const p3 = pts[i3];

  const rawWidth = catmullRom(
    p0.width ?? defaultWidth,
    p1.width ?? defaultWidth,
    p2.width ?? defaultWidth,
    p3.width ?? defaultWidth,
    localT,
  );

  return {
    pos: {
      x: catmullRom(p0.x, p1.x, p2.x, p3.x, localT),
      y: catmullRom(p0.y, p1.y, p2.y, p3.y, localT),
      z: catmullRom(p0.z, p1.z, p2.z, p3.z, localT),
    },
    bank: catmullRom(
      p0.bank ?? 0,
      p1.bank ?? 0,
      p2.bank ?? 0,
      p3.bank ?? 0,
      localT,
    ),
    width: Math.max(26, Math.min(64, rawWidth)),
  };
}

export function buildBakedTrack(def: CircuitDefinition, sampleCount = 480): BakedTrack {
  // First oversample to build arc-length LUT for uniform speed parameterization
  const lutCount = sampleCount * 3;
  const lutPos: Vec3[] = [];
  const lutBank: number[] = [];
  const lutWidth: number[] = [];
  const cumLen: number[] = [0];

  for (let i = 0; i <= lutCount; i++) {
    const u = i / lutCount;
    const s = sampleRawPoint(def.controlPoints, def.trackWidth, u);
    lutPos.push(s.pos);
    lutBank.push(s.bank);
    lutWidth.push(s.width);
    if (i > 0) {
      cumLen.push(cumLen[i - 1] + vecLen(vecSub(s.pos, lutPos[i - 1])));
    }
  }
  const totalLength = cumLen[lutCount];

  // Re-sample uniformly by arc length
  const uniformPos: Vec3[] = [];
  const uniformBank: number[] = [];
  const uniformWidth: number[] = [];
  let cursor = 0;

  for (let i = 0; i < sampleCount; i++) {
    const targetDist = (i / sampleCount) * totalLength;
    while (cursor < lutCount - 1 && cumLen[cursor + 1] < targetDist) {
      cursor++;
    }
    const segLen = Math.max(1e-6, cumLen[cursor + 1] - cumLen[cursor]);
    const alpha = (targetDist - cumLen[cursor]) / segLen;
    const a = lutPos[cursor];
    const b = lutPos[cursor + 1];
    uniformPos.push({
      x: a.x + (b.x - a.x) * alpha,
      y: a.y + (b.y - a.y) * alpha,
      z: a.z + (b.z - a.z) * alpha,
    });
    uniformBank.push(lutBank[cursor] + (lutBank[cursor + 1] - lutBank[cursor]) * alpha);
    uniformWidth.push(lutWidth[cursor] + (lutWidth[cursor + 1] - lutWidth[cursor]) * alpha);
  }

  // Compute orthonormal banked frames & bounds
  const worldUp: Vec3 = { x: 0, y: 1, z: 0 };
  const frames: TrackFrame[] = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < sampleCount; i++) {
    const prev = uniformPos[(i - 1 + sampleCount) % sampleCount];
    const curr = uniformPos[i];
    const next = uniformPos[(i + 1) % sampleCount];

    minX = Math.min(minX, curr.x);
    maxX = Math.max(maxX, curr.x);
    minZ = Math.min(minZ, curr.z);
    maxZ = Math.max(maxZ, curr.z);

    const tangent = vecNorm(vecSub(next, prev));
    const flatRight = vecNorm(vecCross(tangent, worldUp));
    const flatUp = vecNorm(vecCross(flatRight, tangent));

    const bank = uniformBank[i];
    const cosB = Math.cos(bank);
    const sinB = Math.sin(bank);

    const right = vecNorm({
      x: flatRight.x * cosB + flatUp.x * sinB,
      y: flatRight.y * cosB + flatUp.y * sinB,
      z: flatRight.z * cosB + flatUp.z * sinB,
    });
    const up = vecNorm(vecCross(right, tangent));

    // Estimate signed horizontal curvature
    const tPrev = vecNorm(vecSub(curr, prev));
    const tNext = vecNorm(vecSub(next, curr));
    const turnVec = vecSub(tNext, tPrev);
    const curvature = vecDot(turnVec, flatRight);

    frames.push({
      t: i / sampleCount,
      pos: curr,
      tangent,
      right,
      up,
      bankAngle: bank,
      curvature,
      width: uniformWidth[i],
    });
  }

  // Build normalized minimap polygon (96 points, padded into 0.1..0.9 for crisp Figure-8 & mega loops)
  const spanX = Math.max(1, maxX - minX);
  const spanZ = Math.max(1, maxZ - minZ);
  const maxSpan = Math.max(spanX, spanZ);
  const padX = (maxSpan - spanX) * 0.5;
  const padZ = (maxSpan - spanZ) * 0.5;

  const minimapPoints: Array<{ x: number; y: number }> = [];
  const mmSamples = 96;
  for (let i = 0; i < mmSamples; i++) {
    const idx = Math.floor((i / mmSamples) * sampleCount) % sampleCount;
    const p = frames[idx].pos;
    minimapPoints.push({
      x: 0.1 + ((p.x - minX + padX) / maxSpan) * 0.8,
      y: 0.1 + ((p.z - minZ + padZ) / maxSpan) * 0.8,
    });
  }

  return {
    def,
    sampleCount,
    totalLength,
    frames,
    minimapPoints,
    bounds: { minX, maxX, minZ, maxZ },
  };
}

export function sampleTrackFrame(track: BakedTrack, t: number): TrackFrame {
  const wrapped = wrapProgress(t);
  const scaled = wrapped * track.sampleCount;
  const i0 = Math.floor(scaled) % track.sampleCount;
  const i1 = (i0 + 1) % track.sampleCount;
  const alpha = scaled - Math.floor(scaled);

  const f0 = track.frames[i0];
  const f1 = track.frames[i1];

  const pos: Vec3 = {
    x: f0.pos.x + (f1.pos.x - f0.pos.x) * alpha,
    y: f0.pos.y + (f1.pos.y - f0.pos.y) * alpha,
    z: f0.pos.z + (f1.pos.z - f0.pos.z) * alpha,
  };
  const tangent = vecNorm({
    x: f0.tangent.x + (f1.tangent.x - f0.tangent.x) * alpha,
    y: f0.tangent.y + (f1.tangent.y - f0.tangent.y) * alpha,
    z: f0.tangent.z + (f1.tangent.z - f0.tangent.z) * alpha,
  });
  const right = vecNorm({
    x: f0.right.x + (f1.right.x - f0.right.x) * alpha,
    y: f0.right.y + (f1.right.y - f0.right.y) * alpha,
    z: f0.right.z + (f1.right.z - f0.right.z) * alpha,
  });
  const up = vecNorm(vecCross(right, tangent));

  return {
    t: wrapped,
    pos,
    tangent,
    right,
    up,
    bankAngle: f0.bankAngle + (f1.bankAngle - f0.bankAngle) * alpha,
    curvature: f0.curvature + (f1.curvature - f0.curvature) * alpha,
    width: f0.width + (f1.width - f0.width) * alpha,
  };
}

export function trackToWorld(
  track: BakedTrack,
  t: number,
  lateral: number,
  heightOffset: number,
): { pos: Vec3; frame: TrackFrame } {
  const frame = sampleTrackFrame(track, t);
  return {
    frame,
    pos: {
      x: frame.pos.x + frame.right.x * lateral + frame.up.x * heightOffset,
      y: frame.pos.y + frame.right.y * lateral + frame.up.y * heightOffset,
      z: frame.pos.z + frame.right.z * lateral + frame.up.z * heightOffset,
    },
  };
}

export function projectToMinimap(
  track: BakedTrack,
  worldX: number,
  worldZ: number,
): { x: number; y: number } {
  const { minX, maxX, minZ, maxZ } = track.bounds;
  const spanX = Math.max(1, maxX - minX);
  const spanZ = Math.max(1, maxZ - minZ);
  const maxSpan = Math.max(spanX, spanZ);
  const padX = (maxSpan - spanX) * 0.5;
  const padZ = (maxSpan - spanZ) * 0.5;
  return {
    x: 0.1 + ((worldX - minX + padX) / maxSpan) * 0.8,
    y: 0.1 + ((worldZ - minZ + padZ) / maxSpan) * 0.8,
  };
}
