import type { GameMode, HudSnapshot } from '../game/types';
import { formatOrdinal, formatRaceTime } from '../game/raceRules';
import { formatTargetGoal } from '../game/levels';

interface PauseModalProps {
  gameMode: GameMode;
  levelNumber: number;
  levelName: string;
  circuitName: string;
  lap: number;
  totalLaps: number;
  raceTime: number;
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
}

export function PauseModal({
  gameMode,
  levelNumber,
  levelName,
  circuitName,
  lap,
  totalLaps,
  raceTime,
  onResume,
  onRestart,
  onTitle,
}: PauseModalProps) {
  const isFree = gameMode === 'free';
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-modal-title"
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#120a14]/76 p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#1c1320] border border-[#f5c89a]/28 p-6 sm:p-8 shadow-[0_24px_64px_rgba(0,0,0,0.65)] flex flex-col gap-6">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-[#f59e42]">
            {isFree ? 'Free Flight' : `Level ${levelNumber}: ${levelName}`} · {circuitName}
          </p>
          <h2
            id="pause-modal-title"
            className="font-display font-extrabold text-3xl text-[#fff6eb] mt-1"
          >
            {isFree ? 'Flight Paused' : 'Race Paused'}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#130d17] border border-[#f5c89a]/16 px-4 py-3">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-[#f5cfa8]/70">
              Current Lap
            </span>
            <span className="font-display font-bold text-2xl text-[#fff6eb] font-mono-num">
              {isFree ? `Lap ${lap}` : `${lap} / ${totalLaps}`}
            </span>
          </div>
          <div className="rounded-xl bg-[#130d17] border border-[#f5c89a]/16 px-4 py-3">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-[#f5cfa8]/70">
              Elapsed Time
            </span>
            <span className="font-mono-num font-bold text-2xl text-[#2df9f2]">
              {formatRaceTime(raceTime)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3.5 px-5 rounded-xl bg-[#2df9f2] hover:bg-[#5dfcf7] text-[#111521] font-display font-extrabold text-base tracking-wider uppercase cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd166]"
          >
            Resume Race
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-5 rounded-xl bg-[#2a1d30] hover:bg-[#382740] border border-[#f5c89a]/22 text-[#fff6eb] font-semibold text-sm cursor-pointer transition-colors"
          >
            Restart Level
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="w-full py-3 px-5 rounded-xl bg-transparent hover:bg-white/6 text-[#f5cfa8]/85 font-semibold text-sm cursor-pointer transition-colors"
          >
            Back to Title
          </button>
        </div>
      </div>
    </div>
  );
}

interface ResultsModalProps {
  hud: HudSnapshot;
  onNextLevel: () => void;
  onRestart: () => void;
  onTitle: () => void;
}

export function ResultsModal({
  hud,
  onNextLevel,
  onRestart,
  onTitle,
}: ResultsModalProps) {
  const hasNextLevel = hud.levelNumber < hud.maxLevel;
  const canAdvance = hud.levelCleared && hasNextLevel;
  const heading = hud.levelCleared
    ? hud.levelNumber === hud.maxLevel
      ? 'Championship Champion!'
      : `Level ${hud.levelNumber} Cleared`
    : `Target Missed · ${formatOrdinal(hud.rank)}`;

  const statusLine = hud.levelCleared
    ? hasNextLevel
      ? `Level ${hud.levelNumber + 1} awaits — faster class and tougher lines ahead`
      : 'You conquered all 8 levels of the Saucer GP Galactic Tour'
    : `Goal: ${formatTargetGoal(hud.targetRank)} to earn level mastery`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="results-modal-title"
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#120a14]/82 p-4"
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#1c1320] border border-[#f5c89a]/30 p-6 sm:p-8 shadow-[0_24px_64px_rgba(0,0,0,0.7)] flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-[#f59e42]">
              Level {hud.levelNumber}: {hud.levelName} · {hud.difficultyTier}
            </p>
            <h2
              id="results-modal-title"
              className="font-display font-extrabold text-3xl text-[#fff6eb] mt-1"
            >
              {heading}
            </h2>
            <p className="text-xs text-[#f5cfa8]/85 mt-1">{statusLine}</p>
          </div>
          <span
            className={`font-display font-extrabold text-4xl font-mono-num shrink-0 ${
              hud.levelCleared ? 'text-[#ffd166]' : 'text-[#f5cfa8]'
            }`}
          >
            {formatOrdinal(hud.rank)}
          </span>
        </div>

        {/* 3 Mastery Stat Tiles */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-[#130d17] border border-[#f5c89a]/16 px-3.5 py-3">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#f5cfa8]/70">
              Total Time
            </span>
            <span className="font-mono-num font-bold text-lg text-[#fff6eb]">
              {formatRaceTime(hud.raceTime)}
            </span>
          </div>
          <div className="rounded-xl bg-[#130d17] border border-[#f5c89a]/16 px-3.5 py-3">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#f5cfa8]/70">
              Best Lap
            </span>
            <span className="font-mono-num font-bold text-lg text-[#2df9f2]">
              {hud.bestLapTime !== null ? formatRaceTime(hud.bestLapTime) : '--:--.-'}
            </span>
          </div>
          <div className="rounded-xl bg-[#130d17] border border-[#f5c89a]/16 px-3.5 py-3">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#f5cfa8]/70">
              Rings / Pts
            </span>
            <span className="font-mono-num font-bold text-lg text-[#ffd166]">
              {hud.ringsCollected} · {hud.styleScore}
            </span>
          </div>
        </div>

        {/* Standings Table */}
        <div className="rounded-xl bg-[#130d17] border border-[#f5c89a]/14 overflow-hidden">
          <div className="grid grid-cols-[44px_1fr_84px] px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-[#f5cfa8]/65 border-b border-[#f5c89a]/12">
            <span>Pos</span>
            <span>Pilot</span>
            <span className="text-right">Status</span>
          </div>
          <div className="divide-y divide-[#f5c89a]/10">
            {hud.standings.map((entry) => (
              <div
                key={entry.id}
                className={`grid grid-cols-[44px_1fr_84px] items-center px-3.5 py-2 text-sm ${
                  entry.isPlayer
                    ? 'bg-[#2df9f2]/12 text-[#fff6eb] font-bold'
                    : 'text-[#f7e7d8]/85'
                }`}
              >
                <span className="font-mono-num font-bold text-[#ffd166]">
                  {formatOrdinal(entry.rank)}
                </span>
                <span className="flex items-center gap-2 truncate">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: entry.hullColorHex }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{entry.name}</span>
                </span>
                <span className="text-right font-mono-num text-xs text-[#f5cfa8]/80">
                  {entry.finishTime !== null ? formatRaceTime(entry.finishTime) : 'RACING'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {canAdvance ? (
            <>
              <button
                type="button"
                data-start="true"
                onClick={onNextLevel}
                className="flex-1 py-3.5 px-5 rounded-xl bg-[#2df9f2] hover:bg-[#5dfcf7] text-[#111521] font-display font-extrabold text-base tracking-wider uppercase cursor-pointer transition-colors whitespace-nowrap"
              >
                Next Level ({hud.levelNumber + 1})
              </button>
              <button
                type="button"
                onClick={onRestart}
                className="py-3.5 px-4 rounded-xl bg-[#2a1d30] hover:bg-[#382740] border border-[#f5c89a]/22 text-[#fff6eb] font-semibold text-sm cursor-pointer transition-colors whitespace-nowrap"
              >
                Replay
              </button>
            </>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onRestart}
              className="flex-1 py-3.5 px-5 rounded-xl bg-[#2df9f2] hover:bg-[#5dfcf7] text-[#111521] font-display font-extrabold text-base tracking-wider uppercase cursor-pointer transition-colors whitespace-nowrap"
            >
              {hud.levelCleared ? 'Race Again' : 'Try Again'}
            </button>
          )}
          <button
            type="button"
            onClick={onTitle}
            className="py-3.5 px-4 rounded-xl bg-[#2a1d30] hover:bg-[#382740] border border-[#f5c89a]/22 text-[#fff6eb] font-semibold text-sm cursor-pointer transition-colors whitespace-nowrap"
          >
            Levels
          </button>
        </div>
      </div>
    </div>
  );
}
