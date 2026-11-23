import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CIRCUITS,
  buildBakedTrack,
  projectToMinimap,
  sampleTrackFrame,
  shortestProgressDelta,
  trackToWorld,
  wrapProgress,
} from './track';

test('wrapProgress wraps negative and >1 values cleanly into [0, 1)', () => {
  assert.equal(wrapProgress(0), 0);
  assert.ok(Math.abs(wrapProgress(1.25) - 0.25) < 1e-9);
  assert.ok(Math.abs(wrapProgress(-0.1) - 0.9) < 1e-9);
});

test('shortestProgressDelta finds minimal signed delta across 0/1 seam', () => {
  assert.ok(Math.abs(shortestProgressDelta(0.95, 0.05) - 0.1) < 1e-9);
  assert.ok(Math.abs(shortestProgressDelta(0.05, 0.95) - -0.1) < 1e-9);
  assert.ok(Math.abs(shortestProgressDelta(0.2, 0.45) - 0.25) < 1e-9);
});

test('buildBakedTrack produces massive closed continuous orthonormal frames for all 8 creative circuits', () => {
  const allCircuits = Object.values(CIRCUITS);
  assert.equal(allCircuits.length, 8, 'should define 8 unique planetary circuits');

  const overpassCircuits = allCircuits.filter((c) => c.hasOverpass);
  assert.ok(overpassCircuits.length >= 3, 'at least 3 circuits should feature 3D Figure-8 overpasses');

  for (const circuit of allCircuits) {
    const track = buildBakedTrack(circuit, 360);
    assert.ok(
      track.totalLength > 1700,
      `${circuit.id} should be a massive racing loop (got ${track.totalLength.toFixed(0)}m)`,
    );
    assert.equal(track.frames.length, 360);
    assert.ok(track.minimapPoints.length >= 48);
    assert.ok(circuit.jumpRamps.length >= 2, `${circuit.id} should have jump launch ramps`);
    assert.ok(circuit.updrafts.length >= 1, `${circuit.id} should have Gravity Updraft Geysers`);
    assert.ok(circuit.warpTunnels.length >= 1, `${circuit.id} should have Hyper-Warp Speed Tunnels`);

    // Verify variable road width diversity (narrow bridges widening into grand bowls/plazas)
    let minW = Infinity;
    let maxW = -Infinity;
    for (const f of track.frames) {
      minW = Math.min(minW, f.width);
      maxW = Math.max(maxW, f.width);
    }
    assert.ok(
      maxW - minW >= 8,
      `${circuit.id} should have diverse road width variation (min=${minW.toFixed(1)}, max=${maxW.toFixed(1)})`,
    );

    // Check continuity across seam (t=0 vs t=0.999)
    const fStart = sampleTrackFrame(track, 0);
    const fEnd = sampleTrackFrame(track, 0.999);
    const seamDist = Math.hypot(
      fStart.pos.x - fEnd.pos.x,
      fStart.pos.y - fEnd.pos.y,
      fStart.pos.z - fEnd.pos.z,
    );
    assert.ok(seamDist < 8, `${circuit.id} track seam should close smoothly (dist=${seamDist})`);

    // Check orthonormal basis vectors
    const dotTR =
      fStart.tangent.x * fStart.right.x +
      fStart.tangent.y * fStart.right.y +
      fStart.tangent.z * fStart.right.z;
    const dotTU =
      fStart.tangent.x * fStart.up.x +
      fStart.tangent.y * fStart.up.y +
      fStart.tangent.z * fStart.up.z;
    assert.ok(Math.abs(dotTR) < 1e-4, 'tangent and right should be orthogonal');
    assert.ok(Math.abs(dotTU) < 1e-4, 'tangent and up should be orthogonal');

    // Check minimap projection bounds
    const w = trackToWorld(track, 0.5, 0, 1);
    const mm = projectToMinimap(track, w.pos.x, w.pos.z);
    assert.ok(mm.x >= 0 && mm.x <= 1 && mm.y >= 0 && mm.y <= 1);
  }
});

test('Level 1 solar-canyon is a massive 5-zone loop with diverse terrain, safe obstacle clearance, and zero overlap with boosters/ramps', () => {
  const def = CIRCUITS['solar-canyon'];
  const track = buildBakedTrack(def, 600);

  assert.ok(
    track.totalLength > 2800,
    `Level 1 solar-canyon should exceed 2,800m (got ${track.totalLength.toFixed(0)}m)`,
  );

  let minY = Infinity;
  let maxY = -Infinity;
  let minW = Infinity;
  let maxW = -Infinity;
  for (const f of track.frames) {
    minY = Math.min(minY, f.pos.y);
    maxY = Math.max(maxY, f.pos.y);
    minW = Math.min(minW, f.width);
    maxW = Math.max(maxW, f.width);
  }
  assert.ok(
    maxY - minY >= 30,
    `Level 1 elevation relief should be >= 30m (got ${(maxY - minY).toFixed(1)}m)`,
  );
  assert.ok(
    maxW - minW >= 20,
    `Level 1 road width diversity should be >= 20m (got ${(maxW - minW).toFixed(1)}m)`,
  );
  assert.ok(def.boostPads.length >= 8, 'Level 1 should feature strategic boost pad chains');
  assert.ok((def.obstacles?.length ?? 0) >= 6, 'Level 1 should feature diverse track obstacles');
  assert.ok((def.speedGates?.length ?? 0) >= 4, 'Level 1 should feature floating Slingshot Turbo Gates');

  const kinds = new Set((def.obstacles ?? []).map((o) => o.kind));
  assert.ok(kinds.has('rock-pillar') && kinds.has('hover-drone') && kinds.has('bumper-orb'));

  for (const ob of def.obstacles ?? []) {
    assert.ok(ob.t > 0.04 && ob.t < 0.96, `obstacle ${ob.id} should stay clear of start/finish straight`);
    const f = sampleTrackFrame(track, ob.t);
    const halfW = f.width * 0.5;
    const leftClearance = halfW + (ob.lateral - ob.radius);
    const rightClearance = halfW - (ob.lateral + ob.radius);
    assert.ok(
      Math.max(leftClearance, rightClearance) >= 12,
      `obstacle ${ob.id} should always leave >= 12m open passing lane (L=${leftClearance.toFixed(1)}, R=${rightClearance.toFixed(1)})`,
    );

    // Verify no overlap with boost pads, jump ramps, or updrafts
    for (const pad of def.boostPads) {
      const distM = Math.abs(shortestProgressDelta(ob.t, pad.t)) * track.totalLength;
      const latM = Math.abs(ob.lateral - pad.lateral);
      assert.ok(
        distM > pad.length * 0.5 + ob.radius + 4 || latM > pad.width * 0.5 + ob.radius + 2,
        `obstacle ${ob.id} should not overlap boost pad ${pad.id}`,
      );
    }
    for (const ramp of def.jumpRamps) {
      const distM = Math.abs(shortestProgressDelta(ob.t, ramp.t)) * track.totalLength;
      const latM = Math.abs(ob.lateral - ramp.lateral);
      assert.ok(
        distM > ramp.length * 0.5 + ob.radius + 4 || latM > ramp.width * 0.5 + ob.radius + 2,
        `obstacle ${ob.id} should not overlap jump ramp ${ramp.id}`,
      );
    }
    for (const ud of def.updrafts) {
      const distM = Math.abs(shortestProgressDelta(ob.t, ud.t)) * track.totalLength;
      const latM = Math.abs(ob.lateral - ud.lateral);
      assert.ok(
        distM > ud.radius + ob.radius + 4 || latM > ud.radius + ob.radius + 2,
        `obstacle ${ob.id} should not overlap updraft ${ud.id}`,
      );
    }
  }
});

