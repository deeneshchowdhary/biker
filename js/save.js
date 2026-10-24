// Progress and settings, kept in localStorage on this device only.

const KEY = 'bonkbikers-save-v1';

const DEFAULTS = {
  coins: 0,
  unlocked: 1, // how many Race Day worlds are open
  races: 0,
  stickers: [],
  best: {}, // best Race Day place per world id
  owned: { bike: ['classic'], color: ['red'], helmet: ['blue'], horn: ['beep'], pet: ['none'] },
  equip: { bike: 'classic', color: 'red', helmet: 'blue', horn: 'beep', pet: 'none' },
  settings: {
    tilt: false,
    tiltFlip: false,
    assist: true,
    autoGo: false,
    difficulty: 'easy',
    bonking: true,
    volume: 0.4,
    music: true,
    voice: true,
    playLimit: 0,
    fps: false,
  },
};

const clone = (o) => JSON.parse(JSON.stringify(o));

function mergeDefaults(def, val) {
  if (Array.isArray(def)) return Array.isArray(val) ? val : clone(def);
  if (def && typeof def === 'object') {
    const out = {};
    const src = val && typeof val === 'object' ? val : {};
    for (const k of Object.keys(def)) out[k] = mergeDefaults(def[k], src[k]);
    for (const k of Object.keys(src)) if (!(k in out)) out[k] = src[k];
    return out;
  }
  return val === undefined || typeof val !== typeof def ? def : val;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return mergeDefaults(DEFAULTS, JSON.parse(raw));
  } catch { /* private mode or corrupt data: start fresh */ }
  return clone(DEFAULTS);
}

export const save = {
  data: load(),
  write() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* storage unavailable */ }
  },
  resetProgress() {
    const settings = this.data.settings;
    this.data = clone(DEFAULTS);
    this.data.settings = settings;
    this.write();
  },
};
