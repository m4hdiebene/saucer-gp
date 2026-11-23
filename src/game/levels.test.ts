import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEVELS,
  MAX_LEVEL,
  computeNextUnlockedLevel,
  formatTargetGoal,
  getDifficultyBadgeTone,
  getLevelCircuitId,
  getLevelDefinition,
  isLevelCleared,
} from './levels';

test('8-level galactic tour escalates difficulty strictly across 8 unique circuits and 8 featured UFO classes', () => {
  assert.equal(LEVELS.length, 8);
  assert.equal(MAX_LEVEL, 8);

  const uniqueCircuits = new Set(LEVELS.map((l) => l.circuitId));
  assert.equal(uniqueCircuits.size, 8, '8 levels should span all 8 unique planetary worlds');

  const uniquePlayerUfos = new Set(LEVELS.map((l) => l.featuredPlayerChassis));
  assert.equal(uniquePlayerUfos.size, 8, 'each level should feature a distinct signature UFO class');

  for (let i = 1; i < LEVELS.length; i++) {
    const prev = LEVELS[i - 1];
    const curr = LEVELS[i];
    assert.equal(curr.number, prev.number + 1);
    assert.ok(
      curr.aiPaceScale > prev.aiPaceScale,
      `Level ${curr.number} aiPaceScale (${curr.aiPaceScale}) should exceed Level ${prev.number} (${prev.aiPaceScale})`,
    );
    assert.ok(
      curr.aiBoostAggression > prev.aiBoostAggression,
      `Level ${curr.number} aiBoostAggression should exceed Level ${prev.number}`,
    );
    assert.ok(
      curr.aiLaunchRampSec < prev.aiLaunchRampSec,
      `Level ${curr.number} aiLaunchRampSec should tighten vs Level ${prev.number}`,
    );
    assert.ok(
      curr.hazardCycleSpeed > prev.hazardCycleSpeed,
      `Level ${curr.number} hazardCycleSpeed should exceed Level ${prev.number}`,
    );
    assert.ok(
      curr.hazardWidthScale > prev.hazardWidthScale,
      `Level ${curr.number} hazardWidthScale should exceed Level ${prev.number}`,
    );
    assert.ok(
      curr.speedClassScale > prev.speedClassScale,
      `Level ${curr.number} speedClassScale should exceed Level ${prev.number}`,
    );
    assert.ok(curr.laps >= prev.laps, `Level ${curr.number} laps should not decrease`);
    assert.ok(curr.targetRank <= prev.targetRank, `Level ${curr.number} targetRank should be equal or stricter`);
  }

  // Level 1 is beginner-friendly; Level 8 Master demands 1st place over 4 laps
  assert.equal(getLevelDefinition(1).targetRank, 3);
  assert.equal(getLevelDefinition(1).laps, 2);
  assert.equal(getLevelDefinition(8).targetRank, 1);
  assert.equal(getLevelDefinition(8).laps, 4);
  assert.equal(getLevelDefinition(8).tier, 'Master');
  assert.equal(getDifficultyBadgeTone('Master'), '#c084fc');
  assert.equal(getLevelDefinition(99).number, MAX_LEVEL);
  assert.equal(getLevelDefinition(0).number, 1);
});

test('level clear rules and unlock progression obey targetRank and clamp cleanly', () => {
  // Level 1: Top 3 clears
  assert.equal(isLevelCleared(1, 3), true);
  assert.equal(isLevelCleared(1, 4), false);
  assert.equal(computeNextUnlockedLevel(1, 1, 3), 2);
  assert.equal(computeNextUnlockedLevel(1, 1, 4), 1);

  // Replaying an earlier level never regresses unlocked progress
  assert.equal(computeNextUnlockedLevel(6, 1, 1), 6);
  assert.equal(computeNextUnlockedLevel(6, 1, 4), 6);

  // Level 5 requires Top 2
  assert.equal(isLevelCleared(5, 2), true);
  assert.equal(isLevelCleared(5, 3), false);
  assert.equal(computeNextUnlockedLevel(5, 5, 2), 6);
  assert.equal(computeNextUnlockedLevel(5, 5, 3), 5);

  // Level 8 requires 1st and clamps at MAX_LEVEL
  assert.equal(isLevelCleared(8, 1), true);
  assert.equal(isLevelCleared(8, 2), false);
  assert.equal(computeNextUnlockedLevel(8, 8, 1), MAX_LEVEL);

  // Formatting & circuit lookup helpers
  assert.equal(formatTargetGoal(1), 'Win 1st Place');
  assert.equal(formatTargetGoal(3), 'Finish Top 3');
  assert.equal(getLevelCircuitId(1), 'solar-canyon');
  assert.equal(getLevelCircuitId(2), 'glacier-spire');
  assert.equal(getLevelCircuitId(3), 'biolume-jungle');
  assert.equal(getLevelCircuitId(4), 'nebula-ridge');
  assert.equal(getLevelCircuitId(5), 'obsidian-caldera');
  assert.equal(getLevelCircuitId(6), 'neon-megacity');
  assert.equal(getLevelCircuitId(7), 'aether-ringway');
  assert.equal(getLevelCircuitId(8), 'quantum-prism');
});
