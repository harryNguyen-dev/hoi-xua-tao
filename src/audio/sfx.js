// WebAudio synth: không có file âm thanh nào cả.
let ctx = null;
let master = null;
let sfxBus = null;
let musicBus = null;
let farBus = null; // loa phường xa xa: bandpass + echo
let noiseBuf = null;
let distCurve = null;
let muted = false;
const MASTER_VOL = 0.8;

export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : MASTER_VOL;
      master.connect(ctx.destination);
      sfxBus = ctx.createGain();
      sfxBus.gain.value = 0.9;
      sfxBus.connect(master);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0.13;
      musicBus.connect(master);

      // far bus: horn-like bandpass + slapback echo
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1400;
      bp.Q.value = 2.2;
      const delay = ctx.createDelay(1);
      delay.delayTime.value = 0.21;
      const fb = ctx.createGain();
      fb.gain.value = 0.35;
      const farOut = ctx.createGain();
      farOut.gain.value = 0.7;
      bp.connect(farOut);
      bp.connect(delay);
      delay.connect(fb);
      fb.connect(delay);
      delay.connect(farOut);
      farOut.connect(sfxBus);
      farBus = bp;

      const len = ctx.sampleRate * 2;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

      distCurve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) {
        const x = (i / 1023) * 2 - 1;
        distCurve[i] = Math.tanh(x * 6);
      }
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    ctx = null;
  }
}

/** Tạm dừng / tiếp tục toàn bộ âm thanh (nhạc nền đứng yên theo đồng hồ audio). */
export function setAudioPaused(p) {
  if (!ctx) return;
  if (p) ctx.suspend();
  else ctx.resume();
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.setTargetAtTime(muted ? 0 : MASTER_VOL, ctx.currentTime, 0.03);
  return muted;
}

const now = () => ctx.currentTime;

function envGain(t, attack, peak, dur, dest) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + Math.min(attack, dur * 0.9));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(dest);
  return g;
}

function tone({ type = 'sine', f0 = 440, f1 = null, dur = 0.2, vol = 0.2, at = 0, attack = 0.005, lin = false, filter = null, dest = null, vibrato = null, dist = false, glide = null }) {
  if (!ctx) return;
  const t = now() + at;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (glide) {
    // glide: [[freq, timeOffset], ...]
    for (const [f, dt] of glide) o.frequency.linearRampToValueAtTime(f, t + dt);
  } else if (f1 != null) {
    if (lin) o.frequency.linearRampToValueAtTime(f1, t + dur);
    else o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  }
  let node = o;
  if (dist) {
    const ws = ctx.createWaveShaper();
    ws.curve = distCurve;
    node.connect(ws);
    node = ws;
  }
  if (filter) {
    const f = ctx.createBiquadFilter();
    f.type = filter.type || 'lowpass';
    f.frequency.value = filter.freq || 1000;
    f.Q.value = filter.Q ?? 0.7;
    node.connect(f);
    node = f;
  }
  const g = envGain(t, attack, vol, dur, dest || sfxBus);
  node.connect(g);
  if (vibrato) {
    const l = ctx.createOscillator();
    l.frequency.value = vibrato.rate;
    const lg = ctx.createGain();
    lg.gain.value = vibrato.depth;
    l.connect(lg);
    lg.connect(o.frequency);
    l.start(t);
    l.stop(t + dur + 0.1);
  }
  o.start(t);
  o.stop(t + dur + 0.1);
}

function noise({ dur = 0.3, vol = 0.2, at = 0, attack = 0.005, type = 'lowpass', freq = 1000, freq1 = null, Q = 0.7, dest = null }) {
  if (!ctx) return;
  const t = now() + at;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  f.Q.value = Q;
  if (freq1) f.frequency.exponentialRampToValueAtTime(freq1, t + dur);
  const g = envGain(t, attack, vol, dur, dest || sfxBus);
  src.connect(f);
  f.connect(g);
  src.start(t, Math.random() * 1.5);
  src.stop(t + dur + 0.1);
}

export const SFX = {
  // Trống trường: tùng... tùng... tùng
  drum(times = 3) {
    if (!ctx) return;
    for (let i = 0; i < times; i++) {
      const at = i * 0.62;
      const last = i === times - 1;
      tone({ type: 'sine', f0: 88, f1: 46, dur: last ? 1.1 : 0.7, vol: 0.95, at });
      tone({ type: 'triangle', f0: 170, f1: 80, dur: 0.18, vol: 0.35, at });
      noise({ dur: 0.25, vol: 0.45, at, type: 'lowpass', freq: 320 });
    }
  },
  // Gà gáy: càng dở càng hài
  rooster() {
    if (!ctx) return;
    const v = { rate: 9, depth: 35 };
    const f = { type: 'bandpass', freq: 1500, Q: 1.2 };
    tone({ type: 'sawtooth', f0: 520, f1: 640, dur: 0.16, vol: 0.12, filter: f, vibrato: v, lin: true });
    tone({ type: 'sawtooth', f0: 700, f1: 820, dur: 0.16, vol: 0.12, at: 0.2, filter: f, vibrato: v, lin: true });
    tone({ type: 'sawtooth', f0: 600, glide: [[1200, 0.18], [1120, 0.6], [900, 1.0]], dur: 1.05, vol: 0.14, at: 0.42, filter: f, vibrato: v });
  },
  // Loa phường: "tò te" + rè
  loudspeaker() {
    if (!ctx) return;
    const seq = [
      [523, 0, 0.26],
      [784, 0.3, 0.42],
      [523, 0.8, 0.26],
      [784, 1.1, 0.5],
    ];
    for (const [f, at, dur] of seq) tone({ type: 'square', f0: f, dur, vol: 0.09, at, attack: 0.01, dest: farBus });
    noise({ dur: 1.9, vol: 0.05, type: 'highpass', freq: 2500, attack: 0.05, dest: farBus });
    noise({ dur: 0.12, vol: 0.12, at: 1.75, type: 'bandpass', freq: 1800, Q: 4, dest: farBus });
  },
  jump() {
    tone({ type: 'square', f0: 280, f1: 680, dur: 0.13, vol: 0.06, filter: { type: 'lowpass', freq: 2200 } });
  },
  land() {
    noise({ dur: 0.09, vol: 0.12, type: 'lowpass', freq: 500 });
  },
  splash() {
    noise({ dur: 0.9, vol: 0.45, type: 'bandpass', freq: 1400, freq1: 300, Q: 0.8 });
    for (let i = 0; i < 4; i++) tone({ type: 'sine', f0: 700 + Math.random() * 600, f1: 1500, dur: 0.07, vol: 0.06, at: 0.15 + Math.random() * 0.5 });
  },
  smallSplash() {
    noise({ dur: 0.3, vol: 0.18, type: 'bandpass', freq: 1600, freq1: 600, Q: 1 });
  },
  buffalo() {
    if (!ctx) return;
    const f = { type: 'lowpass', freq: 520, Q: 2 };
    tone({ type: 'sawtooth', f0: 118, f1: 100, dur: 0.5, vol: 0.32, attack: 0.06, filter: f, vibrato: { rate: 5, depth: 3 } });
    tone({ type: 'sawtooth', f0: 112, f1: 92, dur: 0.75, vol: 0.32, at: 0.55, attack: 0.08, filter: f, vibrato: { rate: 5, depth: 3 } });
  },
  tiger() {
    if (!ctx) return;
    noise({ dur: 1.1, vol: 0.4, type: 'lowpass', freq: 500, freq1: 180, attack: 0.05 });
    tone({ type: 'sawtooth', f0: 82, f1: 52, dur: 1.1, vol: 0.32, attack: 0.05, dist: true, filter: { type: 'lowpass', freq: 900 } });
    // ...rồi kết bằng tiếng "meo" nhỏ xíu cho ngộ nghĩnh
    tone({ type: 'triangle', f0: 720, f1: 480, dur: 0.22, vol: 0.12, at: 1.2, vibrato: { rate: 12, depth: 20 } });
  },
  type() {
    tone({ type: 'square', f0: 2100 + Math.random() * 300, dur: 0.012, vol: 0.018, filter: { type: 'highpass', freq: 1200 } });
  },
  crack() {
    noise({ dur: 0.12, vol: 0.55, type: 'highpass', freq: 1500 });
    noise({ dur: 0.1, vol: 0.45, at: 0.14, type: 'highpass', freq: 1200 });
    noise({ dur: 0.18, vol: 0.5, at: 0.3, type: 'bandpass', freq: 900 });
    tone({ type: 'sawtooth', f0: 220, f1: 70, dur: 0.35, vol: 0.2, at: 0.3 });
  },
  rumble() {
    noise({ dur: 2.8, vol: 0.7, type: 'lowpass', freq: 160, attack: 0.4 });
    tone({ type: 'sine', f0: 42, f1: 36, dur: 2.8, vol: 0.5, attack: 0.4, vibrato: { rate: 7, depth: 6 } });
  },
  flood() {
    noise({ dur: 2.8, vol: 0.5, type: 'lowpass', freq: 300, freq1: 1400, attack: 0.6 });
    noise({ dur: 2.0, vol: 0.25, at: 0.8, type: 'bandpass', freq: 700, Q: 0.6, attack: 0.3 });
  },
  thud() {
    tone({ type: 'sine', f0: 150, f1: 55, dur: 0.25, vol: 0.6 });
    noise({ dur: 0.1, vol: 0.3, type: 'lowpass', freq: 600 });
  },
  oof() {
    tone({ type: 'square', f0: 320, f1: 140, dur: 0.22, vol: 0.08, filter: { type: 'lowpass', freq: 1400 } });
  },
  ding() {
    tone({ type: 'triangle', f0: 880, dur: 0.35, vol: 0.14 });
    tone({ type: 'triangle', f0: 1320, dur: 0.45, vol: 0.1, at: 0.08 });
  },
  pop() {
    tone({ type: 'sine', f0: 380, f1: 950, dur: 0.09, vol: 0.18 });
  },
  whiff() {
    noise({ dur: 0.14, vol: 0.2, type: 'bandpass', freq: 2500, freq1: 900, Q: 1.5 });
  },
  shrink() {
    tone({ type: 'sine', f0: 900, f1: 90, dur: 1.6, vol: 0.14, vibrato: { rate: 10, depth: 30 } });
  },
  boing() {
    tone({ type: 'sine', f0: 180, f1: 520, dur: 0.3, vol: 0.2, vibrato: { rate: 18, depth: 40 } });
  },
  fanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    notes.forEach((f, i) => tone({ type: 'triangle', f0: f, dur: i === notes.length - 1 ? 0.7 : 0.18, vol: 0.18, at: i * 0.13 }));
    notes.forEach((f, i) => tone({ type: 'square', f0: f / 2, dur: 0.15, vol: 0.04, at: i * 0.13 }));
  },
  sparkle() {
    tone({ type: 'sine', f0: 1800, f1: 2600, dur: 0.12, vol: 0.04 });
    tone({ type: 'sine', f0: 2400, f1: 3200, dur: 0.12, vol: 0.03, at: 0.07 });
  },
};

// ---- Nhạc nền: ngũ cung (C D F G A), triangle wave ----
const SCALE = [261.63, 293.66, 349.23, 392.0, 440.0, 523.25, 587.33, 698.46, 783.99, 880.0];
const PHRASES = [
  [5, -1, 4, 3, 4, -1, 2, -1, 3, 4, 5, -1, 4, -1, -1, -1],
  [2, -1, 3, 4, 5, -1, 7, -1, 6, 5, 4, -1, 3, -1, -1, -1],
  [5, 6, 7, -1, 6, 5, 4, -1, 3, -1, 2, -1, 3, -1, -1, -1],
  [2, -1, 3, -1, 1, -1, 0, -1, 1, 2, 3, -1, 0, -1, -1, -1],
];
const BASS = [
  [0, 0, 3, 3],
  [1, 1, 3, 3],
  [0, 2, 2, 3],
  [3, 3, 0, 0],
];
const BASS_NOTES = [65.41, 73.42, 87.31, 98.0];
let musicTimer = null;
let step = 0;
let nextT = 0;

function scheduleMusic() {
  if (!ctx) return;
  const stepDur = 60 / 104 / 2;
  while (nextT < now() + 0.15) {
    const phrase = Math.floor(step / 16) % PHRASES.length;
    const s = step % 16;
    const n = PHRASES[phrase][s];
    const at = Math.max(0, nextT - now());
    if (n >= 0) tone({ type: 'triangle', f0: SCALE[n], dur: stepDur * 1.7, vol: 0.5, at, attack: 0.01, dest: musicBus });
    if (s % 4 === 0) tone({ type: 'triangle', f0: BASS_NOTES[BASS[phrase][s / 4]], dur: stepDur * 3.5, vol: 0.55, at, attack: 0.02, dest: musicBus });
    if (s % 4 === 2) tone({ type: 'sine', f0: 1250, f1: 900, dur: 0.05, vol: 0.18, at, dest: musicBus }); // mõ gỗ
    nextT += stepDur;
    step++;
  }
}

export const Music = {
  playing: false,
  start() {
    if (!ctx || this.playing) return;
    this.playing = true;
    nextT = now() + 0.1;
    musicTimer = setInterval(scheduleMusic, 30);
  },
  stop() {
    this.playing = false;
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = null;
  },
};
