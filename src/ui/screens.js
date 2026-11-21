// Màn hình: title, chuyển cảnh "HỒI XƯA...", chọn nghề (gag cuối), credits.
import { UI_TEXT, CAREER, CREDITS } from '../data/script.js';
import { SFX } from '../audio/sfx.js';

const el = (tag, cls, html = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.innerHTML = html;
  return e;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export class Screens {
  constructor(parent) {
    this.parent = parent;
    this.vignette = el('div', 'vignette hidden');
    parent.appendChild(this.vignette);
  }

  setVignette(v) {
    this.vignette.classList.toggle('hidden', !v);
  }

  // ---------- TITLE ----------
  showTitle(onStart, isTouch = false) {
    const keys = (isTouch ? UI_TEXT.touchKeys : UI_TEXT.keys).map((k) => `<li><kbd>${k.k}</kbd> ${k.vi} <small>${k.en}</small></li>`).join('');
    const rotate = isTouch ? `<div class="rotate-hint">📱↻ ${UI_TEXT.rotate.vi} <small>${UI_TEXT.rotate.en}</small></div>` : '';
    const s = el(
      'div',
      'screen title',
      `<div class="title-card">
        <div class="tagline">${UI_TEXT.tagline.vi} <small>${UI_TEXT.tagline.en}</small></div>
        <h1>${UI_TEXT.title}</h1>
        <div class="subtitle">${UI_TEXT.subtitle}</div>
        <button class="big-btn start">${UI_TEXT.start.vi} <small>${UI_TEXT.start.en}</small></button>
        <ul class="keys">${keys}</ul>
        ${rotate}
      </div>`,
    );
    this.parent.appendChild(s);
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      removeEventListener('keydown', onKey);
      s.classList.add('out');
      setTimeout(() => s.remove(), 600);
      onStart();
    };
    const onKey = (e) => {
      if (e.code === 'Enter' || e.code === 'Space') go();
    };
    s.querySelector('.start').addEventListener('click', go);
    addEventListener('keydown', onKey);
  }

  // ---------- TRANSITION ----------
  transition({ vi, en, onMid, onEnd, hold = 1300 }) {
    const t = el('div', 'transition', `<div class="tr-text"><div class="tr-vi">${vi}</div><div class="tr-en">${en}</div></div>`);
    this.parent.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    (async () => {
      await wait(750);
      onMid?.();
      await wait(hold);
      t.classList.add('hide');
      await wait(700);
      t.remove();
      onEnd?.();
    })();
  }

  // ---------- CAREER SELECT ----------
  showCareer({ onDone }) {
    const B = CAREER.buttons;
    const btn = (role) => `<button class="career-btn" data-role="${role}"><span class="ci">${B[role].icon}</span><span class="cv">${B[role].vi}</span><small>${B[role].en}</small></button>`;
    const s = el(
      'div',
      'screen career',
      `<div class="career-dad"><span class="face">👨</span><div class="speech"><div class="sv">${CAREER.prompt.vi}</div><div class="se">${CAREER.prompt.en}</div></div></div>
       <h2>${CAREER.title.vi}</h2>
       <div class="career-sub">${CAREER.title.en}</div>
       <div class="career-grid">${btn('doctor')}${btn('police')}${btn('painter')}${btn('gamedev')}</div>`,
    );
    this.parent.appendChild(s);
    this.careerEl = s;
    const speech = s.querySelector('.speech');
    const say = (l) => {
      speech.innerHTML = `<div class="sv">${l.vi}</div><div class="se">${l.en}</div>`;
      speech.classList.remove('pop');
      void speech.offsetWidth;
      speech.classList.add('pop');
    };
    let removed = 0;
    let finished = false;
    const growDoctors = () => {
      s.querySelectorAll('[data-role="doctor"]').forEach((b) => b.style.setProperty('--grow', String(Math.min(1.6, 1 + removed * 0.22))));
      SFX.boing();
    };

    // Họa sĩ: chạy trốn khi chuột tới gần
    const painter = s.querySelector('[data-role="painter"]');
    let flees = 0;
    let lastFlee = 0;
    let touchedOnce = false;
    const flee = (mx, my) => {
      if (!painter.isConnected || painter.classList.contains('gone')) return;
      const r = painter.getBoundingClientRect();
      if (!painter.classList.contains('loose')) {
        // giữ chỗ trong grid để các nút khác không bị xô lệch
        const ph = el('div', 'career-ph');
        ph.style.width = `${r.width}px`;
        ph.style.height = `${r.height}px`;
        painter.replaceWith(ph);
        painter.classList.add('loose');
        painter.style.left = `${r.left}px`;
        painter.style.top = `${r.top}px`;
        painter.style.width = `${r.width}px`;
        s.appendChild(painter);
      }
      const W = innerWidth;
      const H = innerHeight;
      const avoid = [s.querySelector('.career-grid'), s.querySelector('.career-dad')].map((e) => e.getBoundingClientRect());
      let x;
      let y;
      let fallback = null;
      for (let i = 0; i < 60; i++) {
        x = 12 + Math.random() * Math.max(10, W - r.width - 24);
        y = 12 + Math.random() * Math.max(10, H - r.height - 24);
        const far = Math.hypot(x + r.width / 2 - mx, y + r.height / 2 - my) > 260;
        const overGrid = avoid.some((g) => x < g.right && x + r.width > g.left && y < g.bottom && y + r.height > g.top);
        if (far && !fallback) fallback = [x, y];
        if (far && !overGrid) {
          fallback = null;
          break;
        }
      }
      if (fallback) [x, y] = fallback;
      painter.style.left = `${x}px`;
      painter.style.top = `${y}px`;
      lastFlee = performance.now();
      flees++;
      SFX.whiff();
      if (flees === 6) say(CAREER.lines.painterFlee);
    };
    s.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = painter.getBoundingClientRect();
      const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      if (d < Math.max(r.width, r.height) * 0.55 + 45) flee(e.clientX, e.clientY);
    });
    painter.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' && !touchedOnce) {
        touchedOnce = true;
        e.preventDefault();
        flee(e.clientX, e.clientY);
      }
    });
    const vanish = (b) => {
      b.classList.add('gone');
      b.disabled = true;
      setTimeout(() => b.remove(), 500);
      removed++;
      growDoctors();
    };
    painter.addEventListener('click', () => {
      if (finished || performance.now() - lastFlee < 450) return;
      say(CAREER.lines.painter);
      SFX.pop();
      vanish(painter);
    });

    // Làm game: teo nhỏ dần rồi biến mất
    const gamedev = s.querySelector('[data-role="gamedev"]');
    gamedev.addEventListener('click', () => {
      if (finished || gamedev.classList.contains('shrinking')) return;
      say(CAREER.lines.gamedev);
      SFX.shrink();
      gamedev.classList.add('shrinking');
      gamedev.disabled = true;
      setTimeout(() => {
        gamedev.remove();
        removed++;
        growDoctors();
      }, 1700);
    });

    // Công an: tự biến thành Bác sĩ
    const police = s.querySelector('[data-role="police"]');
    police.addEventListener('click', () => {
      if (finished || police.dataset.role !== 'police') return;
      say(CAREER.lines.police);
      police.disabled = true;
      setTimeout(() => {
        police.classList.add('flip');
        setTimeout(() => {
          police.dataset.role = 'doctor';
          police.innerHTML = `<span class="ci">${B.doctor.icon}</span><span class="cv">${B.doctor.vi}</span><small>${B.doctor.en}</small>`;
          police.classList.remove('flip');
          police.disabled = false;
          removed++;
          growDoctors();
        }, 300);
      }, 700);
    });

    // Bác sĩ: lựa chọn duy nhất kết thúc được
    s.addEventListener('click', (e) => {
      const b = e.target.closest('[data-role="doctor"]');
      if (!b || finished || b.disabled) return;
      finished = true;
      say(CAREER.lines.doctor);
      SFX.fanfare();
      this.confetti();
      s.querySelectorAll('.career-btn').forEach((x) => (x.disabled = true));
      b.classList.add('chosen');
      setTimeout(() => {
        s.classList.add('out');
        setTimeout(() => {
          s.remove();
          onDone?.();
        }, 600);
      }, 3200);
    });
  }

  confetti() {
    const wrap = el('div', 'confetti');
    const cols = ['#DA251D', '#FFDD00', '#3E8E6A', '#2F6DB5', '#F48FB1', '#FFFFFF'];
    for (let i = 0; i < 110; i++) {
      const c = el('i');
      c.style.left = `${Math.random() * 100}%`;
      c.style.background = cols[i % cols.length];
      c.style.animationDelay = `${Math.random() * 0.8}s`;
      c.style.animationDuration = `${2.2 + Math.random() * 1.8}s`;
      c.style.setProperty('--dx', `${(Math.random() - 0.5) * 200}px`);
      c.style.setProperty('--rot', `${Math.random() * 1440 - 720}deg`);
      wrap.appendChild(c);
    }
    this.parent.appendChild(wrap);
    setTimeout(() => wrap.remove(), 5000);
  }

  // ---------- CREDITS ----------
  showCredits(stats, { onReplay, onRetell }) {
    const S = CREDITS.stats;
    const lines = CREDITS.lines.map((l) => `<p class="${l.small ? 'small' : ''}">${l.vi}<small>${l.en}</small></p>`).join('');
    const s = el(
      'div',
      'screen credits',
      `<div class="credits-roll">
        <h2>${CREDITS.title}</h2>
        ${lines}
        <div class="stats">
          <div><span>${S.arrive.vi} <small>${S.arrive.en}</small></span><b class="${stats.late ? 'bad' : 'good'}">${stats.arriveText}</b></div>
          <div><span>${S.bag.vi} <small>${S.bag.en}</small></span><b>${stats.bag}%</b></div>
          <div><span>${S.falls.vi} <small>${S.falls.en}</small></span><b>${stats.falls}</b></div>
          <div><span>${S.plays.vi} <small>${S.plays.en}</small></span><b>${stats.plays}</b></div>
          <div class="tuan">${S.tuan.vi} <small>${S.tuan.en}</small></div>
        </div>
        <div class="credits-btns">
          <button class="big-btn replay">${CREDITS.replay.vi} <small>${CREDITS.replay.en}</small></button>
          <button class="big-btn alt retell">${CREDITS.retell.vi} <small>${CREDITS.retell.en}</small></button>
        </div>
      </div>`,
    );
    this.parent.appendChild(s);
    this.creditsEl = s;
    let used = false;
    const once = (fn) => () => {
      if (used) return;
      used = true;
      SFX.pop();
      fn?.();
    };
    s.querySelector('.replay').addEventListener('click', once(onReplay));
    s.querySelector('.retell').addEventListener('click', once(onRetell));
  }

  hideCredits() {
    if (!this.creditsEl) return;
    const c = this.creditsEl;
    c.classList.add('out');
    setTimeout(() => c.remove(), 600);
    this.creditsEl = null;
  }
}
