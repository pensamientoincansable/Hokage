export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.music = { nodes: [], playing: false };
    this.settings = { music: 0.55, sfx: 0.8 };
  }

  unlock() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain.connect(this.master);
    this.sfxGain.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.apply();
  }

  apply() {
    if (!this.ctx) return;
    this.musicGain.gain.value = this.settings.music;
    this.sfxGain.gain.value = this.settings.sfx;
  }

  set(settings) {
    this.settings = { ...this.settings, ...settings };
    this.apply();
  }

  tone(freq, dur = 0.12, type = "square", gain = 0.08, dest = "sfx") {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest === "music" ? this.musicGain : this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur = 0.08, gain = 0.05) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 800;
    src.buffer = buffer;
    g.gain.value = gain;
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxGain);
    src.start(t);
  }

  sfx(name) {
    const map = {
      punch: () => { this.noise(0.06, 0.06); this.tone(180, 0.07, "square", 0.05); },
      kick: () => { this.noise(0.08, 0.07); this.tone(120, 0.09, "sawtooth", 0.04); },
      hit: () => { this.noise(0.07, 0.08); this.tone(90, 0.1, "square", 0.06); },
      block: () => this.tone(420, 0.08, "triangle", 0.05),
      whoosh: () => this.tone(520, 0.12, "sine", 0.03),
      fire: () => { this.noise(0.2, 0.05); this.tone(160, 0.22, "sawtooth", 0.04); },
      lightning: () => { this.noise(0.12, 0.09); this.tone(880, 0.08, "square", 0.05); },
      water: () => this.tone(240, 0.2, "sine", 0.05),
      ultimate: () => {
        this.tone(80, 0.4, "sawtooth", 0.08);
        this.tone(220, 0.35, "square", 0.05);
        this.noise(0.3, 0.07);
      },
      ko: () => { this.tone(70, 0.5, "sawtooth", 0.08); this.tone(140, 0.4, "triangle", 0.05); },
      ui: () => this.tone(660, 0.05, "square", 0.03),
      win: () => { this.tone(440, 0.12); setTimeout(() => this.tone(660, 0.12), 120); setTimeout(() => this.tone(880, 0.2), 240); },
      jump: () => this.tone(380, 0.1, "sine", 0.03),
    };
    (map[name] || map.ui)();
  }

  startMusic(theme = "menu") {
    this.unlock();
    this.stopMusic();
    if (!this.ctx) return;
    this.music.playing = true;
    const t0 = this.ctx.currentTime;
    const tempo = theme === "fight" ? 0.22 : 0.32;
    const scale = theme === "fight" ? [110, 146, 164, 196, 220, 246] : [130, 146, 164, 196, 220, 261];
    const beat = () => {
      if (!this.music.playing) return;
      this.noise(0.04, theme === "fight" ? 0.045 : 0.02);
      this.tone(70, 0.08, "sine", 0.04, "music");
    };
    const melody = () => {
      if (!this.music.playing) return;
      const n = scale[Math.floor(Math.random() * scale.length)];
      this.tone(n * (theme === "fight" ? 2 : 1.5), 0.18, "triangle", 0.035, "music");
    };
    this.music.iv1 = setInterval(beat, tempo * 1000 * 2);
    this.music.iv2 = setInterval(melody, tempo * 1000 * 3);
    this.tone(scale[0], 0.4, "sine", 0.03, "music");
    void t0;
  }

  stopMusic() {
    this.music.playing = false;
    clearInterval(this.music.iv1);
    clearInterval(this.music.iv2);
  }
}
