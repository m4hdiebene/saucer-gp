import test from 'node:test';
import assert from 'node:assert/strict';
import { CIRCUITS, buildBakedTrack } from './track';
import {
  RACER_ROSTER,
  advanceLapProgress,
  computeStandings,
  createInitialRacers,
  formatOrdinal,
  formatRaceTime,
} from './raceRules';

test('checkpoint-gated lap progression prevents reversing over finish line', () => {
  const track = buildBakedTrack(CIRCUITS['solar-canyon']);
  const racers = createInitialRacers(track);
  const player = racers[0];
  player.t = 0.98;

  // Crossing finish line without checkpoints should NOT complete lap
  const cheat = advanceLapProgress(player, 0.98, 0.02, 5.0, 3);
  assert.equal(cheat.lapCompleted, false);
  assert.equal(player.lap, 1);

  // Passing checkpoints 1 -> 2 -> 3 in order then crossing finish line completes lap 1
  advanceLapProgress(player, 0.1, 0.3, 10.0, 3);
  advanceLapProgress(player, 0.3, 0.55, 16.0, 3);
  advanceLapProgress(player, 0.55, 0.85, 22.0, 3);
  const validLap = advanceLapProgress(player, 0.94, 0.03, 28.5, 3);

  assert.equal(validLap.lapCompleted, true);
  assert.equal(validLap.finishedRace, false);
  assert.equal(player.lap, 2);
  assert.equal(player.bestLapTime, 28.5);
});

test('finishing final lap marks racer finished and ranks by finishTime', () => {
  const track = buildBakedTrack(CIRCUITS['solar-canyon']);
  const racers = createInitialRacers(track);
  const [p, r1, r2] = racers;

  // Put r1 and p on final lap ready to cross
  r1.lap = 3;
  r1.maxCheckpoint = 3;
  r1.lapStartTime = 50;
  advanceLapProgress(r1, 0.95, 0.02, 74.0, 3);

  p.lap = 3;
  p.maxCheckpoint = 3;
  p.lapStartTime = 51;
  const finishEvt = advanceLapProgress(p, 0.96, 0.01, 76.5, 3);

  r2.lap = 3;
  r2.maxCheckpoint = 2;
  advanceLapProgress(r2, 0.55, 0.65, 76.5, 3);

  assert.equal(finishEvt.finishedRace, true);
  assert.equal(p.finished, true);

  const standings = computeStandings(racers);
  assert.equal(standings[0].id, r1.id);
  assert.equal(standings[1].id, p.id);
  assert.equal(standings[2].id, r2.id);
});

test('time and ordinal formatting produce clean tabular readouts', () => {
  assert.equal(formatRaceTime(0), '00:00.0');
  assert.equal(formatRaceTime(75.46), '01:15.4');
  assert.equal(formatOrdinal(1), '1ST');
  assert.equal(formatOrdinal(2), '2ND');
  assert.equal(formatOrdinal(3), '3RD');
  assert.equal(formatOrdinal(4), '4TH');
});

test('all 6 UFO racers have distinct bespoke chassis variants and unique racing numbers', () => {
  assert.equal(RACER_ROSTER.length, 6);
  const variants = new Set(RACER_ROSTER.map((r) => r.chassisVariant));
  const numbers = new Set(RACER_ROSTER.map((r) => r.raceNumber));
  assert.equal(variants.size, RACER_ROSTER.length, 'every racer should have a distinct chassisVariant');
  assert.equal(numbers.size, RACER_ROSTER.length, 'every racer should have a unique raceNumber');
});
