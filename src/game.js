// Thế giới "hồi xưa": level, player, Tuấn, cọp, camera, trigger, đồng hồ, cặp khô.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { STATES, GameState } from './state.js';
import { Input } from './input.js';
import { buildLevel, LAYOUT, SEGMENTS, TRIGGERS } from './world/level.js';
import { createSky } from './world/sky.js';
import { Particles } from './world/particles.js';
import { createTransforms } from './world/transforms.js';
import { createLog } from './world/props.js';
import { Player } from './entities/player.js';
import { Tuan } from './entities/tuan.js';
import { Tiger } from './entities/tiger.js';
import { SCRIPT, TUAN_BUBBLES, UI_TEXT, SEGMENT_NAMES, BUBBLES } from './data/script.js';
import { SFX } from './audio/sfx.js';
import { getLang } from './i18n.js';

const S = STATES;
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export class Game {
  constructor({ hud, dialogue, onFinish }) {
    this.hud = hud;
    this.dialogue = dialogue;
    this.onFinish = onFinish;
    this.lang = getLang(); // bảng tên trong thế giới 3D vẽ theo ngôn ngữ lúc dựng
    this.scene = new THREE.Scene();
    this.uTime = { value: 0 };
    this.time = 0;
    this.camera = new THREE.PerspectiveCamera(CONFIG.CAM_FOV, innerWidth / innerHeight, 0.1, 1600);

    this.hemi = new THREE.HemisphereLight('#E8C3D8', '#7A5A3A', 1.1);
    this.sun = new THREE.DirectionalLight('#FFB27A', 1.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(CONFIG.SHADOW_MAP, CONFIG.SHADOW_MAP);
    Object.assign(this.sun.shadow.camera, { left: -26, right: 26, top: 18, bottom: -14, near: 1, far: 90 });
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.hemi, this.sun, this.sun.target);
    this.scene.fog = new THREE.Fog('#F7B3A1', 95, 360);
    this.sky = createSky(this.scene);

    this.particles = new Particles(this.scene);
    this.level = buildLevel(this.scene, this.uTime);
    this.player = new Player(this);
    this.tuan = new Tuan(this);
    this.tiger = new Tiger(this);
    this.transforms = createTransforms(this);

    this.logs = [];
    this.logTimer = 1.2;
    this.clock = CONFIG.START_MINUTES;
    this.bag = CONFIG.BAG_START;
    this.falls = 0;
    this.late = false;
    this.arrived = null;
    this.sandalsOff = false;
    this.bagDripping = false;
    this.triggers = TRIGGERS.map((t) => ({ ...t, done: false }));
    this.checkpoint = LAYOUT.CHECKPOINTS[0];
    this.segIndex = -1;
    this.queue = null;
    this.timers = [];
    this.flags = {};
    this.finishT = 0;
    this.finished = false;
    this.cam = { x: LAYOUT.START_X, y: 1, ov: null, blend: 0, dir: 0, shakeT: 0, shakeAmp: 0 };
    this.markers = null;
    this.updateCamera(0, true);
  }

  begin() {
    GameState.set(S.PLAYING);
    Input.clearEdges();
  }

  progress() {
    return (this.clock - CONFIG.START_MINUTES) / (CONFIG.BELL_MINUTES - CONFIG.START_MINUTES);
  }

  // ------------------------------------------------------------ update
  update(dt) {
    const st = GameState.current;
    this.time += dt;
    this.uTime.value = this.time;
    this.bagDripping = false;
    const playing = st === S.PLAYING;

    if (playing) this.updatePlaying(dt);
    else if (st === S.TRANSFORM) {
      this.transforms.update(dt);
      this.player.animate(dt, true);
    } else if (st === S.FINISH) this.updateFinish(dt);
    else this.player.animate(dt, true);

    for (let i = this.timers.length - 1; i >= 0; i--) {
      const t = this.timers[i];
      t.t -= dt;
      if (t.t <= 0) {
        this.timers.splice(i, 1);
        t.fn();
      }
    }

    this.tuan.update(dt, playing || st === S.FINISH);
    this.tiger.update(dt, playing);
    this.level.update(dt, this.time);
    this.updateLogs(dt, playing);
    this.particles.update(dt);
    this.updateCamera(dt);
    this.sky.update(this.progress(), this.camera, this.sun, this.hemi, this.scene.fog);
    this.hud.setClock(this.clock, this.late);
    this.hud.setBag(this.bag, this.bagDripping);
    this.hud.updateBubbles(this.camera, dt);
    if (CONFIG.DEBUG) this.hud.setDebug(`x ${this.player.x.toFixed(1)}  y ${this.player.y.toFixed(2)}  ${st}  bag ${this.bag.toFixed(0)}  cp ${this.checkpoint}`);
  }

  updatePlaying(dt) {
    this.clock += (dt * (CONFIG.BELL_MINUTES - CONFIG.START_MINUTES)) / CONFIG.REAL_SECONDS_FOR_RUN;
    if (!this.late && this.clock >= CONFIG.BELL_MINUTES) {
      this.late = true;
      SFX.drum();
      this.hud.banner(UI_TEXT.banners.late, 2.6, 'late');
    }
    const p = this.player;
    p.update(dt, Input);
    p.animate(dt);
    if (GameState.current !== S.PLAYING) return; // respawn có thể đổi state (không) — giữ an toàn

    for (const c of LAYOUT.CHECKPOINTS) if (p.x >= c && c > this.checkpoint && p.mode === 'normal' && p.grounded) this.checkpoint = c;

    const si = SEGMENTS.findIndex((s) => p.x >= s.x0 && p.x < s.x1);
    if (si >= 0 && si !== this.segIndex) {
      this.segIndex = si;
      this.hud.setSegment(si + 1, SEGMENT_NAMES[si]);
      if (si > 0) SFX.ding();
    }

    if (!this.flags.bridge && p.bridgeMode) {
      this.flags.bridge = true;
      this.hud.hint(UI_TEXT.hints.bridge, 6);
    }
    if (!this.flags.mud && p.onMud) {
      this.flags.mud = true;
      this.hud.hint(UI_TEXT.hints.mud, 4);
    }
    this.hud.setBalance(p.bridgeMode && p.mode === 'normal', p.balance);

    if (!this.queue) {
      for (const t of this.triggers) {
        if (!t.done && p.x >= t.x && p.mode === 'normal') {
          t.done = true;
          this.runActions(t.actions);
          break;
        }
      }
    }
    if (GameState.current === S.PLAYING && p.x >= LAYOUT.GATE_X) this.finish();
  }

  // ------------------------------------------------------------ actions
  runActions(actions) {
    this.queue = actions.slice();
    this.nextAction();
  }

  nextAction() {
    if (!this.queue || this.queue.length === 0) {
      this.queue = null;
      if (GameState.is(S.DIALOGUE, S.TRANSFORM)) {
        GameState.set(S.PLAYING);
        Input.clearEdges();
      }
      return;
    }
    const a = this.queue.shift();
    switch (a.type) {
      case 'dialogue':
        GameState.set(S.DIALOGUE);
        Input.clearEdges();
        this.player.haltForCutscene();
        this.hud.setBalance(false);
        this.dialogue.play(SCRIPT[a.id], () => this.nextAction());
        break;
      case 'transform':
        GameState.set(S.TRANSFORM);
        this.hud.setBalance(false);
        this.transforms.start(a.id, () => this.nextAction());
        break;
      case 'tuan':
        this.tuan.say(TUAN_BUBBLES[a.id]);
        this.nextAction();
        break;
      case 'sfx':
        this.after(a.delay || 0, () => SFX[a.id]?.());
        this.nextAction();
        break;
      case 'hint':
        this.hud.hint(UI_TEXT.hints[a.id], a.seconds || 5);
        this.nextAction();
        break;
      case 'sandalsOn':
        this.sandalsOff = false;
        this.player.setSandalsInHand(false);
        this.nextAction();
        break;
      default:
        this.nextAction();
    }
  }

  after(sec, fn) {
    this.timers.push({ t: sec, fn });
  }

  // ------------------------------------------------------------ gameplay helpers
  penalty({ bag = 0, minutes = 0, fall = false, silent = false }) {
    this.bag = Math.max(0, this.bag - bag);
    this.clock += minutes;
    if (fall) this.falls++;
    if (bag && !silent) this.hud.flashBag();
  }

  splash(x, y, n = 20, power = 1) {
    this.particles.burst(n, { x, y: y + 0.05, color: '#DDF2FF', size: 0.16, life: 0.7, spread: 3 * power, up: 5 * power, gravity: 14, jx: 0.8 });
    this.particles.burst(Math.ceil(n / 3), { x, y: y + 0.02, color: '#FFFFFF', size: 0.3, life: 0.5, spread: 1.5, up: 0.6, gravity: 0, grow: 2, opacity: 0.6 });
  }

  playerBubble(b, sec = 1.5) {
    this.hud.bubble('player', () => new THREE.Vector3(this.player.x, this.player.y + 2.1, 0), b.vi, b.en, sec, 'player');
  }

  respawn() {
    this.player.respawn(this.checkpoint);
    this.cam.x = lerp(this.cam.x, this.player.x + 3, 0.5);
  }

  shake(amp, dur) {
    this.cam.shakeAmp = Math.max(this.cam.shakeAmp * (this.cam.shakeT > 0 ? 1 : 0), amp);
    this.cam.shakeT = Math.max(this.cam.shakeT, dur);
  }

  setCamOverride(ov) {
    this.cam.ov = ov;
    this.cam.dir = 1;
  }

  clearCamOverride() {
    this.cam.dir = -1;
  }

  updateLogs(dt, active) {
    const St = this.level.stream;
    const p = this.player;
    if (active && St.flooded && p.x > St.x0 + 6 && p.x < St.x1 - 8) {
      this.logTimer -= dt;
      if (this.logTimer <= 0) {
        this.logTimer = CONFIG.LOG_INTERVAL * (0.85 + Math.random() * 0.5);
        const m = createLog();
        const lx = Math.min(p.x + 18, St.x1 - 0.6);
        m.position.set(lx, St.level, 0);
        this.scene.add(m);
        this.logs.push({ x: lx, m, seed: Math.random() * 6 });
      }
    }
    for (let i = this.logs.length - 1; i >= 0; i--) {
      const lg = this.logs[i];
      if (active) {
        lg.x -= CONFIG.LOG_SPEED * dt;
        lg.m.rotation.z += (CONFIG.LOG_SPEED * dt) / 0.28;
      }
      lg.m.position.set(lg.x, St.level + Math.sin(this.time * 3 + lg.seed) * 0.05, 0);
      if (lg.x < St.x0 + 0.5 || lg.x < p.x - 26) {
        this.scene.remove(lg.m);
        lg.m.traverse((o) => o.geometry?.dispose());
        this.logs.splice(i, 1);
        continue;
      }
      if (active && p.mode === 'normal' && p.invuln <= 0 && Math.abs(lg.x - p.x) < 0.6 && p.y < St.level - 0.15) {
        SFX.thud();
        this.splash(p.x, St.level, 14, 1);
        this.penalty({ bag: CONFIG.BAG_LOSS_LOG, minutes: CONFIG.LOG_TIME_PENALTY_MIN });
        p.trip(-1, 0.7);
        p.invuln = CONFIG.LOG_INVULN;
        this.playerBubble(BUBBLES.log, 1.2);
      }
    }
  }

  // ------------------------------------------------------------ finish
  finish() {
    if (this.finished) return;
    this.finished = true;
    this.arrived = this.clock;
    GameState.set(S.FINISH);
    this.finishT = 0;
    this.hud.setBalance(false);
    this.hud.hint(null);
    if (!this.late) {
      this.hud.banner(UI_TEXT.banners.onTime, 3, 'ontime');
      this.after(0.4, () => SFX.drum());
    } else {
      this.hud.banner(UI_TEXT.banners.arrivedLate, 3, 'late');
    }
    this.tiger.leave();
  }

  updateFinish(dt) {
    this.finishT += dt;
    const p = this.player;
    if (p.x < LAYOUT.FINISH_WALK_X) {
      p.x = Math.min(LAYOUT.FINISH_WALK_X, p.x + dt * 4);
      p.vx = 4;
    } else {
      p.vx = 0;
      p.pose = 'finish';
    }
    p.y = this.level.terrainY(p.x);
    p.grounded = true;
    p.animate(dt);
    if (this.finishT > 3.6 && !this.sentFinish) {
      this.sentFinish = true;
      this.onFinish?.();
    }
  }

  stats() {
    const m = Math.floor(this.arrived ?? this.clock);
    const late = (this.arrived ?? this.clock) >= CONFIG.BELL_MINUTES;
    return {
      late,
      arriveText: `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`,
      bag: Math.round(this.bag),
      falls: this.falls,
    };
  }

  // ------------------------------------------------------------ camera
  updateCamera(dt, snap = false) {
    const C = CONFIG;
    const p = this.player;
    const aspect = this.camera.aspect;
    const tanH = Math.tan(THREE.MathUtils.degToRad(C.CAM_FOV / 2));
    const baseDist = Math.max(C.CAM_DISTANCE, C.CAM_MIN_VISIBLE_WIDTH / (2 * tanH * aspect));
    const visW = 2 * baseDist * tanH * aspect;
    // bình thường player ở ~40% màn hình; lúc bị cọp đuổi thì lùi camera để thấy con cọp
    const chased = this.tiger.state === 'chase';
    this.cam.ahead = lerp(this.cam.ahead ?? 0, chased ? -0.16 * visW : 0.1 * visW * (p.facing >= 0 ? 1 : 0.3), snap ? 1 : Math.min(1, dt * 1.5));
    const ahead = this.cam.ahead;
    const tx = p.x + ahead;
    const ty = p.camY + 1.0;
    const k = snap ? 1 : 1 - Math.exp(-C.CAM_LERP * dt);
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * (snap ? 1 : 1 - Math.exp(-C.CAM_LERP * 0.7 * dt));

    this.cam.blend = Math.min(1, Math.max(0, this.cam.blend + (this.cam.dir * dt) / C.TRANSFORM_CAM_TWEEN));
    if (this.cam.dir < 0 && this.cam.blend <= 0) {
      this.cam.ov = null;
      this.cam.dir = 0;
    }
    let x = this.cam.x;
    let y = this.cam.y;
    let d = baseDist;
    if (this.cam.ov) {
      const e = easeInOut(this.cam.blend);
      const ov = this.cam.ov;
      x = lerp(x, ov.x, e);
      y = lerp(y, ov.y, e);
      d = lerp(d, Math.max(ov.dist, baseDist * 0.45), e);
    }
    let sx = 0;
    let sy = 0;
    if (this.cam.shakeT > 0) {
      this.cam.shakeT -= dt;
      sx = (Math.random() - 0.5) * 2 * this.cam.shakeAmp;
      sy = (Math.random() - 0.5) * 2 * this.cam.shakeAmp;
    }
    const pitch = THREE.MathUtils.degToRad(C.CAM_PITCH_DEG);
    this.camera.position.set(x + sx, y + d * Math.tan(pitch) + sy, d);
    this.camera.lookAt(x + sx * 0.5, y + sy * 0.5, 0);
    this.sun.position.set(x - 14, y + 26, 16);
    this.sun.target.position.set(x, y - 1, 0);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------ debug
  debugJump(n) {
    if (!GameState.is(S.PLAYING)) return;
    const seg = SEGMENTS[n - 1];
    if (!seg) return;
    const tx = n === 1 ? LAYOUT.START_X : seg.x0 + 2;
    for (const t of this.triggers) {
      if (t.done || t.x >= tx) continue;
      t.done = true;
      for (const a of t.actions) {
        if (a.type === 'transform') this.transforms.applyFinal(a.id);
        if (a.type === 'sandalsOn') this.sandalsOff = false;
      }
    }
    for (const c of LAYOUT.CHECKPOINTS) if (c <= tx) this.checkpoint = c;
    this.player.respawn(tx);
    this.tuan.x = Math.max(this.tuan.x, tx + CONFIG.TUAN_AHEAD_TARGET);
    this.updateCamera(0, true);
  }

  debugClock() {
    this.clock += 5;
  }

  toggleMarkers() {
    if (!this.markers) {
      this.markers = new THREE.Group();
      const red = new THREE.MeshBasicMaterial({ color: '#ff2a2a' });
      const green = new THREE.MeshBasicMaterial({ color: '#2aff6a' });
      const geo = new THREE.BoxGeometry(0.08, 12, 0.08);
      for (const t of this.triggers) {
        const m = new THREE.Mesh(geo, red);
        m.position.set(t.x, 4, 0.6);
        this.markers.add(m);
      }
      for (const c of LAYOUT.CHECKPOINTS) {
        const m = new THREE.Mesh(geo, green);
        m.position.set(c, 4, 0.7);
        this.markers.add(m);
      }
      this.markers.visible = false;
      this.scene.add(this.markers);
    }
    this.markers.visible = !this.markers.visible;
  }

  dispose() {
    this.hud.clearBubbles();
    this.hud.hint(null);
    this.hud.setBalance(false);
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) {
        if (m.userData?.shared) continue;
        if (m.map) m.map.dispose();
        m.dispose();
      }
    });
  }
}
