import { useCallback, useEffect, useRef, useState } from 'react';
import { SaucerGameEngine } from './game/engine';
import type { GameMode, HudSnapshot } from './game/types';
import { MAX_LEVEL } from './game/levels';
import { TitleScreen } from './components/TitleScreen';
import { HudOverlay } from './components/HudOverlay';
import { PauseModal, ResultsModal } from './components/Modals';

const INITIAL_HUD: HudSnapshot = {
  phase: 'title',
  gameMode: 'race',
  levelNumber: 1,
  levelName: 'Rookie Run',
  difficultyTier: 'Easy',
  targetRank: 3,
  unlockedLevel: 1,
  clearedLevels: [],
  maxLevel: MAX_LEVEL,
  levelCleared: false,
  newlyUnlockedLevel: null,
  circuitId: 'solar-canyon',
  circuitName: 'Solar Canyon',
  speedKmh: 0,
  rank: 4,
  totalRacers: 6,
  lap: 1,
  totalLaps: 2,
  checkpointsCleared: 0,
  raceTime: 0,
  bestLapTime: null,
  boostEnergy: 80,
  isBoosting: false,
  hopReady: true,
  dashReady: true,
  altitudeMeters: 0,
  ringsCollected: 0,
  styleScore: 0,
  cameraMode: 'chase',
  muted: false,
  callout: null,
  minimapPoints: [],
  minimapBlips: [],
  standings: [],
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SaucerGameEngine | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart') === '1';
    const levelParam = params.get('level');
    const initialLevel = levelParam ? parseInt(levelParam, 10) : undefined;
    const modeParam = params.get('mode');
    const initialMode: GameMode = modeParam === 'free' ? 'free' : 'race';

    const engine = new SaucerGameEngine(
      container,
      (snapshot) => {
        setHud(snapshot);
      },
      autostart ? 'playing' : 'title',
      initialLevel,
      initialMode,
    );
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleSelectLevel = useCallback((levelNumber: number) => {
    engineRef.current?.selectLevel(levelNumber);
  }, []);

  const handleSelectMode = useCallback((mode: GameMode) => {
    engineRef.current?.setGameMode(mode);
  }, []);

  const handleNextLevel = useCallback(() => {
    engineRef.current?.startNextLevel();
  }, []);

  const handleStart = useCallback(() => {
    engineRef.current?.startRace();
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resumeRace();
  }, []);

  const handleRestart = useCallback(() => {
    engineRef.current?.restartRace();
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pauseRace();
  }, []);

  const handleTitle = useCallback(() => {
    engineRef.current?.returnToTitle();
  }, []);

  const handleToggleCamera = useCallback(() => {
    engineRef.current?.toggleCameraMode();
  }, []);

  const handleToggleMute = useCallback(() => {
    engineRef.current?.toggleMute();
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#1b141a]">
      {/* Isolated WebGL mount container — never re-renders or remounts on HUD updates */}
      <div ref={mountRef} className="fixed inset-0 w-full h-full" />

      {hud.phase === 'title' && (
        <TitleScreen
          levelNumber={hud.levelNumber}
          gameMode={hud.gameMode}
          clearedLevels={hud.clearedLevels}
          muted={hud.muted}
          onSelectLevel={handleSelectLevel}
          onSelectMode={handleSelectMode}
          onStart={handleStart}
          onToggleMute={handleToggleMute}
        />
      )}

      {(hud.phase === 'playing' || hud.phase === 'paused') && (
        <HudOverlay
          hud={hud}
          onToggleCamera={handleToggleCamera}
          onToggleMute={handleToggleMute}
          onRestart={handleRestart}
          onPause={handlePause}
        />
      )}

      {hud.phase === 'paused' && (
        <PauseModal
          gameMode={hud.gameMode}
          levelNumber={hud.levelNumber}
          levelName={hud.levelName}
          circuitName={hud.circuitName}
          lap={hud.lap}
          totalLaps={hud.totalLaps}
          raceTime={hud.raceTime}
          onResume={handleResume}
          onRestart={handleRestart}
          onTitle={handleTitle}
        />
      )}

      {hud.phase === 'gameover' && (
        <ResultsModal
          hud={hud}
          onNextLevel={handleNextLevel}
          onRestart={handleRestart}
          onTitle={handleTitle}
        />
      )}
    </div>
  );
}
