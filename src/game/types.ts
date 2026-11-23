export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type GameMode = 'race' | 'free';

export type CircuitId =
  | 'solar-canyon'
  | 'glacier-spire'
  | 'biolume-jungle'
  | 'nebula-ridge'
  | 'obsidian-caldera'
  | 'neon-megacity'
  | 'aether-ringway'
  | 'quantum-prism';

export type BiomeTheme =
  | 'canyon'
  | 'glacier'
  | 'biolume'
  | 'nebula'
  | 'volcano'
  | 'cybercity'
  | 'aether'
  | 'quantum';

export type DifficultyTier =
  | 'Easy'
  | 'Standard'
  | 'Challenger'
  | 'Pro'
  | 'Ace'
  | 'Master';

export type ImpactType = 'none' | 'ufo-bump' | 'wall-scrape' | 'shock-hit';

export type UfoChassisVariant =
  | 'nova-interceptor'
  | 'apex-blade'
  | 'volt-catamaran'
  | 'titan-vanguard'
  | 'slip-manta'
  | 'drift-halo'
  | 'cryo-prism'
  | 'spore-jelly'
  | 'tri-orbiter'
  | 'magma-forge'
  | 'cyber-spinner'
  | 'quantum-seraph';

export interface UfoHandlingSpec {
  variant: UfoChassisVariant;
  className: string;
  tagline: string;
  speedMult: number;
  steerMult: number;
  hopMult: number;
  dashCooldownMult: number;
  mass: number;
}

export interface LevelDefinition {
  number: number; // 1..8
  name: string;
  tier: DifficultyTier;
  circuitId: CircuitId;
  fleetTag: string; // e.g., "Cryo Crystal Fleet"
  featuredPlayerChassis: UfoChassisVariant;
  laps: number;
  targetRank: number; // Finish <= targetRank to clear level
  aiPaceScale: number; // Scales rival base speed & skill
  aiBoostAggression: number; // Scales rival boost burst frequency & duration
  aiLaunchRampSec: number; // Shorter launch ramp at higher levels
  hazardCount: number; // Number of active EMP barriers on circuit
  hazardCycleSpeed: number; // Faster EMP timing cycles at higher levels
  hazardWidthScale: number; // Scales EMP barrier span slightly on higher levels
  speedClassScale: number; // Global speed class multiplier
  accentHex: string;
}

export type AiPolicy =
  | 'apex-hunter'
  | 'boost-bandit'
  | 'bruiser'
  | 'slipstream'
  | 'drifter';

export type CameraMode = 'chase' | 'close';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface TrackFrame {
  t: number; // [0, 1)
  pos: Vec3;
  tangent: Vec3; // forward unit vector
  right: Vec3; // lateral right unit vector (banked)
  up: Vec3; // surface normal unit vector (banked)
  bankAngle: number; // radians
  curvature: number; // signed turn rate
  width: number; // variable road width in meters at this spline sample
}

export interface BoostPadDef {
  id: string;
  t: number; // track progress [0, 1)
  lateral: number; // offset from center in meters
  width: number;
  length: number;
}

export interface JumpRampDef {
  id: string;
  t: number; // track progress [0, 1)
  lateral: number; // offset from center in meters
  width: number;
  length: number;
  launchVel: number; // upward launch velocity (m/s)
  speedBoost?: number; // extra forward impulse on launch
}

export interface UpdraftDef {
  id: string;
  t: number; // track progress [0, 1)
  lateral: number; // offset from center in meters
  radius: number; // capture radius in meters
  liftVel: number; // vertical lift velocity (m/s)
  colorHex: number; // vortex column color
}

export interface WarpTunnelDef {
  id: string;
  tStart: number; // entry progress [0, 1)
  tEnd: number; // exit progress [0, 1)
  ringCount: number; // number of glowing arch hoops in tunnel
  speedBonus: number; // forward surge impulse
  colorHex: number; // tunnel neon accent
}

export interface EnergyRingDef {
  id: string;
  t: number;
  lateral: number;
  heightOffset: number; // height above track deck
  radius: number;
  elevated: boolean; // rewards hover hop / jump ramp / updraft
}

export interface ShockHazardDef {
  id: string;
  t: number;
  lateral: number;
  width: number;
  phaseOffset: number; // timing cycle offset in seconds
  cycleDuration: number; // total period (inactive -> telegraph -> active)
  moveAmplitude?: number; // optional lateral sweep amplitude in meters
  moveSpeed?: number; // oscillation speed (rad/s)
}

export type TrackObstacleKind =
  | 'rock-pillar'
  | 'hover-drone'
  | 'bumper-orb'
  | 'ice-spire'
  | 'frost-crystal'
  | 'spore-stalk'
  | 'spore-pad'
  | 'pollen-orb'
  | 'meteor-spire'
  | 'gravity-well'
  | 'star-core';

export interface TrackObstacleDef {
  id: string;
  kind: TrackObstacleKind;
  t: number; // track progress [0, 1)
  lateral: number; // base lateral offset from centerline (m)
  radius: number; // collision radius (m)
  height: number; // clearance height (m) — hover-drones & bumper-orbs can be hopped over
  moveAmplitude?: number; // optional lateral patrol sweep (m)
  moveSpeed?: number; // patrol speed (rad/s)
  phaseOffset?: number;
  bounceForce?: number; // elastic ricochet force for bumper-orb pinball pads
  colorHex?: number;
}

export interface SpeedGateDef {
  id: string;
  t: number; // track progress [0, 1)
  lateral: number; // lateral offset (m)
  heightOffset: number; // center height above track deck (m)
  radius: number; // generous capture radius (m)
  speedBonus: number; // forward burst impulse (m/s)
  colorHex: number;
}

export interface IcePatchDef {
  id: string;
  tStart: number; // track progress start [0, 1)
  tEnd: number; // track progress end [0, 1)
  lateral: number; // center lateral offset (m)
  width: number; // lateral width of blue-ice sheet (m)
  speedBonus: number; // extra low-friction ice-glide speed surge (m/s)
}

export interface WindZoneDef {
  id: string;
  tStart: number; // track progress start [0, 1)
  tEnd: number; // track progress end [0, 1)
  force: number; // signed lateral alpine crosswind acceleration (m/s^2, +right / -left)
  colorHex: number;
}

export interface NectarStreamDef {
  id: string;
  tStart: number; // track progress start [0, 1)
  tEnd: number; // track progress end [0, 1)
  lateral: number; // center lateral offset (m)
  width: number; // width of luminous nectar flow ribbon (m)
  speedBonus: number; // forward flow speed surge (m/s)
  boostRegenPerSec: number; // extra plasma boost energy recharged per second
  colorHex: number;
}

export interface LowGravityZoneDef {
  id: string;
  tStart: number; // track progress start [0, 1)
  tEnd: number; // track progress end [0, 1)
  lateral: number; // center lateral offset (m)
  width: number; // width of zero-G antigrav sky strip (m)
  gravityScale: number; // multiplier applied to airborne gravity (e.g. 0.46 = floaty moon-jump!)
  speedBonus: number; // forward starlight glide speed bonus (m/s)
  colorHex: number;
}

export interface CircuitDefinition {
  id: CircuitId;
  biome: BiomeTheme;
  name: string;
  subtitle: string;
  laps: number;
  trackWidth: number; // default/nominal track width
  hasOverpass?: boolean;
  controlPoints: Array<{ x: number; y: number; z: number; bank?: number; width?: number }>;
  boostPads: BoostPadDef[];
  jumpRamps: JumpRampDef[];
  updrafts: UpdraftDef[];
  warpTunnels: WarpTunnelDef[];
  rings: EnergyRingDef[];
  hazards: ShockHazardDef[];
  obstacles?: TrackObstacleDef[];
  speedGates?: SpeedGateDef[];
  icePatches?: IcePatchDef[];
  windZones?: WindZoneDef[];
  nectarStreams?: NectarStreamDef[];
  lowGravityZones?: LowGravityZoneDef[];
  skyTopColor: string;
  skyHorizonColor: string;
  fogColor: string;
  terrainPrimary: string;
  terrainAccent: string;
}

export interface RacerConfig {
  id: string;
  name: string;
  isPlayer: boolean;
  aiPolicy?: AiPolicy;
  chassisVariant: UfoChassisVariant;
  raceNumber: string;
  hullColor: number;
  trimColor: number;
  glowColor: number;
  skillFactor: number; // Base rival speed factor before level scaling
  preferredLane: number; // -1 to 1 normalized
}

export interface RacerState {
  id: string;
  name: string;
  isPlayer: boolean;
  aiPolicy?: AiPolicy;
  chassisVariant: UfoChassisVariant;
  hullColor: number;
  glowColor: number;
  skillFactor: number;
  preferredLane: number;
  // Track-relative coordinates
  t: number; // [0, 1) along track spline
  lateral: number; // meters from track centerline (-halfWidth .. +halfWidth)
  hoverY: number; // additional vertical height from hover hop / jump ramps / updrafts
  vy: number; // vertical velocity for hop & glide
  speed: number; // forward speed (m/s)
  lateralVel: number; // lateral velocity (m/s)
  headingOffset: number; // slight visual yaw into turn (rad)
  rollAngle: number; // visual bank roll (rad)
  pitchAngle: number; // visual pitch on accel/hop (rad)
  spinPhase: number; // saucer outer ring spin
  // Energy & abilities
  boostEnergy: number; // 0..100
  isBoosting: boolean;
  boostPadTimer: number; // active pad / warp surge timer
  hopCooldown: number;
  hopBufferTimer: number;
  dashCooldown: number; // Q/E side-dash cooldown
  rampCooldown: number; // prevents double-trigger on same ramp
  updraftCooldown: number; // prevents spam-trigger inside updraft vortex
  warpCooldown: number; // prevents spam-trigger inside warp tunnel
  bumperCooldown: number; // prevents multi-frame bounce spam on pinball bumpers
  gateCooldown: number; // prevents double-trigger on slingshot turbo gates
  isOnIce: boolean; // currently gliding on a blue-ice slip-glide sheet
  iceCalloutCooldown: number; // rate-limits ICE GLIDE callout popups
  isInNectar: boolean; // currently riding a glowing bioluminescent nectar flow stream
  nectarCalloutCooldown: number; // rate-limits NECTAR SURGE callout popups
  isInLowGravity: boolean; // currently floating through a Zero-G cosmic sky strip
  lowGravityCalloutCooldown: number; // rate-limits ZERO-G FLOAT callout popups
  hitFlashTimer: number;
  shockSlowTimer: number;
  squashX: number;
  squashY: number;
  // Smooth collision animation & recoil state
  impactTimer: number; // Remaining visual animation duration (s)
  impactDuration: number; // Total duration for normalized decay
  impactDir: number; // -1 (hit from left) .. +1 (hit from right)
  impactStrength: number; // 0..1
  impactType: ImpactType;
  wobblePhase: number; // Smooth sinusoidal recovery wobble phase
  bumpCooldown: number; // Prevents multi-frame collision spam
  // Lap & race progress
  lap: number; // 1-based current lap
  maxCheckpoint: number; // 0..3 checkpoint gate within current lap
  totalProgress: number; // continuous lap + t for ranking
  finished: boolean;
  finishTime: number | null;
  lapStartTime: number;
  bestLapTime: number | null;
  ringsCollected: number;
  styleScore: number;
  // AI dynamic state
  aiTargetLane: number;
  aiDecisionTimer: number;
  aiBoostBurstTimer: number;
  // Cached world position for rendering & collision
  worldX: number;
  worldY: number;
  worldZ: number;
  worldYaw: number;
}

export interface PlayerInput {
  throttle: number; // -1..1
  steer: number; // -1..1 (-1 left, +1 right)
  boostHeld: boolean;
  hopJustPressed: boolean;
  hopHeld?: boolean; // Hold Shift for anti-grav air glide
  dashDir?: -1 | 0 | 1; // Q (-1 left) / E (+1 right) snap side-dash
}

export interface MinimapBlip {
  id: string;
  isPlayer: boolean;
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  color: string;
}

export interface RaceEventCallout {
  text: string;
  tone: 'cyan' | 'amber' | 'coral';
  id: number;
}

export interface StandingEntry {
  id: string;
  name: string;
  isPlayer: boolean;
  chassisVariant: UfoChassisVariant;
  rank: number;
  finished: boolean;
  finishTime: number | null;
  bestLapTime: number | null;
  ringsCollected: number;
  hullColorHex: string;
}

export interface HudSnapshot {
  phase: GamePhase;
  gameMode: GameMode;
  levelNumber: number;
  levelName: string;
  difficultyTier: DifficultyTier;
  fleetTag: string;
  playerChassisVariant: UfoChassisVariant;
  playerCraftName: string;
  craftOverride: UfoChassisVariant | null;
  targetRank: number;
  unlockedLevel: number;
  clearedLevels: number[];
  maxLevel: number;
  levelCleared: boolean;
  newlyUnlockedLevel: number | null;
  circuitId: CircuitId;
  circuitName: string;
  speedKmh: number;
  rank: number;
  totalRacers: number;
  lap: number;
  totalLaps: number;
  checkpointsCleared: number;
  raceTime: number;
  bestLapTime: number | null;
  boostEnergy: number;
  isBoosting: boolean;
  hopReady: boolean;
  dashReady: boolean;
  altitudeMeters: number;
  ringsCollected: number;
  styleScore: number;
  cameraMode: CameraMode;
  muted: boolean;
  callout: RaceEventCallout | null;
  minimapPoints: Array<{ x: number; y: number }>;
  minimapBlips: MinimapBlip[];
  standings: StandingEntry[];
}
