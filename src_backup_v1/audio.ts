// Hi-Fi Sci-Fi Audio Synthesizer (Gentle, Non-Intrusive, Futuristic)
class AudioManager {
  private ctx: AudioContext | null = null;
  private volume: number = 0.45;
  private muted: boolean = false;
  private bgmMuted: boolean = false;
  private bgmVolume: number = 0.28;
  private bgmGain: GainNode | null = null;
  private isBgmPlaying: boolean = false;
  private bgmTimer: number | null = null;
  private bgmStep: number = 0;

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
    const savedBgmMute = localStorage.getItem('spy_station_bgm_muted');
    if (savedBgmMute !== null) {
      this.bgmMuted = savedBgmMute === 'true';
    } else {
      // Default to music enabled
      this.bgmMuted = false;
    }

    // Auto-unlock AudioContext on first user interaction (critical for iOS Safari & Android Chrome)
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.initCtx();
        if (!this.bgmMuted && !this.isBgmPlaying) {
          this.startBgm();
        }
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
        window.removeEventListener('pointerdown', unlockAudio);
      };
      window.addEventListener('click', unlockAudio, { once: true, passive: true });
      window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
      window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
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

  // Background Music (BGM) Controls
  public isBgmMuted(): boolean {
    return this.bgmMuted;
  }

  public toggleBgm(): boolean {
    this.bgmMuted = !this.bgmMuted;
    localStorage.setItem('spy_station_bgm_muted', String(this.bgmMuted));
    if (this.bgmMuted) {
      this.stopBgm();
    } else {
      this.startBgm();
    }
    return this.bgmMuted;
  }

  public getBgmVolume(): number {
    return this.bgmVolume;
  }

  public setBgmVolume(vol: number) {
    this.bgmVolume = Math.min(1, Math.max(0, vol));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setTargetAtTime(this.bgmMuted ? 0 : this.bgmVolume, this.ctx.currentTime, 0.1);
    }
  }

  // Start procedural atmospheric cyber/spy music
  public startBgm() {
    if (this.bgmMuted || this.isBgmPlaying) return;
    this.initCtx();
    if (!this.ctx) return;

    this.isBgmPlaying = true;
    if (!this.bgmGain) {
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.connect(this.ctx.destination);
    }
    const now = this.ctx.currentTime;
    this.bgmGain.gain.setValueAtTime(0.001, now);
    this.bgmGain.gain.linearRampToValueAtTime(this.bgmVolume, now + 1.2);

    this.scheduleBgmLoop();
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmTimer) {
      window.clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.bgmGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, now);
      this.bgmGain.gain.linearRampToValueAtTime(0.0001, now + 0.8);
    }
  }

  // Procedural Suspense Spy Loop (BPM 84, D minor / mysterious spy progression)
  private scheduleBgmLoop() {
    if (!this.isBgmPlaying || this.bgmMuted || !this.ctx || !this.bgmGain) return;

    const bpm = 84;
    const stepDuration = 60 / bpm / 2; // eighth notes (~0.357s)

    // Cinematic Spy Chord Progressions (Root, Third, Fifth, Seventh/Ninth)
    const chords = [
      [73.42, 146.83, 220.0, 261.63, 329.63], // Dm9
      [65.41, 130.81, 196.0, 246.94, 311.13], // C minor / diminished touch
      [58.27, 116.54, 174.61, 233.08, 293.66], // Bb major 7
      [55.0, 110.0, 164.81, 220.0, 277.18]     // A7 suspense
    ];

    const currentChordIdx = Math.floor((this.bgmStep % 32) / 8);
    const chordNotes = chords[currentChordIdx];

    const now = this.ctx.currentTime;

    try {
      // 1. Warm Sub-Bass Pulse on downbeats (beats 0, 4, 8...)
      if (this.bgmStep % 4 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        const bassFilter = this.ctx.createBiquadFilter();

        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(chordNotes[0], now);

        bassFilter.type = 'lowpass';
        bassFilter.frequency.setValueAtTime(140, now);

        bassGain.gain.setValueAtTime(0.001, now);
        bassGain.gain.linearRampToValueAtTime(0.35, now + 0.05);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 2.5);

        bassOsc.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(this.bgmGain);

        bassOsc.start(now);
        bassOsc.stop(now + stepDuration * 2.6);
      }

      // 2. Ethereal Ambient Pad Chord (on each chord change: step 0, 8, 16, 24)
      if (this.bgmStep % 8 === 0) {
        chordNotes.slice(1, 4).forEach((freq, idx) => {
          if (!this.ctx || !this.bgmGain) return;
          const padOsc = this.ctx.createOscillator();
          const padGain = this.ctx.createGain();
          const padFilter = this.ctx.createBiquadFilter();

          padOsc.type = 'sawtooth';
          padOsc.frequency.setValueAtTime(freq * (1 + (idx === 0 ? 0.002 : -0.002)), now);

          padFilter.type = 'lowpass';
          padFilter.frequency.setValueAtTime(320, now);
          padFilter.Q.setValueAtTime(2, now);

          const padLen = stepDuration * 7.5;
          padGain.gain.setValueAtTime(0.001, now);
          padGain.gain.linearRampToValueAtTime(0.09, now + 0.8);
          padGain.gain.exponentialRampToValueAtTime(0.001, now + padLen);

          padOsc.connect(padFilter);
          padFilter.connect(padGain);
          padGain.connect(this.bgmGain);

          padOsc.start(now);
          padOsc.stop(now + padLen + 0.1);
        });
      }

      // 3. Spy Bell Arpeggiator Motif (soft, subtle espionage notes)
      const arpPattern = [0, 2, 4, 3, 1, 3, 2, 4];
      const noteOffset = arpPattern[this.bgmStep % 8];
      if (this.bgmStep % 2 === 0 && Math.random() > 0.25) {
        const leadFreq = chordNotes[noteOffset % chordNotes.length] * 2;
        const arpOsc = this.ctx.createOscillator();
        const arpGain = this.ctx.createGain();

        arpOsc.type = 'sine';
        arpOsc.frequency.setValueAtTime(leadFreq, now);

        arpGain.gain.setValueAtTime(0.001, now);
        arpGain.gain.linearRampToValueAtTime(0.12, now + 0.02);
        arpGain.gain.exponentialRampToValueAtTime(0.0001, now + stepDuration * 0.9);

        arpOsc.connect(arpGain);
        arpGain.connect(this.bgmGain);

        arpOsc.start(now);
        arpOsc.stop(now + stepDuration);
      }

      // 4. Subtle Cyber Tick / Rhythm Heartbeat (tactical suspense click)
      if (this.bgmStep % 2 === 1) {
        const tickOsc = this.ctx.createOscillator();
        const tickGain = this.ctx.createGain();
        tickOsc.type = 'sine';
        tickOsc.frequency.setValueAtTime(1200, now);
        tickOsc.frequency.exponentialRampToValueAtTime(200, now + 0.03);

        tickGain.gain.setValueAtTime(0.02, now);
        tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

        tickOsc.connect(tickGain);
        tickGain.connect(this.bgmGain);

        tickOsc.start(now);
        tickOsc.stop(now + 0.04);
      }
    } catch {
      // ignore
    }

    this.bgmStep = (this.bgmStep + 1) % 64;
    this.bgmTimer = window.setTimeout(() => {
      this.scheduleBgmLoop();
    }, stepDuration * 1000);
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

  // Blackout Protocol emergency sirens and static glitch sound
  public playBlackoutAlarm() {
    if (this.muted || this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // High-low alarm sweep
      [0, 0.4, 0.8].forEach(offset => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now + offset);
        osc.frequency.exponentialRampToValueAtTime(320, now + offset + 0.3);
        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.linearRampToValueAtTime(this.volume * 0.35, now + offset + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.36);
      });
    } catch {
      // ignore
    }
  }

  public playGlitchStatic() {
    if (this.muted || this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      gain.gain.setValueAtTime(this.volume * 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      noise.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);
    } catch {
      // ignore
    }
  }

  public playDramaticSting() {
    if (this.muted || this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // Dramatic chord: C# minor / D diminished impact
      const freqs = [138.59, 164.81, 196.00, 293.66];
      freqs.forEach(f => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.exponentialRampToValueAtTime(f * 0.96, now + 1.2);
        gain.gain.setValueAtTime(this.volume * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 1.21);
      });
    } catch {}
  }

  public playTensionHeartbeat() {
    if (this.muted || this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [0, 0.22].forEach(offset => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(75, now + offset);
        osc.frequency.exponentialRampToValueAtTime(35, now + offset + 0.16);
        gain.gain.setValueAtTime(this.volume * 0.6, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.19);
      });
    } catch {}
  }

  public playAirHorn() {
    if (this.muted || this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [466.16, 554.37, 622.25];
      [0, 0.12, 0.35].forEach((startDelay, idx) => {
        const dur = idx === 2 ? 0.35 : 0.08;
        notes.forEach(f => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, now + startDelay);
          gain.gain.setValueAtTime(this.volume * 0.25, now + startDelay);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + startDelay + dur);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + startDelay);
          osc.stop(now + startDelay + dur + 0.01);
        });
      });
    } catch {}
  }

  public playLaughBoing() {
    if (this.muted || this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.35);
      gain.gain.setValueAtTime(this.volume * 0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.39);
    } catch {}
  }

  public playCheerApplause() {
    if (this.muted || this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      // Fanfare chord progression
      this.playChime([[523, 0, 0.1], [659, 100, 0.1], [784, 200, 0.1], [1046, 300, 0.4]], 'triangle');
    } catch {}
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
