import type {
  GameMode,
  LevelDefinition,
  RacerConfig,
  RacerState,
  StandingEntry,
  UfoChassisVariant,
  UfoHandlingSpec,
} from './types';
import type { BakedTrack } from './track';
import { trackToWorld } from './track';

export const UFO_HANDLING_SPECS: Record<UfoChassisVariant, UfoHandlingSpec> = {
  'nova-interceptor': {
    variant: 'nova-interceptor',
    className: 'Nova Interceptor',
    tagline: 'Balanced F1 Aero Saucer',
    speedMult: 1.0,
    steerMult: 1.02,
    hopMult: 1.0,
    dashCooldownMult: 1.0,
    mass: 1.0,
  },
  'apex-blade': {
    variant: 'apex-blade',
    className: 'Apex Blade',
    tagline: 'Razor Gull-Wing Sweeper',
    speedMult: 1.02,
    steerMult: 1.06,
    hopMult: 0.98,
    dashCooldownMult: 0.95,
    mass: 0.96,
  },
  'volt-catamaran': {
    variant: 'volt-catamaran',
    className: 'Volt Catamaran',
    tagline: 'Twin-Prong Electro Racer',
    speedMult: 1.03,
    steerMult: 0.98,
    hopMult: 1.0,
    dashCooldownMult: 0.92,
    mass: 1.04,
  },
  'titan-vanguard': {
    variant: 'titan-vanguard',
    className: 'Titan Vanguard',
    tagline: 'Armored Heavy Cruiser',
    speedMult: 0.99,
    steerMult: 0.95,
    hopMult: 0.96,
    dashCooldownMult: 1.05,
    mass: 1.38,
  },
  'slip-manta': {
    variant: 'slip-manta',
    className: 'Slip Manta',
    tagline: 'Low-Drag Aero Glider',
    speedMult: 1.02,
    steerMult: 1.03,
    hopMult: 1.05,
    dashCooldownMult: 0.98,
    mass: 0.94,
  },
  'drift-halo': {
    variant: 'drift-halo',
    className: 'Celestial Halo',
    tagline: 'Dual-Arc Sky Drifter',
    speedMult: 1.02,
    steerMult: 1.06,
    hopMult: 1.06,
    dashCooldownMult: 0.9,
    mass: 0.95,
  },
  'cryo-prism': {
    variant: 'cryo-prism',
    className: 'Cryo Prism',
    tagline: 'Faceted Ice-Crystal Craft',
    speedMult: 1.01,
    steerMult: 1.08,
    hopMult: 1.04,
    dashCooldownMult: 0.92,
    mass: 0.96,
  },
  'spore-jelly': {
    variant: 'spore-jelly',
    className: 'Bio Jellycraft',
    tagline: 'High-Lift Biolume Glider',
    speedMult: 1.0,
    steerMult: 1.04,
    hopMult: 1.14,
    dashCooldownMult: 0.94,
    mass: 0.92,
  },
  'tri-orbiter': {
    variant: 'tri-orbiter',
    className: 'Tri-Orbiter',
    tagline: 'Triple-Pod Delta Mothership',
    speedMult: 1.03,
    steerMult: 1.01,
    hopMult: 1.04,
    dashCooldownMult: 0.96,
    mass: 1.15,
  },
  'magma-forge': {
    variant: 'magma-forge',
    className: 'Magma Forge',
    tagline: 'Thermal Armored Dreadnought',
    speedMult: 1.04,
    steerMult: 0.97,
    hopMult: 0.98,
    dashCooldownMult: 1.0,
    mass: 1.42,
  },
  'cyber-spinner': {
    variant: 'cyber-spinner',
    className: 'Cyber Striker',
    tagline: 'Dual-Gyro Neon Dash Craft',
    speedMult: 1.03,
    steerMult: 1.07,
    hopMult: 1.03,
    dashCooldownMult: 0.78,
    mass: 0.98,
  },
  'quantum-seraph': {
    variant: 'quantum-seraph',
    className: 'Quantum Seraph',
    tagline: 'Master Lotus-Crown Apex UFO',
    speedMult: 1.05,
    steerMult: 1.07,
    hopMult: 1.1,
    dashCooldownMult: 0.84,
    mass: 1.06,
  },
};

export const PLAYABLE_UFO_VARIANTS: readonly UfoChassisVariant[] = [
  'nova-interceptor',
  'cryo-prism',
  'spore-jelly',
  'tri-orbiter',
  'magma-forge',
  'cyber-spinner',
  'drift-halo',
  'quantum-seraph',
] as const;

export function getUfoHandlingSpec(variant: UfoChassisVariant): UfoHandlingSpec {
  return UFO_HANDLING_SPECS[variant] ?? UFO_HANDLING_SPECS['nova-interceptor'];
}

// Player livery presets per playable UFO class
const PLAYER_LIVERIES: Record<
  UfoChassisVariant,
  { name: string; raceNumber: string; hullColor: number; trimColor: number; glowColor: number }
> = {
  'nova-interceptor': {
    name: 'YOU · NOVA-7',
    raceNumber: '07',
    hullColor: 0xf0f4fa,
    trimColor: 0x06d6d6,
    glowColor: 0x2df9f2,
  },
  'cryo-prism': {
    name: 'YOU · CRYO-2',
    raceNumber: '02',
    hullColor: 0xdff6ff,
    trimColor: 0x0ea5e9,
    glowColor: 0x7efcf7,
  },
  'spore-jelly': {
    name: 'YOU · SPORE-3',
    raceNumber: '03',
    hullColor: 0x164e4a,
    trimColor: 0x34d399,
    glowColor: 0x4ade80,
  },
  'tri-orbiter': {
    name: 'YOU · TRIO-4',
    raceNumber: '04',
    hullColor: 0xede9fe,
    trimColor: 0x8b5cf6,
    glowColor: 0xc084fc,
  },
  'magma-forge': {
    name: 'YOU · FORGE-5',
    raceNumber: '05',
    hullColor: 0x2f2529,
    trimColor: 0xf97316,
    glowColor: 0xffb703,
  },
  'cyber-spinner': {
    name: 'YOU · PULSE-6',
    raceNumber: '06',
    hullColor: 0x1e2236,
    trimColor: 0xf43f5e,
    glowColor: 0x22f2e8,
  },
  'drift-halo': {
    name: 'YOU · AETHER-7',
    raceNumber: '07',
    hullColor: 0xfefce8,
    trimColor: 0xf59e0b,
    glowColor: 0x38bdf8,
  },
  'quantum-seraph': {
    name: 'YOU · SERAPH-8',
    raceNumber: '08',
    hullColor: 0xfaf5ff,
    trimColor: 0xfbbf24,
    glowColor: 0xc084fc,
  },
  'apex-blade': {
    name: 'YOU · APEX-1',
    raceNumber: '01',
    hullColor: 0xdc3535,
    trimColor: 0xffd166,
    glowColor: 0xff5a4f,
  },
  'volt-catamaran': {
    name: 'YOU · VOLT-9',
    raceNumber: '09',
    hullColor: 0xf4a524,
    trimColor: 0x22283a,
    glowColor: 0xffcf48,
  },
  'titan-vanguard': {
    name: 'YOU · TITAN-4',
    raceNumber: '04',
    hullColor: 0x2e64de,
    trimColor: 0xdbe6f6,
    glowColor: 0x5aa7ff,
  },
  'slip-manta': {
    name: 'YOU · MANTA-3',
    raceNumber: '03',
    hullColor: 0x18b37b,
    trimColor: 0xfef08a,
    glowColor: 0x3bf5aa,
  },
};

// Classic Lv1 GP rival roster
const CLASSIC_RIVALS: RacerConfig[] = [
  {
    id: 'ai-apex',
    name: 'ZOR-X · APEX',
    isPlayer: false,
    aiPolicy: 'apex-hunter',
    chassisVariant: 'apex-blade',
    raceNumber: '01',
    hullColor: 0xdc3535,
    trimColor: 0xffd166,
    glowColor: 0xff5a4f,
    skillFactor: 0.88,
    preferredLane: -0.42,
  },
  {
    id: 'ai-bandit',
    name: 'KAI-9 · VOLT',
    isPlayer: false,
    aiPolicy: 'boost-bandit',
    chassisVariant: 'volt-catamaran',
    raceNumber: '09',
    hullColor: 0xf4a524,
    trimColor: 0x22283a,
    glowColor: 0xffcf48,
    skillFactor: 0.85,
    preferredLane: 0.42,
  },
  {
    id: 'ai-bruiser',
    name: 'BORG-4 · TITAN',
    isPlayer: false,
    aiPolicy: 'bruiser',
    chassisVariant: 'titan-vanguard',
    raceNumber: '04',
    hullColor: 0x2e64de,
    trimColor: 0xdbe6f6,
    glowColor: 0x5aa7ff,
    skillFactor: 0.82,
    preferredLane: 0.0,
  },
  {
    id: 'ai-slip',
    name: 'VEGA-3 · DRAFT',
    isPlayer: false,
    aiPolicy: 'slipstream',
    chassisVariant: 'slip-manta',
    raceNumber: '03',
    hullColor: 0x18b37b,
    trimColor: 0xfef08a,
    glowColor: 0x3bf5aa,
    skillFactor: 0.79,
    preferredLane: -0.25,
  },
  {
    id: 'ai-drift',
    name: 'LYRA-8 · DRIFT',
    isPlayer: false,
    aiPolicy: 'drifter',
    chassisVariant: 'drift-halo',
    raceNumber: '08',
    hullColor: 0x8e4ce0,
    trimColor: 0xf9a8d4,
    glowColor: 0xc989ff,
    skillFactor: 0.76,
    preferredLane: 0.32,
  },
];

// Level-specific rival fleets featuring exotic UFO classes per planet & tier!
const LEVEL_RIVAL_FLEETS: Record<number, RacerConfig[]> = {
  1: CLASSIC_RIVALS,
  2: [
    // Glacier Spire: Cryo Crystal UFOs debut alongside sleek interceptors
    {
      id: 'ai-gl-1',
      name: 'GLACIA-1 · PRISM',
      isPlayer: false,
      aiPolicy: 'apex-hunter',
      chassisVariant: 'cryo-prism',
      raceNumber: '11',
      hullColor: 0x38bdf8,
      trimColor: 0xe0f2fe,
      glowColor: 0x7efcf7,
      skillFactor: 0.88,
      preferredLane: -0.44,
    },
    {
      id: 'ai-gl-2',
      name: 'SHARD-5 · FROST',
      isPlayer: false,
      aiPolicy: 'boost-bandit',
      chassisVariant: 'cryo-prism',
      raceNumber: '15',
      hullColor: 0x818cf8,
      trimColor: 0xf0f9ff,
      glowColor: 0x67e8f9,
      skillFactor: 0.85,
      preferredLane: 0.44,
    },
    CLASSIC_RIVALS[2], // Titan Vanguard
    CLASSIC_RIVALS[3], // Slip Manta
    CLASSIC_RIVALS[0], // Apex Blade
  ],
  3: [
    // Biolume Jungle: Organic Bioluminescent Jellycraft squadron
    {
      id: 'ai-bio-1',
      name: 'LUMINA-3 · JELLY',
      isPlayer: false,
      aiPolicy: 'drifter',
      chassisVariant: 'spore-jelly',
      raceNumber: '21',
      hullColor: 0x0f766e,
      trimColor: 0x5eead4,
      glowColor: 0x2df9f2,
      skillFactor: 0.88,
      preferredLane: -0.38,
    },
    {
      id: 'ai-bio-2',
      name: 'MYCEL-6 · SPORE',
      isPlayer: false,
      aiPolicy: 'slipstream',
      chassisVariant: 'spore-jelly',
      raceNumber: '26',
      hullColor: 0x6d28d9,
      trimColor: 0xf472b6,
      glowColor: 0xe879f9,
      skillFactor: 0.85,
      preferredLane: 0.38,
    },
    {
      id: 'ai-bio-3',
      name: 'VERDANT · MANTA',
      isPlayer: false,
      aiPolicy: 'apex-hunter',
      chassisVariant: 'slip-manta',
      raceNumber: '23',
      hullColor: 0x10b981,
      trimColor: 0xfef08a,
      glowColor: 0x4ade80,
      skillFactor: 0.82,
      preferredLane: -0.15,
    },
    {
      id: 'ai-bio-4',
      name: 'CRYO-7 · SHARD',
      isPlayer: false,
      aiPolicy: 'boost-bandit',
      chassisVariant: 'cryo-prism',
      raceNumber: '27',
      hullColor: 0x22d3ee,
      trimColor: 0xecfeff,
      glowColor: 0x67e8f9,
      skillFactor: 0.79,
      preferredLane: 0.28,
    },
    CLASSIC_RIVALS[4], // Drift Halo
  ],
  4: [
    // Nebula Ridge: Triple-Pod Tri-Orbiter Mothership Scouts!
    {
      id: 'ai-neb-1',
      name: 'TRION-X · DELTA',
      isPlayer: false,
      aiPolicy: 'apex-hunter',
      chassisVariant: 'tri-orbiter',
      raceNumber: '31',
      hullColor: 0x9333ea,
      trimColor: 0xfbbf24,
      glowColor: 0xd8b4fe,
      skillFactor: 0.89,
      preferredLane: -0.4,
    },
    {
      id: 'ai-neb-2',
      name: 'ORION-3 · TRIAD',
      isPlayer: false,
      aiPolicy: 'boost-bandit',
      chassisVariant: 'tri-orbiter',
      raceNumber: '33',
      hullColor: 0xec4899,
      trimColor: 0x67e8f9,
      glowColor: 0xf9a8d4,
      skillFactor: 0.86,
      preferredLane: 0.4,
    },
    {
      id: 'ai-neb-3',
      name: 'NYX-9 · JELLY',
      isPlayer: false,
      aiPolicy: 'drifter',
      chassisVariant: 'spore-jelly',
      raceNumber: '39',
      hullColor: 0x312e81,
      trimColor: 0x38bdf8,
      glowColor: 0x818cf8,
      skillFactor: 0.83,
      preferredLane: 0.0,
    },
    CLASSIC_RIVALS[1], // Volt Catamaran
    CLASSIC_RIVALS[4], // Drift Halo
  ],
  5: [
    // Obsidian Caldera: Armored Magma Forge Dreadnoughts
    {
      id: 'ai-vol-1',
      name: 'VULCAN-1 · FORGE',
      isPlayer: false,
      aiPolicy: 'bruiser',
      chassisVariant: 'magma-forge',
      raceNumber: '41',
      hullColor: 0x291c20,
      trimColor: 0xff5722,
      glowColor: 0xff9f1c,
      skillFactor: 0.89,
      preferredLane: 0.0,
    },
    {
      id: 'ai-vol-2',
      name: 'PYRO-5 · CRUCIBLE',
      isPlayer: false,
      aiPolicy: 'apex-hunter',
      chassisVariant: 'magma-forge',
      raceNumber: '45',
      hullColor: 0x7f1d1d,
      trimColor: 0xfbbf24,
      glowColor: 0xff6b2b,
      skillFactor: 0.86,
      preferredLane: -0.42,
    },
    {
      id: 'ai-vol-3',
      name: 'EMBER · TRIAD',
      isPlayer: false,
      aiPolicy: 'boost-bandit',
      chassisVariant: 'tri-orbiter',
      raceNumber: '48',
      hullColor: 0x451a03,
      trimColor: 0xf97316,
      glowColor: 0xfde047,
      skillFactor: 0.83,
      preferredLane: 0.42,
    },
    CLASSIC_RIVALS[0], // Apex Blade
    CLASSIC_RIVALS[2], // Titan Vanguard
  ],
  6: [
    // Neon Megacity: Dual-Gyro Cyber Strikers!
    {
      id: 'ai-cyb-1',
      name: 'KINETIC · CYBER',
      isPlayer: false,
      aiPolicy: 'boost-bandit',
      chassisVariant: 'cyber-spinner',
      raceNumber: '61',
      hullColor: 0x111827,
      trimColor: 0xec4899,
      glowColor: 0x2df9f2,
      skillFactor: 0.9,
      preferredLane: -0.45,
    },
    {
      id: 'ai-cyb-2',
      name: 'SYNTH-7 · GYRO',
      isPlayer: false,
      aiPolicy: 'apex-hunter',
      chassisVariant: 'cyber-spinner',
      raceNumber: '67',
      hullColor: 0x1e1b4b,
      trimColor: 0x22d3ee,
      glowColor: 0xf472b6,
      skillFactor: 0.87,
      preferredLane: 0.45,
    },
    {
      id: 'ai-cyb-3',
      name: 'VECTOR · TRIAD',
      isPlayer: false,
      aiPolicy: 'slipstream',
      chassisVariant: 'tri-orbiter',
      raceNumber: '63',
      hullColor: 0x0f172a,
      trimColor: 0xfacc15,
      glowColor: 0x38bdf8,
      skillFactor: 0.84,
      preferredLane: -0.2,
    },
    {
      id: 'ai-cyb-4',
      name: 'IRON · FORGE',
      isPlayer: false,
      aiPolicy: 'bruiser',
      chassisVariant: 'magma-forge',
      raceNumber: '64',
      hullColor: 0x27272a,
      trimColor: 0xfb7185,
      glowColor: 0xf97316,
      skillFactor: 0.81,
      preferredLane: 0.15,
    },
    CLASSIC_RIVALS[1], // Volt Catamaran
  ],
  7: [
    // Aether Ringway: Celestial Halo Aces & early Quantum Seraph prototype
    {
      id: 'ai-ae-1',
      name: 'SOLARIS · SERAPH',
      isPlayer: false,
      aiPolicy: 'apex-hunter',
      chassisVariant: 'quantum-seraph',
      raceNumber: '71',
      hullColor: 0xfef9c3,
      trimColor: 0xf59e0b,
      glowColor: 0x38bdf8,
      skillFactor: 0.9,
      preferredLane: -0.4,
    },
    {
      id: 'ai-ae-2',
      name: 'AURORA · HALO',
      isPlayer: false,
      aiPolicy: 'drifter',
      chassisVariant: 'drift-halo',
      raceNumber: '74',
      hullColor: 0xf8fafc,
      trimColor: 0x38bdf8,
      glowColor: 0xfde047,
      skillFactor: 0.87,
      preferredLane: 0.4,
    },
    {
      id: 'ai-ae-3',
      name: 'ZENITH · CYBER',
      isPlayer: false,
      aiPolicy: 'boost-bandit',
      chassisVariant: 'cyber-spinner',
      raceNumber: '77',
      hullColor: 0x1e293b,
      trimColor: 0xfbbf24,
      glowColor: 0x7efcf7,
      skillFactor: 0.84,
      preferredLane: 0.0,
    },
    {
      id: 'ai-ae-4',
      name: 'CRYSTAL · PRISM',
      isPlayer: false,
      aiPolicy: 'slipstream',
      chassisVariant: 'cryo-prism',
      raceNumber: '72',
      hullColor: 0xe0f2fe,
      trimColor: 0x0284c7,
      glowColor: 0x38bdf8,
      skillFactor: 0.81,
      preferredLane: -0.25,
    },
    {
      id: 'ai-ae-5',
      name: 'ASTRAL · JELLY',
      isPlayer: false,
      aiPolicy: 'drifter',
      chassisVariant: 'spore-jelly',
      raceNumber: '79',
      hullColor: 0x3b0764,
      trimColor: 0xfde047,
      glowColor: 0xc084fc,
      skillFactor: 0.79,
      preferredLane: 0.25,
    },
  ],
  8: [
    // Quantum Prism Finale: All-Star Exotic Master Fleet!
    {
      id: 'ai-qm-1',
      name: 'OMEGA · SERAPH',
      isPlayer: false,
      aiPolicy: 'apex-hunter',
      chassisVariant: 'quantum-seraph',
      raceNumber: '88',
      hullColor: 0x311042,
      trimColor: 0xfbbf24,
      glowColor: 0x2df9f2,
      skillFactor: 0.91,
      preferredLane: -0.42,
    },
    {
      id: 'ai-qm-2',
      name: 'HYPERION · CYBER',
      isPlayer: false,
      aiPolicy: 'boost-bandit',
      chassisVariant: 'cyber-spinner',
      raceNumber: '82',
      hullColor: 0x0f172a,
      trimColor: 0xc084fc,
      glowColor: 0xf472b6,
      skillFactor: 0.88,
      preferredLane: 0.42,
    },
    {
      id: 'ai-qm-3',
      name: 'KRONOS · FORGE',
      isPlayer: false,
      aiPolicy: 'bruiser',
      chassisVariant: 'magma-forge',
      raceNumber: '84',
      hullColor: 0x1f1426,
      trimColor: 0xf59e0b,
      glowColor: 0xff5964,
      skillFactor: 0.85,
      preferredLane: 0.0,
    },
    {
      id: 'ai-qm-4',
      name: 'NEXUS · TRIAD',
      isPlayer: false,
      aiPolicy: 'slipstream',
      chassisVariant: 'tri-orbiter',
      raceNumber: '86',
      hullColor: 0x172554,
      trimColor: 0x38bdf8,
      glowColor: 0x67e8f9,
      skillFactor: 0.83,
      preferredLane: -0.25,
    },
    {
      id: 'ai-qm-5',
      name: 'NEBULA · JELLY',
      isPlayer: false,
      aiPolicy: 'drifter',
      chassisVariant: 'spore-jelly',
      raceNumber: '89',
      hullColor: 0x064e3b,
      trimColor: 0x34d399,
      glowColor: 0xa7f3d0,
      skillFactor: 0.81,
      preferredLane: 0.3,
    },
  ],
};

export function buildPlayerRacerConfig(variant: UfoChassisVariant): RacerConfig {
  const livery = PLAYER_LIVERIES[variant] ?? PLAYER_LIVERIES['nova-interceptor'];
  return {
    id: 'player',
    name: livery.name,
    isPlayer: true,
    chassisVariant: variant,
    raceNumber: livery.raceNumber,
    hullColor: livery.hullColor,
    trimColor: livery.trimColor,
    glowColor: livery.glowColor,
    skillFactor: 1.0,
    preferredLane: 0,
  };
}

/**
 * Returns the 6-UFO racer lineup for a given level number, pairing the level's featured
 * (or user-selected) player UFO with a level-specific exotic rival squadron.
 */
export function getLevelRoster(
  levelNumber: number,
  featuredPlayerChassis: UfoChassisVariant = 'nova-interceptor',
  playerChassisOverride?: UfoChassisVariant | null,
): RacerConfig[] {
  const activePlayerVariant = playerChassisOverride ?? featuredPlayerChassis;
  const playerCfg = buildPlayerRacerConfig(activePlayerVariant);
  const rivals = LEVEL_RIVAL_FLEETS[levelNumber] ?? CLASSIC_RIVALS;
  return [playerCfg, ...rivals];
}

export const RACER_ROSTER: RacerConfig[] = getLevelRoster(1, 'nova-interceptor');

export const CHECKPOINT_PROGRESS = [0.25, 0.5, 0.75] as const;

export function createInitialRacers(
  track: BakedTrack,
  level?: LevelDefinition,
  gameMode: GameMode = 'race',
  playerChassisOverride?: UfoChassisVariant | null,
): RacerState[] {
  // Spacious starting grid on the wider track: player starts P4 center so 3 rivals are ahead and 2 flank behind!
  const playerSlot = { t: 0.997, lateral: 0 };
  const rivalSlots = [
    { t: 0.005, lateral: -6.4 },
    { t: 0.004, lateral: 6.4 },
    { t: 0.001, lateral: -6.0 },
    { t: 0.995, lateral: 6.4 },
    { t: 0.994, lateral: -6.6 },
  ];

  const aiPaceScale = level ? level.aiPaceScale : 1.0;
  const levelNum = level ? level.number : 1;
  const featured = level ? level.featuredPlayerChassis : 'nova-interceptor';
  const fullRoster = getLevelRoster(levelNum, featured, playerChassisOverride);
  const roster = gameMode === 'free' ? fullRoster.slice(0, 1) : fullRoster;

  let rivalIdx = 0;
  return roster.map((cfg) => {
    const slot = cfg.isPlayer ? playerSlot : rivalSlots[rivalIdx++] ?? playerSlot;
    const startsBehind = slot.t > 0.5;
    const initialProgress = startsBehind ? slot.t - 1 : slot.t;
    const world = trackToWorld(track, slot.t, slot.lateral, 1.35);
    const yaw = Math.atan2(world.frame.tangent.x, world.frame.tangent.z);
    // Scale rival skill with level difficulty while keeping Easy Level 1 super welcoming
    const effectiveSkill = cfg.isPlayer
      ? 1.0
      : Math.min(0.995, Math.max(0.56, cfg.skillFactor * aiPaceScale));

    return {
      id: cfg.id,
      name: cfg.name,
      isPlayer: cfg.isPlayer,
      aiPolicy: cfg.aiPolicy,
      chassisVariant: cfg.chassisVariant,
      hullColor: cfg.hullColor,
      glowColor: cfg.glowColor,
      skillFactor: effectiveSkill,
      preferredLane: cfg.preferredLane,
      t: slot.t,
      lateral: slot.lateral,
      hoverY: 0,
      vy: 0,
      speed: 0,
      lateralVel: 0,
      headingOffset: 0,
      rollAngle: 0,
      pitchAngle: 0,
      spinPhase: Math.random() * Math.PI * 2,
      boostEnergy: gameMode === 'free' ? 100 : 80,
      isBoosting: false,
      boostPadTimer: 0,
      hopCooldown: 0,
      hopBufferTimer: 0,
      dashCooldown: 0,
      rampCooldown: 0,
      updraftCooldown: 0,
      warpCooldown: 0,
      bumperCooldown: 0,
      gateCooldown: 0,
      hitFlashTimer: 0,
      shockSlowTimer: 0,
      squashX: 1,
      squashY: 1,
      impactTimer: 0,
      impactDuration: 0.42,
      impactDir: 0,
      impactStrength: 0,
      impactType: 'none',
      wobblePhase: 0,
      bumpCooldown: 0,
      lap: 1,
      maxCheckpoint: 0,
      totalProgress: initialProgress,
      finished: false,
      finishTime: null,
      lapStartTime: 0,
      bestLapTime: null,
      ringsCollected: 0,
      styleScore: 0,
      aiTargetLane: slot.lateral,
      aiDecisionTimer: 0.3 + Math.random() * 0.35,
      aiBoostBurstTimer: 0,
      worldX: world.pos.x,
      worldY: world.pos.y,
      worldZ: world.pos.z,
      worldYaw: yaw,
    };
  });
}

export interface LapUpdateEvent {
  checkpointReached: number | null; // 1, 2, or 3 when newly crossed
  lapCompleted: boolean;
  newLap: number;
  finishedRace: boolean;
  lapDuration: number | null;
}

/**
 * Updates checkpoint gating and lap progression when a racer moves from prevT to nextT.
 * Generous full-width checkpoint zones at 0.25, 0.50, 0.75 always register smoothly while
 * preventing reverse-crossing lap cheats.
 */
export function advanceLapProgress(
  racer: RacerState,
  prevT: number,
  nextT: number,
  raceTime: number,
  totalLaps: number,
): LapUpdateEvent {
  let checkpointReached: number | null = null;

  // Wide, reliable checkpoint windows spanning full track width
  if (racer.maxCheckpoint === 0 && nextT >= 0.23 && nextT < 0.52) {
    racer.maxCheckpoint = 1;
    checkpointReached = 1;
  } else if (racer.maxCheckpoint === 1 && nextT >= 0.48 && nextT < 0.77) {
    racer.maxCheckpoint = 2;
    checkpointReached = 2;
  } else if (racer.maxCheckpoint === 2 && nextT >= 0.73 && nextT < 0.98) {
    racer.maxCheckpoint = 3;
    checkpointReached = 3;
  }

  let lapCompleted = false;
  let finishedRace = false;
  let lapDuration: number | null = null;

  // Detect forward crossing of finish line (prevT > 0.80 -> nextT < 0.20)
  const crossedForward = prevT > 0.8 && nextT < 0.2;
  if (crossedForward && racer.maxCheckpoint >= 3 && !racer.finished) {
    lapDuration = Math.max(0.1, raceTime - racer.lapStartTime);
    if (racer.bestLapTime === null || lapDuration < racer.bestLapTime) {
      racer.bestLapTime = lapDuration;
    }
    racer.lapStartTime = raceTime;
    racer.maxCheckpoint = 0;
    lapCompleted = true;

    if (racer.lap >= totalLaps) {
      racer.finished = true;
      racer.finishTime = raceTime;
      finishedRace = true;
    } else {
      racer.lap += 1;
    }
  }

  // Compute monotonic totalProgress for accurate ranking
  if (racer.finished) {
    racer.totalProgress =
      totalLaps + 1 + Math.max(0, 1000 - (racer.finishTime ?? raceTime)) * 0.0001;
  } else if (racer.lap === 1 && racer.maxCheckpoint === 0 && nextT > 0.8) {
    racer.totalProgress = nextT - 1;
  } else {
    racer.totalProgress = (racer.lap - 1) + nextT;
  }

  return {
    checkpointReached,
    lapCompleted,
    newLap: racer.lap,
    finishedRace,
    lapDuration,
  };
}

export function computeStandings(racers: RacerState[]): StandingEntry[] {
  const sorted = [...racers].sort((a, b) => {
    if (a.finished && b.finished) {
      return (a.finishTime ?? Infinity) - (b.finishTime ?? Infinity);
    }
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.totalProgress - a.totalProgress;
  });

  return sorted.map((r, index) => ({
    id: r.id,
    name: r.name,
    isPlayer: r.isPlayer,
    chassisVariant: r.chassisVariant,
    rank: index + 1,
    finished: r.finished,
    finishTime: r.finishTime,
    bestLapTime: r.bestLapTime,
    ringsCollected: r.ringsCollected,
    hullColorHex: `#${r.hullColor.toString(16).padStart(6, '0')}`,
  }));
}

export function getRacerRank(racers: RacerState[], racerId: string): number {
  const standings = computeStandings(racers);
  const entry = standings.find((s) => s.id === racerId);
  return entry ? entry.rank : racers.length;
}

export function formatRaceTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const tenths = Math.floor((safe * 10) % 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

export function formatOrdinal(rank: number): string {
  if (rank === 1) return '1ST';
  if (rank === 2) return '2ND';
  if (rank === 3) return '3RD';
  return `${rank}TH`;
}
