// Hazards, puddles, ramps, coins, boost stars and the hidden sticker.
import * as THREE from 'three';
import { HAZ, MAT, MAT_COIN, mesh, P, rampGeo, coinGeo, starGeo, stickerGeo } from './models.js';
import { ROAD_W as W, pickWeighted, lowerBound, lerp } from './util.js';

const LANES = [-0.62, 0, 0.62];
const RAMP = { len: 5, h: 1.3, hw: 2.0 };
const _v = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0), _zero = new THREE.Matrix4().makeScale(0, 0, 0);
const HALF_PI = Math.PI / 2;

const MOVES = {
  cross: { amp: 0.95, spd: 0.8 },
  sway: { amp: 0.5, spd: 0.35 },
  roll: { amp: 1.0, spd: 0.9 },
  slide: { amp: 1.0, spd: 1.1 },
  stomp: { amp: 0, spd: 1.6 },
  bounce: { amp: 0.8, spd: 0.8 },
};

export class Obstacles {
  constructor(track, world, mode, rng, opts = {}) {
    this.track = track;
    this.world = world;
    this.group = new THREE.Group();
    this.items = [];
    this.coins = [];
    this.stars = [];
    this.sticker = null;
    this.onStomp = null;
    this.speedScale = mode === 'sunday' ? 0.6 : 1;
    this.generate(mode, rng, opts);
    this.coinMesh = this.buildInstanced(this.coins, coinGeo(), MAT_COIN);
    this.starMesh = this.buildInstanced(this.stars, starGeo(), MAT_COIN);
  }

  generate(mode, rng, opts) {
    const L = this.track.length;
    const diffGap = { easy: 64, normal: 52, hard: 42 }[opts.difficulty] ?? 52;
    const gapMin = mode === 'sunday' ? 100 : mode === 'battle' ? 70 : diffGap;
    const gapVar = mode === 'sunday' ? 70 : 40;
    const rampChance = this.world.rampChance ?? 0.1;
    let d = 230, lastRamp = -1e9;
    while (d < L - 150) {
      const r = rng();
      const lane = LANES[Math.floor(rng() * 3)];
      if (r < rampChance && d - lastRamp > 350) { this.addRamp(d, lane); lastRamp = d; d += 30; }
      else if (r < rampChance + 0.2) this.addPuddle(d, lane, rng);
      else this.addHazard(d, lane, rng);
      d += gapMin + rng() * gapVar;
    }
    for (let cd = 140; cd < L - 60; cd += (mode === 'sunday' ? 90 : 120) + rng() * 70) this.addCoinPattern(cd, rng);
    for (let sd = 400 + rng() * 200; sd < L - 100; sd += (mode === 'sunday' ? 220 : 330) + rng() * 150) {
      this.stars.push(this.pickup(sd, this.freeLane(sd, rng), 1.3));
    }
    if (opts.sticker) {
      const sd = L * (0.35 + rng() * 0.4);
      this.sticker = this.pickup(sd, this.freeLane(sd, rng), 1.6);
      const m = new THREE.Mesh(stickerGeo(), MAT_COIN);
      m.position.set(this.sticker.px, this.sticker.py, this.sticker.pz);
      this.sticker.mesh = m;
      this.group.add(m);
    }
    const byD = (a, b) => a.d - b.d;
    this.items.sort(byD); this.coins.sort(byD); this.stars.sort(byD);
  }

  place(o) {
    const h = this.track.pointAt(o.d, o.x * W, _v);
    o.mesh.position.copy(_v);
    o.mesh.rotation.y = -h;
    o.yaw = -h;
  }

  addHazard(d, lane, rng) {
    const def = pickWeighted(this.world.hazards, rng);
    const spec = HAZ[def.m](rng);
    const o = {
      kind: 'hazard', d, x: def.move ? 0 : lane, hw: spec.hw, hl: spec.hl, h: spec.h, color: spec.color,
      y: 0, active: true, move: def.move, roll: spec.roll, ph: rng() * Math.PI * 2, mesh: mesh(spec.parts),
    };
    if (def.move) Object.assign(o, MOVES[def.move]);
    if (o.spd) o.spd *= this.speedScale;
    this.place(o);
    this.group.add(o.mesh);
    this.items.push(o);
  }

  addPuddle(d, lane, rng) {
    const p = this.world.puddle;
    const big = p.effect === 'slip' ? 1.3 : 1;
    const o = { kind: 'puddle', d, x: lane, hw: (1.6 + rng() * 1.0) * big, hl: (3 + rng() * 2) * big, effect: p.effect, active: true };
    o.mesh = mesh([P(new THREE.CircleGeometry(1, 20), p.color, { rx: -HALF_PI, y: 0.04 })]);
    o.mesh.scale.set(o.hw, 1, o.hl);
    this.place(o);
    this.group.add(o.mesh);
    this.items.push(o);
  }

  addRamp(d, lane) {
    const o = { kind: 'ramp', d, x: lane, ...RAMP, active: true, mesh: new THREE.Mesh(rampGeo(RAMP.len, RAMP.h, RAMP.hw * 2), MAT) };
    this.place(o);
    this.group.add(o.mesh);
    this.items.push(o);
    // A line of coins into the ramp and an arc of coins along the jump.
    for (let k = 0; k < 3; k++) this.coins.push(this.pickup(d - 18 + k * 5, lane, 1.0));
    const v = 30, vy = (v * RAMP.h) / RAMP.len, g = 18;
    for (let k = 0; k < 6; k++) {
      const t = (4 + k * 4.5) / v;
      const y = RAMP.h + vy * t - 0.5 * g * t * t;
      if (y > 0.3) this.coins.push(this.pickup(d + RAMP.len + 4 + k * 4.5, lane, y + 1.0));
    }
  }

  pickup(d, x, y) {
    const h = this.track.pointAt(d, x * W, _v);
    return { d, x, y, px: _v.x, py: _v.y + y, pz: _v.z, yaw: -h, taken: false, hidden: false };
  }

  freeLane(d, rng) {
    const order = [...LANES].sort(() => rng() - 0.5);
    for (const lane of order) {
      if (!this.items.some((o) => Math.abs(o.d - d) < 20 && (o.move || Math.abs(o.x - lane) < 0.45))) return lane;
    }
    return order[0];
  }

  addCoinPattern(d, rng) {
    const lane = this.freeLane(d, rng);
    const t = rng();
    if (t < 0.45) {
      for (let k = 0; k < 5; k++) this.coins.push(this.pickup(d + k * 5, lane, 1.0));
    } else if (t < 0.8) {
      const other = lane === 0 ? (rng() < 0.5 ? -0.62 : 0.62) : 0;
      for (let k = 0; k < 7; k++) {
        const s = (1 - Math.cos((k / 6) * Math.PI)) / 2;
        this.coins.push(this.pickup(d + k * 5, lerp(lane, other, s), 1.0));
      }
    } else {
      for (let k = 0; k < 3; k++) {
        this.coins.push(this.pickup(d + k * 5, lane - 0.22, 1.0), this.pickup(d + k * 5, lane + 0.22, 1.0));
      }
    }
  }

  buildInstanced(list, geo, mat) {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    list.forEach((c, i) => {
      _q.setFromAxisAngle(_up, c.yaw);
      im.setMatrixAt(i, _m.compose(_v.set(c.px, c.py, c.pz), _q, _s.set(1, 1, 1)));
    });
    if (!list.length) im.setMatrixAt(0, _zero);
    im.frustumCulled = false;
    this.group.add(im);
    return im;
  }

  spinPickups(im, list, viewD, time) {
    const lo = lowerBound(list, viewD - 10), hi = lowerBound(list, viewD + 260);
    for (let i = lo; i < hi; i++) {
      const c = list[i];
      if (c.taken) {
        if (!c.hidden) { im.setMatrixAt(i, _zero); c.hidden = true; }
        continue;
      }
      _q.setFromAxisAngle(_up, c.yaw + time * 3 + c.d);
      im.setMatrixAt(i, _m.compose(_v.set(c.px, c.py + Math.sin(time * 4 + c.d) * 0.12, c.pz), _q, _s.set(1, 1, 1)));
    }
    if (hi > lo) im.instanceMatrix.needsUpdate = true;
  }

  update(dt, time, viewD) {
    for (const o of this.items) {
      if (o.move && o.active) {
        const prevY = o.y;
        if (o.move === 'stomp') {
          o.y = Math.max(0, Math.sin(time * o.spd + o.ph)) * 3.5;
          if (prevY > 0 && o.y === 0 && this.onStomp) this.onStomp(o);
        } else {
          o.x = o.amp * Math.sin(time * o.spd + o.ph);
          if (o.move === 'bounce') o.y = Math.abs(Math.sin(time * o.spd * 3.5 + o.ph)) * 2.2;
        }
      }
      const rel = o.d - viewD;
      const vis = rel > -30 && rel < 340 && !o.gone;
      o.mesh.visible = vis;
      if (!vis || !(o.move || o.knock)) continue;
      const k = o.knock;
      if (k) {
        k.t += dt; k.vy -= 20 * dt; k.y += k.vy * dt; k.lat += k.vl * dt; k.fd += k.vf * dt;
        if (k.t > 1.5) { o.gone = true; o.mesh.visible = false; continue; }
      }
      const h = this.track.pointAt(o.d + (k ? k.fd : 0), o.x * W + (k ? k.lat : 0), _v);
      o.mesh.position.copy(_v);
      o.mesh.position.y += o.y + (k ? Math.max(-1, k.y) : 0);
      let yaw = -h;
      if (o.move === 'cross' || o.move === 'slide' || o.move === 'sway') {
        yaw += Math.cos(time * o.spd + o.ph) > 0 ? -HALF_PI : HALF_PI;
      }
      o.mesh.rotation.set(k ? k.t * k.spin : 0, yaw, o.roll ? (-o.x * W) / o.roll : 0);
    }
    this.spinPickups(this.coinMesh, this.coins, viewD, time);
    this.spinPickups(this.starMesh, this.stars, viewD, time);
    if (this.sticker && !this.sticker.taken) {
      this.sticker.mesh.rotation.y = time * 2;
      this.sticker.mesh.position.y = this.sticker.py + Math.sin(time * 3) * 0.2;
    }
  }

  // The nearest dangerous thing in a racer's path, for rival AI.
  threatAhead(d, x, range) {
    for (let i = lowerBound(this.items, d + 2); i < this.items.length && this.items[i].d < d + range; i++) {
      const o = this.items[i];
      if (!o.active || o.kind === 'ramp') continue;
      if (Math.abs(o.x - x) * W < o.hw + 1.0) return o;
    }
    return null;
  }

  collide(r, race) {
    const items = this.items;
    for (let i = lowerBound(items, r.d - 8); i < items.length; i++) {
      const o = items[i];
      if (o.d > r.d + 4) break;
      if (!o.active) continue;
      const lat = Math.abs((r.x - o.x) * W);
      if (o.kind === 'ramp') {
        const dd = r.d - o.d;
        if (dd >= 0 && dd <= o.len && lat < o.hw) { r.rampY = (dd / o.len) * o.h; r.rampSlope = o.h / o.len; }
        continue;
      }
      if (Math.abs(r.d - o.d) > o.hl + 0.8 || lat > o.hw + 0.35) continue;
      if (o.kind === 'puddle') { if (r.jumpY < 0.15) r.puddle = o.effect; continue; }
      if (r.jumpY < o.y + o.h - 0.25 && r.jumpY + 1.6 > o.y + 0.2) race.onHazard(r, o);
    }
  }

  knock(o, r) {
    o.active = false;
    o.knock = {
      t: 0, y: 0, vy: 7 + Math.random() * 3, lat: 0, fd: 0,
      vl: (o.x >= r.x ? 1 : -1) * (4 + Math.random() * 3), vf: r.speed * 0.5 + 3, spin: (Math.random() < 0.5 ? -1 : 1) * 6,
    };
  }

  pickups(r, race, reach) {
    for (const [list, type] of [[this.coins, 'coin'], [this.stars, 'star']]) {
      for (let i = lowerBound(list, r.d - 1.8); i < list.length && list[i].d < r.d + 1.8; i++) {
        const c = list[i];
        if (c.taken) continue;
        if (Math.abs((c.x - r.x) * W) < reach && Math.abs(c.y - (r.jumpY + 0.9)) < 1.4) { c.taken = true; race.onPickup(type, c); }
      }
    }
    const s = this.sticker;
    if (s && !s.taken && Math.abs(s.d - r.d) < 2 && Math.abs((s.x - r.x) * W) < reach + 0.4 && r.jumpY < 2.5) {
      s.taken = true;
      s.mesh.visible = false;
      race.onPickup('sticker', s);
    }
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.isInstancedMesh) o.dispose();
      if (o.geometry) o.geometry.dispose();
    });
    this.group.removeFromParent();
  }
}

