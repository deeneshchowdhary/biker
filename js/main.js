// Starts the game and runs the main loop and screen flow.
import { Stage, Showroom } from './scene.js';
import { Input } from './input.js';
import { Hud } from './hud.js';
import { audio } from './audio.js';
import { save } from './save.js';
import { WORLDS, MENU_MUSIC } from './worlds.js';
import { STICKERS, lookFromSave } from './rewards.js';
import { Race } from './race.js';
import { Menus } from './menus.js';

const stage = new Stage(document.getElementById('game'));
const showroom = new Showroom();
const input = new Input();
const hud = new Hud();
const fpsEl = document.getElementById('fps');

function applyResults(res) {
  const d = save.data, w = WORLDS[res.worldIndex];
  const newStickers = [];
  const give = (id) => { if (!d.stickers.includes(id)) { d.stickers.push(id); newStickers.push(id); } };
  let bonus = 0, unlocked = null;
  if (res.stickerFound) give(`${w.id}-hidden`);
  if (res.mode === 'race') {
    bonus = [25, 18, 12, 8, 6, 5][res.place - 1] ?? 5;
    give(`${w.id}-finish`);
    if (res.place <= 3) {
      give(`${w.id}-podium`);
      if (res.worldIndex === d.unlocked - 1 && d.unlocked < WORLDS.length) { d.unlocked++; unlocked = WORLDS[d.unlocked - 1]; }
    }
    if (res.place === 1) give(`${w.id}-win`);
    d.best[w.id] = Math.min(d.best[w.id] || 99, res.place);
    if (WORLDS.every((x) => d.stickers.includes(`${x.id}-win`))) give('champ');
  } else if (res.mode === 'sunday') {
    bonus = 10;
    give('sunday');
    give(`${w.id}-finish`);
  } else {
    bonus = res.bonks * 2;
    if (res.bonks >= 5) give('bonk5');
    if (res.bonks >= 10) give('bonk10');
  }
  d.races++;
  if (d.races >= 10) give('party');
  const earned = res.coins + bonus;
  d.coins += earned;
  save.write();
  return { earned, newStickers, unlocked, total: STICKERS.length };
}

const app = {
  state: 'title',
  race: null,
  last: null,
  playTime: 0,
  input,

  get settings() { return save.data.settings; },

  applySettings() {
    const s = this.settings;
    audio.setVolume(s.volume);
    audio.voiceOn = s.voice;
    if (audio.musicOn !== s.music) {
      audio.musicOn = s.music;
      if (!s.music) audio.musicStop();
      else if (this.state !== 'race') audio.musicStart(MENU_MUSIC);
    }
    input.tiltFlip = s.tiltFlip;
    input.useTilt = s.tilt;
    document.body.classList.toggle('tilt', s.tilt && input.tiltOn);
    document.body.classList.toggle('no-bonk', !s.bonking);
    fpsEl.classList.toggle('hidden', !s.fps);
  },

  toggleFps() {
    this.settings.fps = !this.settings.fps;
    save.write();
    this.applySettings();
  },

  async start() {
    audio.unlock();
    if (this.settings.tilt) await input.enableTilt();
    this.applySettings();
    this.goMenu();
  },

  goMenu() {
    this.endRace();
    this.state = 'menu';
    menus.show('menu');
    if (!audio.seq) audio.musicStart(MENU_MUSIC);
  },

  napDue() {
    const m = this.settings.playLimit;
    return m > 0 && this.playTime >= m * 60;
  },

  showNap() {
    this.endRace();
    this.state = 'nap';
    audio.musicStop();
    audio.speak('The bikes need a nap!');
    menus.show('nap');
  },

  endNap() {
    this.playTime = 0;
    this.goMenu();
  },

  startRace(mode, worldIndex) {
    if (this.napDue()) return this.showNap();
    this.endRace();
    const world = WORLDS[worldIndex];
    this.race = new Race({
      stage, hud, world, worldIndex, mode,
      settings: this.settings,
      look: lookFromSave(save.data),
      sticker: !save.data.stickers.includes(`${world.id}-hidden`),
    });
    this.race.onDone = (res) => this.finishRace(res);
    this.race.onPause = () => this.pause();
    this.last = { mode, worldIndex };
    document.body.classList.toggle('auto-go', this.race.cfg.autoGo);
    menus.hideAll();
    hud.show();
    audio.musicStart(world);
    this.state = 'race';
  },

  endRace() {
    if (this.race) { this.race.dispose(); this.race = null; }
    hud.hide();
    audio.engineStop();
  },

  finishRace(res) {
    const rewards = applyResults(res);
    this.state = 'results';
    hud.controls.classList.add('hidden');
    audio.engineStop();
    menus.showResults(res, rewards);
  },

  pause() {
    if (this.state !== 'race') return;
    this.state = 'paused';
    audio.pauseAll();
    menus.show('pause');
  },

  resume() {
    if (this.state !== 'paused') return;
    menus.hideAll();
    this.state = 'race';
    audio.musicStart(this.race.world);
  },

  restart() {
    if (this.napDue()) return this.showNap();
    this.startRace(this.last.mode, this.last.worldIndex);
  },

  openGarage() {
    this.state = 'garage';
    menus.preview = null;
    showroom.setLook(lookFromSave(save.data));
    menus.renderGarage();
    menus.show('garage');
  },

  lookChanged() {
    if (this.state === 'garage') showroom.setLook(lookFromSave(save.data));
  },

  previewLook(kind, id) {
    showroom.setLook(lookFromSave(save.data, { [kind]: id }));
  },

  bikeThumb(id) {
    return showroom.thumbnail(stage.renderer, lookFromSave(save.data, { bike: id }));
  },
};

const menus = new Menus(app);
app.applySettings();
menus.show('title');

document.addEventListener('visibilitychange', () => { if (document.hidden) app.pause(); });
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

let lastT = performance.now(), fpsFrames = 0, fpsTime = 0;
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (t - lastT) / 1000));
  lastT = t;
  if ((app.state === 'race' || app.state === 'results') && app.race) {
    app.race.update(dt, input);
    input.animateWheel(dt);
    stage.render();
    if (app.state === 'race') { app.playTime += dt; stage.adapt(dt); }
  } else if (app.state === 'garage') {
    showroom.update(dt);
    showroom.render(stage.renderer);
  }
  input.endFrame();
  fpsFrames++; fpsTime += dt;
  if (fpsTime >= 0.5) {
    if (save.data.settings.fps) fpsEl.textContent = `${Math.round(fpsFrames / fpsTime)} fps · ${stage.pixelRatio}x · ${stage.renderer.info.render.calls} calls · ${(stage.renderer.info.render.triangles / 1000).toFixed(0)}k tris`;
    fpsFrames = 0; fpsTime = 0;
  }
}
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

window.bonk = { app, stage, save }; // handy for debugging in the console
