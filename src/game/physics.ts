import type {
  GameMode,
  LevelDefinition,
  PlayerInput,
  RacerState,
  ShockHazardDef,
  TrackObstacleDef,
} from './types';
import type { BakedTrack } from './track';
import {
  sampleTrackFrame,
  shortestProgressDelta,
  trackToWorld,
  wrapProgress,
} from './track';
import { advanceLapProgress, getUfoHandlingSpec } from './raceRules';
import { getLevelDefinition } from './levels';

export const PHYSICS_CONSTANTS = {
  baseHoverHeight: 1.35,
  maxBaseSpeed: 82, // Player crisp high cruise speed
  boostExtraSpeed: 36,
  padExtraSpeed: 40,
  accelRate: 56, // Snappy smooth launch
  brakeRate: 62,
  coastDrag: 9.5, // Smooth glide when lifting throttle
  steerAccel: 138, // Direct responsive steering paired with high damping for zero slide-out
  lateralDrag: 9.4, // Quickly settles onto your chosen lane on key release
  maxLateralSpeed: 22.0, // Controlled lane precision across variable 28m–54m roads
  boostDrainPerSec: 28,
  boostPassiveRegen: 9.5,
  hopInitialVel: 15.6,
  hopGravity: 33,
  glideGravityScale: 0.36, // Holding Shift while airborne engages smooth anti-grav glide
  hopCooldownDuration: 0.56,
  hopBufferDuration: 0.16,
  dashImpulse: 22.5,
  dashCooldownDuration: 0.68,
  ufoRadius: 2.35,
  speedDisplayScale: 5.8,
};

export type HazardPhase = 'idle' | 'telegraph' | 'active';

export function getHazardPhase(
  hazard: ShockHazardDef,
  raceTime: number,
  cycleSpeed = 1.0,
): { phase: HazardPhase; progress: number } {
  const effectiveSpeed = Math.max(0.5, cycleSpeed);
  const cycle = Math.max(1.4, hazard.cycleDuration / effectiveSpeed);
  const local = ((raceTime + hazard.phaseOffset) % cycle + cycle) % cycle;
  const norm = local / cycle;
  // Slightly tighter idle window at higher difficulty speeds while keeping telegraph crystal-clear
  const idleEnd = Math.max(0.46, 0.58 - (effectiveSpeed - 0.8) * 0.12);
  const teleEnd = Math.min(0.84, idleEnd + 0.22);
  if (norm < idleEnd) {
    return { phase: 'idle', progress: norm / idleEnd };
  }
  if (norm < teleEnd) {
    return { phase: 'telegraph', progress: (norm - idleEnd) / (teleEnd - idleEnd) };
  }
  return { phase: 'active', progress: (norm - teleEnd) / (1 - teleEnd) };
}

/**
 * Returns the live lateral position of a static or sweeping EMP barrier at raceTime.
 */
export function getHazardLateral(
  hazard: ShockHazardDef,
  raceTime: number,
  cycleSpeed = 1.0,
): number {
  const amp = hazard.moveAmplitude ?? 0;
  if (amp <= 0.01) return hazard.lateral;
  const speed = (hazard.moveSpeed ?? 1.1) * Math.max(0.65, Math.min(1.45, cycleSpeed));
  return hazard.lateral + Math.sin(raceTime * speed + hazard.phaseOffset) * amp;
}

/**
 * Returns the live lateral position of a static or patrolling track obstacle at raceTime.
 */
export function getObstacleLateral(
  obstacle: TrackObstacleDef,
  raceTime: number,
): number {
  const amp = obstacle.moveAmplitude ?? 0;
  if (amp <= 0.01) return obstacle.lateral;
  const speed = obstacle.moveSpeed ?? 1.0;
  const phase = obstacle.phaseOffset ?? 0;
  return obstacle.lateral + Math.sin(raceTime * speed + phase) * amp;
}

export function isProgressInRange(t: number, tStart: number, tEnd: number): boolean {
  return tStart <= tEnd ? t >= tStart && t <= tEnd : t >= tStart || t <= tEnd;
}

export function sampleIcePatch(track: BakedTrack, t: number, lateral: number) {
  const patches = track.def.icePatches;
  if (!patches || patches.length === 0) return null;
  for (let i = 0; i < patches.length; i++) {
    const patch = patches[i];
    if (
      isProgressInRange(t, patch.tStart, patch.tEnd) &&
      Math.abs(lateral - patch.lateral) <= patch.width * 0.54
    ) {
      return patch;
    }
  }
  return null;
}

export function sampleWindZone(track: BakedTrack, t: number) {
  const zones = track.def.windZones;
  if (!zones || zones.length === 0) return null;
  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i];
    if (isProgressInRange(t, zone.tStart, zone.tEnd)) {
      return zone;
    }
  }
  return null;
}

export function sampleNectarStream(track: BakedTrack, t: number, lateral: number) {
  const streams = track.def.nectarStreams;
  if (!streams || streams.length === 0) return null;
  for (let i = 0; i < streams.length; i++) {
    const stream = streams[i];
    if (
      isProgressInRange(t, stream.tStart, stream.tEnd) &&
      Math.abs(lateral - stream.lateral) <= stream.width * 0.54
    ) {
      return stream;
    }
  }
  return null;
}

export function sampleLowGravityZone(track: BakedTrack, t: number, lateral: number) {
  const zones = track.def.lowGravityZones;
  if (!zones || zones.length === 0) return null;
  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i];
    if (
      isProgressInRange(t, zone.tStart, zone.tEnd) &&
      Math.abs(lateral - zone.lateral) <= zone.width * 0.56
    ) {
      return zone;
    }
  }
  return null;
}

export interface PhysicsEvent {
  type:
    | 'boost-start'
    | 'boost-pad'
    | 'ramp-launch'
    | 'updraft-lift'
    | 'warp-surge'
    | 'slingshot-gate'
    | 'bumper-bounce'
    | 'crystal-shatter'
    | 'ice-glide'
    | 'spore-bounce'
    | 'pollen-burst'
    | 'nectar-surge'
    | 'zero-g-zone'
    | 'gravity-slingshot'
    | 'star-core-nova'
    | 'obstacle-hit'
    | 'side-dash'
    | 'ring-pickup'
    | 'checkpoint'
    | 'hop'
    | 'land'
    | 'wall-scrape'
    | 'shock-hit'
    | 'ufo-bump'
    | 'lap-complete'
    | 'race-finish';
  racerId: string;
  isPlayer: boolean;
  worldX: number;
  worldY: number;
  worldZ: number;
  intensity: number;
  // Directional lateral impact sign (-1 hit from left, +1 hit from right) & world normal for sparks/recoil
  impactDir?: number;
  normalX?: number;
  normalY?: number;
  normalZ?: number;
  ringId?: string;
  obstacleId?: string;
  checkpointIndex?: number;
  newLap?: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

function triggerImpactAnimation(
  racer: RacerState,
  type: 'ufo-bump' | 'wall-scrape' | 'shock-hit',
  dir: number,
  strength: number,
  duration: number,
): void {
  racer.impactType = type;
  racer.impactDir = dir;
  racer.impactStrength = clamp(strength, 0.25, 1.0);
  racer.impactDuration = duration;
  racer.impactTimer = duration;
  racer.wobblePhase = 0;
}

/**
 * Computes steering, throttle, boost, and hop inputs for an AI rival based on its distinct policy,
 * variable track widths, jump ramps, moving hazards, and the active level's difficulty knobs.
 */
export function computeAiInput(
  racer: RacerState,
  allRacers: RacerState[],
  track: BakedTrack,
  raceTime: number,
  dt: number,
  playerProgress: number,
  level: LevelDefinition = getLevelDefinition(1),
): PlayerInput {
  const lookAheadT = wrapProgress(racer.t + 0.032);
  const aheadFrame = sampleTrackFrame(track, lookAheadT);
  const halfSafe = aheadFrame.width * 0.5 - 3.8;

  racer.aiDecisionTimer -= dt;
  if (racer.aiBoostBurstTimer > 0) {
    racer.aiBoostBurstTimer = Math.max(0, racer.aiBoostBurstTimer - dt);
  }

  let throttle = 0.96;
  let boostHeld = false;
  let hopJustPressed = false;

  // Launch ramp tightens across levels (gentle 2.5s on Lv1 -> crisp 1.85s Standard -> sharp 1.35s Challenger -> snappy 0.8s Lv8)
  const isEasyMap = level.tier === 'Easy';
  const isStandardMap = level.tier === 'Standard';
  const isChallengerMap = level.tier === 'Challenger';
  const rampSec = Math.max(0.5, level.aiLaunchRampSec);
  const launchFloor = isEasyMap ? 0.44 : isStandardMap ? 0.56 : isChallengerMap ? 0.62 : 0.64;
  const launchScale = clamp(launchFloor + (raceTime / rampSec) * (1 - launchFloor), launchFloor, 1.0);

  // Level-aware rubber-banding:
  // Easy = welcoming; Standard = lively fair pack; Challenger = crisp tactical pressure without unfair runaway!
  const gapToPlayer = racer.totalProgress - playerProgress;
  const highTierFactor = clamp((level.number - 1) / 7, 0, 1);
  let paceAdjust = 1.0;
  if (isEasyMap) {
    if (gapToPlayer > 0.06) {
      paceAdjust = 0.76;
    } else if (gapToPlayer > 0.025) {
      paceAdjust = 0.86;
    } else if (gapToPlayer < -0.22) {
      paceAdjust = 1.01;
    }
  } else if (isStandardMap) {
    if (gapToPlayer > 0.085) {
      paceAdjust = 0.85;
    } else if (gapToPlayer > 0.04) {
      paceAdjust = 0.93;
    } else if (gapToPlayer < -0.14) {
      paceAdjust = 1.05;
    } else if (gapToPlayer < -0.05) {
      paceAdjust = 1.02;
    }
  } else if (isChallengerMap) {
    if (gapToPlayer > 0.095) {
      paceAdjust = 0.88;
    } else if (gapToPlayer > 0.05) {
      paceAdjust = 0.95;
    } else if (gapToPlayer < -0.12) {
      paceAdjust = 1.07;
    } else if (gapToPlayer < -0.04) {
      paceAdjust = 1.03;
    }
  } else if (gapToPlayer > 0.09) {
    paceAdjust = 0.83 + highTierFactor * 0.1;
  } else if (gapToPlayer > 0.04) {
    paceAdjust = 0.91 + highTierFactor * 0.06;
  } else if (gapToPlayer < -0.16) {
    paceAdjust = 1.03 + highTierFactor * 0.05;
  }

  const boostAggro = level.aiBoostAggression;
  const boostThresholdOffset = (1 - boostAggro) * 20;
  const burstScale = clamp(boostAggro, 0.35, 1.38);
  const canBoostAhead = isEasyMap
    ? gapToPlayer < -0.01
    : isStandardMap
    ? gapToPlayer < 0.035
    : isChallengerMap
    ? gapToPlayer < 0.055
    : true;

  if (racer.aiDecisionTimer <= 0) {
    racer.aiDecisionTimer = Math.max(
      0.16,
      (isChallengerMap ? 0.28 : 0.38 - highTierFactor * 0.12) + Math.random() * 0.2,
    );
    const policy = racer.aiPolicy ?? 'apex-hunter';

    if (policy === 'apex-hunter') {
      const apexSide = aheadFrame.curvature > 0.01 ? 1 : aheadFrame.curvature < -0.01 ? -1 : 0;
      racer.aiTargetLane =
        apexSide !== 0 ? apexSide * halfSafe * 0.58 : racer.preferredLane * halfSafe * 0.5;
      if (
        canBoostAhead &&
        Math.abs(aheadFrame.curvature) < 0.022 &&
        racer.boostEnergy > 62 + boostThresholdOffset &&
        gapToPlayer < 0.06 + highTierFactor * 0.04
      ) {
        racer.aiBoostBurstTimer = 0.45 * burstScale;
      }
    } else if (policy === 'boost-bandit') {
      let bestTargetDist = 0.13;
      let targetLane: number | null = null;
      for (const pad of track.def.boostPads) {
        const d = shortestProgressDelta(racer.t, pad.t);
        if (d > 0.005 && d < bestTargetDist) {
          bestTargetDist = d;
          targetLane = pad.lateral;
        }
      }
      for (const ramp of track.def.jumpRamps) {
        const d = shortestProgressDelta(racer.t, ramp.t);
        if (d > 0.005 && d < bestTargetDist) {
          bestTargetDist = d;
          targetLane = ramp.lateral;
        }
      }
      for (const updraft of track.def.updrafts) {
        const d = shortestProgressDelta(racer.t, updraft.t);
        if (d > 0.005 && d < bestTargetDist) {
          bestTargetDist = d;
          targetLane = updraft.lateral;
        }
      }
      racer.aiTargetLane = targetLane !== null ? targetLane : Math.sin(raceTime * 1.2) * halfSafe * 0.5;
      if (
        canBoostAhead &&
        racer.boostEnergy > 52 + boostThresholdOffset &&
        racer.boostPadTimer <= 0 &&
        gapToPlayer < 0.05 + highTierFactor * 0.05
      ) {
        racer.aiBoostBurstTimer = 0.55 * burstScale;
      }
    } else if (policy === 'bruiser') {
      // On Easy maps, bruisers cruise cleanly in their preferred lane instead of aggressively blocking
      if (isEasyMap) {
        racer.aiTargetLane = racer.preferredLane * halfSafe * 0.55;
      } else {
        racer.aiTargetLane = 0;
        for (const other of allRacers) {
          if (other.id === racer.id) continue;
          const d = shortestProgressDelta(other.t, racer.t);
          if (d > 0.006 && d < 0.028) {
            racer.aiTargetLane = clamp(other.lateral * 0.55, -halfSafe * 0.45, halfSafe * 0.45);
            break;
          }
        }
      }
      if (
        canBoostAhead &&
        racer.boostEnergy > 74 + boostThresholdOffset &&
        gapToPlayer < 0.04 + highTierFactor * 0.04
      ) {
        racer.aiBoostBurstTimer = 0.4 * burstScale;
      }
    } else if (policy === 'slipstream') {
      let leadRacer: RacerState | null = null;
      let minD = 0.055;
      for (const other of allRacers) {
        if (other.id === racer.id) continue;
        const d = shortestProgressDelta(racer.t, other.t);
        if (d > 0.006 && d < minD) {
          minD = d;
          leadRacer = other;
        }
      }
      if (leadRacer) {
        if (minD < 0.018) {
          const passSign = leadRacer.lateral >= 0 ? -1 : 1;
          racer.aiTargetLane = clamp(leadRacer.lateral + passSign * 5.2, -halfSafe, halfSafe);
          if (
            canBoostAhead &&
            racer.boostEnergy > 48 + boostThresholdOffset &&
            gapToPlayer < 0.05 + highTierFactor * 0.05
          ) {
            racer.aiBoostBurstTimer = 0.48 * burstScale;
          }
        } else {
          racer.aiTargetLane = leadRacer.lateral;
        }
      } else {
        racer.aiTargetLane = racer.preferredLane * halfSafe * 0.55;
      }
    } else {
      let ringLane: number | null = null;
      let bestRingD = 0.11;
      for (const ring of track.def.rings) {
        const d = shortestProgressDelta(racer.t, ring.t);
        if (d > 0.004 && d < bestRingD) {
          bestRingD = d;
          ringLane = ring.lateral;
        }
      }
      if (ringLane !== null) {
        racer.aiTargetLane = ringLane;
      } else {
        const outerSide = aheadFrame.curvature >= 0 ? -1 : 1;
        racer.aiTargetLane = outerSide * halfSafe * 0.6;
      }
      if (
        canBoostAhead &&
        racer.boostEnergy > 64 + boostThresholdOffset &&
        gapToPlayer < 0.04 + highTierFactor * 0.04
      ) {
        racer.aiBoostBurstTimer = 0.42 * burstScale;
      }
    }
  }

  // Easy-map courtesy: when closely alongside or just ahead of the player, gently yield lateral space
  if (isEasyMap) {
    const player = allRacers.find((r) => r.isPlayer);
    if (player) {
      const dMeters = shortestProgressDelta(player.t, racer.t) * track.totalLength;
      if (dMeters > -8 && dMeters < 24 && Math.abs(racer.lateral - player.lateral) < 7.5) {
        const yieldSide = racer.lateral >= player.lateral ? 1 : -1;
        racer.aiTargetLane = clamp(player.lateral + yieldSide * 9.5, -halfSafe, halfSafe);
      }
    }
  }

  // Active obstacle interaction: dodge solid spires/pillars/stalks/drones, seek Crystals, Pollen, Spore-Pads, Star-Cores & Gravity Wells!
  const obstacles = track.def.obstacles;
  if (obstacles && obstacles.length > 0) {
    for (let oi = 0; oi < obstacles.length; oi++) {
      const ob = obstacles[oi];
      const dMeters = shortestProgressDelta(racer.t, ob.t) * track.totalLength;
      const lookRange = isChallengerMap ? 88 : 78;
      if (dMeters > 4 && dMeters < lookRange) {
        const obLat = getObstacleLateral(ob, raceTime);
        if (
          ob.kind === 'frost-crystal' ||
          ob.kind === 'pollen-orb' ||
          ob.kind === 'spore-pad' ||
          ob.kind === 'star-core' ||
          ob.kind === 'gravity-well'
        ) {
          // Standard+ rivals opportunistically route through smashable cores, spore pads & gravity slingshot wells!
          const seekLat = isChallengerMap ? 12.5 : 9.5;
          const seekDist = isChallengerMap ? 68 : 58;
          if (!isEasyMap && dMeters < seekDist && Math.abs(racer.lateral - obLat) < seekLat) {
            racer.aiTargetLane = clamp(obLat, -halfSafe, halfSafe);
          }
          continue;
        }
        const safeMargin = ob.radius + (ob.kind === 'bumper-orb' ? 3.2 : 5.2);
        if (Math.abs(racer.aiTargetLane - obLat) < safeMargin || Math.abs(racer.lateral - obLat) < safeMargin) {
          // Pick whichever open side has more room on the road
          const leftRoom = halfSafe + obLat;
          const rightRoom = halfSafe - obLat;
          const goRight =
            Math.abs(racer.lateral - obLat) > 1.2
              ? racer.lateral >= obLat
              : rightRoom >= leftRoom;
          const avoidSign = goRight ? 1 : -1;
          racer.aiTargetLane = clamp(obLat + avoidSign * (safeMargin + 3.2), -halfSafe, halfSafe);
        }
      }
    }
  }

  // Dynamic & moving hazard avoidance or hover-hop telegraph reaction (Challenger reacts earlier!)
  const activeHazardLimit = Math.min(track.def.hazards.length, level.hazardCount);
  const hazardLookAhead = isChallengerMap ? 0.036 : 0.028;
  for (let hi = 0; hi < activeHazardLimit; hi++) {
    const hz = track.def.hazards[hi];
    const d = shortestProgressDelta(racer.t, hz.t);
    if (d > 0.002 && d < hazardLookAhead) {
      const { phase } = getHazardPhase(hz, raceTime, level.hazardCycleSpeed);
      const hzLat = getHazardLateral(hz, raceTime, level.hazardCycleSpeed);
      const effWidth = hz.width * level.hazardWidthScale;
      const inPath = Math.abs(racer.lateral - hzLat) < effWidth * 0.58;
      if (inPath && (phase === 'active' || phase === 'telegraph')) {
        if (d < (isChallengerMap ? 0.015 : 0.013) && racer.hopCooldown <= 0 && racer.hoverY < 0.1) {
          hopJustPressed = true;
        } else {
          racer.aiTargetLane = hzLat >= 0 ? -halfSafe * 0.65 : halfSafe * 0.65;
        }
      }
    }
  }

  // Alpine crosswind counter-steering so rivals hold sharp lines through blizzard gusts
  const activeWind = sampleWindZone(track, racer.t);
  const windCounterSteer = activeWind ? clamp(-activeWind.force * 0.012, -0.28, 0.28) : 0;

  const laneError = clamp(racer.aiTargetLane, -halfSafe, halfSafe) - racer.lateral;
  const steerGain = isChallengerMap ? 0.22 : isStandardMap ? 0.2 : 0.18;
  const steer = clamp(laneError * steerGain + windCounterSteer, -0.9, 0.9);

  if (isEasyMap && Math.abs(aheadFrame.curvature) > 0.025) {
    throttle = 0.84;
  } else if (isStandardMap && Math.abs(aheadFrame.curvature) > 0.036) {
    throttle = 0.90;
  } else if (isChallengerMap && Math.abs(aheadFrame.curvature) > 0.042) {
    throttle = 0.93;
  } else if (racer.aiPolicy === 'apex-hunter' && Math.abs(aheadFrame.curvature) > 0.04) {
    throttle = 0.85 + highTierFactor * 0.08;
  }

  const maxAiThrottle = isEasyMap
    ? 0.88
    : isStandardMap
    ? 0.95
    : isChallengerMap
    ? 0.985
    : 0.93 + highTierFactor * 0.07;
  throttle = clamp(throttle * racer.skillFactor * paceAdjust * launchScale, 0.42, maxAiThrottle);
  const boostMinTime = isEasyMap
    ? 4.5
    : isStandardMap
    ? 2.4
    : isChallengerMap
    ? 1.85
    : Math.max(1.2, 2.6 - highTierFactor * 1.2);
  boostHeld =
    canBoostAhead &&
    racer.aiBoostBurstTimer > 0 &&
    racer.boostEnergy > 20 &&
    raceTime > boostMinTime;

  return {
    throttle,
    steer,
    boostHeld,
    hopJustPressed,
    hopHeld: racer.hoverY > 1.8 && racer.vy < 0,
  };
}

export function stepRacerPhysics(
  racer: RacerState,
  input: PlayerInput,
  track: BakedTrack,
  raceTime: number,
  dt: number,
  collectedRingIds: Set<string>,
  events: PhysicsEvent[],
  level: LevelDefinition = getLevelDefinition(1),
  gameMode: GameMode = 'race',
): void {
  const C = PHYSICS_CONSTANTS;
  const spec = getUfoHandlingSpec(racer.chassisVariant);
  const isFree = gameMode === 'free' && racer.isPlayer;
  const speedClass = level.speedClassScale;
  const totalLaps = isFree ? 999 : level.laps;

  // Timers
  if (racer.boostPadTimer > 0) racer.boostPadTimer = Math.max(0, racer.boostPadTimer - dt);
  if (racer.hopCooldown > 0) racer.hopCooldown = Math.max(0, racer.hopCooldown - dt);
  if (racer.dashCooldown > 0) racer.dashCooldown = Math.max(0, racer.dashCooldown - dt);
  if (racer.rampCooldown > 0) racer.rampCooldown = Math.max(0, racer.rampCooldown - dt);
  if (racer.updraftCooldown > 0) racer.updraftCooldown = Math.max(0, racer.updraftCooldown - dt);
  if (racer.warpCooldown > 0) racer.warpCooldown = Math.max(0, racer.warpCooldown - dt);
  if (racer.hitFlashTimer > 0) racer.hitFlashTimer = Math.max(0, racer.hitFlashTimer - dt);
  if (racer.shockSlowTimer > 0) racer.shockSlowTimer = Math.max(0, racer.shockSlowTimer - dt);
  if (racer.bumpCooldown > 0) racer.bumpCooldown = Math.max(0, racer.bumpCooldown - dt);
  if (racer.bumperCooldown > 0) racer.bumperCooldown = Math.max(0, racer.bumperCooldown - dt);
  if (racer.gateCooldown > 0) racer.gateCooldown = Math.max(0, racer.gateCooldown - dt);
  if (racer.iceCalloutCooldown > 0) racer.iceCalloutCooldown = Math.max(0, racer.iceCalloutCooldown - dt);
  if (racer.nectarCalloutCooldown > 0) racer.nectarCalloutCooldown = Math.max(0, racer.nectarCalloutCooldown - dt);
  if (racer.lowGravityCalloutCooldown > 0) {
    racer.lowGravityCalloutCooldown = Math.max(0, racer.lowGravityCalloutCooldown - dt);
  }

  if (racer.impactTimer > 0) {
    racer.impactTimer = Math.max(0, racer.impactTimer - dt);
    racer.wobblePhase += dt * 26;
    if (racer.impactTimer <= 0) {
      racer.impactType = 'none';
      racer.impactStrength = 0;
    }
  }

  // Zero-G Low-Gravity Cosmic Sky Strip detection (applies up to 16m high so moon-jumps soar in low gravity!)
  const activeLowGrav = racer.hoverY < 16.0 ? sampleLowGravityZone(track, racer.t, racer.lateral) : null;
  const wasInLowGravity = racer.isInLowGravity;
  racer.isInLowGravity = activeLowGrav !== null;

  // Buffer hover-hop input so slightly early presses fire on the first legal frame
  if (input.hopJustPressed) {
    racer.hopBufferTimer = C.hopBufferDuration;
  } else if (racer.hopBufferTimer > 0) {
    racer.hopBufferTimer = Math.max(0, racer.hopBufferTimer - dt);
  }

  // Trigger Hover Hop if buffered and grounded/off cooldown (scaled by UFO hopMult & Free Flight!)
  if (racer.hopBufferTimer > 0 && racer.hoverY <= 0.15 && racer.hopCooldown <= 0) {
    racer.vy = (isFree ? C.hopInitialVel * 1.28 : C.hopInitialVel) * spec.hopMult;
    racer.hopCooldown = isFree ? 0.36 : C.hopCooldownDuration;
    racer.hopBufferTimer = 0;
    racer.squashX = 0.85;
    racer.squashY = 1.24;
    events.push({
      type: 'hop',
      racerId: racer.id,
      isPlayer: racer.isPlayer,
      worldX: racer.worldX,
      worldY: racer.worldY,
      worldZ: racer.worldZ,
      intensity: 0.72,
    });
  }

  // Vertical hop / jump-ramp arc + Anti-Gravity Hover Glide + Zero-G Cosmic Sky Strip Moon-Gravity!
  const wasAirborne = racer.hoverY > 0.05;
  if (racer.hoverY > 0 || racer.vy > 0) {
    const isGliding = Boolean(input.hopHeld) && racer.vy < 0 && racer.hoverY > 0.3;
    const baseGravityMult = isGliding
      ? isFree
        ? C.glideGravityScale * 0.72
        : C.glideGravityScale
      : 1.0;
    const gravityMult = activeLowGrav ? baseGravityMult * activeLowGrav.gravityScale : baseGravityMult;
    racer.hoverY += racer.vy * dt;
    racer.vy -= C.hopGravity * gravityMult * dt;
    if (isGliding) {
      racer.vy = Math.max(racer.vy, activeLowGrav ? -3.4 : -5.2);
    }
    if (racer.hoverY <= 0) {
      racer.hoverY = 0;
      racer.vy = 0;
      if (wasAirborne) {
        racer.squashX = 1.18;
        racer.squashY = 0.82;
        events.push({
          type: 'land',
          racerId: racer.id,
          isPlayer: racer.isPlayer,
          worldX: racer.worldX,
          worldY: racer.worldY,
          worldZ: racer.worldZ,
          intensity: 0.45,
        });
      }
    }
  }

  racer.squashX = damp(racer.squashX, 1, 10, dt);
  racer.squashY = damp(racer.squashY, 1, 10, dt);

  // Quick Lateral Side-Dash (Q left / E right) for nimble dodge & freedom!
  if (input.dashDir && racer.dashCooldown <= 0) {
    racer.lateralVel = clamp(
      racer.lateralVel + input.dashDir * C.dashImpulse,
      -C.maxLateralSpeed * 1.45,
      C.maxLateralSpeed * 1.45,
    );
    racer.dashCooldown = (isFree ? 0.45 : C.dashCooldownDuration) * spec.dashCooldownMult;
    racer.squashX = 1.16;
    racer.squashY = 0.88;
    events.push({
      type: 'side-dash',
      racerId: racer.id,
      isPlayer: racer.isPlayer,
      worldX: racer.worldX,
      worldY: racer.worldY,
      worldZ: racer.worldZ,
      intensity: 0.8,
      impactDir: input.dashDir,
    });
  }

  // Boost logic (Free Flight gives super-fast recharge for unrestricted high-speed cruising)
  const wasBoosting = racer.isBoosting;
  const canBoost = input.boostHeld && racer.boostEnergy > (wasBoosting ? 1 : 6) && !racer.finished;
  racer.isBoosting = canBoost;

  if (racer.isBoosting) {
    const drainRate = isFree ? C.boostDrainPerSec * 0.4 : C.boostDrainPerSec;
    racer.boostEnergy = Math.max(0, racer.boostEnergy - drainRate * dt);
    if (!wasBoosting) {
      events.push({
        type: 'boost-start',
        racerId: racer.id,
        isPlayer: racer.isPlayer,
        worldX: racer.worldX,
        worldY: racer.worldY,
        worldZ: racer.worldZ,
        intensity: 0.85,
      });
    }
  } else {
    const regenRate = isFree ? 44 : C.boostPassiveRegen;
    racer.boostEnergy = Math.min(100, racer.boostEnergy + regenRate * dt);
  }

  // Glacial Blue-Ice Slip-Glide Zone & Biolume Nectar Flow Current detection!
  const activeIcePatch = racer.hoverY < 1.25 ? sampleIcePatch(track, racer.t, racer.lateral) : null;
  const wasOnIce = racer.isOnIce;
  racer.isOnIce = activeIcePatch !== null;

  const activeNectar = racer.hoverY < 1.65 ? sampleNectarStream(track, racer.t, racer.lateral) : null;
  const wasInNectar = racer.isInNectar;
  racer.isInNectar = activeNectar !== null;
  if (activeNectar) {
    racer.boostEnergy = Math.min(100, racer.boostEnergy + activeNectar.boostRegenPerSec * dt);
  }

  // Target speed calculation scaled by level speed class, UFO chassis class, AI boost tier, Blue-Ice & Nectar!
  const aiBoostScale = clamp(0.45 + level.aiBoostAggression * 0.3, 0.5, 0.86);
  const baseCap =
    C.maxBaseSpeed * speedClass * spec.speedMult * (racer.isPlayer ? 1.0 : racer.skillFactor);
  const boostAdd = racer.isBoosting
    ? C.boostExtraSpeed * speedClass * (racer.isPlayer ? 1.0 : aiBoostScale)
    : 0;
  const padAdd =
    racer.boostPadTimer > 0
      ? C.padExtraSpeed * speedClass * (racer.isPlayer ? 1.0 : aiBoostScale)
      : 0;
  const iceSpeedAdd = activeIcePatch
    ? activeIcePatch.speedBonus * speedClass * (racer.isPlayer ? 1.0 : 0.65)
    : 0;
  const nectarSpeedAdd = activeNectar
    ? activeNectar.speedBonus * speedClass * (racer.isPlayer ? 1.0 : 0.65)
    : 0;
  const lowGravSpeedAdd = activeLowGrav
    ? activeLowGrav.speedBonus * speedClass * (racer.isPlayer ? 1.0 : 0.65)
    : 0;
  const shockMult = racer.shockSlowTimer > 0 ? 0.72 : 1.0;
  const topSpeed =
    (baseCap + boostAdd + padAdd + iceSpeedAdd + nectarSpeedAdd + lowGravSpeedAdd) * shockMult;

  // Longitudinal speed integration
  const activeThrottle = racer.finished ? 0.45 : input.throttle;
  if (activeThrottle > 0.05) {
    const thrustBoost =
      racer.isBoosting || racer.boostPadTimer > 0
        ? 1.85
        : activeIcePatch || activeNectar || activeLowGrav
        ? 1.32
        : 1.0;
    const accel = C.accelRate * speedClass * activeThrottle * thrustBoost;
    if (racer.speed < topSpeed) {
      racer.speed = Math.min(topSpeed, racer.speed + accel * dt);
    } else {
      racer.speed = damp(racer.speed, topSpeed, 3.0, dt);
    }
  } else if (activeThrottle < -0.05) {
    racer.speed = Math.max(-18, racer.speed + C.brakeRate * activeThrottle * dt);
  } else {
    if (racer.speed > 0) {
      racer.speed = Math.max(0, racer.speed - C.coastDrag * (activeIcePatch ? 0.45 : 1.0) * dt);
    } else {
      racer.speed = Math.min(0, racer.speed + C.coastDrag * dt);
    }
  }

  // Advance along track spline
  const prevT = racer.t;
  const frame = sampleTrackFrame(track, prevT);
  const deltaT = (racer.speed * dt) / track.totalLength;
  const nextT = wrapProgress(prevT + deltaT);
  racer.t = nextT;

  // Live variable road half-width at racer's current spline position!
  const currFrame = sampleTrackFrame(track, nextT);
  const deckHalfTrack = currFrame.width * 0.5 - 2.1;

  // Smooth, stable lateral steering + curve feel + Alpine Blizzard Crosswind gusts + Nectar Flow stabilization!
  const centrifugalPush = -frame.curvature * racer.speed * 0.14;
  const steerForce = input.steer * C.steerAccel * spec.steerMult;
  const dashBaseCd = (isFree ? 0.45 : C.dashCooldownDuration) * spec.dashCooldownMult;
  const isDashing = racer.dashCooldown > Math.max(0.15, dashBaseCd - 0.2);
  const windZone = sampleWindZone(track, nextT);
  const windAccel = windZone
    ? windZone.force * (isDashing ? 0.42 : racer.hoverY > 1.2 ? 0.72 : 1.0)
    : 0;
  // Gentle flow-channel pull toward nectar stream center when not actively steering out
  const nectarGuide =
    activeNectar && Math.abs(input.steer) < 0.15 && !isDashing
      ? clamp((activeNectar.lateral - racer.lateral) * 3.8, -14, 14)
      : 0;

  racer.lateralVel += (steerForce + centrifugalPush + windAccel + nectarGuide) * dt;
  const baseDrag = isDashing
    ? C.lateralDrag * 0.42
    : Math.abs(input.steer) < 0.05
    ? C.lateralDrag * 1.35
    : C.lateralDrag;
  // Blue-Ice sheets soften lateral drag for crisp, expressive drift carving without spinning out!
  const activeDrag = activeIcePatch ? baseDrag * 0.56 : baseDrag;
  racer.lateralVel *= Math.exp(-activeDrag * dt);
  const maxLatSpeed = isDashing
    ? C.maxLateralSpeed * 1.45
    : activeIcePatch
    ? C.maxLateralSpeed * 1.15
    : C.maxLateralSpeed;
  racer.lateralVel = clamp(racer.lateralVel, -maxLatSpeed, maxLatSpeed);
  racer.lateral += racer.lateralVel * dt;

  // Aerial Over-the-Rail Freedom: while flying above the rail (>1.4m), you can carve out over the shoulder
  // to cut corners aerially; descending gently guides you back onto the magnetic deck!
  const aerialBonus = racer.hoverY > 1.4 ? Math.min(6.5, (racer.hoverY - 1.4) * 2.2) : 0;
  const effectiveHalfLimit = deckHalfTrack + aerialBonus;

  if (Math.abs(racer.lateral) > effectiveHalfLimit) {
    const side = Math.sign(racer.lateral); // +1 right wall, -1 left wall
    racer.lateral = side * effectiveHalfLimit;
    const impactSpeed = Math.abs(racer.lateralVel);
    racer.lateralVel = -side * Math.min(4.2, impactSpeed * 0.24);
    if (aerialBonus <= 0.1) {
      racer.speed *= 0.985;
      if (impactSpeed > 6.5 && racer.bumpCooldown <= 0) {
        const intensity = clamp(impactSpeed / 20, 0.3, 0.85);
        racer.hitFlashTimer = 0.05;
        racer.bumpCooldown = 0.26;
        racer.squashX = 0.88;
        racer.squashY = 1.12;
        triggerImpactAnimation(racer, 'wall-scrape', side, intensity, 0.34);
        events.push({
          type: 'wall-scrape',
          racerId: racer.id,
          isPlayer: racer.isPlayer,
          worldX: racer.worldX + frame.right.x * side * 2.1,
          worldY: racer.worldY,
          worldZ: racer.worldZ + frame.right.z * side * 2.1,
          intensity,
          impactDir: side,
          normalX: -frame.right.x * side,
          normalY: 0.25,
          normalZ: -frame.right.z * side,
        });
      }
    }
  } else if (Math.abs(racer.lateral) > deckHalfTrack && racer.hoverY <= 1.4) {
    // Soft magnetic recovery pull back inside deck edge as UFO settles from an aerial corner-cut
    const side = Math.sign(racer.lateral);
    racer.lateral = damp(racer.lateral, side * deckHalfTrack, 7.5, dt);
  }

  // Visual hover banking (leans cleanly INTO turns), heading slip, pitch, and saucer rim spin
  const targetRoll = input.steer * 0.34 + racer.lateralVel * 0.012;
  const targetYawOffset = -input.steer * 0.18;
  const targetPitch =
    (racer.isBoosting || racer.boostPadTimer > 0 ? -0.12 : 0) +
    clamp(racer.vy * 0.016, -0.2, 0.24);

  racer.rollAngle = damp(racer.rollAngle, targetRoll, 9.5, dt);
  racer.headingOffset = damp(racer.headingOffset, targetYawOffset, 10, dt);
  racer.pitchAngle = damp(racer.pitchAngle, targetPitch, 8, dt);
  const spinSurge = racer.impactTimer > 0 ? 5.5 * racer.impactStrength : 0;
  racer.spinPhase += dt * (2.6 + Math.abs(racer.speed) * 0.08 + (racer.isBoosting ? 4.5 : 0) + spinSurge);

  // Update cached world coordinates
  const world = trackToWorld(
    track,
    racer.t,
    racer.lateral,
    C.baseHoverHeight + racer.hoverY,
  );
  racer.worldX = world.pos.x;
  racer.worldY = world.pos.y;
  racer.worldZ = world.pos.z;
  racer.worldYaw = Math.atan2(world.frame.tangent.x, world.frame.tangent.z);

  // Trigger Blue-Ice Glide burst event on entry!
  if (activeIcePatch && !wasOnIce && racer.iceCalloutCooldown <= 0) {
    racer.iceCalloutCooldown = 2.4;
    racer.speed = Math.min(topSpeed + 8, racer.speed + (racer.isPlayer ? 6.5 : 3.0));
    racer.boostEnergy = Math.min(100, racer.boostEnergy + 10);
    if (racer.isPlayer) {
      racer.styleScore += 80;
    }
    events.push({
      type: 'ice-glide',
      racerId: racer.id,
      isPlayer: racer.isPlayer,
      worldX: racer.worldX,
      worldY: racer.worldY,
      worldZ: racer.worldZ,
      intensity: 0.78,
    });
  }

  // Trigger Luminous Biolume Nectar Surge on entry!
  if (activeNectar && !wasInNectar && racer.nectarCalloutCooldown <= 0) {
    racer.nectarCalloutCooldown = 2.4;
    racer.speed = Math.min(topSpeed + 9, racer.speed + (racer.isPlayer ? 7.0 : 3.2));
    racer.boostEnergy = Math.min(100, racer.boostEnergy + 14);
    if (racer.isPlayer) {
      racer.styleScore += 90;
    }
    events.push({
      type: 'nectar-surge',
      racerId: racer.id,
      isPlayer: racer.isPlayer,
      worldX: racer.worldX,
      worldY: racer.worldY,
      worldZ: racer.worldZ,
      intensity: 0.84,
    });
  }

  // Trigger Zero-G Low-Gravity Cosmic Sky Strip entry burst!
  if (activeLowGrav && !wasInLowGravity && racer.lowGravityCalloutCooldown <= 0) {
    racer.lowGravityCalloutCooldown = 2.6;
    racer.speed = Math.min(topSpeed + 10, racer.speed + (racer.isPlayer ? 6.5 : 3.2));
    racer.boostEnergy = Math.min(100, racer.boostEnergy + 12);
    if (racer.isPlayer) {
      racer.styleScore += 100;
    }
    events.push({
      type: 'zero-g-zone',
      racerId: racer.id,
      isPlayer: racer.isPlayer,
      worldX: racer.worldX,
      worldY: racer.worldY,
      worldZ: racer.worldZ,
      intensity: 0.88,
    });
  }

  // 3D Holographic Jump Launch Ramps — send UFOs soaring into the sky!
  if (racer.hoverY < 2.2 && racer.rampCooldown <= 0) {
    for (const ramp of track.def.jumpRamps) {
      const distMeters = Math.abs(shortestProgressDelta(racer.t, ramp.t)) * track.totalLength;
      if (
        distMeters < ramp.length * 0.55 &&
        Math.abs(racer.lateral - ramp.lateral) < ramp.width * 0.62
      ) {
        racer.vy = Math.max(racer.vy, ramp.launchVel * (isFree ? 1.15 : 1.0));
        racer.rampCooldown = 0.85;
        racer.boostEnergy = Math.min(100, racer.boostEnergy + 22);
        if (ramp.speedBoost) {
          racer.speed = Math.min(topSpeed + ramp.speedBoost, racer.speed + ramp.speedBoost * 0.75);
        }
        if (racer.isPlayer) {
          racer.styleScore += 150;
        }
        racer.squashX = 0.82;
        racer.squashY = 1.28;
        events.push({
          type: 'ramp-launch',
          racerId: racer.id,
          isPlayer: racer.isPlayer,
          worldX: racer.worldX,
          worldY: racer.worldY,
          worldZ: racer.worldZ,
          intensity: 1.0,
        });
        break;
      }
    }
  }

  // Gravity Updraft Geysers — swirling vertical vortex columns lifting UFOs into high sky rings!
  if (racer.updraftCooldown <= 0 && track.def.updrafts.length > 0) {
    for (const updraft of track.def.updrafts) {
      const distMeters = Math.abs(shortestProgressDelta(racer.t, updraft.t)) * track.totalLength;
      if (
        distMeters < updraft.radius * 1.15 &&
        Math.abs(racer.lateral - updraft.lateral) < updraft.radius * 1.15
      ) {
        racer.vy = Math.max(racer.vy, updraft.liftVel * (isFree ? 1.12 : 1.0) * spec.hopMult);
        racer.updraftCooldown = 1.1;
        racer.boostEnergy = Math.min(100, racer.boostEnergy + 18);
        if (racer.isPlayer) {
          racer.styleScore += 120;
        }
        racer.squashX = 0.84;
        racer.squashY = 1.26;
        events.push({
          type: 'updraft-lift',
          racerId: racer.id,
          isPlayer: racer.isPlayer,
          worldX: racer.worldX,
          worldY: racer.worldY,
          worldZ: racer.worldZ,
          intensity: 0.95,
        });
        break;
      }
    }
  }

  // Hyper-Warp Speed Tunnels — concentric glowing arch rings surging speed & recharging plasma!
  if (racer.warpCooldown <= 0 && track.def.warpTunnels.length > 0) {
    for (const tunnel of track.def.warpTunnels) {
      const insideTunnel =
        tunnel.tStart <= tunnel.tEnd
          ? racer.t >= tunnel.tStart && racer.t <= tunnel.tEnd
          : racer.t >= tunnel.tStart || racer.t <= tunnel.tEnd;
      if (insideTunnel) {
        racer.warpCooldown = 2.2;
        racer.boostPadTimer = Math.max(racer.boostPadTimer, 1.65);
        racer.boostEnergy = Math.min(100, racer.boostEnergy + 35);
        const surgeTarget =
          baseCap +
          (racer.isPlayer ? tunnel.speedBonus : tunnel.speedBonus * 0.58) * speedClass;
        racer.speed = Math.max(racer.speed + (racer.isPlayer ? 16 : 9), surgeTarget);
        if (racer.isPlayer) {
          racer.styleScore += 200;
        }
        events.push({
          type: 'warp-surge',
          racerId: racer.id,
          isPlayer: racer.isPlayer,
          worldX: racer.worldX,
          worldY: racer.worldY,
          worldZ: racer.worldZ,
          intensity: 1.0,
        });
        break;
      }
    }
  }

  // Generous Boost pad triggers
  if (racer.hoverY < 2.2) {
    for (const pad of track.def.boostPads) {
      const distMeters = Math.abs(shortestProgressDelta(racer.t, pad.t)) * track.totalLength;
      if (
        distMeters < pad.length * 0.65 &&
        Math.abs(racer.lateral - pad.lateral) < pad.width * 0.72 &&
        racer.boostPadTimer < 0.75
      ) {
        racer.boostPadTimer = 1.25;
        racer.boostEnergy = Math.min(100, racer.boostEnergy + 28);
        racer.speed = Math.max(
          racer.speed,
          baseCap + (racer.isPlayer ? C.padExtraSpeed * 0.78 : C.padExtraSpeed * 0.45) * speedClass,
        );
        events.push({
          type: 'boost-pad',
          racerId: racer.id,
          isPlayer: racer.isPlayer,
          worldX: racer.worldX,
          worldY: racer.worldY,
          worldZ: racer.worldZ,
          intensity: 0.95,
        });
      }
    }
  }

  // Generous magnetic Energy Ring pickups (both ground & high-altitude sky rings!)
  for (const ring of track.def.rings) {
    const ringKey = `${racer.lap}:${ring.id}`;
    if (racer.isPlayer && collectedRingIds.has(ringKey)) continue;
    const distMeters = Math.abs(shortestProgressDelta(racer.t, ring.t)) * track.totalLength;
    const ufoHeight = C.baseHoverHeight + racer.hoverY;
    const verticalDist = Math.abs(ufoHeight - ring.heightOffset);
    const magnetLateral = racer.isPlayer ? ring.radius + 4.0 : ring.radius + 1.8;
    const magnetVertical = racer.isPlayer ? ring.radius + 2.3 : ring.radius + 1.1;
    if (
      distMeters < 7.2 &&
      Math.abs(racer.lateral - ring.lateral) < magnetLateral &&
      verticalDist < magnetVertical
    ) {
      if (racer.isPlayer) {
        collectedRingIds.add(ringKey);
      }
      racer.ringsCollected += 1;
      racer.styleScore += ring.elevated ? 250 : 150;
      racer.boostEnergy = Math.min(100, racer.boostEnergy + 30);
      racer.speed = Math.min(topSpeed + 16, racer.speed + (racer.isPlayer ? 8 : 3));
      events.push({
        type: 'ring-pickup',
        racerId: racer.id,
        isPlayer: racer.isPlayer,
        worldX: racer.worldX,
        worldY: racer.worldY,
        worldZ: racer.worldZ,
        intensity: ring.elevated ? 1.0 : 0.75,
        ringId: ring.id,
      });
    }
  }

  // Static & Moving EMP Shock Barrier hazards (scaled by level hazard count, speed, and width)
  const activeHazardLimit = Math.min(track.def.hazards.length, level.hazardCount);
  if (racer.hoverY < 1.85 && racer.shockSlowTimer <= 0) {
    for (let hi = 0; hi < activeHazardLimit; hi++) {
      const hz = track.def.hazards[hi];
      const { phase } = getHazardPhase(hz, raceTime, level.hazardCycleSpeed);
      if (phase !== 'active') continue;
      const hzLat = getHazardLateral(hz, raceTime, level.hazardCycleSpeed);
      const effWidth = hz.width * level.hazardWidthScale;
      const distMeters = Math.abs(shortestProgressDelta(racer.t, hz.t)) * track.totalLength;
      if (distMeters < 2.6 && Math.abs(racer.lateral - hzLat) < effWidth * 0.48) {
        const deflectSide = racer.lateral >= hzLat ? -1 : 1;
        racer.shockSlowTimer = 0.55;
        racer.hitFlashTimer = 0.1;
        racer.speed *= 0.74;
        racer.lateralVel += -deflectSide * 6.5;
        racer.vy = Math.max(racer.vy, 5.2);
        racer.squashX = 1.24;
        racer.squashY = 0.76;
        triggerImpactAnimation(racer, 'shock-hit', deflectSide, 0.95, 0.52);
        events.push({
          type: 'shock-hit',
          racerId: racer.id,
          isPlayer: racer.isPlayer,
          worldX: racer.worldX,
          worldY: racer.worldY,
          worldZ: racer.worldZ,
          intensity: 0.92,
          impactDir: deflectSide,
          normalX: -world.frame.tangent.x,
          normalY: 0.5,
          normalZ: -world.frame.tangent.z,
        });
      }
    }
  }

  // Interactive Track Obstacles: Split-Pillars, Drones, Bumpers, Crystals, Pollen, Spore-Pads, Star-Cores & Gravity Pulse Wells!
  const obstacles = track.def.obstacles;
  if (obstacles && obstacles.length > 0) {
    const ufoHeight = C.baseHoverHeight + racer.hoverY;
    for (let oi = 0; oi < obstacles.length; oi++) {
      const ob = obstacles[oi];
      // Shatterable Frost Crystals, Floating Pollen Blooms & Cosmic Star-Cores are consumed once per lap by the player!
      const consumeKey = `${ob.kind}:${racer.lap}:${ob.id}`;
      if (
        (ob.kind === 'frost-crystal' || ob.kind === 'pollen-orb' || ob.kind === 'star-core') &&
        racer.isPlayer &&
        collectedRingIds.has(consumeKey)
      ) {
        continue;
      }

      // Clean vertical clearance lets UFOs hop or sky-jump over drones, bumpers, crystals, pollen, pads, star-cores & wells!
      if (ufoHeight > ob.height + 0.65) continue;

      const obLat = getObstacleLateral(ob, raceTime);
      const dtMeters = shortestProgressDelta(ob.t, racer.t) * track.totalLength;
      const dLat = racer.lateral - obLat;
      const hitDist =
        ob.radius +
        C.ufoRadius *
          (ob.kind === 'frost-crystal' ||
          ob.kind === 'pollen-orb' ||
          ob.kind === 'spore-pad' ||
          ob.kind === 'star-core' ||
          ob.kind === 'gravity-well'
            ? 1.15
            : 0.92);
      const distSq = dtMeters * dtMeters + dLat * dLat;

      if (distSq < hitDist * hitDist && distSq > 1e-5) {
        if (ob.kind === 'frost-crystal') {
          // Smash cleanly right through gleaming Cryo-Crystals with ZERO slowdown!
          if (racer.isPlayer) {
            collectedRingIds.add(consumeKey);
            racer.styleScore += 140;
          }
          racer.boostEnergy = Math.min(100, racer.boostEnergy + 22);
          racer.speed = Math.min(topSpeed + 12, racer.speed + (racer.isPlayer ? 8.5 : 4.0));
          racer.squashX = 1.15;
          racer.squashY = 0.88;
          events.push({
            type: 'crystal-shatter',
            racerId: racer.id,
            isPlayer: racer.isPlayer,
            worldX: racer.worldX,
            worldY: racer.worldY,
            worldZ: racer.worldZ,
            intensity: 0.92,
            obstacleId: ob.id,
          });
          continue;
        }

        if (ob.kind === 'pollen-orb') {
          // Burst cleanly through Floating Biolume Pollen Blooms for +130 pts, +25% boost & surge!
          if (racer.isPlayer) {
            collectedRingIds.add(consumeKey);
            racer.styleScore += 130;
          }
          racer.boostEnergy = Math.min(100, racer.boostEnergy + 25);
          racer.speed = Math.min(topSpeed + 13, racer.speed + (racer.isPlayer ? 9.0 : 4.2));
          racer.squashX = 1.14;
          racer.squashY = 0.88;
          events.push({
            type: 'pollen-burst',
            racerId: racer.id,
            isPlayer: racer.isPlayer,
            worldX: racer.worldX,
            worldY: racer.worldY,
            worldZ: racer.worldZ,
            intensity: 0.94,
            obstacleId: ob.id,
          });
          continue;
        }

        if (ob.kind === 'star-core') {
          // Crack Cosmic Star-Cores for a supernova surge: +150 pts, +28% boost, +10 m/s, zero slowdown!
          if (racer.isPlayer) {
            collectedRingIds.add(consumeKey);
            racer.styleScore += 150;
          }
          racer.boostEnergy = Math.min(100, racer.boostEnergy + 28);
          racer.speed = Math.min(topSpeed + 15, racer.speed + (racer.isPlayer ? 10.0 : 4.8));
          racer.squashX = 1.18;
          racer.squashY = 0.86;
          events.push({
            type: 'star-core-nova',
            racerId: racer.id,
            isPlayer: racer.isPlayer,
            worldX: racer.worldX,
            worldY: racer.worldY,
            worldZ: racer.worldZ,
            intensity: 0.98,
            obstacleId: ob.id,
          });
          continue;
        }

        if (ob.kind === 'gravity-well') {
          // Spinning Cosmic Gravity Pulse Well: orbital slingshot whips UFO cleanly forward (+14 m/s, +26% boost, +175 PTS)!
          if (racer.bumperCooldown <= 0) {
            racer.bumperCooldown = 0.78;
            const orbitSign = dLat >= 0 ? 1 : -1;
            racer.lateralVel = clamp(
              racer.lateralVel + orbitSign * 7.5,
              -C.maxLateralSpeed * 1.2,
              C.maxLateralSpeed * 1.2,
            );
            const whipBonus = (ob.bounceForce ?? 15) * (racer.isPlayer ? 1.0 : 0.55) * speedClass;
            racer.speed = Math.max(racer.speed + whipBonus * 0.92, baseCap + whipBonus * 0.72);
            racer.boostPadTimer = Math.max(racer.boostPadTimer, 0.95);
            racer.boostEnergy = Math.min(100, racer.boostEnergy + 26);
            racer.squashX = 0.86;
            racer.squashY = 1.22;
            if (racer.isPlayer) {
              racer.styleScore += 175;
            }
            events.push({
              type: 'gravity-slingshot',
              racerId: racer.id,
              isPlayer: racer.isPlayer,
              worldX: racer.worldX,
              worldY: racer.worldY,
              worldZ: racer.worldZ,
              intensity: 1.0,
              obstacleId: ob.id,
            });
          }
          continue;
        }

        if (ob.kind === 'spore-pad') {
          // Bouncy Giant Toadstool Spring-Pad: catapults UFO into the canopy with +160 pts & +24% boost!
          if (racer.bumperCooldown <= 0) {
            const launchVy = (ob.bounceForce ?? 26.5) * (isFree ? 1.12 : 1.0) * spec.hopMult;
            racer.bumperCooldown = 0.85;
            racer.vy = Math.max(racer.vy, launchVy);
            racer.boostEnergy = Math.min(100, racer.boostEnergy + 24);
            racer.speed = Math.min(topSpeed + 14, racer.speed + (racer.isPlayer ? 10.0 : 4.5));
            racer.squashX = 0.82;
            racer.squashY = 1.3;
            if (racer.isPlayer) {
              racer.styleScore += 160;
            }
            events.push({
              type: 'spore-bounce',
              racerId: racer.id,
              isPlayer: racer.isPlayer,
              worldX: racer.worldX,
              worldY: racer.worldY,
              worldZ: racer.worldZ,
              intensity: 1.0,
              obstacleId: ob.id,
            });
          }
          continue;
        }

        const dist = Math.sqrt(distSq);
        const nxLat = Math.abs(dLat) > 0.15 ? dLat / dist : racer.lateral >= obLat ? 1 : -1;
        const nxT = dtMeters / dist;
        const pushOut = hitDist - dist + 0.55;
        const pushSign = nxLat >= 0 ? 1 : -1;

        racer.lateral = clamp(racer.lateral + pushSign * Math.max(0.6, Math.abs(nxLat) * pushOut), -deckHalfTrack, deckHalfTrack);

        if (ob.kind === 'bumper-orb') {
          if (racer.bumperCooldown <= 0) {
            const bounceForce = ob.bounceForce ?? 22;
            racer.bumperCooldown = 0.45;
            racer.lateralVel = clamp(pushSign * bounceForce * 0.72, -C.maxLateralSpeed * 1.25, C.maxLateralSpeed * 1.25);
            // Fun pinball momentum: pops forward + fills boost + awards style points!
            racer.speed = Math.max(racer.speed + (racer.isPlayer ? 10 : 4), baseCap * 1.05);
            racer.boostEnergy = Math.min(100, racer.boostEnergy + 15);
            racer.vy = Math.max(racer.vy, 5.4);
            racer.squashX = 1.24;
            racer.squashY = 0.78;
            if (racer.isPlayer) {
              racer.styleScore += 100;
            }
            triggerImpactAnimation(racer, 'ufo-bump', -pushSign, 0.58, 0.36);
            events.push({
              type: 'bumper-bounce',
              racerId: racer.id,
              isPlayer: racer.isPlayer,
              worldX: racer.worldX,
              worldY: racer.worldY,
              worldZ: racer.worldZ,
              intensity: 0.85,
              impactDir: -pushSign,
              normalX: world.frame.right.x * pushSign,
              normalY: 0.35,
              normalZ: world.frame.right.z * pushSign,
            });
          }
        } else {
          // Solid sandstone/glacial/fungal/meteor split-pillar or patrolling hover drone -> smooth lateral deflection!
          if (racer.bumpCooldown <= 0) {
            racer.bumpCooldown = 0.36;
            racer.hitFlashTimer = 0.08;
            racer.lateralVel = clamp(pushSign * 14.5, -C.maxLateralSpeed, C.maxLateralSpeed);
            racer.speed *=
              ob.kind === 'rock-pillar' ||
              ob.kind === 'ice-spire' ||
              ob.kind === 'spore-stalk' ||
              ob.kind === 'meteor-spire'
                ? 0.84
                : 0.88;
            if (nxT < -0.25) {
              // Ensure forward progress doesn't snag on front face of a spire/stalk
              racer.lateral = clamp(racer.lateral + pushSign * 1.2, -deckHalfTrack, deckHalfTrack);
            }
            racer.squashX = 0.86;
            racer.squashY = 1.15;
            triggerImpactAnimation(racer, 'wall-scrape', -pushSign, 0.72, 0.4);
            events.push({
              type: 'obstacle-hit',
              racerId: racer.id,
              isPlayer: racer.isPlayer,
              worldX: racer.worldX,
              worldY: racer.worldY,
              worldZ: racer.worldZ,
              intensity: 0.75,
              impactDir: -pushSign,
              normalX: world.frame.right.x * pushSign,
              normalY: 0.3,
              normalZ: world.frame.right.z * pushSign,
            });
          }
        }
      }
    }
  }

  // Floating Slingshot Turbo Gates — fly through glowing aerial/sprint chevron gates for a hyper-pulse!
  const speedGates = track.def.speedGates;
  if (speedGates && speedGates.length > 0 && racer.gateCooldown <= 0) {
    const ufoHeight = C.baseHoverHeight + racer.hoverY;
    for (let gi = 0; gi < speedGates.length; gi++) {
      const gate = speedGates[gi];
      const distMeters = Math.abs(shortestProgressDelta(racer.t, gate.t)) * track.totalLength;
      const latDist = Math.abs(racer.lateral - gate.lateral);
      const vertDist = Math.abs(ufoHeight - gate.heightOffset);
      const latWindow = racer.isPlayer ? gate.radius + 2.4 : gate.radius + 1.0;
      const vertWindow = racer.isPlayer ? gate.radius + 2.2 : gate.radius + 1.0;
      if (distMeters < 8.0 && latDist < latWindow && vertDist < vertWindow) {
        racer.gateCooldown = 1.1;
        racer.boostPadTimer = Math.max(racer.boostPadTimer, 1.45);
        racer.boostEnergy = Math.min(100, racer.boostEnergy + 32);
        const surgeTarget =
          baseCap + (racer.isPlayer ? gate.speedBonus : gate.speedBonus * 0.5) * speedClass;
        racer.speed = Math.max(racer.speed + (racer.isPlayer ? 15 : 7), surgeTarget);
        if (racer.isPlayer) {
          racer.styleScore += 180;
        }
        racer.squashX = 0.88;
        racer.squashY = 1.16;
        events.push({
          type: 'slingshot-gate',
          racerId: racer.id,
          isPlayer: racer.isPlayer,
          worldX: racer.worldX,
          worldY: racer.worldY,
          worldZ: racer.worldZ,
          intensity: 1.0,
        });
        break;
      }
    }
  }

  // Advance checkpoint & lap rules
  const lapRes = advanceLapProgress(racer, prevT, nextT, raceTime, totalLaps);
  if (lapRes.checkpointReached !== null) {
    if (racer.isPlayer) {
      racer.styleScore += 300;
      racer.boostEnergy = Math.min(100, racer.boostEnergy + 20);
    }
    events.push({
      type: 'checkpoint',
      racerId: racer.id,
      isPlayer: racer.isPlayer,
      worldX: racer.worldX,
      worldY: racer.worldY,
      worldZ: racer.worldZ,
      intensity: 0.85,
      checkpointIndex: lapRes.checkpointReached,
    });
  }
  if (lapRes.finishedRace) {
    events.push({
      type: 'race-finish',
      racerId: racer.id,
      isPlayer: racer.isPlayer,
      worldX: racer.worldX,
      worldY: racer.worldY,
      worldZ: racer.worldZ,
      intensity: 1.0,
    });
  } else if (lapRes.lapCompleted) {
    events.push({
      type: 'lap-complete',
      racerId: racer.id,
      isPlayer: racer.isPlayer,
      worldX: racer.worldX,
      worldY: racer.worldY,
      worldZ: racer.worldZ,
      intensity: 0.9,
      newLap: lapRes.newLap,
    });
  }
}

/**
 * Resolves pairwise saucer-to-saucer bumps in track-local space with elastic separation,
 * variable-width track bounds, smooth collision animation triggers, and anti-spam cooldowns.
 */
export function resolveRacerCollisions(
  racers: RacerState[],
  track: BakedTrack,
  events: PhysicsEvent[],
): void {
  const minDist = PHYSICS_CONSTANTS.ufoRadius * 1.92;

  for (let i = 0; i < racers.length; i++) {
    for (let j = i + 1; j < racers.length; j++) {
      const a = racers[i];
      const b = racers[j];
      // Vertical clearance allows hopping or sky-jumping cleanly over another UFO!
      if (Math.abs(a.hoverY - b.hoverY) > 1.7) continue;

      const dtMeters = shortestProgressDelta(a.t, b.t) * track.totalLength;
      const dLat = b.lateral - a.lateral;
      const distSq = dtMeters * dtMeters + dLat * dLat;

      if (distSq < minDist * minDist && distSq > 1e-5) {
        const dist = Math.sqrt(distSq);
        const overlap = (minDist - dist) * 0.62;
        const nxT = dtMeters / dist;
        const nxLat = dLat / dist;

        const halfTrackA = sampleTrackFrame(track, a.t).width * 0.5 - 1.9;
        const halfTrackB = sampleTrackFrame(track, b.t).width * 0.5 - 1.9;

        const specA = getUfoHandlingSpec(a.chassisVariant);
        const specB = getUfoHandlingSpec(b.chassisVariant);
        const massA = Math.max(specA.mass, a.aiPolicy === 'bruiser' ? 1.35 : specA.mass);
        const massB = Math.max(specB.mass, b.aiPolicy === 'bruiser' ? 1.35 : specB.mass);
        const invSum = 1 / (massA + massB);
        const pushA = massB * invSum;
        const pushB = massA * invSum;

        a.lateral = clamp(a.lateral - nxLat * overlap * pushA, -halfTrackA, halfTrackA);
        b.lateral = clamp(b.lateral + nxLat * overlap * pushB, -halfTrackB, halfTrackB);
        a.t = wrapProgress(a.t - (nxT * overlap * pushA) / track.totalLength);
        b.t = wrapProgress(b.t + (nxT * overlap * pushB) / track.totalLength);

        a.lateralVel -= nxLat * 9.5 * pushA;
        b.lateralVel += nxLat * 9.5 * pushB;

        if (a.bumpCooldown <= 0 || b.bumpCooldown <= 0) {
          const relSpeed = Math.hypot(a.speed - b.speed, a.lateralVel - b.lateralVel);
          const intensity = clamp(0.42 + relSpeed / 36, 0.42, 0.95);
          const dirA = dLat >= 0 ? 1 : -1;
          const dirB = -dirA;

          a.bumpCooldown = 0.34;
          b.bumpCooldown = 0.34;
          a.hitFlashTimer = 0.06;
          b.hitFlashTimer = 0.06;
          a.squashX = 0.86;
          a.squashY = 1.15;
          b.squashX = 0.86;
          b.squashY = 1.15;
          if (a.hoverY < 0.2) a.vy = Math.max(a.vy, 3.2 * intensity);
          if (b.hoverY < 0.2) b.vy = Math.max(b.vy, 3.2 * intensity);

          triggerImpactAnimation(a, 'ufo-bump', dirA, intensity, 0.44);
          triggerImpactAnimation(b, 'ufo-bump', dirB, intensity, 0.44);

          const dxW = b.worldX - a.worldX;
          const dyW = b.worldY - a.worldY;
          const dzW = b.worldZ - a.worldZ;
          const wLen = Math.hypot(dxW, dyW, dzW) || 1;

          const involvesPlayer = a.isPlayer || b.isPlayer;
          const playerDir = a.isPlayer ? dirA : b.isPlayer ? dirB : dirA;
          events.push({
            type: 'ufo-bump',
            racerId: involvesPlayer ? 'player' : a.id,
            isPlayer: involvesPlayer,
            worldX: (a.worldX + b.worldX) * 0.5,
            worldY: (a.worldY + b.worldY) * 0.5,
            worldZ: (a.worldZ + b.worldZ) * 0.5,
            intensity,
            impactDir: playerDir,
            normalX: dxW / wLen,
            normalY: Math.max(0.15, dyW / wLen),
            normalZ: dzW / wLen,
          });
        }
      }
    }
  }
}
