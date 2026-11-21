// Công cụ test (chỉ nạp khi CONFIG.DEBUG): autopilot chơi thử cả màn để cân chỉnh thời gian.
// Dùng trong console:  await __quickstart();  await __run((g,p) => p.x > 200);
export function installDebugTools({ getGame, getDialogue, step, getState }) {
  const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const skipDialogue = () => {
    const d = getDialogue();
    let k = 0;
    while (d.active && k++ < 30) {
      d.finishTyping();
      d.next();
    }
  };

  window.__key = key;

  /** Title → intro → vào game. */
  window.__quickstart = async () => {
    if (getState() === 'TITLE') key('Enter', true);
    await sleep(300);
    skipDialogue();
    await sleep(3300);
    step(0.1);
    window.__dbg.paused = true; // từ giờ chỉ chạy bằng step()/__run
    return getState();
  };

  /**
   * Autopilot: chạy tới, nhảy rãnh/khúc gỗ/chỗ gãy, giữ thăng bằng, giơ cặp.
   * stop(g, p) => true để dừng. opts.lazy = số giây đứng chơi ở mỗi đoạn (để test trễ giờ).
   */
  window.__run = async (stop = () => false, maxSec = 400, opts = {}) => {
    const g = getGame();
    const d = getDialogue();
    const L = g.level;
    const p = g.player;
    const held = new Set();
    const hold = (c, v) => {
      if (v && !held.has(c)) {
        key(c, true);
        held.add(c);
      } else if (!v && held.has(c)) {
        key(c, false);
        held.delete(c);
      }
    };
    let t = 0;
    let jumpCD = 0;
    let idle = 0;
    let lastSeg = -1;
    const log = [];
    const events = [];
    let pm = p.mode;
    while (t < maxSec) {
      if (stop(g, p, d)) break;
      if (d.active && !opts.keepDialogue) skipDialogue();
      const st = getState();
      if (st === 'FINISH' || st === 'TRANSITION' || st === 'ENDING') break;
      const seg = L.segmentIndexAt(p.x);
      if (seg !== lastSeg) {
        lastSeg = seg;
        idle = opts.lazy || 0;
        log.push({ seg: seg + 1, t: +t.toFixed(1), clock: g.clock.toFixed(1), bag: g.bag.toFixed(0), falls: g.falls });
      }
      idle -= 1 / 60;
      hold('ArrowRight', !p.bridgeMode && idle <= 0);
      if (p.bridgeMode) {
        hold('KeyA', p.balance > 0.12);
        hold('KeyD', p.balance < -0.12);
      } else {
        hold('KeyA', false);
        hold('KeyD', false);
      }
      hold('ArrowUp', L.stream.contains(p.x) && L.stream.flooded && opts.bag !== false);
      jumpCD -= 1 / 60;
      let want = false;
      for (const [a] of L.LAYOUT.DITCHES) if (p.x > a - 1.4 && p.x < a - 0.5) want = true;
      if (L.bridge.broken && p.x > L.bridge.gapA - 1.2 && p.x < L.bridge.gapA - 0.4) want = true;
      for (const lg of g.logs) if (lg.x - p.x > 0.6 && lg.x - p.x < 2.2) want = true;
      if (p.grounded && Math.abs(p.vx) < 0.3 && !p.bridgeMode && st === 'PLAYING' && idle <= 0) want = true;
      if (want && jumpCD <= 0 && p.grounded) {
        key('Space', true);
        key('Space', false);
        jumpCD = 0.3;
      }
      step(1 / 60, false);
      t += 1 / 60;
      if (p.mode !== pm) {
        events.push(`${p.mode}@${p.x.toFixed(1)}`);
        pm = p.mode;
      }
      if (Math.round(t * 60) % 600 === 0) await sleep(0);
    }
    for (const c of [...held]) hold(c, false);
    step(1 / 60);
    return { t: +t.toFixed(1), x: +p.x.toFixed(1), state: getState(), clock: g.clock.toFixed(1), bag: g.bag.toFixed(1), falls: g.falls, log, events: events.slice(0, 30), tuanAhead: +(g.tuan.x - p.x).toFixed(1), transform: g.transforms.active?.id };
  };
}
