'use client';

import { useEffect, useRef, useCallback } from 'react';

// Web Audio API sound engine for scan events
class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.08) {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch { /* silent fail */ }
  }

  // Quick blip — finding discovered
  finding() {
    this.playTone(880, 0.08, 'sine', 0.04);
  }

  // Ascending tone — info finding
  info() {
    this.playTone(660, 0.06, 'sine', 0.03);
    setTimeout(() => this.playTone(880, 0.08, 'sine', 0.03), 50);
  }

  // Urgent hit — high severity
  highHit() {
    this.playTone(440, 0.1, 'sawtooth', 0.06);
    setTimeout(() => this.playTone(880, 0.15, 'sawtooth', 0.06), 80);
    setTimeout(() => this.playTone(1320, 0.2, 'sawtooth', 0.04), 160);
  }

  // CRITICAL alert — red alert sound
  criticalHit() {
    this.playTone(880, 0.12, 'square', 0.07);
    setTimeout(() => this.playTone(1100, 0.12, 'square', 0.07), 120);
    setTimeout(() => this.playTone(880, 0.12, 'square', 0.07), 240);
    setTimeout(() => this.playTone(1400, 0.25, 'square', 0.05), 360);
  }

  // Scan start — rising sweep
  scanStart() {
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch { /* silent */ }
  }

  // Scan complete — triumphant chord
  scanComplete() {
    this.playTone(523, 0.3, 'sine', 0.05);
    setTimeout(() => this.playTone(659, 0.3, 'sine', 0.05), 100);
    setTimeout(() => this.playTone(784, 0.3, 'sine', 0.05), 200);
    setTimeout(() => this.playTone(1047, 0.5, 'sine', 0.04), 300);
  }

  // XP gain — pleasant chime
  xpGain() {
    this.playTone(1047, 0.08, 'sine', 0.03);
    setTimeout(() => this.playTone(1319, 0.12, 'sine', 0.03), 60);
  }

  // Level up — fanfare
  levelUp() {
    this.playTone(784, 0.15, 'sine', 0.06);
    setTimeout(() => this.playTone(988, 0.15, 'sine', 0.06), 100);
    setTimeout(() => this.playTone(1175, 0.15, 'sine', 0.06), 200);
    setTimeout(() => this.playTone(1568, 0.4, 'sine', 0.05), 300);
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }
}

// Singleton
let engine: SoundEngine | null = null;
function getEngine(): SoundEngine {
  if (!engine) engine = new SoundEngine();
  return engine;
}

export function useSoundEffects() {
  const engineRef = useRef(getEngine());

  const play = useCallback((type: 'finding' | 'info' | 'highHit' | 'criticalHit' | 'scanStart' | 'scanComplete' | 'xpGain' | 'levelUp') => {
    engineRef.current[type]();
  }, []);

  const toggle = useCallback(() => engineRef.current.toggle(), []);
  const isEnabled = useCallback(() => engineRef.current.isEnabled(), []);

  return { play, toggle, isEnabled };
}

export { SoundEngine, getEngine };
