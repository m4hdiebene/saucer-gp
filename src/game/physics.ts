import type {
  GameMode,
  LevelDefinition,
  PlayerInput,
  RacerState,
  ShockHazardDef,
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

export interface PhysicsEvent {
  type:
    | 'boost-start'
    | 'boost-pad'
    | 'ramp-launch'
    | 'updraft-lift'
    | 'warp-surge'
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

  // Launch ramp tightens across levels (gentle 1.9s on Lv1 -> snappy 0.8s on Lv8)
  const rampSec = Math.max(0.5, level.aiLaunchRampSec);
  const launchScale = clamp(0.52 + (raceTime / rampSec) * 0.48, 0.52, 1.0);

  // Level-aware rubber-banding: friendlier on Lv1–3, tighter racing on Lv5–8
  const gapToPlayer = racer.totalProgress - playerProgress;
  const highTierFactor = clamp((level.number - 1) / 7, 0, 1);
  let paceAdjust = 1.0;
  if (gapToPlayer > 0.09) {
    paceAdjust = 0.83 + highTierFactor * 0.1;
  } else if (gapToPlayer > 0.04) {
    paceAdjust = 0.91 + highTierFactor * 0.06;
  } else if (gapToPlayer < -0.16) {
    paceAdjust = 1.03 + highTierFactor * 0.05;
  }

  const boostAggro = level.aiBoostAggression;
  const boostThresholdOffset = (1 - boostAggro) * 20;
  const burstScale = clamp(boostAggro, 0.4, 1.38);

  if (racer.aiDecisionTimer <= 0) {
    racer.aiDecisionTimer = Math.max(0.18, (0.38 - highTierFactor * 0.12) + Math.random() * 0.22);
    const policy = racer.aiPolicy ?? 'apex-hunter';

    if (policy === 'apex-hunter') {
      const apexSide = aheadFrame.curvature > 0.01 ? 1 : aheadFrame.curvature < -0.01 ? -1 : 0;
      racer.aiTargetLane =
        apexSide !== 0 ? apexSide * halfSafe * 0.58 : racer.preferredLane * halfSafe * 0.5;
      if (
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
        racer.boostEnergy > 52 + boostThresholdOffset &&
        racer.boostPadTimer <= 0 &&
        gapToPlayer < 0.05 + highTierFactor * 0.05
      ) {
        racer.aiBoostBurstTimer = 0.55 * burstScale;
      }
    } else if (policy === 'bruiser') {
      racer.aiTargetLane = 0;
      for (const other of allRacers) {
        if (other.id === racer.id) continue;
        const d = shortestProgressDelta(other.t, racer.t);
        if (d > 0.006 && d < 0.028) {
          racer.aiTargetLane = clamp(other.lateral * 0.55, -halfSafe * 0.45, halfSafe * 0.45);
          break;
        }
      }
      if (
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
        racer.boostEnergy > 64 + boostThresholdOffset &&
        gapToPlayer < 0.04 + highTierFactor * 0.04
      ) {
        racer.aiBoostBurstTimer = 0.42 * burstScale;
      }
    }
  }

  // Dynamic & moving hazard avoidance or hover-hop telegraph reaction
  const activeHazardLimit = Math.min(track.def.hazards.length, level.hazardCount);
  for (let hi = 0; hi < activeHazardLimit; hi++) {
    const hz = track.def.hazards[hi];
    const d = shortestProgressDelta(racer.t, hz.t);
    if (d > 0.002 && d < 0.028) {
      const { phase } = getHazardPhase(hz, raceTime, level.hazardCycleSpeed);
      const hzLat = getHazardLateral(hz, raceTime, level.hazardCycleSpeed);
      const effWidth = hz.width * level.hazardWidthScale;
      const inPath = Math.abs(racer.lateral - hzLat) < effWidth * 0.58;
      if (inPath && (phase === 'active' || phase === 'telegraph')) {
        if (d < 0.013 && racer.hopCooldown <= 0 && racer.hoverY < 0.1) {
          hopJustPressed = true;
        } else {
          racer.aiTargetLane = hzLat >= 0 ? -halfSafe * 0.65 : halfSafe * 0.65;
        }
      }
    }
  }

  const laneError = clamp(racer.aiTargetLane, -halfSafe, halfSafe) - racer.lateral;
  const steer = clamp(laneError * 0.18, -0.85, 0.85);

  if (racer.aiPolicy === 'apex-hunter' && Math.abs(aheadFrame.curvature) > 0.04) {
    throttle = 0.85 + highTierFactor * 0.08;
  }

  const maxAiThrottle = 0.93 + highTierFactor * 0.07;
  throttle = clamp(throttle * racer.skillFactor * paceAdjust * launchScale, 0.45, maxAiThrottle);
  const boostMinTime = Math.max(1.2, 2.6 - highTierFactor * 1.2);
  boostHeld = racer.aiBoostBurstTimer > 0 && racer.boostEnergy > 20 && raceTime > boostMinTime;

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

  if (racer.impactTimer > 0) {
    racer.impactTimer = Math.max(0, racer.impactTimer - dt);
    racer.wobblePhase += dt * 26;
    if (racer.impactTimer <= 0) {
      racer.impactType = 'none';
      racer.impactStrength = 0;
    }
  }

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

  // Vertical hop / jump-ramp arc + Anti-Gravity Hover Glide when holding Shift while descending!
  const wasAirborne = racer.hoverY > 0.05;
  if (racer.hoverY > 0 || racer.vy > 0) {
    const isGliding = Boolean(input.hopHeld) && racer.vy < 0 && racer.hoverY > 0.3;
    const gravityMult = isGliding
      ? isFree
        ? C.glideGravityScale * 0.72
        : C.glideGravityScale
      : 1.0;
    racer.hoverY += racer.vy * dt;
    racer.vy -= C.hopGravity * gravityMult * dt;
    if (isGliding) {
      racer.vy = Math.max(racer.vy, -5.2);
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

  // Target speed calculation scaled by level speed class, UFO chassis class & AI boost tier
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
  const shockMult = racer.shockSlowTimer > 0 ? 0.72 : 1.0;
  const topSpeed = (baseCap + boostAdd + padAdd) * shockMult;

  // Longitudinal speed integration
  const activeThrottle = racer.finished ? 0.45 : input.throttle;
  if (activeThrottle > 0.05) {
    const thrustBoost = racer.isBoosting || racer.boostPadTimer > 0 ? 1.85 : 1.0;
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
      racer.speed = Math.max(0, racer.speed - C.coastDrag * dt);
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

  // Smooth, stable lateral steering + gentle curve feel (scaled by UFO agility)
  const centrifugalPush = -frame.curvature * racer.speed * 0.14;
  const steerForce = input.steer * C.steerAccel * spec.steerMult;
  racer.lateralVel += (steerForce + centrifugalPush) * dt;
  const dashBaseCd = (isFree ? 0.45 : C.dashCooldownDuration) * spec.dashCooldownMult;
  const isDashing = racer.dashCooldown > Math.max(0.15, dashBaseCd - 0.2);
  const activeDrag = isDashing
    ? C.lateralDrag * 0.42
    : Math.abs(input.steer) < 0.05
    ? C.lateralDrag * 1.35
    : C.lateralDrag;
  racer.lateralVel *= Math.exp(-activeDrag * dt);
  const maxLatSpeed = isDashing ? C.maxLateralSpeed * 1.45 : C.maxLateralSpeed;
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
