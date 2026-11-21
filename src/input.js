// Bàn phím + touch. Trả về trạng thái {left,right,jump,up,balanceL,balanceR}.
const down = new Set();
const touch = { left: false, right: false, up: false };
let jumpEdge = false; // Space
let jumpEdgeUp = false; // ↑ / W (không nhảy khi đang ở suối vì ↑ = giơ cặp)
let advanceEdge = false;
const handlers = new Map();

const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

window.addEventListener(
  'keydown',
  (e) => {
    if (PREVENT.has(e.code)) e.preventDefault();
    if (!e.repeat) {
      if (e.code === 'Space') jumpEdge = true;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') jumpEdgeUp = true;
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') advanceEdge = true;
      const list = handlers.get(e.code);
      if (list) list.forEach((fn) => fn(e));
    }
    down.add(e.code);
  },
  { passive: false },
);
window.addEventListener('keyup', (e) => down.delete(e.code));
window.addEventListener('blur', () => {
  down.clear();
  touch.left = touch.right = touch.up = false;
});

export const Input = {
  get left() {
    return down.has('ArrowLeft') || down.has('KeyA') || touch.left;
  },
  get right() {
    return down.has('ArrowRight') || down.has('KeyD') || touch.right;
  },
  get up() {
    return down.has('ArrowUp') || down.has('KeyW') || touch.up;
  },
  get jump() {
    return down.has('Space');
  },
  // Trên cầu khỉ: A/D (và ← →, nút cảm ứng) để giữ thăng bằng.
  get balanceL() {
    return this.left;
  },
  get balanceR() {
    return this.right;
  },
  state() {
    return {
      left: this.left,
      right: this.right,
      jump: this.jump,
      up: this.up,
      balanceL: this.balanceL,
      balanceR: this.balanceR,
    };
  },
  consumeJump(allowUpKey) {
    const j = jumpEdge || (allowUpKey && jumpEdgeUp);
    jumpEdge = false;
    jumpEdgeUp = false;
    return j;
  },
  consumeAdvance() {
    const a = advanceEdge;
    advanceEdge = false;
    return a;
  },
  pressAdvance() {
    advanceEdge = true;
  },
  clearEdges() {
    jumpEdge = jumpEdgeUp = advanceEdge = false;
  },
  onKey(code, fn) {
    if (!handlers.has(code)) handlers.set(code, []);
    handlers.get(code).push(fn);
  },
  isTouch:
    (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches) ||
    'ontouchstart' in window,
  bindTouch(container) {
    container.querySelectorAll('[data-touch]').forEach((btn) => {
      const k = btn.dataset.touch;
      const on = (e) => {
        e.preventDefault();
        btn.classList.add('on');
        if (k === 'jump') jumpEdge = true;
        else touch[k] = true;
        advanceEdge = true;
      };
      const off = (e) => {
        e.preventDefault();
        btn.classList.remove('on');
        if (k !== 'jump') touch[k] = false;
      };
      btn.addEventListener('pointerdown', on);
      btn.addEventListener('pointerup', off);
      btn.addEventListener('pointercancel', off);
      btn.addEventListener('pointerleave', off);
    });
  },
};
