// Con cọp ngộ nghĩnh: đuổi theo ở tốc độ vừa phải, bỏ đi khi qua đỉnh đèo thứ hai.
import * as THREE from 'three';
import { CONFIG as C } from '../config.js';
import { createTiger } from '../world/props.js';
import { LAYOUT } from '../world/level.js';
import { SFX } from '../audio/sfx.js';
import { BUBBLES } from '../data/script.js';

export class Tiger {
  constructor(game) {
    this.game = game;
    this.model = createTiger();
    this.holder = new THREE.Group();
    this.holder.add(this.model.root);
    this.holder.visible = false;
    this.model.root.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    game.scene.add(this.holder);
    this.state = 'hidden';
    this.x = 0;
    this.y = 0;
    this.phase = 0;
    this.stun = 0;
    this.roarT = 0;
    this.leaveT = 0;
    this.speed = 0;
    this.dir = 1;
  }

  spawn(x) {
    this.x = x;
    this.state = 'enter';
    this.holder.visible = true;
    this.dir = 1;
  }

  roar() {
    this.roarT = 1.1;
    SFX.tiger();
    this.game.hud.bubble('tiger', () => new THREE.Vector3(this.x + 1, this.y + 2.2, 0), BUBBLES.tigerRoar.vi, BUBBLES.tigerRoar.en, 1.6, 'tiger');
  }

  leave() {
    if (this.state !== 'chase') return;
    this.state = 'leave';
    this.leaveT = 0;
    this.dir = -1;
    this.game.hud.bubble('tiger', () => new THREE.Vector3(this.x, this.y + 2.2, 0), BUBBLES.tigerLeave.vi, BUBBLES.tigerLeave.en, 3, 'tiger');
  }

  update(dt, active) {
    if (this.state === 'hidden') return;
    const g = this.game;
    const p = g.player;
    const L = g.level;
    this.roarT = Math.max(0, this.roarT - dt);
    let spd = 0;

    if (this.state === 'enter') {
      spd = 6; // x do transform điều khiển, chỉ cần animate chân
    } else if (this.state === 'chase' && active) {
      if (p.x >= LAYOUT.TIGER_LEAVE_X) this.leave();
      else if (this.stun > 0) this.stun -= dt;
      else {
        const gap = p.x - this.x;
        // dây thun: luôn bám ~TIGER_FOLLOW_GAP sau lưng để còn thấy trên màn hình
        spd = C.TIGER_SPEED + Math.max(0, gap - C.TIGER_FOLLOW_GAP) * 1.2;
        this.x += spd * dt;
        if (gap < 1.1 && p.mode === 'normal' && p.invuln <= 0) this.pounce();
      }
    } else if (this.state === 'leave' && active) {
      this.leaveT += dt;
      if (this.leaveT > 1.2) {
        spd = 2.5;
        this.x -= spd * dt;
      }
      if (this.leaveT > 7) {
        this.state = 'hidden';
        this.holder.visible = false;
      }
    }
    this.speed = spd;

    const y = L.terrainY(this.x);
    this.y += (y - this.y) * Math.min(1, dt * 12);
    const slope = Math.atan2(L.terrainY(this.x + 0.8) - L.terrainY(this.x - 0.8), 1.6);
    const m = this.model;
    this.holder.position.set(this.x, this.y, 0.1);
    this.holder.rotation.z = slope;
    m.root.rotation.y = this.dir > 0 ? -0.25 : Math.PI + 0.25;

    this.phase += spd * dt * 2.2;
    const sw = Math.min(1, spd / 4) * 0.8;
    m.legs.forEach((l, i) => {
      l.rotation.z = Math.sin(this.phase + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * sw;
    });
    m.body.position.y = Math.abs(Math.sin(this.phase)) * 0.1 * sw;
    m.tail.rotation.x = Math.sin(g.time * 6) * 0.4;
    m.mouth.visible = this.roarT > 0 || this.state === 'chase';
    const pulse = this.roarT > 0 ? 1 + Math.sin(this.roarT * 30) * 0.06 : 1;
    m.head.scale.setScalar(pulse * (this.roarT > 0 ? 1.15 : 1));
    if (this.state === 'leave' && this.leaveT < 1.2) m.body.rotation.z = -0.25; // ngồi xuống thở
    else m.body.rotation.z = 0;
  }

  pounce() {
    const g = this.game;
    this.stun = C.TIGER_STUN;
    this.roarT = 0.8;
    SFX.tiger();
    g.player.trip(1, 1);
    g.penalty({ bag: C.BAG_LOSS_PASS_FALL, minutes: C.TIGER_TIME_PENALTY_MIN, fall: true });
    g.hud.bubble('tiger', () => new THREE.Vector3(this.x + 1, this.y + 2.2, 0), BUBBLES.tigerCatch.vi, BUBBLES.tigerCatch.en, 1.8, 'tiger');
    g.shake(0.25, 0.3);
  }
}
