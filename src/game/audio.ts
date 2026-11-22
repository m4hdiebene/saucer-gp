/**
 * Procedural Web Audio synthesizer for Saucer GP.
 * Zero external audio assets; handles autoplay unlock, mute state, and clean loop silencing on pause.
 */
export class SaucerAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private muted = false;
  private engineActive = false;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.42, this.ctx.currentTime, 0.03);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public unlock(): void {
    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : 0.42;
        this.masterGain.connect(this.ctx.destination);
        this.setupEngineLoop();
      } catch {
        this.ctx = null;
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private setupEngineLoop(): void {
    if (!this.ctx || !this.masterGain) return;

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 280;
    this.engineFilter.Q.value = 4.5;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.value = 72;

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.value = 144.5;

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  public updateEngine(speedNorm: number, isBoosting: boolean, active: boolean): void {
    this.engineActive = active;
    if (!this.ctx || !this.engineGain || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter) {
      return;
    }
    const now = this.ctx.currentTime;
    if (!active || this.muted) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.06);
      return;
    }

    const clamped = Math.max(0, Math.min(1.5, speedNorm));
    const baseFreq = 68 + clamped * 115 + (isBoosting ? 48 : 0);
    const filterFreq = 260 + clamped * 720 + (isBoosting ? 900 : 0);
    const vol = 0.085 + Math.min(1, clamped) * 0.075 + (isBoosting ? 0.05 : 0);

    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.012, now, 0.05);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.05);
    this.engineGain.gain.setTargetAtTime(vol, now, 0.06);
  }

  public silenceEngine(): void {
    this.updateEngine(0, false, false);
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0,
  ): void {
    if (this.muted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime + delay;
    const jitter = 0.94 + Math.random() * 0.12;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart * jitter, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd * jitter), now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playBoost(): void {
    this.playTone(180, 620, 0.24, 'sawtooth', 0.16);
    this.playTone(360, 920, 0.28, 'sine', 0.12, 0.02);
  }

  public playBoostPad(): void {
    this.playTone(340, 880, 0.18, 'triangle', 0.18);
    this.playTone(520, 1280, 0.26, 'sine', 0.14, 0.04);
  }

  public playRingPickup(elevated: boolean): void {
    const base = elevated ? 660 : 520;
    this.playTone(base, base * 1.25, 0.11, 'sine', 0.18, 0);
    this.playTone(base * 1.5, base * 1.85, 0.16, 'triangle', 0.16, 0.055);
  }

  public playCheckpoint(): void {
    this.playTone(587, 587, 0.12, 'triangle', 0.17, 0);
    this.playTone(784, 784, 0.14, 'triangle', 0.18, 0.06);
    this.playTone(1046, 1175, 0.22, 'sine', 0.16, 0.12);
  }

  public playHop(): void {
    this.playTone(210, 560, 0.15, 'sine', 0.18);
    this.playTone(140, 290, 0.14, 'triangle', 0.12);
  }

  public playLand(): void {
    this.playTone(150, 62, 0.1, 'triangle', 0.13);
  }

  public playBump(intensity = 0.8): void {
    const vol = Math.min(0.24, 0.1 + intensity * 0.12);
    this.playTone(190, 55, 0.14, 'square', vol * 0.7);
    this.playTone(95, 38, 0.16, 'triangle', vol);
  }

  public playShockHit(): void {
    this.playTone(460, 90, 0.26, 'sawtooth', 0.22);
    this.playTone(310, 62, 0.3, 'square', 0.16, 0.03);
  }

  public playLap(isFinal: boolean): void {
    const notes = isFinal ? [523, 659, 784, 1046] : [440, 554, 659];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 1.02, 0.18, 'triangle', 0.17, idx * 0.075);
    });
  }

  public playFinish(podium: boolean): void {
    const notes = podium ? [523, 659, 784, 1046, 1318] : [440, 392, 349, 330];
    notes.forEach((n, idx) => {
      this.playTone(n, n, 0.24, 'triangle', 0.18, idx * 0.09);
    });
  }

  public dispose(): void {
    this.silenceEngine();
    try {
      this.engineOsc1?.stop();
      this.engineOsc2?.stop();
      this.ctx?.close();
    } catch {
      // Ignore cleanup errors if context was never resumed
    }
    this.ctx = null;
    this.engineActive = false;
  }

  public isEngineActive(): boolean {
    return this.engineActive;
  }
}
