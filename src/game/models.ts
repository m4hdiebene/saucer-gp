import * as THREE from 'three';
import type { BakedTrack } from './track';
import { sampleTrackFrame, trackToWorld } from './track';
import type { BiomeTheme, RacerConfig, ShockHazardDef } from './types';

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

  // Biome-specific subtle surface detail
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
  } else if (biome === 'volcano') {
    // Subtle glowing ember heat-vent strips along shoulders
    ctx.fillStyle = 'rgba(255, 92, 34, 0.24)';
    for (let y = 18; y < 512; y += 64) {
      ctx.fillRect(58, y, 16, 22);
      ctx.fillRect(438, y, 16, 22);
    }
  } else if (biome === 'aether') {
    // Subtle translucent sky-tile chevron weave
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
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
  tex.repeat.set(22, 22);
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
  const geo = new THREE.SphereGeometry(920, 28, 18);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const topCol = new THREE.Color(topColorHex);
  const midCol = new THREE.Color(topColorHex).lerp(new THREE.Color(horizonColorHex), 0.55);
  const horCol = new THREE.Color(horizonColorHex);
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const h = THREE.MathUtils.clamp(y / 520, 0, 1);
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
      : biome === 'volcano'
      ? 0x2c1c20
      : biome === 'aether'
      ? 0x455370
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
      : biome === 'volcano'
      ? { color: 0xff8a3d, emissive: 0xff4500 }
      : biome === 'aether'
      ? { color: 0xfde047, emissive: 0xf59e0b }
      : biome === 'nebula'
      ? { color: 0xe879f9, emissive: 0xa855f7 }
      : { color: 0xffb35c, emissive: 0xff7b29 };

  const leftCurve = new THREE.CatmullRomCurve3(railPositionsLeft, true);
  const rightCurve = new THREE.CatmullRomCurve3(railPositionsRight, true);
  const railMat = new THREE.MeshStandardMaterial({
    color: railStyle.color,
    emissive: railStyle.emissive,
    emissiveIntensity: 0.72,
    roughness: 0.32,
    metalness: 0.6,
  });
  const leftRail = new THREE.Mesh(new THREE.TubeGeometry(leftCurve, 200, 0.24, 6, true), railMat);
  const rightRail = new THREE.Mesh(new THREE.TubeGeometry(rightCurve, 200, 0.24, 6, true), railMat);
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

  // Instanced support pillars anchoring the floating track into the terrain below
  const pillarCount = 36;
  const pillarGeo = new THREE.CylinderGeometry(1.4, 2.2, 54, 8);
  const pillarColor =
    biome === 'glacier'
      ? 0x5f82a3
      : biome === 'volcano'
      ? 0x2c2023
      : biome === 'aether'
      ? 0x7b8fb2
      : 0x5c4749;
  const pillarMat = new THREE.MeshStandardMaterial({
    color: pillarColor,
    roughness: 0.78,
    metalness: 0.3,
  });
  const pillars = new THREE.InstancedMesh(pillarGeo, pillarMat, pillarCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < pillarCount; i++) {
    const f = sampleTrackFrame(track, i / pillarCount);
    dummy.position.set(f.pos.x, f.pos.y - 28.5, f.pos.z);
    dummy.rotation.set(0, Math.atan2(f.tangent.x, f.tangent.z), 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    pillars.setMatrixAt(i, dummy.matrix);
  }
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
    biome === 'volcano' ? 0xff9f1c : biome === 'aether' ? 0x38bdf8 : 0x2df9f2;
  const accentHex =
    biome === 'glacier' ? 0x7efcf7 : biome === 'aether' ? 0xfde047 : 0xffa63d;

  const towerMat = new THREE.MeshStandardMaterial({
    color: biome === 'volcano' ? 0x3c2e32 : biome === 'aether' ? 0xf1f5f9 : 0xe6ddd3,
    roughness: 0.42,
    metalness: 0.38,
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
export function buildCanyonEnvironment(
  track: BakedTrack,
  maxAnisotropy: number,
  isSoftwareGl: boolean,
): { group: THREE.Group; rotatingGates: THREE.Group[] } {
  const env = new THREE.Group();
  const rotatingGates: THREE.Group[] = [];
  const biome = track.def.biome;

  const trackSamples = track.frames.filter((_, i) => i % 4 === 0);
  const nearestTrackInfo = (
    x: number,
    z: number,
  ): { dist: number; trackY: number; halfWidth: number } => {
    let minD2 = Infinity;
    let ty = 8;
    let hw = 18;
    for (let i = 0; i < trackSamples.length; i++) {
      const f = trackSamples[i];
      const dx = x - f.pos.x;
      const dz = z - f.pos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < minD2) {
        minD2 = d2;
        ty = f.pos.y;
        hw = f.width * 0.5;
      }
    }
    return { dist: Math.sqrt(minD2), trackY: ty, halfWidth: hw };
  };

  // Expansive biome heightfield (extends to horizon fog, zero box walls)
  const terrainGeo = new THREE.PlaneGeometry(1420, 1420, 76, 76);
  terrainGeo.rotateX(-Math.PI / 2);
  const pos = terrainGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const { dist, trackY, halfWidth } = nearestTrackInfo(x, z);

    const rawNoise =
      Math.sin(x * 0.014) * Math.cos(z * 0.013) * 14 +
      Math.sin(x * 0.032 + z * 0.025) * 6;
    const clearEdge = halfWidth + 14;
    const mesaRamp = THREE.MathUtils.smoothstep(dist, clearEdge, clearEdge + 135);
    const outerRim = THREE.MathUtils.smoothstep(Math.hypot(x - 60, z + 10), 270, 580) * 65;

    let y =
      biome === 'aether'
        ? -26 + mesaRamp * (18 + rawNoise * 0.65) + outerRim * 0.45
        : biome === 'volcano'
        ? -14 + mesaRamp * (44 + rawNoise * 1.15) + outerRim * 1.1
        : -12 + mesaRamp * (36 + rawNoise) + outerRim;

    // Hard safety clearance beneath even the widest 54m sky-plaza road sections
    if (dist < halfWidth + 22) {
      y = Math.min(y, trackY - 9.0);
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
    roughness: biome === 'glacier' ? 0.42 : biome === 'aether' ? 0.95 : 0.88,
    metalness: biome === 'glacier' ? 0.16 : 0.05,
    emissive: biome === 'volcano' ? new THREE.Color(0x451208) : new THREE.Color(0x000000),
    emissiveIntensity: biome === 'volcano' ? 0.55 : 0,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = !isSoftwareGl;
  env.add(terrainMesh);

  // Biome-specific instanced sculptural monoliths / crystal spires / basalt peaks / sky pillars
  const spireGeo =
    biome === 'glacier'
      ? new THREE.ConeGeometry(6.8, 44, 6)
      : biome === 'volcano'
      ? new THREE.CylinderGeometry(2.0, 9.2, 46, 6)
      : biome === 'aether'
      ? new THREE.CylinderGeometry(3.4, 4.4, 62, 8)
      : new THREE.CylinderGeometry(3.2, 8.5, 34, 7);
  spireGeo.translate(0, biome === 'aether' ? 31 : 20, 0);

  const spireMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: biome === 'glacier' ? 0.24 : biome === 'aether' ? 0.36 : 0.86,
    metalness: biome === 'glacier' ? 0.28 : biome === 'aether' ? 0.52 : 0.08,
    flatShading: biome !== 'aether',
    emissive: biome === 'glacier' ? new THREE.Color(0x0d4f78) : new THREE.Color(0x000000),
    emissiveIntensity: biome === 'glacier' ? 0.22 : 0,
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
    biome === 'glacier'
      ? '#b8e8ff'
      : biome === 'volcano'
      ? '#2d2026'
      : biome === 'aether'
      ? '#dce8f8'
      : track.def.terrainPrimary,
  );
  const accentRock = new THREE.Color(
    biome === 'glacier'
      ? '#38bdf8'
      : biome === 'volcano'
      ? '#5c261c'
      : biome === 'aether'
      ? '#fcd34d'
      : track.def.terrainAccent,
  );
  const sunlitRock = new THREE.Color(
    biome === 'glacier'
      ? '#f0f9ff'
      : biome === 'volcano'
      ? '#ff6b2b'
      : biome === 'aether'
      ? '#ffffff'
      : '#d98a5b',
  );

  let seed =
    track.def.id === 'solar-canyon'
      ? 1337
      : track.def.id === 'glacier-spire'
      ? 2828
      : track.def.id === 'nebula-ridge'
      ? 4242
      : track.def.id === 'obsidian-caldera'
      ? 6161
      : 8989;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let attempt = 0; attempt < 280 && spireTransforms.length < 72; attempt++) {
    const angle = rand() * Math.PI * 2;
    const radius = 58 + rand() * 370;
    const x = 60 + Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const { dist, halfWidth } = nearestTrackInfo(x, z);
    if (dist < halfWidth + 28) continue;

    const sx = biome === 'aether' ? 0.75 + rand() * 1.15 : 0.85 + rand() * 2.1;
    const sy = 0.75 + rand() * 2.3;
    const sz = biome === 'aether' ? 0.75 + rand() * 1.15 : 0.85 + rand() * 2.1;
    const tint = baseRock
      .clone()
      .lerp(rand() > 0.55 ? sunlitRock : accentRock, rand() * (biome === 'volcano' ? 0.42 : 0.65));

    spireTransforms.push({
      x,
      y: biome === 'aether' ? -30 : -14,
      z,
      sx,
      sy,
      sz,
      rot: rand() * Math.PI * 2,
      tint,
    });
  }

  const spireInst = new THREE.InstancedMesh(spireGeo, spireMat, spireTransforms.length);
  const dummy = new THREE.Object3D();
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

  // Monumental biome spanning arches OR rotating orbital skyway ring gates!
  if (biome === 'aether' || biome === 'nebula') {
    const gateTs = biome === 'aether' ? [0.16, 0.48, 0.78] : [0.22, 0.66];
    const outerRingMat = new THREE.MeshStandardMaterial({
      color: biome === 'aether' ? 0xfbbf24 : 0xc084fc,
      emissive: biome === 'aether' ? 0xd97706 : 0x7e22ce,
      emissiveIntensity: 0.7,
      roughness: 0.25,
      metalness: 0.82,
    });
    const innerRingMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x2df9f2,
      emissiveIntensity: 1.5,
      roughness: 0.18,
      metalness: 0.4,
    });

    for (const gateT of gateTs) {
      const f = sampleTrackFrame(track, gateT);
      const gateRoot = new THREE.Group();
      const radius = f.width * 0.68 + 5.5;

      const spinGroup = new THREE.Group();
      const outerTorus = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 1.35, 8, 32),
        outerRingMat,
      );
      const innerTorus = new THREE.Mesh(
        new THREE.TorusGeometry(radius - 2.1, 0.42, 8, 32),
        innerRingMat,
      );
      spinGroup.add(outerTorus, innerTorus);

      // 8 radial stabilizer fins around the rotating orbital gate
      const finGeo = new THREE.BoxGeometry(1.6, 5.2, 1.4);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const fin = new THREE.Mesh(finGeo, outerRingMat);
        fin.position.set(Math.cos(a) * (radius + 2.2), Math.sin(a) * (radius + 2.2), 0);
        fin.rotation.z = a + Math.PI / 2;
        spinGroup.add(fin);
      }

      spinGroup.position.y = 4.0;
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
  } else {
    const archTs = [0.16, 0.65];
    const archMat = new THREE.MeshStandardMaterial({
      color:
        biome === 'glacier'
          ? 0x7dd3fc
          : biome === 'volcano'
          ? 0x2b1d22
          : track.def.terrainPrimary,
      roughness: biome === 'glacier' ? 0.25 : 0.86,
      metalness: biome === 'glacier' ? 0.28 : 0.08,
      flatShading: true,
    });
    const emberMat =
      biome === 'volcano'
        ? new THREE.MeshBasicMaterial({ color: 0xff6b2b })
        : null;

    for (const archT of archTs) {
      const f = sampleTrackFrame(track, archT);
      const archGroup = new THREE.Group();
      const archRad = f.width * 0.82;
      const archTorus = new THREE.Mesh(
        new THREE.TorusGeometry(archRad, 3.8, 7, 18, Math.PI),
        archMat,
      );
      archTorus.position.y = -3.0;
      archTorus.scale.set(1.15, 1.32, 1.25);
      archGroup.add(archTorus);

      if (emberMat) {
        const lavaRim = new THREE.Mesh(
          new THREE.TorusGeometry(archRad - 2.6, 0.52, 6, 18, Math.PI),
          emberMat,
        );
        lavaRim.position.y = -3.0;
        lavaRim.scale.set(1.15, 1.32, 1.25);
        archGroup.add(lavaRim);
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
  const beaconCount = 40;
  const beaconGeo = new THREE.OctahedronGeometry(0.95, 0);
  const beaconColor =
    biome === 'glacier'
      ? { color: 0x7efcf7, emissive: 0x0ea5e9 }
      : biome === 'volcano'
      ? { color: 0xff9f1c, emissive: 0xff4500 }
      : biome === 'aether'
      ? { color: 0xfde047, emissive: 0xf59e0b }
      : { color: 0xffd166, emissive: 0xff9f1c };

  const beaconMat = new THREE.MeshStandardMaterial({
    color: beaconColor.color,
    emissive: beaconColor.emissive,
    emissiveIntensity: 1.4,
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

  return { group: env, rotatingGates };
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
