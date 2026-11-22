import type { RacerConfig, RacerState, StandingEntry } from './types';
import type { BakedTrack } from './track';
import { trackToWorld } from './track';

export const RACER_ROSTER: RacerConfig[] = [
  {
    id: 'player',
    name: 'YOU · NOVA-7',
    isPlayer: true,
    chassisVariant: 'nova-interceptor',
    raceNumber: '07',
    hullColor: 0xf0f4fa, // Pearlescent titanium white
    trimColor: 0x06d6d6, // Turquoise plasma trim
    glowColor: 0x2df9f2,
    skillFactor: 1.0,
    preferredLane: 0,
  },
  {
    id: 'ai-apex',
    name: 'ZOR-X · APEX',
    isPlayer: false,
    aiPolicy: 'apex-hunter',
    chassisVariant: 'apex-blade',
    raceNumber: '01',
    hullColor: 0xdc3535, // Racing crimson metallic
    trimColor: 0xffd166, // Brushed gold strakes
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
    hullColor: 0xf4a524, // Solar amber metallic
    trimColor: 0x22283a, // Carbon graphite
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
    hullColor: 0x2e64de, // Cobalt alloy armor
    trimColor: 0xdbe6f6, // Titanium silver plating
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
    hullColor: 0x18b37b, // Emerald aero alloy
    trimColor: 0xfef08a, // Acid lime accent
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
    hullColor: 0x8e4ce0, // Ultraviolet chrome
    trimColor: 0xf9a8d4, // Rose gold halo accents
    glowColor: 0xc989ff,
    skillFactor: 0.76,
    preferredLane: 0.32,
  },
];

export const CHECKPOINT_PROGRESS = [0.25, 0.5, 0.75] as const;

export function createInitialRacers(
  track: BakedTrack,
  level?: import('./types').LevelDefinition,
  gameMode: import('./types').GameMode = 'race',
): RacerState[] {
  // Spacious starting grid on the wider track: player starts P4 center so 3 rivals are ahead and 2 flank behind!
  const playerSlot = { t: 0.996, lateral: 0 };
  const rivalSlots = [
    { t: 0.008, lateral: -6.2 },
    { t: 0.006, lateral: 6.2 },
    { t: 0.001, lateral: -5.8 },
    { t: 0.993, lateral: 6.2 },
    { t: 0.991, lateral: -6.4 },
  ];

  const aiPaceScale = level ? level.aiPaceScale : 1.0;
  const roster = gameMode === 'free' ? RACER_ROSTER.slice(0, 1) : RACER_ROSTER;

  let rivalIdx = 0;
  return roster.map((cfg) => {
    const slot = cfg.isPlayer ? playerSlot : rivalSlots[rivalIdx++] ?? playerSlot;
    const startsBehind = slot.t > 0.5;
    const initialProgress = startsBehind ? slot.t - 1 : slot.t;
    const world = trackToWorld(track, slot.t, slot.lateral, 1.35);
    const yaw = Math.atan2(world.frame.tangent.x, world.frame.tangent.z);
    // Scale rival skill with level difficulty while keeping player fair & competitive
    const effectiveSkill = cfg.isPlayer
      ? 1.0
      : Math.min(0.995, Math.max(0.65, cfg.skillFactor * aiPaceScale));

    return {
      id: cfg.id,
      name: cfg.name,
      isPlayer: cfg.isPlayer,
      aiPolicy: cfg.aiPolicy,
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
