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

test('buildBakedTrack produces closed continuous orthonormal frames with diverse variable widths for all 5 circuits', () => {
  const allCircuits = Object.values(CIRCUITS);
  assert.equal(allCircuits.length, 5, 'should define 5 distinct planetary circuits');

  for (const circuit of allCircuits) {
    const track = buildBakedTrack(circuit, 240);
    assert.ok(track.totalLength > 600, `${circuit.id} should be a substantial racing loop`);
    assert.equal(track.frames.length, 240);
    assert.ok(track.minimapPoints.length > 32);
    assert.ok(circuit.jumpRamps.length >= 2, `${circuit.id} should have jump launch ramps`);

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
    assert.ok(seamDist < 5, `${circuit.id} track seam should close smoothly (dist=${seamDist})`);

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
