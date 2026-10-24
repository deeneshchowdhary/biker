// Shared rider physics (Racer) and the player's bike.
import * as THREE from 'three';
import { buildBike } from './models.js';
import { shopItem } from './rewards.js';
import { ROAD_W as W, clamp } from './util.js';

const _v = new THREE.Vector3();
export const GRAVITY = 18;
export const SWING_TIME = 0.38;

export class Racer {
  constructor(look) {
    this.look = look;
    this.bike = buildBike(look);
    this.d = 0; this.x = 0; this.speed = 0; this.vx = 0;
    this.jumpY = 0; this.vy = 0; this.rampY = null; this.rampSlope = 0; this.wasOnRamp = false;
    this.spin = 0; this.spinDur = 1; this.wobble = 0; this.grace = 0;
    this.swing = 0; this.swingSide = 1; this.bonkCd = 0;
    this.boostT = 0; this.lean = 0;
    this.puddle = null; this.prevPuddle = null; this.slipDir = 1;
    this.finished = false; this.finishOrder = 0;
  }

  get root() { return this.bike.root; }

  tick(dt) {
    this.spin = Math.max(0, this.spin - dt);
    this.wobble = Math.max(0, this.wobble - dt);
    this.grace = Math.max(0, this.grace - dt);
    this.swing = Math.max(0, this.swing - dt);
    this.bonkCd = Math.max(0, this.bonkCd - dt);
    this.boostT = Math.max(0, this.boostT - dt);
  }

  // Ramps, jumps and landing. Returns 'launch', 'land' or null.
  vertical(dt) {
    let ev = null;
    if (this.rampY !== null && this.rampY >= this.jumpY - 0.1) {
      this.jumpY = this.rampY;
      this.vy = this.speed * this.rampSlope;
      this.wasOnRamp = true;
    } else {
      if (this.wasOnRamp) { this.wasOnRamp = false; if (this.vy > 2) ev = 'launch'; }
      if (this.jumpY > 0 || this.vy > 0) {
        this.vy -= GRAVITY * dt;
        this.jumpY += this.vy * dt;
        if (this.jumpY <= 0) {
          if (this.vy < -4) ev = 'land';
          this.jumpY = 0; this.vy = 0;
        }
      }
    }
    this.rampY = null;
    return ev;
  }

  startSwing(side) { this.swing = SWING_TIME; this.swingSide = side; }

  // Got bonked: a silly spin, then back up.
  bonked(power = 1) {
    if (this.spin > 0 || this.grace > 0) return false;
    this.spinDur = this.spin = 1.0 * power;
    this.speed *= 0.45;
    this.grace = this.spin + 0.8;
    return true;
  }

  hitObstacle() {
    if (this.grace > 0) return false;
    this.wobble = 0.9;
    this.speed *= 0.45;
    this.grace = 1.0;
    return true;
  }

  updateModel(track, dt) {
    const b = this.bike;
    const h = track.pointAt(this.d, this.x * W, _v);
    b.root.position.copy(_v);
    b.root.rotation.y = -h;
    const slope = (track.heightAt(this.d + 1.5) - track.heightAt(this.d - 1.5)) / 3;
    this.lean += (clamp(-this.vx * 0.32, -0.6, 0.6) - this.lean) * Math.min(1, dt * 8);
    let rz = this.lean;
    if (this.wobble > 0) rz += Math.sin(this.wobble * 28) * 0.28 * Math.min(1, this.wobble * 2);
    let ry = 0;
    if (this.spin > 0) {
      const p = 1 - this.spin / this.spinDur;
      ry = (1 - (1 - p) * (1 - p)) * Math.PI * 4;
    }
    const air = this.jumpY > 0 ? clamp(this.vy * 0.03, -0.25, 0.3) : 0;
    b.lean.position.y = this.jumpY + (this.spin > 0 ? Math.sin((this.spin / this.spinDur) * Math.PI) * 0.6 : 0);
    b.lean.rotation.set(Math.atan(slope) + air, ry, rz);
    const s = 1 / (1 + this.jumpY * 0.35);
    b.shadow.scale.set(s, s, 1);
    for (const w of b.wheels) w.rotation.x -= (this.speed * dt) / b.wheelR;
    const n = b.noodle;
    if (this.swing > 0) {
      const a = Math.sin((1 - this.swing / SWING_TIME) * Math.PI);
      n.rotation.set(0.7 - a * 0.9, 0, -0.2 + a * (-this.swingSide * 1.6 + 0.2));
    } else {
      n.rotation.set(0.7 + Math.sin(this.d * 0.5) * 0.05, 0, -0.2);
    }
    if (b.flame) {
      const on = this.boostT > 0;
      b.flame.visible = on || this.speed > 3;
      const fs = on ? 1.3 + Math.random() * 0.5 : 0.4 + this.speed / 70;
      b.flame.scale.set(fs * 0.8, fs * 0.8, fs);
    }
  }

  dispose() {
    this.bike.dispose();
    this.bike.root.removeFromParent();
  }
}

export class Player extends Racer {
  constructor(look) {
    super(look);
    const stats = shopItem('bike', look.bike);
    this.stats = { speed: stats.speed ?? 1, accel: stats.accel ?? 1, boost: stats.boost ?? 1 };
    this.boostMeter = 1 / 3;
    this.offroad = false;
  }

  tryBoost() {
    if (this.boostMeter < 0.33 || this.spin > 0) return false;
    this.boostMeter = Math.max(0, this.boostMeter - 1 / 3);
    this.boostT = 2.2 * this.stats.boost;
    return true;
  }

  control(dt, inp, race) {
    const cfg = race.cfg;
    const racing = race.state === 'racing';
    const go = racing && (cfg.autoGo || inp.held.go);
    let maxV = cfg.maxSpeed * this.stats.speed;
    if (!racing) maxV = 16; // coasting after the finish line
    if (this.boostT > 0) maxV *= 1.4;
    if (this.offroad) maxV *= 0.55;
    if (this.puddle === 'slow') maxV *= 0.5;
    const accel = (this.boostT > 0 ? 30 : 12) * this.stats.accel;
    if (this.spin > 0) this.speed = Math.max(0, this.speed - 20 * dt);
    else if (go || (!racing && this.speed < maxV)) {
      this.speed = this.speed < maxV ? Math.min(maxV, this.speed + accel * dt) : Math.max(maxV, this.speed - 22 * dt);
    } else this.speed = Math.max(0, this.speed - (this.speed > maxV ? 22 : 9) * dt);

    const steer = this.spin > 0 || !racing ? 0 : inp.steer;
    const grip = this.jumpY > 0.3 ? 0.6 : 1;
    const target = steer * 1.7 * grip * Math.min(1, this.speed / 6 + 0.3);
    this.vx += (target - this.vx) * Math.min(1, dt * 7);
    // Bends push the bike outwards; the steering helper softens this.
    const drift = race.track.curvAt(this.d) * this.speed * this.speed * 0.028 * (cfg.assist ? 0.35 : 1);
    let dx = this.vx - drift;
    if ((cfg.assist || !racing) && Math.abs(steer) < 0.15) dx -= this.x * cfg.assistStrength;
    if (this.puddle === 'slip') dx += this.slipDir * 0.8;
    this.x += dx * dt;
    if (Math.abs(this.x) > 1.5) { this.x = Math.sign(this.x) * 1.5; this.speed *= 1 - dt * 2; }
    this.offroad = Math.abs(this.x) > 1.03 && this.jumpY < 0.2;
  }
}
