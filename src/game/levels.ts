import type { CircuitId, DifficultyTier, LevelDefinition } from './types';

export const LEVELS: readonly LevelDefinition[] = [
  {
    number: 1,
    name: 'Rookie Run',
    tier: 'Easy',
    circuitId: 'solar-canyon',
    fleetTag: 'Solar GP Classics',
    featuredPlayerChassis: 'nova-interceptor',
    laps: 2,
    targetRank: 3,
    aiPaceScale: 0.78,
    aiBoostAggression: 0.24,
    aiLaunchRampSec: 2.5,
    hazardCount: 2,
    hazardCycleSpeed: 0.72,
    hazardWidthScale: 0.82,
    speedClassScale: 0.96,
    accentHex: '#2df9f2',
  },
  {
    number: 2,
    name: 'Cryo Slalom',
    tier: 'Standard',
    circuitId: 'glacier-spire',
    fleetTag: 'Cryo Crystal Division',
    featuredPlayerChassis: 'cryo-prism',
    laps: 2,
    targetRank: 3,
    aiPaceScale: 0.94,
    aiBoostAggression: 0.58,
    aiLaunchRampSec: 1.7,
    hazardCount: 3,
    hazardCycleSpeed: 0.88,
    hazardWidthScale: 0.94,
    speedClassScale: 1.0,
    accentHex: '#67e8f9',
  },
  {
    number: 3,
    name: 'Spore Canopy',
    tier: 'Standard',
    circuitId: 'biolume-jungle',
    fleetTag: 'Bio-Jelly Squadron',
    featuredPlayerChassis: 'spore-jelly',
    laps: 2,
    targetRank: 3,
    aiPaceScale: 0.99,
    aiBoostAggression: 0.72,
    aiLaunchRampSec: 1.5,
    hazardCount: 3,
    hazardCycleSpeed: 0.98,
    hazardWidthScale: 1.0,
    speedClassScale: 1.04,
    accentHex: '#34d399',
  },
  {
    number: 4,
    name: 'Nebula Overpass',
    tier: 'Challenger',
    circuitId: 'nebula-ridge',
    fleetTag: 'Tri-Orbiter Scout Wing',
    featuredPlayerChassis: 'tri-orbiter',
    laps: 3,
    targetRank: 3,
    aiPaceScale: 1.04,
    aiBoostAggression: 0.86,
    aiLaunchRampSec: 1.35,
    hazardCount: 4,
    hazardCycleSpeed: 1.08,
    hazardWidthScale: 1.05,
    speedClassScale: 1.08,
    accentHex: '#c084fc',
  },
  {
    number: 5,
    name: 'Magma Gauntlet',
    tier: 'Pro',
    circuitId: 'obsidian-caldera',
    fleetTag: 'Forge Dreadnoughts',
    featuredPlayerChassis: 'magma-forge',
    laps: 3,
    targetRank: 2,
    aiPaceScale: 1.08,
    aiBoostAggression: 1.0,
    aiLaunchRampSec: 1.2,
    hazardCount: 4,
    hazardCycleSpeed: 1.18,
    hazardWidthScale: 1.1,
    speedClassScale: 1.12,
    accentHex: '#ff8a3d',
  },
  {
    number: 6,
    name: 'Skyline Rush',
    tier: 'Pro',
    circuitId: 'neon-megacity',
    fleetTag: 'Holo-Ring Strikers',
    featuredPlayerChassis: 'cyber-spinner',
    laps: 3,
    targetRank: 2,
    aiPaceScale: 1.11,
    aiBoostAggression: 1.12,
    aiLaunchRampSec: 1.05,
    hazardCount: 4,
    hazardCycleSpeed: 1.26,
    hazardWidthScale: 1.14,
    speedClassScale: 1.15,
    accentHex: '#f472b6',
  },
  {
    number: 7,
    name: 'Orbital Citadel',
    tier: 'Ace',
    circuitId: 'aether-ringway',
    fleetTag: 'Celestial Halo Aces',
    featuredPlayerChassis: 'drift-halo',
    laps: 3,
    targetRank: 2,
    aiPaceScale: 1.14,
    aiBoostAggression: 1.24,
    aiLaunchRampSec: 0.95,
    hazardCount: 4,
    hazardCycleSpeed: 1.34,
    hazardWidthScale: 1.18,
    speedClassScale: 1.18,
    accentHex: '#ffd166',
  },
  {
    number: 8,
    name: 'Quantum Finale',
    tier: 'Master',
    circuitId: 'quantum-prism',
    fleetTag: 'Quantum Seraph Masters',
    featuredPlayerChassis: 'quantum-seraph',
    laps: 4,
    targetRank: 1,
    aiPaceScale: 1.18,
    aiBoostAggression: 1.36,
    aiLaunchRampSec: 0.8,
    hazardCount: 5,
    hazardCycleSpeed: 1.44,
    hazardWidthScale: 1.22,
    speedClassScale: 1.22,
    accentHex: '#c084fc',
  },
] as const;

export const MAX_LEVEL = LEVELS.length;
const STORAGE_KEY_UNLOCKED = 'saucer_gp_unlocked_level_v2';
const STORAGE_KEY_CLEARED = 'saucer_gp_cleared_levels_v2';

export function getLevelDefinition(levelNumber: number): LevelDefinition {
  const clamped = Math.max(1, Math.min(MAX_LEVEL, Math.round(levelNumber)));
  return LEVELS[clamped - 1];
}

export function isLevelCleared(levelNumber: number, finishRank: number): boolean {
  const def = getLevelDefinition(levelNumber);
  return finishRank >= 1 && finishRank <= def.targetRank;
}

export function computeNextUnlockedLevel(
  currentUnlocked: number,
  playedLevel: number,
  finishRank: number,
): number {
  const safeUnlocked = Math.max(1, Math.min(MAX_LEVEL, Math.round(currentUnlocked)));
  if (!isLevelCleared(playedLevel, finishRank)) {
    return safeUnlocked;
  }
  return Math.min(MAX_LEVEL, Math.max(safeUnlocked, playedLevel + 1));
}

export function formatTargetGoal(targetRank: number): string {
  if (targetRank === 1) return 'Win 1st Place';
  return `Finish Top ${targetRank}`;
}

export function loadUnlockedLevel(): number {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 1;
    const raw = window.localStorage.getItem(STORAGE_KEY_UNLOCKED);
    const parsed = raw ? parseInt(raw, 10) : 1;
    if (!Number.isFinite(parsed)) return 1;
    return Math.max(1, Math.min(MAX_LEVEL, parsed));
  } catch {
    return 1;
  }
}

export function saveUnlockedLevel(levelNumber: number): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const clamped = Math.max(1, Math.min(MAX_LEVEL, Math.round(levelNumber)));
    window.localStorage.setItem(STORAGE_KEY_UNLOCKED, String(clamped));
  } catch {
    // Ignore private-mode storage failures
  }
}

export function loadClearedLevels(): number[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(STORAGE_KEY_CLEARED);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(
        parsed
          .map((n) => Math.round(Number(n)))
          .filter((n) => Number.isFinite(n) && n >= 1 && n <= MAX_LEVEL),
      ),
    ).sort((a, b) => a - b);
  } catch {
    return [];
  }
}

export function saveClearedLevels(levels: number[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const clean = Array.from(
      new Set(levels.filter((n) => Number.isFinite(n) && n >= 1 && n <= MAX_LEVEL)),
    ).sort((a, b) => a - b);
    window.localStorage.setItem(STORAGE_KEY_CLEARED, JSON.stringify(clean));
  } catch {
    // Ignore private-mode storage failures
  }
}

export function getLevelCircuitId(levelNumber: number): CircuitId {
  return getLevelDefinition(levelNumber).circuitId;
}

export function getDifficultyBadgeTone(tier: DifficultyTier): string {
  switch (tier) {
    case 'Easy':
      return '#2df9f2';
    case 'Standard':
      return '#5eead4';
    case 'Challenger':
      return '#ffd166';
    case 'Pro':
      return '#f59e42';
    case 'Ace':
      return '#ff5964';
    case 'Master':
      return '#c084fc';
  }
}
