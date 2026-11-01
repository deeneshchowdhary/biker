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

  // ---- engine: a 4-cylinder racing bike that revs through the gears
  engineStart() {
    const c = this.ctx;
    if (!c || this.eng) return;
    const o1 = c.createOscillator(), o2 = c.createOscillator(), o3 = c.createOscillator();
    o1.type = 'sawtooth'; o2.type = 'square'; o3.type = 'sawtooth';
    const g1 = c.createGain(), g2 = c.createGain(), g3 = c.createGain();
    g1.gain.value = 0.5; g2.gain.value = 0.35; g3.gain.value = 0.18;
    // Rasp: filtered noise riding on top of the tone.
    const rasp = c.createBufferSource();
    rasp.buffer = this.noiseBuf; rasp.loop = true;
    const rf = c.createBiquadFilter(); rf.type = 'bandpass'; rf.Q.value = 3;
    const rg = c.createGain(); rg.gain.value = 0.12;
    // Soft clipping gives the growl; the lowpass opens up with the throttle.
    const shaper = c.createWaveShaper();
    const curve = new Float32Array(512);
    for (let i = 0; i < 512; i++) { const x = (i / 255.5) - 1; curve[i] = Math.tanh(x * 3.5); }
    shaper.curve = curve;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 1.5;
    const g = c.createGain(); g.gain.value = 0;
    o1.connect(g1); o2.connect(g2); o3.connect(g3); rasp.connect(rf); rf.connect(rg);
    g1.connect(shaper); g2.connect(shaper); g3.connect(shaper); rg.connect(shaper);
    shaper.connect(f); f.connect(g); g.connect(this.sfx);
    const t = c.currentTime;
    for (const o of [o1, o2, o3]) o.start(t);
    rasp.start(t);
    this.eng = { o1, o2, o3, rf, f, g, rasp, gear: 0, rpm: 3000, shift: 0, blip: 0 };
  }

  // A quick throttle blip, e.g. revving on the start line.
  engineBlip() { if (this.eng) this.eng.blip = 1; }

  engineSet(speed, throttle, boost, dt) {
    const e = this.eng;
    if (!e) return;
    const GEARS = [0, 8, 14, 20, 26, 32, 40, 99];
    let gear = 0;
    while (gear < GEARS.length - 2 && speed > GEARS[gear + 1]) gear++;
    if (gear > e.gear && throttle) { e.shift = 0.12; this.pop(0.12); }
    e.gear = gear;
    const lo = GEARS[gear], hi = GEARS[gear + 1];
    const inGear = Math.min(1, (speed - lo) / (hi - lo));
    e.blip = Math.max(0, e.blip - dt * 2.5);
    e.shift = Math.max(0, e.shift - dt);
    let target = speed < 1 ? 2400 + e.blip * 7000 : 4500 + inGear * 9000 + (throttle ? 600 : -800) + (boost ? 1200 : 0);
    if (e.shift > 0) target -= 3500;
    e.rpm += (target - e.rpm) * Math.min(1, dt * (e.shift > 0 ? 30 : 10));
    const fire = (e.rpm / 60) * 2; // 4-cylinder, 4-stroke firing frequency
    const t = this.ctx.currentTime;
    e.o1.frequency.setTargetAtTime(fire, t, 0.02);
    e.o2.frequency.setTargetAtTime(fire * 0.5, t, 0.02);
    e.o3.frequency.setTargetAtTime(fire * 2.01, t, 0.02);
    e.rf.frequency.setTargetAtTime(fire * 3, t, 0.03);
    const open = throttle || e.blip > 0.1 ? 1 : 0.35;
    e.f.frequency.setTargetAtTime(500 + fire * 4 * open + (boost ? 1500 : 0), t, 0.05);
    e.g.gain.setTargetAtTime(0.05 + 0.05 * open + (boost ? 0.03 : 0), t, 0.06);
    // Crackles from the exhaust when easing off at speed.
    if (!throttle && speed > 12 && Math.random() < dt * 7) this.pop(0.08);
  }

  pop(vol = 0.1) {
    this.noise(0.05, { filter: 'bandpass', freq: 900 + Math.random() * 900, vol });
    this.tone(70 + Math.random() * 40, 0.06, { type: 'square', vol: vol * 0.6 });
  }

  // A rival zooming past: a quick Doppler-style drop in pitch.
  passBy() {
    const now = this.ctx?.currentTime ?? 0;
    if (!this.ctx || now - (this.lastPass || 0) < 0.4) return;
    this.lastPass = now;
    this.tone(420, 0.55, { type: 'sawtooth', slide: 210, vol: 0.06, attack: 0.05 });
    this.noise(0.5, { filter: 'bandpass', freq: 1800, slide: 500, vol: 0.08 });
  }

  engineStop() {
    const e = this.eng;
    if (!e) return;
    const t = this.ctx.currentTime;
    e.g.gain.setTargetAtTime(0, t, 0.05);
    for (const o of [e.o1, e.o2, e.o3, e.rasp]) o.stop(t + 0.3);
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
