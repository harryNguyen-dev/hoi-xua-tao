// Bootstrap, game loop, state machine.
import * as THREE from 'three';
import './ui/style.css';
import { CONFIG } from './config.js';
import { STATES, GameState, loadPlays, savePlays } from './state.js';
import { Input } from './input.js';
import { unlockAudio, toggleMute, SFX, Music } from './audio/sfx.js';
import { buildLivingRoom } from './world/livingroom.js';
import { Game } from './game.js';
import { HUD } from './ui/hud.js';
import { Dialogue } from './ui/dialogue.js';
import { Screens } from './ui/screens.js';
import { SCRIPT, INTRO_ESCALATION, KID_REACTION, UI_TEXT } from './data/script.js';

const S = STATES;
let renderer;
let room;
let game;
let hud;
let dialogue;
let screens;
let view = 'room';
let plays = loadPlays();
let last = performance.now();

const IN_WORLD = [S.PLAYING, S.DIALOGUE, S.TRANSFORM, S.FINISH];

async function boot() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('800 48px "Be Vietnam Pro"'), document.fonts.load('900 48px "Be Vietnam Pro"'), document.fonts.load('32px "Patrick Hand"')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    /* font fallback */
  }

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, CONFIG.MAX_PIXEL_RATIO));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.getElementById('app').prepend(renderer.domElement);

  const ui = document.getElementById('ui');
  screens = new Screens(ui);
  hud = new HUD(ui);
  dialogue = new Dialogue(ui);
  room = buildLivingRoom();
  game = createGame();

  Input.bindTouch(hud.touchEl);
  renderer.domElement.addEventListener('pointerdown', () => Input.pressAdvance());
  Input.onKey('KeyM', () => {
    unlockAudio();
    const m = toggleMute();
    hud.setMuted(m);
  });
  if (CONFIG.DEBUG) {
    for (let i = 1; i <= 5; i++) Input.onKey(`Digit${i}`, () => game.debugJump(i));
    Input.onKey('KeyT', () => game.debugClock());
    Input.onKey('KeyG', () => game.toggleMarkers());
    window.__game = () => game;
    window.__dialogue = () => dialogue;
    window.__flow = { startCareer, startCredits, startEnding, endGame };
  }

  addEventListener('resize', onResize);
  onResize();
  GameState.onChange(onStateChange);

  document.getElementById('boot')?.remove();
  screens.showTitle(() => {
    unlockAudio();
    SFX.pop();
    startIntro();
  }, Input.isTouch);
  requestAnimationFrame(frame);
}

function createGame() {
  const g = new Game({ hud, dialogue, onFinish: () => endGame() });
  g.resize(innerWidth / innerHeight);
  return g;
}

function onResize() {
  const a = innerWidth / innerHeight;
  renderer.setSize(innerWidth, innerHeight);
  room.resize(a);
  game?.resize(a);
}

function onStateChange(s) {
  const inWorld = IN_WORLD.includes(s);
  hud.show(inWorld, Input.isTouch && s === S.PLAYING);
  screens.setVignette(inWorld || s === S.TRANSITION);
  if (s === S.PLAYING && !Music.playing) Music.start();
  if (s === S.ENDING) Music.stop();
}

function tick(dt, render = true) {
  if (Input.consumeAdvance() && dialogue.active) dialogue.advance();
  dialogue.update(dt);
  if (view === 'room') {
    room.update(dt);
    if (render) renderer.render(room.scene, room.camera);
  } else {
    game.update(dt);
    if (render) renderer.render(game.scene, game.camera);
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  if (window.__dbg?.paused) return;
  tick(dt);
}

if (CONFIG.DEBUG) {
  // Chạy mô phỏng nhanh khi test tự động: __dbg.step(giây)
  const step = (seconds, render = true, dt = 1 / 60) => {
    const n = Math.max(1, Math.round(seconds / dt));
    for (let i = 0; i < n; i++) tick(dt, render && i === n - 1);
  };
  window.__dbg = {
    step,
    paused: false, // true: dừng vòng lặp thật, chỉ chạy bằng step() (cho autopilot)
    get state() {
      return GameState.current;
    },
    get view() {
      return view;
    },
  };
  import('./debug.js').then((m) => m.installDebugTools({ getGame: () => game, getDialogue: () => dialogue, step, getState: () => GameState.current }));
}

// ------------------------------------------------------------ flow
function startIntro() {
  view = 'room';
  GameState.set(S.INTRO);
  const lvl = Math.min(plays, INTRO_ESCALATION.length - 1);
  const lines = SCRIPT.INTRO.map((l) => ({ ...l }));
  lines[2] = { ...lines[2], ...INTRO_ESCALATION[lvl] };
  lines[3] = { ...lines[3], ...KID_REACTION[lvl] };
  room.setSpeaker(null);
  dialogue.play(lines, () => toGame(), { onLine: (l) => room.setSpeaker(l.speaker) });
}

function toGame() {
  GameState.set(S.TRANSITION);
  room.setSpeaker(null);
  const c = renderer.domElement;
  screens.transition({
    ...UI_TEXT.transitions.intro,
    hold: 1500,
    onMid: () => {
      view = 'game';
      c.style.transition = 'none';
      c.style.filter = 'sepia(1) saturate(0.7) contrast(1.05)';
    },
    onEnd: () => {
      void c.offsetWidth;
      c.style.transition = 'filter 2.4s ease';
      c.style.filter = 'none';
      game.begin();
    },
  });
}

function endGame() {
  GameState.set(S.TRANSITION);
  screens.transition({
    ...UI_TEXT.transitions.ending,
    onMid: () => {
      view = 'room';
      hud.show(false);
    },
    onEnd: () => startEnding(),
  });
}

function startEnding() {
  GameState.set(S.ENDING);
  const st = game.stats();
  const lines = [
    ...(st.late ? SCRIPT.ENDING_LATE : SCRIPT.ENDING_ONTIME),
    ...(st.bag >= CONFIG.BAG_GOOD_THRESHOLD ? SCRIPT.BAG_DRY : SCRIPT.BAG_WET),
    ...SCRIPT.ENDING_COMMON,
  ];
  dialogue.play(lines, () => startCareer(), { onLine: (l) => room.setSpeaker(l.speaker) });
}

function startCareer() {
  GameState.set(S.CAREER);
  room.setSpeaker('BO');
  screens.showCareer({ onDone: () => startCredits() });
}

function startCredits() {
  GameState.set(S.CREDITS);
  room.setSpeaker(null);
  plays++;
  savePlays(plays);
  screens.showCredits({ ...game.stats(), plays }, { onReplay: () => restart(false), onRetell: () => restart(true) });
}

function restart(retell) {
  screens.hideCredits();
  game.dispose();
  game = createGame();
  if (retell) startIntro();
  else toGame();
}

boot();
