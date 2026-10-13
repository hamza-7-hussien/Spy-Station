// Hi-Fi Sci-Fi Audio Synthesizer (Gentle, Non-Intrusive, Futuristic & Espionage)

export type BgmMode = 'ambient' | 'suspense';

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
  private currentBgmMode: BgmMode = 'ambient';

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
      this.playTactileClick();
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

  public getBgmMode(): BgmMode {
    return this.currentBgmMode;
  }

  public setBgmMode(mode: BgmMode) {
    if (this.currentBgmMode === mode) return;
    this.currentBgmMode = mode;
    this.bgmStep = 0;
    if (this.isBgmPlaying && !this.bgmMuted) {
      if (this.bgmTimer) {
        window.clearTimeout(this.bgmTimer);
        this.bgmTimer = null;
      }
      this.scheduleBgmLoop();
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

  // Procedural Suspense / Ambient Spy Music Engine
  private scheduleBgmLoop() {
    if (!this.isBgmPlaying || this.bgmMuted || !this.ctx || !this.bgmGain) return;

    if (this.currentBgmMode === 'suspense') {
      this.playSuspenseBgmStep();
    } else {
      this.playAmbientBgmStep();
    }
  }

  // MODE 1: Ambient Espionage (Chill, Mystical Space Deck / Lobby)
  private playAmbientBgmStep() {
    if (!this.ctx || !this.bgmGain) return;
    const bpm = 74;
    const stepDuration = 60 / bpm / 2; // eighth notes (~0.405s)

    // Ethereal Espionage Minor Progressions
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
        bassGain.gain.linearRampToValueAtTime(0.3, now + 0.05);
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
          padGain.gain.linearRampToValueAtTime(0.08, now + 0.8);
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
      if (this.bgmStep % 2 === 0 && Math.random() > 0.3) {
        const leadFreq = chordNotes[noteOffset % chordNotes.length] * 2;
        const arpOsc = this.ctx.createOscillator();
        const arpGain = this.ctx.createGain();
        arpOsc.type = 'sine';
        arpOsc.frequency.setValueAtTime(leadFreq, now);
        arpGain.gain.setValueAtTime(0.001, now);
        arpGain.gain.linearRampToValueAtTime(0.1, now + 0.02);
        arpGain.gain.exponentialRampToValueAtTime(0.0001, now + stepDuration * 0.9);
        arpOsc.connect(arpGain);
        arpGain.connect(this.bgmGain);
        arpOsc.start(now);
        arpOsc.stop(now + stepDuration);
      }
    } catch {
      // ignore
    }

    this.bgmStep = (this.bgmStep + 1) % 64;
    this.bgmTimer = window.setTimeout(() => {
      this.scheduleBgmLoop();
    }, stepDuration * 1000);
  }

  // MODE 2: Tense Espionage Discussion (Dark, Heartbeat, Clock, Suspense)
  private playSuspenseBgmStep() {
    if (!this.ctx || !this.bgmGain) return;
    const bpm = 94; // slightly faster and tense
    const stepDuration = 60 / bpm / 2; // eighth notes (~0.319s)

    // Menacing chromatic progressions (D minor - Eb diminished - D minor - C# diminished)
    const chords = [
      [73.42, 146.83, 220.0, 261.63], // Dm
      [77.78, 155.56, 233.08, 311.13], // Eb dim
      [73.42, 146.83, 220.0, 293.66], // Dm maj7 feel
      [69.30, 138.59, 207.65, 277.18]  // C# dim (extreme tension)
    ];

    const currentChordIdx = Math.floor((this.bgmStep % 32) / 8);
    const chordNotes = chords[currentChordIdx];
    const now = this.ctx.currentTime;

    try {
      // 1. Tense Ostinato Bass Pulse on every quarter beat (0, 2, 4, 6...)
      if (this.bgmStep % 2 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        const bassFilter = this.ctx.createBiquadFilter();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(chordNotes[0], now);
        bassFilter.type = 'lowpass';
        bassFilter.frequency.setValueAtTime(110, now);
        bassGain.gain.setValueAtTime(0.001, now);
        bassGain.gain.linearRampToValueAtTime(0.28, now + 0.02);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 1.2);
        bassOsc.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(this.bgmGain);
        bassOsc.start(now);
        bassOsc.stop(now + stepDuration * 1.3);
      }

      // 2. High-tension Clock Tick-Tock on every step (syncopated cyber tick)
      const tickOsc = this.ctx.createOscillator();
      const tickGain = this.ctx.createGain();
      tickOsc.type = 'sine';
      const tickFreq = (this.bgmStep % 2 === 0) ? 1400 : 900;
      tickOsc.frequency.setValueAtTime(tickFreq, now);
      tickOsc.frequency.exponentialRampToValueAtTime(240, now + 0.025);
      tickGain.gain.setValueAtTime(0.035, now);
      tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
      tickOsc.connect(tickGain);
      tickGain.connect(this.bgmGain);
      tickOsc.start(now);
      tickOsc.stop(now + 0.035);

      // 3. Dark cinematic drone / tension sting on chord changes
      if (this.bgmStep % 8 === 0) {
        const droneOsc = this.ctx.createOscillator();
        const droneGain = this.ctx.createGain();
        const droneFilter = this.ctx.createBiquadFilter();
        droneOsc.type = 'sawtooth';
        droneOsc.frequency.setValueAtTime(chordNotes[1], now);
        droneFilter.type = 'lowpass';
        droneFilter.frequency.setValueAtTime(260, now);
        droneFilter.Q.setValueAtTime(3, now);
        droneGain.gain.setValueAtTime(0.001, now);
        droneGain.gain.linearRampToValueAtTime(0.12, now + 0.2);
        droneGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 7.5);
        droneOsc.connect(droneFilter);
        droneFilter.connect(droneGain);
        droneGain.connect(this.bgmGain);
        droneOsc.start(now);
        droneOsc.stop(now + stepDuration * 7.8);
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

  // ==========================================
  // 🎯 JUICY TACTILE CLICK FEEDBACK FOR BUTTONS
  // ==========================================
  public playClick() {
    this.playTactileClick();
  }

  public playTactileClick() {
    if (this.muted || this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Transient 1: High crisp pop (mechanical tactile switch)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1450, now);
      osc1.frequency.exponentialRampToValueAtTime(320, now + 0.028);

      gain1.gain.setValueAtTime(this.volume * 0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.035);

      // Transient 2: Warm body tap
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(190, now);
      osc2.frequency.exponentialRampToValueAtTime(80, now + 0.025);

      gain2.gain.setValueAtTime(this.volume * 0.22, now);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.035);

      this.triggerHaptic('light');
    } catch {
      // ignore
    }
  }

  // Card Flip 3D Whoosh & Mechanical Snap
  public playCardFlip() {
    if (this.muted || this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Air whoosh sweep
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(850, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.16);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(650, now);
      filter.Q.setValueAtTime(2.5, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(this.volume * 0.28, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);

      this.triggerHaptic('medium');
    } catch {
      // ignore
    }
  }

  // ==========================================
  // ⏱️ TIMER SFX: REAL TENSION COUNTDOWN TICKS
  // ==========================================
  public playCountdownTick(secondsLeft: number) {
    if (this.muted || this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      if (secondsLeft <= 5 && secondsLeft > 0) {
        // High Urgency: Escalating Pitch & Double Stroke
        const pitchMap: Record<number, number> = {
          5: 680,
          4: 820,
          3: 990,
          2: 1220,
          1: 1550
        };
        const freq = pitchMap[secondsLeft] || 900;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.6, now + 0.06);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2400, now);

        gain.gain.setValueAtTime(this.volume * 0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);

        this.triggerHaptic('heavy');
      } else if (secondsLeft <= 10 && secondsLeft > 5) {
        // Medium Urgency: Alternating Tick-Tock
        const isTick = secondsLeft % 2 === 0;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isTick ? 850 : 620, now);
        osc.frequency.exponentialRampToValueAtTime(isTick ? 320 : 250, now + 0.04);

        gain.gain.setValueAtTime(this.volume * 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);

        this.triggerHaptic('light');
      }
    } catch {
      // ignore
    }
  }

  // Timer run out buzzer / alarm
  public playTimeoutBuzzer() {
    if (this.muted || this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      [0, 0.16].forEach(offset => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, now + offset);
        gain.gain.setValueAtTime(this.volume * 0.4, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.14);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.15);
      });
      this.triggerHaptic('heavy');
    } catch {
      // ignore
    }
  }

  // ==========================================
  // 🏆 VICTORY & REVEAL INTERACTIVE AUDIO
  // ==========================================
  // Epic Multi-layered Victory Fanfare
  public playVictoryCelebration() {
    if (this.muted || this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      // Major Triad Arpeggio Fanfare (C5 -> E5 -> G5 -> C6 -> High G6 shimmer)
      const notes = [
        { f: 523.25, delay: 0, d: 0.18 },
        { f: 659.25, delay: 110, d: 0.18 },
        { f: 783.99, delay: 220, d: 0.22 },
        { f: 1046.50, delay: 330, d: 0.45 },
        { f: 1567.98, delay: 480, d: 0.6 }
      ];

      notes.forEach(n => {
        setTimeout(() => this.playTone(n.f, 'sine', n.d, 0.48), n.delay);
      });

      // Warm background brass chord
      setTimeout(() => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [261.63, 329.63, 392.00].forEach(freq => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(this.volume * 0.25, now + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.85);
        });
      }, 340);

      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([60, 40, 100, 50, 180]);
        } catch {}
      }
    } catch {
      // ignore
    }
  }

  // Cinematic Dark Spy Reveal / Catching Sting
  public playSpyRevealSting() {
    if (this.muted || this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // 1. Deep Sub-Bass Impact
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(95, now);
      bassOsc.frequency.exponentialRampToValueAtTime(32, now + 0.8);
      bassGain.gain.setValueAtTime(this.volume * 0.5, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      bassOsc.connect(bassGain);
      bassGain.connect(this.ctx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + 0.9);

      // 2. Diminished Suspense Stabs (Eb4 - A4 tritone espionage signature)
      const stabs = [
        { f: 311.13, delay: 0 },
        { f: 440.00, delay: 60 },
        { f: 293.66, delay: 140 },
        { f: 415.30, delay: 210 }
      ];

      stabs.forEach(s => {
        setTimeout(() => {
          this.playTone(s.f, 'sawtooth', 0.6, 0.35);
        }, s.delay);
      });

      // 3. Cyber Static Glitch Sweep
      this.playGlitchStatic();

      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([100, 50, 220]);
        } catch {}
      }
    } catch {
      // ignore
    }
  }

  // Space-Fleet Crew Authorization Chime
  public playCrewRevealChirp() {
    if (this.muted || this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Ascending telemetry harmonics
      const freqs = [587.33, 880.00, 1174.66]; // D5, A5, D6
      freqs.forEach((f, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.07);
        gain.gain.setValueAtTime(0.001, now + idx * 0.07);
        gain.gain.linearRampToValueAtTime(this.volume * 0.35, now + idx * 0.07 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.27);
      });

      this.triggerHaptic('light');
    } catch {
      // ignore
    }
  }

  // Airlock Door Slide & Pneumatic Release Sound
  public playAirlockDoor() {
    if (this.muted || this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Pneumatic hiss (filtered noise)
      const bufferSize = this.ctx.sampleRate * 0.35;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.35);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(this.volume * 0.32, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);

      // Low mechanical motor rumble
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.linearRampToValueAtTime(65, now + 0.4);
      oscGain.gain.setValueAtTime(this.volume * 0.25, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);

      this.triggerHaptic('medium');
    } catch {
      // ignore
    }
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

  public playTimerPulse(isUrgent: boolean = false) {
    this.playCountdownTick(isUrgent ? 3 : 8);
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

  public playHeartbeat(isUrgent: boolean = false) {
    if (this.muted || this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(isUrgent ? 85 : 65, now);
      osc1.frequency.exponentialRampToValueAtTime(isUrgent ? 45 : 35, now + 0.08);
      const vol1 = this.volume * (isUrgent ? 0.45 : 0.3);
      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(vol1, now + 0.015);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.11);

      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(isUrgent ? 75 : 55, now + 0.11);
      osc2.frequency.exponentialRampToValueAtTime(isUrgent ? 40 : 30, now + 0.2);
      const vol2 = this.volume * (isUrgent ? 0.38 : 0.22);
      gain2.gain.setValueAtTime(0.001, now + 0.11);
      gain2.gain.linearRampToValueAtTime(vol2, now + 0.125);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.11);
      osc2.stop(now + 0.23);

      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(isUrgent ? [25, 45, 35] : [15, 60, 20]);
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }

  public playBiometricScan() {
    if (this.muted || this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.18);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(this.volume * 0.35, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.21);
      this.triggerHaptic('light');
    } catch {
      // ignore
    }
  }

  public playAirlockEjection() {
    if (this.muted || this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 1.2);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(this.volume * 0.45, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 1.35);
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([120, 60, 180]);
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }

  public playMatchFound() {
    if (this.muted || this.volume <= 0) return;
    const fanfare: [number, number, number][] = [
      [440, 0, 0.12],
      [554, 110, 0.12],
      [659, 220, 0.14],
      [880, 360, 0.35]
    ];
    this.playChime(fanfare, 'triangle');
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([40, 40, 70]);
      } catch {
        // ignore
      }
    }
  }

  public playCageSlam() {
    if (this.muted || this.volume <= 0) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(800, now);
      osc1.frequency.exponentialRampToValueAtTime(150, now + 0.15);
      gain1.gain.setValueAtTime(this.volume * 0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.17);

      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(120, now + 0.12);
      osc2.frequency.exponentialRampToValueAtTime(30, now + 0.45);
      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.setValueAtTime(this.volume * 0.5, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.52);

      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([80, 50, 160]);
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }

  public playSadTearsSound() {
    if (this.muted || this.volume <= 0) return;
    const sadNotes: [number, number, number][] = [
      [493.88, 0, 0.22],
      [440.00, 160, 0.25],
      [392.00, 320, 0.3],
      [329.63, 480, 0.5]
    ];
    this.playChime(sadNotes, 'sine');
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([20, 40, 20, 40, 60]);
      } catch {
        // ignore
      }
    }
  }
}

export const sound = new AudioManager();
