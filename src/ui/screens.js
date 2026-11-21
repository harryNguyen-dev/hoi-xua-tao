// Màn hình: title, chuyển cảnh "HỒI XƯA...", chọn nghề (gag cuối), credits.
import { UI_TEXT, CAREER, CREDITS } from '../data/script.js';
import { SFX } from '../audio/sfx.js';
import { t, getLang, setLang, LANGS } from '../i18n.js';

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
    const s = el('div', 'screen title');
    const render = () => {
      const keys = (isTouch ? UI_TEXT.touchKeys : UI_TEXT.keys).map((k) => `<li><kbd>${k.k}</kbd> ${t(k)}</li>`).join('');
      const rotate = isTouch ? `<div class="rotate-hint">📱↻ ${t(UI_TEXT.rotate)}</div>` : '';
      const langBtns = LANGS.map((l) => `<button class="lang-btn ${l === getLang() ? 'on' : ''}" data-lang="${l}">${UI_TEXT.langs[l]}</button>`).join('');
      s.innerHTML = `<div class="title-card">
        <div class="lang-switch" role="group" aria-label="Language">${langBtns}</div>
        <div class="tagline">${t(UI_TEXT.tagline)}</div>
        <h1>${t(UI_TEXT.title)}</h1>
        <div class="subtitle">${UI_TEXT.subtitle}</div>
        <button class="big-btn start">${t(UI_TEXT.start)}</button>
        <ul class="keys">${keys}</ul>
        ${rotate}
      </div>`;
      s.querySelector('.start').addEventListener('click', go);
      s.querySelectorAll('.lang-btn').forEach((b) =>
        b.addEventListener('click', () => {
          if (b.dataset.lang === getLang()) return;
          setLang(b.dataset.lang);
          SFX.pop();
          s.classList.add('again');
          render();
        }),
      );
    };
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
    render();
    addEventListener('keydown', onKey);
  }

  // ---------- TRANSITION ----------
  transition({ vi, en, onMid, onEnd, hold = 1300 }) {
    const tr = el('div', 'transition', '<div class="tr-text"><div class="tr-main"></div></div>');
    tr.querySelector('.tr-main').textContent = t({ vi, en });
    this.parent.appendChild(tr);
    requestAnimationFrame(() => tr.classList.add('show'));
    (async () => {
      await wait(750);
      onMid?.();
      await wait(hold);
      tr.classList.add('hide');
      await wait(700);
      tr.remove();
      onEnd?.();
    })();
  }

  // ---------- PAUSE ----------
  showPause({ muted, onResume, onToggleMute, onQuit }) {
    this.hidePause();
    const P = UI_TEXT.pause;
    const p = el(
      'div',
      'screen pause',
      `<div class="pause-card">
        <h2>${t(P.title)}</h2>
        <button class="big-btn resume">▶ ${t(P.resume)}</button>
        <div class="pause-row">
          <button class="small-btn mute">${muted ? '🔈 ' + t(P.unmute) : '🔇 ' + t(P.mute)}</button>
          <button class="small-btn quit">🏠 ${t(P.quit)}</button>
        </div>
        <div class="pause-hint">${t(P.hint)}</div>
      </div>`,
    );
    p.addEventListener('pointerdown', (e) => e.stopPropagation());
    p.querySelector('.resume').addEventListener('click', () => onResume?.());
    p.querySelector('.mute').addEventListener('click', (e) => {
      const m = onToggleMute?.();
      e.currentTarget.textContent = m ? '🔈 ' + t(P.unmute) : '🔇 ' + t(P.mute);
    });
    p.querySelector('.quit').addEventListener('click', () => onQuit?.());
    this.parent.appendChild(p);
    this.pauseEl = p;
    p.querySelector('.resume').focus();
  }

  hidePause() {
    this.pauseEl?.remove();
    this.pauseEl = null;
  }

  // ---------- CAREER SELECT ----------
  showCareer({ onDone }) {
    const B = CAREER.buttons;
    const btnInner = (role) => `<span class="ci">${B[role].icon}</span><span class="cv">${t(B[role])}</span>`;
    const btn = (role) => `<button class="career-btn" data-role="${role}">${btnInner(role)}</button>`;
    const s = el(
      'div',
      'screen career',
      `<div class="career-dad"><span class="face">👨</span><div class="speech"><div class="sv">${t(CAREER.prompt)}</div></div></div>
       <h2>${t(CAREER.title)}</h2>
       <div class="career-grid">${btn('doctor')}${btn('police')}${btn('painter')}${btn('gamedev')}</div>`,
    );
    this.parent.appendChild(s);
    this.careerEl = s;
    const speech = s.querySelector('.speech');
    const say = (l) => {
      speech.innerHTML = '<div class="sv"></div>';
      speech.firstChild.textContent = t(l);
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
          police.innerHTML = btnInner('doctor');
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
    const lines = CREDITS.lines.map((l) => `<p class="${l.small ? 'small' : ''}">${t(l)}</p>`).join('');
    const s = el(
      'div',
      'screen credits',
      `<div class="credits-roll">
        <h2>${t(CREDITS.title)}</h2>
        ${lines}
        <div class="stats">
          <div><span>${t(S.arrive)}</span><b class="${stats.late ? 'bad' : 'good'}">${stats.arriveText}</b></div>
          <div><span>${t(S.bag)}</span><b>${stats.bag}%</b></div>
          <div><span>${t(S.falls)}</span><b>${stats.falls}</b></div>
          <div><span>${t(S.plays)}</span><b>${stats.plays}</b></div>
          <div class="tuan">${t(S.tuan)}</div>
        </div>
        <div class="credits-btns">
          <button class="big-btn replay">${t(CREDITS.replay)}</button>
          <button class="big-btn alt retell">${t(CREDITS.retell)}</button>
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
