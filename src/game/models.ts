import * as THREE from 'three';
import type { BakedTrack } from './track';
import { sampleTrackFrame, trackToWorld } from './track';
import type { BiomeTheme, RacerConfig, ShockHazardDef, TrackObstacleDef } from './types';

export interface UfoVisualRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  spinRing: THREE.Group;
  innerRing: THREE.Group;
  thrusterFlames: THREE.Mesh[];
  thrusterCores: THREE.Mesh[];
  underGlow: THREE.Mesh;
  contactShadow: THREE.Mesh;
  groundGlow: THREE.Mesh;
  hullMaterial: THREE.MeshPhysicalMaterial;
  baseEmissive: THREE.Color;
  shieldGroup: THREE.Group;
  shieldShellMat: THREE.MeshBasicMaterial;
  shieldWireMat: THREE.MeshBasicMaterial;
  disposableTextures: THREE.Texture[];
}

export interface RingVisual {
  id: string;
  group: THREE.Group;
  innerMesh: THREE.Mesh;
  baseY: number;
  t: number;
  lateral: number;
}

export interface HazardVisual {
  id: string;
  group: THREE.Group;
  beamMesh: THREE.Mesh;
  beamMaterial: THREE.MeshBasicMaterial;
  warningStrip: THREE.Mesh;
  warningMaterial: THREE.MeshBasicMaterial;
  pylonEmissives: THREE.MeshStandardMaterial[];
  basePos: THREE.Vector3;
  rightVec: THREE.Vector3;
  baseLateral: number;
  def: ShockHazardDef;
}

export interface CheckpointVisual {
  index: number;
  group: THREE.Group;
  bannerMat: THREE.MeshBasicMaterial;
  pillarMat: THREE.MeshStandardMaterial;
}

export interface UpdraftVisual {
  group: THREE.Group;
  spinColumn: THREE.Mesh;
  rings: THREE.Mesh[];
}

export interface WarpTunnelVisual {
  group: THREE.Group;
  hoops: THREE.Mesh[];
}

export interface FloatingPropVisual {
  mesh: THREE.Object3D;
  baseY: number;
  phase: number;
  bobAmp: number;
  bobSpeed: number;
  rotSpeed: number;
}

export interface ObstacleVisual {
  id: string;
  kind: TrackObstacleDef['kind'];
  group: THREE.Group;
  spinPart: THREE.Object3D | null;
  pulsePart: THREE.Object3D | null;
  basePos: THREE.Vector3;
  rightVec: THREE.Vector3;
  baseLateral: number;
  def: TrackObstacleDef;
}

export interface SpeedGateVisual {
  id: string;
  group: THREE.Group;
  spinRing: THREE.Group;
}

export interface WindZoneVisual {
  group: THREE.Group;
  streaks: Array<{
    mesh: THREE.Mesh;
    basePos: THREE.Vector3;
    rightVec: THREE.Vector3;
    span: number;
    phase: number;
    speed: number;
    dir: number;
  }>;
}

export function createTrackTextures(
  biome: BiomeTheme,
  maxAnisotropy: number,
): {
  albedo: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
} {
  // Per-biome high-contrast magnetic race deck with distinct palette, lane strips, and curbs
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const palette =
    biome === 'glacier'
      ? {
          deck: '#1b2c40',
          curbA: '#38bdf8',
          curbB: '#e0f2fe',
          guide: '#7efcf7',
          lane: 'rgba(224, 242, 254, 0.3)',
          center: 'rgba(186, 230, 253, 0.72)',
          seam: 'rgba(8, 22, 38, 0.42)',
        }
      : biome === 'biolume'
      ? {
          deck: '#0e2829',
          curbA: '#34d399',
          curbB: '#f472b6',
          guide: '#2df9f2',
          lane: 'rgba(167, 243, 208, 0.28)',
          center: 'rgba(52, 211, 153, 0.75)',
          seam: 'rgba(4, 20, 22, 0.5)',
        }
      : biome === 'volcano'
      ? {
          deck: '#1e191d',
          curbA: '#ff5722',
          curbB: '#2d1e22',
          guide: '#ffab00',
          lane: 'rgba(255, 171, 64, 0.28)',
          center: 'rgba(255, 138, 61, 0.68)',
          seam: 'rgba(12, 6, 8, 0.56)',
        }
      : biome === 'cybercity'
      ? {
          deck: '#13162a',
          curbA: '#ec4899',
          curbB: '#22d3ee',
          guide: '#38bdf8',
          lane: 'rgba(244, 114, 182, 0.3)',
          center: 'rgba(45, 249, 242, 0.78)',
          seam: 'rgba(7, 8, 20, 0.55)',
        }
      : biome === 'aether'
      ? {
          deck: '#2d374e',
          curbA: '#fbbf24',
          curbB: '#f8fafc',
          guide: '#38bdf8',
          lane: 'rgba(248, 250, 252, 0.34)',
          center: 'rgba(253, 224, 71, 0.72)',
          seam: 'rgba(18, 24, 38, 0.34)',
        }
      : biome === 'quantum'
      ? {
          deck: '#19122e',
          curbA: '#fbbf24',
          curbB: '#c084fc',
          guide: '#2df9f2',
          lane: 'rgba(216, 180, 254, 0.3)',
          center: 'rgba(251, 191, 36, 0.8)',
          seam: 'rgba(9, 6, 22, 0.54)',
        }
      : biome === 'nebula'
      ? {
          deck: '#211c36',
          curbA: '#e879f9',
          curbB: '#fde68a',
          guide: '#2df9f2',
          lane: 'rgba(245, 208, 254, 0.25)',
          center: 'rgba(103, 232, 249, 0.62)',
          seam: 'rgba(10, 8, 24, 0.48)',
        }
      : {
          deck: '#252734',
          curbA: '#f59e42',
          curbB: '#f4e7d4',
          guide: '#26d9d9',
          lane: 'rgba(244, 231, 212, 0.24)',
          center: 'rgba(255, 224, 178, 0.58)',
          seam: 'rgba(12, 13, 20, 0.45)',
        };

  // Base magnetic track deck
  ctx.fillStyle = palette.deck;
  ctx.fillRect(0, 0, 512, 512);

  // Longitudinal brushed magnetic track grain
  for (let i = 0; i < 160; i++) {
    const x = Math.floor((i / 160) * 512);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.032)' : 'rgba(0,0,0,0.065)';
    ctx.fillRect(x, 0, 2, 512);
  }

  // Biome-specific surface detail
  if (biome === 'glacier') {
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.14)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 16; i++) {
      const y = i * 32;
      ctx.beginPath();
      ctx.moveTo(46, y);
      ctx.lineTo(466, y + 18);
      ctx.stroke();
    }
  } else if (biome === 'biolume') {
    // Organic glowing bioluminescent vein patterns along shoulders
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.28)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 8; i++) {
      const y = i * 64;
      ctx.beginPath();
      ctx.moveTo(54, y);
      ctx.quadraticCurveTo(96, y + 32, 62, y + 64);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(458, y);
      ctx.quadraticCurveTo(416, y + 32, 450, y + 64);
      ctx.stroke();
    }
  } else if (biome === 'volcano') {
    // Glowing ember heat-vent strips along shoulders
    ctx.fillStyle = 'rgba(255, 92, 34, 0.24)';
    for (let y = 18; y < 512; y += 64) {
      ctx.fillRect(58, y, 16, 22);
      ctx.fillRect(438, y, 16, 22);
    }
  } else if (biome === 'cybercity') {
    // Circuit-board neon traces & tech grid tiles
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.lineWidth = 2;
    for (let x = 88; x <= 424; x += 56) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(236, 72, 153, 0.24)';
    for (let y = 24; y < 512; y += 128) {
      ctx.fillRect(62, y, 22, 14);
      ctx.fillRect(428, y, 22, 14);
    }
  } else if (biome === 'aether' || biome === 'quantum') {
    // Luminous geometric chevron weave
    ctx.fillStyle =
      biome === 'quantum' ? 'rgba(192, 132, 252, 0.12)' : 'rgba(255, 255, 255, 0.05)';
    for (let y = 0; y < 512; y += 128) {
      ctx.beginPath();
      ctx.moveTo(96, y + 64);
      ctx.lineTo(256, y + 12);
      ctx.lineTo(416, y + 64);
      ctx.lineTo(416, y + 84);
      ctx.lineTo(256, y + 32);
      ctx.lineTo(96, y + 84);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Transverse expansion seams
  ctx.fillStyle = palette.seam;
  for (let y = 0; y < 512; y += 64) {
    ctx.fillRect(0, y, 512, 3);
  }

  // Outer magnetic curbs
  const curbW = 34;
  for (let y = 0; y < 512; y += 64) {
    const isWarm = (y / 64) % 2 === 0;
    ctx.fillStyle = isWarm ? palette.curbA : palette.curbB;
    ctx.fillRect(0, y, curbW, 64);
    ctx.fillRect(512 - curbW, y, curbW, 64);
  }

  // Crisp glowing magnetic guide rails inside curbs
  ctx.fillStyle = palette.guide;
  ctx.fillRect(curbW + 4, 0, 7, 512);
  ctx.fillRect(512 - curbW - 11, 0, 7, 512);

  // Subtle racing lane dividers
  ctx.fillStyle = palette.lane;
  for (let y = 16; y < 512; y += 64) {
    ctx.fillRect(170, y, 4, 34);
    ctx.fillRect(338, y, 4, 34);
  }

  // Centerline guide dashes
  ctx.fillStyle = palette.center;
  for (let y = 12; y < 512; y += 64) {
    ctx.fillRect(253, y, 6, 36);
  }

  const albedo = new THREE.CanvasTexture(canvas);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.wrapS = THREE.RepeatWrapping;
  albedo.wrapT = THREE.RepeatWrapping;
  albedo.anisotropy = maxAnisotropy;

  // Grayscale micro-relief bump texture
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 256;
  bumpCanvas.height = 256;
  const bctx = bumpCanvas.getContext('2d')!;
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    bctx.fillStyle = '#4a4a4a';
    bctx.fillRect(0, y, 256, 2);
  }
  for (let i = 0; i < 600; i++) {
    const rx = (i * 73) % 256;
    const ry = (i * 137) % 256;
    bctx.fillStyle = i % 2 === 0 ? '#969696' : '#6c6c6c';
    bctx.fillRect(rx, ry, 2, 6);
  }
  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.anisotropy = maxAnisotropy;

  return { albedo, bump };
}

export function createTerrainTexture(
  biome: BiomeTheme,
  primaryHex: string,
  accentHex: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = primaryHex;
  ctx.fillRect(0, 0, 512, 512);

  if (biome === 'glacier') {
    // Frosted glacial snowdrifts & crystalline cyan crevasse striations
    for (let i = 0; i < 32; i++) {
      const y = (i / 32) * 512;
      ctx.fillStyle = i % 2 === 0 ? accentHex : 'rgba(255, 255, 255, 0.38)';
      ctx.globalAlpha = 0.32;
      ctx.fillRect(0, y, 512, 8 + (i % 4) * 4);
    }
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    for (let i = 0; i < 18; i++) {
      const x0 = (i * 71) % 512;
      const y0 = (i * 113) % 512;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + 48, y0 + 24);
      ctx.lineTo(x0 + 92, y0 - 8);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (biome === 'volcano') {
    // Dark charred basalt crust criss-crossed by glowing molten magma fissure veins!
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = i % 2 === 0 ? accentHex : '#140c10';
      ctx.globalAlpha = 0.4;
      ctx.fillRect(0, (i / 40) * 512, 512, 10);
    }
    ctx.globalAlpha = 1;
    // Outer molten orange glow
    ctx.strokeStyle = 'rgba(255, 87, 34, 0.72)';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const sx = (i * 83) % 512;
      const sy = (i * 131) % 512;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 68, sy + 42);
      ctx.lineTo(sx + 132, sy + 18);
      ctx.lineTo(sx + 190, sy + 72);
      ctx.stroke();
    }
    // Inner bright yellow-gold lava core
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.88)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const sx = (i * 83) % 512;
      const sy = (i * 131) % 512;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 68, sy + 42);
      ctx.lineTo(sx + 132, sy + 18);
      ctx.lineTo(sx + 190, sy + 72);
      ctx.stroke();
    }
  } else if (biome === 'aether') {
    // Soft sunlit cloud-sea floor with golden horizon drift bands
    for (let i = 0; i < 24; i++) {
      const cx = (i * 97) % 512;
      const cy = (i * 67) % 512;
      const grad = ctx.createRadialGradient(cx, cy, 12, cx, cy, 96);
      grad.addColorStop(0, i % 3 === 0 ? 'rgba(255, 250, 235, 0.55)' : 'rgba(186, 230, 253, 0.42)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);
    }
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = i % 2 === 0 ? accentHex : 'rgba(255, 245, 214, 0.25)';
      ctx.globalAlpha = 0.22;
      ctx.fillRect(0, i * 26, 512, 12);
    }
    ctx.globalAlpha = 1;
  } else if (biome === 'biolume') {
    // Deep alien twilight moss floor with glowing bioluminescent river veins & spore rings
    for (let i = 0; i < 28; i++) {
      const cx = (i * 89) % 512;
      const cy = (i * 137) % 512;
      const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 58);
      grad.addColorStop(0, i % 3 === 0 ? 'rgba(52, 211, 153, 0.42)' : 'rgba(244, 114, 182, 0.28)');
      grad.addColorStop(1, 'rgba(13, 59, 62, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);
    }
    ctx.strokeStyle = 'rgba(45, 249, 242, 0.35)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 10; i++) {
      const sx = (i * 61) % 512;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.bezierCurveTo(sx + 65, 170, sx - 55, 340, sx + 25, 512);
      ctx.stroke();
    }
  } else if (biome === 'cybercity') {
    // Illuminated midnight metropolis grid streets & glowing cyan/magenta avenues
    ctx.fillStyle = '#0d1022';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.lineWidth = 3;
    for (let g = 0; g < 512; g += 64) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, g);
      ctx.lineTo(512, g);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.42)';
    ctx.lineWidth = 5;
    for (let g = 32; g < 512; g += 128) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, 512);
      ctx.stroke();
    }
    for (let i = 0; i < 48; i++) {
      const bx = ((i * 73) % 8) * 64 + 12;
      const by = ((i * 41) % 8) * 64 + 12;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(45, 249, 242, 0.22)' : 'rgba(251, 191, 36, 0.18)';
      ctx.fillRect(bx, by, 38, 38);
    }
  } else if (biome === 'quantum') {
    // Prismatic obsidian-indigo dimension floor with gold & violet crystalline lattice
    ctx.fillStyle = '#140c2b';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.34)';
    ctx.lineWidth = 2.5;
    for (let i = -512; i < 1024; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 512, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i, 512);
      ctx.lineTo(i + 512, 0);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
    ctx.lineWidth = 3;
    for (let y = 64; y < 512; y += 128) {
      for (let x = 64; x < 512; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, y - 28);
        ctx.lineTo(x + 28, y);
        ctx.lineTo(x, y + 28);
        ctx.lineTo(x - 28, y);
        ctx.closePath();
        ctx.stroke();
      }
    }
  } else {
    // Layered desert sandstone / twilight strata & wind-carved streaks
    for (let i = 0; i < 36; i++) {
      const y = (i / 36) * 512;
      ctx.fillStyle = i % 3 === 0 ? accentHex : 'rgba(255, 220, 185, 0.14)';
      ctx.globalAlpha = 0.28;
      ctx.fillRect(0, y, 512, 6 + (i % 5) * 3);
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 900; i++) {
      const x = (i * 97) % 512;
      const y = (i * 53) % 512;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 232, 200, 0.08)' : 'rgba(40, 14, 12, 0.08)';
      ctx.fillRect(x, y, 14, 3);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(30, 30);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(8, 6, 12, 0.72)');
  grad.addColorStop(0.55, 'rgba(10, 8, 16, 0.36)');
  grad.addColorStop(1, 'rgba(10, 8, 16, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createUnderglowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
  grad.addColorStop(0.32, 'rgba(255, 255, 255, 0.48)');
  grad.addColorStop(0.68, 'rgba(255, 255, 255, 0.14)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function hexToCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

/**
 * Generates bespoke 512x512 top-down procedural UFO livery albedo & panel-seam bump maps
 * with brushed alloy micro-grain, radial seam lines, carbon cooling vents, racing stripes,
 * and crisp stenciled chassis numbers.
 */
function createUfoHullTextures(
  config: RacerConfig,
  maxAnisotropy: number,
): { albedo: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 512;
  const cx = size * 0.5;
  const cy = size * 0.5;

  const hullCss = hexToCss(config.hullColor);
  const trimCss = hexToCss(config.trimColor);
  const glowCss = hexToCss(config.glowColor);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base metallic finish with subtle radial brushed shading
  const baseGrad = ctx.createRadialGradient(cx, cy - 28, 26, cx, cy, 256);
  baseGrad.addColorStop(0, '#ffffff');
  baseGrad.addColorStop(0.18, hullCss);
  baseGrad.addColorStop(0.78, hullCss);
  baseGrad.addColorStop(1, '#1c202c');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, size, size);

  // Subtle concentric metallic lathe brushing rings
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1.5;
  for (let r = 82; r < 245; r += 8) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Variant-specific racing livery stripes & contrasting carbon panels
  ctx.save();
  if (config.chassisVariant === 'nova-interceptor') {
    // Bold twin turquoise F1 center stripes + forward nose chevron
    ctx.fillStyle = trimCss;
    ctx.fillRect(cx - 28, 12, 18, 220);
    ctx.fillRect(cx + 10, 12, 18, 220);
    // Rear twin aero carbon deck cutouts
    ctx.fillStyle = '#1b202e';
    ctx.beginPath();
    ctx.moveTo(cx - 95, cy + 72);
    ctx.lineTo(cx - 32, cy + 72);
    ctx.lineTo(cx - 52, cy + 215);
    ctx.lineTo(cx - 125, cy + 175);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 95, cy + 72);
    ctx.lineTo(cx + 32, cy + 72);
    ctx.lineTo(cx + 52, cy + 215);
    ctx.lineTo(cx + 125, cy + 175);
    ctx.closePath();
    ctx.fill();
    // Glowing cyan accent pinstripes flanking rear vents
    ctx.strokeStyle = glowCss;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, 182, Math.PI * 0.14, Math.PI * 0.86);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 182, Math.PI * 1.14, Math.PI * 1.86);
    ctx.stroke();
  } else if (config.chassisVariant === 'apex-blade') {
    // Swept crimson/gold V-chevron nose livery
    ctx.fillStyle = trimCss;
    ctx.beginPath();
    ctx.moveTo(cx, 18);
    ctx.lineTo(cx + 130, 145);
    ctx.lineTo(cx + 104, 170);
    ctx.lineTo(cx, 62);
    ctx.lineTo(cx - 104, 170);
    ctx.lineTo(cx - 130, 145);
    ctx.closePath();
    ctx.fill();
    // Dark carbon side flanks
    ctx.fillStyle = '#1c1820';
    ctx.fillRect(18, cy - 34, 92, 68);
    ctx.fillRect(size - 110, cy - 34, 92, 68);
  } else if (config.chassisVariant === 'volt-catamaran') {
    // High-voltage diagonal hazard stripes + dark graphite hood
    ctx.fillStyle = '#1b1f2d';
    ctx.fillRect(cx - 64, 16, 128, 175);
    ctx.fillStyle = glowCss;
    ctx.fillRect(cx - 10, 16, 20, 470);
    ctx.strokeStyle = '#1b1f2d';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, 178, 0, Math.PI * 2);
    ctx.stroke();
  } else if (config.chassisVariant === 'titan-vanguard') {
    // Heavy armored silver shoulder plates & tactical dark hex band
    ctx.fillStyle = trimCss;
    ctx.beginPath();
    ctx.arc(cx, cy, 205, -Math.PI * 0.78, -Math.PI * 0.22);
    ctx.arc(cx, cy, 138, -Math.PI * 0.22, -Math.PI * 0.78, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#172033';
    ctx.fillRect(cx - 48, cy + 75, 96, 150);
  } else if (config.chassisVariant === 'slip-manta') {
    // Flowing lime slipstream curves along outer crescent
    ctx.strokeStyle = trimCss;
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(cx, cy, 190, Math.PI * 0.08, Math.PI * 0.92);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 190, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
    ctx.fillStyle = '#10332b';
    ctx.beginPath();
    ctx.arc(cx, cy, 148, 0, Math.PI * 2);
    ctx.stroke();
  } else if (config.chassisVariant === 'cryo-prism') {
    // Faceted ice-crystal geometric hexagon stripes & frost-cyan core bands
    ctx.strokeStyle = trimCss;
    ctx.lineWidth = 10;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = cx + Math.cos(a) * 195;
      const py = cy + Math.sin(a) * 195;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = glowCss;
    ctx.lineWidth = 4;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 100, cy + Math.sin(a) * 100);
      ctx.lineTo(cx + Math.cos(a) * 238, cy + Math.sin(a) * 238);
      ctx.stroke();
    }
  } else if (config.chassisVariant === 'spore-jelly') {
    // Organic bioluminescent spotted dome & radial plasma veins
    ctx.strokeStyle = glowCss;
    ctx.lineWidth = 6;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 90, cy + Math.sin(a) * 90);
      ctx.lineTo(cx + Math.cos(a) * 228, cy + Math.sin(a) * 228);
      ctx.stroke();
      ctx.fillStyle = trimCss;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a + 0.31) * 176, cy + Math.sin(a + 0.31) * 176, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (config.chassisVariant === 'tri-orbiter') {
    // Triple-axis delta emblem stripes converging on central cockpit
    ctx.strokeStyle = trimCss;
    ctx.lineWidth = 16;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * 238, cy + Math.sin(a) * 238);
      ctx.stroke();
    }
    ctx.strokeStyle = glowCss;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, 166, 0, Math.PI * 2);
    ctx.stroke();
  } else if (config.chassisVariant === 'magma-forge') {
    // Heavy volcanic armor plates & molten glowing fissure ribs
    ctx.fillStyle = '#181216';
    ctx.fillRect(cx - 190, cy - 30, 380, 60);
    ctx.strokeStyle = trimCss;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, 186, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = glowCss;
    ctx.lineWidth = 6;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.25;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 124, cy + Math.sin(a) * 124);
      ctx.lineTo(cx + Math.cos(a) * 236, cy + Math.sin(a) * 236);
      ctx.stroke();
    }
  } else if (config.chassisVariant === 'cyber-spinner') {
    // Sleek neon cyberpunk circuit lines & split laser chevrons
    ctx.strokeStyle = trimCss;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(cx - 120, 40);
    ctx.lineTo(cx, 120);
    ctx.lineTo(cx + 120, 40);
    ctx.stroke();
    ctx.strokeStyle = glowCss;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(cx, cy, 168, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 206, 0.4, Math.PI - 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 206, Math.PI + 0.4, Math.PI * 2 - 0.4);
    ctx.stroke();
  } else if (config.chassisVariant === 'quantum-seraph') {
    // Master-class celestial golden sunburst & violet quantum filigree
    ctx.strokeStyle = trimCss;
    ctx.lineWidth = 10;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 108, cy + Math.sin(a) * 108);
      ctx.lineTo(cx + Math.cos(a) * 238, cy + Math.sin(a) * 238);
      ctx.stroke();
    }
    ctx.strokeStyle = glowCss;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, 174, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Drift-halo: sleek ultraviolet split-ring arcs & rose-gold geometric inlays
    ctx.strokeStyle = trimCss;
    ctx.lineWidth = 12;
    for (let i = 0; i < 4; i++) {
      const a0 = i * (Math.PI / 2) + 0.2;
      ctx.beginPath();
      ctx.arc(cx, cy, 184, a0, a0 + 1.05);
      ctx.stroke();
    }
    ctx.strokeStyle = glowCss;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, 152, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // Crisp aerospace panel seam lines (dark recessed seams + subtle top highlight)
  ctx.strokeStyle = 'rgba(12, 16, 26, 0.56)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 132, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 212, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * 112, cy + Math.sin(ang) * 112);
    ctx.lineTo(cx + Math.cos(ang) * 246, cy + Math.sin(ang) * 246);
    ctx.stroke();
  }

  // Side cooling intake louvers (left & right flanks)
  ctx.fillStyle = 'rgba(14, 18, 28, 0.78)';
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const lx = cx + side * 168 - 18;
      const ly = cy - 28 + k * 16;
      ctx.fillRect(lx, ly, 36, 7);
    }
  }

  // Crisp stenciled racing number on rear deck (upright facing chase camera!)
  ctx.save();
  ctx.fillStyle = config.chassisVariant === 'nova-interceptor' ? '#0f172a' : '#fff8ee';
  ctx.strokeStyle = 'rgba(10, 14, 24, 0.65)';
  ctx.lineWidth = 5;
  ctx.font = '900 44px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const numY = config.chassisVariant === 'nova-interceptor' ? cy + 154 : cy + 168;
  ctx.strokeText(config.raceNumber, cx, numY);
  ctx.fillText(config.raceNumber, cx, numY);
  ctx.restore();

  const albedo = new THREE.CanvasTexture(canvas);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.anisotropy = maxAnisotropy;

  // Matching grayscale bump map for panel grooves & cooling louvers
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 256;
  bumpCanvas.height = 256;
  const bctx = bumpCanvas.getContext('2d')!;
  bctx.fillStyle = '#909090';
  bctx.fillRect(0, 0, 256, 256);
  bctx.strokeStyle = '#303030';
  bctx.lineWidth = 2.2;
  bctx.beginPath();
  bctx.arc(128, 128, 66, 0, Math.PI * 2);
  bctx.stroke();
  bctx.beginPath();
  bctx.arc(128, 128, 106, 0, Math.PI * 2);
  bctx.stroke();
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
    bctx.beginPath();
    bctx.moveTo(128 + Math.cos(ang) * 56, 128 + Math.sin(ang) * 56);
    bctx.lineTo(128 + Math.cos(ang) * 123, 128 + Math.sin(ang) * 123);
    bctx.stroke();
  }
  bctx.fillStyle = '#252525';
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      bctx.fillRect(128 + side * 84 - 9, 128 - 14 + k * 8, 18, 3.5);
    }
  }
  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.anisotropy = maxAnisotropy;

  return { albedo, bump };
}

export function createBoostPadTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#092434';
  ctx.fillRect(0, 0, 256, 512);

  // Glowing cyan-gold forward chevrons
  for (let i = 0; i < 4; i++) {
    const baseY = 64 + i * 118;
    ctx.beginPath();
    ctx.moveTo(26, baseY + 62);
    ctx.lineTo(128, baseY);
    ctx.lineTo(230, baseY + 62);
    ctx.lineTo(230, baseY + 94);
    ctx.lineTo(128, baseY + 34);
    ctx.lineTo(26, baseY + 94);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? '#2df9f2' : '#ffd166';
    ctx.fill();
  }

  ctx.strokeStyle = '#6cfdf9';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 246, 502);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createStartLineTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const cols = 16;
  const rows = 4;
  const cw = canvas.width / cols;
  const rh = canvas.height / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#fff6eb' : '#181822';
      ctx.fillRect(c * cw, r * rh, cw, rh);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Builds a sky gradient dome that matches the circuit horizon & fog color seamlessly.
 */
export function buildSkyDome(topColorHex: string, horizonColorHex: string): THREE.Mesh {
  const geo = new THREE.SphereGeometry(2250, 28, 18);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const topCol = new THREE.Color(topColorHex);
  const midCol = new THREE.Color(topColorHex).lerp(new THREE.Color(horizonColorHex), 0.55);
  const horCol = new THREE.Color(horizonColorHex);
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const h = THREE.MathUtils.clamp(y / 1150, 0, 1);
    if (h < 0.32) {
      tmp.copy(horCol).lerp(midCol, h / 0.32);
    } else {
      tmp.copy(midCol).lerp(topCol, (h - 0.32) / 0.68);
    }
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -10;
  return mesh;
}

/**
 * Helper to apply distortion-free planar top-down UVs to a LatheGeometry saucer fairing
 * so radial liveries, panel seams, and racing numbers stay razor-sharp from all angles.
 */
function applyPlanarSaucerUvs(geo: THREE.BufferGeometry, maxRadius: number): void {
  const pos = geo.attributes.position;
  const uvs = new Float32Array(pos.count * 2);
  const span = maxRadius * 2.04;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    // +X is screen-left from chase camera, +Z is forward nose (top of canvas)
    uvs[i * 2] = 0.5 - x / span;
    uvs[i * 2 + 1] = 0.5 + z / span;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
}

/**
 * Helper to build a beveled aerodynamic ExtrudeGeometry wing or stabilizer fin.
 */
function createBeveledWingGeo(points: Array<[number, number]>, depth = 0.1): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i][0], points[i][1]);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.028,
    bevelSize: 0.025,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

/**
 * Builds a high-craft bespoke procedural 3D Flying Saucer racer (THREE.Group)
 * with automotive clearcoat PBR livery, panel-seam bump map, visored pilot cockpit,
 * armored framed canopy, counter-rotating turbine rings, archetype aero kit,
 * dual-layer volumetric plasma thrusters, and track underglow pool.
 */
export function buildUfoModel(
  config: RacerConfig,
  isSoftwareGl: boolean,
  shadowTexture: THREE.CanvasTexture,
  maxAnisotropy = 4,
  underglowTexture?: THREE.CanvasTexture,
): UfoVisualRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const { albedo: hullAlbedo, bump: hullBump } = createUfoHullTextures(config, maxAnisotropy);
  const disposableTextures: THREE.Texture[] = [hullAlbedo, hullBump];

  // Clearcoat automotive metallic hull material with procedural panel seams & racing livery
  const hullMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: hullAlbedo,
    bumpMap: hullBump,
    bumpScale: 0.055,
    roughness: 0.28,
    metalness: 0.6,
    clearcoat: 1.0,
    clearcoatRoughness: 0.14,
  });

  const hullSolidMat = new THREE.MeshPhysicalMaterial({
    color: config.hullColor,
    roughness: 0.28,
    metalness: 0.6,
    clearcoat: 1.0,
    clearcoatRoughness: 0.14,
  });

  const lowerBellyMat = new THREE.MeshStandardMaterial({
    color: 0x2a2f3f,
    roughness: 0.56,
    metalness: 0.76,
  });

  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x181c28,
    roughness: 0.62,
    metalness: 0.42,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xd9e2f2,
    roughness: 0.18,
    metalness: 0.92,
  });

  const accentTrimMat = new THREE.MeshStandardMaterial({
    color: config.trimColor,
    roughness: 0.26,
    metalness: 0.68,
  });

  const glowMat = new THREE.MeshStandardMaterial({
    color: config.glowColor,
    emissive: config.glowColor,
    emissiveIntensity: 2.0,
    roughness: 0.16,
    metalness: 0.12,
  });

  const pilotSuitMat = new THREE.MeshStandardMaterial({
    color: 0x262d40,
    roughness: 0.72,
    metalness: 0.22,
  });

  // 1. Primary sculpted multi-step upper saucer fairing (LatheGeometry + planar top-down UVs)
  const upperProfile = [
    new THREE.Vector2(2.28, -0.06),
    new THREE.Vector2(2.44, 0.02),
    new THREE.Vector2(2.38, 0.12),
    new THREE.Vector2(2.04, 0.24),
    new THREE.Vector2(1.58, 0.36),
    new THREE.Vector2(1.18, 0.52),
    new THREE.Vector2(0.96, 0.56),
    new THREE.Vector2(0.01, 0.56),
  ];
  const upperGeo = new THREE.LatheGeometry(upperProfile, 36);
  applyPlanarSaucerUvs(upperGeo, 2.44);
  const upperMesh = new THREE.Mesh(upperGeo, hullMaterial);
  upperMesh.castShadow = !isSoftwareGl;
  upperMesh.receiveShadow = !isSoftwareGl;
  bodyGroup.add(upperMesh);

  // Recessed illuminated plasma trim channel circling mid-hull
  const midGlowRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.02, 0.042, 8, 36),
    glowMat,
  );
  midGlowRing.rotation.x = Math.PI / 2;
  midGlowRing.position.y = 0.23;
  bodyGroup.add(midGlowRing);

  // 2. Sculpted underside anti-gravity reactor dish + 6 radial magnetic cooling fins
  const lowerProfile = [
    new THREE.Vector2(0.01, -0.44),
    new THREE.Vector2(0.72, -0.42),
    new THREE.Vector2(1.24, -0.34),
    new THREE.Vector2(1.88, -0.22),
    new THREE.Vector2(2.28, -0.06),
  ];
  const lowerGeo = new THREE.LatheGeometry(lowerProfile, 28);
  const lowerMesh = new THREE.Mesh(lowerGeo, lowerBellyMat);
  lowerMesh.castShadow = !isSoftwareGl;
  bodyGroup.add(lowerMesh);

  const bellyFinGeo = new THREE.BoxGeometry(0.12, 0.14, 0.95);
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const fin = new THREE.Mesh(bellyFinGeo, carbonMat);
    fin.position.set(Math.sin(ang) * 1.48, -0.27, Math.cos(ang) * 1.48);
    fin.rotation.y = ang;
    bodyGroup.add(fin);
  }

  // Central underside anti-grav plasma vortex core + emitter ring
  const underGlow = new THREE.Mesh(
    new THREE.TorusGeometry(0.92, 0.09, 10, 26),
    glowMat,
  );
  underGlow.rotation.x = Math.PI / 2;
  underGlow.position.y = -0.4;
  bodyGroup.add(underGlow);

  const reactorCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.54, 0.42, 0.12, 16),
    glowMat,
  );
  reactorCore.position.y = -0.43;
  bodyGroup.add(reactorCore);

  // 3. Detailed recessed cockpit interior (bucket seat, stylized visored pilot, holographic HUD)
  const cockpitWell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.92, 0.86, 0.12, 24),
    carbonMat,
  );
  cockpitWell.position.y = 0.54;
  bodyGroup.add(cockpitWell);

  // Sculpted high-back racing seat
  const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.56, 0.14), carbonMat);
  seatBack.position.set(0, 0.78, -0.32);
  seatBack.rotation.x = -0.18;
  bodyGroup.add(seatBack);

  const seatBolsterGeo = new THREE.BoxGeometry(0.11, 0.42, 0.24);
  for (const side of [-1, 1]) {
    const bolster = new THREE.Mesh(seatBolsterGeo, accentTrimMat);
    bolster.position.set(side * 0.26, 0.72, -0.2);
    bodyGroup.add(bolster);
  }

  // Stylized cyber-alien pilot shoulders + helmet + luminous curved visor + twin micro-antennae
  const pilotTorso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, 0.16, 6, 12),
    pilotSuitMat,
  );
  pilotTorso.position.set(0, 0.72, -0.06);
  bodyGroup.add(pilotTorso);

  const pilotHelmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 16, 14),
    accentTrimMat,
  );
  pilotHelmet.scale.set(0.96, 1.04, 1.08);
  pilotHelmet.position.set(0, 1.02, -0.02);
  bodyGroup.add(pilotHelmet);

  // Glowing wrap-around pilot visor facing forward (+Z)
  const visorGeo = new THREE.CylinderGeometry(
    0.245,
    0.235,
    0.11,
    14,
    1,
    true,
    -Math.PI * 0.36,
    Math.PI * 0.72,
  );
  const pilotVisor = new THREE.Mesh(visorGeo, glowMat);
  pilotVisor.position.set(0, 1.03, 0.0);
  bodyGroup.add(pilotVisor);

  // Twin micro-antennae on helmet
  const antennaGeo = new THREE.CylinderGeometry(0.016, 0.024, 0.22, 6);
  for (const side of [-1, 1]) {
    const ant = new THREE.Mesh(antennaGeo, chromeMat);
    ant.position.set(side * 0.16, 1.24, -0.08);
    ant.rotation.z = -side * 0.32;
    ant.rotation.x = -0.2;
    bodyGroup.add(ant);
  }

  // Holographic curved cockpit instrument console
  const hudDashMat = new THREE.MeshBasicMaterial({
    color: config.glowColor,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  const hudScreen = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.62, 0.18, 14, 1, true, -0.58, 1.16),
    hudDashMat,
  );
  hudScreen.position.set(0, 0.74, 0.08);
  bodyGroup.add(hudScreen);

  // 4. Sculpted aerodynamic optical canopy dome + armored metallic struts
  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: config.isPlayer ? 0xd2faff : 0xcde8ff,
    roughness: 0.06,
    metalness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    transmission: isSoftwareGl ? 0 : 0.78,
    transparent: true,
    opacity: isSoftwareGl ? 0.42 : 0.88,
    ior: 1.52,
    thickness: 0.65,
    depthWrite: false,
  });
  const canopyGeo = new THREE.SphereGeometry(1.04, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.54);
  const canopyMesh = new THREE.Mesh(canopyGeo, canopyMat);
  canopyMesh.scale.set(0.96, 0.92, 1.16);
  canopyMesh.position.set(0, 0.48, 0.02);
  canopyMesh.renderOrder = 4;
  bodyGroup.add(canopyMesh);

  // Sculpted machined canopy collar bezel
  const bezelMesh = new THREE.Mesh(
    new THREE.TorusGeometry(1.04, 0.085, 10, 32),
    carbonMat,
  );
  bezelMesh.rotation.x = Math.PI / 2;
  bezelMesh.scale.set(0.96, 1.16, 1.0);
  bezelMesh.position.set(0, 0.52, 0.02);
  bodyGroup.add(bezelMesh);

  // Armored twin swept canopy-frame ribs flush with glass dome curvature
  const ribGeo = new THREE.TorusGeometry(1.032, 0.032, 8, 24, Math.PI);
  const centerRib = new THREE.Mesh(ribGeo, carbonMat);
  centerRib.rotation.y = Math.PI / 2;
  centerRib.scale.set(1.158, 0.92, 0.96);
  centerRib.position.set(0, 0.48, 0.02);
  bodyGroup.add(centerRib);

  const crossRib = new THREE.Mesh(
    new THREE.TorusGeometry(1.028, 0.028, 8, 22, Math.PI),
    accentTrimMat,
  );
  crossRib.scale.set(0.962, 0.92, 1.0);
  crossRib.position.set(0, 0.48, -0.14);
  crossRib.rotation.x = -0.2;
  bodyGroup.add(crossRib);

  // 5. Counter-rotating inner gyro phase-ring nestled around cockpit collar
  const innerRing = new THREE.Group();
  innerRing.position.y = 0.46;
  const phaseNodeGeo = new THREE.BoxGeometry(0.24, 0.06, 0.1);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const node = new THREE.Mesh(phaseNodeGeo, i % 2 === 0 ? glowMat : chromeMat);
    node.position.set(Math.cos(a) * 1.24, 0, Math.sin(a) * 1.24);
    node.rotation.y = -a + Math.PI / 2;
    innerRing.add(node);
  }
  bodyGroup.add(innerRing);

  // 6. Segmented Outer Gyroscopic Energy Turbine Ring (12 stator blades + glowing nodes)
  const spinRing = new THREE.Group();
  const outerRim = new THREE.Mesh(
    new THREE.TorusGeometry(2.42, 0.1, 10, 36),
    carbonMat,
  );
  outerRim.rotation.x = Math.PI / 2;
  spinRing.add(outerRim);

  const chromeLip = new THREE.Mesh(
    new THREE.TorusGeometry(2.49, 0.032, 8, 36),
    chromeMat,
  );
  chromeLip.rotation.x = Math.PI / 2;
  chromeLip.position.y = 0.04;
  spinRing.add(chromeLip);

  const statorGeo = new THREE.BoxGeometry(0.32, 0.13, 0.14);
  const orbNodeGeo = new THREE.CapsuleGeometry(0.065, 0.18, 4, 8);
  orbNodeGeo.rotateZ(Math.PI / 2);
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    if (i % 2 === 0) {
      const pod = new THREE.Mesh(orbNodeGeo, glowMat);
      pod.position.set(Math.cos(angle) * 2.48, 0.01, Math.sin(angle) * 2.48);
      pod.rotation.y = -angle + Math.PI / 2;
      spinRing.add(pod);
    } else {
      const vane = new THREE.Mesh(statorGeo, accentTrimMat);
      vane.position.set(Math.cos(angle) * 2.45, 0.01, Math.sin(angle) * 2.45);
      vane.rotation.y = -angle + 0.28;
      spinRing.add(vane);
    }
  }
  bodyGroup.add(spinRing);

  // 7. Bespoke Archetype Aero Kit (6 distinct GP silhouettes!)
  const thrusterPositions: Array<{ x: number; y: number; z: number; scale: number }> = [];

  if (config.chassisVariant === 'nova-interceptor') {
    // YOU · NOVA-7: F1-inspired aero interceptor with forward twin canards, twin angled tailfins,
    // side intake pods, and triple plasma thruster array!
    const canardGeo = createBeveledWingGeo(
      [
        [0, 0],
        [0.95, -0.35],
        [0.82, -0.68],
        [0.05, -0.42],
      ],
      0.08,
    );
    for (const side of [-1, 1]) {
      const canard = new THREE.Mesh(canardGeo, accentTrimMat);
      canard.rotation.x = Math.PI / 2;
      canard.scale.x = side;
      canard.position.set(side * 1.48, 0.08, 2.02);
      bodyGroup.add(canard);

      // Glowing forward nose splitter strip
      const noseLed = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.05, 0.08), glowMat);
      noseLed.position.set(side * 1.38, 0.14, 2.22);
      noseLed.rotation.y = -side * 0.34;
      bodyGroup.add(noseLed);
    }

    // Twin swept angled vertical tailfins flanking the rear engine deck
    const twinFinGeo = createBeveledWingGeo(
      [
        [0, 0],
        [-1.35, 0],
        [-1.72, 0.72],
        [-0.96, 0.74],
        [-0.1, 0.18],
      ],
      0.09,
    );
    for (const side of [-1, 1]) {
      const fin = new THREE.Mesh(twinFinGeo, accentTrimMat);
      fin.rotation.y = Math.PI / 2;
      fin.rotation.z = side * 0.24;
      fin.position.set(side * 1.24, 0.62, -1.58);
      bodyGroup.add(fin);

      // Glowing fin edge strip
      const finStrip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.66, 0.12), glowMat);
      finStrip.position.set(side * 1.38, 0.68, -2.18);
      finStrip.rotation.z = -side * 0.24;
      finStrip.rotation.x = -0.36;
      bodyGroup.add(finStrip);

      // Sculpted lateral air-intake cowls
      const intake = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 1.35), carbonMat);
      intake.position.set(side * 1.88, 0.26, -0.38);
      intake.rotation.y = -side * 0.16;
      bodyGroup.add(intake);
    }

    // Rear bridge spoiler bar connecting twin tailfins cleanly behind 07 deck number
    const spoilerBar = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.085, 0.34), carbonMat);
    spoilerBar.position.set(0, 0.97, -2.14);
    spoilerBar.rotation.x = 0.16;
    bodyGroup.add(spoilerBar);

    thrusterPositions.push(
      { x: -1.04, y: 0.08, z: -1.96, scale: 0.92 },
      { x: 0, y: 0.12, z: -2.08, scale: 1.15 },
      { x: 1.04, y: 0.08, z: -1.96, scale: 0.92 },
    );
  } else if (config.chassisVariant === 'apex-blade') {
    // ZOR-X · APEX: Razor-sharp swept gull-wing side blades + tall scimitar dorsal fin
    const bladeGeo = createBeveledWingGeo(
      [
        [0, 0],
        [1.55, -0.62],
        [1.32, -1.15],
        [0.08, -0.66],
      ],
      0.09,
    );
    for (const side of [-1, 1]) {
      const blade = new THREE.Mesh(bladeGeo, accentTrimMat);
      blade.rotation.x = Math.PI / 2;
      blade.rotation.z = side * 0.18;
      blade.scale.x = side;
      blade.position.set(side * 2.18, 0.24, -0.58);
      bodyGroup.add(blade);

      // Forward mandible intake prongs
      const mandible = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 1.1), carbonMat);
      mandible.position.set(side * 1.08, 0.16, 2.02);
      mandible.rotation.y = side * 0.22;
      bodyGroup.add(mandible);
    }
    const scimitarGeo = createBeveledWingGeo(
      [
        [0, 0],
        [-1.65, 0],
        [-2.08, 0.95],
        [-1.12, 0.82],
        [0, 0.18],
      ],
      0.11,
    );
    const scimitar = new THREE.Mesh(scimitarGeo, accentTrimMat);
    scimitar.rotation.y = Math.PI / 2;
    scimitar.position.set(0, 0.74, -1.45);
    bodyGroup.add(scimitar);

    thrusterPositions.push(
      { x: -0.96, y: 0.08, z: -1.94, scale: 1.05 },
      { x: 0.96, y: 0.08, z: -1.94, scale: 1.05 },
    );
  } else if (config.chassisVariant === 'volt-catamaran') {
    // KAI-9 · VOLT: Twin split-nose electro-prongs with glowing bow capacitor bridge & outboard turbines
    const prongGeo = new THREE.BoxGeometry(0.38, 0.24, 1.65);
    for (const side of [-1, 1]) {
      const prong = new THREE.Mesh(prongGeo, carbonMat);
      prong.position.set(side * 1.18, 0.12, 2.04);
      prong.rotation.y = -side * 0.1;
      bodyGroup.add(prong);

      const prongTip = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.56, 6), accentTrimMat);
      prongTip.rotation.x = Math.PI / 2;
      prongTip.position.set(side * 1.1, 0.12, 3.05);
      bodyGroup.add(prongTip);

      // Outboard flank capacitor pods
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 1.55, 10), carbonMat);
      pod.rotation.x = Math.PI / 2;
      pod.position.set(side * 2.24, 0.18, -0.32);
      bodyGroup.add(pod);

      const coilRing = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.05, 8, 14), glowMat);
      coilRing.position.set(side * 2.24, 0.18, 0.25);
      bodyGroup.add(coilRing);

      // Canted rear stub winglets
      const stub = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.54, 0.95), accentTrimMat);
      stub.position.set(side * 1.48, 0.44, -1.66);
      stub.rotation.z = side * 0.42;
      bodyGroup.add(stub);
    }
    // Glowing electro-arc bar bridging twin bow prongs
    const bowArc = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 2.05, 8), glowMat);
    bowArc.rotation.z = Math.PI / 2;
    bowArc.position.set(0, 0.14, 2.48);
    bodyGroup.add(bowArc);

    thrusterPositions.push(
      { x: -1.16, y: 0.08, z: -1.96, scale: 1.06 },
      { x: 1.16, y: 0.08, z: -1.96, scale: 1.06 },
    );
  } else if (config.chassisVariant === 'titan-vanguard') {
    // BORG-4 · TITAN: Armored heavy fenders, overhead roll-cage arch, quad thruster manifold
    const fenderGeo = new THREE.BoxGeometry(0.58, 0.34, 2.25);
    for (const side of [-1, 1]) {
      const fender = new THREE.Mesh(fenderGeo, accentTrimMat);
      fender.position.set(side * 2.16, 0.2, -0.15);
      fender.rotation.z = -side * 0.14;
      bodyGroup.add(fender);

      const bumperLed = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.09, 0.12), glowMat);
      bumperLed.position.set(side * 2.16, 0.22, 1.02);
      bodyGroup.add(bumperLed);
    }
    // Overhead heavy roll-cage arch framing the cockpit
    const rollArch = new THREE.Mesh(
      new THREE.TorusGeometry(1.36, 0.11, 10, 24, Math.PI),
      chromeMat,
    );
    rollArch.position.set(0, 0.46, -0.58);
    rollArch.rotation.x = -0.3;
    bodyGroup.add(rollArch);

    // Armored dorsal bulkhead spine
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.34, 1.45), carbonMat);
    spine.position.set(0, 0.56, -1.58);
    bodyGroup.add(spine);

    thrusterPositions.push(
      { x: -1.28, y: 0.08, z: -1.92, scale: 0.86 },
      { x: -0.54, y: 0.12, z: -2.02, scale: 0.92 },
      { x: 0.54, y: 0.12, z: -2.02, scale: 0.92 },
      { x: 1.28, y: 0.08, z: -1.92, scale: 0.86 },
    );
  } else if (config.chassisVariant === 'slip-manta') {
    // VEGA-3 · DRAFT: Swept organic manta-ray rear aero skirts + twin low-drag V-tail fins
    const mantaWingGeo = createBeveledWingGeo(
      [
        [0, 0.4],
        [1.65, -0.25],
        [1.48, -1.35],
        [0.42, -1.18],
        [0, -0.45],
      ],
      0.08,
    );
    for (const side of [-1, 1]) {
      const manta = new THREE.Mesh(mantaWingGeo, hullSolidMat);
      manta.rotation.x = Math.PI / 2;
      manta.scale.x = side;
      manta.position.set(side * 1.92, 0.1, -0.96);
      bodyGroup.add(manta);

      const vFin = new THREE.Mesh(
        createBeveledWingGeo(
          [
            [0, 0],
            [-1.18, 0],
            [-1.42, 0.54],
            [-0.64, 0.54],
            [0, 0.12],
          ],
          0.075,
        ),
        accentTrimMat,
      );
      vFin.rotation.y = Math.PI / 2;
      vFin.rotation.z = side * 0.58;
      vFin.position.set(side * 0.96, 0.56, -1.52);
      bodyGroup.add(vFin);
    }
    // Sleek forward aero nose needle
    const noseCap = new THREE.Mesh(new THREE.ConeGeometry(0.46, 1.05, 8), accentTrimMat);
    noseCap.rotation.x = Math.PI / 2;
    noseCap.scale.set(1.4, 1.0, 0.42);
    noseCap.position.set(0, 0.12, 2.52);
    bodyGroup.add(noseCap);

    thrusterPositions.push(
      { x: -0.84, y: 0.08, z: -1.98, scale: 1.02 },
      { x: 0.84, y: 0.08, z: -1.98, scale: 1.02 },
    );
  } else if (config.chassisVariant === 'cryo-prism') {
    // CRYO PRISM: Hexagonal faceted ice-crystal outer armor crown, 6 orbiting ice shards on spinRing,
    // twin crystalline tail spires & twin frost plasma thrusters!
    const iceCrystalMat = new THREE.MeshPhysicalMaterial({
      color: 0xa5f3fc,
      emissive: config.trimColor,
      emissiveIntensity: 0.42,
      roughness: 0.12,
      metalness: 0.25,
      clearcoat: 1.0,
      flatShading: true,
    });
    const hexCrown = new THREE.Mesh(new THREE.TorusGeometry(2.58, 0.14, 6, 6), iceCrystalMat);
    hexCrown.rotation.x = Math.PI / 2;
    hexCrown.position.y = 0.14;
    bodyGroup.add(hexCrown);

    // 6 orbiting faceted crystal prisms attached to spinRing
    const shardGeo = new THREE.OctahedronGeometry(0.36, 0);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const shard = new THREE.Mesh(shardGeo, i % 2 === 0 ? iceCrystalMat : glowMat);
      shard.scale.set(0.75, 1.45, 0.75);
      shard.position.set(Math.cos(a) * 2.86, 0.24, Math.sin(a) * 2.86);
      shard.rotation.y = -a;
      spinRing.add(shard);
    }

    // Swept crystalline ice tail-spire fins + forward diamond nose prow
    const crystalSpireGeo = new THREE.ConeGeometry(0.28, 1.85, 5);
    for (const side of [-1, 1]) {
      const spire = new THREE.Mesh(crystalSpireGeo, iceCrystalMat);
      spire.rotation.x = -Math.PI * 0.38;
      spire.rotation.z = side * 0.28;
      spire.position.set(side * 1.18, 0.62, -1.78);
      bodyGroup.add(spire);
    }
    const noseCrystal = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.32, 6), iceCrystalMat);
    noseCrystal.rotation.x = Math.PI / 2;
    noseCrystal.scale.set(1.2, 1.0, 0.52);
    noseCrystal.position.set(0, 0.16, 2.66);
    bodyGroup.add(noseCrystal);

    thrusterPositions.push(
      { x: -0.92, y: 0.08, z: -2.02, scale: 1.04 },
      { x: 0.92, y: 0.08, z: -2.02, scale: 1.04 },
    );
  } else if (config.chassisVariant === 'spore-jelly') {
    // BIO JELLYCRAFT: Bioluminescent translucent outer bell fairing + 6 trailing curved aero-tendrils
    // + glowing ring bulbs for unmistakable alien organic silhouette!
    const bioBellMat = new THREE.MeshPhysicalMaterial({
      color: config.trimColor,
      emissive: config.glowColor,
      emissiveIntensity: 0.35,
      roughness: 0.16,
      metalness: 0.1,
      transparent: true,
      opacity: 0.62,
      clearcoat: 1.0,
      depthWrite: false,
    });
    const outerBell = new THREE.Mesh(
      new THREE.SphereGeometry(2.58, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.42),
      bioBellMat,
    );
    outerBell.scale.set(1.04, 0.44, 1.04);
    outerBell.position.y = 0.04;
    outerBell.renderOrder = 3;
    bodyGroup.add(outerBell);

    // 8 luminous spore-petal bulbs orbiting the outer bell rim
    const bulbGeo = new THREE.SphereGeometry(0.2, 10, 8);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const bulb = new THREE.Mesh(bulbGeo, glowMat);
      bulb.position.set(Math.cos(a) * 2.68, 0.06, Math.sin(a) * 2.68);
      spinRing.add(bulb);
    }

    // 6 graceful trailing bioluminescent aero-tendrils streaming aft
    for (let i = 0; i < 6; i++) {
      const offsetX = (i - 2.5) * 0.62;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(offsetX, 0.16, -1.7),
        new THREE.Vector3(offsetX * 1.12, 0.02 + (i % 2) * 0.18, -2.75),
        new THREE.Vector3(offsetX * 0.88, -0.14 + ((i + 1) % 2) * 0.22, -3.75),
      ]);
      const tendrilGeo = new THREE.TubeGeometry(curve, 12, i === 2 || i === 3 ? 0.095 : 0.072, 6, false);
      const tendril = new THREE.Mesh(tendrilGeo, i % 2 === 0 ? glowMat : accentTrimMat);
      bodyGroup.add(tendril);
    }

    thrusterPositions.push(
      { x: -0.82, y: 0.08, z: -1.96, scale: 0.96 },
      { x: 0.82, y: 0.08, z: -1.96, scale: 0.96 },
    );
  } else if (config.chassisVariant === 'tri-orbiter') {
    // TRI-ORBITER: Iconic 3-pod triangular delta mothership! Three distinct satellite mini-saucers
    // (1 forward apex pod + 2 wide aft wing pods) bridged by illuminated delta trusses!
    const podOffsets: Array<[number, number]> = [
      [0, 2.35],
      [-2.18, -1.48],
      [2.18, -1.48],
    ];
    const miniHullGeo = new THREE.CylinderGeometry(0.72, 0.92, 0.26, 16);
    const miniDomeGeo = new THREE.SphereGeometry(0.46, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const miniRingGeo = new THREE.TorusGeometry(0.95, 0.07, 8, 20);

    for (const [px, pz] of podOffsets) {
      const pod = new THREE.Group();
      pod.position.set(px, 0.14, pz);

      const disc = new THREE.Mesh(miniHullGeo, hullSolidMat);
      const dome = new THREE.Mesh(miniDomeGeo, accentTrimMat);
      dome.position.y = 0.12;
      const ring = new THREE.Mesh(miniRingGeo, glowMat);
      ring.rotation.x = Math.PI / 2;
      pod.add(disc, dome, ring);
      bodyGroup.add(pod);

      // Connecting structural truss strut from main hull to satellite pod
      const dist = Math.hypot(px, pz);
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, dist), carbonMat);
      strut.position.set(px * 0.5, 0.14, pz * 0.5);
      strut.rotation.y = Math.atan2(px, pz);
      bodyGroup.add(strut);
    }

    // Perimeter triangular glowing energy bars joining the 3 pods
    for (let i = 0; i < 3; i++) {
      const [x1, z1] = podOffsets[i];
      const [x2, z2] = podOffsets[(i + 1) % 3];
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, len), accentTrimMat);
      bar.position.set((x1 + x2) * 0.5, 0.18, (z1 + z2) * 0.5);
      bar.rotation.y = Math.atan2(dx, dz);
      bodyGroup.add(bar);
    }

    thrusterPositions.push(
      { x: -2.18, y: 0.12, z: -2.04, scale: 0.96 },
      { x: 0, y: 0.12, z: -2.06, scale: 1.12 },
      { x: 2.18, y: 0.12, z: -2.04, scale: 0.96 },
    );
  } else if (config.chassisVariant === 'magma-forge') {
    // MAGMA FORGE: Heavy armored obsidian dreadnought with twin glowing molten furnace side nacelles,
    // angular front ram shields, dorsal reactor grille & quad thermal thrusters!
    const furnaceMat = new THREE.MeshStandardMaterial({
      color: 0xff6b2b,
      emissive: 0xff4500,
      emissiveIntensity: 1.9,
      roughness: 0.25,
      metalness: 0.3,
    });
    const nacelleArmorGeo = new THREE.BoxGeometry(0.76, 0.52, 2.55);
    const frontShieldGeo = new THREE.BoxGeometry(0.95, 0.36, 0.42);
    for (const side of [-1, 1]) {
      const armor = new THREE.Mesh(nacelleArmorGeo, carbonMat);
      armor.position.set(side * 2.28, 0.24, -0.2);
      armor.rotation.z = -side * 0.12;
      bodyGroup.add(armor);

      // Glowing magma furnace core grille inside side armor
      const furnaceCore = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.22, 1.85), furnaceMat);
      furnaceCore.position.set(side * 2.28, 0.26, -0.18);
      bodyGroup.add(furnaceCore);

      // Front angular blast-shield prow plates
      const shield = new THREE.Mesh(frontShieldGeo, accentTrimMat);
      shield.position.set(side * 1.38, 0.18, 2.16);
      shield.rotation.y = -side * 0.48;
      bodyGroup.add(shield);

      // Twin heavy rear exhaust stacks
      const stack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.55, 0.85), accentTrimMat);
      stack.position.set(side * 1.56, 0.56, -1.78);
      stack.rotation.z = side * 0.22;
      bodyGroup.add(stack);
    }
    // Armored dorsal furnace spine
    const dorsalForge = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.38, 1.65), carbonMat);
    dorsalForge.position.set(0, 0.58, -1.54);
    bodyGroup.add(dorsalForge);
    const forgeVent = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.14, 1.2), furnaceMat);
    forgeVent.position.set(0, 0.78, -1.54);
    bodyGroup.add(forgeVent);

    thrusterPositions.push(
      { x: -1.44, y: 0.12, z: -1.96, scale: 0.94 },
      { x: -0.58, y: 0.14, z: -2.06, scale: 0.96 },
      { x: 0.58, y: 0.14, z: -2.06, scale: 0.96 },
      { x: 1.44, y: 0.12, z: -1.96, scale: 0.94 },
    );
  } else if (config.chassisVariant === 'cyber-spinner') {
    // CYBER STRIKER: Sleek neon stealth dart core surrounded by TWO opposing tilted holographic
    // gyro rings (spinRing + tilted outer halo on innerRing) + razor cyber winglets!
    const outerGyroMat = new THREE.MeshStandardMaterial({
      color: config.trimColor,
      emissive: config.trimColor,
      emissiveIntensity: 1.6,
      roughness: 0.16,
      metalness: 0.5,
    });
    const gyroRingA = new THREE.Mesh(new THREE.TorusGeometry(2.82, 0.08, 8, 36), outerGyroMat);
    gyroRingA.rotation.x = Math.PI / 2 + 0.22;
    gyroRingA.position.y = 0.22;
    spinRing.add(gyroRingA);

    const gyroRingB = new THREE.Mesh(new THREE.TorusGeometry(2.64, 0.065, 8, 36), glowMat);
    gyroRingB.rotation.x = Math.PI / 2 - 0.24;
    gyroRingB.position.y = -0.18;
    innerRing.add(gyroRingB);

    // Razor swept forward cyber-dart fins + twin split rear blades
    const dartWingGeo = createBeveledWingGeo(
      [
        [0, 0.6],
        [1.42, -0.35],
        [1.18, -0.95],
        [0.08, -0.38],
      ],
      0.08,
    );
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(dartWingGeo, carbonMat);
      wing.rotation.x = Math.PI / 2;
      wing.scale.x = side;
      wing.position.set(side * 1.68, 0.24, 0.45);
      bodyGroup.add(wing);

      const neonEdge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 1.55), glowMat);
      neonEdge.position.set(side * 1.45, 0.42, -1.68);
      neonEdge.rotation.y = side * 0.26;
      bodyGroup.add(neonEdge);
    }

    thrusterPositions.push(
      { x: -0.88, y: 0.1, z: -2.0, scale: 1.05 },
      { x: 0.88, y: 0.1, z: -2.0, scale: 1.05 },
    );
  } else if (config.chassisVariant === 'quantum-seraph') {
    // QUANTUM SERAPH: Master-class apex UFO with a 6-petal rotating golden celestial lotus crown,
    // 4 floating prismatic crystal satellites, elevated golden halo crest & triple plasma thrusters!
    const goldMat = new THREE.MeshPhysicalMaterial({
      color: 0xfbbf24,
      emissive: 0xb45309,
      emissiveIntensity: 0.45,
      roughness: 0.18,
      metalness: 0.9,
      clearcoat: 1.0,
    });
    const petalGeo = createBeveledWingGeo(
      [
        [0, 0],
        [0.42, 0.48],
        [0.12, 1.25],
        [-0.12, 1.25],
        [-0.42, 0.48],
      ],
      0.07,
    );
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const petal = new THREE.Mesh(petalGeo, i % 2 === 0 ? goldMat : glowMat);
      petal.rotation.x = Math.PI / 2;
      petal.rotation.z = -a + Math.PI / 2;
      petal.position.set(Math.cos(a) * 2.55, 0.16, Math.sin(a) * 2.55);
      spinRing.add(petal);
    }

    // 4 floating prismatic crystal satellites orbiting slightly above innerRing
    const satGeo = new THREE.OctahedronGeometry(0.28, 0);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const sat = new THREE.Mesh(satGeo, glowMat);
      sat.position.set(Math.cos(a) * 2.15, 0.56, Math.sin(a) * 2.15);
      innerRing.add(sat);
    }

    // Elevated golden celestial halo arch framing the cockpit
    const celestialArch = new THREE.Mesh(
      new THREE.TorusGeometry(1.52, 0.085, 10, 28, Math.PI),
      goldMat,
    );
    celestialArch.position.set(0, 0.55, -0.62);
    celestialArch.rotation.x = -0.35;
    bodyGroup.add(celestialArch);

    thrusterPositions.push(
      { x: -1.1, y: 0.1, z: -2.02, scale: 0.96 },
      { x: 0, y: 0.14, z: -2.14, scale: 1.18 },
      { x: 1.1, y: 0.1, z: -2.02, scale: 0.96 },
    );
  } else {
    // LYRA-8 · DRIFT: Exotic twin floating outer halo arcs + triple swept tail crests
    const haloArcGeo = new THREE.TorusGeometry(2.74, 0.075, 8, 22, Math.PI * 0.62);
    for (const side of [-1, 1]) {
      const halo = new THREE.Mesh(haloArcGeo, accentTrimMat);
      halo.rotation.x = Math.PI / 2;
      halo.rotation.z = side > 0 ? -Math.PI * 0.31 : Math.PI * 0.69;
      halo.position.y = 0.22;
      bodyGroup.add(halo);

      // Halo glowing pylon struts
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.07, 0.16), glowMat);
      strut.position.set(side * 2.48, 0.18, 0);
      bodyGroup.add(strut);
    }
    // Triple-feather swept dorsal crests
    const crestGeo = createBeveledWingGeo(
      [
        [0, 0],
        [-1.12, 0],
        [-1.48, 0.58],
        [-0.86, 0.58],
        [0, 0.14],
      ],
      0.07,
    );
    for (const offset of [-0.68, 0, 0.68]) {
      const crest = new THREE.Mesh(crestGeo, offset === 0 ? glowMat : accentTrimMat);
      crest.rotation.y = Math.PI / 2;
      crest.rotation.z = offset * 0.45;
      crest.scale.setScalar(offset === 0 ? 1.05 : 0.82);
      crest.position.set(offset, 0.56, -1.52);
      bodyGroup.add(crest);
    }

    thrusterPositions.push(
      { x: -0.94, y: 0.08, z: -1.94, scale: 1.0 },
      { x: 0.94, y: 0.08, z: -1.94, scale: 1.0 },
    );
  }

  // 8. Dual-layer Volumetric Rear Plasma Thruster Nacelles + Inner White-Hot Cores
  const thrusterFlames: THREE.Mesh[] = [];
  const thrusterCores: THREE.Mesh[] = [];
  const nacelleGeo = new THREE.CylinderGeometry(0.24, 0.34, 0.96, 14);
  nacelleGeo.rotateX(Math.PI / 2);

  const outerFlameGeo = new THREE.ConeGeometry(0.28, 1.68, 12);
  outerFlameGeo.rotateX(-Math.PI / 2);
  outerFlameGeo.translate(0, 0, -0.82);

  const innerCoreGeo = new THREE.ConeGeometry(0.14, 1.08, 10);
  innerCoreGeo.rotateX(-Math.PI / 2);
  innerCoreGeo.translate(0, 0, -0.52);

  const outerFlameMat = new THREE.MeshBasicMaterial({
    color: config.glowColor,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const innerCoreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.94,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  for (const tp of thrusterPositions) {
    const nacelle = new THREE.Mesh(nacelleGeo, carbonMat);
    nacelle.position.set(tp.x, tp.y, tp.z);
    nacelle.scale.setScalar(tp.scale);
    bodyGroup.add(nacelle);

    const nozzleRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.26 * tp.scale, 0.045, 8, 16),
      chromeMat,
    );
    nozzleRing.position.set(tp.x, tp.y, tp.z - 0.46 * tp.scale);
    bodyGroup.add(nozzleRing);

    const innerNozzleGlow = new THREE.Mesh(
      new THREE.CircleGeometry(0.22 * tp.scale, 12),
      glowMat,
    );
    innerNozzleGlow.rotation.y = Math.PI;
    innerNozzleGlow.position.set(tp.x, tp.y, tp.z - 0.45 * tp.scale);
    bodyGroup.add(innerNozzleGlow);

    const flame = new THREE.Mesh(outerFlameGeo, outerFlameMat);
    flame.position.set(tp.x, tp.y, tp.z - 0.44 * tp.scale);
    flame.userData.baseScale = tp.scale;
    flame.renderOrder = 5;
    bodyGroup.add(flame);
    thrusterFlames.push(flame);

    const core = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    core.position.set(tp.x, tp.y, tp.z - 0.44 * tp.scale);
    core.userData.baseScale = tp.scale;
    core.renderOrder = 6;
    bodyGroup.add(core);
    thrusterCores.push(core);
  }

  // 9. Sleek Oblate Translucent Energy Shield Flare Shell (activates on UFO/rail/EMP impacts)
  const shieldGroup = new THREE.Group();
  shieldGroup.visible = false;
  shieldGroup.position.y = 0.16;
  const shieldGeo = new THREE.IcosahedronGeometry(2.74, 1);
  const shieldShellMat = new THREE.MeshBasicMaterial({
    color: 0x5dfcf7,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  const shieldShell = new THREE.Mesh(shieldGeo, shieldShellMat);
  shieldShell.scale.set(1.06, 0.48, 1.08);
  shieldShell.renderOrder = 7;
  shieldGroup.add(shieldShell);

  const shieldWireMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const shieldWire = new THREE.Mesh(shieldGeo, shieldWireMat);
  shieldWire.scale.set(1.08, 0.5, 1.1);
  shieldWire.renderOrder = 8;
  shieldGroup.add(shieldWire);
  bodyGroup.add(shieldGroup);

  // 10. Soft radial contact shadow disc + additive colored plasma track underglow disc
  const shadowGeo = new THREE.CircleGeometry(2.75, 22);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.renderOrder = 2;

  const glowDiscGeo = new THREE.CircleGeometry(2.55, 22);
  glowDiscGeo.rotateX(-Math.PI / 2);
  const glowDiscMat = new THREE.MeshBasicMaterial({
    color: config.glowColor,
    map: underglowTexture ?? shadowTexture,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  const groundGlow = new THREE.Mesh(glowDiscGeo, glowDiscMat);
  groundGlow.renderOrder = 3;

  return {
    root,
    bodyGroup,
    spinRing,
    innerRing,
    thrusterFlames,
    thrusterCores,
    underGlow,
    contactShadow,
    groundGlow,
    hullMaterial,
    baseEmissive: new THREE.Color(0x000000),
    shieldGroup,
    shieldShellMat,
    shieldWireMat,
    disposableTextures,
  };
}

/**
 * Builds the elevated banked variable-width 3D magnetic race circuit mesh with
 * biome-themed road surface, underside hull, glowing guard rails, and support pillars.
 */
export function buildTrackMesh(
  track: BakedTrack,
  maxAnisotropy: number,
  isSoftwareGl: boolean,
): THREE.Group {
  const group = new THREE.Group();
  const biome = track.def.biome;
  const { albedo, bump } = createTrackTextures(biome, maxAnisotropy);
  const N = track.sampleCount;
  const deckThickness = 1.65;

  const topPositions: number[] = [];
  const topNormals: number[] = [];
  const topUvs: number[] = [];
  const topIndices: number[] = [];

  const hullPositions: number[] = [];
  const hullIndices: number[] = [];

  const railPositionsLeft: THREE.Vector3[] = [];
  const railPositionsRight: THREE.Vector3[] = [];

  const uvRepeatAlong = Math.round(track.totalLength / 14);

  for (let i = 0; i <= N; i++) {
    const f = track.frames[i % N];
    const halfW = f.width * 0.5;
    const vCoord = (i / N) * uvRepeatAlong;

    const lx = f.pos.x - f.right.x * halfW;
    const ly = f.pos.y - f.right.y * halfW;
    const lz = f.pos.z - f.right.z * halfW;

    const rx = f.pos.x + f.right.x * halfW;
    const ry = f.pos.y + f.right.y * halfW;
    const rz = f.pos.z + f.right.z * halfW;

    topPositions.push(lx, ly, lz, rx, ry, rz);
    topNormals.push(f.up.x, f.up.y, f.up.z, f.up.x, f.up.y, f.up.z);
    topUvs.push(0, vCoord, 1, vCoord);

    // Underside hull vertices (tapered trapezoid beneath track)
    const blx = f.pos.x - f.right.x * (halfW * 0.84) - f.up.x * deckThickness;
    const bly = f.pos.y - f.right.y * (halfW * 0.84) - f.up.y * deckThickness;
    const blz = f.pos.z - f.right.z * (halfW * 0.84) - f.up.z * deckThickness;

    const brx = f.pos.x + f.right.x * (halfW * 0.84) - f.up.x * deckThickness;
    const bry = f.pos.y + f.right.y * (halfW * 0.84) - f.up.y * deckThickness;
    const brz = f.pos.z + f.right.z * (halfW * 0.84) - f.up.z * deckThickness;

    hullPositions.push(lx, ly, lz, blx, bly, blz, brx, bry, brz, rx, ry, rz);

    if (i < N) {
      const base = i * 2;
      topIndices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);

      const h0 = i * 4;
      const h1 = (i + 1) * 4;
      hullIndices.push(h0, h1, h0 + 1, h1, h1 + 1, h0 + 1);
      hullIndices.push(h0 + 1, h1 + 1, h0 + 2, h1 + 1, h1 + 2, h0 + 2);
      hullIndices.push(h0 + 2, h1 + 2, h0 + 3, h1 + 2, h1 + 3, h0 + 3);

      if (i % 3 === 0) {
        railPositionsLeft.push(
          new THREE.Vector3(
            lx + f.up.x * 0.72,
            ly + f.up.y * 0.72,
            lz + f.up.z * 0.72,
          ),
        );
        railPositionsRight.push(
          new THREE.Vector3(
            rx + f.up.x * 0.72,
            ry + f.up.y * 0.72,
            rz + f.up.z * 0.72,
          ),
        );
      }
    }
  }

  const topGeo = new THREE.BufferGeometry();
  topGeo.setAttribute('position', new THREE.Float32BufferAttribute(topPositions, 3));
  topGeo.setAttribute('normal', new THREE.Float32BufferAttribute(topNormals, 3));
  topGeo.setAttribute('uv', new THREE.Float32BufferAttribute(topUvs, 2));
  topGeo.setIndex(topIndices);

  const topMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: albedo,
    bumpMap: bump,
    bumpScale: 0.14,
    roughness: biome === 'glacier' ? 0.34 : biome === 'aether' ? 0.44 : 0.56,
    metalness: biome === 'aether' ? 0.42 : 0.28,
    side: THREE.DoubleSide,
  });
  const topMesh = new THREE.Mesh(topGeo, topMat);
  topMesh.receiveShadow = !isSoftwareGl;
  group.add(topMesh);

  const hullColor =
    biome === 'glacier'
      ? 0x2a4562
      : biome === 'biolume'
      ? 0x103638
      : biome === 'volcano'
      ? 0x2c1c20
      : biome === 'cybercity'
      ? 0x181c36
      : biome === 'aether'
      ? 0x455370
      : biome === 'quantum'
      ? 0x241744
      : biome === 'nebula'
      ? 0x2e254a
      : 0x3b3545;

  const hullGeo = new THREE.BufferGeometry();
  hullGeo.setAttribute('position', new THREE.Float32BufferAttribute(hullPositions, 3));
  hullGeo.setIndex(hullIndices);
  hullGeo.computeVertexNormals();
  const hullMat = new THREE.MeshStandardMaterial({
    color: hullColor,
    roughness: 0.68,
    metalness: 0.48,
    side: THREE.DoubleSide,
  });
  const hullMesh = new THREE.Mesh(hullGeo, hullMat);
  group.add(hullMesh);

  // Biome-matched glowing magnetic guard rails along variable-width edges
  const railStyle =
    biome === 'glacier'
      ? { color: 0x7efcf7, emissive: 0x0ea5e9 }
      : biome === 'biolume'
      ? { color: 0x34d399, emissive: 0x10b981 }
      : biome === 'volcano'
      ? { color: 0xff8a3d, emissive: 0xff4500 }
      : biome === 'cybercity'
      ? { color: 0xf472b6, emissive: 0xec4899 }
      : biome === 'aether'
      ? { color: 0xfde047, emissive: 0xf59e0b }
      : biome === 'quantum'
      ? { color: 0xfbbf24, emissive: 0xa855f7 }
      : biome === 'nebula'
      ? { color: 0xe879f9, emissive: 0xa855f7 }
      : { color: 0xffb35c, emissive: 0xff7b29 };

  const leftCurve = new THREE.CatmullRomCurve3(railPositionsLeft, true);
  const rightCurve = new THREE.CatmullRomCurve3(railPositionsRight, true);
  const railMat = new THREE.MeshStandardMaterial({
    color: railStyle.color,
    emissive: railStyle.emissive,
    emissiveIntensity: 0.78,
    roughness: 0.32,
    metalness: 0.6,
  });
  const leftRail = new THREE.Mesh(new THREE.TubeGeometry(leftCurve, 320, 0.25, 6, true), railMat);
  const rightRail = new THREE.Mesh(new THREE.TubeGeometry(rightCurve, 320, 0.25, 6, true), railMat);
  group.add(leftRail, rightRail);

  // Start / Finish checkered strip flush above deck (+0.05m with polygonOffset)
  const startLineTex = createStartLineTexture(maxAnisotropy);
  const startFrame = sampleTrackFrame(track, 0);
  const startStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(startFrame.width - 1.2, 4.6),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: startLineTex,
      roughness: 0.45,
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  const startBasis = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(startFrame.right.x, startFrame.right.y, startFrame.right.z),
    new THREE.Vector3(startFrame.up.x, startFrame.up.y, startFrame.up.z),
    new THREE.Vector3(-startFrame.tangent.x, -startFrame.tangent.y, -startFrame.tangent.z),
  );
  startStrip.quaternion.setFromRotationMatrix(startBasis);
  startStrip.rotateX(-Math.PI / 2);
  startStrip.position.set(
    startFrame.pos.x + startFrame.up.x * 0.05,
    startFrame.pos.y + startFrame.up.y * 0.05,
    startFrame.pos.z + startFrame.up.z * 0.05,
  );
  group.add(startStrip);

  // Instanced support pillars anchoring the floating track (with Figure-8 Overpass clearance check!)
  const pillarCount = 60;
  const pillarGeo = new THREE.CylinderGeometry(1.5, 2.5, 76, 8);
  const pillarColor =
    biome === 'glacier'
      ? 0x5f82a3
      : biome === 'biolume'
      ? 0x164e50
      : biome === 'volcano'
      ? 0x2c2023
      : biome === 'cybercity'
      ? 0x24294a
      : biome === 'aether'
      ? 0x7b8fb2
      : biome === 'quantum'
      ? 0x35225c
      : 0x5c4749;
  const pillarMat = new THREE.MeshStandardMaterial({
    color: pillarColor,
    roughness: 0.78,
    metalness: 0.32,
  });

  const validPillarFrames: Array<{ x: number; y: number; z: number; yaw: number }> = [];
  for (let i = 0; i < pillarCount; i++) {
    const t = i / pillarCount;
    const f = sampleTrackFrame(track, t);
    // Check if another section of track passes underneath this point (3D Figure-8 Overpass!)
    let blocksUnderpass = false;
    if (track.def.hasOverpass) {
      for (let k = 0; k < track.frames.length; k += 4) {
        const g = track.frames[k];
        const dtWrap = Math.min(Math.abs(g.t - t), 1 - Math.abs(g.t - t));
        if (dtWrap < 0.08) continue;
        const horizDist = Math.hypot(g.pos.x - f.pos.x, g.pos.z - f.pos.z);
        if (horizDist < g.width * 0.5 + 26 && g.pos.y < f.pos.y - 3) {
          blocksUnderpass = true;
          break;
        }
      }
    }
    if (!blocksUnderpass) {
      validPillarFrames.push({
        x: f.pos.x,
        y: f.pos.y - 39.5,
        z: f.pos.z,
        yaw: Math.atan2(f.tangent.x, f.tangent.z),
      });
    }
  }

  const pillars = new THREE.InstancedMesh(pillarGeo, pillarMat, Math.max(1, validPillarFrames.length));
  const dummy = new THREE.Object3D();
  validPillarFrames.forEach((pf, idx) => {
    dummy.position.set(pf.x, pf.y, pf.z);
    dummy.rotation.set(0, pf.yaw, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    pillars.setMatrixAt(idx, dummy.matrix);
  });
  pillars.instanceMatrix.needsUpdate = true;
  pillars.computeBoundingSphere();
  group.add(pillars);

  return group;
}

/**
 * Builds the iconic composite Start/Finish Gantry Arch straddling t=0.012
 * scaled to the live variable road width & styled for the active planetary biome.
 */
export function buildStartGantry(track: BakedTrack, isSoftwareGl: boolean): THREE.Group {
  const gantry = new THREE.Group();
  const f = sampleTrackFrame(track, 0.012);
  const halfW = f.width * 0.5 + 2.2;
  const biome = track.def.biome;

  const bannerHex =
    biome === 'volcano'
      ? 0xff9f1c
      : biome === 'biolume'
      ? 0x34d399
      : biome === 'cybercity'
      ? 0xec4899
      : biome === 'quantum'
      ? 0xfbbf24
      : biome === 'aether'
      ? 0x38bdf8
      : 0x2df9f2;
  const accentHex =
    biome === 'glacier'
      ? 0x7efcf7
      : biome === 'biolume'
      ? 0xf472b6
      : biome === 'cybercity'
      ? 0x22d3ee
      : biome === 'quantum'
      ? 0xc084fc
      : biome === 'aether'
      ? 0xfde047
      : 0xffa63d;

  const towerMat = new THREE.MeshStandardMaterial({
    color:
      biome === 'volcano' || biome === 'cybercity' || biome === 'quantum'
        ? 0x2b2538
        : biome === 'aether'
        ? 0xf1f5f9
        : 0xe6ddd3,
    roughness: 0.42,
    metalness: 0.42,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x262938,
    roughness: 0.55,
    metalness: 0.72,
  });
  const bannerMat = new THREE.MeshStandardMaterial({
    color: bannerHex,
    emissive: bannerHex,
    emissiveIntensity: 1.45,
    roughness: 0.2,
    metalness: 0.2,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 1.15,
    roughness: 0.3,
    metalness: 0.3,
  });

  for (const side of [-1, 1]) {
    const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(3.8, 3.2, 4.4), darkMetalMat);
    basePlinth.position.set(side * halfW, 1.6, 0);
    gantry.add(basePlinth);

    const tower = new THREE.Mesh(new THREE.BoxGeometry(2.4, 15.5, 3.0), towerMat);
    tower.position.set(side * halfW, 9.5, 0);
    tower.castShadow = !isSoftwareGl;
    gantry.add(tower);

    const verticalLight = new THREE.Mesh(new THREE.BoxGeometry(0.42, 13.5, 3.16), bannerMat);
    verticalLight.position.set(side * (halfW - 1.15), 9.6, 0);
    gantry.add(verticalLight);

    const spire = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4.2, 6), accentMat);
    spire.position.set(side * halfW, 19.2, 0);
    gantry.add(spire);
  }

  const spanWidth = halfW * 2 + 2.6;
  const overheadBeam = new THREE.Mesh(new THREE.BoxGeometry(spanWidth, 2.8, 3.4), darkMetalMat);
  overheadBeam.position.set(0, 15.8, 0);
  overheadBeam.castShadow = !isSoftwareGl;
  gantry.add(overheadBeam);

  const upperCrown = new THREE.Mesh(new THREE.BoxGeometry(spanWidth * 0.78, 0.9, 2.2), towerMat);
  upperCrown.position.set(0, 17.6, 0);
  gantry.add(upperCrown);

  const glowingStrip = new THREE.Mesh(new THREE.BoxGeometry(spanWidth - 5.5, 0.72, 3.55), bannerMat);
  glowingStrip.position.set(0, 15.5, 0);
  gantry.add(glowingStrip);

  const braceGeo = new THREE.BoxGeometry(4.2, 0.85, 2.2);
  for (const side of [-1, 1]) {
    const brace = new THREE.Mesh(braceGeo, darkMetalMat);
    brace.position.set(side * (halfW - 2.3), 13.4, 0);
    brace.rotation.z = side * 0.68;
    gantry.add(brace);
  }

  const podHousingGeo = new THREE.BoxGeometry(1.1, 1.1, 1.3);
  const lensGeo = new THREE.CylinderGeometry(0.32, 0.32, 1.4, 12);
  lensGeo.rotateX(Math.PI / 2);
  for (let i = -2; i <= 2; i++) {
    const housing = new THREE.Mesh(podHousingGeo, darkMetalMat);
    housing.position.set(i * 2.2, 13.85, 0);
    gantry.add(housing);

    const lens = new THREE.Mesh(lensGeo, accentMat);
    lens.position.set(i * 2.2, 13.85, 0);
    gantry.add(lens);
  }

  const basis = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(f.right.x, f.right.y, f.right.z),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(-f.tangent.x, -f.tangent.y, -f.tangent.z),
  );
  gantry.quaternion.setFromRotationMatrix(basis);
  gantry.position.set(f.pos.x, f.pos.y - 0.5, f.pos.z);

  return gantry;
}

/**
 * Builds planetary biome environment: heightfield terrain, instanced biome landmarks
 * (sandstone mesas, ice crystal spires, volcanic obsidian basalt + lava vents, sky-citadel pillars),
 * monumental spanning arches, rotating orbital skyway gates, and variable-width corner beacons.
 */
function createSkyscraperTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#141933';
  ctx.fillRect(0, 0, 256, 512);

  for (let row = 0; row < 32; row++) {
    for (let col = 0; col < 10; col++) {
      const hash = (row * 31 + col * 17) % 13;
      if (hash < 4) continue;
      ctx.fillStyle =
        hash === 4
          ? '#ec4899'
          : hash === 5
          ? '#2df9f2'
          : hash === 6
          ? '#fbbf24'
          : 'rgba(186, 230, 253, 0.72)';
      ctx.fillRect(12 + col * 24, 8 + row * 15, 16, 8);
    }
  }
  // Horizontal neon facade trim bands
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(0, 118, 256, 6);
  ctx.fillStyle = '#ec4899';
  ctx.fillRect(0, 310, 256, 6);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Builds planetary biome environment for all 8 massive worlds:
 * heightfield terrain with Figure-8 overpass clearance, instanced landmarks (sandstone mesas,
 * ice crystal spires, giant glowing alien mushrooms, sci-fi skyscrapers, volcanic basalt,
 * sky-citadel pillars, quantum crystal obelisks), rotating gates, floating props, and corner beacons.
 */
export function buildCanyonEnvironment(
  track: BakedTrack,
  maxAnisotropy: number,
  isSoftwareGl: boolean,
): {
  group: THREE.Group;
  rotatingGates: THREE.Group[];
  floatingProps: FloatingPropVisual[];
} {
  const env = new THREE.Group();
  const rotatingGates: THREE.Group[] = [];
  const floatingProps: FloatingPropVisual[] = [];
  const biome = track.def.biome;

  const trackSamples = track.frames.filter((_, i) => i % 4 === 0);
  // Overpass-safe nearestTrackInfo: tracks minimum trackY among all nearby segments so terrain
  // NEVER rises through the lower deck of a 3D Figure-8 overpass!
  const nearestTrackInfo = (
    x: number,
    z: number,
  ): { dist: number; trackY: number; halfWidth: number } => {
    let minD2 = Infinity;
    let lowestNearbyY = Infinity;
    let closestY = 8;
    let hw = 20;
    for (let i = 0; i < trackSamples.length; i++) {
      const f = trackSamples[i];
      const dx = x - f.pos.x;
      const dz = z - f.pos.z;
      const d2 = dx * dx + dz * dz;
      const clearRad = f.width * 0.5 + 32;
      if (d2 < clearRad * clearRad && f.pos.y < lowestNearbyY) {
        lowestNearbyY = f.pos.y;
      }
      if (d2 < minD2) {
        minD2 = d2;
        closestY = f.pos.y;
        hw = f.width * 0.5;
      }
    }
    return {
      dist: Math.sqrt(minD2),
      trackY: lowestNearbyY < Infinity ? lowestNearbyY : closestY,
      halfWidth: hw,
    };
  };

  // Massive planetary heightfield (3200m x 3200m extends cleanly to horizon fog even on 3.5km+ circuits)
  const terrainGeo = new THREE.PlaneGeometry(3200, 3200, 96, 96);
  terrainGeo.rotateX(-Math.PI / 2);
  const pos = terrainGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const { dist, trackY, halfWidth } = nearestTrackInfo(x, z);

    const rawNoise =
      Math.sin(x * 0.0085) * Math.cos(z * 0.008) * 18 +
      Math.sin(x * 0.022 + z * 0.018) * 8;
    const clearEdge = halfWidth + 18;
    const mesaRamp = THREE.MathUtils.smoothstep(dist, clearEdge, clearEdge + 175);
    const outerRim = THREE.MathUtils.smoothstep(Math.hypot(x, z), 780, 1420) * 105;

    let y =
      biome === 'cybercity'
        ? -26 + rawNoise * 0.15
        : biome === 'quantum'
        ? -30 + mesaRamp * (20 + rawNoise * 0.6) + outerRim * 0.5
        : biome === 'aether'
        ? -32 + mesaRamp * (22 + rawNoise * 0.65) + outerRim * 0.45
        : biome === 'volcano'
        ? -16 + mesaRamp * (52 + rawNoise * 1.15) + outerRim * 1.15
        : biome === 'biolume'
        ? -18 + mesaRamp * (34 + rawNoise * 0.9) + outerRim * 0.78
        : biome === 'canyon'
        ? -14 + mesaRamp * (44 + rawNoise) + outerRim * 0.95
        : -14 + mesaRamp * (40 + rawNoise) + outerRim;

    // Carve natural turquoise Desert Oasis river valley beneath Zone 3 on Solar Canyon!
    if (biome === 'canyon' && x > 300 && x < 790 && z > -210 && z < 280) {
      const oasisCenterDist = Math.hypot((x - 535) * 0.85, (z - 45) * 0.68);
      const riverBowl = 1 - THREE.MathUtils.smoothstep(oasisCenterDist, 85, 215);
      y = THREE.MathUtils.lerp(y, -11.5, riverBowl);
    }

    // Hard safety clearance beneath even the widest 58m sky-plaza & Figure-8 underpasses
    if (dist < halfWidth + 28) {
      y = Math.min(y, trackY - 9.5);
    }
    pos.setY(i, y);
  }
  terrainGeo.computeVertexNormals();

  const terrainTex = createTerrainTexture(
    biome,
    track.def.terrainPrimary,
    track.def.terrainAccent,
    maxAnisotropy,
  );
  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: terrainTex,
    roughness: biome === 'glacier' || biome === 'cybercity' ? 0.4 : biome === 'aether' ? 0.95 : 0.86,
    metalness: biome === 'cybercity' || biome === 'quantum' ? 0.25 : biome === 'glacier' ? 0.16 : 0.06,
    emissive:
      biome === 'volcano'
        ? new THREE.Color(0x451208)
        : biome === 'cybercity'
        ? new THREE.Color(0x161436)
        : biome === 'quantum'
        ? new THREE.Color(0x1e1040)
        : biome === 'biolume'
        ? new THREE.Color(0x06292a)
        : new THREE.Color(0x000000),
    emissiveIntensity:
      biome === 'volcano' ? 0.55 : biome === 'cybercity' || biome === 'quantum' || biome === 'biolume' ? 0.38 : 0,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = !isSoftwareGl;
  env.add(terrainMesh);

  // Deterministic PRNG per circuit
  const seedMap: Record<string, number> = {
    'solar-canyon': 1337,
    'glacier-spire': 2828,
    'biolume-jungle': 3434,
    'nebula-ridge': 4242,
    'obsidian-caldera': 6161,
    'neon-megacity': 7171,
    'aether-ringway': 8989,
    'quantum-prism': 9797,
  };
  let seed = seedMap[track.def.id] ?? 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const dummy = new THREE.Object3D();

  // Creative Biome Landmarks!
  if (biome === 'canyon') {
    // 1. Golden-Hour Sun Disc & Warm Atmospheric Halo on the canyon horizon
    const sunGroup = new THREE.Group();
    const sunCore = new THREE.Mesh(
      new THREE.CircleGeometry(110, 28),
      new THREE.MeshBasicMaterial({ color: 0xfff3cc, fog: false }),
    );
    const sunHalo = new THREE.Mesh(
      new THREE.CircleGeometry(210, 28),
      new THREE.MeshBasicMaterial({
        color: 0xffb35c,
        transparent: true,
        opacity: 0.34,
        fog: false,
        depthWrite: false,
      }),
    );
    sunHalo.position.z = -1;
    sunGroup.add(sunCore, sunHalo);
    sunGroup.position.set(290, 330, -1420);
    sunGroup.lookAt(0, 40, 0);
    env.add(sunGroup);

    // 2. Three-Tier Stratified Terracotta Mesa Buttes (Base Cliff + Middle Stratum + Sunlit Cap)
    const baseMesaGeo = new THREE.CylinderGeometry(11.5, 17.5, 22, 8);
    baseMesaGeo.translate(0, 11, 0);
    const midMesaGeo = new THREE.CylinderGeometry(9.0, 11.8, 17, 8);
    midMesaGeo.translate(0, 30, 0);
    const capMesaGeo = new THREE.CylinderGeometry(8.2, 9.5, 7, 8);
    capMesaGeo.translate(0, 41.5, 0);

    const baseMesaMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.88,
      metalness: 0.05,
      flatShading: true,
    });
    const midMesaMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.84,
      metalness: 0.05,
      flatShading: true,
    });
    const capMesaMat = new THREE.MeshStandardMaterial({
      color: 0xe6a167,
      roughness: 0.78,
      metalness: 0.06,
      flatShading: true,
    });

    const mesas: Array<{
      x: number;
      z: number;
      sx: number;
      sy: number;
      sz: number;
      rot: number;
      baseCol: THREE.Color;
      midCol: THREE.Color;
    }> = [];
    const terracotta = new THREE.Color('#b65336');
    const ochre = new THREE.Color('#d8804a');
    const umber = new THREE.Color('#863a29');

    for (let attempt = 0; attempt < 620 && mesas.length < 118; attempt++) {
      const angle = rand() * Math.PI * 2;
      const radius = 110 + rand() * 1040;
      const x = 180 + Math.cos(angle) * radius;
      const z = 40 + Math.sin(angle) * radius;
      const { dist, halfWidth } = nearestTrackInfo(x, z);
      if (dist < halfWidth + 48) continue;
      // Keep the opening launch vista & turquoise Oasis River basin clear of close blocking cliffs
      if (x > -120 && x < 165 && z > -360 && z < 80) continue;
      if (x > 370 && x < 700 && z > -130 && z < 210) continue;

      const sx = 0.85 + rand() * 2.25;
      const sy = 0.8 + rand() * 2.4;
      const sz = 0.85 + rand() * 2.25;
      mesas.push({
        x,
        z,
        sx,
        sy,
        sz,
        rot: rand() * Math.PI * 2,
        baseCol: umber.clone().lerp(terracotta, rand() * 0.8),
        midCol: terracotta.clone().lerp(ochre, 0.35 + rand() * 0.65),
      });
    }

    const baseInst = new THREE.InstancedMesh(baseMesaGeo, baseMesaMat, mesas.length);
    const midInst = new THREE.InstancedMesh(midMesaGeo, midMesaMat, mesas.length);
    const capInst = new THREE.InstancedMesh(capMesaGeo, capMesaMat, mesas.length);
    mesas.forEach((m, idx) => {
      dummy.position.set(m.x, -16, m.z);
      dummy.rotation.set(0, m.rot, 0);
      dummy.scale.set(m.sx, m.sy, m.sz);
      dummy.updateMatrix();
      baseInst.setMatrixAt(idx, dummy.matrix);
      baseInst.setColorAt(idx, m.baseCol);
      midInst.setMatrixAt(idx, dummy.matrix);
      midInst.setColorAt(idx, m.midCol);
      capInst.setMatrixAt(idx, dummy.matrix);
    });
    baseInst.instanceMatrix.needsUpdate = true;
    midInst.instanceMatrix.needsUpdate = true;
    capInst.instanceMatrix.needsUpdate = true;
    if (baseInst.instanceColor) baseInst.instanceColor.needsUpdate = true;
    if (midInst.instanceColor) midInst.instanceColor.needsUpdate = true;
    baseInst.computeBoundingSphere();
    midInst.computeBoundingSphere();
    capInst.computeBoundingSphere();
    env.add(baseInst, midInst, capInst);

    // 3. Shimmering Turquoise Desert Oasis Canyon River & Lagoon beneath Zone 3!
    const oasisWaterMat = new THREE.MeshPhysicalMaterial({
      color: 0x18c4be,
      emissive: 0x0a5d66,
      emissiveIntensity: 0.35,
      roughness: 0.14,
      metalness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      transparent: true,
      opacity: 0.88,
    });
    const oasisLagoon = new THREE.Mesh(new THREE.CircleGeometry(175, 32), oasisWaterMat);
    oasisLagoon.rotation.x = -Math.PI / 2;
    oasisLagoon.scale.set(0.95, 1.38, 1);
    oasisLagoon.position.set(535, -7.2, 48);
    env.add(oasisLagoon);

    // Sandy turquoise shoreline ring framing the Oasis River
    const shoreRing = new THREE.Mesh(
      new THREE.RingGeometry(165, 205, 32),
      new THREE.MeshStandardMaterial({ color: 0xe6c38d, roughness: 0.92, metalness: 0.02 }),
    );
    shoreRing.rotation.x = -Math.PI / 2;
    shoreRing.scale.set(0.95, 1.38, 1);
    shoreRing.position.set(535, -7.35, 48);
    env.add(shoreRing);

    // 4. Instanced Desert Saguaro Cacti & Oasis Palms along canyon floor & oasis banks!
    const palmPositions: Array<{ x: number; y: number; z: number; s: number; rot: number }> = [];
    for (let i = 0; i < 42; i++) {
      const ang = (i / 42) * Math.PI * 2 + rand() * 0.12;
      const r = 135 + rand() * 72;
      const px = 535 + Math.cos(ang) * r * 0.92;
      const pz = 48 + Math.sin(ang) * r * 1.3;
      const { dist, halfWidth } = nearestTrackInfo(px, pz);
      if (dist < halfWidth + 14) continue;
      palmPositions.push({ x: px, y: -7.5, z: pz, s: 0.9 + rand() * 0.7, rot: rand() * Math.PI * 2 });
    }
    if (palmPositions.length > 0) {
      const trunkGeo = new THREE.CylinderGeometry(0.45, 0.95, 13, 6);
      trunkGeo.translate(0, 6.5, 0);
      const canopyGeo = new THREE.ConeGeometry(5.2, 3.8, 7);
      canopyGeo.translate(0, 13.5, 0);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7c5338, roughness: 0.9 });
      const frondMat = new THREE.MeshStandardMaterial({ color: 0x2c945c, roughness: 0.72, flatShading: true });
      const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, palmPositions.length);
      const frondInst = new THREE.InstancedMesh(canopyGeo, frondMat, palmPositions.length);
      palmPositions.forEach((p, idx) => {
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0.06, p.rot, 0.05);
        dummy.scale.setScalar(p.s);
        dummy.updateMatrix();
        trunkInst.setMatrixAt(idx, dummy.matrix);
        frondInst.setMatrixAt(idx, dummy.matrix);
      });
      trunkInst.instanceMatrix.needsUpdate = true;
      frondInst.instanceMatrix.needsUpdate = true;
      trunkInst.computeBoundingSphere();
      frondInst.computeBoundingSphere();
      env.add(trunkInst, frondInst);
    }

    // 5. Giant Solar Heliostat Collector Towers (Sun-Core Power Towers + Angled Solar Mirror Panels!)
    const towerSpots = [
      { t: 0.052, side: 1, off: 44 },
      { t: 0.23, side: -1, off: 64 },
      { t: 0.56, side: 1, off: 56 },
      { t: 0.66, side: -1, off: 58 },
      { t: 0.86, side: 1, off: 62 },
    ];
    const towerConcreteMat = new THREE.MeshStandardMaterial({
      color: 0xeae2d6,
      roughness: 0.45,
      metalness: 0.28,
    });
    const towerDarkMat = new THREE.MeshStandardMaterial({
      color: 0x262c3d,
      roughness: 0.48,
      metalness: 0.75,
    });
    const solarCoreMat = new THREE.MeshBasicMaterial({ color: 0xfff0a6 });
    const solarRingMat = new THREE.MeshStandardMaterial({
      color: 0x2df9f2,
      emissive: 0x0ec7c7,
      emissiveIntensity: 1.4,
      roughness: 0.25,
    });
    const mirrorPanelMat = new THREE.MeshStandardMaterial({
      color: 0x1d4e78,
      roughness: 0.14,
      metalness: 0.88,
    });
    const mirrorPanelGeo = new THREE.BoxGeometry(9.5, 0.45, 6.5);

    const mirrorPositions: Array<{ x: number; y: number; z: number; yaw: number }> = [];
    for (const spot of towerSpots) {
      const f = sampleTrackFrame(track, spot.t);
      const tx = f.pos.x + f.right.x * (f.width * 0.5 + spot.off) * spot.side;
      const tz = f.pos.z + f.right.z * (f.width * 0.5 + spot.off) * spot.side;
      const ty = Math.max(-12, f.pos.y - 26);

      const tower = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 6.2, 68, 8), towerConcreteMat);
      shaft.position.y = 34;
      tower.add(shaft);

      const collar = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 4.4, 5.5, 8), towerDarkMat);
      collar.position.y = 68;
      tower.add(collar);

      const sunReceiver = new THREE.Mesh(new THREE.OctahedronGeometry(5.8, 1), solarCoreMat);
      sunReceiver.position.y = 75.5;
      tower.add(sunReceiver);

      const crownHalo = new THREE.Mesh(new THREE.TorusGeometry(8.6, 0.55, 8, 24), solarRingMat);
      crownHalo.rotation.x = Math.PI / 2;
      crownHalo.position.y = 75.5;
      tower.add(crownHalo);

      tower.position.set(tx, ty, tz);
      env.add(tower);

      // Ring of 8 angled solar mirrors orbiting the tower base
      for (let m = 0; m < 8; m++) {
        const a = (m / 8) * Math.PI * 2;
        const mx = tx + Math.cos(a) * 20;
        const mz = tz + Math.sin(a) * 20;
        const info = nearestTrackInfo(mx, mz);
        if (info.dist < info.halfWidth + 14) continue;
        mirrorPositions.push({ x: mx, y: ty + 3.5, z: mz, yaw: a + Math.PI / 2 });
      }
    }
    if (mirrorPositions.length > 0) {
      const mirrorInst = new THREE.InstancedMesh(mirrorPanelGeo, mirrorPanelMat, mirrorPositions.length);
      mirrorPositions.forEach((mp, idx) => {
        dummy.position.set(mp.x, mp.y, mp.z);
        dummy.rotation.set(0.45, mp.yaw, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        mirrorInst.setMatrixAt(idx, dummy.matrix);
      });
      mirrorInst.instanceMatrix.needsUpdate = true;
      mirrorInst.computeBoundingSphere();
      env.add(mirrorInst);
    }

    // 6. Four Drifting Saucer GP Spectator Solar Blimps in the canyon sky!
    const blimpHullMat = new THREE.MeshPhysicalMaterial({
      color: 0xf7f2ea,
      roughness: 0.28,
      metalness: 0.22,
      clearcoat: 0.85,
    });
    const blimpStripeCyan = new THREE.MeshStandardMaterial({
      color: 0x2df9f2,
      emissive: 0x0ec7c7,
      emissiveIntensity: 1.1,
      roughness: 0.22,
    });
    const blimpStripeAmber = new THREE.MeshStandardMaterial({
      color: 0xffa63d,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.95,
      roughness: 0.22,
    });
    const blimpFinMat = new THREE.MeshStandardMaterial({ color: 0x262c3d, roughness: 0.45, metalness: 0.6 });
    const blimpSpots = [
      { t: 0.055, side: -1, off: 46, alt: 35 },
      { t: 0.28, side: 1, off: 78, alt: 52 },
      { t: 0.52, side: -1, off: 72, alt: 48 },
      { t: 0.82, side: -1, off: 75, alt: 54 },
    ];
    blimpSpots.forEach((bs, idx) => {
      const f = sampleTrackFrame(track, bs.t);
      const blimp = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.SphereGeometry(9.5, 16, 12), blimpHullMat);
      hull.scale.set(1.0, 0.78, 2.35);
      blimp.add(hull);

      const stripe = new THREE.Mesh(
        new THREE.TorusGeometry(9.65, 0.75, 8, 24),
        idx % 2 === 0 ? blimpStripeCyan : blimpStripeAmber,
      );
      stripe.scale.set(1.0, 0.78, 1.0);
      blimp.add(stripe);

      const gondola = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.8, 9.5), blimpFinMat);
      gondola.position.set(0, -8.2, 0);
      blimp.add(gondola);

      const vFin = new THREE.Mesh(new THREE.BoxGeometry(0.6, 9.0, 7.5), blimpFinMat);
      vFin.position.set(0, 3.2, -17.5);
      blimp.add(vFin);

      const hFin = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.6, 6.5), blimpFinMat);
      hFin.position.set(0, 0, -17.5);
      blimp.add(hFin);

      const bx = f.pos.x + f.right.x * (f.width * 0.5 + bs.off) * bs.side;
      const by = f.pos.y + bs.alt;
      const bz = f.pos.z + f.right.z * (f.width * 0.5 + bs.off) * bs.side;
      blimp.position.set(bx, by, bz);
      blimp.rotation.y = Math.atan2(f.tangent.x, f.tangent.z) + 0.35;
      env.add(blimp);
      floatingProps.push({
        mesh: blimp,
        baseY: by,
        phase: idx * 1.6,
        bobAmp: 2.6,
        bobSpeed: 0.75 + idx * 0.12,
        rotSpeed: 0.03 * (idx % 2 === 0 ? 1 : -1),
      });
    });
  } else if (biome === 'glacier') {
    // GRAND ARCTIC ALPINE SCENARIO (Level 2 — Glacier Spire):
    // 1. Three Shimmering Aurora Borealis Sky Curtains curving across the polar sky!
    const auroraCanvas = document.createElement('canvas');
    auroraCanvas.width = 512;
    auroraCanvas.height = 128;
    const actx = auroraCanvas.getContext('2d')!;
    const aGrad = actx.createLinearGradient(0, 0, 512, 0);
    aGrad.addColorStop(0.0, 'rgba(56, 189, 248, 0)');
    aGrad.addColorStop(0.18, 'rgba(52, 211, 153, 0.75)');
    aGrad.addColorStop(0.48, 'rgba(45, 249, 242, 0.85)');
    aGrad.addColorStop(0.76, 'rgba(168, 85, 247, 0.72)');
    aGrad.addColorStop(1.0, 'rgba(56, 189, 248, 0)');
    actx.fillStyle = aGrad;
    actx.fillRect(0, 0, 512, 128);
    // Vertical curtain wisps & soft top/bottom alpha mask
    actx.globalCompositeOperation = 'destination-in';
    const vGrad = actx.createLinearGradient(0, 0, 0, 128);
    vGrad.addColorStop(0.0, 'rgba(255,255,255,0)');
    vGrad.addColorStop(0.32, 'rgba(255,255,255,0.85)');
    vGrad.addColorStop(0.72, 'rgba(255,255,255,0.95)');
    vGrad.addColorStop(1.0, 'rgba(255,255,255,0)');
    actx.fillStyle = vGrad;
    actx.fillRect(0, 0, 512, 128);
    actx.globalCompositeOperation = 'source-over';
    for (let s = 0; s < 36; s++) {
      const sx = (s / 36) * 512;
      actx.fillStyle = s % 2 === 0 ? 'rgba(190, 255, 248, 0.24)' : 'rgba(167, 139, 250, 0.18)';
      actx.fillRect(sx, 14, 5, 100);
    }
    const auroraTex = new THREE.CanvasTexture(auroraCanvas);
    auroraTex.colorSpace = THREE.SRGBColorSpace;
    const auroraMat = new THREE.MeshBasicMaterial({
      map: auroraTex,
      transparent: true,
      opacity: 0.62,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const auroraConfigs = [
      { x: -135, y: 158, z: -560, radius: 520, height: 92, arc: Math.PI * 0.72, rotY: -0.45 },
      { x: -380, y: 185, z: 320, radius: 480, height: 86, arc: Math.PI * 0.68, rotY: 2.35 },
      { x: 260, y: 168, z: 220, radius: 440, height: 82, arc: Math.PI * 0.65, rotY: 0.95 },
    ];
    auroraConfigs.forEach((ac, idx) => {
      const curtain = new THREE.Mesh(
        new THREE.CylinderGeometry(ac.radius, ac.radius * 0.96, ac.height, 28, 1, true, 0, ac.arc),
        auroraMat,
      );
      curtain.position.set(ac.x, ac.y, ac.z);
      curtain.rotation.y = ac.rotY;
      env.add(curtain);
      floatingProps.push({
        mesh: curtain,
        baseY: ac.y,
        phase: idx * 2.1,
        bobAmp: 6.5,
        bobSpeed: 0.42 + idx * 0.08,
        rotSpeed: 0.015 * (idx % 2 === 0 ? 1 : -1),
      });
    });

    // 2. Multi-Faceted Snow-Capped Alpine Peaks (Instanced 2-layer Granite Ridge + Snow Cap)
    const peakBaseGeo = new THREE.ConeGeometry(28, 76, 6);
    peakBaseGeo.translate(0, 38, 0);
    const peakCapGeo = new THREE.ConeGeometry(14.5, 36, 6);
    peakCapGeo.translate(0, 61, 0);

    const peakBaseMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.68,
      metalness: 0.14,
      flatShading: true,
    });
    const peakCapMat = new THREE.MeshStandardMaterial({
      color: 0xf0f9ff,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.12,
      roughness: 0.34,
      metalness: 0.08,
      flatShading: true,
    });

    const peaks: Array<{
      x: number;
      z: number;
      sx: number;
      sy: number;
      sz: number;
      rot: number;
      baseCol: THREE.Color;
    }> = [];
    const slateBlue = new THREE.Color('#2d5278');
    const glacialSlate = new THREE.Color('#4a7ca6');
    const frostSlate = new THREE.Color('#6fa6cc');

    for (let attempt = 0; attempt < 640 && peaks.length < 112; attempt++) {
      const angle = rand() * Math.PI * 2;
      const radius = 120 + rand() * 1080;
      const x = -165 + Math.cos(angle) * radius;
      const z = 40 + Math.sin(angle) * radius;
      const { dist, halfWidth } = nearestTrackInfo(x, z);
      if (dist < halfWidth + 52) continue;
      // Keep opening launch vista & Mirrored Frozen Fjord Lake clear of blocking mountains
      if (x > -165 && x < 120 && z > -360 && z < 80) continue;
      if (x > -690 && x < -230 && z > 100 && z < 540) continue;

      peaks.push({
        x,
        z,
        sx: 0.85 + rand() * 2.15,
        sy: 0.85 + rand() * 2.45,
        sz: 0.85 + rand() * 2.15,
        rot: rand() * Math.PI * 2,
        baseCol: slateBlue.clone().lerp(rand() > 0.5 ? frostSlate : glacialSlate, rand() * 0.85),
      });
    }

    const peakBaseInst = new THREE.InstancedMesh(peakBaseGeo, peakBaseMat, peaks.length);
    const peakCapInst = new THREE.InstancedMesh(peakCapGeo, peakCapMat, peaks.length);
    peaks.forEach((p, idx) => {
      dummy.position.set(p.x, -16, p.z);
      dummy.rotation.set(0, p.rot, 0);
      dummy.scale.set(p.sx, p.sy, p.sz);
      dummy.updateMatrix();
      peakBaseInst.setMatrixAt(idx, dummy.matrix);
      peakBaseInst.setColorAt(idx, p.baseCol);
      peakCapInst.setMatrixAt(idx, dummy.matrix);
    });
    peakBaseInst.instanceMatrix.needsUpdate = true;
    peakCapInst.instanceMatrix.needsUpdate = true;
    if (peakBaseInst.instanceColor) peakBaseInst.instanceColor.needsUpdate = true;
    peakBaseInst.computeBoundingSphere();
    peakCapInst.computeBoundingSphere();
    env.add(peakBaseInst, peakCapInst);

    // 3. Gleaming Translucent Crystal Glacier Clusters flanking high alpine ridges
    const crystalGeo = new THREE.OctahedronGeometry(7.5, 0);
    crystalGeo.scale(0.85, 2.5, 0.85);
    crystalGeo.translate(0, 14, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x7efcf7,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.34,
      roughness: 0.16,
      metalness: 0.28,
      flatShading: true,
    });
    const crystals: Array<{ x: number; z: number; s: number; rot: number; tilt: number }> = [];
    for (let attempt = 0; attempt < 260 && crystals.length < 48; attempt++) {
      const t = rand();
      const f = sampleTrackFrame(track, t);
      const side = rand() > 0.5 ? 1 : -1;
      const off = f.width * 0.5 + 24 + rand() * 58;
      const cx = f.pos.x + f.right.x * off * side;
      const cz = f.pos.z + f.right.z * off * side;
      const info = nearestTrackInfo(cx, cz);
      if (info.dist < info.halfWidth + 20) continue;
      crystals.push({ x: cx, z: cz, s: 0.65 + rand() * 1.45, rot: rand() * Math.PI * 2, tilt: (rand() - 0.5) * 0.34 });
    }
    if (crystals.length > 0) {
      const crystalInst = new THREE.InstancedMesh(crystalGeo, crystalMat, crystals.length);
      crystals.forEach((c, idx) => {
        dummy.position.set(c.x, -10, c.z);
        dummy.rotation.set(c.tilt, c.rot, c.tilt * 0.6);
        dummy.scale.setScalar(c.s);
        dummy.updateMatrix();
        crystalInst.setMatrixAt(idx, dummy.matrix);
      });
      crystalInst.instanceMatrix.needsUpdate = true;
      crystalInst.computeBoundingSphere();
      env.add(crystalInst);
    }

    // 4. Mirrored Frozen Fjord Lake & 18 Floating Faceted Icebergs beneath Zone 4!
    const fjordMat = new THREE.MeshPhysicalMaterial({
      color: 0x168ec4,
      emissive: 0x0b4c72,
      emissiveIntensity: 0.36,
      roughness: 0.1,
      metalness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      transparent: true,
      opacity: 0.9,
    });
    const fjordLake = new THREE.Mesh(new THREE.CircleGeometry(210, 32), fjordMat);
    fjordLake.rotation.x = -Math.PI / 2;
    fjordLake.scale.set(1.18, 0.94, 1);
    fjordLake.position.set(-455, -6.5, 325);
    env.add(fjordLake);

    const iceRim = new THREE.Mesh(
      new THREE.RingGeometry(198, 238, 32),
      new THREE.MeshStandardMaterial({ color: 0xd9f3ff, roughness: 0.42, metalness: 0.08 }),
    );
    iceRim.rotation.x = -Math.PI / 2;
    iceRim.scale.set(1.18, 0.94, 1);
    iceRim.position.set(-455, -6.65, 325);
    env.add(iceRim);

    const bergGeo = new THREE.DodecahedronGeometry(14, 0);
    bergGeo.scale(1.35, 0.72, 1.1);
    const bergMat = new THREE.MeshStandardMaterial({
      color: 0xe6f8ff,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.18,
      roughness: 0.24,
      metalness: 0.14,
      flatShading: true,
    });
    const bergs: Array<{ x: number; z: number; sx: number; sy: number; rot: number }> = [];
    for (let i = 0; i < 28 && bergs.length < 18; i++) {
      const a = (i / 28) * Math.PI * 2 + rand() * 0.2;
      const r = 42 + rand() * 145;
      const bx = -455 + Math.cos(a) * r * 1.12;
      const bz = 325 + Math.sin(a) * r * 0.88;
      const info = nearestTrackInfo(bx, bz);
      if (info.dist < info.halfWidth + 24) continue;
      bergs.push({ x: bx, z: bz, sx: 0.75 + rand() * 1.35, sy: 0.65 + rand() * 1.1, rot: rand() * Math.PI * 2 });
    }
    if (bergs.length > 0) {
      const bergInst = new THREE.InstancedMesh(bergGeo, bergMat, bergs.length);
      bergs.forEach((b, idx) => {
        dummy.position.set(b.x, -4.2, b.z);
        dummy.rotation.set(0, b.rot, 0);
        dummy.scale.set(b.sx, b.sy, b.sx);
        dummy.updateMatrix();
        bergInst.setMatrixAt(idx, dummy.matrix);
      });
      bergInst.instanceMatrix.needsUpdate = true;
      bergInst.computeBoundingSphere();
      env.add(bergInst);
    }

    // 5. Instanced Snowy Arctic Evergreen Pines framing the Frozen Fjord banks & ridges!
    const pineSpots: Array<{ x: number; z: number; s: number; rot: number }> = [];
    for (let i = 0; i < 64 && pineSpots.length < 48; i++) {
      const a = (i / 64) * Math.PI * 2 + rand() * 0.14;
      const r = 185 + rand() * 90;
      const px = -455 + Math.cos(a) * r * 1.15;
      const pz = 325 + Math.sin(a) * r * 0.92;
      const info = nearestTrackInfo(px, pz);
      if (info.dist < info.halfWidth + 18) continue;
      pineSpots.push({ x: px, z: pz, s: 0.9 + rand() * 0.85, rot: rand() * Math.PI * 2 });
    }
    if (pineSpots.length > 0) {
      const pTrunkGeo = new THREE.CylinderGeometry(0.65, 1.1, 7, 6);
      pTrunkGeo.translate(0, 3.5, 0);
      const pFoliageGeo = new THREE.ConeGeometry(5.6, 15, 6);
      pFoliageGeo.translate(0, 13, 0);
      const pSnowGeo = new THREE.ConeGeometry(3.8, 8.5, 6);
      pSnowGeo.translate(0, 17.5, 0);

      const pTrunkInst = new THREE.InstancedMesh(
        pTrunkGeo,
        new THREE.MeshStandardMaterial({ color: 0x4b382d, roughness: 0.9 }),
        pineSpots.length,
      );
      const pFoliageInst = new THREE.InstancedMesh(
        pFoliageGeo,
        new THREE.MeshStandardMaterial({ color: 0x195e56, roughness: 0.78, flatShading: true }),
        pineSpots.length,
      );
      const pSnowInst = new THREE.InstancedMesh(
        pSnowGeo,
        new THREE.MeshStandardMaterial({ color: 0xeaf8ff, roughness: 0.45, flatShading: true }),
        pineSpots.length,
      );
      pineSpots.forEach((p, idx) => {
        dummy.position.set(p.x, -7.2, p.z);
        dummy.rotation.set(0, p.rot, 0);
        dummy.scale.setScalar(p.s);
        dummy.updateMatrix();
        pTrunkInst.setMatrixAt(idx, dummy.matrix);
        pFoliageInst.setMatrixAt(idx, dummy.matrix);
        pSnowInst.setMatrixAt(idx, dummy.matrix);
      });
      pTrunkInst.instanceMatrix.needsUpdate = true;
      pFoliageInst.instanceMatrix.needsUpdate = true;
      pSnowInst.instanceMatrix.needsUpdate = true;
      pTrunkInst.computeBoundingSphere();
      pFoliageInst.computeBoundingSphere();
      pSnowInst.computeBoundingSphere();
      env.add(pTrunkInst, pFoliageInst, pSnowInst);
    }

    // 6. Three Arctic Research Observatory Domes + Rotating Radar Dish Towers!
    // Warm amber windows create rich figure-ground contrast against the cool Arctic cyan-blue world.
    const domeWhiteMat = new THREE.MeshPhysicalMaterial({
      color: 0xeff8ff,
      roughness: 0.28,
      metalness: 0.22,
      clearcoat: 0.8,
    });
    const domeMetalMat = new THREE.MeshStandardMaterial({
      color: 0x24344c,
      roughness: 0.45,
      metalness: 0.78,
    });
    const warmWindowMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xff9f1c,
      emissiveIntensity: 1.55,
      roughness: 0.2,
    });
    const cyanBeaconMat = new THREE.MeshBasicMaterial({ color: 0x5dfcf7 });
    const outpostSpots = [
      { t: 0.056, side: 1, off: 44 }, // Framed cleanly in opening start vista!
      { t: 0.695, side: -1, off: 50 }, // Alpine Observatory S-Bend!
      { t: 0.905, side: 1, off: 54 }, // Aurora Amphitheater overlook!
    ];
    outpostSpots.forEach((spot, idx) => {
      const f = sampleTrackFrame(track, spot.t);
      const ox = f.pos.x + f.right.x * (f.width * 0.5 + spot.off) * spot.side;
      const oz = f.pos.z + f.right.z * (f.width * 0.5 + spot.off) * spot.side;
      const oy = Math.max(-8, f.pos.y - 12);

      const station = new THREE.Group();
      const basePad = new THREE.Mesh(new THREE.CylinderGeometry(16, 19, 14, 8), domeMetalMat);
      basePad.position.y = 7;
      station.add(basePad);

      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(14.5, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.54),
        domeWhiteMat,
      );
      dome.position.y = 14;
      station.add(dome);

      const windowBand = new THREE.Mesh(
        new THREE.CylinderGeometry(14.7, 14.7, 2.8, 16, 1, true),
        warmWindowMat,
      );
      windowBand.position.y = 16.5;
      station.add(windowBand);

      // Radar mast + rotating parabolic dish
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.8, 22, 6), domeMetalMat);
      mast.position.set(8.5, 24, 0);
      station.add(mast);

      const radarHead = new THREE.Group();
      radarHead.position.set(8.5, 35.5, 0);
      const dish = new THREE.Mesh(
        new THREE.SphereGeometry(5.6, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.42),
        domeWhiteMat,
      );
      dish.rotation.x = Math.PI * 0.65;
      radarHead.add(dish);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.95, 8, 8), cyanBeaconMat);
      tip.position.set(0, 2.2, 2.8);
      radarHead.add(tip);
      station.add(radarHead);

      floatingProps.push({
        mesh: radarHead,
        baseY: 35.5,
        phase: idx * 1.9,
        bobAmp: 0,
        bobSpeed: 0,
        rotSpeed: 0.72 * (idx % 2 === 0 ? 1 : -1),
      });

      station.position.set(ox, oy, oz);
      env.add(station);
    });

    // 7. Floating Ice-Crystal Shards gently bobbing around alpine summit & aurora ridges!
    const shardGeo = new THREE.OctahedronGeometry(3.4, 0);
    shardGeo.scale(0.65, 1.8, 0.65);
    const shardMat = new THREE.MeshStandardMaterial({
      color: 0xa5f3fc,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.85,
      roughness: 0.14,
      metalness: 0.3,
      flatShading: true,
    });
    for (let i = 0; i < 14; i++) {
      const f = sampleTrackFrame(track, (i + 0.42) / 14);
      const side = i % 2 === 0 ? -1 : 1;
      const off = f.width * 0.5 + 18 + rand() * 26;
      const shard = new THREE.Mesh(shardGeo, shardMat);
      const baseY = f.pos.y + 12 + rand() * 18;
      shard.position.set(f.pos.x + f.right.x * off * side, baseY, f.pos.z + f.right.z * off * side);
      env.add(shard);
      floatingProps.push({
        mesh: shard,
        baseY,
        phase: i * 1.15,
        bobAmp: 2.2,
        bobSpeed: 1.2 + (i % 3) * 0.25,
        rotSpeed: 0.65 * (i % 2 === 0 ? 1 : -1),
      });
    }
  } else if (biome === 'biolume') {
    // GRAND BIOLUMINESCENT ALIEN RAINFOREST SCENARIO (Level 3 — Biolume Jungle):
    // 1. Towering 3-Layer Giant Glow-Mushroom Forest (120 instanced ribbed stalks + luminous caps + under-gill rings!)
    const stalkGeo = new THREE.CylinderGeometry(1.6, 3.3, 42, 8);
    stalkGeo.translate(0, 21, 0);
    const capGeo = new THREE.SphereGeometry(13.0, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.54);
    capGeo.scale(1, 0.52, 1);
    const gillGeo = new THREE.TorusGeometry(8.8, 0.85, 6, 16);
    gillGeo.rotateX(Math.PI / 2);

    const stalkMat = new THREE.MeshStandardMaterial({
      color: 0x134a52,
      roughness: 0.7,
      metalness: 0.12,
    });
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x10b981,
      emissiveIntensity: 0.58,
      roughness: 0.28,
      metalness: 0.12,
    });
    const gillMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const placements: Array<{ x: number; y: number; z: number; sx: number; sy: number; rot: number; tint: THREE.Color }> = [];
    const capPalette = [
      new THREE.Color(0x34d399),
      new THREE.Color(0x2df9f2),
      new THREE.Color(0xf472b6),
      new THREE.Color(0xa78bfa),
      new THREE.Color(0xfde047),
    ];
    for (let attempt = 0; attempt < 680 && placements.length < 120; attempt++) {
      const angle = rand() * Math.PI * 2;
      const radius = 105 + rand() * 1020;
      const x = 140 + Math.cos(angle) * radius;
      const z = 80 + Math.sin(angle) * radius;
      const { dist, halfWidth } = nearestTrackInfo(x, z);
      if (dist < halfWidth + 46) continue;
      // Keep opening launch vista & Biolume Lagoon clear of blocking giant mushrooms
      if (x > -145 && x < 145 && z > -360 && z < 80) continue;
      if (x > 330 && x < 690 && z > 160 && z < 540) continue;

      placements.push({
        x,
        y: -18,
        z,
        sx: 0.85 + rand() * 1.9,
        sy: 0.9 + rand() * 2.3,
        rot: rand() * Math.PI * 2,
        tint: capPalette[Math.floor(rand() * capPalette.length)],
      });
    }

    const stalkInst = new THREE.InstancedMesh(stalkGeo, stalkMat, placements.length);
    const capInst = new THREE.InstancedMesh(capGeo, capMat, placements.length);
    const gillInst = new THREE.InstancedMesh(gillGeo, gillMat, placements.length);
    placements.forEach((p, idx) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, p.rot, 0);
      dummy.scale.set(p.sx, p.sy, p.sx);
      dummy.updateMatrix();
      stalkInst.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(p.x, p.y + 40 * p.sy, p.z);
      dummy.scale.set(p.sx * 1.15, p.sx * 1.15, p.sx * 1.15);
      dummy.updateMatrix();
      capInst.setMatrixAt(idx, dummy.matrix);
      capInst.setColorAt(idx, p.tint);

      dummy.position.set(p.x, p.y + 39.2 * p.sy, p.z);
      dummy.scale.set(p.sx * 1.05, p.sx * 1.05, p.sx * 1.05);
      dummy.updateMatrix();
      gillInst.setMatrixAt(idx, dummy.matrix);
      gillInst.setColorAt(idx, p.tint);
    });
    stalkInst.instanceMatrix.needsUpdate = true;
    capInst.instanceMatrix.needsUpdate = true;
    gillInst.instanceMatrix.needsUpdate = true;
    if (capInst.instanceColor) capInst.instanceColor.needsUpdate = true;
    if (gillInst.instanceColor) gillInst.instanceColor.needsUpdate = true;
    stalkInst.computeBoundingSphere();
    capInst.computeBoundingSphere();
    gillInst.computeBoundingSphere();
    env.add(stalkInst, capInst, gillInst);

    // 2. Luminous Biolume Lagoon & 22 Giant Glowing Floating Lily-Pads beneath Zone 4!
    const lagoonMat = new THREE.MeshPhysicalMaterial({
      color: 0x0ea58a,
      emissive: 0x0b5e54,
      emissiveIntensity: 0.55,
      roughness: 0.12,
      metalness: 0.14,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      transparent: true,
      opacity: 0.9,
    });
    const lagoon = new THREE.Mesh(new THREE.CircleGeometry(195, 32), lagoonMat);
    lagoon.rotation.x = -Math.PI / 2;
    lagoon.scale.set(1.02, 1.18, 1);
    lagoon.position.set(495, -6.8, 360);
    env.add(lagoon);

    const mossBank = new THREE.Mesh(
      new THREE.RingGeometry(185, 224, 32),
      new THREE.MeshStandardMaterial({ color: 0x165e52, emissive: 0x0a3b34, emissiveIntensity: 0.3, roughness: 0.85 }),
    );
    mossBank.rotation.x = -Math.PI / 2;
    mossBank.scale.set(1.02, 1.18, 1);
    mossBank.position.set(495, -6.95, 360);
    env.add(mossBank);

    const lilyPadGeo = new THREE.CylinderGeometry(12.5, 11.8, 0.8, 14);
    const lotusGeo = new THREE.OctahedronGeometry(3.4, 0);
    lotusGeo.scale(1.2, 0.75, 1.2);
    const lilyMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.42,
      roughness: 0.48,
    });
    const lotusMat = new THREE.MeshBasicMaterial({ color: 0xf472b6 });
    const lilies: Array<{ x: number; z: number; s: number; rot: number }> = [];
    for (let i = 0; i < 32 && lilies.length < 22; i++) {
      const a = (i / 32) * Math.PI * 2 + rand() * 0.18;
      const r = 38 + rand() * 145;
      const lx = 495 + Math.cos(a) * r;
      const lz = 360 + Math.sin(a) * r * 1.12;
      const info = nearestTrackInfo(lx, lz);
      if (info.dist < info.halfWidth + 16) continue;
      lilies.push({ x: lx, z: lz, s: 0.65 + rand() * 1.1, rot: rand() * Math.PI * 2 });
    }
    if (lilies.length > 0) {
      const lilyInst = new THREE.InstancedMesh(lilyPadGeo, lilyMat, lilies.length);
      const lotusInst = new THREE.InstancedMesh(lotusGeo, lotusMat, lilies.length);
      lilies.forEach((l, idx) => {
        dummy.position.set(l.x, -6.2, l.z);
        dummy.rotation.set(0, l.rot, 0);
        dummy.scale.setScalar(l.s);
        dummy.updateMatrix();
        lilyInst.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(l.x, -4.6, l.z);
        dummy.scale.setScalar(l.s * 0.9);
        dummy.updateMatrix();
        lotusInst.setMatrixAt(idx, dummy.matrix);
      });
      lilyInst.instanceMatrix.needsUpdate = true;
      lotusInst.instanceMatrix.needsUpdate = true;
      lilyInst.computeBoundingSphere();
      lotusInst.computeBoundingSphere();
      env.add(lilyInst, lotusInst);
    }

    // 3. Four Giant Floating Bioluminescent Sky-Jellyfish Leviathans hovering over the canopy!
    const jellySpots = [
      { t: 0.058, side: -1, off: 48, alt: 40, col: 0xf472b6, core: 0x34d399 }, // Framed in opening vista!
      { t: 0.25, side: 1, off: 74, alt: 56, col: 0x2df9f2, core: 0xf472b6 },
      { t: 0.56, side: -1, off: 78, alt: 52, col: 0xa78bfa, core: 0x34d399 },
      { t: 0.85, side: 1, off: 68, alt: 48, col: 0x34d399, core: 0xfde047 },
    ];
    jellySpots.forEach((js, idx) => {
      const f = sampleTrackFrame(track, js.t);
      const jelly = new THREE.Group();
      const bellMat = new THREE.MeshPhysicalMaterial({
        color: js.col,
        emissive: js.col,
        emissiveIntensity: 0.85,
        roughness: 0.16,
        metalness: 0.1,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
      });
      const bell = new THREE.Mesh(
        new THREE.SphereGeometry(13.5, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
        bellMat,
      );
      bell.scale.set(1, 0.78, 1);
      jelly.add(bell);

      const coreGlow = new THREE.Mesh(
        new THREE.SphereGeometry(5.2, 12, 10),
        new THREE.MeshBasicMaterial({ color: js.core }),
      );
      coreGlow.position.y = 2.0;
      jelly.add(coreGlow);

      const rimRing = new THREE.Mesh(
        new THREE.TorusGeometry(13.2, 0.62, 8, 24),
        new THREE.MeshBasicMaterial({ color: js.core }),
      );
      rimRing.rotation.x = Math.PI / 2;
      rimRing.position.y = 0.2;
      jelly.add(rimRing);

      // 6 luminous hanging tentacles
      const tentGeo = new THREE.CylinderGeometry(0.42, 0.14, 24, 6);
      const tentMat = new THREE.MeshBasicMaterial({ color: js.col, transparent: true, opacity: 0.72 });
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const tent = new THREE.Mesh(tentGeo, tentMat);
        tent.position.set(Math.cos(a) * 6.4, -11.5, Math.sin(a) * 6.4);
        tent.rotation.z = Math.cos(a) * 0.12;
        tent.rotation.x = Math.sin(a) * 0.12;
        jelly.add(tent);
      }

      const jx = f.pos.x + f.right.x * (f.width * 0.5 + js.off) * js.side;
      const jy = f.pos.y + js.alt;
      const jz = f.pos.z + f.right.z * (f.width * 0.5 + js.off) * js.side;
      jelly.position.set(jx, jy, jz);
      env.add(jelly);
      floatingProps.push({
        mesh: jelly,
        baseY: jy,
        phase: idx * 1.7,
        bobAmp: 3.4,
        bobSpeed: 0.85 + idx * 0.12,
        rotSpeed: 0.14 * (idx % 2 === 0 ? 1 : -1),
      });
    });

    // 4. Three Ancient Overgrown Alien Monolith Shrines with Floating Rotating Emerald Obelisks!
    const shrineStoneMat = new THREE.MeshStandardMaterial({
      color: 0x16383d,
      roughness: 0.78,
      metalness: 0.18,
      flatShading: true,
    });
    const shrineObeliskMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 1.5,
      roughness: 0.18,
      metalness: 0.35,
      flatShading: true,
    });
    const shrineRingMat = new THREE.MeshBasicMaterial({ color: 0xf472b6 });
    const shrineSpots = [
      { t: 0.056, side: 1, off: 44 }, // Visible right side on opening title vista!
      { t: 0.56, side: 1, off: 56 },
      { t: 0.86, side: -1, off: 52 },
    ];
    shrineSpots.forEach((spot, idx) => {
      const f = sampleTrackFrame(track, spot.t);
      const sx = f.pos.x + f.right.x * (f.width * 0.5 + spot.off) * spot.side;
      const sz = f.pos.z + f.right.z * (f.width * 0.5 + spot.off) * spot.side;
      const sy = Math.max(-10, f.pos.y - 16);

      const shrine = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(11, 16, 18, 6), shrineStoneMat);
      base.position.y = 9;
      shrine.add(base);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(10.5, 0.65, 8, 24), shrineRingMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 18.5;
      shrine.add(ring);

      const obelisk = new THREE.Mesh(new THREE.OctahedronGeometry(7.2, 0), shrineObeliskMat);
      obelisk.scale.set(0.68, 2.2, 0.68);
      obelisk.position.y = 33;
      shrine.add(obelisk);

      floatingProps.push({
        mesh: obelisk,
        baseY: 33,
        phase: idx * 2.1,
        bobAmp: 2.2,
        bobSpeed: 1.3,
        rotSpeed: 0.65 * (idx % 2 === 0 ? 1 : -1),
      });

      shrine.position.set(sx, sy, sz);
      env.add(shrine);
    });

    // 5. Floating bobbing bioluminescent firefly spore orbs framing the jungle canopy!
    const sporeGeo = new THREE.SphereGeometry(2.6, 12, 10);
    for (let i = 0; i < 28; i++) {
      const f = sampleTrackFrame(track, (i + 0.35) / 28);
      const side = i % 2 === 0 ? -1 : 1;
      const off = f.width * 0.5 + 16 + rand() * 26;
      const colHex = i % 4 === 0 ? 0x34d399 : i % 4 === 1 ? 0xf472b6 : i % 4 === 2 ? 0x2df9f2 : 0xfde047;
      const sporeMat = new THREE.MeshBasicMaterial({
        color: colHex,
        transparent: true,
        opacity: 0.82,
      });
      const spore = new THREE.Mesh(sporeGeo, sporeMat);
      const baseY = f.pos.y + 10 + rand() * 20;
      spore.position.set(f.pos.x + f.right.x * off * side, baseY, f.pos.z + f.right.z * off * side);
      env.add(spore);
      floatingProps.push({
        mesh: spore,
        baseY,
        phase: i * 0.9,
        bobAmp: 2.4,
        bobSpeed: 1.4 + (i % 3) * 0.3,
        rotSpeed: 0.4,
      });
    }
  } else if (biome === 'cybercity') {
    // Towering illuminated sci-fi skyscrapers with glowing window facades & neon rooftop crowns!
    const bldgGeo = new THREE.BoxGeometry(26, 130, 26);
    bldgGeo.translate(0, 65, 0);
    const bldgTex = createSkyscraperTexture(maxAnisotropy);
    const bldgMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: bldgTex,
      emissive: 0x38bdf8,
      emissiveMap: bldgTex,
      emissiveIntensity: 0.52,
      roughness: 0.34,
      metalness: 0.65,
    });
    const roofCapGeo = new THREE.BoxGeometry(27.5, 2.2, 27.5);
    const roofCapMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const towers: Array<{ x: number; z: number; sx: number; sy: number; sz: number; rot: number; neon: THREE.Color }> = [];
    const neonCols = [new THREE.Color(0xec4899), new THREE.Color(0x2df9f2), new THREE.Color(0xfbbf24), new THREE.Color(0xa855f7)];
    for (let attempt = 0; attempt < 480 && towers.length < 110; attempt++) {
      const angle = rand() * Math.PI * 2;
      const radius = 64 + rand() * 680;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const { dist, halfWidth } = nearestTrackInfo(x, z);
      if (dist < halfWidth + 32) continue;
      towers.push({
        x,
        z,
        sx: 0.72 + rand() * 1.45,
        sy: 0.6 + rand() * 1.75,
        sz: 0.72 + rand() * 1.45,
        rot: Math.floor(rand() * 4) * (Math.PI / 2),
        neon: neonCols[Math.floor(rand() * neonCols.length)],
      });
    }

    const bldgInst = new THREE.InstancedMesh(bldgGeo, bldgMat, towers.length);
    const roofInst = new THREE.InstancedMesh(roofCapGeo, roofCapMat, towers.length);
    towers.forEach((tw, idx) => {
      dummy.position.set(tw.x, -28, tw.z);
      dummy.rotation.set(0, tw.rot, 0);
      dummy.scale.set(tw.sx, tw.sy, tw.sz);
      dummy.updateMatrix();
      bldgInst.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(tw.x, -28 + 130 * tw.sy, tw.z);
      dummy.scale.set(tw.sx, 1, tw.sz);
      dummy.updateMatrix();
      roofInst.setMatrixAt(idx, dummy.matrix);
      roofInst.setColorAt(idx, tw.neon);
    });
    bldgInst.instanceMatrix.needsUpdate = true;
    roofInst.instanceMatrix.needsUpdate = true;
    if (roofInst.instanceColor) roofInst.instanceColor.needsUpdate = true;
    env.add(bldgInst, roofInst);

    // Monumental Holographic Sky-Billboard Arches straddling the Neon Expressway!
    const billTs = [0.14, 0.36, 0.62, 0.84];
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e2238, roughness: 0.4, metalness: 0.8 });
    billTs.forEach((bt, idx) => {
      const f = sampleTrackFrame(track, bt);
      const halfW = f.width * 0.5 + 4.5;
      const arch = new THREE.Group();
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(2.4, 24, 2.4), frameMat);
        leg.position.set(side * halfW, 11, 0);
        arch.add(leg);
      }
      const holoCol = idx % 2 === 0 ? 0xec4899 : 0x2df9f2;
      const signMat = new THREE.MeshBasicMaterial({
        color: holoCol,
        transparent: true,
        opacity: 0.52,
        side: THREE.DoubleSide,
      });
      const signBoard = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 1.9, 6.2), signMat);
      signBoard.position.set(0, 21.5, 0);
      arch.add(signBoard);
      const trimBar = new THREE.Mesh(
        new THREE.BoxGeometry(halfW * 2 + 3, 1.0, 2.6),
        new THREE.MeshBasicMaterial({ color: idx % 2 === 0 ? 0x2df9f2 : 0xfbbf24 }),
      );
      trimBar.position.set(0, 17.6, 0);
      arch.add(trimBar);

      const basis = new THREE.Matrix4().makeBasis(
        new THREE.Vector3(f.right.x, f.right.y, f.right.z),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(-f.tangent.x, -f.tangent.y, -f.tangent.z),
      );
      arch.quaternion.setFromRotationMatrix(basis);
      arch.position.set(f.pos.x, f.pos.y, f.pos.z);
      env.add(arch);
    });
  } else if (biome === 'nebula') {
    // LEVEL 4 · NEBULA RIDGE: Deep-Space Cosmic Overpass Scenario!
    // 1. Colossal Ringed Gas-Giant Planet + Twin Crescent Moons framed directly behind the 64m Figure-8 Overpass!
    const planetCanvas = document.createElement('canvas');
    planetCanvas.width = 512;
    planetCanvas.height = 256;
    const pCtx = planetCanvas.getContext('2d')!;
    const pGrad = pCtx.createLinearGradient(0, 0, 0, 256);
    pGrad.addColorStop(0.0, '#1e1b4b');
    pGrad.addColorStop(0.18, '#581c87');
    pGrad.addColorStop(0.36, '#c026d3');
    pGrad.addColorStop(0.5, '#f59e0b');
    pGrad.addColorStop(0.64, '#a21caf');
    pGrad.addColorStop(0.82, '#3b0764');
    pGrad.addColorStop(1.0, '#0f172a');
    pCtx.fillStyle = pGrad;
    pCtx.fillRect(0, 0, 512, 256);
    // Atmospheric cloud storm bands
    for (let b = 0; b < 14; b++) {
      pCtx.fillStyle =
        b % 3 === 0
          ? 'rgba(253, 224, 71, 0.22)'
          : b % 3 === 1
          ? 'rgba(56, 189, 248, 0.24)'
          : 'rgba(244, 114, 182, 0.22)';
      pCtx.fillRect(0, 14 + b * 17, 512, 5 + (b % 3) * 3);
    }
    const planetTex = new THREE.CanvasTexture(planetCanvas);
    planetTex.colorSpace = THREE.SRGBColorSpace;
    planetTex.anisotropy = maxAnisotropy;

    const planetGroup = new THREE.Group();
    planetGroup.position.set(115, 205, -860);
    const gasGiant = new THREE.Mesh(
      new THREE.SphereGeometry(142, 32, 24),
      new THREE.MeshBasicMaterial({ map: planetTex, fog: false }),
    );
    planetGroup.add(gasGiant);

    // Translucent layered golden-violet planetary ring system
    const ringCanvas = document.createElement('canvas');
    ringCanvas.width = 256;
    ringCanvas.height = 32;
    const rCtx = ringCanvas.getContext('2d')!;
    const rGrad = rCtx.createLinearGradient(0, 0, 256, 0);
    rGrad.addColorStop(0.0, 'rgba(192, 132, 252, 0.0)');
    rGrad.addColorStop(0.18, 'rgba(232, 121, 249, 0.62)');
    rGrad.addColorStop(0.42, 'rgba(253, 224, 71, 0.78)');
    rGrad.addColorStop(0.56, 'rgba(56, 189, 248, 0.28)');
    rGrad.addColorStop(0.76, 'rgba(192, 132, 252, 0.68)');
    rGrad.addColorStop(1.0, 'rgba(168, 85, 247, 0.0)');
    rCtx.fillStyle = rGrad;
    rCtx.fillRect(0, 0, 256, 32);
    const ringTex = new THREE.CanvasTexture(ringCanvas);
    ringTex.colorSpace = THREE.SRGBColorSpace;

    const planetRing = new THREE.Mesh(
      new THREE.RingGeometry(182, 310, 64),
      new THREE.MeshBasicMaterial({
        map: ringTex,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
      }),
    );
    planetRing.rotation.x = Math.PI * 0.42;
    planetRing.rotation.y = 0.26;
    planetGroup.add(planetRing);

    // Twin Crescent Moons flanking the Gas Giant
    const moonA = new THREE.Mesh(
      new THREE.SphereGeometry(28, 18, 14),
      new THREE.MeshBasicMaterial({ color: 0xbae6fd, fog: false }),
    );
    moonA.position.set(-245, 72, 65);
    planetGroup.add(moonA);

    const moonB = new THREE.Mesh(
      new THREE.SphereGeometry(18, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xfde68a, fog: false }),
    );
    moonB.position.set(220, -45, 110);
    planetGroup.add(moonB);
    env.add(planetGroup);

    // 2. 3 Sweeping Iridescent Nebula Cloud Ribbons arching high across the cosmic sky dome
    const nebCanvas = document.createElement('canvas');
    nebCanvas.width = 512;
    nebCanvas.height = 128;
    const nCtx = nebCanvas.getContext('2d')!;
    const nGrad = nCtx.createLinearGradient(0, 0, 0, 128);
    nGrad.addColorStop(0.0, 'rgba(168, 85, 247, 0.0)');
    nGrad.addColorStop(0.32, 'rgba(232, 121, 249, 0.42)');
    nGrad.addColorStop(0.54, 'rgba(56, 189, 248, 0.46)');
    nGrad.addColorStop(0.76, 'rgba(244, 114, 182, 0.34)');
    nGrad.addColorStop(1.0, 'rgba(15, 23, 42, 0.0)');
    nCtx.fillStyle = nGrad;
    nCtx.fillRect(0, 0, 512, 128);
    const nebTex = new THREE.CanvasTexture(nebCanvas);
    nebTex.colorSpace = THREE.SRGBColorSpace;
    nebTex.wrapS = THREE.RepeatWrapping;
    nebTex.repeat.set(3, 1);

    const ribbonConfigs = [
      { radius: 960, height: 220, y: 270, tiltX: 0.14, tiltZ: -0.18, opacity: 0.56 },
      { radius: 1080, height: 190, y: 340, tiltX: -0.11, tiltZ: 0.22, opacity: 0.44 },
      { radius: 860, height: 160, y: 215, tiltX: 0.08, tiltZ: 0.12, opacity: 0.38 },
    ];
    for (const rc of ribbonConfigs) {
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(rc.radius, rc.radius, rc.height, 44, 1, true),
        new THREE.MeshBasicMaterial({
          map: nebTex,
          transparent: true,
          opacity: rc.opacity,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
          depthWrite: false,
          fog: false,
        }),
      );
      band.position.y = rc.y;
      band.rotation.set(rc.tiltX, 0, rc.tiltZ);
      env.add(band);
    }

    // 3. Twinkling 3D Cosmic Starfield Halo (180 crisp stars overhead, fog: false)
    const starGeo = new THREE.OctahedronGeometry(2.4, 0);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
    const starCount = 180;
    const starInst = new THREE.InstancedMesh(starGeo, starMat, starCount);
    const starPalette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xbae6fd),
      new THREE.Color(0xfde68a),
      new THREE.Color(0xf5d0fe),
    ];
    for (let i = 0; i < starCount; i++) {
      const theta = rand() * Math.PI * 2;
      const elev = 0.22 + rand() * 0.92;
      const dist = 780 + rand() * 440;
      dummy.position.set(
        Math.cos(theta) * Math.cos(elev) * dist,
        140 + Math.sin(elev) * dist * 0.65,
        Math.sin(theta) * Math.cos(elev) * dist,
      );
      dummy.rotation.set(rand() * Math.PI, rand() * Math.PI, 0);
      dummy.scale.setScalar(0.55 + rand() * 1.4);
      dummy.updateMatrix();
      starInst.setMatrixAt(i, dummy.matrix);
      starInst.setColorAt(i, starPalette[i % starPalette.length]);
    }
    starInst.instanceMatrix.needsUpdate = true;
    if (starInst.instanceColor) starInst.instanceColor.needsUpdate = true;
    starInst.computeBoundingSphere();
    env.add(starInst);

    // 4. 110 Multi-Faceted Floating Asteroid Islands (dark basalt-amethyst crags + glowing violet crystal undersides!)
    const astRockGeo = new THREE.DodecahedronGeometry(11.5, 0);
    const astRockMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.72,
      metalness: 0.22,
      flatShading: true,
    });
    const astCrystalGeo = new THREE.ConeGeometry(4.4, 14.5, 5);
    astCrystalGeo.rotateX(Math.PI);
    astCrystalGeo.translate(0, -10.5, 0);
    const astCrystalMat = new THREE.MeshStandardMaterial({
      color: 0xd8b4fe,
      emissive: 0x9333ea,
      emissiveIntensity: 0.95,
      roughness: 0.22,
      metalness: 0.55,
      flatShading: true,
    });

    const astTransforms: Array<{
      x: number;
      y: number;
      z: number;
      sx: number;
      sy: number;
      sz: number;
      rx: number;
      ry: number;
      tint: THREE.Color;
    }> = [];
    const astBase = new THREE.Color('#3b2247');
    const astAccent = new THREE.Color('#5b2e68');
    const astSlate = new THREE.Color('#271c3d');

    for (let attempt = 0; attempt < 560 && astTransforms.length < 110; attempt++) {
      const angle = rand() * Math.PI * 2;
      const radius = 85 + rand() * 820;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      // Keep the iconic Title Screen launch straight & 64m Figure-8 Overpass corridor completely clear!
      if (Math.abs(x) < 175 && z > -385 && z < 165) continue;
      const { dist, halfWidth } = nearestTrackInfo(x, z);
      if (dist < halfWidth + 36) continue;

      const sx = 0.85 + rand() * 2.1;
      const sy = 0.65 + rand() * 1.45;
      const sz = 0.85 + rand() * 2.1;
      const y = 8 + rand() * 98;
      const tint = astBase.clone().lerp(rand() > 0.5 ? astAccent : astSlate, rand() * 0.85);
      astTransforms.push({
        x,
        y,
        z,
        sx,
        sy,
        sz,
        rx: (rand() - 0.5) * 0.45,
        ry: rand() * Math.PI * 2,
        tint,
      });
    }

    const astRockInst = new THREE.InstancedMesh(astRockGeo, astRockMat, astTransforms.length);
    const astCrystalInst = new THREE.InstancedMesh(astCrystalGeo, astCrystalMat, astTransforms.length);
    astTransforms.forEach((at, idx) => {
      dummy.position.set(at.x, at.y, at.z);
      dummy.rotation.set(at.rx, at.ry, 0);
      dummy.scale.set(at.sx, at.sy, at.sz);
      dummy.updateMatrix();
      astRockInst.setMatrixAt(idx, dummy.matrix);
      astRockInst.setColorAt(idx, at.tint);
      astCrystalInst.setMatrixAt(idx, dummy.matrix);
    });
    astRockInst.instanceMatrix.needsUpdate = true;
    if (astRockInst.instanceColor) astRockInst.instanceColor.needsUpdate = true;
    astRockInst.computeBoundingSphere();
    astCrystalInst.instanceMatrix.needsUpdate = true;
    astCrystalInst.computeBoundingSphere();
    env.add(astRockInst, astCrystalInst);

    // 5. 4 Deep-Space Observatory / Solar-Array Relay Satellites hovering beside major zones!
    const satHullMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.28,
      metalness: 0.78,
    });
    const satSolarMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.55,
      roughness: 0.22,
      metalness: 0.85,
    });
    const satBeaconMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const satSpots = [
      { t: 0.20, side: 1, off: 64, elev: 44 },
      { t: 0.36, side: -1, off: 62, elev: 48 },
      { t: 0.60, side: 1, off: 66, elev: 42 },
      { t: 0.83, side: -1, off: 68, elev: 38 },
    ];
    satSpots.forEach((sp, idx) => {
      const f = sampleTrackFrame(track, sp.t);
      const sat = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.2, 12.5, 10), satHullMat);
      sat.add(body);
      const dish = new THREE.Mesh(
        new THREE.ConeGeometry(6.8, 3.2, 14, 1, true),
        satHullMat,
      );
      dish.rotation.x = Math.PI * 0.72;
      dish.position.set(0, 7.5, 2.2);
      sat.add(dish);
      const wingGeo = new THREE.BoxGeometry(26, 0.5, 6.2);
      const wingL = new THREE.Mesh(wingGeo, satSolarMat);
      wingL.position.set(-16.5, 0, 0);
      const wingR = new THREE.Mesh(wingGeo, satSolarMat);
      wingR.position.set(16.5, 0, 0);
      sat.add(wingL, wingR);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 8), satBeaconMat);
      beacon.position.y = -7.8;
      sat.add(beacon);

      const baseY = f.pos.y + sp.elev;
      sat.position.set(
        f.pos.x + f.right.x * (f.width * 0.5 + sp.off) * sp.side,
        baseY,
        f.pos.z + f.right.z * (f.width * 0.5 + sp.off) * sp.side,
      );
      env.add(sat);
      floatingProps.push({
        mesh: sat,
        baseY,
        phase: idx * 1.6,
        bobAmp: 3.4,
        bobSpeed: 0.8 + idx * 0.15,
        rotSpeed: 0.28 * (idx % 2 === 0 ? 1 : -1),
      });
    });

    // 6. 24 Floating Luminous Star-Dust Crystal Shards lining the cosmic highway
    const shardGeo = new THREE.OctahedronGeometry(5.6, 0);
    const shardRingGeo = new THREE.TorusGeometry(7.8, 0.34, 8, 22);
    for (let i = 0; i < 24; i++) {
      const t = (i + 0.35) / 24;
      const f = sampleTrackFrame(track, t);
      const side = i % 2 === 0 ? -1 : 1;
      const off = f.width * 0.5 + 24 + (i % 4) * 12;
      const shardGroup = new THREE.Group();
      const sCol = i % 3 === 0 ? 0xe879f9 : i % 3 === 1 ? 0x38bdf8 : 0xfbbf24;
      const core = new THREE.Mesh(
        shardGeo,
        new THREE.MeshStandardMaterial({
          color: sCol,
          emissive: sCol,
          emissiveIntensity: 0.85,
          roughness: 0.2,
          metalness: 0.72,
          flatShading: true,
        }),
      );
      core.scale.set(0.85, 1.65, 0.85);
      shardGroup.add(core);
      if (i % 3 === 0) {
        const halo = new THREE.Mesh(
          shardRingGeo,
          new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.75 }),
        );
        halo.rotation.x = Math.PI / 3;
        shardGroup.add(halo);
      }
      const baseY = f.pos.y + 12 + (i % 5) * 6.5;
      shardGroup.position.set(
        f.pos.x + f.right.x * off * side,
        baseY,
        f.pos.z + f.right.z * off * side,
      );
      env.add(shardGroup);
      floatingProps.push({
        mesh: shardGroup,
        baseY,
        phase: i * 0.9,
        bobAmp: 2.6,
        bobSpeed: 1.05 + (i % 3) * 0.22,
        rotSpeed: 0.6 * (i % 2 === 0 ? 1 : -1),
      });
    }
  } else {
    // Classic + Quantum sculpted instanced monoliths / basalt peaks / sky pillars
    const spireGeo =
      biome === 'volcano'
        ? new THREE.CylinderGeometry(2.4, 11.5, 58, 6)
        : biome === 'aether'
        ? new THREE.CylinderGeometry(3.8, 5.2, 80, 8)
        : biome === 'quantum'
        ? new THREE.OctahedronGeometry(14, 0)
        : new THREE.CylinderGeometry(4.2, 11.2, 46, 7);
    if (biome !== 'quantum') {
      spireGeo.translate(0, biome === 'aether' ? 40 : 26, 0);
    }

    const spireMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: biome === 'quantum' ? 0.22 : biome === 'aether' ? 0.36 : 0.86,
      metalness: biome === 'quantum' ? 0.65 : biome === 'aether' ? 0.52 : 0.08,
      flatShading: biome !== 'aether',
      emissive: biome === 'quantum' ? new THREE.Color(0x4c1d95) : new THREE.Color(0x000000),
      emissiveIntensity: biome === 'quantum' ? 0.45 : 0,
    });

    const spireTransforms: Array<{
      x: number;
      y: number;
      z: number;
      sx: number;
      sy: number;
      sz: number;
      rot: number;
      tint: THREE.Color;
    }> = [];

    const baseRock = new THREE.Color(
      biome === 'volcano'
        ? '#2d2026'
        : biome === 'aether'
        ? '#dce8f8'
        : biome === 'quantum'
        ? '#4c1d95'
        : track.def.terrainPrimary,
    );
    const accentRock = new THREE.Color(
      biome === 'volcano'
        ? '#5c261c'
        : biome === 'aether'
        ? '#fcd34d'
        : biome === 'quantum'
        ? '#2df9f2'
        : track.def.terrainAccent,
    );
    const sunlitRock = new THREE.Color(
      biome === 'volcano'
        ? '#ff6b2b'
        : biome === 'aether'
        ? '#ffffff'
        : biome === 'quantum'
        ? '#fbbf24'
        : '#d98a5b',
    );

    for (let attempt = 0; attempt < 420 && spireTransforms.length < 104; attempt++) {
      const angle = rand() * Math.PI * 2;
      const radius = 72 + rand() * 680;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const { dist, halfWidth } = nearestTrackInfo(x, z);
      if (dist < halfWidth + 32) continue;

      const sx = biome === 'aether' ? 0.8 + rand() * 1.2 : 0.9 + rand() * 2.2;
      const sy = biome === 'quantum' ? 1.4 + rand() * 2.6 : 0.8 + rand() * 2.4;
      const sz = biome === 'aether' ? 0.8 + rand() * 1.2 : 0.9 + rand() * 2.2;
      const tint = baseRock
        .clone()
        .lerp(rand() > 0.55 ? sunlitRock : accentRock, rand() * (biome === 'volcano' ? 0.42 : 0.7));

      spireTransforms.push({
        x,
        y: biome === 'quantum' ? 12 + rand() * 54 : biome === 'aether' ? -34 : -16,
        z,
        sx,
        sy,
        sz,
        rot: rand() * Math.PI * 2,
        tint,
      });
    }

    const spireInst = new THREE.InstancedMesh(spireGeo, spireMat, spireTransforms.length);
    spireTransforms.forEach((st, idx) => {
      dummy.position.set(st.x, st.y, st.z);
      dummy.rotation.set(0, st.rot, 0);
      dummy.scale.set(st.sx, st.sy, st.sz);
      dummy.updateMatrix();
      spireInst.setMatrixAt(idx, dummy.matrix);
      spireInst.setColorAt(idx, st.tint);
    });
    spireInst.instanceMatrix.needsUpdate = true;
    if (spireInst.instanceColor) spireInst.instanceColor.needsUpdate = true;
    spireInst.computeBoundingSphere();
    env.add(spireInst);

    // Colossal floating rotating Quantum Prism crystals
    if (biome === 'quantum') {
      const crystalGeo = new THREE.OctahedronGeometry(7.5, 0);
      const ringGeo = new THREE.TorusGeometry(10.5, 0.48, 8, 24);
      const count = 16;
      for (let i = 0; i < count; i++) {
        const f = sampleTrackFrame(track, (i + 0.5) / count);
        const side = i % 2 === 0 ? -1 : 1;
        const off = f.width * 0.5 + 24 + rand() * 34;
        const cluster = new THREE.Group();
        const core = new THREE.Mesh(
          crystalGeo,
          new THREE.MeshStandardMaterial({
            color: i % 2 === 0 ? 0xfbbf24 : 0x2df9f2,
            emissive: i % 2 === 0 ? 0xd97706 : 0x06b6d4,
            emissiveIntensity: 0.72,
            roughness: 0.2,
            metalness: 0.75,
            flatShading: true,
          }),
        );
        core.scale.set(1, 1.5, 1);
        cluster.add(core);
        const halo = new THREE.Mesh(
          ringGeo,
          new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xc084fc : 0xfbbf24 }),
        );
        halo.rotation.x = Math.PI / 3;
        cluster.add(halo);
        const baseY = f.pos.y + 14 + rand() * 24;
        cluster.position.set(f.pos.x + f.right.x * off * side, baseY, f.pos.z + f.right.z * off * side);
        env.add(cluster);
        floatingProps.push({
          mesh: cluster,
          baseY,
          phase: i * 1.1,
          bobAmp: 2.8,
          bobSpeed: 1.1 + (i % 3) * 0.25,
          rotSpeed: 0.55 * (i % 2 === 0 ? 1 : -1),
        });
      }
    }
  }

  // Monumental biome spanning arches OR rotating orbital skyway ring gates!
  if (biome === 'aether' || biome === 'nebula' || biome === 'quantum') {
    const gateTs =
      biome === 'quantum'
        ? [0.16, 0.42, 0.66, 0.88]
        : biome === 'aether'
        ? [0.16, 0.48, 0.78]
        : [0.13, 0.455, 0.78];
    const outerRingMat = new THREE.MeshStandardMaterial({
      color: biome === 'aether' || biome === 'quantum' ? 0xfbbf24 : 0xc084fc,
      emissive: biome === 'aether' || biome === 'quantum' ? 0xd97706 : 0x7e22ce,
      emissiveIntensity: 0.78,
      roughness: 0.22,
      metalness: 0.85,
    });
    const innerRingMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x2df9f2,
      emissiveIntensity: 1.6,
      roughness: 0.18,
      metalness: 0.4,
    });

    for (const gateT of gateTs) {
      const f = sampleTrackFrame(track, gateT);
      const gateRoot = new THREE.Group();
      const radius = f.width * 0.68 + 6.0;

      const spinGroup = new THREE.Group();
      const outerTorus = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 1.45, 8, 32),
        outerRingMat,
      );
      const innerTorus = new THREE.Mesh(
        new THREE.TorusGeometry(radius - 2.2, 0.45, 8, 32),
        innerRingMat,
      );
      spinGroup.add(outerTorus, innerTorus);

      const finGeo = new THREE.BoxGeometry(1.7, 5.8, 1.5);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const fin = new THREE.Mesh(finGeo, outerRingMat);
        fin.position.set(Math.cos(a) * (radius + 2.4), Math.sin(a) * (radius + 2.4), 0);
        fin.rotation.z = a + Math.PI / 2;
        spinGroup.add(fin);
      }

      spinGroup.position.y = 4.2;
      gateRoot.add(spinGroup);
      rotatingGates.push(spinGroup);

      const basis = new THREE.Matrix4().makeBasis(
        new THREE.Vector3(f.right.x, f.right.y, f.right.z),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(-f.tangent.x, -f.tangent.y, -f.tangent.z),
      );
      gateRoot.quaternion.setFromRotationMatrix(basis);
      gateRoot.position.set(f.pos.x, f.pos.y, f.pos.z);
      env.add(gateRoot);
    }
  } else if (biome !== 'cybercity') {
    const archTs =
      biome === 'canyon'
        ? [0.068, 0.395, 0.675, 0.875]
        : biome === 'glacier'
        ? [0.072, 0.365, 0.635, 0.870]
        : biome === 'biolume'
        ? [0.068, 0.365, 0.625, 0.875]
        : [0.16, 0.62];
    const archMat = new THREE.MeshStandardMaterial({
      color:
        biome === 'glacier'
          ? 0x7dd3fc
          : biome === 'biolume'
          ? 0x115e59
          : biome === 'volcano'
          ? 0x2b1d22
          : track.def.terrainPrimary,
      roughness: biome === 'glacier' ? 0.2 : 0.84,
      metalness: biome === 'glacier' ? 0.32 : 0.08,
      flatShading: true,
    });
    const rimMat =
      biome === 'volcano'
        ? new THREE.MeshBasicMaterial({ color: 0xff6b2b })
        : biome === 'biolume'
        ? new THREE.MeshBasicMaterial({ color: 0x34d399 })
        : biome === 'glacier'
        ? new THREE.MeshBasicMaterial({ color: 0x7efcf7 })
        : biome === 'canyon'
        ? new THREE.MeshBasicMaterial({ color: 0xffd166 })
        : null;

    for (const archT of archTs) {
      const f = sampleTrackFrame(track, archT);
      const archGroup = new THREE.Group();
      const archRad = f.width * 0.84;
      const archTorus = new THREE.Mesh(
        new THREE.TorusGeometry(archRad, 4.0, 7, 18, Math.PI),
        archMat,
      );
      archTorus.position.y = -3.0;
      archTorus.scale.set(1.15, 1.32, 1.25);
      archGroup.add(archTorus);

      if (rimMat) {
        const glowRim = new THREE.Mesh(
          new THREE.TorusGeometry(archRad - 2.8, 0.56, 6, 18, Math.PI),
          rimMat,
        );
        glowRim.position.y = -3.0;
        glowRim.scale.set(1.15, 1.32, 1.25);
        archGroup.add(glowRim);
      }

      const basis = new THREE.Matrix4().makeBasis(
        new THREE.Vector3(f.right.x, f.right.y, f.right.z),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(-f.tangent.x, -f.tangent.y, -f.tangent.z),
      );
      archGroup.quaternion.setFromRotationMatrix(basis);
      archGroup.position.set(f.pos.x, f.pos.y, f.pos.z);
      env.add(archGroup);
    }
  }

  // Instanced trackside holographic corner-marker beacons aligned to live variable road widths
  const beaconCount = 56;
  const beaconGeo = new THREE.OctahedronGeometry(0.98, 0);
  const beaconColor =
    biome === 'glacier'
      ? { color: 0x7efcf7, emissive: 0x0ea5e9 }
      : biome === 'biolume'
      ? { color: 0x34d399, emissive: 0x10b981 }
      : biome === 'volcano'
      ? { color: 0xff9f1c, emissive: 0xff4500 }
      : biome === 'cybercity'
      ? { color: 0xf472b6, emissive: 0xec4899 }
      : biome === 'aether' || biome === 'quantum'
      ? { color: 0xfde047, emissive: 0xf59e0b }
      : { color: 0xffd166, emissive: 0xff9f1c };

  const beaconMat = new THREE.MeshStandardMaterial({
    color: beaconColor.color,
    emissive: beaconColor.emissive,
    emissiveIntensity: 1.45,
    roughness: 0.25,
    metalness: 0.4,
  });
  const beacons = new THREE.InstancedMesh(beaconGeo, beaconMat, beaconCount);
  for (let i = 0; i < beaconCount; i++) {
    const t = i / beaconCount;
    const f = sampleTrackFrame(track, t);
    const halfW = f.width * 0.5 + 1.8;
    const side = i % 2 === 0 ? -1 : 1;
    dummy.position.set(
      f.pos.x + f.right.x * halfW * side + f.up.x * 3.8,
      f.pos.y + f.right.y * halfW * side + f.up.y * 3.8,
      f.pos.z + f.right.z * halfW * side + f.up.z * 3.8,
    );
    dummy.rotation.set(0, Math.atan2(f.tangent.x, f.tangent.z), 0);
    dummy.scale.set(0.75, 1.45, 0.75);
    dummy.updateMatrix();
    beacons.setMatrixAt(i, dummy.matrix);
  }
  beacons.instanceMatrix.needsUpdate = true;
  beacons.computeBoundingSphere();
  env.add(beacons);

  return { group: env, rotatingGates, floatingProps };
}

export function buildBoostPads(track: BakedTrack, maxAnisotropy: number): THREE.Group {
  const group = new THREE.Group();
  const tex = createBoostPadTexture(maxAnisotropy);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  for (const pad of track.def.boostPads) {
    const { pos, frame } = trackToWorld(track, pad.t, pad.lateral, 0.06);
    const geo = new THREE.PlaneGeometry(pad.width, pad.length);
    const mesh = new THREE.Mesh(geo, mat);

    const basis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(frame.right.x, frame.right.y, frame.right.z),
      new THREE.Vector3(frame.up.x, frame.up.y, frame.up.z),
      new THREE.Vector3(-frame.tangent.x, -frame.tangent.y, -frame.tangent.z),
    );
    mesh.quaternion.setFromRotationMatrix(basis);
    mesh.rotateX(-Math.PI / 2);
    mesh.position.set(pos.x, pos.y, pos.z);
    mesh.renderOrder = 1;
    group.add(mesh);
  }
  return group;
}

function createJumpRampTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 512, 0, 0);
  grad.addColorStop(0, '#10203a');
  grad.addColorStop(0.55, '#193b5e');
  grad.addColorStop(1, '#3b2c12');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 512);

  // Glowing upward launch chevrons transitioning cyan -> solar gold at the lip
  for (let i = 0; i < 4; i++) {
    const baseY = 48 + i * 116;
    ctx.beginPath();
    ctx.moveTo(24, baseY + 64);
    ctx.lineTo(128, baseY);
    ctx.lineTo(232, baseY + 64);
    ctx.lineTo(232, baseY + 96);
    ctx.lineTo(128, baseY + 34);
    ctx.lineTo(24, baseY + 96);
    ctx.closePath();
    ctx.fillStyle = i < 2 ? '#ffd166' : '#2df9f2';
    ctx.fill();
  }

  // Bright gold launch lip bar at top edge (forward end of ramp)
  ctx.fillStyle = '#fff3b0';
  ctx.fillRect(0, 0, 256, 22);

  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 246, 502);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Builds angled 3D holographic Jump Launch Ramps with glowing launch deck,
 * structural wedge hull, twin neon side rails, and bright crest lip.
 */
export function buildJumpRamps(track: BakedTrack, maxAnisotropy: number): THREE.Group {
  const group = new THREE.Group();
  if (!track.def.jumpRamps.length) return group;

  const deckTex = createJumpRampTexture(maxAnisotropy);
  const deckMat = new THREE.MeshBasicMaterial({
    map: deckTex,
    side: THREE.DoubleSide,
  });
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x1e2538,
    roughness: 0.45,
    metalness: 0.72,
  });
  const railMat = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    emissive: 0xff9f1c,
    emissiveIntensity: 1.5,
    roughness: 0.22,
    metalness: 0.4,
  });
  const lipMat = new THREE.MeshStandardMaterial({
    color: 0x7efcf7,
    emissive: 0x2df9f2,
    emissiveIntensity: 1.8,
    roughness: 0.18,
    metalness: 0.25,
  });

  for (const ramp of track.def.jumpRamps) {
    const { pos, frame } = trackToWorld(track, ramp.t, ramp.lateral, 0.05);
    const rGroup = new THREE.Group();

    const len = ramp.length;
    const halfLen = len * 0.5;
    const width = ramp.width;
    const height = 2.25;
    const slopeLen = Math.hypot(len, height);
    const slopeAngle = Math.atan2(height, len);

    // Structural prism wedge: entry at +Z (rear, y=0) rising toward -Z (forward along +tangent, y=height)
    const wedgeShape = new THREE.Shape();
    wedgeShape.moveTo(-halfLen, 0);
    wedgeShape.lineTo(halfLen, 0);
    wedgeShape.lineTo(halfLen, height);
    wedgeShape.closePath();

    const wedgeGeo = new THREE.ExtrudeGeometry(wedgeShape, {
      depth: width - 0.35,
      bevelEnabled: false,
    });
    wedgeGeo.translate(0, 0, -(width - 0.35) * 0.5);
    // Rotate +X -> -Z so x=+halfLen maps to z=-halfLen (forward high lip!)
    wedgeGeo.rotateY(Math.PI / 2);
    const wedgeMesh = new THREE.Mesh(wedgeGeo, hullMat);
    rGroup.add(wedgeMesh);

    // Glowing sloped chevron launch surface flush above the wedge hypotenuse
    const topGeo = new THREE.PlaneGeometry(width, slopeLen);
    const topMesh = new THREE.Mesh(topGeo, deckMat);
    topMesh.rotation.x = -Math.PI / 2 + slopeAngle;
    topMesh.position.set(0, height * 0.5 + 0.06, 0);
    rGroup.add(topMesh);

    // Twin neon side guide rails climbing the ramp edges
    const railGeo = new THREE.BoxGeometry(0.32, 0.42, slopeLen);
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.rotation.x = slopeAngle;
      rail.position.set(side * (width * 0.5 + 0.12), height * 0.5 + 0.24, 0);
      rGroup.add(rail);
    }

    // Glowing cyan launch crest bar at the forward lip (z = -halfLen)
    const lipBar = new THREE.Mesh(new THREE.BoxGeometry(width + 0.45, 0.28, 0.34), lipMat);
    lipBar.position.set(0, height + 0.08, -halfLen);
    rGroup.add(lipBar);

    const basis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(frame.right.x, frame.right.y, frame.right.z),
      new THREE.Vector3(frame.up.x, frame.up.y, frame.up.z),
      new THREE.Vector3(-frame.tangent.x, -frame.tangent.y, -frame.tangent.z),
    );
    rGroup.quaternion.setFromRotationMatrix(basis);
    rGroup.position.set(pos.x, pos.y, pos.z);
    group.add(rGroup);
  }

  return group;
}

export function buildEnergyRings(track: BakedTrack): {
  group: THREE.Group;
  visuals: RingVisual[];
} {
  const group = new THREE.Group();
  const visuals: RingVisual[] = [];

  const outerGeo = new THREE.TorusGeometry(2.15, 0.26, 10, 26);
  const innerGeo = new THREE.OctahedronGeometry(0.68, 0);

  const goldRingMat = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    emissive: 0xffa61c,
    emissiveIntensity: 1.35,
    roughness: 0.18,
    metalness: 0.78,
  });
  const elevatedRingMat = new THREE.MeshStandardMaterial({
    color: 0x3bf7ef,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.5,
    roughness: 0.16,
    metalness: 0.82,
  });
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  for (const ring of track.def.rings) {
    const { pos, frame } = trackToWorld(track, ring.t, ring.lateral, ring.heightOffset);
    const rGroup = new THREE.Group();

    const torus = new THREE.Mesh(outerGeo, ring.elevated ? elevatedRingMat : goldRingMat);
    const core = new THREE.Mesh(innerGeo, coreMat);
    rGroup.add(torus, core);

    const basis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(frame.right.x, frame.right.y, frame.right.z),
      new THREE.Vector3(frame.up.x, frame.up.y, frame.up.z),
      new THREE.Vector3(-frame.tangent.x, -frame.tangent.y, -frame.tangent.z),
    );
    rGroup.quaternion.setFromRotationMatrix(basis);
    rGroup.position.set(pos.x, pos.y, pos.z);

    group.add(rGroup);
    visuals.push({
      id: ring.id,
      group: rGroup,
      innerMesh: core,
      baseY: pos.y,
      t: ring.t,
      lateral: ring.lateral,
    });
  }

  return { group, visuals };
}

/**
 * Builds 3 full-width glowing holographic Checkpoint Arches at t = 0.25, 0.50, 0.75
 * adapted to each checkpoint's exact variable road width.
 */
export function buildCheckpointGates(
  track: BakedTrack,
  checkpointTs: readonly number[],
): {
  group: THREE.Group;
  visuals: CheckpointVisual[];
} {
  const group = new THREE.Group();
  const visuals: CheckpointVisual[] = [];

  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x262938,
    roughness: 0.5,
    metalness: 0.72,
  });

  checkpointTs.forEach((cpT, idx) => {
    const f = sampleTrackFrame(track, cpT);
    const halfW = f.width * 0.5 + 1.1;
    const gate = new THREE.Group();

    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x2df9f2,
      emissive: 0x0ec7c7,
      emissiveIntensity: 1.25,
      roughness: 0.25,
      metalness: 0.4,
    });

    for (const side of [-1, 1]) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 2.2), baseMat);
      foot.position.set(side * halfW, 0.9, 0);
      gate.add(foot);

      const post = new THREE.Mesh(new THREE.BoxGeometry(0.95, 11.2, 1.1), pillarMat);
      post.position.set(side * halfW, 6.4, 0);
      gate.add(post);
    }

    const bannerMat = new THREE.MeshBasicMaterial({
      color: 0x2df9f2,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2, 2.1), bannerMat);
    banner.position.set(0, 10.6, 0);
    gate.add(banner);

    const topBar = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + 1.4, 0.55, 0.9), baseMat);
    topBar.position.set(0, 11.8, 0);
    gate.add(topBar);

    const basis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(f.right.x, f.right.y, f.right.z),
      new THREE.Vector3(f.up.x, f.up.y, f.up.z),
      new THREE.Vector3(-f.tangent.x, -f.tangent.y, -f.tangent.z),
    );
    gate.quaternion.setFromRotationMatrix(basis);
    gate.position.set(f.pos.x, f.pos.y, f.pos.z);

    group.add(gate);
    visuals.push({
      index: idx + 1,
      group: gate,
      bannerMat,
      pillarMat,
    });
  });

  return { group, visuals };
}

export function buildShockHazards(
  track: BakedTrack,
  activeCount = track.def.hazards.length,
  widthScale = 1.0,
): {
  group: THREE.Group;
  visuals: HazardVisual[];
} {
  const group = new THREE.Group();
  const visuals: HazardVisual[] = [];

  const pylonBaseMat = new THREE.MeshStandardMaterial({
    color: 0x262938,
    roughness: 0.5,
    metalness: 0.7,
  });
  const railTrackMat = new THREE.MeshBasicMaterial({
    color: 0xff8a3d,
    transparent: true,
    opacity: 0.24,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const pylonGeo = new THREE.CylinderGeometry(0.32, 0.52, 2.4, 8);
  const orbGeo = new THREE.SphereGeometry(0.42, 12, 10);

  const count = Math.min(track.def.hazards.length, Math.max(0, activeCount));
  for (let i = 0; i < count; i++) {
    const hz = track.def.hazards[i];
    const effWidth = hz.width * widthScale;
    const { pos, frame } = trackToWorld(track, hz.t, hz.lateral, 0.05);
    const basis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(frame.right.x, frame.right.y, frame.right.z),
      new THREE.Vector3(frame.up.x, frame.up.y, frame.up.z),
      new THREE.Vector3(-frame.tangent.x, -frame.tangent.y, -frame.tangent.z),
    );

    // Static floor slide-rail track for moving/sweeping EMP hazards so players see the sweep zone
    if ((hz.moveAmplitude ?? 0) > 0.01) {
      const slideSpan = (hz.moveAmplitude ?? 0) * 2 + effWidth;
      const slideRail = new THREE.Mesh(new THREE.PlaneGeometry(slideSpan, 0.52), railTrackMat);
      slideRail.quaternion.setFromRotationMatrix(basis);
      slideRail.rotateX(-Math.PI / 2);
      slideRail.position.set(
        pos.x + frame.up.x * 0.02,
        pos.y + frame.up.y * 0.02,
        pos.z + frame.up.z * 0.02,
      );
      group.add(slideRail);
    }

    const hGroup = new THREE.Group();
    const halfSpan = effWidth * 0.5;
    const pylonEmissives: THREE.MeshStandardMaterial[] = [];

    for (const side of [-1, 1]) {
      const pylon = new THREE.Mesh(pylonGeo, pylonBaseMat);
      pylon.position.set(side * halfSpan, 1.2, 0);
      hGroup.add(pylon);

      const orbMat = new THREE.MeshStandardMaterial({
        color: 0xff5a5f,
        emissive: 0xff2a3c,
        emissiveIntensity: 0.4,
        roughness: 0.25,
        metalness: 0.2,
      });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.set(side * halfSpan, 2.55, 0);
      hGroup.add(orb);
      pylonEmissives.push(orbMat);
    }

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xff4455,
      transparent: true,
      opacity: 0.0,
    });
    const beamGeo = new THREE.CylinderGeometry(0.28, 0.28, effWidth, 8);
    beamGeo.rotateZ(Math.PI / 2);
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.y = 1.45;
    hGroup.add(beamMesh);

    const warnMat = new THREE.MeshBasicMaterial({
      color: 0xffb703,
      transparent: true,
      opacity: 0.12,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const warnStrip = new THREE.Mesh(new THREE.PlaneGeometry(effWidth, 2.2), warnMat);
    warnStrip.rotation.x = -Math.PI / 2;
    warnStrip.position.y = 0.06;
    hGroup.add(warnStrip);

    hGroup.quaternion.setFromRotationMatrix(basis);
    hGroup.position.set(pos.x, pos.y, pos.z);
    group.add(hGroup);

    visuals.push({
      id: hz.id,
      group: hGroup,
      beamMesh,
      beamMaterial: beamMat,
      warningStrip: warnStrip,
      warningMaterial: warnMat,
      pylonEmissives,
      basePos: new THREE.Vector3(pos.x, pos.y, pos.z),
      rightVec: new THREE.Vector3(frame.right.x, frame.right.y, frame.right.z),
      baseLateral: hz.lateral,
      def: hz,
    });
  }

  return { group, visuals };
}

/**
 * Builds Gravity Updraft Geysers: glowing swirling translucent vertical vortex columns
 * with rising energy hoops and emitter floor rings that lift UFOs skyward!
 */
export function buildUpdrafts(track: BakedTrack): {
  group: THREE.Group;
  visuals: UpdraftVisual[];
} {
  const group = new THREE.Group();
  const visuals: UpdraftVisual[] = [];
  if (!track.def.updrafts.length) return { group, visuals };

  const emitterMat = new THREE.MeshStandardMaterial({
    color: 0x1e2538,
    roughness: 0.45,
    metalness: 0.75,
  });

  for (const ud of track.def.updrafts) {
    const { pos, frame } = trackToWorld(track, ud.t, ud.lateral, 0.08);
    const uGroup = new THREE.Group();

    const baseRing = new THREE.Mesh(
      new THREE.TorusGeometry(ud.radius * 0.85, 0.34, 8, 24),
      emitterMat,
    );
    baseRing.rotation.x = Math.PI / 2;
    uGroup.add(baseRing);

    const glowMat = new THREE.MeshBasicMaterial({
      color: ud.colorHex,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const spinColumn = new THREE.Mesh(
      new THREE.CylinderGeometry(ud.radius * 0.95, ud.radius * 0.62, 22, 16, 1, true),
      glowMat,
    );
    spinColumn.position.y = 11;
    spinColumn.renderOrder = 3;
    uGroup.add(spinColumn);

    const ringMat = new THREE.MeshBasicMaterial({
      color: ud.colorHex,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const rings: THREE.Mesh[] = [];
    for (let k = 0; k < 3; k++) {
      const hoop = new THREE.Mesh(
        new THREE.TorusGeometry(ud.radius * (0.68 + k * 0.1), 0.18, 6, 20),
        ringMat,
      );
      hoop.rotation.x = Math.PI / 2;
      hoop.position.y = 2.5 + k * 6.5;
      hoop.renderOrder = 4;
      uGroup.add(hoop);
      rings.push(hoop);
    }

    const basis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(frame.right.x, frame.right.y, frame.right.z),
      new THREE.Vector3(frame.up.x, frame.up.y, frame.up.z),
      new THREE.Vector3(-frame.tangent.x, -frame.tangent.y, -frame.tangent.z),
    );
    uGroup.quaternion.setFromRotationMatrix(basis);
    uGroup.position.set(pos.x, pos.y, pos.z);
    group.add(uGroup);
    visuals.push({ group: uGroup, spinColumn, rings });
  }

  return { group, visuals };
}

/**
 * Builds Hyper-Warp Speed Tunnels: sequences of concentric glowing neon arch rings
 * framing high-speed stretches & overpasses that surge speed and recharge plasma boost!
 */
export function buildWarpTunnels(track: BakedTrack): {
  group: THREE.Group;
  visuals: WarpTunnelVisual[];
} {
  const group = new THREE.Group();
  const visuals: WarpTunnelVisual[] = [];
  if (!track.def.warpTunnels.length) return { group, visuals };

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1d2236,
    roughness: 0.42,
    metalness: 0.78,
  });

  for (const tunnel of track.def.warpTunnels) {
    const tGroup = new THREE.Group();
    const hoops: THREE.Mesh[] = [];
    const neonMat = new THREE.MeshBasicMaterial({
      color: tunnel.colorHex,
      transparent: true,
      opacity: 0.88,
    });
    const span =
      tunnel.tEnd >= tunnel.tStart
        ? tunnel.tEnd - tunnel.tStart
        : 1 - tunnel.tStart + tunnel.tEnd;

    for (let i = 0; i < tunnel.ringCount; i++) {
      const frac = tunnel.ringCount > 1 ? i / (tunnel.ringCount - 1) : 0.5;
      const t = (tunnel.tStart + span * frac) % 1;
      const f = sampleTrackFrame(track, t);
      const radius = f.width * 0.54;

      const arch = new THREE.Group();
      const outerFrame = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.75, 6, 18, Math.PI),
        frameMat,
      );
      outerFrame.scale.set(1.0, 0.72, 1.0);
      arch.add(outerFrame);

      const innerNeon = new THREE.Mesh(
        new THREE.TorusGeometry(radius - 0.9, 0.36, 8, 22, Math.PI),
        neonMat,
      );
      innerNeon.scale.set(1.0, 0.72, 1.0);
      arch.add(innerNeon);
      hoops.push(innerNeon);

      const basis = new THREE.Matrix4().makeBasis(
        new THREE.Vector3(f.right.x, f.right.y, f.right.z),
        new THREE.Vector3(f.up.x, f.up.y, f.up.z),
        new THREE.Vector3(-f.tangent.x, -f.tangent.y, -f.tangent.z),
      );
      arch.quaternion.setFromRotationMatrix(basis);
      arch.position.set(f.pos.x, f.pos.y, f.pos.z);
      tGroup.add(arch);
    }

    group.add(tGroup);
    visuals.push({ group: tGroup, hoops });
  }

  return { group, visuals };
}

/**
 * Builds interactive 3D Track Obstacles:
 * - 'rock-pillar': Sculpted sandstone split-divider spire with luminous hover-height collar
 * - 'hover-drone': Patrolling canyon recon drone with glowing scanner eye, rotor halo & ground shadow
 * - 'bumper-orb': Playful Solar Pinball Bumper with crystal-gold spring sphere & orbiting energy ring
 */
export function buildTrackObstacles(
  track: BakedTrack,
  isSoftwareGl: boolean,
): {
  group: THREE.Group;
  visuals: ObstacleVisual[];
} {
  const group = new THREE.Group();
  const visuals: ObstacleVisual[] = [];
  const defs = track.def.obstacles;
  if (!defs || defs.length === 0) return { group, visuals };

  const rockBaseMat = new THREE.MeshStandardMaterial({
    color: 0xa44b30,
    roughness: 0.86,
    metalness: 0.06,
    flatShading: true,
  });
  const rockTopMat = new THREE.MeshStandardMaterial({
    color: 0xd98451,
    roughness: 0.8,
    metalness: 0.06,
    flatShading: true,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x242a3b,
    roughness: 0.4,
    metalness: 0.78,
  });
  const amberGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    emissive: 0xff9f1c,
    emissiveIntensity: 1.5,
    roughness: 0.22,
  });
  const cyanGlowMat = new THREE.MeshStandardMaterial({
    color: 0x5dfcf7,
    emissive: 0x0ec7c7,
    emissiveIntensity: 1.65,
    roughness: 0.18,
  });
  const coralGlowMat = new THREE.MeshStandardMaterial({
    color: 0xff6b4a,
    emissive: 0xff3b30,
    emissiveIntensity: 1.6,
    roughness: 0.22,
  });

  for (const ob of defs) {
    const { pos, frame } = trackToWorld(track, ob.t, ob.lateral, 0.05);
    const basis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(frame.right.x, frame.right.y, frame.right.z),
      new THREE.Vector3(frame.up.x, frame.up.y, frame.up.z),
      new THREE.Vector3(-frame.tangent.x, -frame.tangent.y, -frame.tangent.z),
    );

    // Subtle ground patrol rail for moving hover drones so players read their sweep zone cleanly
    if ((ob.moveAmplitude ?? 0) > 0.01) {
      const railSpan = (ob.moveAmplitude ?? 0) * 2 + ob.radius * 2;
      const rail = new THREE.Mesh(
        new THREE.PlaneGeometry(railSpan, 0.45),
        new THREE.MeshBasicMaterial({
          color: 0xff9f1c,
          transparent: true,
          opacity: 0.24,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        }),
      );
      rail.quaternion.setFromRotationMatrix(basis);
      rail.rotateX(-Math.PI / 2);
      rail.position.set(
        pos.x + frame.up.x * 0.03,
        pos.y + frame.up.y * 0.03,
        pos.z + frame.up.z * 0.03,
      );
      group.add(rail);
    }

    const oGroup = new THREE.Group();
    let spinPart: THREE.Object3D | null = null;
    let pulsePart: THREE.Object3D | null = null;

    if (ob.kind === 'rock-pillar') {
      // Composite 4-part sculpted sandstone split-pillar with metallic warning collar
      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(ob.radius * 0.92, ob.radius * 1.08, 2.2, 7),
        rockBaseMat,
      );
      plinth.position.y = 1.1;
      plinth.castShadow = !isSoftwareGl;
      oGroup.add(plinth);

      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(ob.radius * 0.62, ob.radius * 0.9, ob.height * 0.68, 7),
        rockTopMat,
      );
      column.position.y = 2.0 + ob.height * 0.34;
      column.castShadow = !isSoftwareGl;
      oGroup.add(column);

      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(ob.radius * 0.68, ob.height * 0.28, 7),
        rockBaseMat,
      );
      cap.position.y = 2.0 + ob.height * 0.68 + ob.height * 0.14;
      oGroup.add(cap);

      // Luminous warning holo-collar at hover height so players spot the split from afar!
      const collar = new THREE.Mesh(
        new THREE.TorusGeometry(ob.radius * 1.02, 0.24, 8, 20),
        amberGlowMat,
      );
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 1.9;
      oGroup.add(collar);
      pulsePart = collar;
    } else if (ob.kind === 'ice-spire') {
      // Composite 5-part Sculpted Glacial Ice Spire divider with translucent crystal shards & cyan collar!
      const iceBodyMat = new THREE.MeshPhysicalMaterial({
        color: 0x9be7ff,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.38,
        roughness: 0.14,
        metalness: 0.18,
        clearcoat: 1.0,
        flatShading: true,
      });
      const iceTipMat = new THREE.MeshStandardMaterial({
        color: 0xe6faff,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.55,
        roughness: 0.12,
        metalness: 0.22,
        flatShading: true,
      });

      const basePlinth = new THREE.Mesh(
        new THREE.CylinderGeometry(ob.radius * 0.9, ob.radius * 1.12, 2.2, 6),
        iceBodyMat,
      );
      basePlinth.position.y = 1.1;
      oGroup.add(basePlinth);

      const mainSpire = new THREE.Mesh(
        new THREE.ConeGeometry(ob.radius * 0.88, ob.height * 0.94, 6),
        iceTipMat,
      );
      mainSpire.position.y = 1.8 + ob.height * 0.47;
      oGroup.add(mainSpire);

      // Twin angled flanking crystal shards for an unmistakable glacial silhouette
      for (const s of [-1, 1]) {
        const sideShard = new THREE.Mesh(
          new THREE.ConeGeometry(ob.radius * 0.44, ob.height * 0.52, 5),
          iceBodyMat,
        );
        sideShard.position.set(s * ob.radius * 0.58, ob.height * 0.28, s * 0.35);
        sideShard.rotation.z = -s * 0.28;
        oGroup.add(sideShard);
      }

      const iceCollar = new THREE.Mesh(
        new THREE.TorusGeometry(ob.radius * 1.04, 0.24, 8, 20),
        cyanGlowMat,
      );
      iceCollar.rotation.x = Math.PI / 2;
      iceCollar.position.y = 1.9;
      oGroup.add(iceCollar);
      pulsePart = iceCollar;
    } else if (ob.kind === 'frost-crystal') {
      // Unique Level 2 Fun Element: Shatterable Cryo-Crystal Prism (smash for +140 pts, +22% boost & surge!)
      const cCol = ob.colorHex ?? 0x7efcf7;
      const prismMat = new THREE.MeshPhysicalMaterial({
        color: cCol,
        emissive: cCol,
        emissiveIntensity: 0.85,
        roughness: 0.08,
        metalness: 0.2,
        clearcoat: 1.0,
        transparent: true,
        opacity: 0.88,
        flatShading: true,
      });
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

      const crystalSpin = new THREE.Group();
      crystalSpin.position.y = 2.15;

      const mainPrism = new THREE.Mesh(new THREE.OctahedronGeometry(ob.radius * 0.72, 0), prismMat);
      mainPrism.scale.set(0.76, 1.55, 0.76);
      crystalSpin.add(mainPrism);

      const crossPrism = new THREE.Mesh(new THREE.OctahedronGeometry(ob.radius * 0.52, 0), prismMat);
      crossPrism.rotation.set(0.45, 0.65, 0.55);
      crossPrism.scale.set(0.85, 1.35, 0.85);
      crystalSpin.add(crossPrism);

      const innerCore = new THREE.Mesh(new THREE.OctahedronGeometry(ob.radius * 0.34, 0), coreMat);
      crystalSpin.add(innerCore);

      oGroup.add(crystalSpin);
      spinPart = crystalSpin;
      pulsePart = crystalSpin;

      // Inviting radiant frost ground target halo so players spot smashable crystals instantly!
      const frostHalo = new THREE.Mesh(
        new THREE.RingGeometry(ob.radius * 0.62, ob.radius * 1.08, 18),
        new THREE.MeshBasicMaterial({
          color: cCol,
          transparent: true,
          opacity: 0.62,
          side: THREE.DoubleSide,
        }),
      );
      frostHalo.rotation.x = -Math.PI / 2;
      frostHalo.position.y = 0.08;
      oGroup.add(frostHalo);
    } else if (ob.kind === 'spore-stalk') {
      // Composite 5-part Bioluminescent Fungal Stalk Divider with glowing tiered cap & emerald collar!
      const stalkBodyMat = new THREE.MeshStandardMaterial({
        color: 0x165e56,
        emissive: 0x064e3b,
        emissiveIntensity: 0.35,
        roughness: 0.62,
        flatShading: true,
      });
      const capGlowMat = new THREE.MeshStandardMaterial({
        color: 0x34d399,
        emissive: 0x10b981,
        emissiveIntensity: 1.15,
        roughness: 0.25,
      });
      const pinkRimMat = new THREE.MeshBasicMaterial({ color: 0xf472b6 });

      const baseRoot = new THREE.Mesh(
        new THREE.CylinderGeometry(ob.radius * 0.78, ob.radius * 1.12, 2.6, 8),
        stalkBodyMat,
      );
      baseRoot.position.y = 1.3;
      oGroup.add(baseRoot);

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(ob.radius * 0.54, ob.radius * 0.78, ob.height * 0.72, 8),
        stalkBodyMat,
      );
      trunk.position.y = 2.2 + ob.height * 0.36;
      oGroup.add(trunk);

      const topCap = new THREE.Mesh(
        new THREE.SphereGeometry(ob.radius * 1.45, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.52),
        capGlowMat,
      );
      topCap.scale.set(1, 0.56, 1);
      topCap.position.y = ob.height * 0.86;
      oGroup.add(topCap);

      const hoverCollar = new THREE.Mesh(
        new THREE.TorusGeometry(ob.radius * 1.04, 0.24, 8, 20),
        pinkRimMat,
      );
      hoverCollar.rotation.x = Math.PI / 2;
      hoverCollar.position.y = 1.9;
      oGroup.add(hoverCollar);
      pulsePart = hoverCollar;
    } else if (ob.kind === 'spore-pad') {
      // Unique Level 3 Fun Element: Bouncy Giant Toadstool Spring-Pad (catapults UFO into canopy!)
      const pCol = ob.colorHex ?? 0xf472b6;
      const capMat = new THREE.MeshPhysicalMaterial({
        color: pCol,
        emissive: pCol,
        emissiveIntensity: 0.78,
        roughness: 0.22,
        metalness: 0.1,
        clearcoat: 0.9,
      });
      const stemMat = new THREE.MeshStandardMaterial({
        color: 0xd1fae5,
        emissive: 0x10b981,
        emissiveIntensity: 0.4,
        roughness: 0.5,
      });
      const spotMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

      const springBody = new THREE.Group();
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(ob.radius * 0.52, ob.radius * 0.72, 1.0, 14),
        stemMat,
      );
      stem.position.y = 0.5;
      springBody.add(stem);

      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(ob.radius * 1.06, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
        capMat,
      );
      cap.scale.set(1, 0.44, 1);
      cap.position.y = 0.95;
      springBody.add(cap);

      // Luminous golden biolume spots ringing the bouncy toadstool cap
      const spotGeo = new THREE.SphereGeometry(0.36, 8, 8);
      for (let s = 0; s < 6; s++) {
        const a = (s / 6) * Math.PI * 2;
        const spot = new THREE.Mesh(spotGeo, spotMat);
        spot.position.set(Math.cos(a) * ob.radius * 0.65, 1.72, Math.sin(a) * ob.radius * 0.65);
        springBody.add(spot);
      }

      oGroup.add(springBody);
      pulsePart = springBody;

      const springHalo = new THREE.Mesh(
        new THREE.RingGeometry(ob.radius * 0.96, ob.radius * 1.24, 22),
        new THREE.MeshBasicMaterial({
          color: pCol,
          transparent: true,
          opacity: 0.65,
          side: THREE.DoubleSide,
        }),
      );
      springHalo.rotation.x = -Math.PI / 2;
      springHalo.position.y = 0.08;
      oGroup.add(springHalo);
    } else if (ob.kind === 'pollen-orb') {
      // Unique Level 3 Fun Element: Floating Biolume Pollen Bloom (burst for +130 pts & +25% boost!)
      const bCol = ob.colorHex ?? 0xfde047;
      const bloomMat = new THREE.MeshStandardMaterial({
        color: bCol,
        emissive: bCol,
        emissiveIntensity: 1.35,
        roughness: 0.18,
      });
      const petalMat = new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.78,
      });

      const bloomGroup = new THREE.Group();
      bloomGroup.position.y = 2.2;

      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(ob.radius * 0.56, 1), bloomMat);
      bloomGroup.add(core);

      // 4 orbiting pollen satellites
      const satGeo = new THREE.SphereGeometry(0.42, 8, 8);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2;
        const sat = new THREE.Mesh(satGeo, petalMat);
        sat.position.set(Math.cos(a) * ob.radius * 0.88, Math.sin(a * 2) * 0.45, Math.sin(a) * ob.radius * 0.88);
        bloomGroup.add(sat);
      }

      oGroup.add(bloomGroup);
      spinPart = bloomGroup;
      pulsePart = bloomGroup;

      const bloomRing = new THREE.Mesh(
        new THREE.RingGeometry(ob.radius * 0.58, ob.radius * 1.02, 18),
        new THREE.MeshBasicMaterial({
          color: bCol,
          transparent: true,
          opacity: 0.58,
          side: THREE.DoubleSide,
        }),
      );
      bloomRing.rotation.x = -Math.PI / 2;
      bloomRing.position.y = 0.08;
      oGroup.add(bloomRing);
    } else if (ob.kind === 'meteor-spire') {
      // Unique Level 4 Split-Pillar: Obsidian-Amethyst Faceted Meteor Spire with orbiting glowing cosmic ring collar!
      const mCol = ob.colorHex ?? 0xa855f7;
      const obsidianMat = new THREE.MeshStandardMaterial({
        color: 0x26163a,
        emissive: 0x3b0764,
        emissiveIntensity: 0.35,
        roughness: 0.48,
        metalness: 0.52,
        flatShading: true,
      });
      const veinMat = new THREE.MeshStandardMaterial({
        color: mCol,
        emissive: mCol,
        emissiveIntensity: 1.45,
        roughness: 0.2,
      });

      const baseCrater = new THREE.Mesh(
        new THREE.CylinderGeometry(ob.radius * 0.96, ob.radius * 1.18, 1.3, 8),
        obsidianMat,
      );
      baseCrater.position.y = 0.65;
      oGroup.add(baseCrater);

      const mainSpire = new THREE.Mesh(
        new THREE.CylinderGeometry(ob.radius * 0.34, ob.radius * 0.88, ob.height * 0.86, 6),
        obsidianMat,
      );
      mainSpire.position.y = ob.height * 0.45;
      mainSpire.castShadow = !isSoftwareGl;
      oGroup.add(mainSpire);

      const capCrystal = new THREE.Mesh(
        new THREE.ConeGeometry(ob.radius * 0.46, ob.height * 0.22, 6),
        veinMat,
      );
      capCrystal.position.y = ob.height * 0.96;
      oGroup.add(capCrystal);

      const orbitCollar = new THREE.Group();
      orbitCollar.position.y = 3.2;
      const ringA = new THREE.Mesh(
        new THREE.TorusGeometry(ob.radius * 1.15, 0.22, 8, 24),
        veinMat,
      );
      ringA.rotation.x = Math.PI / 2 + 0.22;
      orbitCollar.add(ringA);
      const ringB = new THREE.Mesh(
        new THREE.TorusGeometry(ob.radius * 1.32, 0.14, 8, 22),
        cyanGlowMat,
      );
      ringB.rotation.x = Math.PI / 2 - 0.2;
      orbitCollar.add(ringB);
      oGroup.add(orbitCollar);
      spinPart = orbitCollar;
      pulsePart = ringA;
    } else if (ob.kind === 'gravity-well') {
      // Unique Level 4 Fun Element: Spinning Cosmic Gravity Pulse Well (orbital slingshot +14 m/s, +26% boost, +175 PTS!)
      const gCol = ob.colorHex ?? 0xf59e0b;
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0x09051a,
        emissive: 0x4c1d95,
        emissiveIntensity: 0.9,
        roughness: 0.12,
        metalness: 0.9,
      });
      const accMat = new THREE.MeshStandardMaterial({
        color: gCol,
        emissive: gCol,
        emissiveIntensity: 1.75,
        roughness: 0.15,
      });

      const wellGroup = new THREE.Group();
      wellGroup.position.y = 2.15;

      const singularity = new THREE.Mesh(new THREE.SphereGeometry(ob.radius * 0.46, 16, 14), coreMat);
      wellGroup.add(singularity);

      const accRingA = new THREE.Mesh(
        new THREE.TorusGeometry(ob.radius * 0.95, 0.22, 8, 28),
        accMat,
      );
      accRingA.rotation.x = Math.PI * 0.38;
      wellGroup.add(accRingA);

      const accRingB = new THREE.Mesh(
        new THREE.TorusGeometry(ob.radius * 1.18, 0.14, 8, 28),
        cyanGlowMat,
      );
      accRingB.rotation.x = -Math.PI * 0.34;
      accRingB.rotation.y = Math.PI * 0.25;
      wellGroup.add(accRingB);

      oGroup.add(wellGroup);
      spinPart = wellGroup;
      pulsePart = singularity;

      const captureHalo = new THREE.Mesh(
        new THREE.RingGeometry(ob.radius * 0.72, ob.radius * 1.28, 24),
        new THREE.MeshBasicMaterial({
          color: gCol,
          transparent: true,
          opacity: 0.62,
          side: THREE.DoubleSide,
        }),
      );
      captureHalo.rotation.x = -Math.PI / 2;
      captureHalo.position.y = 0.08;
      oGroup.add(captureHalo);
    } else if (ob.kind === 'star-core') {
      // Unique Level 4 Fun Element: Crackable Cosmic Star-Core Geode (+150 PTS, +28% boost, zero slowdown!)
      const sCol = ob.colorHex ?? 0xfbbf24;
      const geodeMat = new THREE.MeshStandardMaterial({
        color: sCol,
        emissive: sCol,
        emissiveIntensity: 1.55,
        roughness: 0.14,
        metalness: 0.55,
        flatShading: true,
      });
      const shardMat = new THREE.MeshBasicMaterial({
        color: 0xe879f9,
        transparent: true,
        opacity: 0.85,
      });

      const coreGroup = new THREE.Group();
      coreGroup.position.y = 2.25;

      const innerStar = new THREE.Mesh(new THREE.OctahedronGeometry(ob.radius * 0.62, 0), geodeMat);
      innerStar.scale.set(1, 1.32, 1);
      coreGroup.add(innerStar);

      const shardGeo = new THREE.OctahedronGeometry(0.42, 0);
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        const sh = new THREE.Mesh(shardGeo, shardMat);
        sh.position.set(Math.cos(a) * ob.radius * 0.92, Math.sin(a * 2) * 0.42, Math.sin(a) * ob.radius * 0.92);
        coreGroup.add(sh);
      }

      oGroup.add(coreGroup);
      spinPart = coreGroup;
      pulsePart = innerStar;

      const targetRing = new THREE.Mesh(
        new THREE.RingGeometry(ob.radius * 0.56, ob.radius * 1.04, 20),
        new THREE.MeshBasicMaterial({
          color: sCol,
          transparent: true,
          opacity: 0.62,
          side: THREE.DoubleSide,
        }),
      );
      targetRing.rotation.x = -Math.PI / 2;
      targetRing.position.y = 0.08;
      oGroup.add(targetRing);
    } else if (ob.kind === 'hover-drone') {
      // Composite 5-part patrolling Recon Drone
      const hoverCenter = new THREE.Group();
      hoverCenter.position.y = 1.75;

      const core = new THREE.Mesh(new THREE.OctahedronGeometry(ob.radius * 0.62, 1), metalMat);
      core.scale.set(1.15, 0.72, 1.15);
      hoverCenter.add(core);

      const eye = new THREE.Mesh(new THREE.SphereGeometry(ob.radius * 0.32, 12, 10), coralGlowMat);
      eye.position.set(0, 0.05, ob.radius * 0.56);
      hoverCenter.add(eye);

      const rotorRing = new THREE.Group();
      const ringMesh = new THREE.Mesh(
        new THREE.TorusGeometry(ob.radius * 0.92, 0.18, 8, 22),
        amberGlowMat,
      );
      ringMesh.rotation.x = Math.PI / 2;
      rotorRing.add(ringMesh);

      const bladeGeo = new THREE.BoxGeometry(ob.radius * 1.85, 0.12, 0.32);
      const bladeA = new THREE.Mesh(bladeGeo, metalMat);
      const bladeB = new THREE.Mesh(bladeGeo, metalMat);
      bladeB.rotation.y = Math.PI / 2;
      rotorRing.add(bladeA, bladeB);
      hoverCenter.add(rotorRing);
      spinPart = rotorRing;

      oGroup.add(hoverCenter);
      pulsePart = hoverCenter;

      // Ground glow ring right beneath drone
      const groundMark = new THREE.Mesh(
        new THREE.RingGeometry(ob.radius * 0.55, ob.radius * 0.95, 20),
        new THREE.MeshBasicMaterial({
          color: 0xff6b4a,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide,
        }),
      );
      groundMark.rotation.x = -Math.PI / 2;
      groundMark.position.y = 0.08;
      oGroup.add(groundMark);
    } else {
      // 'bumper-orb': Unique Fun Solar Pinball Bumper!
      const ped = new THREE.Mesh(
        new THREE.CylinderGeometry(ob.radius * 0.72, ob.radius * 0.94, 0.65, 16),
        metalMat,
      );
      ped.position.y = 0.32;
      oGroup.add(ped);

      const pedRing = new THREE.Mesh(
        new THREE.TorusGeometry(ob.radius * 0.92, 0.16, 8, 22),
        cyanGlowMat,
      );
      pedRing.rotation.x = Math.PI / 2;
      pedRing.position.y = 0.64;
      oGroup.add(pedRing);

      const orbCore = new THREE.Mesh(
        new THREE.IcosahedronGeometry(ob.radius * 0.74, 1),
        amberGlowMat,
      );
      orbCore.position.y = 1.95;
      oGroup.add(orbCore);
      pulsePart = orbCore;

      const orbitGroup = new THREE.Group();
      orbitGroup.position.y = 1.95;
      const orbitRing = new THREE.Mesh(
        new THREE.TorusGeometry(ob.radius * 1.04, 0.19, 8, 24),
        cyanGlowMat,
      );
      orbitRing.rotation.x = Math.PI / 3;
      orbitGroup.add(orbitRing);

      const orbitRing2 = new THREE.Mesh(
        new THREE.TorusGeometry(ob.radius * 1.04, 0.14, 8, 24),
        amberGlowMat,
      );
      orbitRing2.rotation.y = Math.PI / 3;
      orbitGroup.add(orbitRing2);
      oGroup.add(orbitGroup);
      spinPart = orbitGroup;
    }

    oGroup.quaternion.setFromRotationMatrix(basis);
    oGroup.position.set(pos.x, pos.y, pos.z);
    group.add(oGroup);

    visuals.push({
      id: ob.id,
      kind: ob.kind,
      group: oGroup,
      spinPart,
      pulsePart,
      basePos: new THREE.Vector3(pos.x, pos.y, pos.z),
      rightVec: new THREE.Vector3(frame.right.x, frame.right.y, frame.right.z),
      baseLateral: ob.lateral,
      def: ob,
    });
  }

  return { group, visuals };
}

/**
 * Builds Floating Slingshot Turbo Gates — glowing spinning holographic chevron gates
 * that reward aerial jumps, updraft chains, and sprint lines with a hyper-pulse burst!
 */
export function buildSpeedGates(track: BakedTrack): {
  group: THREE.Group;
  visuals: SpeedGateVisual[];
} {
  const group = new THREE.Group();
  const visuals: SpeedGateVisual[] = [];
  const defs = track.def.speedGates;
  if (!defs || defs.length === 0) return { group, visuals };

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1e2538,
    roughness: 0.35,
    metalness: 0.82,
  });

  for (const gate of defs) {
    const { pos, frame } = trackToWorld(track, gate.t, gate.lateral, gate.heightOffset);
    const basis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(frame.right.x, frame.right.y, frame.right.z),
      new THREE.Vector3(frame.up.x, frame.up.y, frame.up.z),
      new THREE.Vector3(-frame.tangent.x, -frame.tangent.y, -frame.tangent.z),
    );

    const gGroup = new THREE.Group();
    const neonMat = new THREE.MeshStandardMaterial({
      color: gate.colorHex,
      emissive: gate.colorHex,
      emissiveIntensity: 1.85,
      roughness: 0.16,
      metalness: 0.3,
    });

    const outerFrame = new THREE.Mesh(
      new THREE.TorusGeometry(gate.radius, 0.34, 8, 24),
      frameMat,
    );
    gGroup.add(outerFrame);

    const spinRing = new THREE.Group();
    const innerGlow = new THREE.Mesh(
      new THREE.TorusGeometry(gate.radius - 0.45, 0.24, 8, 24),
      neonMat,
    );
    spinRing.add(innerGlow);

    // 4 glowing directional turbo fins radiating around the slingshot portal
    const finGeo = new THREE.ConeGeometry(0.68, 2.2, 4);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const fin = new THREE.Mesh(finGeo, neonMat);
      fin.position.set(Math.cos(a) * (gate.radius + 0.9), Math.sin(a) * (gate.radius + 0.9), 0);
      fin.rotation.z = a - Math.PI / 2;
      spinRing.add(fin);
    }
    gGroup.add(spinRing);

    // Subtle holographic center shimmer disc
    const shimmer = new THREE.Mesh(
      new THREE.CircleGeometry(gate.radius - 0.65, 20),
      new THREE.MeshBasicMaterial({
        color: gate.colorHex,
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    gGroup.add(shimmer);

    gGroup.quaternion.setFromRotationMatrix(basis);
    gGroup.position.set(pos.x, pos.y, pos.z);
    group.add(gGroup);

    visuals.push({
      id: gate.id,
      group: gGroup,
      spinRing,
    });
  }

  return { group, visuals };
}

/**
 * Builds curved specular Blue-Ice Slip-Glide Sheets embedded flush on the track deck!
 * Driving over them cuts lateral drag for silky drift-carving and grants an ice-glide speed surge.
 */
export function buildIcePatches(track: BakedTrack, maxAnisotropy: number): THREE.Group {
  const group = new THREE.Group();
  const defs = track.def.icePatches;
  if (!defs || defs.length === 0) return group;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0.0, 'rgba(56, 189, 248, 0.15)');
  grad.addColorStop(0.15, 'rgba(125, 211, 252, 0.85)');
  grad.addColorStop(0.5, 'rgba(224, 247, 255, 0.94)');
  grad.addColorStop(0.85, 'rgba(125, 211, 252, 0.85)');
  grad.addColorStop(1.0, 'rgba(56, 189, 248, 0.15)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 512);

  // Subtle translucent ice fracture veins & forward glide chevrons
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const y = 44 + i * 84;
    ctx.beginPath();
    ctx.moveTo(46, y + 36);
    ctx.lineTo(128, y);
    ctx.lineTo(210, y + 36);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(14, 165, 233, 0.42)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo(28 + (i * 23) % 180, i * 48);
    ctx.lineTo(72 + (i * 37) % 160, i * 48 + 38);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 3);
  tex.anisotropy = maxAnisotropy;

  const iceMat = new THREE.MeshPhysicalMaterial({
    map: tex,
    color: 0xbaf2ff,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.36,
    roughness: 0.08,
    metalness: 0.14,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    transparent: true,
    opacity: 0.84,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  for (const patch of defs) {
    const segs = 22;
    const span = patch.tEnd >= patch.tStart ? patch.tEnd - patch.tStart : 1 - patch.tStart + patch.tEnd;
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segs; i++) {
      const frac = i / segs;
      const t = (patch.tStart + span * frac) % 1;
      const halfW = patch.width * 0.5;
      const leftW = trackToWorld(track, t, patch.lateral - halfW, 0.08);
      const rightW = trackToWorld(track, t, patch.lateral + halfW, 0.08);

      positions.push(leftW.pos.x, leftW.pos.y, leftW.pos.z);
      positions.push(rightW.pos.x, rightW.pos.y, rightW.pos.z);
      normals.push(leftW.frame.up.x, leftW.frame.up.y, leftW.frame.up.z);
      normals.push(rightW.frame.up.x, rightW.frame.up.y, rightW.frame.up.z);
      uvs.push(0, frac, 1, frac);

      if (i < segs) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    const mesh = new THREE.Mesh(geo, iceMat);
    mesh.renderOrder = 1;
    group.add(mesh);
  }

  return group;
}

/**
 * Builds Alpine Blizzard Crosswind Gust Zones — translucent sweeping snow-streak ribbons
 * drifting laterally across exposed mountain ridges + directional roadside wind pylons!
 */
export function buildWindZones(track: BakedTrack): {
  group: THREE.Group;
  visuals: WindZoneVisual[];
} {
  const group = new THREE.Group();
  const visuals: WindZoneVisual[] = [];
  const defs = track.def.windZones;
  if (!defs || defs.length === 0) return { group, visuals };

  const streakGeo = new THREE.BoxGeometry(9.5, 0.16, 0.38);
  const pylonGeo = new THREE.CylinderGeometry(0.38, 0.55, 7.5, 6);
  const pylonMat = new THREE.MeshStandardMaterial({
    color: 0x1e2c44,
    roughness: 0.42,
    metalness: 0.72,
  });
  const coneGeo = new THREE.ConeGeometry(0.95, 3.6, 8);
  coneGeo.rotateZ(-Math.PI / 2);

  for (const zone of defs) {
    const zGroup = new THREE.Group();
    const dir = zone.force >= 0 ? 1 : -1;
    const spanT = zone.tEnd >= zone.tStart ? zone.tEnd - zone.tStart : 1 - zone.tStart + zone.tEnd;
    const streakMat = new THREE.MeshBasicMaterial({
      color: zone.colorHex,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    });
    const sockMat = new THREE.MeshStandardMaterial({
      color: 0x7efcf7,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.4,
      roughness: 0.25,
    });

    const streaks: WindZoneVisual['streaks'] = [];
    const streakCount = 10;
    for (let i = 0; i < streakCount; i++) {
      const frac = (i + 0.5) / streakCount;
      const t = (zone.tStart + spanT * frac) % 1;
      const h = 1.6 + (i % 4) * 1.45;
      const { pos, frame } = trackToWorld(track, t, 0, h);
      const basis = new THREE.Matrix4().makeBasis(
        new THREE.Vector3(frame.right.x, frame.right.y, frame.right.z),
        new THREE.Vector3(frame.up.x, frame.up.y, frame.up.z),
        new THREE.Vector3(-frame.tangent.x, -frame.tangent.y, -frame.tangent.z),
      );
      const mesh = new THREE.Mesh(streakGeo, streakMat);
      mesh.quaternion.setFromRotationMatrix(basis);
      mesh.position.set(pos.x, pos.y, pos.z);
      zGroup.add(mesh);

      streaks.push({
        mesh,
        basePos: new THREE.Vector3(pos.x, pos.y, pos.z),
        rightVec: new THREE.Vector3(frame.right.x, frame.right.y, frame.right.z),
        span: frame.width * 0.92,
        phase: i * 0.37,
        speed: 0.65 + (i % 3) * 0.18,
        dir,
      });

      // Roadside directional cryo-wind vane pylons at entry, middle & exit
      if (i === 1 || i === 5 || i === 8) {
        const edgeW = frame.width * 0.5 + 1.8;
        for (const side of [-1, 1]) {
          const pPos = trackToWorld(track, t, side * edgeW, 3.75).pos;
          const pylon = new THREE.Mesh(pylonGeo, pylonMat);
          pylon.position.set(pPos.x, pPos.y, pPos.z);
          zGroup.add(pylon);

          const sock = new THREE.Mesh(coneGeo, sockMat);
          sock.quaternion.setFromRotationMatrix(basis);
          if (dir < 0) sock.rotateY(Math.PI);
          sock.position.set(pPos.x, pPos.y + 3.1, pPos.z);
          zGroup.add(sock);
        }
      }
    }

    group.add(zGroup);
    visuals.push({ group: zGroup, streaks });
  }

  return { group, visuals };
}

/**
 * Builds curved Luminous Biolume Nectar Flow Streams embedded flush on the track deck!
 * Riding inside them recharges plasma boost continuously and propels the craft along glowing veins.
 */
export function buildNectarStreams(track: BakedTrack, maxAnisotropy: number): THREE.Group {
  const group = new THREE.Group();
  const defs = track.def.nectarStreams;
  if (!defs || defs.length === 0) return group;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0.0, 'rgba(52, 211, 153, 0.0)');
  grad.addColorStop(0.18, 'rgba(52, 211, 153, 0.72)');
  grad.addColorStop(0.5, 'rgba(244, 255, 232, 0.94)');
  grad.addColorStop(0.82, 'rgba(244, 114, 182, 0.72)');
  grad.addColorStop(1.0, 'rgba(52, 211, 153, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 512);

  // Flowing organic luminous veins & forward current ripples
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 4;
  for (let i = 0; i < 6; i++) {
    const y = 38 + i * 86;
    ctx.beginPath();
    ctx.moveTo(42, y + 36);
    ctx.quadraticCurveTo(128, y - 14, 214, y + 36);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(254, 240, 138, 0.75)';
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    ctx.arc(54 + (i * 31) % 148, 18 + (i * 29) % 476, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 3);
  tex.anisotropy = maxAnisotropy;

  for (const stream of defs) {
    const mat = new THREE.MeshPhysicalMaterial({
      map: tex,
      color: stream.colorHex,
      emissive: stream.colorHex,
      emissiveIntensity: 0.68,
      roughness: 0.14,
      metalness: 0.1,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.82,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    const segs = 22;
    const span =
      stream.tEnd >= stream.tStart ? stream.tEnd - stream.tStart : 1 - stream.tStart + stream.tEnd;
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segs; i++) {
      const frac = i / segs;
      const t = (stream.tStart + span * frac) % 1;
      const halfW = stream.width * 0.5;
      const leftW = trackToWorld(track, t, stream.lateral - halfW, 0.08);
      const rightW = trackToWorld(track, t, stream.lateral + halfW, 0.08);

      positions.push(leftW.pos.x, leftW.pos.y, leftW.pos.z);
      positions.push(rightW.pos.x, rightW.pos.y, rightW.pos.z);
      normals.push(leftW.frame.up.x, leftW.frame.up.y, leftW.frame.up.z);
      normals.push(rightW.frame.up.x, rightW.frame.up.y, rightW.frame.up.z);
      uvs.push(0, frac, 1, frac);

      if (i < segs) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 1;
    group.add(mesh);
  }

  return group;
}

/**
 * Builds luminous Zero-G Low-Gravity Cosmic Sky Strips embedded flush on the track deck!
 * Driving or jumping from them halves gravity for sweeping moon-jumps and adds a starlight speed boost.
 */
export function buildLowGravityZones(track: BakedTrack, maxAnisotropy: number): THREE.Group {
  const group = new THREE.Group();
  const defs = track.def.lowGravityZones;
  if (!defs || defs.length === 0) return group;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0.0, 'rgba(168, 85, 247, 0.0)');
  grad.addColorStop(0.14, 'rgba(168, 85, 247, 0.75)');
  grad.addColorStop(0.5, 'rgba(245, 208, 254, 0.92)');
  grad.addColorStop(0.86, 'rgba(56, 189, 248, 0.78)');
  grad.addColorStop(1.0, 'rgba(56, 189, 248, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 512);

  // Futuristic antigravity grid lines + upward lift chevrons
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.74)';
  ctx.lineWidth = 4;
  for (let i = 0; i < 8; i++) {
    const y = 32 + i * 64;
    ctx.beginPath();
    ctx.moveTo(34, y + 26);
    ctx.lineTo(128, y);
    ctx.lineTo(222, y + 26);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(232, 121, 249, 0.55)';
  ctx.lineWidth = 2;
  for (let x = 44; x <= 212; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 3.5);
  tex.anisotropy = maxAnisotropy;

  for (const zone of defs) {
    const mat = new THREE.MeshPhysicalMaterial({
      map: tex,
      color: zone.colorHex,
      emissive: zone.colorHex,
      emissiveIntensity: 0.78,
      roughness: 0.14,
      metalness: 0.25,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.84,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    const segs = 24;
    const span = zone.tEnd >= zone.tStart ? zone.tEnd - zone.tStart : 1 - zone.tStart + zone.tEnd;
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segs; i++) {
      const frac = i / segs;
      const t = (zone.tStart + span * frac) % 1;
      const halfW = zone.width * 0.5;
      const leftW = trackToWorld(track, t, zone.lateral - halfW, 0.08);
      const rightW = trackToWorld(track, t, zone.lateral + halfW, 0.08);

      positions.push(leftW.pos.x, leftW.pos.y, leftW.pos.z);
      positions.push(rightW.pos.x, rightW.pos.y, rightW.pos.z);
      normals.push(leftW.frame.up.x, leftW.frame.up.y, leftW.frame.up.z);
      normals.push(rightW.frame.up.x, rightW.frame.up.y, rightW.frame.up.z);
      uvs.push(0, frac, 1, frac);

      if (i < segs) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 1;
    group.add(mesh);
  }

  return group;
}




