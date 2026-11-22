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
  'solar-canyon': {
    id: 'solar-canyon',
    biome: 'canyon',
    name: 'Solar Canyon',
    subtitle: 'Sunlit sandstone arches, canyon bowls & sky-launch ramps',
    laps: 3,
    trackWidth: 34,
    skyTopColor: '#25315c',
    skyHorizonColor: '#f3a36b',
    fogColor: '#e59a68',
    terrainPrimary: '#b85c3b',
    terrainAccent: '#863c2b',
    controlPoints: [
      { x: 0, y: 8, z: 0, bank: 0, width: 34 },
      { x: 0, y: 8, z: -110, bank: 0, width: 36 },
      { x: 45, y: 12, z: -210, bank: -0.18, width: 42 },
      { x: 145, y: 18, z: -235, bank: -0.24, width: 48 }, // Wide sunlit mesa bowl
      { x: 225, y: 14, z: -165, bank: -0.16, width: 38 },
      { x: 215, y: 7, z: -55, bank: 0.14, width: 30 }, // Faster canyon narrows
      { x: 145, y: 6, z: 20, bank: 0.18, width: 32 },
      { x: 185, y: 11, z: 120, bank: -0.22, width: 46 }, // Wide amphitheater
      { x: 115, y: 15, z: 195, bank: -0.18, width: 40 },
      { x: 20, y: 10, z: 145, bank: -0.12, width: 35 },
    ],
    boostPads: [
      { id: 'bp-1', t: 0.06, lateral: 0, width: 9.5, length: 18 },
      { id: 'bp-2', t: 0.21, lateral: -5.0, width: 9.5, length: 18 },
      { id: 'bp-3', t: 0.38, lateral: 4.0, width: 9.0, length: 18 },
      { id: 'bp-4', t: 0.57, lateral: -3.0, width: 9.0, length: 18 },
      { id: 'bp-5', t: 0.77, lateral: 0, width: 9.5, length: 18 },
      { id: 'bp-6', t: 0.91, lateral: 0, width: 9.5, length: 18 },
    ],
    jumpRamps: [
      { id: 'sc-ramp-1', t: 0.17, lateral: 4.5, width: 11.5, length: 16, launchVel: 22.5, speedBoost: 14 },
      { id: 'sc-ramp-2', t: 0.68, lateral: 0, width: 12.5, length: 17, launchVel: 24.0, speedBoost: 16 },
    ],
    rings: [
      { id: 'rg-1', t: 0.04, lateral: 0, heightOffset: 2.1, radius: 2.8, elevated: false },
      { id: 'rg-2', t: 0.11, lateral: 2.5, heightOffset: 2.1, radius: 2.8, elevated: false },
      { id: 'rg-3', t: 0.195, lateral: 4.5, heightOffset: 6.2, radius: 3.1, elevated: true },
      { id: 'rg-4', t: 0.28, lateral: -4.0, heightOffset: 2.1, radius: 2.8, elevated: false },
      { id: 'rg-5', t: 0.35, lateral: 3.0, heightOffset: 2.1, radius: 2.8, elevated: false },
      { id: 'rg-6', t: 0.44, lateral: -2.5, heightOffset: 2.1, radius: 2.8, elevated: false },
      { id: 'rg-7', t: 0.48, lateral: -3.0, heightOffset: 3.5, radius: 2.9, elevated: true },
      { id: 'rg-8', t: 0.55, lateral: 2.0, heightOffset: 2.1, radius: 2.8, elevated: false },
      { id: 'rg-9', t: 0.63, lateral: 0, heightOffset: 2.1, radius: 2.8, elevated: false },
      { id: 'rg-10', t: 0.708, lateral: 0, heightOffset: 6.8, radius: 3.2, elevated: true },
      { id: 'rg-11', t: 0.81, lateral: -3.0, heightOffset: 2.1, radius: 2.8, elevated: false },
      { id: 'rg-12', t: 0.86, lateral: 2.0, heightOffset: 2.1, radius: 2.8, elevated: false },
      { id: 'rg-13', t: 0.95, lateral: 0, heightOffset: 2.1, radius: 2.8, elevated: false },
    ],
    hazards: [
      { id: 'hz-1', t: 0.32, lateral: -5.5, width: 8.5, phaseOffset: 0.0, cycleDuration: 4.4 },
      { id: 'hz-2', t: 0.60, lateral: 5.5, width: 8.5, phaseOffset: 1.4, cycleDuration: 4.2, moveAmplitude: 6.0, moveSpeed: 1.1 },
      { id: 'hz-3', t: 0.84, lateral: -4.0, width: 8.5, phaseOffset: 2.3, cycleDuration: 4.3 },
    ],
  },

  'glacier-spire': {
    id: 'glacier-spire',
    biome: 'glacier',
    name: 'Glacier Spire',
    subtitle: 'Frosted crystal skyways, sweeping ice bowls & aurora jumps',
    laps: 3,
    trackWidth: 36,
    skyTopColor: '#0c2348',
    skyHorizonColor: '#8ae3f5',
    fogColor: '#7ad2e8',
    terrainPrimary: '#7cb7d4',
    terrainAccent: '#467ba3',
    // High-elevation arctic S-loop with dramatic downhill plunge & wide glacial basin
    controlPoints: [
      { x: 0, y: 12, z: 0, bank: 0, width: 36 },
      { x: 0, y: 15, z: -120, bank: 0, width: 38 },
      { x: -75, y: 24, z: -220, bank: 0.24, width: 46 }, // Climbing crystal sweep
      { x: -190, y: 32, z: -245, bank: 0.26, width: 50 }, // High glacier summit bowl
      { x: -270, y: 20, z: -145, bank: 0.16, width: 38 }, // Sweeping downhill drop
      { x: -200, y: 8, z: -30, bank: -0.22, width: 30 }, // Tight frosted ice gorge
      { x: -115, y: 9, z: 50, bank: -0.18, width: 36 },
      { x: -175, y: 16, z: 165, bank: 0.24, width: 52 }, // Wide aurora plaza
      { x: -65, y: 20, z: 220, bank: 0.18, width: 44 },
      { x: 25, y: 14, z: 130, bank: 0.12, width: 36 },
    ],
    boostPads: [
      { id: 'gl-bp-1', t: 0.055, lateral: 0, width: 10, length: 19 },
      { id: 'gl-bp-2', t: 0.24, lateral: 6.0, width: 9.5, length: 18 },
      { id: 'gl-bp-3', t: 0.42, lateral: -4.0, width: 9.5, length: 18 },
      { id: 'gl-bp-4', t: 0.59, lateral: 0, width: 9.5, length: 18 },
      { id: 'gl-bp-5', t: 0.74, lateral: -6.0, width: 10, length: 19 },
      { id: 'gl-bp-6', t: 0.90, lateral: 0, width: 10, length: 19 },
    ],
    jumpRamps: [
      { id: 'gl-ramp-1', t: 0.14, lateral: 0, width: 12, length: 16, launchVel: 24.0, speedBoost: 15 },
      { id: 'gl-ramp-2', t: 0.46, lateral: 4.0, width: 11.5, length: 16, launchVel: 25.0, speedBoost: 16 },
      { id: 'gl-ramp-3', t: 0.78, lateral: 6.5, width: 13, length: 18, launchVel: 26.5, speedBoost: 18 },
    ],
    rings: [
      { id: 'gl-r-1', t: 0.04, lateral: 0, heightOffset: 2.1, radius: 2.8, elevated: false },
      { id: 'gl-r-2', t: 0.168, lateral: 0, heightOffset: 6.5, radius: 3.2, elevated: true },
      { id: 'gl-r-3', t: 0.29, lateral: -6.0, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'gl-r-4', t: 0.36, lateral: 4.5, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'gl-r-5', t: 0.488, lateral: 4.0, heightOffset: 6.8, radius: 3.2, elevated: true },
      { id: 'gl-r-6', t: 0.57, lateral: -2.0, heightOffset: 2.1, radius: 2.8, elevated: false },
      { id: 'gl-r-7', t: 0.65, lateral: 2.5, heightOffset: 2.1, radius: 2.8, elevated: false },
      { id: 'gl-r-8', t: 0.73, lateral: -5.5, heightOffset: 3.6, radius: 2.9, elevated: true },
      { id: 'gl-r-9', t: 0.81, lateral: 6.5, heightOffset: 7.2, radius: 3.3, elevated: true },
      { id: 'gl-r-10', t: 0.88, lateral: 0, heightOffset: 2.1, radius: 2.8, elevated: false },
      { id: 'gl-r-11', t: 0.95, lateral: 0, heightOffset: 2.1, radius: 2.8, elevated: false },
    ],
    hazards: [
      { id: 'gl-hz-1', t: 0.27, lateral: 0, width: 9.0, phaseOffset: 0.2, cycleDuration: 4.2, moveAmplitude: 10.5, moveSpeed: 1.25 },
      { id: 'gl-hz-2', t: 0.54, lateral: -4.5, width: 8.5, phaseOffset: 1.3, cycleDuration: 4.1 },
      { id: 'gl-hz-3', t: 0.71, lateral: 0, width: 9.2, phaseOffset: 2.1, cycleDuration: 4.0, moveAmplitude: 11.5, moveSpeed: 1.35 },
      { id: 'gl-hz-4', t: 0.86, lateral: 5.0, width: 8.5, phaseOffset: 0.8, cycleDuration: 4.2 },
    ],
  },

  'nebula-ridge': {
    id: 'nebula-ridge',
    biome: 'nebula',
    name: 'Nebula Ridge',
    subtitle: 'Twilight canyon switchbacks, elevated hairpins & turbo chutes',
    laps: 3,
    trackWidth: 34,
    skyTopColor: '#15254a',
    skyHorizonColor: '#d98a7c',
    fogColor: '#c9827b',
    terrainPrimary: '#7d4d63',
    terrainAccent: '#51344d',
    controlPoints: [
      { x: 0, y: 10, z: 0, bank: 0, width: 34 },
      { x: 0, y: 12, z: -125, bank: 0, width: 36 },
      { x: -65, y: 20, z: -215, bank: 0.24, width: 44 },
      { x: -165, y: 24, z: -185, bank: 0.22, width: 46 },
      { x: -210, y: 14, z: -85, bank: 0.16, width: 32 },
      { x: -120, y: 8, z: -10, bank: -0.22, width: 29 },
      { x: -175, y: 12, z: 95, bank: 0.22, width: 44 },
      { x: -105, y: 19, z: 185, bank: 0.2, width: 48 },
      { x: 15, y: 16, z: 165, bank: 0.16, width: 38 },
      { x: 35, y: 11, z: 85, bank: 0.1, width: 34 },
    ],
    boostPads: [
      { id: 'nb-1', t: 0.06, lateral: 0, width: 9.2, length: 18 },
      { id: 'nb-2', t: 0.20, lateral: 4.0, width: 8.8, length: 18 },
      { id: 'nb-3', t: 0.38, lateral: -3.5, width: 8.8, length: 18 },
      { id: 'nb-4', t: 0.54, lateral: 0, width: 9.2, length: 18 },
      { id: 'nb-5', t: 0.72, lateral: 4.0, width: 8.8, length: 18 },
      { id: 'nb-6', t: 0.89, lateral: 0, width: 9.2, length: 18 },
    ],
    jumpRamps: [
      { id: 'nb-ramp-1', t: 0.26, lateral: -4.0, width: 11.5, length: 16, launchVel: 23.5, speedBoost: 15 },
      { id: 'nb-ramp-2', t: 0.66, lateral: 5.0, width: 12.0, length: 17, launchVel: 25.0, speedBoost: 16 },
    ],
    rings: [
      { id: 'nr-1', t: 0.04, lateral: 0, heightOffset: 2.1, radius: 2.8, elevated: false },
      { id: 'nr-2', t: 0.12, lateral: -2.5, heightOffset: 2.1, radius: 2.8, elevated: false },
      { id: 'nr-3', t: 0.288, lateral: -4.0, heightOffset: 6.4, radius: 3.1, elevated: true },
      { id: 'nr-4', t: 0.35, lateral: 0, heightOffset: 2.1, radius: 2.8, elevated: false },
      { id: 'nr-5', t: 0.44, lateral: -2.5, heightOffset: 2.1, radius: 2.8, elevated: false },
      { id: 'nr-6', t: 0.58, lateral: 0, heightOffset: 2.1, radius: 2.8, elevated: false },
      { id: 'nr-7', t: 0.688, lateral: 5.0, heightOffset: 6.8, radius: 3.2, elevated: true },
      { id: 'nr-8', t: 0.76, lateral: 2.5, heightOffset: 2.1, radius: 2.8, elevated: false },
      { id: 'nr-9', t: 0.85, lateral: 0, heightOffset: 2.1, radius: 2.8, elevated: false },
      { id: 'nr-10', t: 0.93, lateral: 0, heightOffset: 3.5, radius: 2.9, elevated: true },
      { id: 'nr-11', t: 0.97, lateral: 0, heightOffset: 2.1, radius: 2.8, elevated: false },
    ],
    hazards: [
      { id: 'nh-1', t: 0.23, lateral: 0, width: 8.5, phaseOffset: 0.4, cycleDuration: 4.3, moveAmplitude: 8.0, moveSpeed: 1.2 },
      { id: 'nh-2', t: 0.48, lateral: 5.0, width: 8.5, phaseOffset: 1.5, cycleDuration: 4.2 },
      { id: 'nh-3', t: 0.81, lateral: 0, width: 8.5, phaseOffset: 2.2, cycleDuration: 4.2, moveAmplitude: 9.0, moveSpeed: 1.3 },
    ],
  },

  'obsidian-caldera': {
    id: 'obsidian-caldera',
    biome: 'volcano',
    name: 'Obsidian Caldera',
    subtitle: 'Molten lava basins, basalt cliffs & super-banked magma bowls',
    laps: 3,
    trackWidth: 36,
    skyTopColor: '#1f1024',
    skyHorizonColor: '#e86a38',
    fogColor: '#cf5e34',
    terrainPrimary: '#3c2930',
    terrainAccent: '#d9481e',
    // Dramatic volcanic loop with steep banked crater rims & 52m wide magma arena
    controlPoints: [
      { x: 0, y: 11, z: 0, bank: 0, width: 36 },
      { x: 0, y: 12, z: -135, bank: 0, width: 38 },
      { x: 90, y: 22, z: -240, bank: -0.26, width: 48 }, // High volcanic rim
      { x: 225, y: 28, z: -200, bank: -0.28, width: 52 }, // Massive molten crater bowl
      { x: 270, y: 16, z: -75, bank: -0.2, width: 34 },
      { x: 185, y: 8, z: 10, bank: 0.24, width: 28 }, // Narrow obsidian basalt bridge
      { x: 240, y: 14, z: 125, bank: -0.25, width: 46 },
      { x: 155, y: 24, z: 225, bank: -0.24, width: 50 }, // High southern magma amphitheater
      { x: 35, y: 16, z: 190, bank: -0.16, width: 40 },
      { x: -15, y: 12, z: 95, bank: -0.1, width: 36 },
    ],
    boostPads: [
      { id: 'oc-bp-1', t: 0.06, lateral: 0, width: 10, length: 19 },
      { id: 'oc-bp-2', t: 0.19, lateral: -6.0, width: 9.5, length: 18 },
      { id: 'oc-bp-3', t: 0.34, lateral: 6.5, width: 10, length: 19 },
      { id: 'oc-bp-4', t: 0.55, lateral: 0, width: 9.0, length: 18 },
      { id: 'oc-bp-5', t: 0.72, lateral: -5.5, width: 10, length: 19 },
      { id: 'oc-bp-6', t: 0.88, lateral: 0, width: 10, length: 19 },
    ],
    jumpRamps: [
      { id: 'oc-ramp-1', t: 0.12, lateral: 5.0, width: 12, length: 17, launchVel: 25.0, speedBoost: 16 },
      { id: 'oc-ramp-2', t: 0.39, lateral: 0, width: 13, length: 17, launchVel: 26.5, speedBoost: 18 },
      { id: 'oc-ramp-3', t: 0.76, lateral: 6.0, width: 13, length: 18, launchVel: 26.0, speedBoost: 18 },
    ],
    rings: [
      { id: 'oc-r-1', t: 0.04, lateral: 0, heightOffset: 2.1, radius: 2.8, elevated: false },
      { id: 'oc-r-2', t: 0.148, lateral: 5.0, heightOffset: 6.8, radius: 3.2, elevated: true },
      { id: 'oc-r-3', t: 0.27, lateral: -7.0, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'oc-r-4', t: 0.31, lateral: 6.0, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'oc-r-5', t: 0.42, lateral: 0, heightOffset: 7.4, radius: 3.3, elevated: true },
      { id: 'oc-r-6', t: 0.53, lateral: 0, heightOffset: 2.1, radius: 2.8, elevated: false },
      { id: 'oc-r-7', t: 0.64, lateral: -5.0, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'oc-r-8', t: 0.70, lateral: 5.5, heightOffset: 3.7, radius: 3.0, elevated: true },
      { id: 'oc-r-9', t: 0.79, lateral: 6.0, heightOffset: 7.2, radius: 3.3, elevated: true },
      { id: 'oc-r-10', t: 0.87, lateral: 0, heightOffset: 2.1, radius: 2.8, elevated: false },
      { id: 'oc-r-11', t: 0.94, lateral: -3.0, heightOffset: 2.1, radius: 2.8, elevated: false },
    ],
    hazards: [
      { id: 'oc-hz-1', t: 0.24, lateral: 0, width: 9.2, phaseOffset: 0.0, cycleDuration: 4.0, moveAmplitude: 11.5, moveSpeed: 1.45 },
      { id: 'oc-hz-2', t: 0.48, lateral: 0, width: 8.8, phaseOffset: 1.1, cycleDuration: 3.9, moveAmplitude: 7.5, moveSpeed: 1.35 },
      { id: 'oc-hz-3', t: 0.67, lateral: 0, width: 9.5, phaseOffset: 2.0, cycleDuration: 4.0, moveAmplitude: 11.0, moveSpeed: 1.5 },
      { id: 'oc-hz-4', t: 0.84, lateral: -4.5, width: 9.0, phaseOffset: 0.7, cycleDuration: 3.8, moveAmplitude: 8.5, moveSpeed: 1.4 },
    ],
  },

  'aether-ringway': {
    id: 'aether-ringway',
    biome: 'aether',
    name: 'Aether Ringway',
    subtitle: 'High-altitude sky citadel, mega-plazas & orbital sky jumps',
    laps: 3,
    trackWidth: 38,
    skyTopColor: '#133b7a',
    skyHorizonColor: '#f7d89c',
    fogColor: '#dfcaab',
    terrainPrimary: '#6d8bb5',
    terrainAccent: '#d9b56c',
    // Grand sweeping sky-citadel figure with huge elevation climbs & 54m mega sky-plazas
    controlPoints: [
      { x: 0, y: 18, z: 0, bank: 0, width: 38 },
      { x: 0, y: 20, z: -140, bank: 0, width: 42 },
      { x: 80, y: 32, z: -260, bank: -0.22, width: 54 }, // Mega Sky Plaza North
      { x: 225, y: 38, z: -255, bank: -0.26, width: 50 }, // Orbital apex
      { x: 300, y: 24, z: -135, bank: -0.18, width: 34 }, // Fast sky bridge
      { x: 210, y: 14, z: -20, bank: 0.22, width: 30 }, // High-speed ribbon pass
      { x: 110, y: 18, z: 55, bank: 0.16, width: 42 },
      { x: 195, y: 28, z: 185, bank: -0.24, width: 54 }, // Mega Sky Plaza South
      { x: 75, y: 30, z: 245, bank: -0.2, width: 46 },
      { x: -20, y: 21, z: 145, bank: -0.12, width: 38 },
    ],
    boostPads: [
      { id: 'ae-bp-1', t: 0.05, lateral: 0, width: 10.5, length: 20 },
      { id: 'ae-bp-2', t: 0.18, lateral: -8.0, width: 10, length: 19 },
      { id: 'ae-bp-3', t: 0.35, lateral: 6.0, width: 10, length: 19 },
      { id: 'ae-bp-4', t: 0.52, lateral: 0, width: 9.5, length: 19 },
      { id: 'ae-bp-5', t: 0.70, lateral: -7.5, width: 10.5, length: 20 },
      { id: 'ae-bp-6', t: 0.87, lateral: 0, width: 10.5, length: 20 },
    ],
    jumpRamps: [
      { id: 'ae-ramp-1', t: 0.11, lateral: 0, width: 13.5, length: 18, launchVel: 27.0, speedBoost: 18 },
      { id: 'ae-ramp-2', t: 0.29, lateral: 7.5, width: 13, length: 18, launchVel: 28.0, speedBoost: 19 },
      { id: 'ae-ramp-3', t: 0.62, lateral: -5.5, width: 12.5, length: 17, launchVel: 26.0, speedBoost: 17 },
      { id: 'ae-ramp-4', t: 0.78, lateral: 6.0, width: 14, length: 18, launchVel: 28.5, speedBoost: 20 },
    ],
    rings: [
      { id: 'ae-r-1', t: 0.04, lateral: 0, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'ae-r-2', t: 0.138, lateral: 0, heightOffset: 7.5, radius: 3.4, elevated: true },
      { id: 'ae-r-3', t: 0.22, lateral: -9.0, heightOffset: 2.3, radius: 3.0, elevated: false },
      { id: 'ae-r-4', t: 0.32, lateral: 7.5, heightOffset: 7.8, radius: 3.4, elevated: true },
      { id: 'ae-r-5', t: 0.43, lateral: 0, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'ae-r-6', t: 0.51, lateral: -3.5, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'ae-r-7', t: 0.648, lateral: -5.5, heightOffset: 7.2, radius: 3.3, elevated: true },
      { id: 'ae-r-8', t: 0.73, lateral: -8.0, heightOffset: 2.3, radius: 3.0, elevated: false },
      { id: 'ae-r-9', t: 0.81, lateral: 6.0, heightOffset: 8.0, radius: 3.5, elevated: true },
      { id: 'ae-r-10', t: 0.90, lateral: 0, heightOffset: 2.2, radius: 2.9, elevated: false },
      { id: 'ae-r-11', t: 0.96, lateral: 0, heightOffset: 3.6, radius: 3.0, elevated: true },
    ],
    hazards: [
      { id: 'ae-hz-1', t: 0.21, lateral: 0, width: 9.6, phaseOffset: 0.0, cycleDuration: 3.9, moveAmplitude: 13.5, moveSpeed: 1.55 },
      { id: 'ae-hz-2', t: 0.45, lateral: 0, width: 8.8, phaseOffset: 1.0, cycleDuration: 3.8, moveAmplitude: 8.0, moveSpeed: 1.4 },
      { id: 'ae-hz-3', t: 0.72, lateral: 0, width: 9.8, phaseOffset: 1.9, cycleDuration: 3.9, moveAmplitude: 14.0, moveSpeed: 1.6 },
      { id: 'ae-hz-4', t: 0.86, lateral: 0, width: 9.0, phaseOffset: 0.6, cycleDuration: 3.7, moveAmplitude: 9.5, moveSpeed: 1.45 },
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
    width: Math.max(24, Math.min(62, rawWidth)),
  };
}

export function buildBakedTrack(def: CircuitDefinition, sampleCount = 360): BakedTrack {
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

  // Build normalized minimap polygon (72 points, padded into 0.1..0.9)
  const spanX = Math.max(1, maxX - minX);
  const spanZ = Math.max(1, maxZ - minZ);
  const maxSpan = Math.max(spanX, spanZ);
  const padX = (maxSpan - spanX) * 0.5;
  const padZ = (maxSpan - spanZ) * 0.5;

  const minimapPoints: Array<{ x: number; y: number }> = [];
  const mmSamples = 72;
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
