// Các animation "phóng đại": cầu gãy, lũ dâng, đèo mọc, cọp xuất hiện (+ cutscene cởi dép).
import { CONFIG } from '../config.js';
import { SFX } from '../audio/sfx.js';
import { LAYOUT } from './level.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export function createTransforms(game) {
  const L = game.level;
  const p = () => game.player;

  const defs = {
    bridgeBreak: {
      duration: 3.0,
      start(s) {
        const B = L.bridge;
        s.cx = (B.gapA + B.gapB) / 2;
        game.setCamOverride({ x: s.cx - 3, y: 0.4, dist: 25 });
      },
      update(s, t) {
        if (!s.cracked && t > 0.55) {
          s.cracked = true;
          SFX.crack();
          game.shake(0.25, 0.45);
          L.bridge.startBreak();
          game.particles.burst(14, { x: s.cx, y: L.bridge.y(s.cx), color: '#B6A15A', size: 0.12, life: 0.8, spread: 3, up: 3, gravity: 9 });
        }
        if (!s.splashed && t > 1.25) {
          s.splashed = true;
          SFX.splash();
          game.splash(s.cx, L.canal.waterY, 34, 1.6);
        }
      },
      finish() {
        L.bridge.setBroken();
      },
      applyFinal() {
        L.bridge.setBroken();
      },
    },

    sandals: {
      duration: 1.6,
      start(s) {
        const pl = p();
        game.setCamOverride({ x: pl.x + 0.4, y: pl.y + 0.2, dist: 10 });
        pl.pose = 'crouch';
        pl.poseT = 0;
      },
      update(s, t) {
        p().poseT = t;
        if (!s.swapped && t > 0.75) {
          s.swapped = true;
          p().setSandalsInHand(true);
          game.sandalsOff = true;
          SFX.pop();
        }
      },
      finish() {
        p().pose = null;
        p().setSandalsInHand(true);
        game.sandalsOff = true;
      },
      applyFinal() {
        p().setSandalsInHand(true);
        game.sandalsOff = true;
      },
    },

    flood: {
      duration: 3.4,
      start() {
        game.setCamOverride({ x: p().x + 9, y: -0.2, dist: 30 });
        SFX.flood();
      },
      update(s, t) {
        const k = easeInOut(clamp01((t - 0.5) / 2.2));
        L.setFlood(k);
        if (t > 0.5 && t < 2.8) {
          game.shake(0.06, 0.1);
          if (Math.random() < 0.6) {
            const x = p().x + (Math.random() - 0.2) * 24;
            game.particles.spawn({ x, y: L.stream.level + 0.05, z: (Math.random() - 0.5) * 6, vx: -2, vy: 1.5, color: '#F2EBDD', size: 0.18, life: 0.6, gravity: 4 });
          }
        }
      },
      finish() {
        L.setFlood(1);
      },
      applyFinal() {
        L.setFlood(1);
      },
    },

    hill2: {
      duration: 4.0,
      start() {
        game.setCamOverride({ x: 452, y: 6, dist: 74 });
        L.setHill2(0.002);
      },
      update(s, t) {
        if (!s.rumbled && t > 0.5) {
          s.rumbled = true;
          SFX.rumble();
        }
        const k = clamp01((t - 0.6) / 2.4);
        L.setHill2(Math.max(0.002, easeOutBack(k)));
        if (t > 0.6 && t < 3.1) {
          game.shake(0.45, 0.1);
          for (let i = 0; i < 2; i++) {
            const H = LAYOUT.HILL2;
            const x = H.x0 + Math.random() * (H.x1 - H.x0);
            game.particles.spawn({ x, y: 0.3 + Math.random(), z: 2.6 + Math.random(), vx: (Math.random() - 0.5) * 3, vy: 1 + Math.random() * 2, color: '#C9774A', size: 0.9, life: 1.2, grow: 2, drag: 1.5, opacity: 0.7 });
          }
        }
      },
      finish() {
        L.setHill2(1);
      },
      applyFinal() {
        L.setHill2(1);
      },
    },

    tiger: {
      duration: 3.0,
      start(s) {
        const pl = p();
        s.from = pl.x - 26;
        s.to = pl.x - CONFIG.TIGER_START_GAP;
        game.tiger.spawn(s.from);
        game.setCamOverride({ x: pl.x - 7, y: pl.y + 0.3, dist: 23 });
      },
      update(s, t) {
        const tg = game.tiger;
        tg.x = s.from + (s.to - s.from) * easeOut(clamp01(t / 1.2));
        if (t > 1.2) tg.state = 'pose';
        if (!s.roared && t > 1.3) {
          s.roared = true;
          tg.roar();
          game.shake(0.3, 0.5);
        }
      },
      finish() {
        game.tiger.state = 'chase';
      },
      applyFinal() {},
    },
  };

  let active = null;

  return {
    get active() {
      return active;
    },
    start(id, onDone) {
      const def = defs[id];
      if (!def) {
        onDone?.();
        return;
      }
      active = { id, def, t: 0, s: {}, onDone };
      def.start(active.s);
    },
    update(dt) {
      if (!active) return;
      active.t += dt;
      active.def.update(active.s, active.t, dt);
      if (active.t >= active.def.duration) {
        const a = active;
        active = null;
        a.def.finish(a.s);
        game.clearCamOverride();
        a.onDone?.();
      }
    },
    applyFinal(id) {
      defs[id]?.applyFinal();
    },
  };
}
