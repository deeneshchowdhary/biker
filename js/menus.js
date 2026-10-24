// Title, mode and world select, garage, sticker book, settings, pause, results, nap.
import { WORLDS } from './worlds.js';
import { SHOP, STICKERS, stickerIcon } from './rewards.js';
import { save } from './save.js';
import { audio } from './audio.js';
import { PLACE_ICON, fmtTime } from './hud.js';

const $ = (id) => document.getElementById(id);
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const SCREENS = ['title', 'menu', 'worlds', 'garage', 'stickers', 'settings', 'pause', 'results', 'nap'];
const MODE_ICON = { sunday: '🌼', race: '🏁', battle: '💥' };
const TABS = [['bike', '🏍️'], ['color', '🎨'], ['helmet', '⛑️'], ['horn', '📯'], ['pet', '🐶']];

// A button that must be held (a "grown-up gate").
export function holdButton(el, ms, onDone) {
  let timer = null;
  el.style.setProperty('--hold', `${ms}ms`);
  const cancel = () => { clearTimeout(timer); timer = null; el.classList.remove('holding'); };
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    el.classList.add('holding');
    timer = setTimeout(() => { cancel(); onDone(); }, ms);
  });
  el.addEventListener('pointerup', cancel);
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

const tap = (el, fn) => el.addEventListener('click', (e) => { audio.click(); fn(e); });

export class Menus {
  constructor(app) {
    this.app = app;
    this.mode = 'race';
    this.tab = 'bike';
    this.titleTaps = [];

    tap($('btn-start'), () => app.start());
    $('logo').addEventListener('pointerdown', () => {
      const now = performance.now();
      this.titleTaps = this.titleTaps.filter((t) => now - t < 2500);
      this.titleTaps.push(now);
      if (this.titleTaps.length >= 5) { this.titleTaps = []; app.toggleFps(); }
    });
    document.querySelectorAll('.tile[data-mode]').forEach((el) => tap(el, () => this.openWorlds(el.dataset.mode)));
    tap($('btn-garage'), () => app.openGarage());
    tap($('btn-stickers'), () => { this.renderStickers(); this.show('stickers'); });
    document.querySelectorAll('[data-back]').forEach((el) => tap(el, () => app.goMenu()));
    holdButton($('gate-settings'), 3000, () => { this.renderSettings(); this.show('settings'); });
    holdButton($('gate-nap'), 3000, () => app.endNap());
    tap($('btn-resume'), () => app.resume());
    tap($('btn-restart'), () => app.restart());
    tap($('btn-home'), () => app.goMenu());
    tap($('res-again'), () => app.restart());
    tap($('res-next'), () => app.startRace(this.lastRes.mode, this.lastRes.worldIndex + 1));
    tap($('res-home'), () => app.goMenu());
  }

  show(name) {
    for (const s of SCREENS) $(`screen-${s}`).classList.toggle('hidden', s !== name);
    this.current = name;
    this.refreshCoins();
  }

  hideAll() { for (const s of SCREENS) $(`screen-${s}`).classList.add('hidden'); this.current = null; }

  refreshCoins() { document.querySelectorAll('.coin-count').forEach((el) => { el.textContent = save.data.coins; }); }

  // ---- world select
  openWorlds(mode) {
    this.mode = mode;
    $('worlds-title').textContent = `${MODE_ICON[mode]} ${{ sunday: 'Sunday Ride', race: 'Race Day', battle: 'Bonk Battle' }[mode]}`;
    const box = $('world-cards');
    box.innerHTML = '';
    const d = save.data;
    WORLDS.forEach((w, i) => {
      const locked = mode !== 'sunday' && i >= d.unlocked;
      const card = document.createElement('button');
      card.className = 'card' + (locked ? ' locked' : '');
      card.style.setProperty('--sky', hex(w.sky));
      card.style.setProperty('--ground', hex(w.ground[0]));
      card.style.setProperty('--road', hex(w.road[0]));
      card.style.setProperty('--line', hex(w.line));
      card.style.setProperty('--rumble', hex(w.rumble[1]));
      const got = ['finish', 'podium', 'win', 'hidden'].map((k) => (d.stickers.includes(`${w.id}-${k}`) ? '●' : '○')).join('');
      const best = d.best[w.id] ? PLACE_ICON[d.best[w.id] - 1] : '';
      card.innerHTML = `<span class="ico">${w.icon}</span><span class="lbl">${w.name}</span><span class="sub">${best} <span class="dots">${got}</span></span>${locked ? '<span class="lock">🔒</span>' : ''}`;
      tap(card, () => {
        if (locked) { audio.denied(); card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); return; }
        this.app.startRace(mode, i);
      });
      box.appendChild(card);
    });
    this.show('worlds');
  }

  // ---- garage
  renderGarage() {
    const d = save.data;
    const tabs = $('garage-tabs');
    tabs.innerHTML = '';
    for (const [id, icon] of TABS) {
      const b = document.createElement('button');
      b.className = 'tab' + (id === this.tab ? ' on' : '');
      b.textContent = icon;
      tap(b, () => { this.tab = id; this.preview = null; this.app.lookChanged(); this.renderGarage(); });
      tabs.appendChild(b);
    }
    const list = $('garage-items');
    list.innerHTML = '';
    list.classList.toggle('bikes', this.tab === 'bike');
    for (const item of SHOP[this.tab]) {
      const owned = d.owned[this.tab].includes(item.id);
      const equipped = d.equip[this.tab] === item.id;
      const previewing = this.preview?.tab === this.tab && this.preview.id === item.id;
      const b = document.createElement('button');
      b.className = `item${equipped ? ' equipped' : ''}${owned ? ' owned' : ''}${previewing ? ' preview' : ''}${!owned && d.coins < item.price ? ' poor' : ''}`;
      let face;
      if (this.tab === 'bike') face = `<img class="thumb" alt="" src="${this.app.bikeThumb(item.id)}"><span class="name">${item.name}</span>`;
      else if (item.hex !== undefined) face = `<span class="swatch" style="background:${hex(item.hex)}">${this.tab === 'helmet' ? '⛑️' : ''}</span>`;
      else face = `<span class="emoji">${item.icon}</span>`;
      const price = owned ? (equipped ? '✅' : '') : previewing ? `<span class="buy">🪙 ${item.price} ✔</span>` : `🪙 ${item.price}`;
      b.innerHTML = `${face}<span class="price">${price}</span>`;
      tap(b, () => this.choose(item, owned, b));
      list.appendChild(b);
    }
    this.refreshCoins();
  }

  // First tap on something you don't own shows it on the turntable; the second tap buys it.
  choose(item, owned, el) {
    const d = save.data, tab = this.tab;
    if (!owned) {
      if (!(this.preview?.tab === tab && this.preview.id === item.id)) {
        this.preview = { tab, id: item.id };
        this.app.previewLook(tab, item.id);
        if (tab === 'horn') audio.horn(item.id);
        this.renderGarage();
        return;
      }
      if (d.coins < item.price) { audio.denied(); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); return; }
      d.coins -= item.price;
      d.owned[tab].push(item.id);
      audio.sticker();
    }
    this.preview = null;
    d.equip[this.tab] = item.id;
    if (this.tab === 'horn') audio.horn(item.id);
    save.write();
    this.app.lookChanged();
    this.renderGarage();
  }

  // ---- sticker book
  renderStickers() {
    const d = save.data;
    const grid = $('sticker-grid');
    grid.innerHTML = '';
    for (const s of STICKERS) {
      const el = document.createElement('div');
      const has = d.stickers.includes(s.id);
      el.className = 'sticker' + (has ? '' : ' locked');
      el.innerHTML = `<span>${s.icon}</span>`;
      grid.appendChild(el);
    }
    $('sticker-count').textContent = `${d.stickers.length} / ${STICKERS.length}`;
  }

  // ---- grown-up settings
  renderSettings() {
    const s = save.data.settings;
    const box = $('settings-list');
    box.innerHTML = '';
    const rows = [
      { key: 'tilt', icon: '📱', label: 'Tilt steering', type: 'toggle' },
      { key: 'tiltFlip', icon: '🔁', label: 'Flip tilt direction', type: 'toggle' },
      { key: 'assist', icon: '🧲', label: 'Steering helper (Race Day)', type: 'toggle' },
      { key: 'autoGo', icon: '🚀', label: 'Auto-go (Race Day)', type: 'toggle' },
      { key: 'difficulty', icon: '💪', label: 'Rival speed', type: 'choice', options: [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']] },
      { key: 'bonking', icon: '💥', label: 'Bonking', type: 'toggle' },
      { key: 'volume', icon: '🔊', label: 'Volume', type: 'range' },
      { key: 'music', icon: '🎵', label: 'Music', type: 'toggle' },
      { key: 'voice', icon: '🗣️', label: 'Voice cues', type: 'toggle' },
      { key: 'playLimit', icon: '⏰', label: 'Play timer', type: 'choice', options: [[0, 'Off'], [10, '10m'], [20, '20m'], [30, '30m'], [45, '45m']] },
      { key: 'fps', icon: '📊', label: 'Show FPS', type: 'toggle' },
    ];
    for (const row of rows) {
      const el = document.createElement('div');
      el.className = 'setting';
      el.innerHTML = `<span class="label">${row.icon} ${row.label}</span><span class="ctrl"></span>`;
      const ctrl = el.querySelector('.ctrl');
      const set = async (v) => {
        if (row.key === 'tilt' && v) {
          const ok = await this.app.input.enableTilt();
          if (!ok) { v = false; audio.denied(); }
        }
        s[row.key] = v;
        save.write();
        this.app.applySettings();
        this.renderSettings();
      };
      if (row.type === 'toggle') {
        const b = document.createElement('button');
        b.className = 'toggle' + (s[row.key] ? ' on' : '');
        b.innerHTML = '<i></i>';
        tap(b, () => set(!s[row.key]));
        ctrl.appendChild(b);
      } else if (row.type === 'choice') {
        for (const [v, t] of row.options) {
          const b = document.createElement('button');
          b.className = 'opt' + (s[row.key] === v ? ' on' : '');
          b.textContent = t;
          tap(b, () => set(v));
          ctrl.appendChild(b);
        }
      } else {
        const r = document.createElement('input');
        r.type = 'range'; r.min = 0; r.max = 1; r.step = 0.05; r.value = s.volume;
        r.addEventListener('input', () => { s.volume = Number(r.value); this.app.applySettings(); });
        r.addEventListener('change', () => { save.write(); audio.coin(); });
        ctrl.appendChild(r);
      }
      box.appendChild(el);
    }
    const reset = document.createElement('div');
    reset.className = 'setting';
    reset.innerHTML = '<span class="label">🧹 Reset coins, stickers & garage</span><span class="ctrl"><button class="gate pill danger"><span class="fill"></span><span class="txt">Hold 3s</span></button></span>';
    holdButton(reset.querySelector('button'), 3000, () => { save.resetProgress(); this.app.lookChanged(); audio.splash(); this.renderSettings(); });
    box.appendChild(reset);
    const note = document.createElement('p');
    note.className = 'note';
    note.textContent = 'Bonk Bikers has no ads, purchases, accounts or internet features. Progress is saved only on this device.';
    box.appendChild(note);
  }

  // ---- results
  showResults(res, rewards) {
    this.lastRes = res;
    const w = WORLDS[res.worldIndex];
    let medal, title;
    if (res.mode === 'race') { medal = PLACE_ICON[res.place - 1]; title = ['First place!', 'Second place!', 'Third place!'][res.place - 1] || 'You finished!'; }
    else if (res.mode === 'battle') { medal = '💥'; title = `${res.bonks} bonks!`; }
    else { medal = '🌈'; title = 'Lovely ride!'; }
    $('res-medal').textContent = medal;
    $('res-title').textContent = title;
    const stats = [`🪙 +${rewards.earned}`];
    if (res.mode !== 'sunday') stats.unshift(`⏱ ${fmtTime(res.time)}`);
    if (res.mode !== 'battle') stats.push(`⭐ ${res.stars}`);
    if (res.bonks) stats.push(`💥 ${res.bonks}`);
    $('res-stats').innerHTML = stats.map((t) => `<span class="pill">${t}</span>`).join('');
    const rw = $('res-rewards');
    rw.innerHTML = '';
    rewards.newStickers.forEach((id, i) => {
      const el = document.createElement('span');
      el.className = 'new-sticker';
      el.style.animationDelay = `${0.3 + i * 0.25}s`;
      el.textContent = stickerIcon(id);
      rw.appendChild(el);
    });
    if (rewards.unlocked) {
      const el = document.createElement('span');
      el.className = 'unlock pill';
      el.textContent = `🔓 ${rewards.unlocked.icon}`;
      rw.appendChild(el);
    }
    const nextOk = res.worldIndex + 1 < WORLDS.length && (res.mode === 'sunday' || res.worldIndex + 1 < save.data.unlocked);
    $('res-next').classList.toggle('hidden', !nextOk);
    $('res-next').textContent = nextOk ? `▶ ${WORLDS[res.worldIndex + 1].icon}` : '▶';
    $('res-again').textContent = `🔄 ${w.icon}`;
    if (rewards.newStickers.length) setTimeout(() => audio.sticker(), 400);
    this.show('results');
  }
}
