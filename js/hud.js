// Place, timer, coins, stars, bonks, boost pips and the progress bar.
const $ = (id) => document.getElementById(id);
export const PLACE_ICON = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣'];
const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

export function fmtTime(t) {
  const s = Math.max(0, Math.floor(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export class Hud {
  constructor() {
    this.root = $('hud');
    this.controls = $('controls');
    this.el = { place: $('hud-place'), time: $('hud-time'), coins: $('hud-coins'), stars: $('hud-stars'), bonks: $('hud-bonks') };
    this.bar = document.querySelector('#hud-progress .bar');
    this.countEl = $('countdown');
    this.toastEl = $('toast');
    this.pips = [...document.querySelectorAll('#boost-pips i')];
    this.boostBtn = document.querySelector('.ctl.boost');
    this.cache = {};
    this.dots = [];
  }

  set(key, text) {
    if (this.cache[key] === text) return;
    this.cache[key] = text;
    this.el[key].textContent = text;
  }

  start(race) {
    const mode = race.cfg.mode;
    this.cache = {};
    this.el.place.classList.toggle('hidden', mode !== 'race');
    this.el.time.classList.toggle('hidden', mode === 'sunday');
    this.el.bonks.classList.toggle('hidden', mode !== 'battle' || !race.cfg.bonking);
    this.el.stars.classList.toggle('hidden', mode === 'battle');
    $('hud-progress').classList.toggle('hidden', mode === 'battle');
    this.dots.forEach((d) => d.remove());
    this.dots = race.racers.map((r, i) => {
      const d = document.createElement('div');
      d.className = 'dot' + (i === 0 ? ' me' : '');
      d.style.background = hex(r.look.helmet);
      this.bar.appendChild(d);
      return d;
    });
    this.countEl.className = '';
    this.toastEl.className = '';
  }

  show() { this.root.classList.remove('hidden'); this.controls.classList.remove('hidden'); }
  hide() { this.root.classList.add('hidden'); this.controls.classList.add('hidden'); }

  update(race) {
    const p = race.player, cfg = race.cfg;
    if (cfg.mode === 'race') {
      const place = race.currentPlace();
      this.set('place', `${PLACE_ICON[place - 1]} ${ORD[place - 1]}`);
    }
    if (cfg.mode === 'battle') this.set('time', `⏱ ${fmtTime(cfg.timeLimit - race.time + 0.99)}`);
    else this.set('time', `⏱ ${fmtTime(race.time)}`);
    this.set('coins', `🪙 ${race.coins}`);
    this.set('stars', `⭐ ${race.stars}`);
    this.set('bonks', `💥 ${race.bonks}`);
    const L = race.track.length;
    race.racers.forEach((r, i) => { this.dots[i].style.left = `${Math.min(100, Math.max(0, (r.d / L) * 100))}%`; });
    const m = Math.round(p.boostMeter * 30);
    if (this.cache.boost !== m) {
      this.cache.boost = m;
      this.pips.forEach((el, i) => el.classList.toggle('on', p.boostMeter >= (i + 1) / 3 - 0.001));
      this.boostBtn.classList.toggle('ready', p.boostMeter >= 0.33);
    }
  }

  countdown(text) {
    const el = this.countEl;
    el.textContent = text;
    el.className = '';
    void el.offsetWidth; // restart the animation
    el.className = 'pop';
  }

  toast(text) {
    const el = this.toastEl;
    el.textContent = text;
    el.className = '';
    void el.offsetWidth;
    el.className = 'pop';
  }
}
