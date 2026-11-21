export const STATES = Object.freeze({
  TITLE: 'TITLE',
  INTRO: 'INTRO',
  TRANSITION: 'TRANSITION',
  PLAYING: 'PLAYING',
  DIALOGUE: 'DIALOGUE',
  TRANSFORM: 'TRANSFORM',
  FINISH: 'FINISH',
  ENDING: 'ENDING',
  CAREER: 'CAREER',
  CREDITS: 'CREDITS',
});

const listeners = new Set();

export const GameState = {
  current: STATES.TITLE,
  previous: null,
  set(next) {
    if (next === this.current) return;
    this.previous = this.current;
    this.current = next;
    listeners.forEach((fn) => fn(next, this.previous));
  },
  is(...states) {
    return states.includes(this.current);
  },
  onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

const PLAYS_KEY = 'hoixuatao_plays';

export function loadPlays() {
  try {
    return parseInt(localStorage.getItem(PLAYS_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function savePlays(n) {
  try {
    localStorage.setItem(PLAYS_KEY, String(n));
  } catch {
    /* private mode: bỏ qua */
  }
}
