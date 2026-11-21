// Nhân vật bố hồi nhỏ: áo trắng, khăn quàng đỏ, cặp, dép, nón lá.
import * as THREE from 'three';
import { CONFIG as C } from '../config.js';
import { createKid } from '../world/props.js';
import { LAYOUT } from '../world/level.js';
import { SFX } from '../audio/sfx.js';
import { BUBBLES } from '../data/script.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const DUST = ['#C8B08A', '#C8B08A', '#9DBB6A', '#D0763F', '#D8C3A0'];

export class Player {
  constructor(game) {
    this.game = game;
    this.level = game.level;
    this.model = createKid({});
    this.holder = new THREE.Group();
    this.holder.add(this.model.root);
    game.scene.add(this.holder);
    this.model.root.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    this.reset(LAYOUT.START_X);
  }

  reset(x) {
    this.x = x;
    const s = this.level.supportAt(x, 50, { grounded: true });
    this.y = s.y;
    this.support = s.type;
    this.vx = 0;
    this.vy = 0;
    this.grounded = true;
    this.facing = 1;
    this.mode = 'normal';
    this.modeT = 0;
    this.balance = 0;
    this.drift = 0;
    this.driftTarget = 0;
    this.driftTimer = 0;
    this.bridgeMode = s.type === 'bridge';
    this.offBridge = false;
    this.invuln = 0;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.sq = 0;
    this.sqV = 0;
    this.phase = 0;
    this.dustT = 0;
    this.bagRaised = false;
    this.bagLift = 0;
    this.inDitch = false;
    this.inWater = false;
    this.depth = 0;
    this.onMud = false;
    this.camY = this.y;
    this.pose = null;
    this.poseT = 0;
    this.mooCD = 0;
    this.lastWater = false;
    this.fallDir = 1;
    this.setSandalsInHand(false);
    this.holder.rotation.set(0, 0, 0);
  }

  setSandalsInHand(inHand) {
    this.sandalsInHand = inHand;
    for (const m of this.model.sandalsFeet) m.visible = !inHand;
    if (this.model.sandalsHand) this.model.sandalsHand.visible = inHand;
  }

  haltForCutscene() {
    if (this.grounded) this.vx = 0;
  }

  waterDepthAt(x, y) {
    const L = this.level;
    if (L.stream.contains(x)) return L.stream.level - y;
    if (L.ditchAt(x)) return L.PADDY_WATER - y;
    if (L.canal.contains(x)) return L.canal.waterY - y;
    return 0;
  }

  update(dt, inp) {
    const L = this.level;
    const g = this.game;
    this.invuln = Math.max(0, this.invuln - dt);
    this.mooCD = Math.max(0, this.mooCD - dt);

    if (this.mode === 'drowning') {
      this.modeT += dt;
      this.y = this.drownY + Math.sin(this.modeT * 14) * 0.08 - this.modeT * 0.35;
      if (Math.random() < dt * 20) g.particles.spawn({ x: this.x + (Math.random() - 0.5) * 0.6, y: L.canal.waterY + 0.05, z: (Math.random() - 0.5) * 0.6, vy: 1.5, color: '#E8F6FF', size: 0.1, life: 0.4, gravity: 6 });
      if (this.modeT >= C.RESPAWN_DELAY) g.respawn();
      return;
    }
    if (this.mode === 'tripped') {
      this.modeT += dt;
      if (this.modeT > 0.35 && this.grounded) this.mode = 'normal';
    }

    const S = L.stream;
    const inStreamX = S.contains(this.x);
    const jumpPressed = inp.consumeJump(!inStreamX);
    if (jumpPressed) this.jumpBuf = C.JUMP_BUFFER;
    else this.jumpBuf = Math.max(0, this.jumpBuf - dt);

    const move = this.mode === 'tripped' ? 0 : (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    this.depth = this.waterDepthAt(this.x, this.y);
    this.inWater = this.depth > 0.06;
    this.bagRaised = inp.up && inStreamX && this.inWater && this.mode === 'normal';

    // ---- chế độ cầu khỉ ----
    if (this.grounded) this.bridgeMode = this.support === 'bridge';
    else if (!L.bridge.contains(this.x)) this.bridgeMode = false;
    if (this.offBridge) this.bridgeMode = false;

    let targetV;
    if (this.bridgeMode) {
      targetV = this.grounded ? C.BRIDGE_WALK_SPEED : C.BRIDGE_JUMP_SPEED;
      if (this.grounded) this.updateBalance(dt, inp);
    } else {
      this.balance *= Math.max(0, 1 - dt * 4);
      let speed = move > 0 ? C.RUN_SPEED : C.BACK_SPEED;
      if (this.inWater && this.depth > 0.12) speed *= C.WATER_SLOW;
      if (this.bagRaised) speed *= C.BAG_RAISED_SLOW;
      this.onMud = this.grounded && L.mudAt(this.x);
      if (this.onMud) speed *= C.MUD_SLOW;
      targetV = move * speed;
      if (this.onMud && move <= 0) targetV = -C.MUD_SLIDE_SPEED;
      if (S.flooded && inStreamX && this.depth > 0.3) targetV -= C.FLOOD_CURRENT;
    }
    if (this.mode === 'tripped') {
      this.vx *= Math.max(0, 1 - dt * 1.2);
    } else {
      const acc = (this.grounded ? C.ACCEL : C.ACCEL * 0.6) * dt;
      this.vx += clamp(targetV - this.vx, -acc, acc);
    }

    // ---- nhảy ----
    if (this.grounded) this.coyote = C.COYOTE_TIME;
    else this.coyote -= dt;
    if (this.jumpBuf > 0 && this.coyote > 0 && this.mode === 'normal') {
      this.vy = C.JUMP_VELOCITY;
      this.grounded = false;
      this.coyote = 0;
      this.jumpBuf = 0;
      if (this.bridgeMode) this.vx = C.BRIDGE_JUMP_SPEED;
      this.sqV = 3.2;
      SFX.jump();
      if (this.inWater) g.splash(this.x, this.y + this.depth, 6, 0.6);
    }

    // ---- di chuyển ngang ----
    let nx = this.x + this.vx * dt;
    if (nx < LAYOUT.MIN_X) {
      nx = LAYOUT.MIN_X;
      this.vx = 0;
    }
    if (nx > LAYOUT.MAX_X) {
      nx = LAYOUT.MAX_X;
      this.vx = 0;
    }
    if (L.blocked(this.x, nx, this.y)) {
      nx = this.x;
      this.vx = 0;
    }
    this.x = nx;

    // ---- trọng lực / mặt đất ----
    this.vy -= C.GRAVITY * dt;
    if (this.depth > 0.5 && this.vy < -8) this.vy = -8;
    let ny = this.y + this.vy * dt;
    const sup = L.supportAt(this.x, this.y, { grounded: this.grounded, ignoreBridge: this.offBridge });
    const was = this.grounded;
    if (ny <= sup.y) {
      ny = sup.y;
      if (!was) this.onLand(sup, this.vy);
      this.vy = 0;
      this.grounded = true;
      this.support = sup.type;
    } else if (was && this.vy <= 0 && sup.y >= this.y - 0.4) {
      ny = sup.y;
      this.vy = 0;
      this.grounded = true;
      this.support = sup.type;
    } else {
      this.grounded = false;
    }
    this.y = ny;

    if (this.grounded) this.camY = this.y;
    else if (this.y < this.camY - 0.6) this.camY = this.y + 0.6;

    // ---- vùng nước ----
    if (L.canal.contains(this.x) && this.y < L.canal.waterY - 0.2) {
      this.drown();
      return;
    }
    const ditch = L.ditchAt(this.x);
    if (ditch && this.y < L.PADDY_WATER - 0.1 && !this.inDitch) {
      this.inDitch = true;
      g.splash(this.x, L.PADDY_WATER, 16, 1);
      SFX.splash();
      g.penalty({ bag: C.BAG_LOSS_DITCH, minutes: C.DITCH_TIME_PENALTY_MIN, fall: true });
      g.playerBubble(BUBBLES.ditch, 1.4);
    }
    if (!ditch || this.y > -0.05) this.inDitch = false;

    const nowWater = this.waterDepthAt(this.x, this.y) > 0.06;
    if (nowWater && !this.lastWater && inStreamX) {
      g.splash(this.x, S.level, 8, 0.7);
      SFX.smallSplash();
    }
    this.lastWater = nowWater;

    if (S.flooded && inStreamX && this.depth > 0.5 && !this.bagRaised) {
      g.penalty({ bag: C.BAG_LOSS_STREAM_PER_SEC * dt, silent: true });
      g.bagDripping = true;
    }
  }

  updateBalance(dt, inp) {
    const B = this.level.bridge;
    const prog = clamp((this.x - B.x0) / (B.x1 - B.x0), 0, 1);
    this.driftTimer -= dt;
    if (this.driftTimer <= 0) {
      this.driftTimer = 0.5 + Math.random() * 0.9;
      this.driftTarget = Math.random() * 2 - 1;
    }
    this.drift += (this.driftTarget - this.drift) * Math.min(1, dt * 3);
    const amp = lerp(C.BALANCE_DRIFT_MIN, C.BALANCE_DRIFT_MAX, prog) * (B.broken ? C.BALANCE_BROKEN_MULT : 1);
    const input = (inp.balanceR ? 1 : 0) - (inp.balanceL ? 1 : 0);
    this.balance += (this.drift * amp + this.balance * C.BALANCE_INSTABILITY + input * C.BALANCE_CORRECT) * dt;
    if (Math.abs(this.balance) >= 1) this.fallOffBridge();
  }

  fallOffBridge() {
    this.fallDir = Math.sign(this.balance) || 1;
    this.balance = this.fallDir;
    this.offBridge = true;
    this.bridgeMode = false;
    this.grounded = false;
    this.vy = 2.5;
    this.vx = 0.5;
    SFX.oof();
    this.game.playerBubble(BUBBLES.fall, 1.6);
  }

  drown() {
    if (this.mode === 'drowning') return;
    const L = this.level;
    this.mode = 'drowning';
    this.modeT = 0;
    this.drownY = L.canal.waterY - 0.95;
    this.vx = 0;
    this.vy = 0;
    this.game.splash(this.x, L.canal.waterY, 30, 1.4);
    SFX.splash();
    this.game.penalty({ bag: C.BAG_LOSS_CANAL, minutes: C.FALL_TIME_PENALTY_MIN, fall: true });
  }

  respawn(x) {
    this.reset(x);
    this.invuln = 1.2;
    this.setSandalsInHand(this.game.sandalsOff);
  }

  trip(dir = 1, power = 1) {
    this.mode = 'tripped';
    this.modeT = 0;
    this.vx = 7 * dir * power;
    this.vy = 6.5 * power;
    this.grounded = false;
    this.invuln = 1.6;
    this.sqV = -2;
    SFX.oof();
  }

  onLand(sup, vy) {
    const g = this.game;
    this.sqV = -Math.min(3.5, -vy * 0.22);
    if (vy < -6) {
      SFX.land();
      const d = this.waterDepthAt(this.x, this.y);
      if (d < 0.05) g.particles.burst(6, { x: this.x, y: this.y + 0.05, color: DUST[this.level.segmentIndexAt(this.x)], size: 0.14, life: 0.45, spread: 2.5, up: 1.2, gravity: 3, drag: 2 });
    }
    if (sup.type === 'buffalo' && this.mooCD <= 0) {
      this.mooCD = 2.5;
      SFX.buffalo();
      this.level.bumpBuffalo();
      g.hud.bubble('buffalo', () => new THREE.Vector3((LAYOUT.BUFFALO.x0 + LAYOUT.BUFFALO.x1) / 2 - 1.4, 2.4, 0), BUBBLES.buffalo.vi, BUBBLES.buffalo.en, 1.8);
    }
  }

  /** Animation procedural (luôn chạy, kể cả khi đang thoại). */
  animate(dt, frozen = false) {
    const m = this.model;
    const g = this.game;
    if (!frozen && this.mode === 'normal' && !this.pose) {
      if (this.vx > 0.3) this.facing = 1;
      else if (this.vx < -0.3 && !this.onMud && !(this.level.stream.flooded && this.inWater)) this.facing = -1;
    }
    if (this.bridgeMode) this.facing = 1;
    let targetRot = this.facing > 0 ? Math.PI / 2 - 0.35 : -Math.PI / 2 + 0.35;
    if (this.pose === 'finish') targetRot = 0.15;
    m.root.rotation.y += (targetRot - m.root.rotation.y) * Math.min(1, dt * 12);

    const spd = frozen ? 0 : Math.abs(this.vx);
    if (this.grounded && !frozen) this.phase += spd * dt * 2.3;
    const sw = Math.min(1, spd / C.RUN_SPEED) * 0.95;
    const s = Math.sin(this.phase);
    let legR = s * sw;
    let legL = -s * sw;
    let armRx = -s * sw * 0.8;
    let armLx = s * sw * 0.8;
    let armRz = -0.12;
    let armLz = 0.12;
    let bodyTilt = 0;
    let crouch = 0;

    if (!this.grounded && this.mode !== 'drowning') {
      legR = -0.7;
      legL = 0.4;
      armRx = -0.6;
      armLx = -0.4;
      armRz = -0.9;
      armLz = 0.9;
    }
    if (this.bridgeMode && this.grounded) {
      armRz = -1.35 - this.balance * 0.4;
      armLz = 1.35 - this.balance * 0.4;
      armRx = Math.sin(this.phase * 0.5) * 0.15;
      armLx = -armRx;
    }
    this.bagLift += ((this.bagRaised ? 1 : 0) - this.bagLift) * Math.min(1, dt * 10);
    if (this.bagLift > 0.02) {
      armRx = lerp(armRx, -2.95, this.bagLift);
      armLx = lerp(armLx, -2.95, this.bagLift);
      armRz = lerp(armRz, 0.1, this.bagLift);
      armLz = lerp(armLz, -0.1, this.bagLift);
    }
    if (m.bag) {
      m.bag.position.set(0, lerp(m.bagHome.y, 1.95, this.bagLift), lerp(m.bagHome.z, 0.02, this.bagLift));
      m.bag.rotation.x = this.bagLift * -0.2;
    }
    if (this.mode === 'drowning') {
      const t = this.modeT * 22;
      armRx = -2.4 + Math.sin(t) * 0.9;
      armLx = -2.4 + Math.cos(t) * 0.9;
      armRz = -0.6;
      armLz = 0.6;
      legR = Math.sin(t) * 0.6;
      legL = -legR;
    }
    if (this.mode === 'tripped') {
      bodyTilt = 0.7;
      armRx = -1.8;
      armLx = -1.6;
    }
    if (this.pose === 'crouch') {
      const t = this.poseT;
      crouch = Math.sin(Math.min(1, t / 1.4) * Math.PI) * 0.3;
      bodyTilt = Math.sin(Math.min(1, t / 1.4) * Math.PI) * 0.6;
      armLx = -0.9;
      armRx = -0.9;
      legR = 0.2;
      legL = -0.2;
    }
    if (this.pose === 'finish') {
      armRx = -2.6 + Math.sin(g.time * 10) * 0.3;
      armRz = -0.4;
    }
    if (this.sandalsInHand && this.bagLift < 0.5 && !this.bridgeMode && this.pose !== 'crouch') armLx = Math.min(armLx, -0.35);

    m.legR.rotation.x = legR;
    m.legL.rotation.x = legL;
    m.armR.rotation.x = armRx;
    m.armL.rotation.x = armLx;
    m.armR.rotation.z = armRz;
    m.armL.rotation.z = armLz;
    m.body.rotation.x = bodyTilt;
    m.body.position.y = (this.grounded ? Math.abs(Math.sin(this.phase)) * 0.06 * sw : 0) - crouch;

    // squash & stretch
    this.sqV += (-this.sq * 170 - this.sqV * 13) * dt;
    this.sq += this.sqV * dt;
    const sq = clamp(this.sq * 0.12, -0.25, 0.25);
    this.holder.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);

    // nghiêng thăng bằng (theo mặt phẳng màn hình)
    let tilt = 0;
    if (this.bridgeMode) tilt = -this.balance * 0.6;
    if (this.offBridge) tilt = -this.fallDir * Math.min(1.5, 0.6 + (this.mode === 'drowning' ? 1 : 0.9));
    this.holder.rotation.z += (tilt - this.holder.rotation.z) * Math.min(1, dt * 10);
    this.holder.position.set(this.x, this.y, 0);

    // nhấp nháy sau khi respawn
    this.holder.visible = !(this.invuln > 0 && this.mode === 'normal' && Math.floor(this.invuln * 14) % 2 === 0);

    // bụi khi chạy
    if (!frozen && this.grounded && spd > 3 && !this.inWater && !this.bridgeMode) {
      this.dustT -= dt;
      if (this.dustT <= 0) {
        this.dustT = 0.08;
        g.particles.spawn({
          x: this.x - this.facing * 0.25,
          y: this.y + 0.06,
          z: (Math.random() - 0.5) * 0.4,
          vx: -this.facing * (0.5 + Math.random()),
          vy: 0.6 + Math.random() * 0.6,
          color: DUST[this.level.segmentIndexAt(this.x)],
          size: 0.13,
          life: 0.45,
          grow: 1,
          drag: 2,
          opacity: 0.7,
        });
      }
    }
    if (!frozen && this.inWater && spd > 0.5 && Math.random() < dt * 14) {
      const wl = this.y + this.depth;
      g.particles.spawn({ x: this.x + (Math.random() - 0.5) * 0.5, y: wl + 0.02, z: (Math.random() - 0.5) * 0.6, vx: -this.vx * 0.2, vy: 0.8, color: '#EAF6FF', size: 0.09, life: 0.4, gravity: 5 });
    }
  }
}
