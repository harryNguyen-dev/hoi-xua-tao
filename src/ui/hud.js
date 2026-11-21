// HUD: đồng hồ, thanh "Cặp khô", tên đoạn, thanh thăng bằng, gợi ý, banner, bong bóng chữ.
import * as THREE from 'three';
import { UI_TEXT } from '../data/script.js';

const el = (tag, cls, html = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.innerHTML = html;
  return e;
};

export class HUD {
  constructor(parent) {
    this.root = el('div', 'hud hidden');
    this.root.innerHTML = `
      <div class="hud-seg"><div class="seg-num"></div><div class="seg-vi"></div><div class="seg-en"></div></div>
      <div class="hud-right">
        <div class="hud-clock"><span class="ic">⏰</span><span class="time">5:30</span><small>${UI_TEXT.clockSuffix}</small></div>
        <div class="hud-bag">
          <div class="bag-label">🎒 ${UI_TEXT.bagLabel.vi} <small>${UI_TEXT.bagLabel.en}</small></div>
          <div class="bar"><div class="fill"></div></div>
        </div>
      </div>
      <div class="hud-balance hidden">
        <div class="bal-label">${UI_TEXT.balanceLabel.vi} <small>${UI_TEXT.balanceLabel.en}</small></div>
        <div class="bal-track"><div class="bal-zone"></div><div class="bal-needle"></div></div>
        <div class="bal-keys"><span>A ◀</span><span>▶ D</span></div>
      </div>
      <div class="hud-hint hidden"></div>
      <div class="hud-banner hidden"></div>
      <div class="hud-mute hidden">🔇</div>
      <div class="hud-debug hidden"></div>
    `;
    parent.appendChild(this.root);
    this.bubbleLayer = el('div', 'bubbles');
    parent.appendChild(this.bubbleLayer);
    this.touchEl = el(
      'div',
      'touch hidden',
      `<div class="tgroup"><button data-touch="left">◀</button><button data-touch="right">▶</button></div>
       <div class="tgroup"><button data-touch="up" class="small">🎒</button><button data-touch="jump">⤒</button></div>`,
    );
    parent.appendChild(this.touchEl);

    const q = (s) => this.root.querySelector(s);
    this.segEl = q('.hud-seg');
    this.segNum = q('.seg-num');
    this.segVi = q('.seg-vi');
    this.segEn = q('.seg-en');
    this.timeEl = q('.time');
    this.clockEl = q('.hud-clock');
    this.bagEl = q('.hud-bag');
    this.bagFill = q('.fill');
    this.balEl = q('.hud-balance');
    this.needle = q('.bal-needle');
    this.hintEl = q('.hud-hint');
    this.bannerEl = q('.hud-banner');
    this.muteEl = q('.hud-mute');
    this.debugEl = q('.hud-debug');
    this.bubbles = new Map();
    this.hintTimer = null;
    this.bannerTimer = null;
    this.lastMin = -1;
    this.lastBag = -1;
    this._v = new THREE.Vector3();
  }

  show(v, touch = false) {
    this.root.classList.toggle('hidden', !v);
    this.touchEl.classList.toggle('hidden', !(v && touch));
    if (!v) this.clearBubbles();
  }

  setSegment(n, name) {
    this.segNum.textContent = `${UI_TEXT.segmentLabel} ${n}`;
    this.segVi.textContent = name.vi;
    this.segEn.textContent = name.en;
    this.segEl.classList.remove('pop');
    void this.segEl.offsetWidth;
    this.segEl.classList.add('pop');
  }

  setClock(minutes, late) {
    const m = Math.floor(minutes);
    if (m !== this.lastMin) {
      this.lastMin = m;
      const h = Math.floor(m / 60);
      const mm = String(m % 60).padStart(2, '0');
      this.timeEl.textContent = `${h}:${mm}`;
    }
    this.clockEl.classList.toggle('late', late);
    this.clockEl.classList.toggle('warn', !late && minutes >= 6 * 60 + 50);
  }

  setBag(v, dripping) {
    const r = Math.round(v);
    if (r !== this.lastBag) {
      this.lastBag = r;
      this.bagFill.style.width = `${Math.max(0, r)}%`;
      this.bagFill.style.background = r >= 60 ? '' : r >= 30 ? '#E0A030' : '#D9533B';
    }
    this.bagEl.classList.toggle('drip', !!dripping);
  }

  flashBag() {
    this.bagEl.classList.remove('hit');
    void this.bagEl.offsetWidth;
    this.bagEl.classList.add('hit');
  }

  setBalance(visible, b = 0) {
    this.balEl.classList.toggle('hidden', !visible);
    if (visible) {
      this.needle.style.left = `${50 + Math.max(-1, Math.min(1, b)) * 48}%`;
      this.needle.classList.toggle('danger', Math.abs(b) > 0.7);
    }
  }

  hint(t, seconds = 5) {
    clearTimeout(this.hintTimer);
    if (!t) {
      this.hintEl.classList.add('hidden');
      return;
    }
    this.hintEl.innerHTML = `<div>${t.vi}</div><small>${t.en}</small>`;
    this.hintEl.classList.remove('hidden');
    this.hintTimer = setTimeout(() => this.hintEl.classList.add('hidden'), seconds * 1000);
  }

  banner(t, seconds = 2.2, cls = '') {
    clearTimeout(this.bannerTimer);
    this.bannerEl.className = `hud-banner ${cls}`;
    this.bannerEl.innerHTML = `<div class="b-vi">${t.vi}</div><div class="b-en">${t.en}</div>`;
    void this.bannerEl.offsetWidth;
    this.bannerEl.classList.add('show');
    this.bannerTimer = setTimeout(() => this.bannerEl.classList.add('hidden'), seconds * 1000);
  }

  setMuted(m) {
    this.muteEl.classList.toggle('hidden', !m);
  }

  setDebug(text) {
    this.debugEl.classList.toggle('hidden', !text);
    if (text) this.debugEl.textContent = text;
  }

  /** Bong bóng chữ gắn vào một điểm 3D (getPos trả về Vector3). */
  bubble(key, getPos, vi, en, seconds = 3, cls = '') {
    let b = this.bubbles.get(key);
    if (!b) {
      b = { el: el('div', 'bubble') };
      this.bubbleLayer.appendChild(b.el);
      this.bubbles.set(key, b);
    }
    b.el.className = `bubble ${cls}`;
    b.el.innerHTML = `<div class="bv">${vi}</div>${en ? `<div class="be">${en}</div>` : ''}`;
    b.getPos = getPos;
    b.life = seconds;
    b.el.classList.remove('out');
    void b.el.offsetWidth;
    b.el.classList.add('in');
  }

  clearBubbles() {
    for (const b of this.bubbles.values()) b.el.remove();
    this.bubbles.clear();
  }

  updateBubbles(camera, dt) {
    const w = innerWidth;
    const h = innerHeight;
    for (const [key, b] of this.bubbles) {
      b.life -= dt;
      if (b.life <= 0) {
        b.el.remove();
        this.bubbles.delete(key);
        continue;
      }
      if (b.life < 0.3) b.el.classList.add('out');
      const v = this._v.copy(b.getPos()).project(camera);
      const visible = v.z < 1 && v.x > -1.2 && v.x < 1.2;
      b.el.style.display = visible ? '' : 'none';
      const x = Math.max(90, Math.min(w - 90, (v.x * 0.5 + 0.5) * w));
      const y = Math.max(70, (-v.y * 0.5 + 0.5) * h);
      b.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    }
  }
}
