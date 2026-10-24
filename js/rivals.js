// AI riders: target speed with rubber banding, lane changes, obstacle dodging
// and the odd sneaky bonk attempt.
import { Racer } from './player.js';
import { ROAD_W as W, clamp } from './util.js';

const LANES = [-0.62, 0, 0.62];

export class Rival extends Racer {
  constructor(look, skill, rng) {
    super(look);
    this.skill = skill;
    this.rng = rng;
    this.targetX = 0;
    this.laneT = 1 + rng() * 2;
    this.lastThreat = null;
    this.dodge = false;
  }

  control(dt, race) {
    if (race.state === 'countdown') return;
    const p = race.player, cfg = race.cfg, rng = this.rng;
    const gap = this.d - p.d;
    let target;
    if (cfg.friendly) {
      // Sunday Ride buddies cruise alongside the player.
      target = clamp(p.speed + 2 - gap * 0.4, 6, cfg.maxSpeed * 1.05);
    } else if (cfg.pack) {
      // Bonk Battle: everyone stays in a bunch around the player.
      target = clamp(p.speed - gap * 0.5 + (this.skill - 1) * 40, 8, cfg.maxSpeed * 1.25);
    } else {
      // Rubber banding keeps races close: slower when far ahead, faster when far behind.
      target = Math.min(cfg.rivalTop, cfg.rivalSpeed * this.skill * (1 - clamp(gap / cfg.band, -0.3, 0.15)));
    }
    if (this.finished) target = Math.min(target, 18);
    if (this.puddle === 'slow') target *= 0.5;
    if (this.spin > 0) this.speed = Math.max(0, this.speed - 20 * dt);
    else this.speed += clamp(target - this.speed, -14 * dt, 10 * dt);

    this.laneT -= dt;
    if (this.laneT <= 0) {
      this.laneT = 2 + rng() * 3;
      this.targetX = LANES[Math.floor(rng() * 3)] + (rng() - 0.5) * 0.2;
      if (cfg.rivalBonk && Math.abs(gap) < 25 && rng() < cfg.aggro) {
        this.targetX = clamp(p.x + (this.x < p.x ? -0.28 : 0.28), -0.85, 0.85);
        this.laneT = 1.5;
      }
    }
    const threat = race.obs.threatAhead(this.d, this.x, 45);
    if (threat !== this.lastThreat) {
      this.lastThreat = threat;
      this.dodge = threat && rng() < cfg.avoid;
    }
    if (threat && this.dodge) {
      const clear = threat.hw / W + 0.2;
      let best = this.targetX, bestScore = -1e9;
      for (const lane of LANES) {
        const gapToThreat = Math.abs(lane - threat.x);
        const score = (gapToThreat > clear ? 10 : 0) + gapToThreat - Math.abs(lane - this.x) * 0.5;
        if (score > bestScore) { bestScore = score; best = lane; }
      }
      this.targetX = best;
    }
    this.vx = this.spin > 0 ? 0 : clamp((this.targetX - this.x) * 3, -1.3, 1.3);
    this.x += this.vx * dt;
    if (this.puddle === 'slip') this.x += this.slipDir * 0.6 * dt;
    this.x = clamp(this.x, -1.2, 1.2);
  }
}
