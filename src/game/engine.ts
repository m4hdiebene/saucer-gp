import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type {
  BiomeTheme,
  CameraMode,
  CircuitId,
  GameMode,
  GamePhase,
  HudSnapshot,
  LevelDefinition,
  PlayerInput,
  RaceEventCallout,
  RacerState,
  UfoChassisVariant,
} from './types';
import {
  CIRCUITS,
  buildBakedTrack,
  projectToMinimap,
  sampleTrackFrame,
  trackToWorld,
  type BakedTrack,
} from './track';
import {
  CHECKPOINT_PROGRESS,
  PLAYABLE_UFO_VARIANTS,
  computeStandings,
  createInitialRacers,
  getLevelRoster,
  getRacerRank,
  getUfoHandlingSpec,
} from './raceRules';
import {
  MAX_LEVEL,
  computeNextUnlockedLevel,
  getLevelDefinition,
  isLevelCleared,
  loadClearedLevels,
  loadUnlockedLevel,
  saveClearedLevels,
  saveUnlockedLevel,
} from './levels';
import {
  PHYSICS_CONSTANTS,
  computeAiInput,
  getHazardLateral,
  getHazardPhase,
  getObstacleLateral,
  resolveRacerCollisions,
  stepRacerPhysics,
  type PhysicsEvent,
} from './physics';
import {
  buildBoostPads,
  buildCanyonEnvironment,
  buildCheckpointGates,
  buildEnergyRings,
  buildIcePatches,
  buildJumpRamps,
  buildLowGravityZones,
  buildNectarStreams,
  buildShockHazards,
  buildSkyDome,
  buildSpeedGates,
  buildStartGantry,
  buildTrackMesh,
  buildTrackObstacles,
  buildUfoModel,
  buildUpdrafts,
  buildWarpTunnels,
  buildWindZones,
  createContactShadowTexture,
  createUnderglowTexture,
  type CheckpointVisual,
  type FloatingPropVisual,
  type HazardVisual,
  type ObstacleVisual,
  type RingVisual,
  type SpeedGateVisual,
  type UfoVisualRig,
  type UpdraftVisual,
  type WarpTunnelVisual,
  type WindZoneVisual,
} from './models';
import { SaucerAudio } from './audio';

// Reusable scratch math objects (Zero GC inside render loop)
const _vPos = new THREE.Vector3();
const _vLook = new THREE.Vector3();
const _vCamTarget = new THREE.Vector3();
const _vRight = new THREE.Vector3();
const _vUp = new THREE.Vector3();
const _vFwd = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _quatExtra = new THREE.Quaternion();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

const _vNormal = new THREE.Vector3();
const _vZAxis = new THREE.Vector3(0, 0, 1);

interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
  scale: number;
  color: THREE.Color;
}

interface ImpactRingSlot {
  active: boolean;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  age: number;
  life: number;
  maxScale: number;
}

const PARTICLE_POOL_SIZE = 240;
const IMPACT_RING_POOL_SIZE = 10;

function detectSoftwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class SaucerGameEngine {
  private container: HTMLElement;
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private envTexture: THREE.Texture;
  private audio = new SaucerAudio();

  private worldGroup = new THREE.Group();
  private hemiLight!: THREE.HemisphereLight;
  private sunLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private shadowTex: THREE.CanvasTexture;
  private underglowTex: THREE.CanvasTexture;
  private circuitId: CircuitId = 'solar-canyon';
  private gameMode: GameMode = 'race';
  private levelNumber = 1;
  private levelDef: LevelDefinition = getLevelDefinition(1);
  private craftOverride: UfoChassisVariant | null = null;
  private unlockedLevel = 1;
  private clearedLevels: number[] = [];
  private lastLevelCleared = false;
  private newlyUnlockedLevel: number | null = null;
  private track!: BakedTrack;
  private racers: RacerState[] = [];
  private ufoRigs = new Map<string, UfoVisualRig>();
  private ringVisuals: RingVisual[] = [];
  private checkpointVisuals: CheckpointVisual[] = [];
  private hazardVisuals: HazardVisual[] = [];
  private obstacleVisuals: ObstacleVisual[] = [];
  private speedGateVisuals: SpeedGateVisual[] = [];
  private windZoneVisuals: WindZoneVisual[] = [];
  private updraftVisuals: UpdraftVisual[] = [];
  private warpTunnelVisuals: WarpTunnelVisual[] = [];
  private rotatingGates: THREE.Group[] = [];
  private floatingProps: FloatingPropVisual[] = [];
  private collectedRings = new Set<string>();

  // Pooled particle system (zero-GC InstancedMesh) + pooled 3D impact shockwave rings
  private particleMesh!: THREE.InstancedMesh;
  private particles: ParticleSlot[] = [];
  private particleCursor = 0;
  private impactRings: ImpactRingSlot[] = [];
  private impactRingCursor = 0;
  private impactRingGeo!: THREE.TorusGeometry;

  // Game state & timing
  private phase: GamePhase = 'title';
  private cameraMode: CameraMode = 'chase';
  private raceTime = 0;
  private titleElapsed = 0;
  private hitstopTimer = 0;
  private hudEmitAccum = 0;
  private callout: RaceEventCallout | null = null;
  private calloutTimer = 0;
  private calloutSeq = 1;
  private finishBeatTimer = 0;
  private pendingFinish = false;

  // Smooth spring-damped camera & impact recoil state (zero random white-noise jitter!)
  private camPos = new THREE.Vector3(0, 18, 22);
  private camLook = new THREE.Vector3(0, 10, -20);
  private currentFov = 64;
  private camRecoilLat = 0;
  private camRecoilLatVel = 0;
  private camRecoilVert = 0;
  private camRecoilVertVel = 0;
  private camRecoilRoll = 0;
  private camRecoilRollVel = 0;
  private empTremorTimer = 0;

  // Input hub (held vs edge-triggered)
  private keysHeld = new Set<string>();
  private hopJustPressed = false;
  private dashDirQueued: -1 | 0 | 1 = 0;

  // Loop & lifecycle
  private frameId = 0;
  private disposed = false;
  private lastTimestamp = 0;
  private resizeObserver: ResizeObserver | null = null;
  private physicsEvents: PhysicsEvent[] = [];

  constructor(
    container: HTMLElement,
    onHudUpdate: (snapshot: HudSnapshot) => void,
    initialPhase: GamePhase = 'title',
    initialLevel?: number,
    initialMode: GameMode = 'race',
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.isSoftwareGl = detectSoftwareGl();
    this.gameMode = initialMode;
    this.unlockedLevel = loadUnlockedLevel();
    this.clearedLevels = loadClearedLevels();
    if (initialLevel !== undefined && Number.isFinite(initialLevel)) {
      const requested = Math.max(1, Math.min(MAX_LEVEL, Math.round(initialLevel)));
      this.levelNumber = requested;
      this.unlockedLevel = Math.max(this.unlockedLevel, requested);
    } else {
      this.levelNumber = 1;
    }
    this.levelDef = getLevelDefinition(this.levelNumber);

    // Renderer configured per Three.js studio PBR & software-WebGL standards
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = Math.max(1, container.clientWidth || window.innerWidth);
    const height = Math.max(1, container.clientHeight || window.innerHeight);
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.setAttribute('data-testid', 'game-canvas');
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(64, width / height, 0.3, 3200);

    // Mandatory studio PBR environment reflections via RoomEnvironment on every device
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTexture;
    pmrem.dispose();

    // Warm/cool 3-point outdoor canyon lighting rig
    this.setupLighting();

    this.shadowTex = createContactShadowTexture();
    this.underglowTex = createUnderglowTexture();
    this.scene.add(this.worldGroup);
    this.setupParticlePool();
    this.setupImpactRingPool();

    // Build initial level circuit & racers
    this.loadLevelWorld(this.levelNumber);

    // Bind listeners
    this.bindEvents();

    // Set initial phase
    if (initialPhase === 'playing') {
      this.startRace();
    } else {
      this.setPhase('title');
    }

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.lastTimestamp = performance.now();
    this.scheduleNextFrame(true);
  }

  private setupLighting(): void {
    // 3-point outdoor planetary lighting rig (dynamically tinted per biome in loadLevelWorld)
    this.hemiLight = new THREE.HemisphereLight(0x88b4f7, 0xb85e3a, 0.85);
    this.hemiLight.position.set(0, 120, 0);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffe1b8, 2.25);
    this.sunLight.position.set(160, 185, 95);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 20;
    this.sunLight.shadow.camera.far = 850;
    const d = 260;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    this.rimLight = new THREE.DirectionalLight(0x69c7ff, 0.72);
    this.rimLight.position.set(-140, 80, -160);
    this.scene.add(this.rimLight);
  }

  private applyBiomeLighting(biome: BiomeTheme): void {
    if (biome === 'glacier') {
      this.hemiLight.color.setHex(0xcbeeff);
      this.hemiLight.groundColor.setHex(0x3a648c);
      this.hemiLight.intensity = 0.96;
      this.sunLight.color.setHex(0xeef9ff);
      this.sunLight.intensity = 2.25;
      this.rimLight.color.setHex(0x38bdf8);
      this.rimLight.intensity = 0.92;
    } else if (biome === 'biolume') {
      this.hemiLight.color.setHex(0x6ee7b7);
      this.hemiLight.groundColor.setHex(0x115e59);
      this.hemiLight.intensity = 0.96;
      this.sunLight.color.setHex(0xd1fae5);
      this.sunLight.intensity = 2.05;
      this.rimLight.color.setHex(0xf472b6);
      this.rimLight.intensity = 1.05;
    } else if (biome === 'volcano') {
      this.hemiLight.color.setHex(0xffa773);
      this.hemiLight.groundColor.setHex(0x731d10);
      this.hemiLight.intensity = 0.9;
      this.sunLight.color.setHex(0xffc791);
      this.sunLight.intensity = 2.2;
      this.rimLight.color.setHex(0xff5722);
      this.rimLight.intensity = 0.98;
    } else if (biome === 'cybercity') {
      this.hemiLight.color.setHex(0x7dd3fc);
      this.hemiLight.groundColor.setHex(0x4c1d95);
      this.hemiLight.intensity = 0.95;
      this.sunLight.color.setHex(0xe0f2fe);
      this.sunLight.intensity = 2.1;
      this.rimLight.color.setHex(0xec4899);
      this.rimLight.intensity = 1.15;
    } else if (biome === 'aether') {
      this.hemiLight.color.setHex(0xd6efff);
      this.hemiLight.groundColor.setHex(0xd8c7a3);
      this.hemiLight.intensity = 1.04;
      this.sunLight.color.setHex(0xfff6dd);
      this.sunLight.intensity = 2.38;
      this.rimLight.color.setHex(0x7dd3fc);
      this.rimLight.intensity = 0.86;
    } else if (biome === 'quantum') {
      this.hemiLight.color.setHex(0xd8b4fe);
      this.hemiLight.groundColor.setHex(0x311042);
      this.hemiLight.intensity = 0.96;
      this.sunLight.color.setHex(0xfef3c7);
      this.sunLight.intensity = 2.22;
      this.rimLight.color.setHex(0x2df9f2);
      this.rimLight.intensity = 1.15;
    } else if (biome === 'nebula') {
      this.hemiLight.color.setHex(0xb3a1ff);
      this.hemiLight.groundColor.setHex(0x4e2d66);
      this.hemiLight.intensity = 0.94;
      this.sunLight.color.setHex(0xffddb8);
      this.sunLight.intensity = 2.18;
      this.rimLight.color.setHex(0x38bdf8);
      this.rimLight.intensity = 1.05;
    } else {
      this.hemiLight.color.setHex(0x88b4f7);
      this.hemiLight.groundColor.setHex(0xb85e3a);
      this.hemiLight.intensity = 0.85;
      this.sunLight.color.setHex(0xffe1b8);
      this.sunLight.intensity = 2.25;
      this.rimLight.color.setHex(0x69c7ff);
      this.rimLight.intensity = 0.72;
    }
  }

  private setupParticlePool(): void {
    const geo = new THREE.OctahedronGeometry(0.32, 0);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
    });
    this.particleMesh = new THREE.InstancedMesh(geo, mat, PARTICLE_POOL_SIZE);
    this.particleMesh.frustumCulled = false;

    this.particles = [];
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -9999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        age: 0,
        life: 0.4,
        scale: 0,
        color: new THREE.Color(0x22f2e8),
      });
      _dummy.position.set(0, -9999, 0);
      _dummy.scale.setScalar(0.0001);
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
      this.particleMesh.setColorAt(i, _color.setHex(0x22f2e8));
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.particleMesh);
  }

  private spawnParticles(
    x: number,
    y: number,
    z: number,
    count: number,
    colorHex: number,
    speed: number,
    life: number,
    baseScale = 1,
  ): void {
    for (let i = 0; i < count; i++) {
      const slot = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % PARTICLE_POOL_SIZE;
      slot.active = true;
      slot.x = x + (Math.random() - 0.5) * 0.6;
      slot.y = y + (Math.random() - 0.5) * 0.4;
      slot.z = z + (Math.random() - 0.5) * 0.6;
      const theta = Math.random() * Math.PI * 2;
      const up = (Math.random() - 0.2) * speed * 0.8;
      slot.vx = Math.cos(theta) * speed * (0.4 + Math.random() * 0.7);
      slot.vy = up;
      slot.vz = Math.sin(theta) * speed * (0.4 + Math.random() * 0.7);
      slot.age = 0;
      slot.life = life * (0.75 + Math.random() * 0.5);
      slot.scale = baseScale * (0.7 + Math.random() * 0.6);
      slot.color.setHex(colorHex);
    }
  }

  private setupImpactRingPool(): void {
    this.impactRingGeo = new THREE.TorusGeometry(1.0, 0.13, 8, 24);
    this.impactRings = [];
    for (let i = 0; i < IMPACT_RING_POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x5dfcf7,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(this.impactRingGeo, mat);
      mesh.visible = false;
      mesh.renderOrder = 8;
      this.scene.add(mesh);
      this.impactRings.push({
        active: false,
        mesh,
        mat,
        age: 0,
        life: 0.36,
        maxScale: 3.2,
      });
    }
  }

  private spawnImpactRing(
    x: number,
    y: number,
    z: number,
    nx: number,
    ny: number,
    nz: number,
    colorHex: number,
    maxScale = 3.2,
    life = 0.36,
  ): void {
    const slot = this.impactRings[this.impactRingCursor];
    this.impactRingCursor = (this.impactRingCursor + 1) % IMPACT_RING_POOL_SIZE;
    slot.active = true;
    slot.age = 0;
    slot.life = life;
    slot.maxScale = maxScale;
    slot.mat.color.setHex(colorHex);
    slot.mat.opacity = 0.92;
    slot.mesh.visible = true;
    slot.mesh.position.set(x, y, z);
    _vNormal.set(nx, ny, nz);
    if (_vNormal.lengthSq() < 1e-4) _vNormal.set(0, 1, 0);
    else _vNormal.normalize();
    slot.mesh.quaternion.setFromUnitVectors(_vZAxis, _vNormal);
    slot.mesh.scale.setScalar(0.45);
  }

  private updateImpactRings(dt: number): void {
    for (let i = 0; i < IMPACT_RING_POOL_SIZE; i++) {
      const slot = this.impactRings[i];
      if (!slot.active) continue;
      slot.age += dt;
      if (slot.age >= slot.life) {
        slot.active = false;
        slot.mesh.visible = false;
        slot.mat.opacity = 0;
        continue;
      }
      const p = slot.age / slot.life;
      // Fast ease-out expansion with clean alpha decay
      const easeOut = 1 - (1 - p) * (1 - p);
      const s = 0.45 + easeOut * (slot.maxScale - 0.45);
      slot.mesh.scale.setScalar(s);
      slot.mat.opacity = (1 - p) * (1 - p) * 0.92;
    }
  }

  private spawnDirectionalSparks(
    x: number,
    y: number,
    z: number,
    nx: number,
    ny: number,
    nz: number,
    count: number,
    colorHex: number,
    speed: number,
    life: number,
    baseScale = 1,
  ): void {
    for (let i = 0; i < count; i++) {
      const slot = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % PARTICLE_POOL_SIZE;
      slot.active = true;
      slot.x = x + (Math.random() - 0.5) * 0.45;
      slot.y = y + (Math.random() - 0.5) * 0.35;
      slot.z = z + (Math.random() - 0.5) * 0.45;
      const spread = 0.65;
      const rx = nx + (Math.random() - 0.5) * spread * 2;
      const ry = Math.max(0.15, ny + (Math.random() - 0.25) * spread * 1.4);
      const rz = nz + (Math.random() - 0.5) * spread * 2;
      const rLen = Math.hypot(rx, ry, rz) || 1;
      const spd = speed * (0.55 + Math.random() * 0.75);
      slot.vx = (rx / rLen) * spd;
      slot.vy = (ry / rLen) * spd;
      slot.vz = (rz / rLen) * spd;
      slot.age = 0;
      slot.life = life * (0.72 + Math.random() * 0.45);
      slot.scale = baseScale * (0.65 + Math.random() * 0.55);
      slot.color.setHex(colorHex);
    }
  }

  private applyCameraRecoil(latImpulse: number, vertImpulse: number, rollImpulse: number): void {
    this.camRecoilLatVel += latImpulse;
    this.camRecoilVertVel += vertImpulse;
    this.camRecoilRollVel += rollImpulse;
  }

  private updateParticles(dt: number): void {
    let anyDirty = false;
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      anyDirty = true;
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        _dummy.position.set(0, -9999, 0);
        _dummy.scale.setScalar(0.0001);
        _dummy.updateMatrix();
        this.particleMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 9.5 * dt;

      const t = 1 - p.age / p.life;
      _dummy.position.set(p.x, p.y, p.z);
      _dummy.rotation.set(p.age * 5, p.age * 7, 0);
      _dummy.scale.setScalar(Math.max(0.01, p.scale * t));
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
      this.particleMesh.setColorAt(i, p.color);
    }
    if (anyDirty) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  private clearWorldGroup(): void {
    while (this.worldGroup.children.length > 0) {
      const child = this.worldGroup.children[0];
      this.worldGroup.remove(child);
      child.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
    }
    for (const rig of this.ufoRigs.values()) {
      for (const tex of rig.disposableTextures) {
        tex.dispose();
      }
    }
    this.ufoRigs.clear();
    this.ringVisuals = [];
    this.checkpointVisuals = [];
    this.hazardVisuals = [];
    this.obstacleVisuals = [];
    this.speedGateVisuals = [];
    this.windZoneVisuals = [];
    this.updraftVisuals = [];
    this.warpTunnelVisuals = [];
    this.rotatingGates = [];
    this.floatingProps = [];
  }

  public loadLevelWorld(levelNum: number): void {
    this.levelDef = getLevelDefinition(levelNum);
    this.levelNumber = this.levelDef.number;
    this.circuitId = this.levelDef.circuitId;
    this.clearWorldGroup();

    const def = CIRCUITS[this.circuitId];
    this.track = buildBakedTrack(def, 600);
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    // Match fog, background, and 3-point lighting to planetary biome (tuned for huge scenic vistas)
    this.scene.background = new THREE.Color(def.fogColor);
    const fogDensity =
      def.biome === 'canyon'
        ? 0.00092
        : def.biome === 'glacier'
        ? 0.00086
        : def.biome === 'biolume'
        ? 0.0009
        : def.biome === 'nebula'
        ? 0.00082
        : def.biome === 'aether' || def.biome === 'cybercity' || def.biome === 'quantum'
        ? 0.00108
        : 0.00135;
    this.scene.fog = new THREE.FogExp2(def.fogColor, fogDensity);
    this.applyBiomeLighting(def.biome);

    // Sky dome + Biome environment + Track + Gantry + Boost pads + Blue-Ice/Nectar/Zero-G Strips + Jump Ramps + Updrafts + Warp Tunnels + Rings + Checkpoints + Hazards + Obstacles + Slingshot Gates + Wind Zones
    this.worldGroup.add(buildSkyDome(def.skyTopColor, def.skyHorizonColor));
    const envBuilt = buildCanyonEnvironment(this.track, maxAniso, this.isSoftwareGl);
    this.worldGroup.add(envBuilt.group);
    this.rotatingGates = envBuilt.rotatingGates;
    this.floatingProps = envBuilt.floatingProps;

    this.worldGroup.add(buildTrackMesh(this.track, maxAniso, this.isSoftwareGl));
    this.worldGroup.add(buildStartGantry(this.track, this.isSoftwareGl));
    this.worldGroup.add(buildBoostPads(this.track, maxAniso));
    this.worldGroup.add(buildIcePatches(this.track, maxAniso));
    this.worldGroup.add(buildNectarStreams(this.track, maxAniso));
    this.worldGroup.add(buildLowGravityZones(this.track, maxAniso));
    this.worldGroup.add(buildJumpRamps(this.track, maxAniso));

    const updrafts = buildUpdrafts(this.track);
    this.worldGroup.add(updrafts.group);
    this.updraftVisuals = updrafts.visuals;

    const warpTunnels = buildWarpTunnels(this.track);
    this.worldGroup.add(warpTunnels.group);
    this.warpTunnelVisuals = warpTunnels.visuals;

    const rings = buildEnergyRings(this.track);
    this.worldGroup.add(rings.group);
    this.ringVisuals = rings.visuals;

    const checkpoints = buildCheckpointGates(this.track, CHECKPOINT_PROGRESS);
    this.worldGroup.add(checkpoints.group);
    this.checkpointVisuals = checkpoints.visuals;

    const hazards = buildShockHazards(
      this.track,
      this.levelDef.hazardCount,
      this.levelDef.hazardWidthScale,
    );
    this.worldGroup.add(hazards.group);
    this.hazardVisuals = hazards.visuals;

    const obstacles = buildTrackObstacles(this.track, this.isSoftwareGl);
    this.worldGroup.add(obstacles.group);
    this.obstacleVisuals = obstacles.visuals;

    const speedGates = buildSpeedGates(this.track);
    this.worldGroup.add(speedGates.group);
    this.speedGateVisuals = speedGates.visuals;

    const windZones = buildWindZones(this.track);
    this.worldGroup.add(windZones.group);
    this.windZoneVisuals = windZones.visuals;

    // Build level-specific exotic 6-UFO fleet (with distinct player craft & rivals per level!)
    const levelRoster = getLevelRoster(
      this.levelNumber,
      this.levelDef.featuredPlayerChassis,
      this.craftOverride,
    );
    for (const cfg of levelRoster) {
      const rig = buildUfoModel(cfg, this.isSoftwareGl, this.shadowTex, maxAniso, this.underglowTex);
      this.worldGroup.add(rig.root);
      this.worldGroup.add(rig.contactShadow);
      this.worldGroup.add(rig.groundGlow);
      this.ufoRigs.set(cfg.id, rig);
    }

    this.resetRaceEntities();
    this.syncRacerVisuals(0);
    this.snapCameraToCurrentMode();
    this.emitHudSnapshot();
  }

  private resetRaceEntities(): void {
    this.racers = createInitialRacers(
      this.track,
      this.levelDef,
      this.gameMode,
      this.craftOverride,
    );
    const activeIds = new Set(this.racers.map((r) => r.id));
    for (const [id, rig] of this.ufoRigs.entries()) {
      const vis = activeIds.has(id);
      rig.root.visible = vis;
      rig.contactShadow.visible = vis;
      rig.groundGlow.visible = vis;
    }

    this.collectedRings.clear();
    this.raceTime = 0;
    this.hitstopTimer = 0;
    this.camRecoilLat = 0;
    this.camRecoilLatVel = 0;
    this.camRecoilVert = 0;
    this.camRecoilVertVel = 0;
    this.camRecoilRoll = 0;
    this.camRecoilRollVel = 0;
    this.empTremorTimer = 0;
    this.callout = null;
    this.calloutTimer = 0;
    this.pendingFinish = false;
    this.finishBeatTimer = 0;
    this.hopJustPressed = false;
    this.dashDirQueued = 0;
    this.lastLevelCleared = false;
    this.newlyUnlockedLevel = null;

    for (const rv of this.ringVisuals) {
      rv.group.visible = true;
    }
    for (const ov of this.obstacleVisuals) {
      ov.group.visible = true;
    }
    this.resetCheckpointVisuals();
    for (const p of this.particles) {
      p.active = false;
    }
    for (const ring of this.impactRings) {
      ring.active = false;
      ring.mesh.visible = false;
    }
  }

  private resetCheckpointVisuals(): void {
    for (const cp of this.checkpointVisuals) {
      cp.bannerMat.color.setHex(0x2df9f2);
      cp.bannerMat.opacity = 0.34;
      cp.pillarMat.color.setHex(0x2df9f2);
      cp.pillarMat.emissive.setHex(0x0ec7c7);
      cp.pillarMat.emissiveIntensity = 1.25;
    }
  }

  public getCircuitId(): CircuitId {
    return this.circuitId;
  }

  public selectLevel(levelNumber: number): void {
    const clamped = Math.max(1, Math.min(MAX_LEVEL, Math.round(levelNumber)));
    if (clamped === this.levelNumber) return;
    this.loadLevelWorld(clamped);
  }

  public setGameMode(mode: GameMode): void {
    if (mode === this.gameMode) return;
    this.gameMode = mode;
    this.resetRaceEntities();
    this.syncRacerVisuals(0);
    this.emitHudSnapshot();
  }

  public cyclePlayerCraft(dir: 1 | -1): void {
    const activeVariant = this.craftOverride ?? this.levelDef.featuredPlayerChassis;
    const idx = PLAYABLE_UFO_VARIANTS.indexOf(activeVariant);
    const nextIdx = (idx + dir + PLAYABLE_UFO_VARIANTS.length) % PLAYABLE_UFO_VARIANTS.length;
    const nextVariant = PLAYABLE_UFO_VARIANTS[nextIdx];
    this.craftOverride = nextVariant === this.levelDef.featuredPlayerChassis ? null : nextVariant;
    this.rebuildPlayerRigInPlace();
  }

  public resetCraftToLevelDefault(): void {
    if (this.craftOverride === null) return;
    this.craftOverride = null;
    this.rebuildPlayerRigInPlace();
  }

  private rebuildPlayerRigInPlace(): void {
    const oldRig = this.ufoRigs.get('player');
    if (oldRig) {
      this.worldGroup.remove(oldRig.root, oldRig.contactShadow, oldRig.groundGlow);
      oldRig.root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material?.dispose();
        }
      });
      oldRig.contactShadow.geometry.dispose();
      (oldRig.contactShadow.material as THREE.Material).dispose();
      oldRig.groundGlow.geometry.dispose();
      (oldRig.groundGlow.material as THREE.Material).dispose();
      for (const tex of oldRig.disposableTextures) tex.dispose();
    }
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const roster = getLevelRoster(
      this.levelNumber,
      this.levelDef.featuredPlayerChassis,
      this.craftOverride,
    );
    const playerCfg = roster[0];
    const newRig = buildUfoModel(
      playerCfg,
      this.isSoftwareGl,
      this.shadowTex,
      maxAniso,
      this.underglowTex,
    );
    this.worldGroup.add(newRig.root, newRig.contactShadow, newRig.groundGlow);
    this.ufoRigs.set('player', newRig);
    this.resetRaceEntities();
    this.syncRacerVisuals(0);
    this.emitHudSnapshot();
  }

  public startNextLevel(): void {
    const next = Math.min(MAX_LEVEL, this.levelNumber + 1);
    if (next !== this.levelNumber) {
      this.loadLevelWorld(next);
    }
    this.startRace();
  }

  private setPhase(next: GamePhase): void {
    this.phase = next;
    document.body.dataset.state = next;
    if (next !== 'playing') {
      this.audio.silenceEngine();
      this.keysHeld.clear();
      this.hopJustPressed = false;
      this.dashDirQueued = 0;
    }
    this.emitHudSnapshot();
  }

  public startRace(): void {
    this.audio.unlock();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.resetRaceEntities();
    this.syncRacerVisuals(0);
    this.setPhase('playing');
    this.snapCameraToCurrentMode();
    this.pushCallout('GO!', 'cyan', 1.0);
    this.audio.playBoostPad();
  }

  public restartRace(): void {
    this.startRace();
  }

  public pauseRace(): void {
    if (this.phase === 'playing') {
      this.setPhase('paused');
    }
  }

  public resumeRace(): void {
    if (this.phase === 'paused') {
      this.audio.unlock();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      this.keysHeld.clear();
      this.setPhase('playing');
    }
  }

  public returnToTitle(): void {
    this.resetRaceEntities();
    this.syncRacerVisuals(0);
    this.setPhase('title');
  }

  public toggleCameraMode(): void {
    this.cameraMode = this.cameraMode === 'chase' ? 'close' : 'chase';
    this.emitHudSnapshot();
  }

  public toggleMute(): boolean {
    const muted = this.audio.toggleMute();
    this.emitHudSnapshot();
    return muted;
  }

  private pushCallout(text: string, tone: RaceEventCallout['tone'], duration = 1.25): void {
    this.callout = { text, tone, id: this.calloutSeq++ };
    this.calloutTimer = duration;
    this.emitHudSnapshot();
  }

  private readPlayerInput(): PlayerInput {
    const up = this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp');
    const down = this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown');
    const left = this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft');
    const right = this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight');
    const boostHeld = this.keysHeld.has('Space');
    const hopHeld = this.keysHeld.has('ShiftLeft') || this.keysHeld.has('ShiftRight');

    const throttle = (up ? 1 : 0) - (down ? 1 : 0);
    const steer = (right ? 1 : 0) - (left ? 1 : 0);
    const hopJustPressed = this.hopJustPressed;
    this.hopJustPressed = false;
    const dashDir = this.dashDirQueued;
    this.dashDirQueued = 0;

    return { throttle, steer, boostHeld, hopJustPressed, hopHeld, dashDir };
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Prevent page scrolling on game control keys
    if (
      ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)
    ) {
      e.preventDefault();
    }

    if (e.repeat) return;

    if (this.phase === 'title') {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        this.startRace();
        return;
      }
    }

    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (this.phase === 'playing') {
        this.pauseRace();
      } else if (this.phase === 'paused') {
        this.resumeRace();
      }
      return;
    }

    if (e.code === 'KeyM') {
      this.toggleMute();
      return;
    }

    if (e.code === 'KeyC' && this.phase === 'playing') {
      this.toggleCameraMode();
      return;
    }

    if (e.code === 'KeyR' && (this.phase === 'playing' || this.phase === 'paused')) {
      this.restartRace();
      return;
    }

    if (this.phase === 'playing') {
      this.audio.unlock();
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.hopJustPressed = true;
      } else if (e.code === 'KeyQ') {
        this.dashDirQueued = -1;
      } else if (e.code === 'KeyE') {
        this.dashDirQueued = 1;
      }
      this.keysHeld.add(e.code);
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keysHeld.delete(e.code);
  };

  private handleBlur = (): void => {
    // Clear held inputs on focus loss without auto-pausing (safe for headless verification)
    this.keysHeld.clear();
    this.hopJustPressed = false;
    this.dashDirQueued = 0;
  };

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.keysHeld.clear();
      this.hopJustPressed = false;
      this.dashDirQueued = 0;
    }
  };

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
  };

  private handleResize = (): void => {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown, { passive: false });
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.container);
    }
  }

  private snapCameraToCurrentMode(): void {
    const player = this.racers[0];
    if (!player) return;
    const frame = sampleTrackFrame(this.track, player.t);
    const backDist = this.cameraMode === 'chase' ? 14.5 : 10.2;
    const upDist = this.cameraMode === 'chase' ? 5.8 : 3.7;
    this.camPos.set(
      player.worldX - frame.tangent.x * backDist + frame.up.x * upDist,
      player.worldY - frame.tangent.y * backDist + frame.up.y * upDist,
      player.worldZ - frame.tangent.z * backDist + frame.up.z * upDist,
    );
    this.camLook.set(
      player.worldX + frame.tangent.x * 18,
      player.worldY + frame.tangent.y * 18 + 1.1,
      player.worldZ + frame.tangent.z * 18,
    );
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  private processPhysicsEvents(): void {
    for (const ev of this.physicsEvents) {
      if (ev.type === 'boost-start' && ev.isPlayer) {
        this.audio.playBoost();
        this.spawnParticles(ev.worldX, ev.worldY, ev.worldZ, 10, 0x22f2e8, 12, 0.35, 1.1);
      } else if (ev.type === 'boost-pad') {
        this.spawnParticles(ev.worldX, ev.worldY, ev.worldZ, ev.isPlayer ? 16 : 6, 0x2df9f2, 16, 0.42, 1.2);
        if (ev.isPlayer) {
          this.audio.playBoostPad();
          this.pushCallout('BOOST PAD!', 'cyan', 0.9);
        }
      } else if (ev.type === 'ramp-launch') {
        this.spawnImpactRing(ev.worldX, ev.worldY - 0.4, ev.worldZ, 0, 1, 0, 0xffd166, 4.3, 0.46);
        this.spawnParticles(ev.worldX, ev.worldY, ev.worldZ, ev.isPlayer ? 20 : 8, 0xffd166, 17, 0.5, 1.25);
        if (ev.isPlayer) {
          this.audio.playBoostPad();
          this.applyCameraRecoil(0, -1.8, 0);
          this.pushCallout('SKY LAUNCH! +150', 'amber', 1.05);
        }
      } else if (ev.type === 'updraft-lift') {
        this.spawnImpactRing(ev.worldX, ev.worldY - 0.3, ev.worldZ, 0, 1, 0, 0x34d399, 4.8, 0.5);
        this.spawnParticles(ev.worldX, ev.worldY, ev.worldZ, ev.isPlayer ? 22 : 8, 0x7efcf7, 18, 0.55, 1.3);
        if (ev.isPlayer) {
          this.audio.playRingPickup(true);
          this.applyCameraRecoil(0, -2.0, 0);
          this.pushCallout('UPDRAFT LIFT! +120', 'cyan', 1.05);
        }
      } else if (ev.type === 'warp-surge') {
        this.spawnImpactRing(ev.worldX, ev.worldY, ev.worldZ, 0, 0, 1, 0xf472b6, 5.2, 0.45);
        this.spawnParticles(ev.worldX, ev.worldY, ev.worldZ, ev.isPlayer ? 26 : 10, 0x2df9f2, 22, 0.52, 1.35);
        if (ev.isPlayer) {
          this.audio.playBoostPad();
          this.applyCameraRecoil(0, -1.2, 0);
          this.pushCallout('WARP SURGE! +200', 'amber', 1.15);
        }
      } else if (ev.type === 'slingshot-gate') {
        this.spawnImpactRing(ev.worldX, ev.worldY, ev.worldZ, 0, 0, 1, 0xffd166, 5.0, 0.44);
        this.spawnParticles(ev.worldX, ev.worldY, ev.worldZ, ev.isPlayer ? 24 : 8, 0xffd166, 20, 0.48, 1.3);
        if (ev.isPlayer) {
          this.audio.playBoostPad();
          this.applyCameraRecoil(0, -1.4, 0);
          this.pushCallout('SLINGSHOT! +180', 'amber', 1.1);
        }
      } else if (ev.type === 'bumper-bounce') {
        const nx = ev.normalX ?? 0;
        const ny = ev.normalY ?? 0.35;
        const nz = ev.normalZ ?? 0;
        this.spawnImpactRing(ev.worldX, ev.worldY, ev.worldZ, nx, ny, nz, 0xffd166, 4.2, 0.38);
        this.spawnDirectionalSparks(ev.worldX, ev.worldY, ev.worldZ, nx, ny + 0.25, nz, 18, 0x5dfcf7, 17, 0.42, 1.15);
        if (ev.isPlayer) {
          const dir = ev.impactDir ?? 1;
          this.audio.playRingPickup(true);
          this.applyCameraRecoil(-dir * 3.6, 1.3, -dir * 0.14);
          this.pushCallout('PINBALL BOUNCE! +100', 'cyan', 1.0);
        }
      } else if (ev.type === 'crystal-shatter') {
        this.spawnImpactRing(ev.worldX, ev.worldY, ev.worldZ, 0, 1, 0, 0x7efcf7, 4.6, 0.42);
        this.spawnParticles(ev.worldX, ev.worldY + 0.5, ev.worldZ, ev.isPlayer ? 24 : 8, 0x7efcf7, 19, 0.52, 1.25);
        this.spawnParticles(ev.worldX, ev.worldY + 0.4, ev.worldZ, ev.isPlayer ? 12 : 4, 0xffffff, 15, 0.44, 0.95);
        if (ev.isPlayer) {
          this.audio.playRingPickup(true);
          this.applyCameraRecoil(0, -1.1, 0);
          this.pushCallout('CRYSTAL SHATTER! +140', 'cyan', 1.0);
          if (ev.obstacleId) {
            const ov = this.obstacleVisuals.find((o) => o.id === ev.obstacleId);
            if (ov) ov.group.visible = false;
          }
        }
      } else if (ev.type === 'ice-glide') {
        this.spawnParticles(ev.worldX, ev.worldY - 0.6, ev.worldZ, ev.isPlayer ? 14 : 5, 0xbaf2ff, 12, 0.38, 1.0);
        if (ev.isPlayer) {
          this.audio.playBoost();
          this.pushCallout('BLUE-ICE GLIDE! +80', 'cyan', 0.95);
        }
      } else if (ev.type === 'spore-bounce') {
        this.spawnImpactRing(ev.worldX, ev.worldY - 0.3, ev.worldZ, 0, 1, 0, 0xf472b6, 4.9, 0.48);
        this.spawnParticles(ev.worldX, ev.worldY, ev.worldZ, ev.isPlayer ? 24 : 8, 0x34d399, 19, 0.54, 1.3);
        this.spawnParticles(ev.worldX, ev.worldY + 0.3, ev.worldZ, ev.isPlayer ? 12 : 4, 0xf472b6, 16, 0.48, 1.05);
        if (ev.isPlayer) {
          this.audio.playBoostPad();
          this.applyCameraRecoil(0, -2.1, 0);
          this.pushCallout('SPORE BOUNCE! +160', 'amber', 1.05);
        }
      } else if (ev.type === 'pollen-burst') {
        this.spawnImpactRing(ev.worldX, ev.worldY, ev.worldZ, 0, 1, 0, 0xfde047, 4.4, 0.4);
        this.spawnParticles(ev.worldX, ev.worldY + 0.4, ev.worldZ, ev.isPlayer ? 24 : 8, 0xfde047, 18, 0.52, 1.2);
        this.spawnParticles(ev.worldX, ev.worldY + 0.4, ev.worldZ, ev.isPlayer ? 12 : 4, 0x34d399, 15, 0.46, 0.95);
        if (ev.isPlayer) {
          this.audio.playRingPickup(true);
          this.applyCameraRecoil(0, -1.0, 0);
          this.pushCallout('POLLEN BURST! +130', 'amber', 1.0);
          if (ev.obstacleId) {
            const ov = this.obstacleVisuals.find((o) => o.id === ev.obstacleId);
            if (ov) ov.group.visible = false;
          }
        }
      } else if (ev.type === 'nectar-surge') {
        this.spawnParticles(ev.worldX, ev.worldY - 0.5, ev.worldZ, ev.isPlayer ? 16 : 6, 0x34d399, 13, 0.42, 1.05);
        if (ev.isPlayer) {
          this.audio.playBoost();
          this.pushCallout('NECTAR SURGE! +90', 'cyan', 0.95);
        }
      } else if (ev.type === 'zero-g-zone') {
        this.spawnParticles(ev.worldX, ev.worldY - 0.4, ev.worldZ, ev.isPlayer ? 18 : 6, 0xe879f9, 14, 0.48, 1.15);
        if (ev.isPlayer) {
          this.audio.playHop();
          this.pushCallout('ZERO-G FLOAT! +100', 'cyan', 1.0);
        }
      } else if (ev.type === 'gravity-slingshot') {
        this.spawnImpactRing(ev.worldX, ev.worldY, ev.worldZ, 0, 1, 0, 0xe879f9, 5.2, 0.46);
        this.spawnParticles(ev.worldX, ev.worldY + 0.2, ev.worldZ, ev.isPlayer ? 26 : 8, 0xf59e0b, 20, 0.54, 1.3);
        this.spawnParticles(ev.worldX, ev.worldY + 0.3, ev.worldZ, ev.isPlayer ? 14 : 4, 0x38bdf8, 17, 0.46, 1.05);
        if (ev.isPlayer) {
          this.audio.playBoostPad();
          this.applyCameraRecoil(0, -1.6, 0);
          this.pushCallout('GRAV SLINGSHOT! +175', 'amber', 1.1);
        }
      } else if (ev.type === 'star-core-nova') {
        this.spawnImpactRing(ev.worldX, ev.worldY, ev.worldZ, 0, 1, 0, 0xfbbf24, 4.8, 0.44);
        this.spawnParticles(ev.worldX, ev.worldY + 0.4, ev.worldZ, ev.isPlayer ? 26 : 8, 0xfbbf24, 19, 0.54, 1.3);
        this.spawnParticles(ev.worldX, ev.worldY + 0.4, ev.worldZ, ev.isPlayer ? 14 : 4, 0xe879f9, 16, 0.48, 1.05);
        if (ev.isPlayer) {
          this.audio.playRingPickup(true);
          this.applyCameraRecoil(0, -1.2, 0);
          this.pushCallout('STAR-CORE NOVA! +150', 'amber', 1.05);
          if (ev.obstacleId) {
            const ov = this.obstacleVisuals.find((o) => o.id === ev.obstacleId);
            if (ov) ov.group.visible = false;
          }
        }
      } else if (ev.type === 'obstacle-hit') {
        const nx = ev.normalX ?? 0;
        const ny = ev.normalY ?? 0.3;
        const nz = ev.normalZ ?? 0;
        this.spawnImpactRing(ev.worldX, ev.worldY, ev.worldZ, nx, ny, nz, 0xff9f1c, 3.0, 0.32);
        this.spawnDirectionalSparks(ev.worldX, ev.worldY, ev.worldZ, nx, ny, nz, 14, 0xffb74d, 15, 0.36, 1.0);
        if (ev.isPlayer) {
          const dir = ev.impactDir ?? 1;
          this.audio.playBump(ev.intensity * 0.8);
          this.applyCameraRecoil(-dir * 4.4 * ev.intensity, 0.8, -dir * 0.16 * ev.intensity);
        }
      } else if (ev.type === 'side-dash') {
        const dir = ev.impactDir ?? 1;
        this.spawnParticles(ev.worldX, ev.worldY, ev.worldZ, 12, 0x5dfcf7, 14, 0.3, 0.95);
        if (ev.isPlayer) {
          this.audio.playHop();
          this.applyCameraRecoil(-dir * 2.1, 0, -dir * 0.11);
        }
      } else if (ev.type === 'ring-pickup') {
        this.spawnParticles(ev.worldX, ev.worldY, ev.worldZ, ev.isPlayer ? 18 : 6, 0xffd166, 14, 0.48, 1.25);
        if (ev.isPlayer) {
          const isElevated = ev.intensity > 0.9;
          this.audio.playRingPickup(isElevated);
          this.pushCallout(isElevated ? 'AIR RING +250' : 'RING +150', 'amber', 0.95);
          if (ev.ringId) {
            const rv = this.ringVisuals.find((r) => r.id === ev.ringId);
            if (rv) rv.group.visible = false;
          }
        }
      } else if (ev.type === 'hop') {
        this.spawnParticles(ev.worldX, ev.worldY - 0.8, ev.worldZ, ev.isPlayer ? 10 : 4, 0x7efcf7, 9, 0.32, 0.9);
        if (ev.isPlayer) this.audio.playHop();
      } else if (ev.type === 'land') {
        this.spawnParticles(ev.worldX, ev.worldY - 0.9, ev.worldZ, ev.isPlayer ? 8 : 3, 0xffd166, 8, 0.26, 0.8);
        if (ev.isPlayer) this.audio.playLand();
      } else if (ev.type === 'wall-scrape') {
        const nx = ev.normalX ?? 0;
        const ny = ev.normalY ?? 0.3;
        const nz = ev.normalZ ?? 0;
        this.spawnDirectionalSparks(
          ev.worldX,
          ev.worldY,
          ev.worldZ,
          nx,
          ny,
          nz,
          12,
          0xffb74d,
          15,
          0.34,
          0.95,
        );
        this.spawnImpactRing(ev.worldX, ev.worldY, ev.worldZ, nx, ny, nz, 0xffb74d, 2.3, 0.28);
        if (ev.isPlayer) {
          const dir = ev.impactDir ?? 1;
          this.audio.playBump(ev.intensity * 0.7);
          this.applyCameraRecoil(-dir * 3.8 * ev.intensity, 0.6, -dir * 0.14 * ev.intensity);
        }
      } else if (ev.type === 'ufo-bump') {
        const nx = ev.normalX ?? 0;
        const ny = ev.normalY ?? 0.3;
        const nz = ev.normalZ ?? 0;
        this.spawnImpactRing(ev.worldX, ev.worldY, ev.worldZ, nx, ny, nz, 0x5dfcf7, 3.4, 0.36);
        this.spawnDirectionalSparks(
          ev.worldX,
          ev.worldY,
          ev.worldZ,
          nx,
          ny + 0.3,
          nz,
          14,
          0x9bfcf9,
          16,
          0.38,
          1.05,
        );
        this.spawnDirectionalSparks(
          ev.worldX,
          ev.worldY,
          ev.worldZ,
          -nx,
          ny + 0.3,
          -nz,
          10,
          0xffd166,
          15,
          0.36,
          0.95,
        );
        if (ev.isPlayer) {
          const dir = ev.impactDir ?? 1;
          this.audio.playBump(ev.intensity);
          this.applyCameraRecoil(
            -dir * 5.6 * ev.intensity,
            1.4 * ev.intensity,
            -dir * 0.22 * ev.intensity,
          );
        }
      } else if (ev.type === 'shock-hit') {
        const nx = ev.normalX ?? 0;
        const ny = ev.normalY ?? 0.5;
        const nz = ev.normalZ ?? 0;
        this.spawnImpactRing(ev.worldX, ev.worldY, ev.worldZ, nx, ny, nz, 0xff4455, 4.0, 0.42);
        this.spawnDirectionalSparks(
          ev.worldX,
          ev.worldY,
          ev.worldZ,
          nx,
          ny,
          nz,
          22,
          0xff5964,
          18,
          0.48,
          1.25,
        );
        if (ev.isPlayer) {
          const dir = ev.impactDir ?? 1;
          this.audio.playShockHit();
          this.hitstopTimer = Math.max(this.hitstopTimer, 0.024);
          this.empTremorTimer = 0.28;
          this.applyCameraRecoil(-dir * 4.2, -3.6, -dir * 0.2);
          this.pushCallout('EMP SHOCK!', 'coral', 1.0);
        }
      } else if (ev.type === 'checkpoint' && ev.isPlayer) {
        this.audio.playCheckpoint();
        this.spawnParticles(ev.worldX, ev.worldY + 1.2, ev.worldZ, 18, 0x2df9f2, 16, 0.5, 1.3);
        this.pushCallout(`CHECKPOINT ${ev.checkpointIndex ?? ''} · +300`, 'cyan', 1.05);
        const cpVis = this.checkpointVisuals.find((c) => c.index === ev.checkpointIndex);
        if (cpVis) {
          cpVis.bannerMat.color.setHex(0xffd166);
          cpVis.bannerMat.opacity = 0.52;
          cpVis.pillarMat.color.setHex(0xffd166);
          cpVis.pillarMat.emissive.setHex(0xffa61c);
          cpVis.pillarMat.emissiveIntensity = 1.9;
        }
      } else if (ev.type === 'lap-complete' && ev.isPlayer) {
        const isFinal = this.gameMode === 'race' && ev.newLap === this.levelDef.laps;
        this.audio.playLap(isFinal);
        this.pushCallout(
          this.gameMode === 'free'
            ? `LAP ${ev.newLap} · FREE FLIGHT`
            : isFinal
            ? 'FINAL LAP!'
            : `LAP ${ev.newLap} / ${this.levelDef.laps}`,
          isFinal ? 'amber' : 'cyan',
          1.45,
        );
        for (const rv of this.ringVisuals) {
          rv.group.visible = true;
        }
        for (const ov of this.obstacleVisuals) {
          if (ov.kind === 'frost-crystal' || ov.kind === 'pollen-orb' || ov.kind === 'star-core') {
            ov.group.visible = true;
          }
        }
        this.resetCheckpointVisuals();
      } else if (ev.type === 'race-finish' && ev.isPlayer) {
        const rank = getRacerRank(this.racers, 'player');
        const cleared = isLevelCleared(this.levelNumber, rank);
        const prevUnlocked = this.unlockedLevel;
        const nextUnlocked = computeNextUnlockedLevel(this.unlockedLevel, this.levelNumber, rank);
        this.lastLevelCleared = cleared;
        if (cleared && !this.clearedLevels.includes(this.levelNumber)) {
          this.clearedLevels = [...this.clearedLevels, this.levelNumber].sort((a, b) => a - b);
          saveClearedLevels(this.clearedLevels);
        }
        if (nextUnlocked > prevUnlocked) {
          this.unlockedLevel = nextUnlocked;
          this.newlyUnlockedLevel = nextUnlocked;
          saveUnlockedLevel(nextUnlocked);
        } else {
          this.newlyUnlockedLevel = null;
        }
        this.audio.playFinish(cleared);
        this.pushCallout(
          cleared
            ? `LEVEL ${this.levelNumber} CLEARED!`
            : `FINISHED ${rank === 1 ? '1ST' : rank === 2 ? '2ND' : rank === 3 ? '3RD' : `${rank}TH`}`,
          cleared ? 'amber' : 'cyan',
          1.35,
        );
        this.pendingFinish = true;
        this.finishBeatTimer = 0.65;
      }
    }
    this.physicsEvents.length = 0;
  }

  private syncRacerVisuals(dt: number): void {
    const hoverBobTime = this.phase === 'title' ? this.titleElapsed : this.raceTime;

    for (const r of this.racers) {
      const rig = this.ufoRigs.get(r.id);
      if (!rig) continue;

      const frame = sampleTrackFrame(this.track, r.t);
      const idleBob = Math.sin(hoverBobTime * 3.4 + r.spinPhase * 0.15) * 0.14;
      const hoverHeight = PHYSICS_CONSTANTS.baseHoverHeight + r.hoverY + idleBob;
      const deckPos = trackToWorld(this.track, r.t, r.lateral, 0.05).pos;
      const craftPos = trackToWorld(this.track, r.t, r.lateral, hoverHeight).pos;

      rig.root.position.set(craftPos.x, craftPos.y, craftPos.z);

      // Build track-aligned orientation basis (+Z forward along tangent, +Y along banked up)
      _vFwd.set(frame.tangent.x, frame.tangent.y, frame.tangent.z).normalize();
      _vUp.set(frame.up.x, frame.up.y, frame.up.z).normalize();
      _vRight.crossVectors(_vUp, _vFwd).normalize();
      _mat4.makeBasis(_vRight, _vUp, _vFwd);
      _quat.setFromRotationMatrix(_mat4);

      // Smooth damped gyroscopic wobble recovery on collisions (replaces jarring jolt!)
      let wobbleRoll = 0;
      let wobblePitch = 0;
      if (r.impactTimer > 0 && r.impactDuration > 0) {
        const fade = r.impactTimer / r.impactDuration;
        const env = fade * fade;
        wobbleRoll = -r.impactDir * Math.sin(r.wobblePhase) * env * 0.44 * r.impactStrength;
        wobblePitch = Math.cos(r.wobblePhase * 0.78) * env * 0.2 * r.impactStrength;

        // Translucent 3D Energy Shield flare dome around impacted saucer
        rig.shieldGroup.visible = true;
        const shieldColor =
          r.impactType === 'shock-hit'
            ? 0xff4455
            : r.impactType === 'wall-scrape'
            ? 0xffb74d
            : 0x5dfcf7;
        rig.shieldShellMat.color.setHex(shieldColor);
        rig.shieldShellMat.opacity = env * 0.34 * r.impactStrength;
        rig.shieldWireMat.color.setHex(r.impactType === 'shock-hit' ? 0xffb3ba : 0xffffff);
        rig.shieldWireMat.opacity = env * 0.68 * r.impactStrength;
        const pulseScale = 1.0 + (1 - fade) * 0.16;
        rig.shieldGroup.scale.setScalar(pulseScale);
        rig.shieldGroup.rotation.y = r.wobblePhase * 0.12;
      } else {
        rig.shieldGroup.visible = false;
      }

      _euler.set(r.pitchAngle + wobblePitch, r.headingOffset, r.rollAngle + wobbleRoll, 'YXZ');
      _quatExtra.setFromEuler(_euler);
      rig.root.quaternion.copy(_quat).multiply(_quatExtra);

      // Squash & stretch on hop/land/impact + counter-rotating gyro turbine rings
      rig.bodyGroup.scale.set(r.squashX, r.squashY, r.squashX);
      rig.spinRing.rotation.y = r.spinPhase;
      rig.innerRing.rotation.y = -r.spinPhase * 1.45;

      // Dual-layer volumetric thruster plumes & inner white-hot cores scaled to speed & boost
      const speedRatio = Math.max(0, r.speed / PHYSICS_CONSTANTS.maxBaseSpeed);
      const isBoostActive = r.isBoosting || r.boostPadTimer > 0;
      const boostMult = isBoostActive ? 1.62 : 1.0;
      const flameLen = (0.36 + speedRatio * 1.18) * boostMult + Math.sin(hoverBobTime * 40) * 0.11;
      const flameRad = 0.76 + (isBoostActive ? 0.38 : 0);
      for (const flame of rig.thrusterFlames) {
        const s = (flame.userData.baseScale as number) || 1;
        flame.scale.set(flameRad * s, flameRad * s, Math.max(0.22, flameLen) * s);
      }
      for (const core of rig.thrusterCores) {
        const s = (core.userData.baseScale as number) || 1;
        core.scale.set(
          (flameRad * 0.92) * s,
          (flameRad * 0.92) * s,
          Math.max(0.2, flameLen * 1.04) * s,
        );
      }

      // Crisp emissive hit rim glow on collisions / EMP shock
      if (r.hitFlashTimer > 0) {
        rig.hullMaterial.emissive.setHex(0xaefcf9);
        rig.hullMaterial.emissiveIntensity = 0.75;
      } else if (r.shockSlowTimer > 0) {
        rig.hullMaterial.emissive.setHex(0xff3344);
        rig.hullMaterial.emissiveIntensity = 0.42 + Math.sin(hoverBobTime * 26) * 0.22;
      } else {
        rig.hullMaterial.emissive.copy(rig.baseEmissive);
        rig.hullMaterial.emissiveIntensity = 0;
      }

      // Grounded contact shadow disc + additive colored plasma underglow pool directly on track deck
      rig.contactShadow.position.set(deckPos.x, deckPos.y, deckPos.z);
      rig.contactShadow.quaternion.copy(_quat);
      const shadowScale = Math.max(0.45, 1.0 - r.hoverY * 0.09);
      rig.contactShadow.scale.setScalar(shadowScale);
      (rig.contactShadow.material as THREE.MeshBasicMaterial).opacity =
        Math.max(0.14, 0.58 - r.hoverY * 0.08);

      rig.groundGlow.position.set(
        deckPos.x + frame.up.x * 0.03,
        deckPos.y + frame.up.y * 0.03,
        deckPos.z + frame.up.z * 0.03,
      );
      rig.groundGlow.quaternion.copy(_quat);
      const glowPulse = 1.0 + Math.sin(hoverBobTime * 7.5 + r.spinPhase * 0.2) * 0.06;
      const glowScale = Math.max(0.5, (isBoostActive ? 1.24 : 1.0) * glowPulse - r.hoverY * 0.06);
      rig.groundGlow.scale.setScalar(glowScale);
      (rig.groundGlow.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0.1,
        (isBoostActive ? 0.62 : 0.36) - r.hoverY * 0.06,
      );

      // Emit subtle thruster exhaust trail particles while moving fast OR icy frost / biolume nectar / zero-G stardust!
      if (
        this.phase === 'playing' &&
        dt > 0 &&
        (r.isBoosting || r.boostPadTimer > 0 || r.isOnIce || r.isInNectar || r.isInLowGravity) &&
        Math.random() < (r.isPlayer ? 0.65 : 0.2)
      ) {
        const trailCol =
          r.isInLowGravity && !r.isBoosting
            ? 0xe879f9
            : r.isInNectar && !r.isBoosting
            ? 0x34d399
            : r.isOnIce && !r.isBoosting
            ? 0xbaf2ff
            : r.glowColor;
        this.spawnParticles(
          craftPos.x - frame.tangent.x * 2.4,
          craftPos.y - frame.tangent.y * 2.4 - (r.isOnIce || r.isInNectar ? 0.65 : 0),
          craftPos.z - frame.tangent.z * 2.4,
          1,
          trailCol,
          3.2,
          0.26,
          r.isPlayer ? 0.95 : 0.7,
        );
      }
    }
  }

  private updateWorldAnimations(elapsed: number): void {
    // Rotate monumental orbital skyway gates smoothly
    for (let i = 0; i < this.rotatingGates.length; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      this.rotatingGates[i].rotation.z = elapsed * (0.42 + i * 0.14) * dir;
    }

    // Animate floating creative biome props (biolume spores, nebula asteroids, quantum octahedrons)
    for (let i = 0; i < this.floatingProps.length; i++) {
      const fp = this.floatingProps[i];
      fp.mesh.position.y = fp.baseY + Math.sin(elapsed * fp.bobSpeed + fp.phase) * fp.bobAmp;
      fp.mesh.rotation.y = elapsed * fp.rotSpeed + fp.phase;
    }

    // Animate Gravity Updraft Geyser vortex columns & rising energy hoops
    for (let i = 0; i < this.updraftVisuals.length; i++) {
      const uv = this.updraftVisuals[i];
      uv.spinColumn.rotation.y = elapsed * 2.4 + i;
      for (let k = 0; k < uv.rings.length; k++) {
        const phase = ((elapsed * 0.85 + k / uv.rings.length + i * 0.17) % 1 + 1) % 1;
        uv.rings[k].position.y = 1.2 + phase * 19.5;
        const s = 0.72 + phase * 0.45;
        uv.rings[k].scale.setScalar(s);
      }
    }

    // Animate Hyper-Warp Speed Tunnel neon ring wave
    for (let i = 0; i < this.warpTunnelVisuals.length; i++) {
      const wt = this.warpTunnelVisuals[i];
      for (let k = 0; k < wt.hoops.length; k++) {
        const pulse = 1.0 + Math.sin(elapsed * 8.5 - k * 1.15) * 0.045;
        wt.hoops[k].scale.set(pulse, 0.72 * pulse, pulse);
      }
    }

    // Animate floating Energy Rings
    for (let i = 0; i < this.ringVisuals.length; i++) {
      const rv = this.ringVisuals[i];
      if (!rv.group.visible) continue;
      rv.group.position.y = rv.baseY + Math.sin(elapsed * 2.6 + i * 1.1) * 0.35;
      rv.innerMesh.rotation.y = elapsed * 2.8 + i;
      rv.innerMesh.rotation.x = elapsed * 1.9;
    }

    // Animate Static & Moving/Sweeping EMP Shock Hazards scaled by active level's cycle speed
    for (let i = 0; i < this.hazardVisuals.length; i++) {
      const hv = this.hazardVisuals[i];
      const def = hv.def;
      if (!def) continue;

      if ((def.moveAmplitude ?? 0) > 0.01) {
        const liveLat = getHazardLateral(def, elapsed, this.levelDef.hazardCycleSpeed);
        const deltaLat = liveLat - hv.baseLateral;
        hv.group.position.set(
          hv.basePos.x + hv.rightVec.x * deltaLat,
          hv.basePos.y + hv.rightVec.y * deltaLat,
          hv.basePos.z + hv.rightVec.z * deltaLat,
        );
      }

      const { phase, progress } = getHazardPhase(def, elapsed, this.levelDef.hazardCycleSpeed);

      if (phase === 'idle') {
        hv.beamMaterial.opacity = 0;
        hv.beamMesh.visible = false;
        hv.warningMaterial.color.setHex(0xffb703);
        hv.warningMaterial.opacity = 0.08;
        hv.pylonEmissives.forEach((m) => {
          m.emissive.setHex(0x662233);
          m.emissiveIntensity = 0.35;
        });
      } else if (phase === 'telegraph') {
        hv.beamMesh.visible = true;
        hv.beamMaterial.color.setHex(0xffd166);
        hv.beamMaterial.opacity = 0.16 + Math.sin(elapsed * 32) * 0.12;
        hv.beamMesh.scale.set(0.35, 1, 0.35);
        hv.warningMaterial.color.setHex(0xffb703);
        hv.warningMaterial.opacity = 0.35 + progress * 0.45;
        hv.pylonEmissives.forEach((m) => {
          m.emissive.setHex(0xffb703);
          m.emissiveIntensity = 1.2 + progress * 1.2;
        });
      } else {
        hv.beamMesh.visible = true;
        hv.beamMaterial.color.setHex(0xff3b52);
        hv.beamMaterial.opacity = 0.88;
        const pulse = 0.95 + Math.sin(elapsed * 45) * 0.2;
        hv.beamMesh.scale.set(pulse, 1, pulse);
        hv.warningMaterial.color.setHex(0xff3b52);
        hv.warningMaterial.opacity = 0.72;
        hv.pylonEmissives.forEach((m) => {
          m.emissive.setHex(0xff2a3c);
          m.emissiveIntensity = 2.6;
        });
      }
    }

    // Animate Track Obstacles (patrolling Hover Drones, pulsing Solar Pinball Bumpers & Pillar collars)
    for (let i = 0; i < this.obstacleVisuals.length; i++) {
      const ov = this.obstacleVisuals[i];
      if ((ov.def.moveAmplitude ?? 0) > 0.01) {
        const liveLat = getObstacleLateral(ov.def, elapsed);
        const deltaLat = liveLat - ov.baseLateral;
        ov.group.position.set(
          ov.basePos.x + ov.rightVec.x * deltaLat,
          ov.basePos.y + ov.rightVec.y * deltaLat,
          ov.basePos.z + ov.rightVec.z * deltaLat,
        );
      }
      if (ov.kind === 'hover-drone') {
        if (ov.spinPart) ov.spinPart.rotation.y = elapsed * 5.2 + i;
        if (ov.pulsePart) ov.pulsePart.position.y = 1.75 + Math.sin(elapsed * 3.8 + i) * 0.24;
      } else if (ov.kind === 'bumper-orb') {
        if (ov.spinPart) {
          ov.spinPart.rotation.y = elapsed * 2.8 + i;
          ov.spinPart.rotation.x = Math.sin(elapsed * 1.9 + i) * 0.35;
        }
        if (ov.pulsePart) {
          const s = 1.0 + Math.sin(elapsed * 5.5 + i * 1.3) * 0.08;
          ov.pulsePart.scale.setScalar(s);
        }
      } else if (ov.kind === 'frost-crystal' || ov.kind === 'pollen-orb' || ov.kind === 'star-core') {
        if (ov.spinPart) {
          ov.spinPart.rotation.y =
            elapsed * (ov.kind === 'star-core' ? 3.2 : ov.kind === 'pollen-orb' ? 2.8 : 2.4) + i;
          ov.spinPart.position.y = 2.2 + Math.sin(elapsed * 3.6 + i) * 0.28;
        }
      } else if (ov.kind === 'gravity-well') {
        if (ov.spinPart) {
          ov.spinPart.rotation.y = elapsed * 3.8 + i;
          ov.spinPart.rotation.z = Math.sin(elapsed * 2.2 + i) * 0.28;
        }
        if (ov.pulsePart) {
          const s = 1.0 + Math.sin(elapsed * 6.0 + i) * 0.1;
          ov.pulsePart.scale.setScalar(s);
        }
      } else if (ov.kind === 'spore-pad' && ov.pulsePart) {
        const s = 1.0 + Math.sin(elapsed * 4.4 + i) * 0.06;
        ov.pulsePart.scale.set(s, 1.0 + Math.cos(elapsed * 4.4 + i) * 0.07, s);
      } else if (ov.kind === 'meteor-spire') {
        if (ov.spinPart) {
          ov.spinPart.rotation.y = elapsed * 1.45 * (i % 2 === 0 ? 1 : -1) + i;
        }
      } else if (
        (ov.kind === 'rock-pillar' || ov.kind === 'ice-spire' || ov.kind === 'spore-stalk') &&
        ov.pulsePart
      ) {
        const s = 1.0 + Math.sin(elapsed * 3.2 + i) * 0.03;
        ov.pulsePart.scale.set(s, s, 1);
      }
    }

    // Animate Spinning Floating Slingshot Turbo Gates
    for (let i = 0; i < this.speedGateVisuals.length; i++) {
      const sg = this.speedGateVisuals[i];
      const dir = i % 2 === 0 ? 1 : -1;
      sg.spinRing.rotation.z = elapsed * 1.85 * dir + i;
    }

    // Animate Alpine Blizzard Crosswind blowing snow-streak ribbons across the road!
    for (let i = 0; i < this.windZoneVisuals.length; i++) {
      const wz = this.windZoneVisuals[i];
      for (let k = 0; k < wz.streaks.length; k++) {
        const st = wz.streaks[k];
        const frac = (((elapsed * st.speed + st.phase) % 1) + 1) % 1;
        const offset = (frac - 0.5) * st.span * st.dir;
        st.mesh.position.set(
          st.basePos.x + st.rightVec.x * offset,
          st.basePos.y + st.rightVec.y * offset,
          st.basePos.z + st.rightVec.z * offset,
        );
      }
    }
  }

  private updateTitleCamera(dt: number): void {
    this.titleElapsed += dt;
    // Live World Camera Tour: graceful sweeping arc orbiting the starting grid & gantry arch
    const angle = 0.38 + Math.sin(this.titleElapsed * 0.24) * 0.48;
    const radius = 26 + Math.cos(this.titleElapsed * 0.18) * 4;
    const focusFrame = sampleTrackFrame(this.track, 0.002);

    // Offset look target slightly to the left of screen so saucers sit cleanly on the right 60%
    // leaving 35-40% calm negative space on the left for the SVG Title Lockup
    const targetX = focusFrame.pos.x - focusFrame.right.x * 5.2;
    const targetY = focusFrame.pos.y + 4.4;
    const targetZ = focusFrame.pos.z - focusFrame.right.z * 5.2;

    const desiredX =
      focusFrame.pos.x -
      focusFrame.tangent.x * Math.cos(angle) * radius +
      focusFrame.right.x * Math.sin(angle) * radius * 0.75;
    const desiredY = focusFrame.pos.y + 8.5 + Math.sin(this.titleElapsed * 0.35) * 1.8;
    const desiredZ =
      focusFrame.pos.z -
      focusFrame.tangent.z * Math.cos(angle) * radius +
      focusFrame.right.z * Math.sin(angle) * radius * 0.75;

    const k = 1 - Math.exp(-3.5 * dt);
    this.camPos.lerp(_vCamTarget.set(desiredX, desiredY, desiredZ), k);
    this.camLook.lerp(_vLook.set(targetX, targetY, targetZ), k);

    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    this.currentFov = THREE.MathUtils.damp(this.currentFov, 56, 5, dt);
    if (Math.abs(this.camera.fov - this.currentFov) > 0.05) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }
  }

  private updateGameplayCamera(dt: number): void {
    const player = this.racers[0];
    if (!player) return;

    const frame = sampleTrackFrame(this.track, player.t);
    const isBoost = player.isBoosting || player.boostPadTimer > 0;
    const speedRatio = Math.max(0, player.speed / PHYSICS_CONSTANTS.maxBaseSpeed);

    const backDist =
      (this.cameraMode === 'chase' ? 14.8 : 10.0) + (isBoost ? 1.8 : 0);
    const upDist =
      (this.cameraMode === 'chase' ? 6.2 : 3.9) + player.hoverY * 0.25;

    // Smooth lateral anchor (follows 72% of saucer lateral offset so steering feels buttery smooth)
    const camAnchor = trackToWorld(
      this.track,
      player.t,
      player.lateral * 0.72,
      PHYSICS_CONSTANTS.baseHoverHeight + player.hoverY * 0.45,
    ).pos;

    _vCamTarget.set(
      camAnchor.x - frame.tangent.x * backDist + frame.up.x * upDist,
      camAnchor.y - frame.tangent.y * backDist + frame.up.y * upDist,
      camAnchor.z - frame.tangent.z * backDist + frame.up.z * upDist,
    );

    const lookAheadFrame = sampleTrackFrame(this.track, player.t + 0.024);
    _vLook.set(
      lookAheadFrame.pos.x + lookAheadFrame.right.x * (player.lateral * 0.48),
      lookAheadFrame.pos.y + 2.2,
      lookAheadFrame.pos.z + lookAheadFrame.right.z * (player.lateral * 0.48),
    );

    const posAlpha = 1 - Math.exp(-8.5 * dt);
    const lookAlpha = 1 - Math.exp(-11.0 * dt);
    this.camPos.lerp(_vCamTarget, posAlpha);
    this.camLook.lerp(_vLook, lookAlpha);

    // Second-order critically-damped spring camera recoil (smooth physical weight, zero random jitter!)
    const stiffness = 135;
    const damping = 18;
    this.camRecoilLatVel += (-stiffness * this.camRecoilLat - damping * this.camRecoilLatVel) * dt;
    this.camRecoilLat += this.camRecoilLatVel * dt;
    this.camRecoilVertVel += (-stiffness * this.camRecoilVert - damping * this.camRecoilVertVel) * dt;
    this.camRecoilVert += this.camRecoilVertVel * dt;
    this.camRecoilRollVel += (-120 * this.camRecoilRoll - 16 * this.camRecoilRollVel) * dt;
    this.camRecoilRoll += this.camRecoilRollVel * dt;

    let empWave = 0;
    if (this.empTremorTimer > 0) {
      this.empTremorTimer = Math.max(0, this.empTremorTimer - dt);
      const norm = this.empTremorTimer / 0.28;
      empWave = Math.sin(this.raceTime * 32) * norm * norm * 0.24;
    }

    const totalLatOffset = THREE.MathUtils.clamp(this.camRecoilLat + empWave, -1.25, 1.25);
    const totalVertOffset = THREE.MathUtils.clamp(this.camRecoilVert, -0.75, 0.75);

    _vPos.copy(this.camPos);
    _vPos.x += frame.right.x * totalLatOffset + frame.up.x * totalVertOffset;
    _vPos.y += frame.right.y * totalLatOffset + frame.up.y * totalVertOffset;
    _vPos.z += frame.right.z * totalLatOffset + frame.up.z * totalVertOffset;

    this.camera.position.copy(_vPos);
    this.camera.lookAt(this.camLook);
    if (Math.abs(this.camRecoilRoll) > 0.0005) {
      this.camera.rotateZ(THREE.MathUtils.clamp(this.camRecoilRoll, -0.06, 0.06));
    }

    // Subtle dynamic FOV widening during acceleration & plasma boost
    const targetFov =
      (this.cameraMode === 'chase' ? 64 : 70) +
      Math.min(1, speedRatio) * 7 +
      (isBoost ? 10 : 0);
    this.currentFov = THREE.MathUtils.damp(this.currentFov, targetFov, 7, dt);
    if (Math.abs(this.camera.fov - this.currentFov) > 0.05) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }
  }

  private emitHudSnapshot(): void {
    const player = this.racers[0];
    if (!player) return;

    const standings = computeStandings(this.racers);
    const playerStanding = standings.find((s) => s.isPlayer);
    const speedKmh = Math.round(
      Math.max(0, player.speed * PHYSICS_CONSTANTS.speedDisplayScale),
    );

    const minimapBlips = this.racers.map((r) => {
      const mm = projectToMinimap(this.track, r.worldX, r.worldZ);
      return {
        id: r.id,
        isPlayer: r.isPlayer,
        x: mm.x,
        y: mm.y,
        color: `#${r.glowColor.toString(16).padStart(6, '0')}`,
      };
    });

    const playerSpec = getUfoHandlingSpec(player.chassisVariant);

    this.onHudUpdate({
      phase: this.phase,
      gameMode: this.gameMode,
      levelNumber: this.levelDef.number,
      levelName: this.levelDef.name,
      difficultyTier: this.levelDef.tier,
      fleetTag: this.levelDef.fleetTag,
      playerChassisVariant: player.chassisVariant,
      playerCraftName: playerSpec.className,
      craftOverride: this.craftOverride,
      targetRank: this.levelDef.targetRank,
      unlockedLevel: this.unlockedLevel,
      clearedLevels: this.clearedLevels,
      maxLevel: MAX_LEVEL,
      levelCleared: this.lastLevelCleared,
      newlyUnlockedLevel: this.newlyUnlockedLevel,
      circuitId: this.circuitId,
      circuitName: this.track.def.name,
      speedKmh,
      rank: playerStanding ? playerStanding.rank : 1,
      totalRacers: this.racers.length,
      lap: this.gameMode === 'free' ? player.lap : Math.min(player.lap, this.levelDef.laps),
      totalLaps: this.levelDef.laps,
      checkpointsCleared: player.maxCheckpoint,
      raceTime: this.raceTime,
      bestLapTime: player.bestLapTime,
      boostEnergy: Math.round(player.boostEnergy),
      isBoosting: player.isBoosting || player.boostPadTimer > 0,
      hopReady: player.hopCooldown <= 0 && player.hoverY <= 0.08,
      dashReady: player.dashCooldown <= 0,
      altitudeMeters: Math.round(player.hoverY * 10) / 10,
      ringsCollected: player.ringsCollected,
      styleScore: player.styleScore,
      cameraMode: this.cameraMode,
      muted: this.audio.isMuted(),
      callout: this.callout,
      minimapPoints: this.track.minimapPoints,
      minimapBlips,
      standings,
    });
  }

  private stepSimulation(dt: number): void {
    // Callout timer runs in real time
    if (this.calloutTimer > 0) {
      this.calloutTimer -= dt;
      if (this.calloutTimer <= 0) {
        this.callout = null;
      }
    }

    if (this.phase === 'title') {
      for (const r of this.racers) {
        r.spinPhase += dt * 2.2;
      }
      this.syncRacerVisuals(0);
      this.updateWorldAnimations(this.titleElapsed);
      this.updateTitleCamera(dt);
      return;
    }

    if (this.phase === 'paused' || this.phase === 'gameover') {
      this.updateParticles(dt * 0.25);
      this.updateImpactRings(dt * 0.25);
      return;
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      this.updateParticles(dt);
      this.updateImpactRings(dt);
      this.updateGameplayCamera(dt);
      return;
    }

    this.raceTime += dt;
    const player = this.racers[0];
    const playerInput = this.readPlayerInput();

    // Step player & rivals using active level difficulty knobs & gameMode
    for (let i = 0; i < this.racers.length; i++) {
      const r = this.racers[i];
      const input = r.isPlayer
        ? playerInput
        : computeAiInput(
            r,
            this.racers,
            this.track,
            this.raceTime,
            dt,
            player.totalProgress,
            this.levelDef,
          );

      stepRacerPhysics(
        r,
        input,
        this.track,
        this.raceTime,
        dt,
        this.collectedRings,
        this.physicsEvents,
        this.levelDef,
        this.gameMode,
      );
    }

    resolveRacerCollisions(this.racers, this.track, this.physicsEvents);
    this.processPhysicsEvents();

    // Update continuous engine audio
    this.audio.updateEngine(
      player.speed / PHYSICS_CONSTANTS.maxBaseSpeed,
      player.isBoosting || player.boostPadTimer > 0,
      !this.pendingFinish,
    );

    // Sync 3D meshes, rings, hazards, particles, impact shockwaves, and camera
    this.syncRacerVisuals(dt);
    this.updateWorldAnimations(this.raceTime);
    this.updateParticles(dt);
    this.updateImpactRings(dt);
    this.updateGameplayCamera(dt);

    // Brief celebratory beat after crossing finish line before showing Results modal
    if (this.pendingFinish) {
      this.finishBeatTimer -= dt;
      if (this.finishBeatTimer <= 0) {
        this.pendingFinish = false;
        this.setPhase('gameover');
        return;
      }
    }

    // Throttle React HUD updates to ~10 Hz (never 60Hz setState)
    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.1) {
      this.hudEmitAccum = 0;
      this.emitHudSnapshot();
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;
    // Clamp frame delta to <= 0.05s to prevent tunneling on tab switch or software-GL hiccups
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    this.stepSimulation(dt);
    this.renderer.render(this.scene, this.camera);

    this.scheduleNextFrame(false);
  };

  private scheduleNextFrame(immediate: boolean): void {
    if (this.disposed) return;
    if (immediate) {
      this.frameId = requestAnimationFrame(this.tick);
      return;
    }
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.resizeObserver?.disconnect();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);

    this.audio.dispose();
    this.clearWorldGroup();
    this.particleMesh?.geometry.dispose();
    (this.particleMesh?.material as THREE.Material)?.dispose();
    this.impactRingGeo?.dispose();
    for (const slot of this.impactRings) {
      slot.mat.dispose();
      this.scene.remove(slot.mesh);
    }
    this.shadowTex?.dispose();
    this.underglowTex?.dispose();
    this.envTexture?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
