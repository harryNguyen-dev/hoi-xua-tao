// Factory cho mọi prop: mỗi hàm trả về THREE.Group dựng bằng primitive (low-poly, flat shading).
import * as THREE from 'three';

// ---------- helpers ----------
const sharedMats = new Map();
export function mat(color, opts) {
  const key = opts ? `${color}|${JSON.stringify(opts)}` : String(color);
  let m = sharedMats.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color, flatShading: true, ...(opts || {}) });
    m.userData.shared = true;
    sharedMats.set(key, m);
  }
  return m;
}

export function mesh(geo, color, cast = true) {
  const material = color && color.isMaterial ? color : mat(color);
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const cyl = (rt, rb, h, s = 6) => new THREE.CylinderGeometry(rt, rb, h, s);
export const ico = (r, d = 0) => new THREE.IcosahedronGeometry(r, d);
export const cone = (r, h, s = 6) => new THREE.ConeGeometry(r, h, s);

export function put(obj, x, y, z, parent) {
  obj.position.set(x, y, z);
  if (parent) parent.add(obj);
  return obj;
}

const UP = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _d = new THREE.Vector3();
/** Cylinder from point a to b (arrays [x,y,z]). */
export function stick(parent, a, b, r, color, segs = 5) {
  _a.set(a[0], a[1], a[2]);
  _b.set(b[0], b[1], b[2]);
  _d.subVectors(_b, _a);
  const len = _d.length();
  const m = mesh(cyl(r, r, len, segs), color);
  m.position.addVectors(_a, _b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP, _d.normalize());
  parent.add(m);
  return m;
}

export function makeRng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const UI_FONT = '"Be Vietnam Pro", "Segoe UI", Arial, sans-serif';

/** CanvasTexture với chữ (dùng cho bảng hiệu). lines: string | {text,size,color}[] */
export function textTexture(lines, { w = 512, h = 128, bg = '#7A4A28', fg = '#FFF4D6', size = 56, weight = 800, border = null, borderW = 10, font = UI_FONT } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  if (border) {
    g.strokeStyle = border;
    g.lineWidth = borderW;
    g.strokeRect(borderW / 2, borderW / 2, w - borderW, h - borderW);
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const arr = (Array.isArray(lines) ? lines : [lines]).map((l) => (typeof l === 'string' ? { text: l } : l));
  arr.forEach((ln, i) => {
    let s = ln.size || size;
    g.font = `${weight} ${s}px ${font}`;
    while (g.measureText(ln.text).width > w * 0.9 && s > 10) {
      s -= 2;
      g.font = `${weight} ${s}px ${font}`;
    }
    g.fillStyle = ln.color || fg;
    g.fillText(ln.text, w / 2, (h * (i + 0.5)) / arr.length + 2);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ---------- Characters ----------
/**
 * Nhân vật trẻ con (dùng cho player, Tuấn, em gái, bà cụ, bố...).
 * Model quay mặt về +Z; root đặt ở chân. Trả về các khớp để animate.
 */
export function createKid(o = {}) {
  const c = Object.assign(
    {
      shirt: '#F5F5F0', pants: '#1F3A68', skin: '#EDBE95', hair: '#1B1B1B', sleeve: null,
      scarf: true, hat: true, bag: true, glasses: false, part: false, bun: false, pigtails: false,
      sandals: true, shorts: false, mustache: false, belly: false, buttons: true,
    },
    o,
  );
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const P = { root, body, sandalsFeet: [], color: c };

  const legs = [];
  for (const side of [-1, 1]) {
    const pivot = put(new THREE.Group(), side * 0.11, 0.62, 0, body);
    put(mesh(cyl(0.085, 0.075, 0.54), c.shorts ? c.skin : c.pants), 0, -0.29, 0, pivot);
    if (c.shorts) put(mesh(cyl(0.105, 0.1, 0.22), c.pants), 0, -0.1, 0, pivot);
    put(mesh(box(0.11, 0.06, 0.2), c.skin), 0, -0.58, 0.04, pivot);
    if (c.sandals) {
      const s = put(mesh(box(0.14, 0.035, 0.25), '#7A4A28'), 0, -0.605, 0.04, pivot);
      const strap = put(mesh(box(0.15, 0.035, 0.045), '#2F6DB5'), 0, -0.565, 0.09, pivot);
      P.sandalsFeet.push(s, strap);
    }
    legs.push(pivot);
  }
  P.legR = legs[0];
  P.legL = legs[1];

  put(mesh(box(0.36, 0.16, 0.24), c.pants), 0, 0.66, 0, body);
  put(mesh(box(c.belly ? 0.5 : 0.42, 0.47, c.belly ? 0.36 : 0.26), c.shirt), 0, 0.92, 0, body);
  if (c.buttons && !c.belly) for (let i = 0; i < 3; i++) put(mesh(box(0.03, 0.03, 0.02), '#BDBDB5', false), 0, 1.04 - i * 0.12, 0.135, body);
  if (c.scarf) {
    put(mesh(box(0.3, 0.06, 0.28), '#D7261E'), 0, 1.14, 0, body);
    const t1 = put(mesh(cone(0.1, 0.3, 3), '#D7261E'), 0.035, 0.98, 0.15, body);
    t1.rotation.x = Math.PI;
    t1.rotation.z = 0.25;
    const t2 = put(mesh(cone(0.08, 0.25, 3), '#B81E17'), -0.05, 1.0, 0.145, body);
    t2.rotation.x = Math.PI;
    t2.rotation.z = -0.3;
    put(mesh(box(0.08, 0.07, 0.06), '#B81E17'), 0, 1.1, 0.15, body);
  }

  // head
  const head = put(new THREE.Group(), 0, 1.38, 0, body);
  P.head = head;
  put(mesh(ico(0.235, 1), c.skin), 0, 0, 0, head);
  for (const s of [-1, 1]) {
    put(mesh(box(0.045, 0.075, 0.03), '#1A1A1A', false), s * 0.085, 0.02, 0.215, head);
    put(mesh(box(0.05, 0.03, 0.02), '#F29B8A', false), s * 0.14, -0.06, 0.2, head);
    put(mesh(ico(0.05, 0), c.skin), s * 0.235, 0, 0, head);
  }
  put(mesh(box(0.08, 0.022, 0.02), '#9C3B2E', false), 0, -0.1, 0.222, head);
  const hair = put(mesh(new THREE.SphereGeometry(0.255, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), c.hair), 0, 0.02, -0.02, head);
  hair.rotation.x = -0.35;
  if (c.part) {
    put(mesh(box(0.022, 0.02, 0.26), '#F3D3B5', false), 0.075, 0.262, -0.01, head);
    const swoop = put(mesh(box(0.22, 0.07, 0.12), c.hair), -0.05, 0.2, 0.15, head);
    swoop.rotation.z = 0.25;
  }
  if (c.bun) put(mesh(ico(0.11, 1), c.hair), 0, 0.12, -0.24, head);
  if (c.pigtails) for (const s of [-1, 1]) put(mesh(ico(0.085, 0), c.hair), s * 0.25, 0.04, -0.08, head);
  if (c.glasses) {
    for (const s of [-1, 1]) put(mesh(new THREE.TorusGeometry(0.066, 0.014, 5, 12), '#1A1A1A', false), s * 0.085, 0.02, 0.232, head);
    put(mesh(box(0.05, 0.014, 0.014), '#1A1A1A', false), 0, 0.03, 0.235, head);
  }
  if (c.mustache) put(mesh(box(0.15, 0.04, 0.03), '#1B1B1B', false), 0, -0.05, 0.228, head);
  if (c.hat) {
    const hat = put(mesh(cone(0.47, 0.27, 14), '#E8D29A'), 0, 0.3, 0, head);
    hat.rotation.x = -0.1;
    put(mesh(new THREE.TorusGeometry(0.3, 0.012, 4, 16), '#C9AE6E', false), 0, 0.22, 0, head).rotation.x = Math.PI / 2;
    P.hat = hat;
  }

  // arms
  const arms = [];
  for (const side of [-1, 1]) {
    const pivot = put(new THREE.Group(), side * 0.27, 1.1, 0, body);
    put(mesh(cyl(0.075, 0.07, 0.2), c.sleeve || c.shirt), 0, -0.07, 0, pivot);
    put(mesh(cyl(0.055, 0.05, 0.3), c.skin), 0, -0.3, 0, pivot);
    const hand = put(new THREE.Group(), 0, -0.47, 0, pivot);
    put(mesh(ico(0.062, 0), c.skin), 0, 0, 0, hand);
    pivot.rotation.z = side * 0.12;
    arms.push({ pivot, hand });
  }
  P.armR = arms[0].pivot;
  P.handR = arms[0].hand;
  P.armL = arms[1].pivot;
  P.handL = arms[1].hand;

  if (c.bag) {
    const bag = put(new THREE.Group(), 0, 0.92, -0.22, body);
    put(mesh(box(0.38, 0.42, 0.16), '#8B5A2B'), 0, 0, 0, bag);
    put(mesh(box(0.39, 0.15, 0.17), '#6E431F'), 0, 0.14, 0, bag);
    put(mesh(box(0.06, 0.06, 0.02), '#E0B84A', false), 0, 0.08, -0.09, bag);
    P.bag = bag;
    P.bagHome = bag.position.clone();
    for (const s of [-1, 1]) put(mesh(box(0.045, 0.4, 0.02), '#5A3A1C', false), s * 0.12, 0.95, 0.135, body);
  }

  if (c.sandals) {
    const sh = new THREE.Group();
    for (const k of [0, 1]) {
      const s = put(mesh(box(0.14, 0.03, 0.25), '#7A4A28'), 0, -0.12 - k * 0.03, 0.02 + k * 0.03, sh);
      s.rotation.x = 1.3;
      const st = put(mesh(box(0.15, 0.035, 0.045), '#2F6DB5'), 0, -0.1 - k * 0.03, 0.06 + k * 0.03, sh);
      st.rotation.x = 1.3;
    }
    sh.visible = false;
    P.handL.add(sh);
    P.sandalsHand = sh;
  }
  return P;
}

// ---------- Small held props ----------
export function createBook() {
  const g = new THREE.Group();
  put(mesh(box(0.28, 0.36, 0.05), '#C0392B'), 0, 0, 0, g);
  put(mesh(box(0.26, 0.34, 0.04), '#FBF4E2', false), 0, 0, 0.012, g);
  put(mesh(box(0.02, 0.36, 0.055), '#7E2219', false), 0, 0, 0, g);
  return g;
}

export function createFirewood() {
  const g = new THREE.Group();
  const pole = mesh(cyl(0.03, 0.03, 2.1, 5), '#B08A4E');
  pole.rotation.x = Math.PI / 2;
  g.add(pole);
  for (const z of [-0.95, 0.95]) {
    stick(g, [0, 0, z], [0, -0.42, z - 0.08], 0.01, '#5A4630', 3);
    stick(g, [0, 0, z], [0, -0.42, z + 0.08], 0.01, '#5A4630', 3);
    const b = put(new THREE.Group(), 0, -0.52, z, g);
    for (let i = 0; i < 7; i++) {
      const s = mesh(cyl(0.045, 0.045, 0.75, 5), i % 2 ? '#8B5E34' : '#7A5130');
      s.rotation.z = Math.PI / 2 + (i % 3 - 1) * 0.06;
      s.position.set((i % 2) * 0.05 - 0.02, ((i % 3) - 1) * 0.08, (Math.floor(i / 3) - 1) * 0.08);
      b.add(s);
    }
    for (const x of [-0.22, 0.22]) put(mesh(box(0.05, 0.26, 0.26), '#C9A15A', false), x, 0, 0, b);
  }
  return g;
}

export function createRag() {
  const g = new THREE.Group();
  put(mesh(box(0.18, 0.08, 0.12), '#F2F2F2'), 0, -0.05, 0.03, g);
  return g;
}

// ---------- Fauna ----------
export function createBuffalo() {
  const g = new THREE.Group();
  const C = '#4E5357';
  const D = '#3A3E41';
  put(mesh(box(2.6, 0.9, 1.05), C), 0, 0.9, 0, g);
  put(mesh(box(1.0, 0.25, 0.95), C), -0.6, 1.4, 0, g); // bướu vai (dưới đỉnh platform 1.35 => chỉ trang trí)
  for (const x of [-0.95, 0.95]) for (const z of [-0.35, 0.35]) put(mesh(cyl(0.12, 0.1, 0.5), D), x, 0.25, z, g);
  const head = put(new THREE.Group(), -1.35, 1.0, 0, g);
  put(mesh(box(0.7, 0.55, 0.55), C), -0.2, -0.1, 0, head);
  put(mesh(box(0.32, 0.32, 0.46), '#6C7174'), -0.55, -0.22, 0, head);
  for (const s of [-1, 1]) {
    put(mesh(box(0.06, 0.06, 0.02), '#111'), -0.32, 0.03, s * 0.28, head);
    put(mesh(box(0.1, 0.18, 0.06), C), -0.05, 0.05, s * 0.33, head).rotation.x = s * 0.5;
  }
  const horn = put(mesh(new THREE.TorusGeometry(0.36, 0.055, 5, 10, Math.PI), '#DDD5C0'), -0.15, 0.15, 0, head);
  horn.rotation.y = Math.PI / 2;
  const tail = put(new THREE.Group(), 1.3, 1.2, 0, g);
  put(mesh(cyl(0.03, 0.03, 0.7, 4), D), 0, -0.35, 0, tail);
  put(mesh(ico(0.07, 0), '#222'), 0, -0.72, 0, tail);
  g.userData.head = head;
  g.userData.tail = tail;
  return g;
}

export function createEgret(r = Math.random) {
  const g = new THREE.Group();
  put(mesh(ico(0.16, 0), '#FAFAF5'), 0, 0.55, 0, g).scale.set(1.5, 0.9, 0.9);
  stick(g, [0.15, 0.6, 0], [0.32, 0.95, 0], 0.035, '#FAFAF5', 4);
  put(mesh(ico(0.07, 0), '#FAFAF5'), 0.34, 0.98, 0, g);
  put(mesh(cone(0.025, 0.18, 4), '#E7B23A'), 0.47, 0.97, 0, g).rotation.z = -Math.PI / 2;
  stick(g, [0, 0.45, 0.04], [0, 0, 0.04], 0.015, '#333', 3);
  stick(g, [0, 0.45, -0.04], [0, 0, -0.04], 0.015, '#333', 3);
  g.rotation.y = r() * Math.PI * 2;
  return g;
}

export function createTiger() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const O = '#F28C28';
  const K = '#1E1A17';
  const W = '#FFF6E8';
  put(mesh(box(1.7, 0.72, 0.8), O), 0, 0.88, 0, body);
  put(mesh(box(1.5, 0.18, 0.72), W), 0, 0.54, 0, body);
  for (const x of [-0.6, -0.2, 0.2, 0.55]) put(mesh(box(0.13, 0.74, 0.82), K), x, 0.9, 0, body);
  const head = put(new THREE.Group(), 1.05, 1.15, 0, body);
  put(mesh(box(0.72, 0.64, 0.74), O), 0, 0, 0, head);
  put(mesh(box(0.3, 0.26, 0.52), W), 0.4, -0.15, 0, head);
  put(mesh(box(0.1, 0.09, 0.16), '#E8707E'), 0.56, -0.04, 0, head);
  const mouth = put(mesh(box(0.22, 0.12, 0.4), '#7A1F25'), 0.42, -0.33, 0, head);
  mouth.visible = false;
  for (const s of [-1, 1]) {
    const eye = put(mesh(ico(0.14, 1), '#FFFFFF'), 0.22, 0.1, s * 0.33, head);
    eye.scale.z = 0.6;
    put(mesh(ico(0.065, 0), '#111'), 0.27, 0.07, s * 0.4, head);
    put(mesh(box(0.18, 0.2, 0.12), O), -0.12, 0.4, s * 0.25, head);
    put(mesh(box(0.1, 0.12, 0.13), K), -0.12, 0.38, s * 0.25, head);
    for (const k of [-1, 1]) put(mesh(box(0.3, 0.015, 0.015), K, false), 0.5, -0.1 + k * 0.05, s * 0.27, head).rotation.y = s * 0.4;
  }
  for (const x of [-0.1, 0.1]) put(mesh(box(0.06, 0.05, 0.6), K, false), x, 0.32, 0, head);
  const legs = [];
  for (const x of [-0.6, 0.6]) for (const z of [-0.27, 0.27]) {
    const p = put(new THREE.Group(), x, 0.6, z, body);
    put(mesh(cyl(0.13, 0.12, 0.5), O), 0, -0.25, 0, p);
    put(mesh(box(0.22, 0.1, 0.24), K), 0.04, -0.52, 0, p);
    legs.push(p);
  }
  const tail = put(new THREE.Group(), -0.85, 1.05, 0, body);
  let prev = tail;
  for (let i = 0; i < 4; i++) {
    const seg = put(new THREE.Group(), 0, 0, 0, prev);
    if (i > 0) seg.position.y = 0.26;
    const m = put(mesh(cyl(0.06, 0.06, 0.28, 5), i % 2 ? K : O), 0, 0.13, 0, seg);
    m.castShadow = true;
    seg.rotation.z = i === 0 ? 0.9 : -0.25;
    prev = seg;
  }
  return { root, body, head, legs, tail, mouth };
}

// ---------- Flora ----------
export function createBamboo(r = Math.random, n = 7) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const h = 5 + r() * 4;
    const rad = 0.06 + r() * 0.04;
    const piv = put(new THREE.Group(), (r() - 0.5) * 1.0, 0, (r() - 0.5) * 1.0, g);
    piv.rotation.z = (r() - 0.5) * 0.5;
    piv.rotation.x = (r() - 0.5) * 0.4;
    put(mesh(new THREE.CylinderGeometry(rad * 0.6, rad, h, 5, 4), i % 2 ? '#6E8B2F' : '#7E9B35'), 0, h / 2, 0, piv);
    // ngọn nghiêng
    const tip = put(new THREE.Group(), 0, h, 0, piv);
    tip.rotation.z = (r() > 0.5 ? 1 : -1) * (0.4 + r() * 0.4);
    put(mesh(cyl(rad * 0.3, rad * 0.6, 1.6, 4), '#7E9B35'), 0, 0.8, 0, tip);
    for (let k = 0; k < 5; k++) {
      const leaf = put(mesh(ico(0.45, 0), k % 2 ? '#9DBF4A' : '#86AE3A'), (r() - 0.5) * 0.9, -1.2 + k * 0.6 + r() * 0.3, (r() - 0.5) * 0.9, k < 3 ? piv : tip);
      if (k < 3) leaf.position.y += h - 0.4;
      leaf.scale.set(1.2, 0.45, 0.8);
      leaf.rotation.set(r() * 3, r() * 3, r() * 3);
    }
  }
  g.userData.sway = r() * 6;
  return g;
}

/** Ruộng lúa: InstancedMesh + shader lắc theo gió. */
export function createRice(points, uTime) {
  const geo = new THREE.ConeGeometry(0.15, 1, 4, 1);
  geo.translate(0, 0.5, 0);
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader =
      'uniform float uTime;\n' +
      sh.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        #else
          vec3 ip = vec3(0.0);
        #endif
        float sway = sin(uTime * 1.7 + ip.x * 0.31 + ip.z * 0.47) * 0.5 + sin(uTime * 2.9 + ip.x * 0.9) * 0.2;
        transformed.x += sway * 0.22 * position.y;
        transformed.z += cos(uTime * 1.3 + ip.x * 0.2) * 0.06 * position.y;`,
      );
  };
  const im = new THREE.InstancedMesh(geo, material, points.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const col = new THREE.Color();
  points.forEach((pt, i) => {
    p.set(pt.x, pt.y, pt.z);
    q.setFromAxisAngle(UP, pt.rot);
    s.set(pt.s, pt.h, pt.s);
    m4.compose(p, q, s);
    im.setMatrixAt(i, m4);
    col.set(pt.color);
    im.setColorAt(i, col);
  });
  im.receiveShadow = true;
  im.frustumCulled = false;
  return im;
}

export function createTree(r = Math.random, { trunk = '#6B4A2B', leaves = ['#4F8A3B', '#5E9A45', '#6BA34A'], h = 2.4, size = 1.3 } = {}) {
  const g = new THREE.Group();
  const th = h * (0.8 + r() * 0.4);
  put(mesh(cyl(0.12, 0.18, th, 5), trunk), 0, th / 2, 0, g);
  const n = 2 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const s = size * (0.7 + r() * 0.5);
    const c = put(mesh(ico(s, 0), leaves[i % leaves.length]), (r() - 0.5) * size, th + r() * 0.6 * size - 0.1, (r() - 0.5) * size * 0.8, g);
    c.rotation.set(r() * 3, r() * 3, 0);
  }
  return g;
}

export function createPine(r = Math.random, h = 4) {
  const g = new THREE.Group();
  const hh = h * (0.8 + r() * 0.5);
  put(mesh(cyl(0.1, 0.16, hh * 0.45, 5), '#5C3D24'), 0, hh * 0.22, 0, g);
  for (let i = 0; i < 3; i++) {
    const s = 1.3 - i * 0.32;
    put(mesh(cone(s, hh * 0.38, 7), i % 2 ? '#2F6B3A' : '#3A7A45'), 0, hh * (0.4 + i * 0.2), 0, g);
  }
  return g;
}

export function createEucalyptus(r = Math.random) {
  const g = new THREE.Group();
  const h = 5 + r() * 2.5;
  put(mesh(cyl(0.08, 0.14, h, 5), '#D8D2C2'), 0, h / 2, 0, g);
  for (let i = 0; i < 3; i++) {
    const c = put(mesh(ico(0.7 + r() * 0.3, 0), i % 2 ? '#7FA35A' : '#6E9450'), (r() - 0.5) * 0.8, h - 0.4 + i * 0.5, (r() - 0.5) * 0.6, g);
    c.scale.set(0.8, 1.4, 0.8);
  }
  return g;
}

export function createBanana(r = Math.random) {
  const g = new THREE.Group();
  const h = 1.8 + r() * 0.6;
  put(mesh(cyl(0.11, 0.15, h, 6), '#8BA24A'), 0, h / 2, 0, g);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const piv = put(new THREE.Group(), 0, h, 0, g);
    piv.rotation.y = (i / n) * Math.PI * 2 + r();
    const leaf = put(mesh(box(1.5, 0.04, 0.42), i % 2 ? '#5E9E3A' : '#6DB043'), 0.7, 0.1, 0, piv);
    leaf.rotation.z = -0.35 - r() * 0.4;
  }
  return g;
}

/** Dừa nước: lá mọc thẳng từ nước, không có thân. */
export function createNipa(r = Math.random) {
  const g = new THREE.Group();
  const n = 7;
  for (let i = 0; i < n; i++) {
    const piv = put(new THREE.Group(), 0, 0, 0, g);
    piv.rotation.y = (i / n) * Math.PI * 2 + r() * 0.5;
    const tilt = put(new THREE.Group(), 0, 0, 0, piv);
    tilt.rotation.z = 0.25 + r() * 0.45;
    const len = 2.4 + r() * 1.2;
    put(mesh(box(0.08, len, 0.38), i % 2 ? '#4E8A3A' : '#6FA84A'), 0, len / 2, 0, tilt);
  }
  return g;
}

export function createPhuong(r = Math.random) {
  const g = new THREE.Group();
  put(mesh(cyl(0.18, 0.28, 2.6, 6), '#6B4A2B'), 0, 1.3, 0, g);
  const cols = ['#E8452C', '#F0643A', '#D93A23', '#5E9A45', '#E8452C'];
  for (let i = 0; i < 6; i++) {
    const c = put(mesh(ico(1.1 + r() * 0.4, 0), cols[i % cols.length]), (r() - 0.5) * 2.4, 2.9 + r() * 0.8, (r() - 0.5) * 1.6, g);
    c.scale.set(1.3, 0.6, 1.0);
    c.rotation.y = r() * 3;
  }
  return g;
}

export function createWaterHyacinth(r = Math.random) {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) put(mesh(ico(0.25, 0), '#4F9A3C'), (r() - 0.5) * 0.6, 0.05, (r() - 0.5) * 0.6, g).scale.set(1, 0.4, 1);
  put(mesh(ico(0.1, 0), '#A57AD6'), 0, 0.22, 0, g);
  return g;
}

export function createRock(w = 1, h = 1, d = 1, color = '#8A8A85') {
  const g = new THREE.Group();
  const m = put(mesh(new THREE.DodecahedronGeometry(0.5, 0), color), 0, 0, 0, g);
  m.scale.set(w, h, d);
  return g;
}

// ---------- Buildings / village ----------
function prism(w, h, d, color) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(0, h);
  s.lineTo(-w / 2, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  return mesh(geo, color);
}

export function createHut() {
  const g = new THREE.Group();
  put(mesh(box(4, 1.8, 3), '#C9A46A'), 0, 0.9, 0, g);
  const roof = put(prism(3.8, 1.8, 5.2, '#B8954A'), 0, 1.75, 0, g);
  roof.rotation.y = Math.PI / 2;
  put(mesh(box(0.8, 1.3, 0.05), '#4A3320'), 0.6, 0.65, 1.52, g);
  put(mesh(box(0.7, 0.5, 0.05), '#3A2818'), -1.0, 1.0, 1.52, g);
  put(mesh(cyl(0.6, 0.7, 0.9, 8), '#6E5A44'), 2.4, 0.45, 1.0, g); // lu nước
  return g;
}

export function createLoudspeaker() {
  const g = new THREE.Group();
  put(mesh(cyl(0.07, 0.1, 6, 6), '#8C8C8C'), 0, 3, 0, g);
  put(mesh(box(1.4, 0.08, 0.08), '#777'), 0, 5.6, 0, g);
  for (const s of [-1, 1]) {
    const horn = put(mesh(new THREE.ConeGeometry(0.38, 0.8, 10, 1, true), '#A7ADB2'), s * 0.5, 5.4, 0.1, g);
    horn.rotation.z = s * -Math.PI / 2 + s * 0.3;
    horn.rotation.y = 0.5;
    horn.material = mat('#A7ADB2', { side: THREE.DoubleSide });
  }
  return g;
}

export function createSignpost(title, sub) {
  const g = new THREE.Group();
  put(mesh(cyl(0.06, 0.07, 1.9, 5), '#6B4A2B'), 0, 0.95, 0, g);
  const lines = sub ? [{ text: title, size: 54 }, { text: sub, size: 34, color: '#E8D7B0' }] : [{ text: title, size: 64 }];
  const tex = textTexture(lines, { w: 512, h: 160, bg: '#7A4A28', border: '#4A2C16' });
  const board = put(new THREE.Mesh(box(1.9, 0.6, 0.06), [mat('#5A3519'), mat('#5A3519'), mat('#5A3519'), mat('#5A3519'), new THREE.MeshLambertMaterial({ map: tex }), mat('#5A3519')]), 0, 1.65, 0.04, g);
  board.castShadow = true;
  return g;
}

export function createScarecrow() {
  const g = new THREE.Group();
  put(mesh(cyl(0.05, 0.05, 2.2, 4), '#7A5A3A'), 0, 1.1, 0, g);
  put(mesh(cyl(0.04, 0.04, 1.6, 4), '#7A5A3A'), 0, 1.6, 0, g).rotation.z = Math.PI / 2;
  put(mesh(box(0.5, 0.6, 0.25), '#6B7FA8'), 0, 1.55, 0, g);
  put(mesh(ico(0.2, 0), '#D9C38E'), 0, 2.05, 0, g);
  put(mesh(cone(0.42, 0.25, 12), '#E8D29A'), 0, 2.3, 0, g);
  return g;
}

export function createSchoolGate(text) {
  const g = new THREE.Group();
  for (const x of [-4.2, 4.2]) {
    put(mesh(box(0.7, 3.4, 0.7), '#F2D16B'), x, 1.7, 0, g);
    put(mesh(box(0.85, 0.3, 0.85), '#C4472B'), x, 3.55, 0, g);
  }
  const tex = textTexture([{ text: text, size: 64 }], { w: 1024, h: 140, bg: '#1F4E9A', fg: '#FFF8E0', border: '#F2D16B', borderW: 12 });
  const plain = mat('#C4472B');
  const board = put(new THREE.Mesh(box(9.2, 1.1, 0.25), [plain, plain, plain, plain, new THREE.MeshLambertMaterial({ map: tex }), plain]), 0, 3.85, 0, g);
  board.castShadow = true;
  return g;
}

function flagTexture() {
  const c = document.createElement('canvas');
  c.width = 300;
  c.height = 200;
  const g = c.getContext('2d');
  g.fillStyle = '#DA251D';
  g.fillRect(0, 0, 300, 200);
  g.fillStyle = '#FFDD00';
  g.beginPath();
  const cx = 150;
  const cy = 100;
  const R = 62;
  const r = R * 0.382;
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r : R;
    g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createFlagPole() {
  const g = new THREE.Group();
  put(mesh(box(1.4, 0.4, 1.4), '#BDB6A8'), 0, 0.2, 0, g);
  put(mesh(cyl(0.06, 0.08, 8.5, 8), '#E8E8E8'), 0, 4.45, 0, g);
  put(mesh(ico(0.14, 1), '#F2D16B'), 0, 8.8, 0, g);
  const geo = new THREE.PlaneGeometry(2.6, 1.73, 14, 5);
  geo.translate(1.3, 0, 0);
  const base = Float32Array.from(geo.attributes.position.array);
  const flag = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: flagTexture(), side: THREE.DoubleSide }));
  flag.castShadow = true;
  flag.position.set(0.05, 7.6, 0);
  g.add(flag);
  const pos = geo.attributes.position;
  return {
    group: g,
    update(t) {
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3];
        const y = base[i * 3 + 1];
        const k = x / 2.6;
        pos.setZ(i, Math.sin(x * 2.4 - t * 5.5) * 0.18 * k);
        pos.setY(i, y + Math.sin(x * 1.7 - t * 4) * 0.05 * k);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    },
  };
}

export function createDrum() {
  const g = new THREE.Group();
  stick(g, [-0.9, 0, 0], [-0.9, 1.9, 0], 0.06, '#5A3519');
  stick(g, [0.9, 0, 0], [0.9, 1.9, 0], 0.06, '#5A3519');
  stick(g, [-1.0, 1.9, 0], [1.0, 1.9, 0], 0.07, '#5A3519');
  const drum = put(new THREE.Group(), 0, 1.25, 0, g);
  const body = mesh(cyl(0.55, 0.55, 0.9, 14), '#A8322A');
  body.rotation.z = Math.PI / 2;
  drum.add(body);
  for (const x of [-0.46, 0.46]) {
    const skin = mesh(cyl(0.56, 0.56, 0.04, 14), '#E9D6A8');
    skin.rotation.z = Math.PI / 2;
    skin.position.x = x;
    drum.add(skin);
  }
  stick(g, [-0.3, 1.8, 0], [-0.3, 1.25, 0], 0.012, '#333', 3);
  stick(g, [0.3, 1.8, 0], [0.3, 1.25, 0], 0.012, '#333', 3);
  stick(g, [0.75, 0.5, 0.3], [0.5, 1.0, 0.5], 0.035, '#C9A15A', 4); // dùi trống
  return g;
}

export function createSchoolBuilding() {
  const g = new THREE.Group();
  const W = 30;
  put(mesh(box(W, 0.4, 7), '#BDB6A8'), 0, 0.2, 0, g);
  put(mesh(box(W, 3.2, 4.6), '#F2D16B'), 0, 2.0, -0.9, g);
  const roof = put(prism(7.2, 2.0, W + 1, '#C4472B'), 0, 3.6, -0.5, g);
  roof.rotation.y = Math.PI / 2;
  // ridge lines (ngói)
  for (let i = -W / 2; i <= W / 2; i += 1.2) put(mesh(box(0.05, 0.05, 7.2), '#A83A22', false), i, 3.62, -0.5, g);
  // porch columns
  for (let x = -W / 2 + 1; x <= W / 2 - 1; x += 4) put(mesh(box(0.3, 3.2, 0.3), '#F7E3A0'), x, 2.0, 2.9, g);
  // doors & windows
  for (let x = -W / 2 + 3; x < W / 2 - 1; x += 6) {
    put(mesh(box(1.2, 2.2, 0.05), '#2E6B5A'), x, 1.5, 1.42, g);
    for (const dx of [-2, 2]) {
      put(mesh(box(1.4, 1.0, 0.05), '#3A5E7A'), x + dx, 2.1, 1.42, g);
      for (let b = -0.5; b <= 0.5; b += 0.25) put(mesh(box(0.03, 1.0, 0.03), '#333', false), x + dx + b, 2.1, 1.46, g);
    }
  }
  return g;
}

export function createChalkboard() {
  const g = new THREE.Group();
  stick(g, [-0.7, 0, -0.2], [-0.55, 1.9, 0], 0.04, '#6B4A2B');
  stick(g, [0.7, 0, -0.2], [0.55, 1.9, 0], 0.04, '#6B4A2B');
  const b = put(mesh(box(1.5, 1.0, 0.06), '#22433A'), 0, 1.3, 0.02, g);
  b.rotation.x = -0.08;
  put(mesh(box(1.6, 0.08, 0.1), '#8B6B3E'), 0, 0.78, 0.04, g);
  return g;
}

export function createLog() {
  const geo = new THREE.CylinderGeometry(0.28, 0.28, 1.9, 7);
  const m = new THREE.Mesh(geo, [mat('#6B4423'), mat('#C89B6A'), mat('#C89B6A')]);
  m.rotation.x = Math.PI / 2;
  m.castShadow = true;
  const g = new THREE.Group();
  g.add(m);
  put(mesh(cyl(0.05, 0.05, 0.5, 4), '#6B4423'), 0.1, 0.25, 0.4, g).rotation.z = -0.8; // cành nhỏ
  return g;
}

export function createCloud(r = Math.random) {
  const g = new THREE.Group();
  const m = new THREE.MeshLambertMaterial({ color: '#FFFFFF', flatShading: true, emissive: '#FFF3EA', emissiveIntensity: 0.4 });
  m.userData.shared = false;
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(ico(3 + r() * 2.5, 0), m);
    c.position.set(i * 3.5 - 5, r() * 1.5, r() * 2);
    c.scale.y = 0.55;
    g.add(c);
  }
  return g;
}

/** Monkey bridge: trả về các mảnh để level animate lúc gãy. */
export function createMonkeyBridge({ x0, x1, yFn, gapA, gapB, legXs, bottom, railZ = -0.42, railH = 0.95 }) {
  const POLE = '#B6A15A';
  const RAIL = '#8FA845';
  const LEG = '#6E8B2F';
  const g = new THREE.Group();
  const ry = (x) => yFn(x) + railH;
  const addPole = (group, xa, xb, fn, z, r, color, ox, oy) => {
    const n = Math.max(1, Math.ceil((xb - xa) / 1.0));
    for (let i = 0; i < n; i++) {
      const a = xa + ((xb - xa) * i) / n;
      const b = xa + ((xb - xa) * (i + 1)) / n;
      stick(group, [a - ox, fn(a) - r - oy, z], [b - ox, fn(b) - r - oy, z], r, color, 5);
    }
  };
  const left = new THREE.Group();
  const right = new THREE.Group();
  const cx = (gapA + gapB) / 2;
  const mid = put(new THREE.Group(), cx, yFn(cx), 0, g);
  g.add(left, right);
  addPole(left, x0, gapA, yFn, 0, 0.09, POLE, 0, 0);
  addPole(mid, gapA + 0.05, gapB - 0.05, yFn, 0, 0.09, POLE, cx, yFn(cx));
  addPole(right, gapB, x1, yFn, 0, 0.09, POLE, 0, 0);

  const ra = x0 + 2;
  const rb = x1 - 2;
  const brkL = gapA - 6;
  const brkR = gapB + 6;
  const railStaticL = new THREE.Group();
  const railStaticR = new THREE.Group();
  g.add(railStaticL, railStaticR);
  addPole(railStaticL, ra, brkL, ry, railZ, 0.05, RAIL, 0, 0);
  addPole(railStaticR, brkR, rb, ry, railZ, 0.05, RAIL, 0, 0);
  const railBreakL = put(new THREE.Group(), brkL, ry(brkL), railZ, g);
  addPole(railBreakL, brkL, gapA, ry, 0, 0.05, RAIL, brkL, ry(brkL));
  const railBreakR = put(new THREE.Group(), brkR, ry(brkR), railZ, g);
  addPole(railBreakR, gapB, brkR, ry, 0, 0.05, RAIL, brkR, ry(brkR));
  const railMid = put(new THREE.Group(), cx, ry(cx), railZ, mid);
  railMid.position.set(0, railH, railZ);
  addPole(railMid, gapA, gapB, ry, 0, 0.05, RAIL, cx, ry(cx));

  // posts
  for (let x = ra; x <= rb; x += 6.5) {
    if (x > gapA - 1.5 && x < gapB + 1.5) continue;
    stick(g, [x, yFn(x) - 0.1, railZ], [x, ry(x) + 0.05, railZ], 0.035, LEG, 4);
  }
  // chân cầu bắt chéo chữ X
  for (const lx of legXs) {
    const y = yFn(lx);
    stick(g, [lx - 1.1, bottom, -0.32], [lx + 0.4, y + 0.45, -0.32], 0.06, LEG);
    stick(g, [lx + 1.1, bottom, -0.32], [lx - 0.4, y + 0.45, -0.32], 0.06, LEG);
    put(mesh(box(0.18, 0.12, 0.18), '#4A3A22'), lx, y - 0.12, -0.32, g);
  }
  // end posts on banks
  for (const ex of [x0 + 0.3, x1 - 0.3]) stick(g, [ex, -0.3, 0.25], [ex, yFn(ex) + 0.4, 0.25], 0.06, LEG);
  return { group: g, mid, railMid, railBreakL, railBreakR };
}

// ---------- Background ----------
export function createDistantHills(z, color, base, amp, seed) {
  const r = makeRng(seed);
  const s = new THREE.Shape();
  const x0 = -300;
  const x1 = 950;
  s.moveTo(x0, -20);
  const ph = [r() * 6, r() * 6, r() * 6];
  for (let x = x0; x <= x1; x += 12) {
    const y = base + amp * (0.55 * Math.sin(x * 0.012 + ph[0]) + 0.3 * Math.sin(x * 0.031 + ph[1]) + 0.15 * Math.sin(x * 0.07 + ph[2]));
    s.lineTo(x, y);
  }
  s.lineTo(x1, -20);
  s.lineTo(x0, -20);
  const geo = new THREE.ShapeGeometry(s);
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color, flatShading: true }));
  m.position.z = z;
  return m;
}
