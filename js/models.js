// Low-poly models built in code. Every model is merged into one vertex-coloured
// geometry so each object costs a single draw call.
import * as THREE from 'three';
import { ROAD_W as W, pick } from './util.js';

export const MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
export const MAT_GLOW = new THREE.MeshBasicMaterial({ vertexColors: true });
export const MAT_COIN = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x4a3000 });

const HALF_PI = Math.PI / 2;
const DARK = 0x2a2a33, METAL = 0xc9ced8, SKIN = 0xf5c592, PANTS = 0x37589a, WHITE = 0xffffff, LIGHT = 0xfff3a6;

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _qq = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);

export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const cyl = (rt, rb, h, seg = 10) => new THREE.CylinderGeometry(rt, rb, h, seg);
export const sph = (r, ws = 10, hs = 8) => new THREE.SphereGeometry(r, ws, hs);
export const cone = (r, h, seg = 8) => new THREE.ConeGeometry(r, h, seg);
const dome = (r, ws = 12, hs = 6) => new THREE.SphereGeometry(r, ws, hs, 0, Math.PI * 2, 0, HALF_PI);

// A coloured, transformed part ready for merge().
export function P(geo, color, o = {}) {
  if (o.q) _q.copy(o.q); else _q.setFromEuler(_e.set(o.rx || 0, o.ry || 0, o.rz || 0));
  _p.set(o.x || 0, o.y || 0, o.z || 0);
  const s = o.s ?? 1;
  _s.set(o.sx ?? s, o.sy ?? s, o.sz ?? s);
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  g.applyMatrix4(_m.compose(_p, _q, _s));
  return { g, color };
}

// A box or rod stretched between two points.
export function seg(a, b, t, color, round = false) {
  _a.fromArray(a); _b.fromArray(b);
  const len = _a.distanceTo(_b);
  _qq.setFromUnitVectors(_up, _b.sub(_a).normalize());
  const geo = round ? cyl(t / 2, t / 2, len, 8) : box(t, len, t);
  return P(geo, color, { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, z: (a[2] + b[2]) / 2, q: _qq });
}

export function merge(parts) {
  let n = 0;
  for (const p of parts) n += p.g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const { g, color } of parts) {
    const cnt = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    _c.set(color);
    for (let i = 0; i < cnt; i++) {
      const k = (o + i) * 3;
      col[k] = _c.r; col[k + 1] = _c.g; col[k + 2] = _c.b;
    }
    o += cnt;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

export const mesh = (parts, mat = MAT) => new THREE.Mesh(merge(parts), mat);

// ---------------------------------------------------------------- bikes

const BIKES = {
  // Sport racing bike: fairing, windscreen, clip-on bars, upswept tail.
  classic: {
    wheelR: 0.36, wf: -0.8, wb: 0.75, seatY: 0.98, seatZ: 0.3, barY: 0.98, barZ: -0.5, tuck: true,
    body: (C) => {
      const parts = [
        P(box(0.48, 0.42, 0.95), C, { y: 0.66, z: -0.3 }),
        P(box(0.54, 0.07, 0.97), WHITE, { y: 0.74, z: -0.3 }),
        P(box(0.4, 0.14, 0.7), DARK, { y: 0.4, z: -0.25 }),
        P(box(0.46, 0.36, 0.34), C, { y: 0.9, z: -0.66, rx: 0.5 }),
        P(box(0.38, 0.3, 0.04), 0x9fe3ff, { y: 1.1, z: -0.63, rx: 0.75 }),
        P(box(0.42, 0.22, 0.45), C, { y: 0.92, z: -0.2 }),
        P(box(0.34, 0.1, 0.4), DARK, { y: 0.96, z: 0.25 }),
        P(box(0.3, 0.2, 0.55), C, { y: 1.0, z: 0.62, rx: -0.25 }),
        P(box(0.31, 0.05, 0.56), WHITE, { y: 1.08, z: 0.62, rx: -0.25 }),
        P(box(0.2, 0.06, 0.06), 0xff3030, { y: 0.98, z: 0.9 }),
        seg([0, 0.36, -0.8], [0, 0.95, -0.55], 0.09, METAL, true),
        seg([0, 0.45, 0.1], [0, 0.36, 0.75], 0.1, DARK),
        P(box(0.62, 0.05, 0.05), DARK, { y: 0.98, z: -0.5 }),
        P(cyl(0.07, 0.09, 0.55, 8), METAL, { x: 0.2, y: 0.6, z: 0.6, rx: HALF_PI - 0.25 }),
      ];
      for (const s of [-1, 1]) {
        parts.push(
          P(cyl(0.06, 0.06, 0.04, 8), LIGHT, { x: s * 0.1, y: 0.86, z: -0.84, rx: HALF_PI }),
          P(cyl(0.15, 0.15, 0.02, 12), WHITE, { x: s * 0.25, y: 0.62, z: -0.3, rz: HALF_PI }),
          P(cyl(0.07, 0.07, 0.025, 8), DARK, { x: s * 0.255, y: 0.62, z: -0.3, rz: HALF_PI }),
        );
      }
      return parts;
    },
  },
  scooter: {
    wheelR: 0.24, wf: -0.62, wb: 0.6, seatY: 0.8, seatZ: 0.3, barY: 1.15, barZ: -0.6,
    body: (C) => [
      P(box(0.42, 0.12, 1.25), C, { y: 0.3 }),
      P(box(0.46, 0.34, 0.6), C, { y: 0.55, z: 0.36 }),
      P(box(0.36, 0.1, 0.5), DARK, { y: 0.78, z: 0.32 }),
      P(box(0.42, 0.8, 0.14), C, { y: 0.66, z: -0.52, rx: 0.15 }),
      seg([0, 0.24, -0.62], [0, 1.15, -0.6], 0.08, METAL, true),
      P(box(0.8, 0.06, 0.06), DARK, { y: 1.15, z: -0.6 }),
      P(cyl(0.1, 0.1, 0.08, 12), LIGHT, { y: 0.98, z: -0.64, rx: HALF_PI }),
    ],
  },
  chopper: {
    wheelR: 0.38, wf: -1.25, wb: 0.8, seatY: 0.8, seatZ: 0.36, barY: 1.42, barZ: -0.6,
    body: (C) => [
      P(box(0.26, 0.2, 1.4), DARK, { y: 0.48, z: 0.05 }),
      P(box(0.4, 0.3, 0.6), C, { y: 0.82, z: -0.25 }),
      P(box(0.42, 0.12, 0.55), DARK, { y: 0.8, z: 0.4 }),
      P(box(0.1, 0.55, 0.1), METAL, { y: 1.05, z: 0.66 }),
      seg([0.12, 0.38, -1.25], [0.12, 1.3, -0.62], 0.08, METAL, true),
      seg([-0.12, 0.38, -1.25], [-0.12, 1.3, -0.62], 0.08, METAL, true),
      P(box(0.05, 0.3, 0.05), METAL, { x: 0.34, y: 1.36, z: -0.6 }),
      P(box(0.05, 0.3, 0.05), METAL, { x: -0.34, y: 1.36, z: -0.6 }),
      P(box(0.8, 0.06, 0.06), DARK, { y: 1.42, z: -0.6 }),
      P(cyl(0.13, 0.13, 0.08, 12), LIGHT, { y: 1.12, z: -0.8, rx: HALF_PI }),
      P(cyl(0.06, 0.06, 1.0, 8), METAL, { x: 0.24, y: 0.35, z: 0.4, rx: HALF_PI }),
    ],
  },
  banana: {
    wheelR: 0.34, wf: -0.8, wb: 0.75, seatY: 0.86, seatZ: 0.22, barY: 1.18, barZ: -0.62,
    body: (C) => [
      P(new THREE.TorusGeometry(0.95, 0.2, 8, 18, Math.PI * 0.55), 0xffd93b, { y: 1.5, rz: -HALF_PI - Math.PI * 0.275, ry: HALF_PI }),
      P(sph(0.11, 6, 4), 0x6b4a1c, { y: 0.9, z: 0.72 }),
      P(sph(0.11, 6, 4), 0x6b4a1c, { y: 0.9, z: -0.72 }),
      P(box(0.2, 0.2, 1.1), C, { y: 0.42 }),
      P(box(0.34, 0.1, 0.5), DARK, { y: 0.8, z: 0.22 }),
      seg([0, 0.34, -0.8], [0, 1.18, -0.62], 0.08, METAL, true),
      P(box(0.85, 0.06, 0.06), DARK, { y: 1.18, z: -0.62 }),
    ],
  },
  rocket: {
    wheelR: 0.28, wf: -0.75, wb: 0.75, seatY: 0.98, seatZ: 0.25, barY: 1.12, barZ: -0.6,
    flame: true,
    body: (C) => [
      P(cyl(0.3, 0.3, 1.6, 12), C, { y: 0.66, rx: HALF_PI }),
      P(cone(0.3, 0.55, 12), WHITE, { y: 0.66, z: -1.07, rx: -HALF_PI }),
      P(box(0.06, 0.45, 0.4), WHITE, { x: 0.3, y: 0.75, z: 0.65, rz: -0.5 }),
      P(box(0.06, 0.45, 0.4), WHITE, { x: -0.3, y: 0.75, z: 0.65, rz: 0.5 }),
      P(cyl(0.22, 0.26, 0.2, 12), DARK, { y: 0.66, z: 0.85, rx: HALF_PI }),
      P(cyl(0.1, 0.1, 0.04, 10), 0x9fe3ff, { x: 0.29, y: 0.72, z: -0.4, rz: HALF_PI }),
      P(cyl(0.1, 0.1, 0.04, 10), 0x9fe3ff, { x: -0.29, y: 0.72, z: -0.4, rz: HALF_PI }),
      P(box(0.36, 0.1, 0.55), DARK, { y: 0.98, z: 0.25 }),
      seg([0, 0.9, -0.55], [0, 1.12, -0.6], 0.06, METAL, true),
      P(box(0.85, 0.06, 0.06), DARK, { y: 1.12, z: -0.6 }),
    ],
  },
};

function riderParts(b, jersey, helmet) {
  const { seatY: sy, seatZ: sz, barY, barZ, tuck } = b;
  // Racers crouch low behind the windscreen; other bikes sit upright.
  const hipY = sy + 0.12, shY = sy + (tuck ? 0.5 : 0.68), shZ = sz - (tuck ? 0.5 : 0.22);
  const headY = sy + (tuck ? 0.74 : 0.98), headZ = sz - (tuck ? 0.68 : 0.3);
  const knee = tuck ? [sy - 0.08, sz - 0.3] : [sy + 0.05, sz - 0.5];
  const foot = tuck ? [sy - 0.42, sz + 0.05] : [sy - 0.4, sz - 0.45];
  const legs = tuck ? jersey : PANTS;
  const parts = [
    P(box(0.42, 0.22, 0.42), legs, { y: hipY, z: sz }),
    seg([0, hipY, sz], [0, shY, shZ], 0.42, jersey),
    P(sph(0.21, 12, 10), SKIN, { y: headY, z: headZ }),
    P(new THREE.SphereGeometry(0.245, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), helmet, { y: headY + 0.02, z: headZ + 0.01 }),
    P(box(0.08, 0.02, 0.02), DARK, { y: headY - 0.09, z: headZ - 0.2 }),
    tuck
      ? P(box(0.36, 0.1, 0.06), 0x222a44, { y: headY + 0.06, z: headZ - 0.2 })
      : P(box(0.34, 0.04, 0.12), helmet, { y: headY + 0.05, z: headZ - 0.24 }),
  ];
  if (tuck) parts.push(P(box(0.08, 0.06, 0.4), WHITE, { y: headY + 0.24, z: headZ + 0.02 }));
  for (const s of [-1, 1]) {
    parts.push(
      seg([s * 0.16, hipY, sz - 0.1], [s * 0.22, knee[0], knee[1]], 0.15, legs),
      seg([s * 0.22, knee[0], knee[1]], [s * 0.22, foot[0], foot[1]], 0.13, legs),
      P(box(0.18, 0.1, 0.26), DARK, { x: s * 0.22, y: foot[0] - 0.05, z: foot[1] - 0.07 }),
      seg([s * 0.24, shY, shZ], [s * 0.32, barY, barZ], 0.12, jersey),
      P(sph(0.07, 6, 5), SKIN, { x: s * 0.33, y: barY, z: barZ }),
      P(sph(0.035, 6, 4), DARK, { x: s * 0.075, y: headY, z: headZ - 0.195 }),
      P(sph(0.04, 6, 4), 0xff9a9a, { x: s * 0.13, y: headY - 0.07, z: headZ - 0.15 }),
    );
  }
  return parts;
}

const PET_COLORS = { dog: 0xa8743f, cat: 0xf39c34, duck: 0xffd83a, bunny: 0xf7f2ee };

function petParts(pet, C) {
  if (!PET_COLORS[pet]) return [];
  const x = 0.78, py = 0.78, pz = 0.05, col = PET_COLORS[pet];
  const parts = [
    P(box(0.5, 0.32, 0.85), C, { x, y: 0.42, z: 0.1 }),
    P(cyl(0.2, 0.2, 0.12, 12), DARK, { x: x + 0.1, y: 0.2, z: 0.1, rz: HALF_PI }),
    seg([0.15, 0.45, 0.1], [x - 0.25, 0.42, 0.1], 0.06, METAL, true),
    P(sph(0.2, 10, 8), col, { x, y: py - 0.12, z: pz + 0.05, sy: 0.9 }),
    P(sph(0.17, 10, 8), col, { x, y: py + 0.14, z: pz - 0.05 }),
    P(sph(0.03, 6, 4), DARK, { x: x - 0.06, y: py + 0.18, z: pz - 0.2 }),
    P(sph(0.03, 6, 4), DARK, { x: x + 0.06, y: py + 0.18, z: pz - 0.2 }),
  ];
  for (const s of [-1, 1]) {
    if (pet === 'dog') parts.push(P(box(0.06, 0.16, 0.1), 0x6b4423, { x: x + s * 0.15, y: py + 0.12, z: pz - 0.05 }));
    if (pet === 'cat') parts.push(P(cone(0.06, 0.12, 4), col, { x: x + s * 0.09, y: py + 0.3, z: pz - 0.05 }));
    if (pet === 'bunny') parts.push(P(box(0.06, 0.3, 0.08), col, { x: x + s * 0.06, y: py + 0.42, z: pz - 0.03 }));
  }
  if (pet === 'dog') parts.push(P(sph(0.08, 6, 5), 0xd9b48a, { x, y: py + 0.1, z: pz - 0.2 }), P(sph(0.035, 6, 4), DARK, { x, y: py + 0.12, z: pz - 0.28 }));
  if (pet === 'cat' || pet === 'bunny') parts.push(P(sph(0.03, 6, 4), 0xff8fa3, { x, y: py + 0.1, z: pz - 0.21 }));
  if (pet === 'duck') parts.push(P(box(0.14, 0.05, 0.12), 0xff8c1a, { x, y: py + 0.1, z: pz - 0.22 }));
  return parts;
}

function wheelMesh(r) {
  const w = 0.16;
  return mesh([
    P(cyl(r, r, w, 14), DARK, { rz: HALF_PI }),
    P(cyl(r * 0.5, r * 0.5, w + 0.02, 10), METAL, { rz: HALF_PI }),
    P(box(w + 0.04, r * 1.7, 0.07), METAL),
  ]);
}

let shadowMat = null;
const SHADOW_GEO = new THREE.PlaneGeometry(1.4, 2.6);
function shadowMesh() {
  if (!shadowMat) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 4, 32, 32, 32);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    shadowMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });
  }
  const m = new THREE.Mesh(SHADOW_GEO, shadowMat);
  m.rotation.x = -HALF_PI;
  m.position.y = 0.05;
  return m;
}

// look: { bike, color, helmet, jersey, pet, noodle }
export function buildBike(look) {
  const b = BIKES[look.bike] || BIKES.classic;
  const root = new THREE.Group();
  const lean = new THREE.Group();
  lean.rotation.order = 'YXZ';
  root.add(lean);
  const body = mesh([...b.body(look.color), ...riderParts(b, look.jersey ?? look.color, look.helmet), ...petParts(look.pet, look.color)]);
  lean.add(body);
  const wheels = [wheelMesh(b.wheelR), wheelMesh(b.wheelR)];
  wheels[0].position.set(0, b.wheelR, b.wf);
  wheels[1].position.set(0, b.wheelR, b.wb);
  lean.add(...wheels);
  const noodle = new THREE.Group();
  noodle.position.set(0, b.seatY + (b.tuck ? 0.55 : 0.72), b.seatZ - (b.tuck ? 0.4 : 0.15));
  const noodleColor = look.noodle ?? 0xff5fa2;
  noodle.add(mesh([P(cyl(0.08, 0.08, 1.5, 8), noodleColor, { y: 0.8 }), P(sph(0.085, 8, 4), noodleColor, { y: 1.55 })]));
  noodle.rotation.set(0.7, 0, -0.2);
  lean.add(noodle);
  let flame = null;
  if (b.flame) {
    flame = mesh([P(cone(0.2, 0.7, 10), 0xff8a00, { rx: HALF_PI, z: 0.35 }), P(cone(0.11, 0.45, 8), 0xfff176, { rx: HALF_PI, z: 0.25 })], MAT_GLOW);
    flame.position.set(0, 0.66, 0.95);
    lean.add(flame);
  }
  const shadow = shadowMesh();
  root.add(shadow);
  const dispose = () => root.traverse((o) => { if (o.isMesh && o.geometry !== SHADOW_GEO) o.geometry.dispose(); });
  return { root, lean, body, wheels, wheelR: b.wheelR, noodle, flame, shadow, dispose };
}

// ---------------------------------------------------------------- scenery

export const PROPS = {
  tree: () => merge([
    P(cyl(0.25, 0.35, 2.2, 6), 0x8b5a2b, { y: 1.1 }),
    P(sph(1.5, 7, 5), 0x3fae49, { y: 3.1 }),
    P(sph(1.05, 7, 5), 0x5cc95e, { x: 0.5, y: 4.0, z: 0.3 }),
  ]),
  bush: () => merge([P(sph(1, 7, 5), 0x48b04f, { y: 0.45, sy: 0.75 }), P(sph(0.7, 7, 5), 0x5cc95e, { x: 0.75, y: 0.4, sy: 0.75 })]),
  fence: () => {
    const parts = [];
    for (let z = -6; z <= 6; z += 3) parts.push(P(box(0.16, 1.1, 0.16), WHITE, { y: 0.55, z }));
    parts.push(P(box(0.08, 0.14, 12.1), WHITE, { y: 0.85 }), P(box(0.08, 0.14, 12.1), WHITE, { y: 0.45 }));
    return merge(parts);
  },
  barn: () => merge([
    P(box(6, 4, 7), 0xc0392b, { y: 2 }),
    P(cyl(3.6, 3.6, 7.4, 3), 0x8e2b20, { y: 5.08, rx: -HALF_PI, sz: 0.6 }),
    P(box(2.4, 3, 0.1), WHITE, { y: 1.5, z: 3.53 }),
    P(box(2.0, 2.6, 0.12), 0x8e2b20, { y: 1.4, z: 3.54 }),
  ]),
  cow: () => {
    const parts = [
      P(box(1.7, 0.85, 0.8), WHITE, { y: 1.1 }),
      P(box(0.6, 0.55, 0.82), DARK, { x: 0.2, y: 1.2 }),
      P(box(0.3, 0.3, 0.82), DARK, { x: -0.5, y: 1.0 }),
      P(box(0.55, 0.55, 0.5), WHITE, { x: 1.05, y: 1.45 }),
      P(box(0.2, 0.3, 0.42), 0xffb3c1, { x: 1.38, y: 1.35 }),
    ];
    for (const s of [-1, 1]) {
      parts.push(P(cone(0.06, 0.25, 5), 0xfff2cc, { x: 1.0, y: 1.82, z: s * 0.2 }));
      parts.push(P(box(0.18, 0.7, 0.18), WHITE, { x: 0.6, y: 0.35, z: s * 0.25 }), P(box(0.18, 0.7, 0.18), WHITE, { x: -0.6, y: 0.35, z: s * 0.25 }));
    }
    return merge(parts);
  },
  hayroll: () => merge([P(cyl(0.8, 0.8, 1.3, 10), 0xe9c46a, { y: 0.8, rz: HALF_PI })]),
  lollipop: () => merge([
    P(cyl(0.09, 0.09, 3, 6), WHITE, { y: 1.5 }),
    P(cyl(1.0, 1.0, 0.25, 16), WHITE, { y: 3.8, rx: HALF_PI }),
    P(cyl(0.62, 0.62, 0.27, 16), 0xffd6ea, { y: 3.8, rx: HALF_PI }),
    P(cyl(0.28, 0.28, 0.29, 12), WHITE, { y: 3.8, rx: HALF_PI }),
  ]),
  candycane: () => {
    const parts = [P(cyl(0.2, 0.2, 4, 8), WHITE, { y: 2 })];
    for (let y = 0.4; y < 4; y += 0.8) parts.push(P(cyl(0.21, 0.21, 0.32, 8), 0xe63946, { y }));
    parts.push(P(new THREE.TorusGeometry(0.6, 0.2, 6, 10, Math.PI), 0xe63946, { x: 0.6, y: 4 }));
    return merge(parts);
  },
  gumdrop: () => merge([
    P(dome(1.1, 10, 5), WHITE, { sy: 1.3 }),
    P(sph(0.12, 4, 3), 0xf0f0f0, { x: 0.5, y: 0.9, z: 0.6 }),
    P(sph(0.12, 4, 3), 0xf0f0f0, { x: -0.6, y: 0.7, z: 0.5 }),
  ]),
  cupcake: () => merge([
    P(cyl(1.0, 0.75, 1.1, 10), 0xd4a373, { y: 0.55 }),
    P(dome(1.15, 10, 5), 0xffc8dd, { y: 1.1, sy: 0.9 }),
    P(sph(0.25, 8, 6), 0xe63946, { y: 2.2 }),
  ]),
  rockwall: () => merge([
    P(box(7, 9, 9), WHITE, { y: 4.5 }),
    P(box(5, 5, 6), 0xf0f0f0, { x: 1, y: 10.5, z: -1 }),
    P(box(3, 3, 3), 0xe2e2e2, { x: -1.5, y: 14, z: 1 }),
  ]),
  palm: () => {
    const parts = [
      seg([0, 0, 0], [0.4, 2.6, 0], 0.5, 0x9c6b3c, true),
      seg([0.4, 2.6, 0], [1.0, 5, 0], 0.42, 0xa87a48, true),
      P(sph(0.22, 6, 4), 0x6b4423, { x: 1, y: 4.75, z: 0.25 }),
      P(sph(0.22, 6, 4), 0x6b4423, { x: 0.8, y: 4.8, z: -0.2 }),
    ];
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      parts.push(seg([1, 5, 0], [1 + Math.cos(a) * 2.4, 4.2, Math.sin(a) * 2.4], 0.5, k % 2 ? 0x2fa84f : 0x3fbf5a));
    }
    return merge(parts);
  },
  fern: () => merge([
    P(cone(0.9, 1.6, 6), 0x3f9e3f, { y: 0.8 }),
    P(cone(0.7, 1.3, 6), 0x52b552, { x: 0.6, y: 0.65, rz: -0.3 }),
    P(cone(0.7, 1.3, 6), 0x52b552, { x: -0.6, y: 0.65, rz: 0.3 }),
  ]),
  dino: () => {
    const G = 0x7bc96f;
    const parts = [
      P(sph(2.2, 10, 8), G, { y: 3.2, sx: 1.5 }),
      seg([2.2, 4.0, 0], [4.2, 8.0, 0], 1.1, G, true),
      P(sph(0.85, 8, 6), G, { x: 4.6, y: 8.3, sx: 1.4 }),
      seg([-3, 3.2, 0], [-6.2, 1.0, 0], 1.0, G, true),
      P(sph(0.5, 6, 4), 0x5aa85a, { y: 5.3 }),
      P(sph(0.45, 6, 4), 0x5aa85a, { x: 1.3, y: 5.0 }),
      P(sph(0.45, 6, 4), 0x5aa85a, { x: -1.3, y: 5.0 }),
    ];
    for (const s of [-1, 1]) {
      parts.push(P(sph(0.13, 6, 4), DARK, { x: 4.9, y: 8.6, z: s * 0.6 }));
      parts.push(P(cyl(0.5, 0.55, 2.2, 8), 0x6bb35f, { x: 1.6, y: 1.1, z: s * 1.0 }), P(cyl(0.5, 0.55, 2.2, 8), 0x6bb35f, { x: -1.6, y: 1.1, z: s * 1.0 }));
    }
    return merge(parts);
  },
  volcano: () => merge([
    P(cyl(5, 26, 28, 10), 0x6d4c41, { y: 14 }),
    P(cyl(4.6, 4.6, 0.6, 10), 0xff7043, { y: 27.9 }),
  ]),
  rock: () => merge([P(new THREE.DodecahedronGeometry(1.2), 0x8d8d8d, { y: 0.6, sy: 0.7 })]),
  pine: () => merge([
    P(cyl(0.22, 0.3, 1.2, 6), 0x7a4b2a, { y: 0.6 }),
    P(cone(1.8, 2.4, 7), 0x2d6a4f, { y: 2.0 }),
    P(cone(1.4, 2.0, 7), 0x2d6a4f, { y: 3.3 }),
    P(cone(0.95, 1.6, 7), 0x2d6a4f, { y: 4.5 }),
    P(cone(0.5, 0.75, 7), WHITE, { y: 5.0 }),
  ]),
  snowmanProp: () => merge(HAZ.snowman().parts),
  igloo: () => merge([
    P(dome(2.4, 12, 5), 0xeaf4ff),
    P(box(1.4, 1.3, 1.4), 0xdbe9f7, { y: 0.65, z: 2.3 }),
    P(box(0.9, 0.9, 0.1), 0x335577, { y: 0.5, z: 3.0 }),
  ]),
  ice: () => merge([
    P(new THREE.OctahedronGeometry(1.3), 0xbfe6ff, { y: 1.1, sy: 1.6 }),
    P(new THREE.OctahedronGeometry(0.7), 0xd9f2ff, { x: 1, y: 0.6, sy: 1.4 }),
  ]),
  mountain: () => merge([P(cone(30, 40, 8), 0x8fa6c0, { y: 20 }), P(cone(12.4, 16.5, 8), WHITE, { y: 31.75 })]),
  building: () => {
    const parts = [P(box(8, 10, 8), 0x403878, { y: 5 })];
    for (let y = 1.6; y < 10; y += 1.8) parts.push(P(box(8.08, 0.7, 8.08), WHITE, { y }));
    parts.push(P(box(8.3, 0.4, 8.3), WHITE, { y: 10.2 }));
    return merge(parts);
  },
  lamp: () => merge([
    P(cyl(0.12, 0.15, 6, 6), 0x9a9ac0, { y: 3 }),
    seg([0, 5.9, 0], [-1.8, 6.2, 0], 0.18, 0x9a9ac0),
    P(box(0.7, 0.2, 0.4), WHITE, { x: -1.9, y: 6.1 }),
  ]),
  arch: () => {
    const parts = [
      P(box(0.8, 7, 0.8), WHITE, { x: -(W + 1.6), y: 3.5 }),
      P(box(0.8, 7, 0.8), WHITE, { x: W + 1.6, y: 3.5 }),
      P(box(2 * W + 4, 0.9, 0.8), WHITE, { y: 7.2 }),
    ];
    for (let x = -W - 1; x <= W + 1; x += 2) parts.push(P(box(1, 0.92, 0.82), 0xe63946, { x, y: 7.2 }));
    for (const y of [1, 3, 5]) for (const s of [-1, 1]) parts.push(P(box(0.82, 0.8, 0.82), 0xe63946, { x: s * (W + 1.6), y }));
    return merge(parts);
  },
};

// ---------------------------------------------------------------- hazards
// Each returns { parts, hw, hl, h, color }: half width / half length / height in metres.

const GUM = [0xff4f8b, 0x3bceac, 0xffd23f, 0x5e60ce, 0xff8c42, 0x4fc3f7];

export const HAZ = {
  hay: () => ({
    hw: 0.8, hl: 0.7, h: 1.3, color: 0xf2c94c,
    parts: [
      P(cyl(0.65, 0.65, 1.5, 12), 0xf2c94c, { y: 0.65, rz: HALF_PI }),
      P(cyl(0.67, 0.67, 0.12, 12), 0xc99a1e, { x: 0.42, y: 0.65, rz: HALF_PI }),
      P(cyl(0.67, 0.67, 0.12, 12), 0xc99a1e, { x: -0.42, y: 0.65, rz: HALF_PI }),
    ],
  }),
  sheep: () => {
    const parts = [
      P(sph(0.62, 8, 6), WHITE, { y: 0.95, sz: 1.3 }),
      P(sph(0.38, 8, 6), WHITE, { y: 1.4, z: 0.3 }),
      P(sph(0.38, 8, 6), WHITE, { y: 1.38, z: -0.3 }),
      P(box(0.36, 0.42, 0.42), DARK, { y: 1.15, z: -0.88 }),
    ];
    for (const s of [-1, 1]) {
      parts.push(P(box(0.14, 0.08, 0.22), DARK, { x: s * 0.25, y: 1.25, z: -0.8 }));
      parts.push(P(sph(0.05, 6, 4), WHITE, { x: s * 0.1, y: 1.22, z: -1.1 }));
      parts.push(P(box(0.13, 0.55, 0.13), DARK, { x: s * 0.25, y: 0.28, z: 0.42 }), P(box(0.13, 0.55, 0.13), DARK, { x: s * 0.25, y: 0.28, z: -0.42 }));
    }
    return { hw: 0.6, hl: 0.75, h: 1.6, color: WHITE, parts };
  },
  tractor: () => {
    const G = 0x2e9e44;
    const parts = [
      P(box(1.3, 0.9, 2.4), G, { y: 1.0 }),
      P(box(1.25, 1.1, 1.0), G, { y: 2.0, z: 0.55 }),
      P(box(1.27, 0.55, 0.9), 0xaee6ff, { y: 2.15, z: 0.55 }),
      P(box(1.3, 0.12, 1.15), 0xf2c94c, { y: 2.6, z: 0.55 }),
      P(box(0.9, 0.3, 0.1), 0xdddddd, { y: 1.0, z: -1.22 }),
      seg([0.35, 1.4, -0.6], [0.35, 2.4, -0.6], 0.14, DARK, true),
    ];
    for (const s of [-1, 1]) {
      parts.push(P(cyl(0.78, 0.78, 0.42, 12), DARK, { x: s * 0.86, y: 0.78, z: 0.6, rz: HALF_PI }));
      parts.push(P(cyl(0.4, 0.4, 0.44, 10), 0xf2c94c, { x: s * 0.86, y: 0.78, z: 0.6, rz: HALF_PI }));
      parts.push(P(cyl(0.45, 0.45, 0.32, 10), DARK, { x: s * 0.75, y: 0.45, z: -0.85, rz: HALF_PI }));
    }
    return { hw: 1.15, hl: 1.4, h: 2.7, color: G, parts };
  },
  gumball: (rng) => {
    const c = pick(GUM, rng);
    return { hw: 0.85, hl: 0.85, h: 1.6, color: c, roll: 0.8, parts: [P(sph(0.8, 12, 10), c, { y: 0.8 }), P(sph(0.2, 6, 4), WHITE, { x: 0.35, y: 1.25, z: -0.4 })] };
  },
  bigGumdrop: (rng) => {
    const c = pick(GUM, rng);
    return {
      hw: 1.0, hl: 1.0, h: 1.4, color: c,
      parts: [P(dome(1.05, 10, 5), c, { sy: 1.3 }), P(sph(0.12, 4, 3), WHITE, { x: 0.4, y: 1.0, z: -0.5 }), P(sph(0.12, 4, 3), WHITE, { x: -0.5, y: 0.7, z: -0.6 })],
    };
  },
  foot: () => {
    const G = 0x5aa85a;
    const parts = [
      P(cyl(0.85, 1.0, 7, 10), G, { y: 4.3 }),
      P(box(2.2, 0.85, 2.7), G, { y: 0.43 }),
      P(sph(0.5, 8, 6), 0x4c944c, { x: 0.6, y: 1.2, z: 0.3 }),
    ];
    for (const x of [-0.7, 0, 0.7]) parts.push(P(cone(0.28, 0.7, 6), 0xfff6e0, { x, y: 0.4, z: -1.6, rx: -HALF_PI }));
    return { hw: 1.15, hl: 1.4, h: 0.9, color: G, parts };
  },
  egg: () => ({
    hw: 0.75, hl: 0.75, h: 1.8, color: 0xfff4d6,
    parts: [
      P(sph(0.7, 10, 8), 0xfff4d6, { y: 0.9, sy: 1.3 }),
      P(sph(0.18, 6, 4), 0x7bc96f, { x: 0.55, y: 1.1, z: -0.3 }),
      P(sph(0.2, 6, 4), 0x7bc96f, { x: -0.4, y: 1.5, z: -0.45 }),
      P(sph(0.16, 6, 4), 0x7bc96f, { x: 0.1, y: 0.6, z: -0.65 }),
    ],
  }),
  snowman: () => {
    const parts = [
      P(sph(0.85, 10, 8), WHITE, { y: 0.8 }),
      P(sph(0.62, 10, 8), WHITE, { y: 1.95 }),
      P(sph(0.44, 10, 8), WHITE, { y: 2.8 }),
      P(cone(0.09, 0.45, 6), 0xff8c1a, { y: 2.8, z: -0.6, rx: -HALF_PI }),
      P(cyl(0.3, 0.3, 0.45, 10), DARK, { y: 3.35 }),
      P(cyl(0.45, 0.45, 0.06, 10), DARK, { y: 3.14 }),
      P(new THREE.TorusGeometry(0.5, 0.1, 6, 12), 0xe63946, { y: 2.4, rx: HALF_PI }),
      P(sph(0.06, 6, 4), DARK, { y: 2.0, z: -0.6 }),
      P(sph(0.06, 6, 4), DARK, { y: 1.7, z: -0.58 }),
    ];
    for (const s of [-1, 1]) parts.push(P(sph(0.05, 6, 4), DARK, { x: s * 0.15, y: 2.92, z: -0.4 }));
    return { hw: 0.85, hl: 0.85, h: 3.0, color: WHITE, parts };
  },
  penguin: () => {
    const O = 0xff9f1c;
    const parts = [
      P(sph(0.5, 10, 8), DARK, { y: 0.75, sy: 1.45 }),
      P(sph(0.4, 10, 8), WHITE, { y: 0.7, z: -0.16, sy: 1.3 }),
      P(cone(0.08, 0.22, 6), O, { y: 1.08, z: -0.52, rx: -HALF_PI }),
    ];
    for (const s of [-1, 1]) {
      parts.push(P(sph(0.07, 6, 4), WHITE, { x: s * 0.13, y: 1.2, z: -0.38 }));
      parts.push(P(sph(0.035, 6, 4), DARK, { x: s * 0.13, y: 1.2, z: -0.45 }));
      parts.push(P(box(0.2, 0.06, 0.3), O, { x: s * 0.15, y: 0.03, z: -0.15 }));
      parts.push(P(box(0.08, 0.55, 0.22), DARK, { x: s * 0.5, y: 0.8, rz: s * 0.4 }));
    }
    return { hw: 0.55, hl: 0.5, h: 1.5, color: DARK, parts };
  },
  cone: () => ({
    hw: 0.55, hl: 0.55, h: 1.15, color: 0xff6d00,
    parts: [
      P(box(1.0, 0.1, 1.0), 0xff6d00, { y: 0.05 }),
      P(cone(0.42, 1.05, 10), 0xff6d00, { y: 0.62 }),
      P(cyl(0.2, 0.26, 0.18, 10), WHITE, { y: 0.62 }),
    ],
  }),
  beachball: () => {
    const parts = [P(sph(0.9, 12, 8), WHITE, { y: 0.9 })];
    [0xff3b30, 0x3a86ff, 0xffd23f].forEach((c, k) => {
      parts.push(P(new THREE.SphereGeometry(0.915, 3, 8, (k * 2 * Math.PI) / 3, Math.PI / 3), c, { y: 0.9 }));
    });
    return { hw: 0.9, hl: 0.9, h: 1.8, color: 0xff3b30, parts };
  },
};

// ---------------------------------------------------------------- pickups & road pieces

export function rampGeo(len, h, w) {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(len, 0); s.lineTo(len, h); s.lineTo(0, 0);
  return merge([
    P(new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }), 0xffc93c, { ry: HALF_PI, x: -w / 2 }),
    seg([-w / 2, 0.05, 0], [-w / 2, h + 0.05, -len], 0.22, 0xe63946),
    seg([w / 2, 0.05, 0], [w / 2, h + 0.05, -len], 0.22, 0xe63946),
    seg([0, 0.03, -0.3], [0, h * 0.8 + 0.03, -len * 0.8], 0.3, 0xffffff),
  ]);
}

export const coinGeo = () => merge([
  P(cyl(0.45, 0.45, 0.12, 16), 0xffcc1a, { rx: HALF_PI }),
  P(cyl(0.3, 0.3, 0.14, 12), 0xffe680, { rx: HALF_PI }),
]);

function starShape(outer, inner) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = (i / 10) * Math.PI * 2 + HALF_PI;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return s;
}

export const starGeo = (outer = 0.6, color = 0xffe14d) =>
  merge([P(new THREE.ExtrudeGeometry(starShape(outer, outer * 0.45), { depth: 0.2, bevelEnabled: false }), color, { z: -0.1 })]);

export const stickerGeo = () => merge([
  P(new THREE.ExtrudeGeometry(starShape(0.9, 0.42), { depth: 0.25, bevelEnabled: false }), 0xff4fd8, { z: -0.125 }),
  P(new THREE.TorusGeometry(1.15, 0.08, 6, 24), 0xffffff),
]);

export function checkerTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  for (let x = 0; x < 8; x++) for (let y = 0; y < 2; y++) {
    g.fillStyle = (x + y) % 2 ? '#111' : '#fff';
    g.fillRect(x * 32, y * 32, 32, 32);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  return t;
}
