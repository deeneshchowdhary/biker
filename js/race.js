// One play session: Sunday Ride, Race Day or Bonk Battle.
import * as THREE from 'three';
import { Track } from './road.js';
import { Obstacles } from './obstacles.js';
import { Player } from './player.js';
import { Rival } from './rivals.js';
import { audio } from './audio.js';
import { ROAD_W as W, mulberry32, clamp } from './util.js';

const _a = new THREE.Vector3(), _b = new THREE.Vector3();
const RIVAL_COLORS = [0x2f7cf6, 0x34c759, 0xff9500, 0x9b59ff, 0xff6fb5, 0x1fc8c8, 0xffc61a, 0xe8413b];
const RIVAL_HELMETS = [0xffd60a, 0xf5f5f5, 0xff70a6, 0x2ecc71, 0x3a86ff, 0xff9500];
const NOODLES = [0x3cf07a, 0x4fd6ff, 0xffe14d, 0xb47bff, 0xff8a3c, 0xff5fa2];
const RIVAL_BIKES = ['superbike', 'gp', 'hyper', 'classic', 'motocross', 'superbike'];
const DIFF = {
  easy: { rival: 27, top: 31.5, aggro: 0.2, bonkGap: 8, avoid: 0.6 },
  normal: { rival: 30, top: 34.5, aggro: 0.4, bonkGap: 5, avoid: 0.8 },
  hard: { rival: 32.5, top: 37, aggro: 0.6, bonkGap: 3.5, avoid: 0.93 },
};
const PLACE_WORDS = ['Hooray! You came first!', 'Great riding! Second place!', 'Yay! Third place!', 'You finished! Well done!'];

export function makeCfg(mode, s) {
  const D = DIFF[s.difficulty] || DIFF.easy;
  const sunday = mode === 'sunday', battle = mode === 'battle';
  return {
    mode,
    difficulty: s.difficulty,
    length: sunday ? 3000 : battle ? 6000 : 5000,
    timeLimit: battle ? 90 : 0,
    maxSpeed: sunday ? 24 : 34,
    autoGo: sunday || s.autoGo,
    assist: sunday || s.assist,
    assistStrength: sunday ? 1.0 : 0.5,
    rivals: sunday ? 2 : 5,
    friendly: sunday,
    rivalSpeed: D.rival,
    rivalTop: D.top,
    band: 150,
    pack: battle,
    bonking: s.bonking,
    rivalBonk: s.bonking && !sunday,
    aggro: battle ? Math.min(1, D.aggro * 2.2) : D.aggro,
    bonkGap: battle ? D.bonkGap * 0.6 : D.bonkGap,
    avoid: D.avoid,
    reach: sunday ? 1.6 : 1.2,
  };
}

export class Race {
  constructor({ stage, hud, world, worldIndex, mode, settings, look, sticker }) {
    this.stage = stage;
    this.hud = hud;
    this.world = world;
    this.worldIndex = worldIndex;
    this.cfg = makeCfg(mode, settings);
    stage.setWorld(world);
    this.track = new Track(world, this.cfg.length, 1000 + worldIndex * 77);
    stage.scene.add(this.track.group);
    const rng = mulberry32((Math.random() * 1e9) | 0);
    this.obs = new Obstacles(this.track, world, mode, rng, { difficulty: settings.difficulty, sticker });
    this.obs.onStomp = (o) => {
      if (Math.abs(o.d - this.player.d) < 70) { audio.stomp(); this.shake = Math.max(this.shake, 0.25); }
    };
    stage.scene.add(this.obs.group);

    this.player = new Player({ ...look, noodle: 0xff5fa2 });
    const colors = RIVAL_COLORS.filter((c) => c !== look.color);
    this.rivals = [];
    for (let i = 0; i < this.cfg.rivals; i++) {
      const r = new Rival({
        bike: RIVAL_BIKES[i % RIVAL_BIKES.length], color: colors[i % colors.length], helmet: RIVAL_HELMETS[i % RIVAL_HELMETS.length],
        jersey: colors[(i + 3) % colors.length], noodle: NOODLES[i % NOODLES.length], pet: 'none',
      }, 0.95 + rng() * 0.09, rng);
      if (this.cfg.friendly) { r.d = -3 - i * 3; r.x = i % 2 ? 0.55 : -0.55; }
      else { r.d = 6 + Math.floor(i / 2) * 6; r.x = i % 2 ? 0.5 : -0.5; if (i === 4) r.x = 0; }
      this.rivals.push(r);
    }
    this.racers = [this.player, ...this.rivals];
    for (const r of this.racers) { stage.scene.add(r.root); r.updateModel(this.track, 0); }

    this.state = 'countdown';
    this.countT = 3.999;
    this.lastCount = 4;
    this.time = 0;
    this.clock = 0;
    this.coins = 0; this.stars = 0; this.bonks = 0; this.stickerFound = false;
    this.finishCount = 0;
    this.endT = 0;
    this.lastPlayerBonked = -99;
    this.lastBump = 0;
    this.shake = 0;
    this.camReady = false;
    this.lookAt = new THREE.Vector3();
    this.done = false;
    this.onDone = null;
    this.onPause = null;
    hud.start(this);
    this.updateCamera(0);
  }

  update(dt, inp) {
    const P = this.player, cfg = this.cfg;
    this.clock += dt;
    if (inp.pressed('pause')) { this.onPause?.(); return; }
    if (inp.pressed('horn')) audio.horn(P.look.horn);

    if (this.state === 'countdown') {
      this.countT -= dt;
      const n = Math.ceil(this.countT);
      if (n !== this.lastCount) {
        this.lastCount = n;
        if (n > 0) { this.hud.countdown(String(n)); audio.beep(false); audio.speak(['One', 'Two', 'Three'][n - 1]); }
        else { this.state = 'racing'; this.hud.countdown('GO!'); audio.beep(true); audio.speak('Go!'); audio.engineStart(); }
      }
    } else if (this.state === 'racing') {
      this.time += dt;
      if (inp.pressed('boost')) { if (P.tryBoost()) { audio.boost(); this.hud.toast('⚡'); } else audio.denied(); }
      if (cfg.bonking && (inp.pressed('bonkL') || inp.pressed('bonkR'))) this.playerBonk(inp.pressed('bonkL') ? -1 : 1);
      if (cfg.mode !== 'sunday') P.boostMeter = Math.min(1, P.boostMeter + dt * 0.025);
      if (cfg.timeLimit && this.time >= cfg.timeLimit) this.endSession();
    }

    if (this.state !== 'countdown') {
      P.control(dt, inp, this);
      for (const r of this.rivals) r.control(dt, this);
      for (const r of this.racers) this.stepRacer(r, dt);
      this.bikeBumps();
      if (cfg.rivalBonk && this.state === 'racing') this.rivalBonks(dt);
      this.checkFinish();
    }
    this.obs.update(dt, this.clock, P.d);
    for (const r of this.racers) r.updateModel(this.track, dt);
    this.stage.confetti.update(dt);
    this.updateCamera(dt);
    this.hud.update(this);
    audio.engineSet(clamp(P.speed / 45, 0, 1), P.boostT > 0);
    if (this.state === 'finished') {
      this.endT += dt;
      if (this.endT > 3 && !this.done) { this.done = true; this.onDone?.(this.results()); }
    }
  }

  stepRacer(r, dt) {
    const P = this.player;
    r.tick(dt);
    r.d += r.speed * dt;
    r.puddle = null;
    this.obs.collide(r, this);
    if (r.puddle !== r.prevPuddle) {
      if (r.puddle) {
        r.slipDir = Math.random() < 0.5 ? -1 : 1;
        if (r === P) {
          audio.splash();
          this.burstAt(r, 14, [this.world.puddle.color, 0xffffff], 4);
        }
      }
      r.prevPuddle = r.puddle;
    }
    const ev = r.vertical(dt);
    if (r === P) {
      if (ev === 'launch') audio.jump();
      if (ev === 'land') { audio.land(); this.shake = Math.max(this.shake, 0.15); }
      this.obs.pickups(r, this, this.cfg.reach);
    }
  }

  onHazard(r, o) {
    if (o.move !== 'stomp') this.obs.knock(o, r);
    const hurt = r.hitObstacle();
    if (r === this.player) {
      audio.bump();
      this.burstAt(r, 18, [o.color, 0xffffff, 0xffd23f], 5);
      if (hurt) this.shake = 0.35;
    }
  }

  onPickup(type, item) {
    const P = this.player;
    if (type === 'coin') { this.coins++; audio.coin(); this.burstAt(P, 5, [0xffd23f, 0xfff1a8], 3, item.y); }
    if (type === 'star') {
      this.stars++;
      P.boostMeter = Math.min(1, P.boostMeter + 1 / 3);
      audio.star();
      this.hud.toast('⭐');
      this.burstAt(P, 16, [0xffe14d, 0xffffff], 4, item.y);
    }
    if (type === 'sticker') {
      this.stickerFound = true;
      audio.sticker();
      audio.speak('You found a sticker!');
      this.hud.toast('🌟 Sticker! 🌟');
      this.burstAt(P, 50, undefined, 7, 1.6);
    }
  }

  playerBonk(side) {
    const P = this.player;
    if (P.swing > 0 || P.spin > 0 || P.bonkCd > 0) return;
    let best = null, bestScore = 1e9;
    for (const r of this.rivals) {
      const dd = r.d - P.d, lat = (r.x - P.x) * W;
      if (Math.abs(dd) < 4.2 && Math.abs(lat) < 3.6 && r.spin <= 0 && Math.abs(r.jumpY - P.jumpY) < 1.5) {
        const score = Math.abs(dd) + Math.abs(lat) * 0.5;
        if (score < bestScore) { bestScore = score; best = r; }
      }
    }
    // Kids don't need to pick the right side: aim at whoever is in reach.
    P.startSwing(best ? Math.sign(best.x - P.x) || side : side);
    P.bonkCd = 0.55;
    audio.whoosh();
    if (best && best.bonked(1.5)) {
      this.bonks++;
      audio.bonk();
      this.burstAt(best, 40, undefined, 6, 1.4);
      this.hud.toast('💥 BONK!');
      if (this.cfg.mode === 'battle') this.coins += 2;
    }
  }

  rivalBonks(dt) {
    const P = this.player, cfg = this.cfg;
    for (const r of this.rivals) {
      if (r.bonkCd > 0 || r.spin > 0) continue;
      // Rivals bonk each other now and then, which is fun to watch.
      for (const o of this.rivals) {
        if (o === r || o.spin > 0 || Math.abs(o.d - r.d) > 2.5 || Math.abs(o.x - r.x) * W > 2.6) continue;
        if (Math.random() < dt * 0.3) {
          r.startSwing(Math.sign(o.x - r.x) || 1);
          r.bonkCd = 4;
          if (o.bonked(1.2) && Math.abs(o.d - P.d) < 60) { audio.bonk(); this.burstAt(o, 25, undefined, 5, 1.4); }
        }
      }
      const dd = r.d - P.d, lat = (P.x - r.x) * W;
      if (Math.abs(dd) < 2.6 && Math.abs(lat) < 2.8 && this.time - this.lastPlayerBonked > cfg.bonkGap && P.spin <= 0 && P.grace <= 0 && Math.random() < dt * 2) {
        r.startSwing(Math.sign(lat) || 1);
        r.bonkCd = 4;
        if (P.bonked(0.8)) {
          this.lastPlayerBonked = this.time;
          audio.boing();
          this.burstAt(P, 30, undefined, 5, 1.4);
          this.shake = 0.3;
        }
      }
    }
  }

  // Gentle shoves so bikes never pass through each other.
  bikeBumps() {
    const all = this.racers;
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      if (Math.abs(a.d - b.d) > 1.9 || Math.abs(a.jumpY - b.jumpY) > 1) continue;
      const lat = (a.x - b.x) * W;
      if (Math.abs(lat) > 0.95) continue;
      const push = ((0.95 - Math.abs(lat)) / W) * 0.5 * (Math.sign(lat) || 1);
      a.x += push; b.x -= push;
      if ((a === this.player || b === this.player) && this.clock - this.lastBump > 0.6) { this.lastBump = this.clock; audio.land(); }
    }
  }

  checkFinish() {
    if (this.cfg.timeLimit) return;
    for (const r of this.racers) {
      if (r.finished || r.d < this.track.length) continue;
      r.finished = true;
      r.finishOrder = ++this.finishCount;
      if (r === this.player) this.endSession();
    }
  }

  endSession() {
    if (this.state === 'finished') return;
    this.state = 'finished';
    const mode = this.cfg.mode;
    audio.fanfare();
    this.burstAt(this.player, 120, undefined, 9, 2);
    if (mode === 'race') {
      const place = this.currentPlace();
      this.hud.countdown(['🥇', '🥈', '🥉'][place - 1] || '🏁');
      audio.speak(PLACE_WORDS[Math.min(place, 4) - 1]);
    } else if (mode === 'battle') {
      this.hud.countdown('💥');
      audio.speak(`Time's up! You bonked ${this.bonks} times!`);
    } else {
      this.hud.countdown('🌈');
      audio.speak('You did it! What a lovely ride!');
    }
  }

  currentPlace() {
    const P = this.player;
    if (P.finished) return P.finishOrder;
    let place = 1;
    for (const r of this.rivals) if (r.finished || r.d > P.d) place++;
    return place;
  }

  results() {
    return {
      mode: this.cfg.mode, worldIndex: this.worldIndex, place: this.cfg.mode === 'race' ? this.currentPlace() : 0,
      time: this.time, coins: this.coins, stars: this.stars, bonks: this.bonks, stickerFound: this.stickerFound,
    };
  }

  burstAt(r, count, colors, power, up = 1.2) {
    this.track.pointAt(r.d, r.x * W, _a);
    _a.y += up + r.jumpY;
    this.stage.confetti.burst(_a, count, colors, power);
  }

  updateCamera(dt) {
    const P = this.player, cam = this.stage.camera;
    const back = 6.5 + P.speed * 0.04, up = 2.6 + P.speed * 0.02;
    this.track.pointAt(P.d - back, P.x * W * 0.8, _a);
    _a.y += up + P.jumpY * 0.6;
    this.track.pointAt(P.d + 10, P.x * W * 0.6, _b);
    _b.y += 1.0 + P.jumpY * 0.8;
    if (!this.camReady) { cam.position.copy(_a); this.lookAt.copy(_b); this.camReady = true; }
    else { cam.position.lerp(_a, 1 - Math.exp(-dt * 8)); this.lookAt.lerp(_b, 1 - Math.exp(-dt * 10)); }
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      const s = this.shake * 0.6;
      cam.position.x += (Math.random() - 0.5) * s; cam.position.y += (Math.random() - 0.5) * s;
    }
    cam.lookAt(this.lookAt);
    cam.rotateZ(-clamp(this.track.curvAt(P.d + 15) * P.speed * 0.25, -0.1, 0.1));
    const fov = 62 + P.speed * 0.22 + (P.boostT > 0 ? 8 : 0);
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov += (fov - cam.fov) * Math.min(1, dt * 4 || 1); cam.updateProjectionMatrix(); }
    this.stage.ground.position.set(cam.position.x, this.track.groundY, cam.position.z);
  }

  dispose() {
    audio.engineStop();
    for (const r of this.racers) r.dispose();
    this.track.dispose();
    this.obs.dispose();
  }
}
