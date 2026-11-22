import type { GameMode } from '../game/types';
import { CIRCUITS } from '../game/track';
import {
  LEVELS,
  formatTargetGoal,
  getDifficultyBadgeTone,
  getLevelDefinition,
} from '../game/levels';

interface TitleScreenProps {
  levelNumber: number;
  gameMode: GameMode;
  clearedLevels: number[];
  muted: boolean;
  onSelectLevel: (levelNumber: number) => void;
  onSelectMode: (mode: GameMode) => void;
  onStart: () => void;
  onToggleMute: () => void;
}

export function TitleScreen({
  levelNumber,
  gameMode,
  clearedLevels,
  muted,
  onSelectLevel,
  onSelectMode,
  onStart,
  onToggleMute,
}: TitleScreenProps) {
  const activeLevel = getLevelDefinition(levelNumber);
  const activeCircuit = CIRCUITS[activeLevel.circuitId];
  const tierColor = getDifficultyBadgeTone(activeLevel.tier);
  const isFree = gameMode === 'free';

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 sm:p-10">
      {/* Subtle left-side contrast scrim so typography reads cleanly over live 3D sky */}
      <div
        aria-hidden="true"
        className="fixed inset-y-0 left-0 w-full sm:w-[58%] pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(16, 12, 24, 0.9) 0%, rgba(16, 12, 24, 0.6) 64%, rgba(16, 12, 24, 0) 100%)',
        }}
      />

      {/* Top Row: Minimal Mute toggle on top-right */}
      <div className="relative z-10 flex justify-end">
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          className="pointer-events-auto h-11 w-11 flex items-center justify-center rounded-lg border border-[#f5c89a]/25 bg-[#1b121c]/85 text-[#fff4e6] hover:border-[#2df9f2]/70 hover:text-[#2df9f2] focus-visible:outline-2 focus-visible:outline-[#2df9f2] transition-colors cursor-pointer"
        >
          {muted ? (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="22" y1="9" x2="16" y2="15" />
              <line x1="16" y1="9" x2="22" y2="15" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </button>
      </div>

      {/* Main Left-Aligned Title Lockup, 8-Level Selector & Mode Toggle */}
      <main className="relative z-10 max-w-md my-auto flex flex-col items-start gap-5">
        {/* Bespoke Inline SVG Title Emblem */}
        <div className="w-full max-w-[376px]">
          <svg
            viewBox="0 0 420 150"
            className="w-full h-auto overflow-visible"
            role="img"
            aria-label="Saucer GP"
          >
            <path
              d="M 18 58 Q 165 8 388 38"
              fill="none"
              stroke="#2df9f2"
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.88"
            />
            <path
              d="M 48 68 Q 185 26 365 48"
              fill="none"
              stroke="#ffb347"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="10 8"
              opacity="0.75"
            />

            <g transform="translate(274, 14) rotate(-8)">
              <ellipse cx="48" cy="24" rx="44" ry="11" fill="#16101b" stroke="#2df9f2" strokeWidth="2.5" />
              <ellipse cx="48" cy="21" rx="34" ry="7.5" fill="#e8edf5" />
              <path d="M 28 20 C 31 5, 65 5, 68 20 Z" fill="#63f8f2" stroke="#16101b" strokeWidth="2" />
              <ellipse cx="42" cy="14" rx="7" ry="2.5" fill="#ffffff" opacity="0.8" />
              <circle cx="22" cy="24" r="2.5" fill="#ffb347" />
              <circle cx="48" cy="27" r="2.5" fill="#2df9f2" />
              <circle cx="74" cy="24" r="2.5" fill="#ffb347" />
            </g>

            <text
              x="4"
              y="110"
              fontFamily="'Oxanium', sans-serif"
              fontWeight="800"
              fontSize="66"
              letterSpacing="2"
              fill="#fff7ed"
              stroke="#190e19"
              strokeWidth="8"
              paintOrder="stroke fill"
            >
              SAUCER
            </text>
            <text
              x="294"
              y="110"
              fontFamily="'Oxanium', sans-serif"
              fontWeight="800"
              fontSize="66"
              letterSpacing="1"
              fill="#2df9f2"
              stroke="#190e19"
              strokeWidth="8"
              paintOrder="stroke fill"
            >
              GP
            </text>

            <rect x="6" y="122" width="112" height="4" rx="2" fill="#f59e42" />
            <text
              x="130"
              y="129"
              fontFamily="'Plus Jakarta Sans', sans-serif"
              fontWeight="600"
              fontSize="13.5"
              letterSpacing="2.4"
              fill="#f7d7b8"
            >
              GALACTIC ANTI-GRAVITY TOUR
            </text>
          </svg>
        </div>

        {/* 8-Level Freely Selectable Tour + Mode Toggle */}
        <div className="pointer-events-auto flex flex-col gap-2.5 w-full max-w-[416px]">
          <div className="flex items-baseline justify-between text-xs font-semibold">
            <span className="text-[#f5cfa8]/90 tracking-wide">
              8 Levels · 5 Planetary Worlds
            </span>
            <span className="text-[#f5cfa8]/75 font-mono-num">
              {clearedLevels.length}/{LEVELS.length} Cleared
            </span>
          </div>

          <div
            role="group"
            aria-label="Level selection"
            className="grid grid-cols-4 gap-1.5 p-1.5 rounded-xl bg-[#161020]/92 border border-[#f5c89a]/22"
          >
            {LEVELS.map((lvl) => {
              const active = lvl.number === levelNumber;
              const cleared = clearedLevels.includes(lvl.number);
              return (
                <button
                  key={lvl.number}
                  type="button"
                  data-testid={`level-btn-${lvl.number}`}
                  onClick={() => onSelectLevel(lvl.number)}
                  aria-pressed={active}
                  aria-label={`Level ${lvl.number}: ${lvl.name} (${lvl.tier})`}
                  className={`py-2 px-2 rounded-lg text-xs font-display font-bold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-[#2df9f2] flex items-center justify-center gap-1 cursor-pointer ${
                    active
                      ? 'bg-[#f59e42] text-[#1a1017]'
                      : 'bg-transparent text-[#f7e7d8]/88 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="font-mono-num">LV {lvl.number}</span>
                  {cleared && (
                    <svg
                      viewBox="0 0 20 20"
                      className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-[#1a1017]' : 'text-[#2df9f2]'}`}
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 111.414-1.42l2.543 2.544 6.543-6.544a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mode Toggle: Race vs Free Flight */}
          <div
            role="group"
            aria-label="Flight mode"
            className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#161020]/90 border border-[#f5c89a]/20"
          >
            <button
              type="button"
              data-testid="mode-race"
              onClick={() => onSelectMode('race')}
              aria-pressed={!isFree}
              className={`py-2 px-3 rounded-lg text-xs font-display font-bold tracking-wider uppercase transition-colors cursor-pointer ${
                !isFree
                  ? 'bg-[#2df9f2] text-[#111521]'
                  : 'text-[#f7e7d8]/80 hover:bg-white/8 hover:text-white'
              }`}
            >
              GP Race · 6 UFOs
            </button>
            <button
              type="button"
              data-testid="mode-free"
              onClick={() => onSelectMode('free')}
              aria-pressed={isFree}
              className={`py-2 px-3 rounded-lg text-xs font-display font-bold tracking-wider uppercase transition-colors cursor-pointer ${
                isFree
                  ? 'bg-[#ffd166] text-[#18101c]'
                  : 'text-[#f7e7d8]/80 hover:bg-white/8 hover:text-white'
              }`}
            >
              Free Flight · Open
            </button>
          </div>

          {/* Clean unboxed level briefing & circuit details */}
          <div className="flex flex-col gap-0.5 hud-text-outline">
            <p className="text-sm font-semibold text-[#fff6eb]">
              Level {activeLevel.number}: {activeLevel.name}
              <span className="text-[#f5cfa8]/55 mx-1.5" aria-hidden="true">·</span>
              <span style={{ color: tierColor }}>{activeLevel.tier}</span>
            </p>
            <p className="text-xs text-[#f5cfa8]/88">
              {isFree
                ? `${activeCircuit.name} · Unlimited Laps · High-Lift Glide & Fast Boost`
                : `${activeCircuit.name} · ${activeLevel.laps} Laps · Goal: ${formatTargetGoal(activeLevel.targetRank)}`}
            </p>
          </div>
        </div>

        {/* Primary Start CTA */}
        <div className="pointer-events-auto flex items-center gap-4">
          <button
            type="button"
            data-start="true"
            onClick={onStart}
            className="px-8 py-4 rounded-xl bg-[#2df9f2] hover:bg-[#5dfcf7] active:translate-y-0.5 text-[#111521] font-display font-extrabold text-lg tracking-wider uppercase shadow-[0_6px_0_#0b7e84,0_14px_28px_rgba(0,0,0,0.45)] transition-transform cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd166] whitespace-nowrap"
          >
            {isFree ? 'Launch Free Flight' : `Start Level ${activeLevel.number}`}
          </button>
          <span className="text-xs font-medium text-[#f5cfa8]/85 hud-text-outline">
            Press Enter or Space
          </span>
        </div>
      </main>

      {/* Bottom Safe Margin: Single flat borderless control-hint line */}
      <footer className="relative z-10 flex items-center justify-between text-xs sm:text-sm text-[#f9e5cf]/90 hud-text-outline">
        <p className="font-medium tracking-wide">
          WASD / Arrows Steer &amp; Thrust · Space Boost · Shift Hop &amp; Air Glide · Q / E Side-Dash · C Camera · Esc Pause
        </p>
      </footer>
    </div>
  );
}
