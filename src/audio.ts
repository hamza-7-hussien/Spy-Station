// Hi-Fi Sci-Fi Audio Synthesizer (Gentle, Non-Intrusive, Futuristic)
class AudioManager {
  private ctx: AudioContext | null = null;
  private volume: number = 0.45;
  private muted: boolean = false;
  private ambientGain: GainNode | null = null;
  private isAmbientPlaying: boolean = false;

  constructor() {
    const savedVol = localStorage.getItem('spy_station_vol');
    if (savedVol !== null) {
      const parsed = parseFloat(savedVol);
      this.volume = isNaN(parsed) ? 0.45 : Math.min(1, Math.max(0, parsed));
    }
    const savedMute = localStorage.getItem('spy_station_muted');
    if (savedMute !== null) {
      this.muted = savedMute === 'true';
    }
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem('spy_station_muted', String(this.muted));
    if (!this.muted) {
      this.playTone(520, 'sine', 0.08, 0.3);
    }
    return this.muted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number) {
    this.volume = Math.min(1, Math.max(0, vol));
    localStorage.setItem('spy_station_vol', this.volume.toString());
    this.playTone(520, 'sine', 0.08, 0.3);
  }

  public playTone(freq = 440, type: OscillatorType = 'sine', duration = 0.12, gainFactor = 1) {
    if (this.muted || this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const now = this.ctx.currentTime;
      const effectiveVol = this.volume * gainFactor;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, effectiveVol), now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch {
      // Audio autoplay policy or locked
    }
  }

  // Soft futuristic UI click / tap
  public playClick() {
    this.playTone(750, 'sine', 0.04, 0.25);
  }

  // Playful, soft bubble pop for speech bubbles
  public playBubblePop() {
    if (this.muted || this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(this.volume * 0.35, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // ignore
    }
  }

  // Gentle, soothing heartbeat/digital pulse for timer
  public playTimerPulse(isUrgent: boolean = false) {
    if (this.muted || this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isUrgent ? 280 : 180, now);
      osc.frequency.exponentialRampToValueAtTime(isUrgent ? 140 : 90, now + 0.1);
      const vol = this.volume * (isUrgent ? 0.35 : 0.18);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (isUrgent ? 0.14 : 0.18));
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // ignore
    }
  }

  // Cinematic sci-fi spy reveal chord
  public playSpyChord() {
    if (this.muted || this.volume <= 0) return;
    const chords = [
      { f: 146.83, delay: 0, d: 0.8 }, // D3
      { f: 220.00, delay: 60, d: 0.7 }, // A3
      { f: 261.63, delay: 120, d: 0.9 }, // C4
      { f: 311.13, delay: 180, d: 1.1 }  // Eb4 (Diminished suspense)
    ];
    chords.forEach(c => {
      setTimeout(() => this.playTone(c.f, 'triangle', c.d, 0.4), c.delay);
    });
  }

  // Celestial cosmic victory chime
  public playVictoryChime() {
    if (this.muted || this.volume <= 0) return;
    const notes = [
      { f: 523.25, delay: 0 },   // C5
      { f: 659.25, delay: 90 },  // E5
      { f: 783.99, delay: 180 }, // G5
      { f: 1046.50, delay: 270 } // C6
    ];
    notes.forEach(n => {
      setTimeout(() => this.playTone(n.f, 'sine', 0.35, 0.45), n.delay);
    });
  }

  // Sabotage scan sweep sound
  public playSabotageScan() {
    if (this.muted || this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(900, now + 0.3);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(this.volume * 0.25, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } catch {
      // ignore
    }
  }

  public playChime(notes: [number, number, number][], type: OscillatorType = 'sine') {
    if (this.muted || this.volume <= 0) return;
    notes.forEach(([freq, delayMs, duration]) => {
      setTimeout(() => this.playTone(freq, type, duration, 0.5), delayMs);
    });
  }

  public triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'light') {
    if ('vibrate' in navigator) {
      try {
        if (type === 'light') navigator.vibrate(15);
        else if (type === 'medium') navigator.vibrate(35);
        else if (type === 'heavy') navigator.vibrate([50, 30, 50]);
      } catch {
        // unsupported
      }
    }
  }
}

export const sound = new AudioManager();
