// Synthesised sound effects, engine, music and voice cues (Web Audio API).
import { mulberry32, hashStr } from './util.js';

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  minorPent: [0, 3, 5, 7, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.volume = 0.4;
    this.musicOn = true;
    this.voiceOn = true;
    this.eng = null;
    this.seq = null;
  }

  // iOS only plays sound after a tap, so this runs on the "Tap to Play" button.
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = (this.ctx = new AC());
      this.master = c.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(c.destination);
      this.sfx = c.createGain();
      this.sfx.gain.value = 0.9;
      this.sfx.connect(this.master);
      this.music = c.createGain();
      this.music.gain.value = 0.32;
      this.music.connect(this.master);
      this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state !== 'running') this.ctx.resume();
    const s = this.ctx.createBufferSource();
    s.buffer = this.ctx.createBuffer(1, 1, 22050);
    s.connect(this.ctx.destination);
    s.start(0);
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  tone(f, dur, o = {}) {
    const c = this.ctx;
    if (!c) return;
    const t = o.t ?? c.currentTime + (o.at || 0);
    const osc = c.createOscillator();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol ?? 0.15, t + (o.attack ?? 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(o.bus || this.sfx);
    if (o.vib) {
      const lfo = c.createOscillator(), depth = c.createGain();
      lfo.frequency.value = o.vib; depth.gain.value = f * 0.06;
      lfo.connect(depth); depth.connect(osc.frequency);
      lfo.start(t); lfo.stop(t + dur + 0.05);
    }
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  noise(dur, o = {}) {
    const c = this.ctx;
    if (!c) return;
    const t = o.t ?? c.currentTime + (o.at || 0);
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = o.filter || 'lowpass';
    f.frequency.setValueAtTime(o.freq || 1000, t);
    if (o.slide) f.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(o.vol ?? 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(o.bus || this.sfx);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  // ---- effects
  click() { this.tone(880, 0.06, { type: 'triangle', vol: 0.1 }); }
  coin() { this.tone(988, 0.07, { vol: 0.08 }); this.tone(1319, 0.18, { vol: 0.08, at: 0.07 }); }
  star() { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.12, { type: 'triangle', vol: 0.14, at: i * 0.06 })); }
  sticker() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.2, { type: 'triangle', vol: 0.16, at: i * 0.08 })); }
  whoosh() { this.noise(0.18, { filter: 'bandpass', freq: 600, slide: 2000, vol: 0.12 }); }
  bonk() {
    this.tone(500, 0.18, { type: 'sine', slide: 1400, vol: 0.25 });
    this.tone(1400, 0.15, { type: 'sine', slide: 700, vol: 0.18, at: 0.12 });
    this.tone(190, 0.28, { type: 'triangle', slide: 90, vol: 0.25 });
  }
  boing() { this.tone(320, 0.45, { type: 'triangle', slide: 110, vol: 0.25, vib: 18 }); }
  bump() { this.noise(0.18, { freq: 700, vol: 0.3 }); this.tone(140, 0.18, { type: 'sine', slide: 60, vol: 0.3 }); }
  splash() { this.noise(0.35, { freq: 2500, slide: 300, vol: 0.18 }); }
  jump() { this.tone(300, 0.3, { type: 'sine', slide: 800, vol: 0.18 }); }
  land() { this.noise(0.12, { freq: 400, vol: 0.25 }); }
  stomp() { this.tone(70, 0.4, { type: 'sine', slide: 35, vol: 0.4 }); this.noise(0.25, { freq: 300, vol: 0.25 }); }
  boost() { this.noise(0.7, { filter: 'bandpass', freq: 400, slide: 3000, vol: 0.2 }); this.tone(220, 0.6, { type: 'sawtooth', slide: 660, vol: 0.06 }); }
  denied() { this.tone(220, 0.15, { type: 'triangle', vol: 0.12 }); this.tone(180, 0.2, { type: 'triangle', vol: 0.12, at: 0.12 }); }
  beep(go) { this.tone(go ? 880 : 440, go ? 0.5 : 0.22, { type: 'square', vol: 0.12 }); }
  fanfare() {
    [[523, 0], [659, 0.15], [784, 0.3], [1047, 0.45], [784, 0.65], [1047, 0.8]].forEach(([f, at]) => this.tone(f, 0.25, { type: 'square', vol: 0.1, at }));
    this.noise(1.2, { filter: 'highpass', freq: 3000, vol: 0.06, at: 0.2 });
  }
  horn(kind) {
    switch (kind) {
      case 'honk': this.tone(330, 0.35, { type: 'sawtooth', vol: 0.1, vib: 30 }); this.tone(415, 0.35, { type: 'sawtooth', vol: 0.08, vib: 30 }); break;
      case 'toot': [523, 659, 784].forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', vol: 0.18, at: i * 0.15 })); break;
      case 'moo': this.tone(190, 0.9, { type: 'sawtooth', slide: 120, vol: 0.1, attack: 0.1, vib: 5 }); break;
      case 'quack': [0, 0.2].forEach((at) => this.tone(750, 0.13, { type: 'sawtooth', slide: 420, vol: 0.1, at })); break;
      default: [0, 0.17].forEach((at) => this.tone(660, 0.13, { type: 'square', vol: 0.12, at }));
    }
  }

  // ---- engine
  engineStart() {
    const c = this.ctx;
    if (!c || this.eng) return;
    const o1 = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o1.type = 'sawtooth'; o2.type = 'square';
    o1.frequency.value = 60; o2.frequency.value = 31;
    f.type = 'lowpass'; f.frequency.value = 400; f.Q.value = 2;
    g.gain.value = 0;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.sfx);
    o1.start(); o2.start();
    this.eng = { o1, o2, f, g };
  }

  engineSet(frac, boost) {
    const e = this.eng;
    if (!e) return;
    const t = this.ctx.currentTime, f1 = 55 + frac * 110 + (boost ? 30 : 0);
    e.o1.frequency.setTargetAtTime(f1, t, 0.08);
    e.o2.frequency.setTargetAtTime(f1 * 0.5 + 1.5, t, 0.08);
    e.f.frequency.setTargetAtTime(350 + frac * 900, t, 0.1);
    e.g.gain.setTargetAtTime(0.03 + frac * 0.03, t, 0.1);
  }

  engineStop() {
    const e = this.eng;
    if (!e) return;
    const t = this.ctx.currentTime;
    e.g.gain.setTargetAtTime(0, t, 0.05);
    e.o1.stop(t + 0.3); e.o2.stop(t + 0.3);
    this.eng = null;
  }

  // ---- music: a little loop generated from each world's scale and tempo
  musicStart(world) {
    this.musicStop();
    if (!this.ctx || !this.musicOn || !world?.music) return;
    const m = world.music, sc = SCALES[m.scale] || SCALES.major, len = sc.length;
    const rng = mulberry32(hashStr(world.id));
    const prog = [0, 4, 5, 3];
    const pattern = [];
    for (let s = 0; s < 16; s++) {
      if (s % 4 === 0 || rng() < 0.5) pattern.push(s % 4 === 0 ? [0, 2, 4][Math.floor(rng() * 3)] : Math.floor(rng() * 7) - 1);
      else pattern.push(null);
    }
    const note = (deg) => m.root + 12 * Math.floor(deg / len) + sc[((deg % len) + len) % len];
    const spb = 60 / m.bpm / 2;
    const seq = (this.seq = { step: 0, next: this.ctx.currentTime + 0.1 });
    const bus = this.music;
    const tick = () => {
      while (seq.next < this.ctx.currentTime + 0.2) {
        const s = seq.step, t = seq.next, chord = prog[Math.floor(s / 16) % 4];
        if (s % 4 === 0) this.tone(mtof(note(chord) - 24), spb * 1.8, { type: 'triangle', vol: 0.3, bus, t });
        if (s % 4 === 2) this.tone(mtof(note(chord + 4) - 24), spb * 0.9, { type: 'triangle', vol: 0.16, bus, t });
        const p = pattern[s % 16];
        if (p !== null && !(Math.floor(s / 16) === 3 && s % 16 > 11)) {
          this.tone(mtof(note(chord + p)), spb * 0.9, { type: m.lead, vol: m.lead === 'square' ? 0.06 : 0.1, bus, t });
        }
        if (s % 8 === 0) this.tone(120, 0.15, { type: 'sine', slide: 45, vol: 0.3, bus, t });
        if (s % 2 === 1) this.noise(0.03, { filter: 'highpass', freq: 7000, vol: 0.05, bus, t });
        seq.next += spb;
        seq.step = (s + 1) % 64;
      }
    };
    tick();
    this.seq.timer = setInterval(tick, 40);
  }

  musicStop() {
    if (this.seq) clearInterval(this.seq.timer);
    this.seq = null;
  }

  pauseAll() {
    this.musicStop();
    if (this.eng) this.eng.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
  }

  speak(text) {
    if (!this.voiceOn || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05; u.pitch = 1.3; u.volume = Math.min(1, this.volume * 1.8);
      window.speechSynthesis.speak(u);
    } catch { /* speech not available */ }
  }
}

export const audio = new AudioEngine();
