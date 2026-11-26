// צלילים ומוזיקה מסונתזים ב-WebAudio (ללא קבצי שמע)
type Wave = OscillatorType;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private sfxGain!: GainNode;
  private musicGain!: GainNode;
  private noiseBuf!: AudioBuffer;
  private last: Record<string, number> = {};
  private timer: number | null = null;
  private nextNote = 0;
  private step = 0;
  private mode: 'camp' | 'battle' | 'boss' = 'camp';
  sfxOn = true;
  musicOn = true;

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      this.ctx = ctx;
      this.sfxGain = ctx.createGain();
      this.sfxGain.gain.value = 0.5;
      this.sfxGain.connect(ctx.destination);
      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(ctx.destination);
      const len = ctx.sampleRate * 0.5;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  /** יש לקרוא מתוך אירוע משתמש ראשון */
  unlock() {
    const ctx = this.ensure();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
    if (this.musicOn) this.startMusic();
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private tone(freq: number, dur: number, type: Wave = 'sine', vol = 0.3, slideTo?: number, delay = 0, dest?: AudioNode) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest ?? this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  private noise(dur: number, vol: number, filter: BiquadFilterType, f0: number, f1?: number, delay = 0) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const fl = ctx.createBiquadFilter();
    fl.type = filter;
    fl.frequency.setValueAtTime(f0, t);
    if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl);
    fl.connect(g);
    g.connect(this.sfxGain);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  play(name: string) {
    if (!this.sfxOn) return;
    const ctx = this.ensure();
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const gap = name === 'sword' || name === 'hit' || name === 'arrow' ? 0.07 : 0.04;
    if (this.last[name] && now - this.last[name] < gap) return;
    this.last[name] = now;
    switch (name) {
      case 'click':
        this.tone(620, 0.07, 'square', 0.14, 420);
        break;
      case 'coin':
        this.tone(1250, 0.08, 'sine', 0.25);
        this.tone(1700, 0.16, 'sine', 0.25, undefined, 0.07);
        break;
      case 'sword':
        this.noise(0.07, 0.22, 'highpass', 3200);
        this.tone(900 + Math.random() * 500, 0.09, 'triangle', 0.12, 320);
        break;
      case 'hit':
        this.tone(170, 0.1, 'sine', 0.3, 60);
        this.noise(0.05, 0.12, 'lowpass', 900);
        break;
      case 'arrow':
        this.noise(0.13, 0.14, 'bandpass', 2400, 600);
        break;
      case 'magic':
        this.tone(420, 0.26, 'sine', 0.18, 1300);
        this.tone(630, 0.26, 'triangle', 0.1, 1900, 0.03);
        break;
      case 'heal':
        this.tone(660, 0.14, 'sine', 0.14);
        this.tone(990, 0.2, 'sine', 0.12, undefined, 0.08);
        break;
      case 'death':
        this.noise(0.16, 0.13, 'lowpass', 1200, 200);
        break;
      case 'blast':
        this.noise(0.45, 0.4, 'lowpass', 900, 80);
        this.tone(90, 0.4, 'sine', 0.4, 35);
        break;
      case 'skill':
        this.noise(0.3, 0.2, 'bandpass', 500, 3000);
        this.tone(330, 0.3, 'sawtooth', 0.1, 660);
        break;
      case 'horn':
        this.tone(220, 0.5, 'sawtooth', 0.14);
        this.tone(330, 0.5, 'sawtooth', 0.1, undefined, 0.02);
        break;
      case 'potion':
        this.tone(500, 0.1, 'sine', 0.2, 800);
        this.tone(700, 0.1, 'sine', 0.2, 1100, 0.1);
        break;
      case 'star':
        this.tone(1320, 0.3, 'sine', 0.24);
        this.tone(1980, 0.3, 'sine', 0.12, undefined, 0.02);
        break;
      case 'upgrade':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.2, undefined, i * 0.06));
        break;
      case 'error':
        this.tone(180, 0.16, 'square', 0.12, 140);
        break;
      case 'boss':
        this.tone(70, 0.9, 'sawtooth', 0.26, 50);
        this.noise(0.8, 0.14, 'lowpass', 400, 100);
        break;
      case 'victory':
        [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => {
          this.tone(f, i === 6 ? 0.7 : 0.16, 'square', 0.13, undefined, i * 0.13);
          this.tone(f / 2, i === 6 ? 0.7 : 0.16, 'triangle', 0.16, undefined, i * 0.13);
        });
        break;
      case 'defeat':
        [392, 349, 311, 262, 196].forEach((f, i) => this.tone(f, i === 4 ? 0.8 : 0.26, 'triangle', 0.2, undefined, i * 0.24));
        break;
    }
  }

  // ----- מוזיקת רקע פרוצדורלית -----
  setMode(mode: 'camp' | 'battle' | 'boss') {
    if (this.mode !== mode) {
      this.mode = mode;
      this.step = 0;
    }
  }

  startMusic() {
    const ctx = this.ensure();
    if (!ctx || this.timer !== null || !this.musicOn) return;
    this.nextNote = ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 90);
  }

  stopMusic() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  setMusic(on: boolean) {
    this.musicOn = on;
    if (on) this.startMusic();
    else this.stopMusic();
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const N = (semi: number) => 220 * Math.pow(2, semi / 12);
    // סולמות: מחנה - דו מז'ור פנטטוני, קרב - לה מינור
    const camp = { tempo: 0.3, mel: [3, 7, 10, 12, 10, 7, 5, 7, 3, 5, 7, 10, 7, 5, 3, -1, 5, 8, 12, 15, 12, 8, 7, 8, 5, 7, 8, 12, 10, 7, 5, -1], bass: [-9, -9, -4, -4, -7, -7, -4, -2] };
    const battle = { tempo: 0.2, mel: [0, 3, 7, 3, 0, 3, 8, 7, 0, 3, 7, 10, 8, 7, 5, 3, -2, 2, 5, 2, -2, 2, 7, 5, -4, 0, 3, 7, 5, 3, 2, -1], bass: [-12, -12, -12, -12, -14, -14, -16, -16] };
    const boss = { tempo: 0.17, mel: [0, 1, 0, 6, 0, 1, 0, 7, 0, 1, 0, 6, 8, 7, 6, 1, -2, -1, -2, 4, -2, -1, -2, 5, 0, 1, 3, 6, 7, 6, 3, 1], bass: [-12, -12, -11, -11, -14, -14, -11, -6] };
    const p = this.mode === 'camp' ? camp : this.mode === 'battle' ? battle : boss;
    while (this.nextNote < ctx.currentTime + 0.25) {
      const i = this.step % 32;
      const d = this.nextNote - ctx.currentTime;
      const m = p.mel[i];
      if (m >= 0 || this.mode !== 'camp') {
        if (m !== -1) this.tone(N(m + (this.mode === 'camp' ? 12 : 12)), p.tempo * 1.7, 'triangle', 0.5, undefined, d, this.musicGain);
      }
      if (i % 4 === 0) this.tone(N(p.bass[(i / 4) | 0]), p.tempo * 3.6, 'sine', 0.75, undefined, d, this.musicGain);
      if (this.mode !== 'camp' && i % 2 === 0) this.tone(N(p.bass[(i / 4) | 0] + 12), p.tempo * 0.6, 'square', 0.1, undefined, d, this.musicGain);
      if (this.mode === 'camp' && i % 8 === 4) this.tone(N(p.bass[(i / 4) | 0] + 19), p.tempo * 3, 'sine', 0.22, undefined, d, this.musicGain);
      this.nextNote += p.tempo;
      this.step++;
    }
  }
}

export const audio = new AudioEngine();
