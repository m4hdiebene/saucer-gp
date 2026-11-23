import test from 'node:test';
import assert from 'node:assert/strict';
import { CIRCUITS, buildBakedTrack } from './track';
import { createInitialRacers } from './raceRules';
import { getLevelDefinition } from './levels';
import {
  PHYSICS_CONSTANTS,
  computeAiInput,
  getHazardLateral,
  getHazardPhase,
  resolveRacerCollisions,
  stepRacerPhysics,
  type PhysicsEvent,
} from './physics';

test('throttle accelerates UFO forward and plasma boost exceeds base speed while draining energy', () => {
  const track = buildBakedTrack(CIRCUITS['solar-canyon']);
  const [player] = createInitialRacers(track);
  const collected = new Set<string>();
  const events: PhysicsEvent[] = [];

  for (let i = 0; i < 60; i++) {
    stepRacerPhysics(
      player,
      { throttle: 1, steer: 0, boostHeld: false, hopJustPressed: false },
      track,
      i * 0.05,
      0.05,
      collected,
      events,
    );
  }
  const cruiseSpeed = player.speed;
  assert.ok(cruiseSpeed > 65, `expected high cruise speed, got ${cruiseSpeed}`);

  // Place player on a clear lane away from rings/boost pads/checkpoints to verify pure boost drain
  player.t = 0.01;
  player.lateral = 12;
  player.boostEnergy = 90;
  player.boostPadTimer = 0;
  const energyBefore = player.boostEnergy;
  for (let i = 0; i < 20; i++) {
    stepRacerPhysics(
      player,
      { throttle: 1, steer: 0, boostHeld: true, hopJustPressed: false },
      track,
      3 + i * 0.05,
      0.05,
      collected,
      events,
    );
  }
  assert.ok(player.speed > PHYSICS_CONSTANTS.maxBaseSpeed + 10, 'boost should exceed base speed cap');
  assert.ok(player.boostEnergy < energyBefore - 15, 'boost should consume energy');
});

test('hover hop lifts UFO above track and lands cleanly with squash feedback', () => {
  const track = buildBakedTrack(CIRCUITS['solar-canyon']);
  const [player] = createInitialRacers(track);
  const collected = new Set<string>();
  const events: PhysicsEvent[] = [];

  stepRacerPhysics(
    player,
    { throttle: 0.5, steer: 0, boostHeld: false, hopJustPressed: true },
    track,
    0.05,
    0.05,
    collected,
    events,
  );
  assert.ok(player.vy > 0, 'hop should impart upward velocity');
  assert.ok(events.some((e) => e.type === 'hop'));

  let maxHover = 0;
  for (let i = 0; i < 40; i++) {
    stepRacerPhysics(
      player,
      { throttle: 0.5, steer: 0, boostHeld: false, hopJustPressed: false },
      track,
      0.1 + i * 0.05,
      0.05,
      collected,
      events,
    );
    maxHover = Math.max(maxHover, player.hoverY);
  }
  assert.ok(maxHover > 2.2, `UFO should clear shock barriers on hop (maxHover=${maxHover})`);
  assert.equal(player.hoverY, 0, 'UFO should return smoothly to track hover plane');
  assert.ok(events.some((e) => e.type === 'land'));
});

test('UFO-to-UFO collision separates overlapping racers and emits bump event', () => {
  const track = buildBakedTrack(CIRCUITS['solar-canyon']);
  const racers = createInitialRacers(track);
  racers[0].t = 0.25;
  racers[0].lateral = 0;
  racers[1].t = 0.25;
  racers[1].lateral = 1.2;

  const events: PhysicsEvent[] = [];
  resolveRacerCollisions([racers[0], racers[1]], track, events);

  assert.ok(Math.abs(racers[1].lateral - racers[0].lateral) > 1.2, 'racers should be pushed apart');
  assert.ok(events.some((e) => e.type === 'ufo-bump'));
});

test('hazard cycle includes idle, telegraph, and active phases; AI policies are fair and beatable', () => {
  const track = buildBakedTrack(CIRCUITS['solar-canyon']);
  assert.ok(track.def.trackWidth >= 32, 'track should be wide and comfortable to steer');

  const hz = track.def.hazards[0];
  const seen = new Set<string>();
  for (let t = 0; t < hz.cycleDuration; t += 0.1) {
    seen.add(getHazardPhase(hz, t).phase);
  }
  assert.ok(seen.has('idle') && seen.has('telegraph') && seen.has('active'));

  const racers = createInitialRacers(track);
  const player = racers[0];
  for (const r of racers.slice(1)) {
    assert.ok(
      r.skillFactor < player.skillFactor,
      `AI ${r.id} skillFactor (${r.skillFactor}) should be slower than player (${player.skillFactor})`,
    );
    const inp = computeAiInput(r, racers, track, 5.0, 0.05, 0.2);
    assert.ok(inp.throttle >= 0.4 && inp.throttle <= 1.0);
    assert.ok(inp.steer >= -1 && inp.steer <= 1);
  }
});

test('magnetic ring pickup collects nearby rings cleanly and checkpoint awards bonus score', () => {
  const track = buildBakedTrack(CIRCUITS['solar-canyon']);
  const [player] = createInitialRacers(track);
  const collected = new Set<string>();
  const events: PhysicsEvent[] = [];

  // Place player slightly offset laterally (~3.5m) from first ring to verify generous magnetic pull
  const ring = track.def.rings[0];
  player.t = ring.t - 0.002;
  player.lateral = ring.lateral + 3.5;
  player.speed = 65;

  stepRacerPhysics(
    player,
    { throttle: 1, steer: 0, boostHeld: false, hopJustPressed: false },
    track,
    2.0,
    0.05,
    collected,
    events,
  );
  assert.equal(player.ringsCollected, 1, 'generous magnetic radius should collect nearby ring');
  assert.ok(player.styleScore >= 150, 'collecting ring should award points');
  assert.ok(events.some((e) => e.type === 'ring-pickup'));

  // Cross checkpoint 1 (~0.25) and verify bonus event & points
  player.t = 0.2292;
  player.speed = 70;
  stepRacerPhysics(
    player,
    { throttle: 1, steer: 0, boostHeld: false, hopJustPressed: false },
    track,
    8.0,
    0.05,
    collected,
    events,
  );
  assert.equal(player.maxCheckpoint, 1);
  assert.ok(events.some((e) => e.type === 'checkpoint' && e.checkpointIndex === 1));
  assert.ok(player.styleScore >= 450, 'checkpoint should grant +300 bonus points');
});

test('lateral steering settles smoothly to zero velocity after releasing steer key', () => {
  const track = buildBakedTrack(CIRCUITS['solar-canyon']);
  const [player] = createInitialRacers(track);
  const collected = new Set<string>();
  const events: PhysicsEvent[] = [];
  player.t = 0.05; // straight section

  for (let i = 0; i < 8; i++) {
    stepRacerPhysics(
      player,
      { throttle: 1, steer: 1, boostHeld: false, hopJustPressed: false },
      track,
      i * 0.05,
      0.05,
      collected,
      events,
    );
  }
  assert.ok(player.lateralVel > 8, 'steering right should build smooth lateral velocity');

  // Release steer for 0.3s and confirm rapid stabilization (no slippery drift)
  for (let i = 0; i < 6; i++) {
    stepRacerPhysics(
      player,
      { throttle: 1, steer: 0, boostHeld: false, hopJustPressed: false },
      track,
      0.4 + i * 0.05,
      0.05,
      collected,
      events,
    );
  }
  assert.ok(
    Math.abs(player.lateralVel) < 1.2,
    `lateral velocity should damp smoothly on release, got ${player.lateralVel}`,
  );
});

test('collision sets directional impact animation state and bumpCooldown prevents multi-frame event spam', () => {
  const track = buildBakedTrack(CIRCUITS['solar-canyon']);
  const racers = createInitialRacers(track);
  racers[0].t = 0.25;
  racers[0].lateral = 0;
  racers[1].t = 0.25;
  racers[1].lateral = 1.4;

  const events1: PhysicsEvent[] = [];
  resolveRacerCollisions([racers[0], racers[1]], track, events1);

  assert.equal(events1.filter((e) => e.type === 'ufo-bump').length, 1);
  assert.ok(racers[0].impactTimer > 0 && racers[1].impactTimer > 0, 'both racers should trigger impact animation');
  assert.equal(racers[0].impactType, 'ufo-bump');
  assert.equal(racers[1].impactType, 'ufo-bump');
  assert.ok(
    racers[0].impactDir * racers[1].impactDir < 0,
    'colliding racers should receive opposite directional recoil',
  );
  assert.ok(racers[0].bumpCooldown > 0.2 && racers[1].bumpCooldown > 0.2, 'bumpCooldown should be set');

  // Re-overlap immediately on next frame while cooldown is active: position still separates, no duplicate bump event
  racers[1].lateral = racers[0].lateral + 1.0;
  const events2: PhysicsEvent[] = [];
  resolveRacerCollisions([racers[0], racers[1]], track, events2);
  assert.equal(
    events2.filter((e) => e.type === 'ufo-bump').length,
    0,
    'active bumpCooldown should suppress redundant bump shakes/events',
  );
  assert.ok(Math.abs(racers[1].lateral - racers[0].lateral) > 1.0, 'overlap separation should still hold');
});

test('higher levels increase rival skillFactor, speed class, and EMP hazard cycle frequency', () => {
  const track = buildBakedTrack(CIRCUITS['solar-canyon']);
  const lv1 = getLevelDefinition(1);
  const lv5 = getLevelDefinition(5);

  const racersLv1 = createInitialRacers(track, lv1);
  const racersLv5 = createInitialRacers(track, lv5);
  assert.ok(
    racersLv5[1].skillFactor > racersLv1[1].skillFactor,
    `Lv5 rival skillFactor (${racersLv5[1].skillFactor}) should exceed Lv1 (${racersLv1[1].skillFactor})`,
  );

  // Measure cruise speed under Lv1 vs Lv5
  const c1 = new Set<string>();
  const c5 = new Set<string>();
  const e1: PhysicsEvent[] = [];
  const e5: PhysicsEvent[] = [];
  for (let i = 0; i < 60; i++) {
    stepRacerPhysics(racersLv1[0], { throttle: 1, steer: 0, boostHeld: false, hopJustPressed: false }, track, i * 0.05, 0.05, c1, e1, lv1);
    stepRacerPhysics(racersLv5[0], { throttle: 1, steer: 0, boostHeld: false, hopJustPressed: false }, track, i * 0.05, 0.05, c5, e5, lv5);
  }
  assert.ok(
    racersLv5[0].speed > racersLv1[0].speed + 8,
    `Lv5 speed (${racersLv5[0].speed}) should clearly exceed Lv1 (${racersLv1[0].speed})`,
  );

  // Verify hazard cycle advances faster on Lv5 than Lv1
  const hz = track.def.hazards[0];
  let activeCountLv1 = 0;
  let activeCountLv5 = 0;
  for (let t = 0; t < 12; t += 0.1) {
    if (getHazardPhase(hz, t, lv1.hazardCycleSpeed).phase === 'active') activeCountLv1++;
    if (getHazardPhase(hz, t, lv5.hazardCycleSpeed).phase === 'active') activeCountLv5++;
  }
  assert.ok(
    activeCountLv5 > activeCountLv1,
    `Lv5 EMP hazards should be active more often (${activeCountLv5} vs ${activeCountLv1})`,
  );
});

test('jump launch ramps propel UFO skyward, moving EMP hazards oscillate, and Q/E side-dash bursts laterally', () => {
  const track = buildBakedTrack(CIRCUITS['glacier-spire']);
  const [player] = createInitialRacers(track, getLevelDefinition(2));
  const collected = new Set<string>();
  const events: PhysicsEvent[] = [];

  // Place player directly entering first jump ramp
  const ramp = track.def.jumpRamps[0];
  player.t = ramp.t - 0.001;
  player.lateral = ramp.lateral;
  player.speed = 70;
  stepRacerPhysics(
    player,
    { throttle: 1, steer: 0, boostHeld: false, hopJustPressed: false },
    track,
    1.0,
    0.05,
    collected,
    events,
    getLevelDefinition(2),
  );
  assert.ok(events.some((e) => e.type === 'ramp-launch'), 'entering jump ramp should emit ramp-launch');
  assert.ok(player.vy >= 18, `ramp should launch UFO strongly upward (vy=${player.vy})`);
  assert.ok(player.styleScore >= 150, 'ramp launch should award style points');

  // Verify moving EMP hazard sweeps laterally across road
  const movingHz = track.def.hazards.find((h) => (h.moveAmplitude ?? 0) > 1);
  assert.ok(movingHz, 'glacier-spire should have a moving EMP hazard');
  const latA = getHazardLateral(movingHz, 0.2, 1.0);
  const latB = getHazardLateral(movingHz, 1.8, 1.0);
  assert.ok(Math.abs(latB - latA) > 1.5, 'moving EMP hazard lateral position should sweep over time');

  // Verify Q/E side-dash bursts lateral velocity and sets cooldown
  player.hoverY = 0;
  player.vy = 0;
  player.lateral = 0;
  player.lateralVel = 0;
  stepRacerPhysics(
    player,
    { throttle: 1, steer: 0, boostHeld: false, hopJustPressed: false, dashDir: 1 },
    track,
    2.5,
    0.05,
    collected,
    events,
    getLevelDefinition(2),
  );
  assert.ok(events.some((e) => e.type === 'side-dash'), 'dashDir should emit side-dash event');
  assert.ok(player.lateralVel > 12, `side-dash should impart strong lateral burst (got ${player.lateralVel})`);
  assert.ok(player.dashCooldown > 0.4, 'side-dash should trigger cooldown');
});

test('holding Shift engages anti-grav air glide and Free Flight spawns solo craft with boosted freedom', () => {
  const track = buildBakedTrack(CIRCUITS['aether-ringway']);
  const lv5 = getLevelDefinition(7);

  // Compare falling descent with normal drop vs holding Shift (hover glide)
  const [normalDrop] = createInitialRacers(track, lv5, 'race');
  const [glideDrop] = createInitialRacers(track, lv5, 'race');
  normalDrop.hoverY = 8;
  normalDrop.vy = -1;
  glideDrop.hoverY = 8;
  glideDrop.vy = -1;

  const evA: PhysicsEvent[] = [];
  const evB: PhysicsEvent[] = [];
  for (let i = 0; i < 12; i++) {
    stepRacerPhysics(
      normalDrop,
      { throttle: 1, steer: 0, boostHeld: false, hopJustPressed: false, hopHeld: false },
      track,
      i * 0.05,
      0.05,
      new Set(),
      evA,
      lv5,
      'race',
    );
    stepRacerPhysics(
      glideDrop,
      { throttle: 1, steer: 0, boostHeld: false, hopJustPressed: false, hopHeld: true },
      track,
      i * 0.05,
      0.05,
      new Set(),
      evB,
      lv5,
      'race',
    );
  }
  assert.ok(
    glideDrop.hoverY > normalDrop.hoverY + 1.5,
    `holding Shift should glide gently and stay higher (${glideDrop.hoverY.toFixed(2)} vs ${normalDrop.hoverY.toFixed(2)})`,
  );

  // Verify Free Flight mode spawns solo UFO with 100% boost and stronger hop lift
  const freeRacers = createInitialRacers(track, lv5, 'free');
  assert.equal(freeRacers.length, 1, 'Free Flight should spawn solo player craft');
  assert.equal(freeRacers[0].boostEnergy, 100);
  const freeEvents: PhysicsEvent[] = [];
  stepRacerPhysics(
    freeRacers[0],
    { throttle: 1, steer: 0, boostHeld: false, hopJustPressed: true, hopHeld: true },
    track,
    0.05,
    0.05,
    new Set(),
    freeEvents,
    lv5,
    'free',
  );
  assert.ok(
    freeRacers[0].vy > PHYSICS_CONSTANTS.hopInitialVel * 1.15,
    'Free Flight hop should impart extra aerial lift',
  );
});

test('different levels spawn different UFO archetypes, and updrafts & warp tunnels fire lift/surge physics', () => {
  const lv3 = getLevelDefinition(3);
  const lv6 = getLevelDefinition(6);
  const lv8 = getLevelDefinition(8);

  const track3 = buildBakedTrack(CIRCUITS[lv3.circuitId]);
  const track6 = buildBakedTrack(CIRCUITS[lv6.circuitId]);
  const track8 = buildBakedTrack(CIRCUITS[lv8.circuitId]);

  const racers3 = createInitialRacers(track3, lv3, 'race');
  const racers6 = createInitialRacers(track6, lv6, 'race');
  const racers8 = createInitialRacers(track8, lv8, 'race');

  assert.equal(racers3[0].chassisVariant, 'spore-jelly');
  assert.equal(racers6[0].chassisVariant, 'cyber-spinner');
  assert.equal(racers8[0].chassisVariant, 'quantum-seraph');
  assert.notEqual(racers3[1].chassisVariant, racers6[1].chassisVariant, 'rival UFO types should vary across levels');

  // Test Gravity Updraft Geyser lift on Biolume Jungle
  const player3 = racers3[0];
  const updraft = track3.def.updrafts[0];
  const ev3: PhysicsEvent[] = [];
  player3.t = updraft.t - 0.0005;
  player3.lateral = updraft.lateral;
  player3.speed = 68;
  stepRacerPhysics(
    player3,
    { throttle: 1, steer: 0, boostHeld: false, hopJustPressed: false },
    track3,
    1.0,
    0.05,
    new Set(),
    ev3,
    lv3,
  );
  assert.ok(ev3.some((e) => e.type === 'updraft-lift'), 'entering updraft geyser should emit updraft-lift');
  assert.ok(player3.vy >= 20, `updraft should strongly lift UFO (vy=${player3.vy})`);
  assert.ok(player3.styleScore >= 120, 'updraft should award +120 style points');

  // Test Hyper-Warp Speed Tunnel surge on Neon Megacity
  const player6 = racers6[0];
  const tunnel = track6.def.warpTunnels[0];
  const ev6: PhysicsEvent[] = [];
  player6.t = tunnel.tStart + 0.005;
  player6.lateral = 0;
  player6.speed = 62;
  player6.boostEnergy = 40;
  stepRacerPhysics(
    player6,
    { throttle: 1, steer: 0, boostHeld: false, hopJustPressed: false },
    track6,
    2.0,
    0.05,
    new Set(),
    ev6,
    lv6,
  );
  assert.ok(ev6.some((e) => e.type === 'warp-surge'), 'entering warp tunnel should emit warp-surge');
  assert.ok(player6.speed > 95, `warp tunnel should surge speed dramatically (speed=${player6.speed})`);
  assert.ok(player6.boostEnergy >= 75, 'warp tunnel should recharge plasma boost by +35%');
  assert.ok(player6.styleScore >= 200, 'warp tunnel should award +200 style points');
});


