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
  // LV 1: GRAND SOLAR CANYON (~2,050m) — Sweeping sunlit sandstone mesas, twin bowls & solar warp chute
  'solar-canyon': {
    id: 'solar-canyon',
    biome: 'canyon',
    name: 'Solar Canyon',
    subtitle: 'Grand sunlit sandstone megacanyon, sweeping mesa bowls & solar warp chute',
    laps: 2,
    trackWidth: 36,
    skyTopColor: '#22305e',
    skyHorizonColor: '#f3a36b',
    fogColor: '#e59a68',
    terrainPrimary: '#b85c3b',
    terrainAccent: '#863c2b',
    controlPoints: [
      { x: 0, y: 10, z: 0, bank: 0, width: 36 },
      { x: 0, y: 11, z: -185, bank: 0, width: 38 },
      { x: 95, y: 20, z: -360, bank: -0.2, width: 46 },
      { x: 265, y: 30, z: -410, bank: -0.25, width: 54 }, // Colossal Sun Bowl
      { x: 420, y: 24, z: -300, bank: -0.18, width: 42 },
      { x: 445, y: 12, z: -120, bank: 0.14, width: 32 }, // Canyon Narrows
      { x: 315, y: 9, z: 10, bank: 0.22, width: 30 },
      { x: 265, y: 16, z: 155, bank: -0.2, width: 44 },
      { x: 375, y: 24, z: 295, bank: -0.24, width: 52 }, // Sandstone Amphitheater
      { x: 245, y: 28, z: 405, bank: -0.2, width: 46 },
      { x: 85, y: 19, z: 335, bank: -0.14, width: 38 },
      { x: -30, y: 12, z: 205, bank: 0.1, width: 36 },
    ],
    boostPads: [
      { id: 'sc-bp-1', t: 0.05, lateral: 0, width: 10, length: 20 },
      { id: 'sc-bp-2', t: 0.16, lateral: -6.5, width: 10, length: 20 },
      { id: 'sc-bp-3', t: 0.30, lateral: 5.0, width: 9.5, length: 19 },
      { id: 'sc-bp-4', t: 0.45, lateral: 0, width: 9.5, length: 19 },
      { id: 'sc-bp-5', t: 0.62, lateral: -6.0, width: 10, length: 20 },
      { id: 'sc-bp-6', t: 0.78, lateral: 5.0, width: 10, length: 20 },
      { id: 'sc-bp-7', t: 0.92, lateral: 0, width: 10.5, length: 20 },
    ],
    jumpRamps: [
      { id: 'sc-rmp-1', t: 0.11, lateral: 4.5, width: 12, length: 18, launchVel: 23.5, speedBoost: 15 },
      { id: 'sc-rmp-2', t: 0.54, lateral: 0, width: 12.5, length: 18, launchVel: 24.5, speedBoost: 16 },
      { id: 'sc-rmp-3', t: 0.84, lateral: -4.5, width: 12, length: 18, launchVel: 24.0, speedBoost: 15 },
    ],
    updrafts: [
      { id: 'sc-up-1', t: 0.23, lateral: 9.0, radius: 7.5, liftVel: 26.5, colorHex: 0x2df9f2 },
      { id: 'sc-up-2', t: 0.70, lateral: -9.0, radius: 7.5, liftVel: 26.5, colorHex: 0xffd166 },
    ],
    warpTunnels: [
      { id: 'sc-wt-1', tStart: 0.36, tEnd: 0.42, ringCount: 4, speedBonus: 24, colorHex: 0xffb703 },
    ],
    rings: [
      { id: 'sc-r-1', t: 0.03, lateral: 0, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'sc-r-2', t: 0.08, lateral: 4.5, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'sc-r-3', t: 0.132, lateral: 4.5, heightOffset: 6.5, radius: 3.3, elevated: true },
      { id: 'sc-r-4', t: 0.20, lateral: -6.0, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'sc-r-5', t: 0.255, lateral: 9.0, heightOffset: 7.8, radius: 3.4, elevated: true },
      { id: 'sc-r-6', t: 0.33, lateral: 2.0, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'sc-r-7', t: 0.39, lateral: 0, heightOffset: 2.2, radius: 3.0, elevated: false },
      { id: 'sc-r-8', t: 0.49, lateral: -3.5, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'sc-r-9', t: 0.562, lateral: 0, heightOffset: 7.0, radius: 3.3, elevated: true },
      { id: 'sc-r-10', t: 0.65, lateral: -5.5, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'sc-r-11', t: 0.725, lateral: -9.0, heightOffset: 7.8, radius: 3.4, elevated: true },
      { id: 'sc-r-12', t: 0.80, lateral: 3.5, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'sc-r-13', t: 0.862, lateral: -4.5, heightOffset: 6.8, radius: 3.3, elevated: true },
      { id: 'sc-r-14', t: 0.94, lateral: 0, heightOffset: 2.2, radius: 2.9, elevated: false },
    ],
    hazards: [
      { id: 'sc-hz-1', t: 0.28, lateral: -6.0, width: 9.0, phaseOffset: 0.0, cycleDuration: 4.4 },
      { id: 'sc-hz-2', t: 0.48, lateral: 0, width: 9.0, phaseOffset: 1.2, cycleDuration: 4.2, moveAmplitude: 7.5, moveSpeed: 1.1 },
      { id: 'sc-hz-3', t: 0.68, lateral: 6.5, width: 9.0, phaseOffset: 2.1, cycleDuration: 4.3 },
      { id: 'sc-hz-4', t: 0.89, lateral: -4.5, width: 9.0, phaseOffset: 0.8, cycleDuration: 4.2 },
    ],
  },

  // LV 2: GLACIER SPIRE (~2,200m) — Arctic alpine summit climb, glacial plunge & aurora ice warp tunnel
  'glacier-spire': {
    id: 'glacier-spire',
    biome: 'glacier',
    name: 'Glacier Spire',
    subtitle: 'Towering crystal summits, alpine ice plunge, updraft geysers & aurora tunnel',
    laps: 2,
    trackWidth: 38,
    skyTopColor: '#0b2247',
    skyHorizonColor: '#8ae3f5',
    fogColor: '#7ad2e8',
    terrainPrimary: '#7cb7d4',
    terrainAccent: '#467ba3',
    controlPoints: [
      { x: 0, y: 14, z: 0, bank: 0, width: 38 },
      { x: 0, y: 18, z: -195, bank: 0, width: 40 },
      { x: -120, y: 34, z: -385, bank: 0.24, width: 48 }, // Alpine climb
      { x: -315, y: 52, z: -435, bank: 0.28, width: 56 }, // High Crystal Summit Bowl
      { x: -465, y: 36, z: -305, bank: 0.2, width: 44 },
      { x: -445, y: 14, z: -105, bank: -0.18, width: 32 }, // Plunging Ice Gorge
      { x: -300, y: 10, z: 35, bank: -0.24, width: 30 },
      { x: -245, y: 18, z: 185, bank: 0.22, width: 46 },
      { x: -360, y: 28, z: 345, bank: 0.26, width: 54 }, // Aurora Ice Basin
      { x: -195, y: 34, z: 435, bank: 0.22, width: 48 },
      { x: -40, y: 24, z: 335, bank: 0.14, width: 40 },
      { x: 40, y: 16, z: 185, bank: 0.1, width: 38 },
    ],
    boostPads: [
      { id: 'gl-bp-1', t: 0.045, lateral: 0, width: 10.5, length: 20 },
      { id: 'gl-bp-2', t: 0.18, lateral: 7.0, width: 10, length: 19 },
      { id: 'gl-bp-3', t: 0.34, lateral: -5.5, width: 10, length: 19 },
      { id: 'gl-bp-4', t: 0.49, lateral: 0, width: 9.5, length: 19 },
      { id: 'gl-bp-5', t: 0.64, lateral: -7.0, width: 10.5, length: 20 },
      { id: 'gl-bp-6', t: 0.79, lateral: 6.5, width: 10, length: 20 },
      { id: 'gl-bp-7', t: 0.93, lateral: 0, width: 10.5, length: 20 },
    ],
    jumpRamps: [
      { id: 'gl-rmp-1', t: 0.12, lateral: 0, width: 13, length: 18, launchVel: 25.0, speedBoost: 16 },
      { id: 'gl-rmp-2', t: 0.43, lateral: 4.5, width: 12, length: 18, launchVel: 26.0, speedBoost: 17 },
      { id: 'gl-rmp-3', t: 0.72, lateral: 7.5, width: 13.5, length: 19, launchVel: 27.0, speedBoost: 18 },
    ],
    updrafts: [
      { id: 'gl-up-1', t: 0.25, lateral: -9.5, radius: 8.0, liftVel: 28.0, colorHex: 0x7efcf7 },
      { id: 'gl-up-2', t: 0.58, lateral: 8.0, radius: 8.0, liftVel: 28.0, colorHex: 0x38bdf8 },
      { id: 'gl-up-3', t: 0.86, lateral: -6.5, radius: 7.5, liftVel: 27.0, colorHex: 0x7efcf7 },
    ],
    warpTunnels: [
      { id: 'gl-wt-1', tStart: 0.34, tEnd: 0.40, ringCount: 4, speedBonus: 26, colorHex: 0x38bdf8 },
      { id: 'gl-wt-2', tStart: 0.89, tEnd: 0.95, ringCount: 4, speedBonus: 26, colorHex: 0x7efcf7 },
    ],
    rings: [
      { id: 'gl-r-1', t: 0.03, lateral: 0, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'gl-r-2', t: 0.142, lateral: 0, heightOffset: 7.0, radius: 3.4, elevated: true },
      { id: 'gl-r-3', t: 0.22, lateral: 6.5, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'gl-r-4', t: 0.274, lateral: -9.5, heightOffset: 8.4, radius: 3.5, elevated: true },
      { id: 'gl-r-5', t: 0.37, lateral: 0, heightOffset: 2.4, radius: 3.1, elevated: false },
      { id: 'gl-r-6', t: 0.452, lateral: 4.5, heightOffset: 7.4, radius: 3.4, elevated: true },
      { id: 'gl-r-7', t: 0.53, lateral: -3.5, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'gl-r-8', t: 0.605, lateral: 8.0, heightOffset: 8.2, radius: 3.5, elevated: true },
      { id: 'gl-r-9', t: 0.67, lateral: -7.5, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'gl-r-10', t: 0.744, lateral: 7.5, heightOffset: 7.8, radius: 3.5, elevated: true },
      { id: 'gl-r-11', t: 0.82, lateral: 2.0, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'gl-r-12', t: 0.884, lateral: -6.5, heightOffset: 7.6, radius: 3.4, elevated: true },
      { id: 'gl-r-13', t: 0.95, lateral: 0, heightOffset: 2.2, radius: 3.0, elevated: false },
    ],
    hazards: [
      { id: 'gl-hz-1', t: 0.21, lateral: 0, width: 9.2, phaseOffset: 0.2, cycleDuration: 4.2, moveAmplitude: 11.0, moveSpeed: 1.25 },
      { id: 'gl-hz-2', t: 0.51, lateral: -4.5, width: 8.8, phaseOffset: 1.3, cycleDuration: 4.1 },
      { id: 'gl-hz-3', t: 0.69, lateral: 0, width: 9.4, phaseOffset: 2.1, cycleDuration: 4.0, moveAmplitude: 12.0, moveSpeed: 1.35 },
      { id: 'gl-hz-4', t: 0.84, lateral: 5.0, width: 8.8, phaseOffset: 0.8, cycleDuration: 4.1 },
    ],
  },

  // LV 3: BIOLUME JUNGLE (~2,300m) — NEW CREATIVE ALIEN CANOPY BIOME with giant glowing mushrooms, floating spore-jellies & winding vine rivers!
  'biolume-jungle': {
    id: 'biolume-jungle',
    biome: 'biolume',
    name: 'Biolume Jungle',
    subtitle: 'Glowing alien mushroom canopy, spore updrafts & emerald bioluminescent tunnels',
    laps: 2,
    trackWidth: 38,
    skyTopColor: '#071b24',
    skyHorizonColor: '#1f7a6e',
    fogColor: '#175e5c',
    terrainPrimary: '#13443e',
    terrainAccent: '#2dd4bf',
    controlPoints: [
      { x: 0, y: 12, z: 0, bank: 0, width: 38 },
      { x: 0, y: 14, z: -200, bank: 0, width: 42 },
      { x: 140, y: 26, z: -365, bank: -0.24, width: 52 }, // Canopy Ridge Sweep
      { x: 325, y: 38, z: -345, bank: -0.22, width: 46 },
      { x: 430, y: 22, z: -185, bank: 0.16, width: 32 }, // Winding Vine Chicane
      { x: 310, y: 14, z: -35, bank: 0.26, width: 34 },
      { x: 445, y: 24, z: 125, bank: -0.26, width: 56 }, // Biolume Lagoon Plaza
      { x: 385, y: 34, z: 325, bank: -0.24, width: 50 },
      { x: 200, y: 28, z: 420, bank: -0.18, width: 44 },
      { x: 40, y: 18, z: 320, bank: 0.18, width: 34 },
      { x: -125, y: 22, z: 245, bank: -0.22, width: 46 }, // Western Spore Loop
      { x: -115, y: 15, z: 95, bank: -0.14, width: 38 },
    ],
    boostPads: [
      { id: 'bj-bp-1', t: 0.04, lateral: 0, width: 10.5, length: 20 },
      { id: 'bj-bp-2', t: 0.15, lateral: -7.5, width: 10, length: 19 },
      { id: 'bj-bp-3', t: 0.29, lateral: 4.5, width: 9.5, length: 19 },
      { id: 'bj-bp-4', t: 0.44, lateral: 0, width: 10, length: 20 },
      { id: 'bj-bp-5', t: 0.56, lateral: 8.5, width: 10.5, length: 20 },
      { id: 'bj-bp-6', t: 0.72, lateral: -5.0, width: 10, length: 19 },
      { id: 'bj-bp-7', t: 0.87, lateral: 4.0, width: 10, length: 20 },
    ],
    jumpRamps: [
      { id: 'bj-rmp-1', t: 0.10, lateral: 5.0, width: 12.5, length: 18, launchVel: 26.0, speedBoost: 17 },
      { id: 'bj-rmp-2', t: 0.49, lateral: -6.5, width: 13.5, length: 19, launchVel: 27.5, speedBoost: 18 },
      { id: 'bj-rmp-3', t: 0.78, lateral: 0, width: 12.5, length: 18, launchVel: 26.5, speedBoost: 17 },
    ],
    updrafts: [
      { id: 'bj-up-1', t: 0.22, lateral: -8.0, radius: 8.2, liftVel: 29.0, colorHex: 0x34d399 },
      { id: 'bj-up-2', t: 0.59, lateral: 10.0, radius: 8.5, liftVel: 30.0, colorHex: 0xe879f9 },
      { id: 'bj-up-3', t: 0.90, lateral: -7.0, radius: 8.0, liftVel: 28.0, colorHex: 0x2df9f2 },
    ],
    warpTunnels: [
      { id: 'bj-wt-1', tStart: 0.34, tEnd: 0.41, ringCount: 5, speedBonus: 28, colorHex: 0x34d399 },
      { id: 'bj-wt-2', tStart: 0.67, tEnd: 0.73, ringCount: 4, speedBonus: 27, colorHex: 0xe879f9 },
    ],
    rings: [
      { id: 'bj-r-1', t: 0.03, lateral: 0, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'bj-r-2', t: 0.122, lateral: 5.0, heightOffset: 7.4, radius: 3.4, elevated: true },
      { id: 'bj-r-3', t: 0.19, lateral: -7.5, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'bj-r-4', t: 0.244, lateral: -8.0, heightOffset: 8.6, radius: 3.5, elevated: true },
      { id: 'bj-r-5', t: 0.37, lateral: 0, heightOffset: 2.4, radius: 3.1, elevated: false },
      { id: 'bj-r-6', t: 0.46, lateral: 4.0, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'bj-r-7', t: 0.514, lateral: -6.5, heightOffset: 8.0, radius: 3.5, elevated: true },
      { id: 'bj-r-8', t: 0.614, lateral: 10.0, heightOffset: 8.8, radius: 3.5, elevated: true },
      { id: 'bj-r-9', t: 0.70, lateral: 0, heightOffset: 2.4, radius: 3.1, elevated: false },
      { id: 'bj-r-10', t: 0.802, lateral: 0, heightOffset: 7.6, radius: 3.4, elevated: true },
      { id: 'bj-r-11', t: 0.86, lateral: 4.5, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'bj-r-12', t: 0.922, lateral: -7.0, heightOffset: 8.2, radius: 3.5, elevated: true },
      { id: 'bj-r-13', t: 0.96, lateral: 0, heightOffset: 2.2, radius: 2.9, elevated: false },
    ],
    hazards: [
      { id: 'bj-hz-1', t: 0.26, lateral: 0, width: 9.2, phaseOffset: 0.3, cycleDuration: 4.1, moveAmplitude: 10.5, moveSpeed: 1.3 },
      { id: 'bj-hz-2', t: 0.55, lateral: 0, width: 9.6, phaseOffset: 1.4, cycleDuration: 4.0, moveAmplitude: 13.0, moveSpeed: 1.35 },
      { id: 'bj-hz-3', t: 0.75, lateral: -5.5, width: 9.0, phaseOffset: 2.2, cycleDuration: 4.0 },
      { id: 'bj-hz-4', t: 0.93, lateral: 0, width: 9.0, phaseOffset: 0.9, cycleDuration: 4.1, moveAmplitude: 9.0, moveSpeed: 1.25 },
    ],
  },

  // LV 4: NEBULA RIDGE (~2,450m) — TRUE 3D FIGURE-8 COSMIC OVERPASS with floating asteroid islands & twin portal rings!
  'nebula-ridge': {
    id: 'nebula-ridge',
    biome: 'nebula',
    name: 'Nebula Ridge',
    subtitle: 'True 3D Figure-8 cosmic overpass, floating asteroid islands & rotating portals',
    laps: 3,
    trackWidth: 36,
    hasOverpass: true,
    skyTopColor: '#121c42',
    skyHorizonColor: '#d47f86',
    fogColor: '#be7684',
    terrainPrimary: '#6d405c',
    terrainAccent: '#462848',
    // Genuine Figure-8 Crossing around (x=0, z=-190): lower pass y=12, upper skyway bridge y=50 (38m clear!)
    controlPoints: [
      { x: 0, y: 12, z: 60, bank: 0, width: 36 },
      { x: 0, y: 12, z: -190, bank: 0, width: 36 }, // UNDERPASS (y=12)
      { x: -120, y: 20, z: -380, bank: 0.22, width: 46 },
      { x: -310, y: 34, z: -410, bank: 0.26, width: 52 }, // Northwest Nebula Bowl
      { x: -395, y: 46, z: -245, bank: 0.24, width: 46 },
      { x: -250, y: 50, z: -180, bank: 0.08, width: 34 }, // Climbing onto sky-bridge
      { x: 0, y: 50, z: -190, bank: 0, width: 32 }, // OVERPASS BRIDGE (y=50, 38m above!)
      { x: 245, y: 46, z: -200, bank: -0.1, width: 34 },
      { x: 400, y: 34, z: -90, bank: -0.26, width: 52 }, // Eastern Cosmic Arena
      { x: 350, y: 22, z: 125, bank: -0.24, width: 48 },
      { x: 180, y: 16, z: 235, bank: -0.18, width: 42 },
      { x: 20, y: 13, z: 195, bank: -0.12, width: 38 },
    ],
    boostPads: [
      { id: 'nb-bp-1', t: 0.05, lateral: 0, width: 10, length: 20 },
      { id: 'nb-bp-2', t: 0.19, lateral: 6.0, width: 9.5, length: 19 },
      { id: 'nb-bp-3', t: 0.36, lateral: -5.0, width: 9.5, length: 19 },
      { id: 'nb-bp-4', t: 0.49, lateral: 0, width: 9.5, length: 20 }, // Overpass bridge boost!
      { id: 'nb-bp-5', t: 0.64, lateral: -7.0, width: 10, length: 20 },
      { id: 'nb-bp-6', t: 0.78, lateral: 6.0, width: 10, length: 20 },
      { id: 'nb-bp-7', t: 0.92, lateral: 0, width: 10, length: 20 },
    ],
    jumpRamps: [
      { id: 'nb-rmp-1', t: 0.14, lateral: -4.5, width: 12, length: 18, launchVel: 25.5, speedBoost: 17 },
      { id: 'nb-rmp-2', t: 0.56, lateral: 4.0, width: 12, length: 18, launchVel: 26.5, speedBoost: 18 },
      { id: 'nb-rmp-3', t: 0.83, lateral: 0, width: 13, length: 18, launchVel: 26.0, speedBoost: 17 },
    ],
    updrafts: [
      { id: 'nb-up-1', t: 0.28, lateral: -9.5, radius: 8.0, liftVel: 28.5, colorHex: 0xc084fc },
      { id: 'nb-up-2', t: 0.70, lateral: 9.5, radius: 8.2, liftVel: 29.0, colorHex: 0x2df9f2 },
    ],
    warpTunnels: [
      { id: 'nb-wt-1', tStart: 0.45, tEnd: 0.52, ringCount: 5, speedBonus: 30, colorHex: 0xe879f9 }, // Skyway Overpass Warp Tunnel!
      { id: 'nb-wt-2', tStart: 0.88, tEnd: 0.94, ringCount: 4, speedBonus: 28, colorHex: 0x2df9f2 },
    ],
    rings: [
      { id: 'nb-r-1', t: 0.03, lateral: 0, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'nb-r-2', t: 0.09, lateral: 3.5, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'nb-r-3', t: 0.162, lateral: -4.5, heightOffset: 7.4, radius: 3.4, elevated: true },
      { id: 'nb-r-4', t: 0.24, lateral: 6.5, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'nb-r-5', t: 0.304, lateral: -9.5, heightOffset: 8.5, radius: 3.5, elevated: true },
      { id: 'nb-r-6', t: 0.40, lateral: 0, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'nb-r-7', t: 0.485, lateral: 0, heightOffset: 2.6, radius: 3.2, elevated: false }, // Center of Overpass!
      { id: 'nb-r-8', t: 0.582, lateral: 4.0, heightOffset: 7.8, radius: 3.5, elevated: true },
      { id: 'nb-r-9', t: 0.66, lateral: -6.5, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'nb-r-10', t: 0.724, lateral: 9.5, heightOffset: 8.6, radius: 3.5, elevated: true },
      { id: 'nb-r-11', t: 0.79, lateral: 4.5, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'nb-r-12', t: 0.852, lateral: 0, heightOffset: 7.5, radius: 3.4, elevated: true },
      { id: 'nb-r-13', t: 0.94, lateral: 0, heightOffset: 2.3, radius: 3.0, elevated: false },
    ],
    hazards: [
      { id: 'nb-hz-1', t: 0.23, lateral: 0, width: 9.2, phaseOffset: 0.4, cycleDuration: 4.1, moveAmplitude: 10.5, moveSpeed: 1.3 },
      { id: 'nb-hz-2', t: 0.41, lateral: 5.0, width: 8.8, phaseOffset: 1.5, cycleDuration: 4.0 },
      { id: 'nb-hz-3', t: 0.67, lateral: 0, width: 9.5, phaseOffset: 2.2, cycleDuration: 4.0, moveAmplitude: 12.0, moveSpeed: 1.4 },
      { id: 'nb-hz-4', t: 0.81, lateral: -5.5, width: 9.0, phaseOffset: 0.9, cycleDuration: 4.0 },
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
