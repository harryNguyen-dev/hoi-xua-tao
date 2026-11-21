// Dựng toàn bộ track (trục X), heightmap groundY(x), platform, trigger.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import * as P from './props.js';
import { createWaterBox } from './water.js';
import { SEGMENT_NAMES } from '../data/script.js';

export const SEGMENTS = [
  { x0: 0, x1: 120 },
  { x0: 120, x1: 220 },
  { x0: 220, x1: 360 },
  { x0: 360, x1: 520 },
  { x0: 520, x1: 640 },
];

export const LAYOUT = {
  START_X: 3,
  MIN_X: 0.6,
  MAX_X: 597,
  GATE_X: 588,
  FINISH_WALK_X: 591.5,
  // Đoạn 1
  DITCHES: [
    [18, 19.8],
    [34, 35.8],
    [50, 51.8],
    [100, 101.8],
  ],
  DITCH_BOTTOM: -1.0,
  PADDY_WATER: -0.35,
  BUFFALO: { x0: 72, x1: 74.6, bottom: 0.45, top: 1.35 },
  // Đoạn 2
  CANAL: { x0: 134, x1: 206, bottom: -2.6, water: -1.5 },
  BRIDGE: { x0: 132.6, x1: 207.4, endY: 0.32, arch: 0.95, gapA: 167.6, gapB: 170.4 },
  BRIDGE_LEGS: [141, 152, 163, 176, 188, 199],
  // Đoạn 3
  STREAM: { x0: 227.5, x1: 334.5, bankIn: 227, bedStart: 231, bedEnd: 331, bankOut: 335, bed: -0.7, dry: -0.45, flood: 0.28 },
  STREAM_ROCKS: [258, 274, 290, 306, 322],
  ROCK_HALF: 0.85,
  ROCK_TOP: 0.75,
  // Đoạn 4
  HILL1: { x0: 366, x1: 456, h: 8 },
  HILL2: { x0: 436, x1: 516, h: 11 },
  MUD: [
    { x0: 378, x1: 384, hill: 1 },
    { x0: 400, x1: 405, hill: 1 },
    { x0: 452, x1: 458, hill: 2 },
  ],
  PASS_ROCKS: [389, 428],
  TIGER_LEAVE_X: 476,
  // Đoạn 5
  SCHOOL_MODE_X: 524,
  TUAN_DOOR: { x: 600, z: -9.0 },
  CHECKPOINTS: [3, 122, 153, 222, 362, 522],
};

/** Trigger theo vị trí X; mỗi cái chạy 1 lần. */
export const TRIGGERS = [
  { x: 2, actions: [{ type: 'sfx', id: 'rooster' }, { type: 'sfx', id: 'loudspeaker', delay: 1.8 }, { type: 'dialogue', id: 'SEG1_START' }, { type: 'hint', id: 'start', seconds: 5 }] },
  { x: 5, actions: [{ type: 'tuan', id: 'SEG1' }] },
  { x: 63, actions: [{ type: 'hint', id: 'buffalo', seconds: 4 }] },
  { x: 125, actions: [{ type: 'tuan', id: 'SEG2' }] },
  { x: 152, actions: [{ type: 'dialogue', id: 'SEG2_MID' }, { type: 'transform', id: 'bridgeBreak' }, { type: 'hint', id: 'gap', seconds: 4 }] },
  { x: 210, actions: [{ type: 'dialogue', id: 'SEG2_END' }] },
  { x: 223, actions: [{ type: 'dialogue', id: 'SEG3_START' }, { type: 'transform', id: 'sandals' }] },
  { x: 228, actions: [{ type: 'tuan', id: 'SEG3' }] },
  { x: 246, actions: [{ type: 'dialogue', id: 'SEG3_MID' }, { type: 'transform', id: 'flood' }, { type: 'hint', id: 'flood', seconds: 7 }] },
  { x: 340, actions: [{ type: 'sandalsOn' }, { type: 'dialogue', id: 'SEG3_END' }] },
  { x: 365, actions: [{ type: 'tuan', id: 'SEG4' }] },
  {
    x: 393,
    actions: [
      { type: 'dialogue', id: 'SEG4_MID_A' },
      { type: 'transform', id: 'hill2' },
      { type: 'dialogue', id: 'SEG4_MID_B' },
      { type: 'transform', id: 'tiger' },
      { type: 'hint', id: 'tiger', seconds: 3 },
    ],
  },
  { x: 498, actions: [{ type: 'dialogue', id: 'SEG4_END' }] },
  { x: 523, actions: [{ type: 'dialogue', id: 'SEG5_START' }, { type: 'hint', id: 'school', seconds: 4 }] },
  { x: 556, actions: [{ type: 'tuan', id: 'SEG5' }] },
];

export const bell = (x, H) => (x <= H.x0 || x >= H.x1 ? 0 : H.h * 0.5 * (1 - Math.cos((2 * Math.PI * (x - H.x0)) / (H.x1 - H.x0))));
const lerp = (a, b, t) => a + (b - a) * t;

function profileShape(fn, xa, xb, step, bottom, breaks = []) {
  let xs = [];
  for (let x = xa; x < xb - 1e-6; x += step) xs.push(x);
  xs.push(xb);
  for (const b of breaks) if (b > xa && b < xb) xs.push(b - 0.002, b + 0.002);
  xs.sort((a, b) => a - b);
  xs = xs.filter((x, i) => i === 0 || x - xs[i - 1] > 1e-4);
  const s = new THREE.Shape();
  s.moveTo(xa, bottom);
  for (const x of xs) s.lineTo(x, fn(x));
  s.lineTo(xb, bottom);
  return s;
}

function chunk(shape, z0, z1, cap, top, parent, cast = false) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false, steps: 1, curveSegments: 1 });
  geo.translate(0, 0, z0);
  const m = new THREE.Mesh(geo, [P.mat(cap), P.mat(top)]);
  m.receiveShadow = true;
  m.castShadow = cast;
  parent.add(m);
  return m;
}

export function buildLevel(scene, uTime) {
  const L = LAYOUT;
  const C = CONFIG;
  const group = new THREE.Group();
  scene.add(group);
  const r = P.makeRng(17);
  const updaters = [];

  const level = { group, hill2Scale: 0, LAYOUT: L };

  // ---------- logic shapes ----------
  const B = L.BRIDGE;
  const bridge = {
    x0: B.x0,
    x1: B.x1,
    gapA: B.gapA,
    gapB: B.gapB,
    broken: false,
    breakT: 0,
    y(x) {
      const t = (x - B.x0) / (B.x1 - B.x0);
      return B.endY + B.arch * Math.sin(Math.PI * t);
    },
    contains(x) {
      return x >= B.x0 && x <= B.x1;
    },
    walkable(x) {
      return this.contains(x) && !(this.broken && x > B.gapA && x < B.gapB);
    },
  };
  const canal = { ...L.CANAL, waterY: L.CANAL.water, contains: (x) => x > L.CANAL.x0 && x < L.CANAL.x1 };
  const stream = { ...L.STREAM, level: L.STREAM.dry, flooded: false, contains: (x) => x > L.STREAM.x0 && x < L.STREAM.x1 };
  level.bridge = bridge;
  level.canal = canal;
  level.stream = stream;
  level.PADDY_WATER = L.PADDY_WATER;

  function terrainAt(x, hill2) {
    if (x < 120) {
      for (const [a, b] of L.DITCHES) if (x > a && x < b) return L.DITCH_BOTTOM;
      return 0;
    }
    if (x < 220) return canal.contains(x) ? canal.bottom : 0;
    if (x < 360) {
      const S = L.STREAM;
      if (x <= S.bankIn) return 0;
      if (x < S.bedStart) return lerp(0, S.bed, (x - S.bankIn) / (S.bedStart - S.bankIn));
      if (x <= S.bedEnd) return S.bed;
      if (x < S.bankOut) return lerp(S.bed, 0, (x - S.bedEnd) / (S.bankOut - S.bedEnd));
      return 0;
    }
    if (x < 520) return Math.max(bell(x, L.HILL1), hill2 * bell(x, L.HILL2));
    return 0;
  }
  level.terrainY = (x) => terrainAt(x, level.hill2Scale);

  const solids = [];
  solids.push({ ...L.BUFFALO, type: 'buffalo' });
  for (const rx of L.STREAM_ROCKS) solids.push({ x0: rx - L.ROCK_HALF, x1: rx + L.ROCK_HALF, bottom: L.STREAM.bed, top: L.ROCK_TOP, type: 'rock' });
  for (const px of L.PASS_ROCKS) {
    const g = terrainAt(px, 0);
    solids.push({ x0: px - 0.6, x1: px + 0.6, bottom: Math.min(terrainAt(px - 0.6, 0), terrainAt(px + 0.6, 0)) - 0.3, top: g + 1.0, type: 'rock' });
  }
  level.solids = solids;

  const R = C.PLAYER_RADIUS;
  /** Mặt đứng cao nhất dưới chân (terrain, cầu, platform). */
  level.supportAt = (x, feetY, { grounded = false, ignoreBridge = false } = {}) => {
    const reach = feetY + (grounded ? C.STEP_HEIGHT : 0.12);
    let best = { y: level.terrainY(x), type: 'ground' };
    if (!ignoreBridge && bridge.walkable(x)) {
      const by = bridge.y(x);
      // cho dễ: đang rơi mà chân hơi thấp hơn cây tre vẫn bám lên được
      const bridgeReach = grounded ? reach : reach + 0.4;
      if (by <= bridgeReach && by > best.y) best = { y: by, type: 'bridge' };
    }
    for (const s of solids) {
      if (x > s.x0 - R * 0.6 && x < s.x1 + R * 0.6 && s.top <= reach && s.top > best.y) best = { y: s.top, type: s.type };
    }
    return best;
  };
  /** Có tường chắn khi đi từ x tới nx không? */
  level.blocked = (x, nx, feetY) => {
    const dir = Math.sign(nx - x);
    if (!dir) return false;
    if (level.terrainY(nx + dir * R) > feetY + C.STEP_HEIGHT) return true;
    for (const s of solids) {
      if (s.top <= feetY + C.STEP_HEIGHT || s.bottom >= feetY + C.PLAYER_HEIGHT) continue;
      const overNew = nx + R > s.x0 && nx - R < s.x1;
      const overOld = x + R > s.x0 && x - R < s.x1;
      if (overNew && !overOld) return true;
    }
    return false;
  };
  level.ditchAt = (x) => {
    if (x > 120) return null;
    for (const d of L.DITCHES) if (x > d[0] && x < d[1]) return d;
    return null;
  };
  level.mudAt = (x) => L.MUD.some((m) => x >= m.x0 && x <= m.x1 && (m.hill === 1 || level.hill2Scale > 0.6));
  level.segmentIndexAt = (x) => {
    for (let i = 0; i < SEGMENTS.length; i++) if (x < SEGMENTS[i].x1) return i;
    return SEGMENTS.length - 1;
  };
  /** Mặt đất cho thằng Tuấn: bỏ qua chỗ cầu gãy (nó nhảy qua luôn). */
  level.tuanGroundY = (x) => {
    if (bridge.contains(x)) {
      let y = bridge.y(x);
      const a = B.gapA - 0.4;
      const b = B.gapB + 0.4;
      if (bridge.broken && x > a && x < b) y += Math.sin((Math.PI * (x - a)) / (b - a)) * 1.3;
      return y;
    }
    let y = level.terrainY(x);
    for (const s of solids) if (x > s.x0 - 0.2 && x < s.x1 + 0.2) y = Math.max(y, s.top);
    return y;
  };

  // ---------- background ----------
  P.put(P.mesh(P.box(900, 0.5, 210), '#86A85E', false), 330, -0.3, -121, group);
  // tiền cảnh (phía camera) để không thấy "mép thế giới"
  P.put(P.mesh(P.box(900, 1, 40), '#7FA052', false), 330, -1.55, 22.5, group);
  const fgCols = ['#6E9A45', '#5E8A3B', '#86B35A'];
  for (let x = -20; x < 660; x += 2.2 + r() * 3) {
    if (x > 0 && x < 120) continue; // đoạn ruộng đã có lúa phía trước
    const z = 3.4 + r() * 7;
    const b = P.mesh(P.ico(0.35 + r() * 0.45, 0), fgCols[Math.floor(r() * 3)], false);
    b.position.set(x, -1.05 + 0.15, z);
    b.scale.y = 0.55;
    group.add(b);
    if (r() > 0.6) P.put(P.mesh(P.cone(0.1, 0.5, 4), '#8DBB5E', false), x + 0.6, -0.8, z + 0.3, group);
  }
  group.add(P.createDistantHills(-70, '#9CC48A', 4, 11, 3));
  group.add(P.createDistantHills(-120, '#B3D1B0', 10, 18, 7));
  group.add(P.createDistantHills(-190, '#C8DCD3', 20, 26, 11));
  for (let x = -60; x < 720; x += 55 + r() * 40) {
    const c = P.createCloud(r);
    c.position.set(x, 38 + r() * 22, -160 - r() * 40);
    group.add(c);
  }

  // ======================= ĐOẠN 1: BỜ RUỘNG =======================
  P.put(P.mesh(P.box(120, 1.2, 22), '#6B5432', false), 60, -1.62, -5, group);
  const paddyMat = new THREE.MeshLambertMaterial({ color: '#9ED3C2', transparent: true, opacity: 0.6, depthWrite: false });
  const paddy = new THREE.Mesh(new THREE.PlaneGeometry(120, 22), paddyMat);
  paddy.rotation.x = -Math.PI / 2;
  paddy.position.set(60, L.PADDY_WATER, -5);
  paddy.receiveShadow = true;
  paddy.renderOrder = 1;
  group.add(paddy);
  const ditchBreaks = L.DITCHES.flat();
  chunk(profileShape(level.terrainY, 0, 120, 0.5, -1.6, ditchBreaks), -0.9, 0.9, '#7A5A33', '#8B6B3E', group);
  // grass tufts along path edges
  for (let x = 1; x < 119; x += 1.3 + r()) {
    if (level.ditchAt(x) || level.ditchAt(x + 0.3)) continue;
    const z = r() > 0.5 ? 0.82 : -0.82;
    P.put(P.mesh(P.cone(0.12, 0.3, 4), r() > 0.5 ? '#6FAE4E' : '#86C05F', false), x, 0.12, z, group);
  }
  // bờ ngang trong ruộng
  for (const z of [-7, -12.5]) P.put(P.mesh(P.box(120, 0.9, 0.7), '#8B6B3E', false), 60, -0.6, z, group);
  for (const x of [28, 64, 92]) P.put(P.mesh(P.box(0.7, 0.9, 14.5), '#8B6B3E', false), x, -0.6, -8.75, group);
  // lúa
  const ricePts = [];
  const riceCols = ['#7BB661', '#A8D672', '#8CC46A', '#6FAA55'];
  for (let z = -15.6; z <= 5.6; z += 0.72) {
    if (Math.abs(z) < 1.3) continue;
    if (Math.abs(z + 7) < 0.6 || Math.abs(z + 12.5) < 0.6) continue;
    for (let x = 0.4; x < 119.6; x += 0.72) {
      if (z < -1.5 && [28, 64, 92].some((dx) => Math.abs(x - dx) < 0.6)) continue;
      if (r() < 0.06) continue;
      ricePts.push({
        x: x + (r() - 0.5) * 0.25,
        y: -0.8,
        z: z + (r() - 0.5) * 0.25,
        rot: r() * 3,
        s: 0.9 + r() * 0.5,
        h: 0.95 + r() * 0.35,
        color: riceCols[Math.floor(r() * riceCols.length)],
      });
    }
  }
  group.add(P.createRice(ricePts, uTime));
  // tre, nhà tranh, trâu, loa phường, bù nhìn, cò
  const bamboos = [];
  for (const [x, z] of [
    [8, -4.5],
    [44, -4],
    [62, -14],
    [86, -5.5],
    [114, -4.2],
    [-3, -3],
  ]) {
    const b = P.createBamboo(r, 6 + Math.floor(r() * 4));
    b.position.set(x, -1.02, z);
    group.add(b);
    bamboos.push(b);
  }
  for (const [x, z, ry] of [
    [30, -19, 0.2],
    [97, -21, -0.3],
    [-8, -10, 0.6],
  ]) {
    const h = P.createHut();
    h.position.set(x, -0.05, z);
    h.rotation.y = ry;
    group.add(h);
  }
  const buffalo = P.createBuffalo();
  buffalo.position.set((L.BUFFALO.x0 + L.BUFFALO.x1) / 2, 0, 0);
  group.add(buffalo);
  const buffalo2 = P.createBuffalo();
  buffalo2.position.set(48, -1.0, -10);
  buffalo2.rotation.y = 2.4;
  group.add(buffalo2);
  level.buffalo = buffalo;
  const loa = P.createLoudspeaker();
  loa.position.set(12, -1.02, -3.2);
  group.add(loa);
  const scare = P.createScarecrow();
  scare.position.set(56, -1.02, -5.2);
  group.add(scare);
  for (const [x, z] of [
    [24, -9],
    [39, 3.6],
    [70, -10.5],
    [108, -8],
  ])
    P.put(P.createEgret(r), x, -0.4, z, group);
  const sign1 = P.createSignpost(SEGMENT_NAMES[0].vi, SEGMENT_NAMES[0].en);
  sign1.position.set(1.2, 0, -1.4);
  group.add(sign1);

  // ======================= ĐOẠN 2: CẦU KHỈ =======================
  chunk(profileShape(level.terrainY, 120, 220, 0.5, -3.5, [canal.x0, canal.x1]), -16, 2.5, '#6E5233', '#7E9A4A', group);
  const canalWater = createWaterBox({ x0: canal.x0, x1: canal.x1, z0: -16, z1: 2.5, bottom: canal.bottom, level: canal.waterY, color: '#5E9AAE', opacity: 0.8 });
  group.add(canalWater.mesh);
  updaters.push((dt, t) => canalWater.update(t));
  const bp = P.createMonkeyBridge({ x0: B.x0, x1: B.x1, yFn: bridge.y, gapA: B.gapA, gapB: B.gapB, legXs: L.BRIDGE_LEGS, bottom: canal.bottom });
  group.add(bp.group);
  const midCx = (B.gapA + B.gapB) / 2;
  const midY0 = bridge.y(midCx);
  bridge.startBreak = () => {
    bridge.broken = true;
    bridge.breakT = 0;
  };
  bridge.applyBreak = (t) => {
    const target = canal.waterY - 0.02;
    let y = midY0 - 0.5 * 18 * t * t;
    let rot = Math.min(0.5, t * 1.4);
    if (y < target) {
      y = target + Math.sin(t * 3) * 0.04;
      rot = 0.06 + Math.sin(t * 2) * 0.03;
    }
    bp.mid.position.set(midCx - Math.max(0, t - 0.8) * 0.35, y, Math.min(1.2, Math.max(0, t - 0.8) * 0.2));
    bp.mid.rotation.z = rot;
    const sw = 1 - Math.exp(-4 * t) * Math.cos(9 * t);
    bp.railBreakL.rotation.z = -0.5 * sw;
    bp.railBreakR.rotation.z = 0.5 * sw;
  };
  bridge.setBroken = () => {
    bridge.broken = true;
    if (bridge.breakT < 3) bridge.breakT = 3;
    bridge.applyBreak(bridge.breakT);
  };
  updaters.push((dt) => {
    if (!bridge.broken) return;
    bridge.breakT += dt;
    if (bridge.breakT < 30) bridge.applyBreak(bridge.breakT);
  });
  for (let i = 0; i < 12; i++) {
    const n = P.createNipa(r);
    n.position.set(136 + r() * 68, canal.waterY - 0.3, -4 - r() * 10);
    group.add(n);
  }
  for (const [x0, x1] of [
    [121, 132],
    [208, 219],
  ]) {
    for (let i = 0; i < 4; i++) {
      const b = P.createBanana(r);
      b.position.set(x0 + r() * (x1 - x0), 0, -3 - r() * 9);
      group.add(b);
    }
  }
  const hyac = [];
  for (let i = 0; i < 10; i++) {
    const h = P.createWaterHyacinth(r);
    h.position.set(137 + r() * 66, canal.waterY, -1.5 - r() * 11);
    h.userData.seed = r() * 6;
    group.add(h);
    hyac.push(h);
  }
  updaters.push((dt, t) => {
    for (const h of hyac) h.position.y = canal.waterY + Math.sin(t * 1.5 + h.userData.seed) * 0.04;
  });
  const sign2 = P.createSignpost(SEGMENT_NAMES[1].vi, SEGMENT_NAMES[1].en);
  sign2.position.set(121.5, 0, -1.4);
  group.add(sign2);

  // ======================= ĐOẠN 3: LỘI SUỐI =======================
  const S = L.STREAM;
  chunk(profileShape(level.terrainY, 220, S.bedStart, 0.5, -3), -16, 2.5, '#5C4B36', '#6E9A45', group);
  chunk(profileShape(level.terrainY, S.bedStart, S.bedEnd, 2, -3), -6, 2.5, '#5C4B36', '#9C8F70', group);
  chunk(profileShape(level.terrainY, S.bedEnd, 360, 0.5, -3), -16, 2.5, '#5C4B36', '#6E9A45', group);
  // bờ suối phía sau (cao hơn mực lũ)
  const dirt = P.mat('#5C4B36');
  const bankBack = new THREE.Mesh(P.box(110, 3.8, 10), [dirt, dirt, P.mat('#6E9A45'), dirt, dirt, dirt]);
  bankBack.position.set(281, -1.1, -11);
  bankBack.receiveShadow = true;
  group.add(bankBack);
  const streamWater = createWaterBox({ x0: S.x0, x1: S.x1, z0: -6, z1: 2.5, bottom: S.bed, level: S.dry, color: '#6FA8BF', opacity: 0.68, segX: 60 });
  group.add(streamWater.mesh);
  updaters.push((dt, t) => streamWater.update(t));
  level.streamWater = streamWater;
  const pebbleCols = ['#8E8A80', '#A39E92', '#7A766D', '#B5AE9E'];
  for (let i = 0; i < 70; i++) {
    const s = 0.12 + r() * 0.22;
    const pb = P.mesh(new THREE.DodecahedronGeometry(s, 0), pebbleCols[i % 4], false);
    pb.position.set(S.bedStart + r() * (S.bedEnd - S.bedStart), S.bed + s * 0.3, -5.6 + r() * 7.6);
    pb.scale.y = 0.6;
    group.add(pb);
  }
  for (const rx of L.STREAM_ROCKS) {
    const rk = P.createRock(1.9, 1.6, 1.7, '#8A8A85');
    rk.position.set(rx, L.ROCK_TOP - 0.78, 0);
    rk.rotation.y = r();
    group.add(rk);
  }
  for (let i = 0; i < 46; i++) {
    const x = 222 + r() * 136;
    const z = -7 - r() * 8.5;
    const onBank = x > 226 && x < 336;
    const t = r() > 0.25 ? P.createTree(r, { h: 2.6, size: 1.5 }) : P.createBamboo(r, 5);
    t.position.set(x, onBank ? 0.8 : 0, z);
    group.add(t);
  }
  for (const x of [222, 224.5, 337, 343, 352, 357]) {
    const bush = P.mesh(P.ico(0.6 + r() * 0.3, 0), '#5E9A45');
    bush.position.set(x, 0.3, 1.9);
    bush.scale.y = 0.7;
    group.add(bush);
  }
  const sign3 = P.createSignpost(SEGMENT_NAMES[2].vi, SEGMENT_NAMES[2].en);
  sign3.position.set(221, 0, -1.4);
  group.add(sign3);

  const FLOOD_DRY = '#6FA8BF';
  const FLOOD_MUD = '#8A7356';
  level.setFlood = (k) => {
    stream.level = lerp(S.dry, S.flood, k);
    streamWater.setLevel(stream.level);
    streamWater.lerpColor(FLOOD_DRY, FLOOD_MUD, k);
    streamWater.material.opacity = lerp(0.68, 0.82, k);
    if (k >= 1) stream.flooded = true;
  };

  // ======================= ĐOẠN 4: ĐÈO ĐẤT ĐỎ =======================
  const base0 = (x) => terrainAt(x, 0);
  chunk(profileShape(base0, 360, 520, 0.5, -3), -8, 2.5, '#8E3F22', '#B5532E', group, true);
  P.put(P.mesh(P.box(160, 0.6, 8), '#A84B28', false), 440, -0.28, -12, group);
  const hill2 = new THREE.Group();
  group.add(hill2);
  const h2fn = (x) => bell(x, L.HILL2);
  chunk(profileShape(h2fn, L.HILL2.x0, L.HILL2.x1, 0.5, -0.6), -7.9, 2.55, '#8E3F22', '#B5532E', hill2, true);
  hill2.visible = false;
  hill2.scale.y = 0.001;
  level.hill2 = hill2;
  level.setHill2 = (s) => {
    level.hill2Scale = Math.max(0, s);
    hill2.visible = s > 0.002;
    hill2.scale.y = Math.max(0.001, s);
  };
  // bùn
  for (const m of L.MUD) {
    const fn = m.hill === 1 ? base0 : h2fn;
    const s = new THREE.Shape();
    const xs = [];
    for (let x = m.x0; x <= m.x1 + 1e-6; x += 0.5) xs.push(x);
    s.moveTo(xs[0], fn(xs[0]) - 0.15);
    for (const x of xs) s.lineTo(x, fn(x) + 0.05);
    for (let i = xs.length - 1; i >= 0; i--) s.lineTo(xs[i], fn(xs[i]) - 0.15);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 2.6, bevelEnabled: false });
    geo.translate(0, 0, -1.3);
    const mud = new THREE.Mesh(geo, P.mat('#5A3A22', { emissive: '#1a0f08' }));
    mud.receiveShadow = true;
    (m.hill === 1 ? group : hill2).add(mud);
    for (let i = 0; i < 5; i++) {
      const x = m.x0 + r() * (m.x1 - m.x0);
      const bub = P.mesh(P.ico(0.07, 0), '#7A5638', false);
      bub.position.set(x, fn(x) + 0.08, (r() - 0.5) * 2);
      (m.hill === 1 ? group : hill2).add(bub);
    }
  }
  for (const px of L.PASS_ROCKS) {
    const g = base0(px);
    const rk = P.createRock(1.5, 2.0, 1.4, '#9A8F86');
    rk.position.set(px, g + 0.05, 0);
    group.add(rk);
  }
  // cây thông / bạch đàn trên đèo 1 và phía sau
  for (let i = 0; i < 18; i++) {
    const x = 362 + r() * 156;
    const t = r() > 0.5 ? P.createPine(r, 4) : P.createEucalyptus(r);
    t.position.set(x, base0(x) - 0.1, -3.5 - r() * 4);
    group.add(t);
  }
  for (let i = 0; i < 22; i++) {
    const x = 362 + r() * 156;
    const t = r() > 0.4 ? P.createPine(r, 5) : P.createEucalyptus(r);
    t.position.set(x, 0, -9 - r() * 6);
    group.add(t);
  }
  for (let i = 0; i < 9; i++) {
    const x = L.HILL2.x0 + 8 + r() * (L.HILL2.x1 - L.HILL2.x0 - 16);
    const t = r() > 0.4 ? P.createPine(r, 4) : P.createEucalyptus(r);
    t.position.set(x, h2fn(x) - 0.1, -3.2 - r() * 4);
    hill2.add(t);
  }
  const passSign = P.createSignpost('ĐÈO SỐ 2', '(mới mọc)');
  passSign.position.set(470, h2fn(470), -1.5);
  passSign.rotation.z = -0.1;
  hill2.add(passSign);
  const sign4 = P.createSignpost(SEGMENT_NAMES[3].vi, SEGMENT_NAMES[3].en);
  sign4.position.set(361.5, 0, -1.4);
  group.add(sign4);

  // ======================= ĐOẠN 5: CỔNG TRƯỜNG =======================
  chunk(profileShape(level.terrainY, 520, 640, 10, -3), -16, 2.5, '#8B6B3E', '#C9A47A', group);
  P.put(P.mesh(P.box(80, 0.06, 13), '#D8CFC0', false), 605, 0.03, -9.6, group);
  for (const [a, b] of [
    [548, 583.4],
    [592.6, 632],
  ]) {
    P.put(P.mesh(P.box(b - a, 0.75, 0.3), '#F2D16B'), (a + b) / 2, 0.37, -2.4, group);
    P.put(P.mesh(P.box(b - a, 0.1, 0.4), '#C4472B'), (a + b) / 2, 0.8, -2.4, group);
    for (let x = a + 1; x < b; x += 2) P.put(P.mesh(P.box(0.08, 1.1, 0.08), '#3E5E4E'), x, 1.35, -2.4, group);
  }
  const gate = P.createSchoolGate('TRƯỜNG TIỂU HỌC XÃ ĐỒNG XANH');
  gate.position.set(L.GATE_X, 0, -2.4);
  group.add(gate);
  const flag = P.createFlagPole();
  flag.group.position.set(L.GATE_X - 1, 0, -7.5);
  group.add(flag.group);
  updaters.push((dt, t) => flag.update(t));
  const school = P.createSchoolBuilding();
  school.position.set(600, 0, -13.5);
  group.add(school);
  const drum = P.createDrum();
  drum.position.set(591, 0.4, -11.3);
  group.add(drum);
  const board = P.createChalkboard();
  board.position.set(L.TUAN_DOOR.x + 1.6, 0.06, L.TUAN_DOOR.z - 0.6);
  board.rotation.y = -0.35;
  group.add(board);
  for (const [x, z] of [
    [568, -6.5],
    [622, -7.5],
    [578, -15],
    [540, -8],
  ]) {
    const t = P.createPhuong(r);
    t.position.set(x, 0, z);
    group.add(t);
  }
  for (let i = 0; i < 8; i++) {
    const t = P.createTree(r, { h: 2.2, size: 1.2 });
    t.position.set(522 + r() * 28, 0, -5 - r() * 9);
    group.add(t);
  }
  const sign5 = P.createSignpost(SEGMENT_NAMES[4].vi, SEGMENT_NAMES[4].en);
  sign5.position.set(521.5, 0, -1.4);
  group.add(sign5);

  // ---------- ambient animation ----------
  let mooT = 0;
  level.bumpBuffalo = () => {
    mooT = 0.6;
  };
  updaters.push((dt, t) => {
    const head = buffalo.userData.head;
    mooT = Math.max(0, mooT - dt);
    head.rotation.z = mooT > 0 ? -0.35 : 0.45 + Math.sin(t * 1.3) * 0.12;
    buffalo.userData.tail.rotation.x = Math.sin(t * 2.2) * 0.3;
    buffalo2.userData.head.rotation.z = 0.5 + Math.sin(t * 1.1 + 2) * 0.1;
    for (const b of bamboos) b.rotation.z = Math.sin(t * 0.9 + b.userData.sway) * 0.025;
  });

  level.update = (dt, t) => {
    for (const u of updaters) u(dt, t);
  };
  return level;
}
