// Renderer, camera, lights, sky, fog, confetti and the garage showroom.
import * as THREE from 'three';
import { buildBike, MAT, mesh, P, cyl } from './models.js';

const CONFETTI = [0xff4f8b, 0xffd23f, 0x3bceac, 0x5e60ce, 0xff8c42, 0x4fc3f7];

export class Confetti {
  constructor(scene, n = 500) {
    this.n = n;
    this.next = 0;
    this.alive = 0;
    this.pos = new Float32Array(n * 3).fill(-1e4);
    this.col = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.3, vertexColors: true }));
    this.points.frustumCulled = false;
    scene.add(this.points);
    this._c = new THREE.Color();
  }

  burst(p, count = 40, colors = CONFETTI, power = 6) {
    for (let k = 0; k < count; k++) {
      const i = this.next;
      this.next = (this.next + 1) % this.n;
      const a = Math.random() * Math.PI * 2, up = 0.4 + Math.random() * 0.8, s = power * (0.4 + Math.random() * 0.6);
      this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
      this.vel[i * 3] = Math.cos(a) * s * 0.7; this.vel[i * 3 + 1] = up * s; this.vel[i * 3 + 2] = Math.sin(a) * s * 0.7;
      this._c.set(colors[Math.floor(Math.random() * colors.length)]);
      this.col[i * 3] = this._c.r; this.col[i * 3 + 1] = this._c.g; this.col[i * 3 + 2] = this._c.b;
      this.life[i] = 1.0 + Math.random() * 0.6;
    }
    this.alive = this.n;
    this.points.geometry.attributes.color.needsUpdate = true;
  }

  update(dt) {
    if (!this.alive) return;
    let alive = 0;
    const drag = Math.max(0, 1 - dt * 1.5);
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -1e4; continue; }
      alive++;
      this.vel[i * 3 + 1] -= 9 * dt;
      for (let k = 0; k < 3; k++) { this.vel[i * 3 + k] *= drag; this.pos[i * 3 + k] += this.vel[i * 3 + k] * dt; }
    }
    this.alive = alive;
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}

export class Stage {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: (window.devicePixelRatio || 1) < 2, powerPreference: 'high-performance' });
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(64, 1, 0.3, 400);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x88aa66, 1.7);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.7);
    this.sun.position.set(-40, 80, 30);
    this.scene.add(this.hemi, this.sun);
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshLambertMaterial({ color: 0x67bb44 }));
    this.ground.rotation.x = -Math.PI / 2;
    this.scene.add(this.ground);
    this.confetti = new Confetti(this.scene);
    this.frames = 0; this.frameTime = 0; this.slowWindows = 0;
    this.resize();
    // iPad Home Screen apps can report a stale window size, so watch the canvas itself.
    const later = () => { this.resize(); setTimeout(() => this.resize(), 300); };
    window.addEventListener('resize', later);
    window.addEventListener('orientationchange', later);
    window.visualViewport?.addEventListener('resize', later);
    if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe(canvas);
  }

  setWorld(w) {
    this.scene.background = new THREE.Color(w.sky);
    this.scene.fog = new THREE.Fog(w.fog ?? w.sky, w.fogNear, w.fogFar);
    this.camera.far = w.fogFar + 40;
    this.camera.updateProjectionMatrix();
    this.ground.material.color.set(w.ground[1]);
    this.hemi.color.set(w.hemiSky ?? 0xffffff);
    this.hemi.groundColor.set(w.ground[0]);
  }

  resize() {
    const c = this.renderer.domElement;
    const w = c.clientWidth || window.innerWidth, h = c.clientHeight || window.innerHeight;
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // Lower the resolution if the frame rate keeps dropping (older iPads).
  adapt(dt) {
    this.frames++;
    this.frameTime += dt;
    if (this.frameTime < 2) return;
    const fps = this.frames / this.frameTime;
    this.frames = 0; this.frameTime = 0;
    this.slowWindows = fps < 45 ? this.slowWindows + 1 : 0;
    if (this.slowWindows >= 2 && this.pixelRatio > 1) {
      this.pixelRatio = Math.max(1, this.pixelRatio - 0.25);
      this.renderer.setPixelRatio(this.pixelRatio);
      this.slowWindows = 0;
    }
  }

  render() { this.renderer.render(this.scene, this.camera); }
}

export class Showroom {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xbfe9ff);
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x99bb88, 1.8));
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(-3, 6, 4);
    this.scene.add(sun);
    this.turntable = new THREE.Group();
    this.turntable.add(mesh([P(cyl(1.9, 2.0, 0.2, 32), 0xffffff, { y: -0.1 }), P(cyl(2.05, 2.1, 0.12, 32), 0xff8a1f, { y: -0.16 })], MAT));
    this.scene.add(this.turntable);
    this.bike = null;
    this.t = 0;
  }

  setLook(look) {
    if (this.bike) this.bike.dispose(), this.bike.root.removeFromParent();
    this.bike = buildBike(look);
    this.bike.shadow.visible = false;
    this.turntable.add(this.bike.root);
  }

  update(dt) {
    this.t += dt;
    this.turntable.rotation.y = this.t * 0.6;
  }

  render(renderer) {
    const w = renderer.domElement.clientWidth || window.innerWidth, h = renderer.domElement.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    // Shift the view so the bike sits in the left part of the screen, beside the shop panel.
    this.camera.setViewOffset(w, h, w * 0.22, 0, w, h);
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0, 2.6, 8.4);
    this.camera.lookAt(0, 1.1, 0);
    renderer.render(this.scene, this.camera);
  }
}
