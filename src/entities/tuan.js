// Thằng Tuấn con bác Ba: NPC scripted, luôn đi trước mình 8–15 đơn vị, KHÔNG BAO GIỜ bị vượt.
import * as THREE from 'three';
import { CONFIG as C } from '../config.js';
import { createKid, createBook, createFirewood, createRag, mesh, cyl } from '../world/props.js';
import { LAYOUT } from '../world/level.js';
import { SFX } from '../audio/sfx.js';

const lerp = (a, b, t) => a + (b - a) * t;

export class Tuan {
  constructor(game) {
    this.game = game;
    const m = createKid({ part: true, glasses: true, hat: false, shirt: '#FFFFFF', pants: '#14305C', skin: '#F0C4A0' });
    this.model = m;
    this.holder = new THREE.Group();
    this.holder.add(m.root);
    game.scene.add(this.holder);

    // Đạo cụ: sách → bà cụ → em gái → gánh củi → giẻ lau bảng
    this.book = createBook();
    this.book.position.set(0, 1.02, 0.36);
    this.book.rotation.x = -0.45;
    m.body.add(this.book);

    const lady = createKid({ shirt: '#7A5C8E', pants: '#2A2A2A', hair: '#D8D8D8', bun: true, scarf: false, bag: false, hat: true, skin: '#E2B48E', buttons: false });
    lady.root.position.set(0.5, 0, -0.75);
    lady.root.scale.setScalar(1.05);
    lady.body.rotation.x = 0.28;
    const cane = mesh(cyl(0.025, 0.025, 0.95, 4), '#6B4A2B');
    cane.position.set(0, -0.35, 0.05);
    lady.handR.add(cane);
    m.root.add(lady.root);
    this.lady = lady;

    const sis = createKid({ shirt: '#F48FB1', pants: '#F48FB1', pigtails: true, scarf: false, bag: false, hat: false, sandals: false, hair: '#2A1A12' });
    sis.root.scale.setScalar(0.6);
    sis.root.position.set(0, 0.6, -0.34);
    sis.legL.rotation.x = -1.4;
    sis.legR.rotation.x = -1.4;
    sis.legL.rotation.z = 0.5;
    sis.legR.rotation.z = -0.5;
    sis.armL.rotation.x = -1.7;
    sis.armR.rotation.x = -1.7;
    m.body.add(sis.root);
    this.sister = sis;

    this.firewood = createFirewood();
    this.firewood.position.set(-0.22, 1.24, 0);
    m.body.add(this.firewood);

    this.rag = createRag();
    m.handR.add(this.rag);

    m.root.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });

    this.x = LAYOUT.START_X + C.TUAN_AHEAD_TARGET;
    this.y = 0;
    this.z = 0;
    this.vx = 0;
    this.phase = 0;
    this.seg = -1;
    this.mode = 'follow';
    this.arrived = false;
    this.sparkleT = 1.5;
    this.setSeg(0, true);
  }

  setSeg(i, silent = false) {
    this.book.visible = i === 0;
    this.lady.root.visible = i === 1;
    this.sister.root.visible = i === 2;
    this.firewood.visible = i === 3;
    this.rag.visible = i === 4;
    const bag = this.model.bag;
    if (bag) bag.position.z = i === 2 ? 0.24 : this.model.bagHome.z; // cõng em thì đeo cặp phía trước
    if (!silent && this.seg !== i) {
      this.game.particles.burst(16, { x: this.x, y: this.y + 1.0, z: this.z, color: '#FFFFFF', size: 0.25, life: 0.5, spread: 3, up: 2, drag: 3, grow: 1.5 });
      SFX.pop();
    }
    this.seg = i;
  }

  say(b) {
    if (!b) return;
    this.game.hud.bubble('tuan', () => new THREE.Vector3(this.x, this.y + (this.seg === 3 ? 2.3 : 2.05), this.z), b.vi, b.en, C.TUAN_BUBBLE_SECONDS, 'tuan');
  }

  update(dt, active) {
    const g = this.game;
    const p = g.player;
    const L = g.level;
    let vx = 0;
    if (active) {
      if (this.mode !== 'school' && p.x > LAYOUT.SCHOOL_MODE_X) this.mode = 'school';
      if (this.mode === 'school') {
        const tx = LAYOUT.TUAN_DOOR.x;
        if (this.x < tx - 0.05) vx = Math.min(C.TUAN_BOOST_SPEED, (tx - this.x) * 3 + 2);
        else this.arrived = true;
      } else {
        const desired = p.x + C.TUAN_AHEAD_TARGET;
        if (this.x < p.x + C.TUAN_AHEAD_MIN) vx = C.TUAN_BOOST_SPEED;
        else if (this.x < desired) vx = Math.min(C.TUAN_SPEED, (desired - this.x) * 2 + 1.2);
        else if (this.x < p.x + C.TUAN_AHEAD_MAX) vx = 0.8;
      }
      this.x += vx * dt;
      if (this.mode !== 'school') this.x = Math.max(this.x, p.x + 6.5); // không bao giờ bị vượt
    }
    this.vx = vx;

    const gy = L.tuanGroundY(this.x);
    this.y += (gy - this.y) * Math.min(1, dt * 14);
    const tz = this.mode === 'school' && this.x > LAYOUT.TUAN_DOOR.x - 8 ? LAYOUT.TUAN_DOOR.z : 0;
    this.z += (tz - this.z) * Math.min(1, dt * 3);

    const seg = L.segmentIndexAt(this.x);
    if (seg !== this.seg) this.setSeg(seg);

    // ---- animation ----
    const m = this.model;
    const t = g.time;
    const walking = Math.abs(vx) > 0.2;
    this.phase += Math.abs(vx) * dt * 2.3;
    const sw = walking ? Math.min(1, Math.abs(vx) / C.RUN_SPEED) * 0.9 : 0;
    const s = Math.sin(this.phase);
    m.legR.rotation.x = s * sw;
    m.legL.rotation.x = -s * sw;
    let armRx = -s * sw * 0.7;
    let armLx = s * sw * 0.7;
    let armRz = -0.12;
    let armLz = 0.12;
    if (this.seg === 0) {
      armRx = -1.15;
      armLx = -1.15;
      armRz = 0.25;
      armLz = -0.25;
    } else if (this.seg === 1) {
      armLx = 0.55; // nắm tay bà cụ phía sau
      armLz = 0.35;
      const l = this.lady;
      l.legR.rotation.x = s * sw * 0.6;
      l.legL.rotation.x = -s * sw * 0.6;
      l.armR.rotation.x = -0.5;
      l.armL.rotation.x = -0.9;
    } else if (this.seg === 2) {
      armRx = 0.6;
      armLx = 0.6;
      this.sister.head.rotation.y = Math.sin(t * 1.5) * 0.4;
    } else if (this.seg === 3) {
      armRx = -2.9;
      armRz = 0.3;
      this.firewood.rotation.x = Math.sin(this.phase * 2) * 0.06;
    } else if (this.seg === 4 && this.arrived) {
      armRx = -1.6 + Math.sin(t * 9) * 0.35;
      armRz = -0.5 + Math.cos(t * 9) * 0.4;
    }
    m.armR.rotation.x = armRx;
    m.armL.rotation.x = armLx;
    m.armR.rotation.z = armRz;
    m.armL.rotation.z = armLz;
    m.body.position.y = walking ? Math.abs(s) * 0.05 * sw : Math.sin(t * 2) * 0.01;

    const face = this.arrived ? 0.7 : Math.PI / 2 - 0.35;
    m.root.rotation.y += (face - m.root.rotation.y) * Math.min(1, dt * 8);
    this.holder.position.set(this.x, this.y, this.z);

    // áo trắng tinh lấp lánh ✨
    this.sparkleT -= dt;
    if (this.sparkleT <= 0) {
      this.sparkleT = 0.9 + Math.random() * 1.2;
      g.particles.spawn({ x: this.x + (Math.random() - 0.5) * 0.4, y: this.y + 0.8 + Math.random() * 0.6, z: this.z + 0.35, vy: 0.4, color: '#FFFBE0', size: 0.11, life: 0.7, grow: 0.5 });
    }
  }
}
