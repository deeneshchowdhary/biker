// The track: a chain of 6 m segments, each with a curve amount, plus hills.
// Positions are described as distance along the road (d) and sideways offset.
// Geometry is split into chunks so the GPU skips chunks that are off screen.
import * as THREE from 'three';
import { MAT, PROPS, checkerTexture } from './models.js';
import { ROAD_W as W, mulberry32 } from './util.js';

export const SEG = 6;
const BACK = 60; // road that exists behind the start line
const CHUNK_SEGS = 64;
const PROP_CHUNK = 400;
const HALF_PI = Math.PI / 2;

// How high the ground beside the road sits, relative to the road, at a given offset.
export function bankHeight(off, bank) {
  const a = Math.abs(off);
  if (a <= W + 3) return 0;
  if (a <= 26) return bank * 0.35 * ((a - (W + 3)) / (26 - (W + 3)));
  return bank * (0.35 + 0.65 * Math.min(1, (a - 26) / 34));
}

export class Track {
  constructor(world, length, seed) {
    this.world = world;
    this.length = length;
    const rng = mulberry32(seed);
    const n = Math.ceil((length + BACK + 500) / SEG) + 1;
    this.n = n;
    this.curv = new Float32Array(n);
    this.hd = new Float32Array(n);
    this.px = new Float32Array(n);
    this.py = new Float32Array(n);
    this.pz = new Float32Array(n);
    this.generate(rng);
    this.group = new THREE.Group();
    this.buildRoad();
    this.buildProps(rng);
    this.buildLines();
  }

  generate(rng) {
    const { n, curv } = this;
    const maxCurve = this.world.curve;
    let i = Math.ceil((BACK + 200) / SEG); // straight start grid
    let heading = 0;
    while (i < n) {
      let len = Math.floor((60 + rng() * 220) / SEG);
      if (rng() < 0.3) { i += len; continue; }
      const amt = maxCurve * (0.45 + rng() * 0.55);
      let sign = rng() < 0.5 ? -1 : 1;
      if (heading > 0.3) sign = -1; else if (heading < -0.3) sign = 1;
      // Ease the curve in and out, and never turn more than ~0.9 rad in one bend,
      // so the road keeps heading forward and never crosses itself.
      len = Math.max(4, Math.min(len, Math.floor((0.9 * Math.PI) / (2 * amt * SEG))));
      for (let k = 0; k < len && i < n; k++, i++) {
        curv[i] = sign * amt * Math.sin((Math.PI * (k + 0.5)) / len);
        heading += curv[i] * SEG;
      }
    }
    const ph1 = rng() * 6.28, ph2 = rng() * 6.28, hills = this.world.hills;
    const elev = (d) => {
      if (d <= 0) return 0;
      const ramp = Math.min(1, d / 300);
      return hills * ramp * (0.6 * Math.sin(d * 0.0045 + ph1) + 0.4 * Math.sin(d * 0.012 + ph2) - (0.6 * Math.sin(ph1) + 0.4 * Math.sin(ph2)) * (1 - ramp));
    };
    const { hd, px, py, pz } = this;
    pz[0] = BACK;
    let minY = 0;
    for (let k = 0; k < n; k++) {
      py[k] = elev(k * SEG - BACK);
      minY = Math.min(minY, py[k]);
      if (k === n - 1) break;
      const hm = hd[k] + curv[k] * SEG * 0.5;
      hd[k + 1] = hd[k] + curv[k] * SEG;
      px[k + 1] = px[k] + Math.sin(hm) * SEG;
      pz[k + 1] = pz[k] - Math.cos(hm) * SEG;
    }
    this.groundY = minY + Math.min(0, this.world.bank) - 3;
  }

  // Writes the world position of (d, lateral metres) into out; returns the heading.
  pointAt(d, lat, out) {
    const f = (d + BACK) / SEG;
    let i = Math.floor(f);
    if (i < 0) i = 0; else if (i > this.n - 2) i = this.n - 2;
    const t = f - i;
    const h = this.hd[i] + (this.hd[i + 1] - this.hd[i]) * t;
    out.set(
      this.px[i] + (this.px[i + 1] - this.px[i]) * t + Math.cos(h) * lat,
      this.py[i] + (this.py[i + 1] - this.py[i]) * t,
      this.pz[i] + (this.pz[i + 1] - this.pz[i]) * t + Math.sin(h) * lat,
    );
    return h;
  }

  index(d) {
    const i = Math.floor((d + BACK) / SEG);
    return i < 0 ? 0 : i > this.n - 2 ? this.n - 2 : i;
  }

  curvAt(d) { return this.curv[this.index(d)]; }

  heightAt(d) {
    const f = (d + BACK) / SEG, i = this.index(d), t = Math.min(1, Math.max(0, f - i));
    return this.py[i] + (this.py[i + 1] - this.py[i]) * t;
  }

  buildRoad() {
    const w = this.world, bank = w.bank;
    const far = (i) => this.groundY - this.py[i];
    const bands = [
      [-140, -60, 'far'], [-60, -26, 'g'], [-26, -W - 3, 'g'], [-W - 3, -W - 0.7, 'g'], [-W - 0.7, -W, 'r'],
      [-W, W, 'road'],
      [W, W + 0.7, 'r'], [W + 0.7, W + 3, 'g'], [W + 3, 26, 'g'], [26, 60, 'g'], [60, 140, 'far'],
    ];
    const col = new THREE.Color();
    const { px, py, pz, hd } = this;
    for (let c0 = 0; c0 < this.n - 1; c0 += CHUNK_SEGS) {
      const c1 = Math.min(this.n - 1, c0 + CHUNK_SEGS);
      const maxQuads = (c1 - c0) * (bands.length + 2);
      const pos = new Float32Array(maxQuads * 18), cols = new Float32Array(maxQuads * 18);
      let v = 0;
      const vert = (i, off, y, c) => {
        // On the inside of a tight bend, pull far ground in so it can't fold over itself.
        const k = this.curv[i];
        if (off * k > 0 && Math.abs(off) > 0.85 / Math.abs(k)) off = Math.sign(off) * (0.85 / Math.abs(k));
        pos[v] =px[i] + Math.cos(hd[i]) * off; pos[v + 1] = py[i] + y; pos[v + 2] = pz[i] + Math.sin(hd[i]) * off;
        cols[v] = c.r; cols[v + 1] = c.g; cols[v + 2] = c.b;
        v += 3;
      };
      const quad = (i, o0, o1, y0a, y1a, y0b, y1b, hex) => {
        col.set(hex);
        vert(i, o0, y0a, col); vert(i, o1, y1a, col); vert(i + 1, o1, y1b, col);
        vert(i, o0, y0a, col); vert(i + 1, o1, y1b, col); vert(i + 1, o0, y0b, col);
      };
      for (let i = c0; i < c1; i++) {
        const alt = Math.floor(i / 3) % 2;
        for (const [o0, o1, kind] of bands) {
          const hex = kind === 'road' ? w.road[alt] : kind === 'r' ? w.rumble[i % 2] : w.ground[alt];
          if (kind === 'far') {
            const inner = o0 < 0 ? o1 : o0;
            const yi = bankHeight(inner, bank);
            const [y0a, y1a, y0b, y1b] = o0 < 0 ? [far(i), yi, far(i + 1), yi] : [yi, far(i), yi, far(i + 1)];
            quad(i, o0, o1, y0a, y1a, y0b, y1b, w.ground[1]);
          } else {
            const y0 = bankHeight(o0, bank), y1 = bankHeight(o1, bank);
            quad(i, o0, o1, y0, y1, y0, y1, hex);
          }
        }
        if (i % 3 === 0) for (const lane of [-W / 3, W / 3]) quad(i, lane - 0.12, lane + 0.12, 0.02, 0.02, 0.02, 0.02, w.line);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos.slice(0, v), 3));
      g.setAttribute('color', new THREE.BufferAttribute(cols.slice(0, v), 3));
      g.computeVertexNormals();
      g.computeBoundingSphere();
      this.group.add(new THREE.Mesh(g, MAT));
    }
  }

  buildProps(rng) {
    const w = this.world;
    const defs = w.props.map((def) => ({ ...def, geo: PROPS[def.m]() }));
    if (w.arch) defs.push({ m: 'arch', geo: PROPS.arch(), every: w.arch.every, center: true, tint: w.arch.tint });
    const end = this.length + 450;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
    for (const def of defs) {
      const items = [];
      if (def.center) {
        for (let d = def.every * 0.5; d < end; d += def.every) items.push({ d, off: 0, side: 1 });
      } else if (def.aligned) {
        for (let d = 20; d < end; d += def.every) {
          if (rng() > (def.chance ?? 1)) continue;
          items.push({ d, off: def.off[0], side: -1 }, { d, off: def.off[0], side: 1 });
        }
      } else {
        let d = -50 + rng() * def.every;
        while (d < end) {
          items.push({ d, off: def.off[0] + rng() * (def.off[1] - def.off[0]), side: rng() < 0.5 ? -1 : 1 });
          d += def.every * (0.4 + rng() * 1.2);
        }
      }
      const chunks = new Map();
      for (const it of items) {
        const k = Math.floor((it.d + BACK) / PROP_CHUNK);
        if (!chunks.has(k)) chunks.set(k, []);
        chunks.get(k).push(it);
      }
      for (const list of chunks.values()) {
        const im = new THREE.InstancedMesh(def.geo, MAT, list.length);
        list.forEach((it, i) => {
          const h = this.pointAt(it.d, it.off * it.side, pos);
          if (it.off) pos.y += bankHeight(it.off, w.bank) - 0.05;
          const yaw = def.aligned || def.center ? -h + (it.side < 0 ? Math.PI : 0) : rng() * Math.PI * 2;
          q.setFromAxisAngle(up, yaw);
          const s = def.scale ? def.scale[0] + rng() * (def.scale[1] - def.scale[0]) : 1;
          const sy = def.sy ? def.sy[0] + rng() * (def.sy[1] - def.sy[0]) : 1;
          sc.set(s, s * sy, s);
          im.setMatrixAt(i, m4.compose(pos, q, sc));
          if (def.tint) im.setColorAt(i, col.set(def.tint[Math.floor(rng() * def.tint.length)]));
        });
        im.computeBoundingSphere();
        this.group.add(im);
      }
    }
  }

  // Start line and the chequered finish banner.
  buildLines() {
    const pos = new THREE.Vector3();
    const tex = checkerTexture();
    this.finishMat = new THREE.MeshLambertMaterial({ map: tex });
    this.whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const place = (d, obj) => {
      const h = this.pointAt(d, 0, pos);
      obj.position.copy(pos);
      obj.rotation.y = -h;
      this.group.add(obj);
    };
    const start = new THREE.Mesh(new THREE.PlaneGeometry(2 * W, 0.6), this.whiteMat);
    start.rotation.x = -HALF_PI;
    start.position.y = 0.03;
    const sg = new THREE.Group();
    sg.add(start);
    place(0, sg);

    const fg = new THREE.Group();
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(2 * W, 3), this.finishMat);
    strip.rotation.x = -HALF_PI;
    strip.position.y = 0.03;
    const banner = new THREE.Mesh(new THREE.BoxGeometry(2 * W + 3, 1.6, 0.3), this.finishMat);
    banner.position.y = 6.2;
    const postGeo = new THREE.BoxGeometry(0.6, 7, 0.6);
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, this.whiteMat);
      post.position.set(s * (W + 1.2), 3.5, 0);
      fg.add(post);
    }
    fg.add(strip, banner);
    place(this.length, fg);
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.isInstancedMesh) o.dispose();
      if (o.geometry) o.geometry.dispose();
    });
    this.finishMat.map.dispose();
    this.finishMat.dispose();
    this.whiteMat.dispose();
    this.group.removeFromParent();
  }
}
