import { useEffect, useRef, useState } from 'react';
import type { HudSnapshot } from '../game/types';
import { formatOrdinal, formatRaceTime } from '../game/raceRules';
import { getDifficultyBadgeTone } from '../game/levels';

interface HudOverlayProps {
  hud: HudSnapshot;
  onToggleCamera: () => void;
  onToggleMute: () => void;
  onRestart: () => void;
  onPause: () => void;
}

export function HudOverlay({
  hud,
  onToggleCamera,
  onToggleMute,
  onRestart,
  onPause,
}: HudOverlayProps) {
  // Trailing ghost bar for plasma boost consumption
  const [ghostBoost, setGhostBoost] = useState(hud.boostEnergy);
  const ghostRef = useRef(hud.boostEnergy);

  useEffect(() => {
    if (hud.boostEnergy >= ghostRef.current) {
      ghostRef.current = hud.boostEnergy;
      setGhostBoost(hud.boostEnergy);
      return;
    }
    const timer = window.setTimeout(() => {
      ghostRef.current = hud.boostEnergy;
      setGhostBoost(hud.boostEnergy);
    }, 260);
    return () => window.clearTimeout(timer);
  }, [hud.boostEnergy]);

  const minimapPath = hud.minimapPoints
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${(pt.x * 100).toFixed(1)} ${(pt.y * 100).toFixed(1)}`)
    .join(' ') + ' Z';

  return (
    <div
      className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 sm:p-6"
      aria-label="Race HUD"
    >
      {/* TOP PERIMETER ROW */}
      <div className="flex items-start justify-between gap-4">
        {/* TOP-LEFT: Level, Position, Lap, Timer, Rings */}
        <section
          aria-label="Race standings and lap timer"
          className="flex items-start gap-4 sm:gap-5 px-4 py-3 rounded-xl bg-[#18101c]/82 border border-[#f5c89a]/22 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
        >
          {/* Active Level & Tier */}
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#f5cfa8]/75">
              LVL
            </span>
            <span
              data-testid="hud-level"
              className="font-display font-extrabold text-3xl sm:text-4xl leading-none text-[#fff6eb] hud-stroke-num font-mono-num"
            >
              {hud.levelNumber}
            </span>
            <span
              className="text-[10px] font-bold uppercase tracking-wider mt-1"
              style={{ color: getDifficultyBadgeTone(hud.difficultyTier) }}
            >
              {hud.difficultyTier}
            </span>
            <span
              data-testid="hud-craft"
              className="text-[10px] font-semibold text-[#2df9f2]/90 tracking-wide whitespace-nowrap"
            >
              {hud.playerCraftName}
            </span>
          </div>

          <div className="w-px self-stretch bg-[#f5c89a]/20" aria-hidden="true" />

          {/* Rank Hero (or Free Flight / Altitude indicator) */}
          {hud.gameMode === 'free' ? (
            <div className="flex flex-col">
              <span className="text-[11px] font-bold tracking-widest uppercase text-[#f5cfa8]/75">
                MODE
              </span>
              <span
                data-testid="hud-mode"
                className="font-display font-extrabold text-2xl sm:text-3xl leading-none text-[#ffd166] hud-stroke-num mt-0.5"
              >
                FREE
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2df9f2] mt-1 font-mono-num">
                ALT {hud.altitudeMeters.toFixed(1)}M
              </span>
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="text-[11px] font-bold tracking-widest uppercase text-[#f5cfa8]/75">
                POS
              </span>
              <div className="flex items-baseline gap-1">
                <span
                  data-testid="hud-rank"
                  className="font-display font-extrabold text-3xl sm:text-4xl leading-none text-[#ffd166] hud-stroke-num font-mono-num"
                >
                  {formatOrdinal(hud.rank)}
                </span>
                <span className="text-xs font-bold text-[#f5cfa8]/70 font-mono-num">
                  /{hud.totalRacers}
                </span>
              </div>
              {hud.altitudeMeters >= 1.5 && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2df9f2] mt-1 font-mono-num">
                  AIR {hud.altitudeMeters.toFixed(1)}M
                </span>
              )}
            </div>
          )}

          <div className="w-px self-stretch bg-[#f5c89a]/20" aria-hidden="true" />

          {/* Lap Counter + 3 Checkpoint Sockets */}
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#f5cfa8]/75">
              LAP
            </span>
            <div className="flex items-baseline gap-1">
              <span
                data-testid="hud-lap"
                className="font-display font-extrabold text-3xl sm:text-4xl leading-none text-[#fff6eb] hud-stroke-num font-mono-num"
              >
                {hud.lap}
              </span>
              <span className="text-sm font-bold text-[#f5cfa8]/75 font-mono-num">
                {hud.gameMode === 'free' ? '∞' : `/${hud.totalLaps}`}
              </span>
            </div>
            <div
              className="flex items-center gap-1 mt-1"
              aria-label={`Checkpoints ${hud.checkpointsCleared} of 3`}
            >
              {[1, 2, 3].map((cp) => (
                <span
                  key={cp}
                  className={`h-1.5 w-4 rounded-xs ${
                    hud.checkpointsCleared >= cp
                      ? 'bg-[#2df9f2]'
                      : 'bg-[#f5cfa8]/22'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="w-px self-stretch bg-[#f5c89a]/20 hidden sm:block" aria-hidden="true" />

          {/* Timer + Rings & Points Counter */}
          <div className="hidden sm:flex flex-col justify-between gap-1.5">
            <div>
              <span className="block text-[10px] font-bold tracking-widest uppercase text-[#f5cfa8]/70">
                TIME
              </span>
              <span
                data-testid="hud-time"
                className="font-mono-num text-lg font-bold leading-none text-[#fff6eb]"
              >
                {formatRaceTime(hud.raceTime)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#ffd166] font-mono-num">
              {/* Custom inline SVG matching in-world Energy Ring */}
              <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
                <circle cx="12" cy="12" r="9" fill="none" stroke="#18101c" strokeWidth="5" />
                <circle cx="12" cy="12" r="9" fill="none" stroke="#ffd166" strokeWidth="2.8" />
                <polygon points="12,7 15,12 12,17 9,12" fill="#ffffff" />
              </svg>
              <span data-testid="hud-rings">{hud.ringsCollected}</span>
              <span className="text-[#f5cfa8]/50">·</span>
              <span data-testid="hud-score" className="text-[#2df9f2]">
                {hud.styleScore} PTS
              </span>
            </div>
          </div>
        </section>

        {/* TOP-RIGHT: Utility Square Icon Buttons + Vector Minimap */}
        <div className="flex flex-col items-end gap-2.5">
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleCamera();
              }}
              aria-label={`Switch camera view (currently ${hud.cameraMode})`}
              title="Camera [C]"
              className="h-10 w-10 flex items-center justify-center rounded-lg border border-[#f5c89a]/25 bg-[#18101c]/85 text-[#fff4e6] hover:border-[#2df9f2]/80 hover:text-[#2df9f2] transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" />
              </svg>
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              aria-label={hud.muted ? 'Unmute audio' : 'Mute audio'}
              title="Mute [M]"
              className="h-10 w-10 flex items-center justify-center rounded-lg border border-[#f5c89a]/25 bg-[#18101c]/85 text-[#fff4e6] hover:border-[#2df9f2]/80 hover:text-[#2df9f2] transition-colors cursor-pointer"
            >
              {hud.muted ? (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <line x1="22" y1="9" x2="16" y2="15" />
                  <line x1="16" y1="9" x2="22" y2="15" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onRestart();
              }}
              aria-label="Restart race"
              title="Restart [R]"
              className="h-10 w-10 flex items-center justify-center rounded-lg border border-[#f5c89a]/25 bg-[#18101c]/85 text-[#fff4e6] hover:border-[#ffd166]/80 hover:text-[#ffd166] transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              aria-label="Pause race"
              title="Pause [P / Esc]"
              className="h-10 w-10 flex items-center justify-center rounded-lg border border-[#f5c89a]/25 bg-[#18101c]/85 text-[#fff4e6] hover:border-[#2df9f2]/80 hover:text-[#2df9f2] transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            </button>
          </div>

          {/* Live Vector Track Minimap */}
          <div
            aria-hidden="true"
            className="hidden sm:flex items-center justify-center w-28 h-28 rounded-xl bg-[#18101c]/78 border border-[#f5c89a]/20 p-1.5"
          >
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <path
                d={minimapPath}
                fill="none"
                stroke="#0f0a12"
                strokeWidth="7.5"
                strokeLinejoin="round"
              />
              <path
                d={minimapPath}
                fill="none"
                stroke="#f5cfa8"
                strokeOpacity="0.6"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              {hud.minimapBlips
                .filter((b) => !b.isPlayer)
                .map((b) => (
                  <circle
                    key={b.id}
                    cx={b.x * 100}
                    cy={b.y * 100}
                    r="3.2"
                    fill={b.color}
                    stroke="#140d18"
                    strokeWidth="1.2"
                  />
                ))}
              {hud.minimapBlips
                .filter((b) => b.isPlayer)
                .map((b) => (
                  <g key={b.id}>
                    <circle
                      cx={b.x * 100}
                      cy={b.y * 100}
                      r="5.6"
                      fill="none"
                      stroke="#2df9f2"
                      strokeWidth="1.8"
                    />
                    <circle
                      cx={b.x * 100}
                      cy={b.y * 100}
                      r="3.6"
                      fill="#ffffff"
                    />
                  </g>
                ))}
            </svg>
          </div>
        </div>
      </div>

      {/* CENTER-TOP TRANSIENT EVENT CALLOUT (Only rendered when triggered in active play) */}
      {hud.phase === 'playing' && hud.callout && (
        <div
          key={hud.callout.id}
          className="fixed top-[29%] left-1/2 -translate-x-1/2 pointer-events-none text-center"
        >
          <span
            className={`font-display font-extrabold text-3xl sm:text-5xl tracking-wider uppercase hud-stroke-num ${
              hud.callout.tone === 'cyan'
                ? 'text-[#2df9f2]'
                : hud.callout.tone === 'amber'
                ? 'text-[#ffd166]'
                : 'text-[#ff5964]'
            }`}
          >
            {hud.callout.text}
          </span>
        </div>
      )}

      {/* BOTTOM PERIMETER ROW: Quiet control hint left + Speedometer & Boost Bar right */}
      <div className="flex items-end justify-between gap-4">
        <p className="hidden md:block px-3 py-1.5 rounded-lg bg-[#18101c]/80 border border-[#f5c89a]/18 text-xs font-medium text-[#f9e5cf]/92">
          WASD Steer · Space Boost · Shift Hop/Glide · Q/E Dash · C Cam
        </p>

        {/* BOTTOM-RIGHT: Speedometer, Plasma Boost Rally Bar, Hop/Glide & Side-Dash Sockets */}
        <section
          aria-label="Speed and thruster telemetry"
          className="ml-auto flex items-end gap-4 px-4 py-3 rounded-xl bg-[#18101c]/84 border border-[#f5c89a]/22 shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
        >
          {/* Boost Energy, Hop/Glide & Side-Dash Column */}
          <div className="flex flex-col gap-2 min-w-[164px] sm:min-w-[192px]">
            <div className="flex items-center justify-between text-[11px] font-bold tracking-wider uppercase">
              <span className={hud.isBoosting ? 'text-[#2df9f2]' : 'text-[#f5cfa8]/80'}>
                PLASMA BOOST
              </span>
              <span className="font-mono-num text-[#fff6eb]">{hud.boostEnergy}%</span>
            </div>

            {/* Continuous Rally Bar with trailing drain ghost */}
            <div className="relative h-3 w-full rounded-md bg-[#0e0912] border border-[#f5c89a]/25 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-[#ffd166]/65 transition-transform duration-200 origin-left"
                style={{
                  width: '100%',
                  transform: `scaleX(${Math.max(0, Math.min(1, ghostBoost / 100))})`,
                }}
              />
              <div
                data-testid="hud-boost-bar"
                className={`absolute inset-y-0 left-0 origin-left transition-transform duration-75 ${
                  hud.isBoosting ? 'bg-[#6cfdf9]' : 'bg-[#2df9f2]'
                }`}
                style={{
                  width: '100%',
                  transform: `scaleX(${Math.max(0, Math.min(1, hud.boostEnergy / 100))})`,
                }}
              />
            </div>

            {/* Hop/Glide & Side-Dash Ready Indicators */}
            <div className="flex items-center justify-between gap-3 text-[10px] font-bold tracking-wider uppercase">
              <span className="flex items-center gap-1">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    hud.hopReady ? 'bg-[#ffd166]' : 'bg-[#f5cfa8]/25'
                  }`}
                />
                <span className={hud.hopReady ? 'text-[#ffd166]' : 'text-[#f5cfa8]/50'}>
                  HOP/GLIDE [SHIFT]
                </span>
              </span>
              <span className="flex items-center gap-1">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    hud.dashReady ? 'bg-[#2df9f2]' : 'bg-[#f5cfa8]/25'
                  }`}
                />
                <span className={hud.dashReady ? 'text-[#2df9f2]' : 'text-[#f5cfa8]/50'}>
                  DASH [Q/E]
                </span>
              </span>
            </div>
          </div>

          <div className="w-px self-stretch bg-[#f5c89a]/20" aria-hidden="true" />

          {/* Hero Speed Readout */}
          <div className="flex flex-col items-end min-w-[78px]">
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#f5cfa8]/75">
              KM/H
            </span>
            <span
              data-testid="hud-speed"
              className={`font-display font-extrabold text-4xl sm:text-5xl leading-none font-mono-num hud-stroke-num ${
                hud.isBoosting ? 'text-[#2df9f2]' : 'text-[#fff6eb]'
              }`}
            >
              {hud.speedKmh}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
