// Touch buttons (Pointer Events, so several fingers work at once), tilt and keyboard.
import { clamp } from './util.js';

const KEYS = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'go', KeyW: 'go', Space: 'boost', ShiftLeft: 'boost',
  KeyZ: 'bonkL', KeyX: 'bonkR', KeyH: 'horn', Escape: 'pause', KeyP: 'pause',
};

export class Input {
  constructor() {
    this.touch = {};
    this.keys = {};
    this.held = {};
    this.edges = new Set();
    this.tilt = 0;
    this.tiltOn = false;
    this.tiltFlip = false;
    document.querySelectorAll('[data-act]').forEach((el) => this.bindButton(el));
    const steer = document.getElementById('steer');
    if (steer) this.bindSteer(steer);
    window.addEventListener('keydown', (e) => {
      const act = KEYS[e.code];
      if (!act) return;
      e.preventDefault();
      if (!e.repeat) { this.keys[act] = true; this.refresh(act); }
    });
    window.addEventListener('keyup', (e) => {
      const act = KEYS[e.code];
      if (act) { this.keys[act] = false; this.refresh(act); }
    });
    window.addEventListener('blur', () => { this.keys = {}; this.touch = {}; Object.keys(this.held).forEach((a) => this.refresh(a)); });
  }

  refresh(act) {
    const on = !!(this.touch[act] || this.keys[act]);
    if (on && !this.held[act]) this.edges.add(act);
    this.held[act] = on;
  }

  bindButton(el) {
    const act = el.dataset.act;
    const ids = new Set();
    const update = () => { this.touch[act] = ids.size > 0; el.classList.toggle('down', ids.size > 0); this.refresh(act); };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      ids.add(e.pointerId);
      try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      update();
    });
    const up = (e) => { ids.delete(e.pointerId); update(); };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // One zone for both arrows, so a thumb can slide between left and right.
  bindSteer(zone) {
    const fingers = new Map();
    const [leftEl, rightEl] = zone.querySelectorAll('[data-dir]');
    const update = () => {
      const r = zone.getBoundingClientRect(), mid = r.left + r.width / 2;
      let l = false, rt = false;
      for (const x of fingers.values()) { if (x < mid) l = true; else rt = true; }
      this.touch.left = l; this.touch.right = rt;
      leftEl.classList.toggle('down', l); rightEl.classList.toggle('down', rt);
      this.refresh('left'); this.refresh('right');
    };
    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      fingers.set(e.pointerId, e.clientX);
      try { zone.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      update();
    });
    zone.addEventListener('pointermove', (e) => { if (fingers.has(e.pointerId)) { fingers.set(e.pointerId, e.clientX); update(); } });
    const up = (e) => { fingers.delete(e.pointerId); update(); };
    zone.addEventListener('pointerup', up);
    zone.addEventListener('pointercancel', up);
    zone.addEventListener('lostpointercapture', up);
  }

  // iOS needs a tap before it shares tilt data; call this from a button handler.
  async enableTilt() {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const result = await DeviceOrientationEvent.requestPermission();
        if (result !== 'granted') return false;
      } else if (typeof DeviceOrientationEvent === 'undefined') return false;
    } catch { return false; }
    if (!this.onTilt) {
      this.onTilt = (e) => {
        if (e.beta === null) return;
        const ang = screen.orientation?.angle ?? window.orientation ?? 0;
        let v = ang === 90 ? e.beta : ang === -90 || ang === 270 ? -e.beta : e.gamma;
        if (this.tiltFlip) v = -v;
        const a = Math.abs(v);
        this.tilt = a < 3 ? 0 : clamp(((a - 3) / 20) * Math.sign(v), -1, 1);
      };
      window.addEventListener('deviceorientation', this.onTilt);
    }
    this.tiltOn = true;
    return true;
  }

  get steer() {
    const keys = (this.held.right ? 1 : 0) - (this.held.left ? 1 : 0);
    return this.tiltOn && this.useTilt ? clamp(this.tilt + keys, -1, 1) : keys;
  }

  pressed(act) { return this.edges.has(act); }

  endFrame() { this.edges.clear(); }
}
