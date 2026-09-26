class AudioManager {
  private ctx: AudioContext | null = null;
  private volume: number = 0.5;

  constructor() {
    const saved = localStorage.getItem('spy_station_vol');
    if (saved !== null) {
      const parsed = parseFloat(saved);
      this.volume = isNaN(parsed) ? 0.5 : Math.min(1, Math.max(0, parsed));
    }
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number) {
    this.volume = Math.min(1, Math.max(0, vol));
    localStorage.setItem('spy_station_vol', this.volume.toString());
    this.playTone(520, 'sine', 0.1);
  }

  public playTone(freq = 440, type: OscillatorType = 'sine', duration = 0.15) {
    if (this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const now = this.ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(this.volume, now + 0.015);
      gain.gain.linearRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.03);
    } catch {
      // Audio autoplay policy or device lock
    }
  }

  public playChime(notes: [number, number, number][], type: OscillatorType = 'sine') {
    if (this.volume <= 0) return;
    notes.forEach(([freq, delayMs, duration]) => {
      setTimeout(() => this.playTone(freq, type, duration), delayMs);
    });
  }

  public triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'light') {
    if ('vibrate' in navigator) {
      try {
        if (type === 'light') navigator.vibrate(20);
        else if (type === 'medium') navigator.vibrate(40);
        else if (type === 'heavy') navigator.vibrate([60, 30, 60]);
      } catch {
        // unsupported or permissions disabled
      }
    }
  }
}

export const sound = new AudioManager();
