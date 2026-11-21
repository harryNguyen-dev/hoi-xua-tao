// Hộp thoại 2 nhân vật (Bố / Con): typewriter, song ngữ, bấm để skip / qua câu.
import { SPEAKERS } from '../data/script.js';
import { SFX } from '../audio/sfx.js';
import { CONFIG } from '../config.js';

export class Dialogue {
  constructor(parent) {
    this.el = document.createElement('div');
    this.el.className = 'dlg hidden';
    this.el.innerHTML = `
      <div class="dlg-box">
        <div class="dlg-portrait"><span class="dlg-face"></span><span class="dlg-badge"></span></div>
        <div class="dlg-name"></div>
        <div class="dlg-vi"></div>
        <div class="dlg-en"></div>
        <div class="dlg-next">▼</div>
      </div>`;
    parent.appendChild(this.el);
    this.box = this.el.querySelector('.dlg-box');
    this.face = this.el.querySelector('.dlg-face');
    this.badge = this.el.querySelector('.dlg-badge');
    this.nameEl = this.el.querySelector('.dlg-name');
    this.viEl = this.el.querySelector('.dlg-vi');
    this.enEl = this.el.querySelector('.dlg-en');
    this.active = false;
    this.el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.advance();
    });
  }

  play(lines, onDone, { onLine } = {}) {
    this.lines = lines || [];
    this.i = -1;
    this.onDone = onDone;
    this.onLine = onLine;
    this.active = true;
    this.openedAt = performance.now();
    this.el.classList.remove('hidden');
    this.next();
  }

  next() {
    this.i++;
    if (this.i >= this.lines.length) {
      this.close();
      return;
    }
    const l = this.lines[this.i];
    const sp = SPEAKERS[l.speaker] || SPEAKERS.BO;
    this.box.classList.toggle('is-con', l.speaker === 'CON');
    this.box.classList.remove('bump');
    void this.box.offsetWidth;
    this.box.classList.add('bump');
    this.face.textContent = sp.face;
    this.badge.textContent = sp.badge;
    this.nameEl.innerHTML = `${sp.name} <small>${sp.en}</small>`;
    this.chars = Array.from((l.vi || '').normalize('NFC'));
    this.shown = 0;
    this.timer = 0;
    this.typing = true;
    this.viEl.textContent = '';
    this.enEl.textContent = l.en || '';
    this.enEl.classList.remove('show');
    this.el.classList.remove('done');
    this.lineAt = performance.now();
    this.onLine?.(l);
  }

  finishTyping() {
    this.typing = false;
    this.shown = this.chars.length;
    this.viEl.textContent = this.chars.join('');
    this.enEl.classList.add('show');
    this.el.classList.add('done');
  }

  update(dt) {
    if (!this.active || !this.typing) return;
    this.timer += dt * 1000;
    const n = Math.min(this.chars.length, Math.floor(this.timer / CONFIG.TYPEWRITER_MS));
    if (n > this.shown) {
      if (CONFIG.TYPE_SOUND && Math.floor(n / 2) !== Math.floor(this.shown / 2) && this.chars[n - 1] !== ' ') SFX.type();
      this.shown = n;
      this.viEl.textContent = this.chars.slice(0, n).join('');
    }
    if (this.shown >= this.chars.length) this.finishTyping();
  }

  advance() {
    if (!this.active) return;
    if (performance.now() - this.openedAt < CONFIG.DIALOGUE_GUARD_MS) return;
    if (this.typing) this.finishTyping();
    else if (performance.now() - this.lineAt > 120) this.next();
  }

  close() {
    this.active = false;
    this.el.classList.add('hidden');
    const cb = this.onDone;
    this.onDone = null;
    cb?.();
  }
}
