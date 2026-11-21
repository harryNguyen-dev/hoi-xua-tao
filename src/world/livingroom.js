// Phòng khách hiện tại: sofa gỗ, TV, ghế mây, quạt trần, lịch bloc, phích nước. Camera tĩnh.
import * as THREE from 'three';
import { mat, mesh, box, cyl, ico, put, stick, createKid, textTexture } from './props.js';

function tileTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#E9DCC0';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#B5533C';
  for (const [x, y] of [
    [0, 0],
    [128, 0],
    [0, 128],
    [128, 128],
  ]) {
    g.beginPath();
    g.arc(x, y, 34, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#3E6E6A';
  g.beginPath();
  g.moveTo(64, 30);
  g.lineTo(98, 64);
  g.lineTo(64, 98);
  g.lineTo(30, 64);
  g.closePath();
  g.fill();
  g.fillStyle = '#E9DCC0';
  g.beginPath();
  g.arc(64, 64, 12, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.15)';
  g.lineWidth = 2;
  g.strokeRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(7, 4.5);
  return t;
}

function calendarTexture() {
  const d = new Date();
  const days = ['CHỦ NHẬT', 'THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY'];
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 340;
  const g = c.getContext('2d');
  g.fillStyle = '#FFFDF6';
  g.fillRect(0, 0, 256, 340);
  g.fillStyle = '#C62828';
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#FFF';
  g.textAlign = 'center';
  g.font = '800 30px "Be Vietnam Pro", Arial';
  g.fillText(`THÁNG ${d.getMonth() + 1} · ${d.getFullYear()}`, 128, 44);
  g.fillStyle = d.getDay() === 0 ? '#C62828' : '#1F3A68';
  g.font = '900 150px "Be Vietnam Pro", Arial';
  g.fillText(String(d.getDate()), 128, 225);
  g.font = '800 30px "Be Vietnam Pro", Arial';
  g.fillText(days[d.getDay()], 128, 280);
  g.fillStyle = '#777';
  g.font = '600 18px "Be Vietnam Pro", Arial';
  g.fillText('Ngày tốt · Nên đi học', 128, 318);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function newspaperTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 180;
  const g = c.getContext('2d');
  g.fillStyle = '#EDE8DA';
  g.fillRect(0, 0, 256, 180);
  g.fillStyle = '#222';
  g.font = '900 34px "Be Vietnam Pro", Arial';
  g.fillText('BÁO SÁNG', 14, 40);
  g.fillStyle = '#555';
  for (let i = 0; i < 8; i++) g.fillRect(14, 58 + i * 14, i % 3 === 0 ? 110 : 228, 6);
  g.fillStyle = '#999';
  g.fillRect(140, 58, 102, 60);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildLivingRoom() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#3B2F2A');
  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
  const camBase = new THREE.Vector3(0.4, 2.75, 8.8);
  const lookAt = new THREE.Vector3(0.4, 1.5, 0);
  camera.position.copy(camBase);
  camera.lookAt(lookAt);

  scene.add(new THREE.HemisphereLight('#FFF1DC', '#5A4636', 1.15));
  const dir = new THREE.DirectionalLight('#FFE0B0', 1.5);
  dir.position.set(-5, 8, 6);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  Object.assign(dir.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 0.5, far: 30 });
  dir.shadow.bias = -0.0005;
  scene.add(dir);
  const tvLight = new THREE.PointLight('#8FB8FF', 2.2, 7, 1.5);
  tvLight.position.set(3.3, 1.6, -2.2);
  scene.add(tvLight);

  const g = new THREE.Group();
  scene.add(g);

  // sàn gạch bông + tường
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 9), new THREE.MeshLambertMaterial({ map: tileTexture() }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -0.5);
  floor.receiveShadow = true;
  g.add(floor);
  put(mesh(box(14, 6, 0.2), '#CFE0C3', false), 0, 3, -4, g);
  put(mesh(box(14, 0.25, 0.22), '#8C6A4A', false), 0, 0.125, -3.88, g);
  put(mesh(box(0.2, 6, 9), '#C2D6B6', false), -6.6, 3, -0.5, g);
  put(mesh(box(0.2, 6, 9), '#C2D6B6', false), 6.6, 3, -0.5, g);

  // cửa sổ song sắt + cửa chớp xanh
  put(mesh(box(2.4, 1.7, 0.1), '#6B4A2B', false), -3.6, 2.6, -3.86, g);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.5), new THREE.MeshBasicMaterial({ color: '#BFE6FF' }));
  glass.position.set(-3.6, 2.6, -3.79);
  g.add(glass);
  for (let i = 0; i < 7; i++) put(mesh(box(0.04, 1.5, 0.04), '#2E2E2E', false), -4.6 + i * 0.33, 2.6, -3.74, g);
  for (const s of [-1, 1]) {
    const sh = put(new THREE.Group(), -3.6 + s * 1.75, 2.6, -3.8, g);
    put(mesh(box(1.0, 1.75, 0.06), '#3E8E6A', false), 0, 0, 0, sh);
    for (let k = 0; k < 8; k++) put(mesh(box(0.9, 0.04, 0.05), '#2F6E52', false), 0, -0.75 + k * 0.21, 0.04, sh);
  }
  // lịch bloc
  const cal = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.13), new THREE.MeshLambertMaterial({ map: calendarTexture() }));
  cal.position.set(1.0, 2.8, -3.88);
  g.add(cal);
  put(mesh(box(1.0, 0.18, 0.06), '#C62828', false), 1.0, 3.42, -3.87, g);
  // đồng hồ treo tường
  const clock = put(new THREE.Group(), -0.9, 3.55, -3.86, g);
  const face = mesh(cyl(0.36, 0.36, 0.06, 20), '#FFFDF6', false);
  face.rotation.x = Math.PI / 2;
  clock.add(face);
  const rim = mesh(new THREE.TorusGeometry(0.37, 0.04, 6, 20), '#8C6A4A', false);
  clock.add(rim);
  const hourHand = put(mesh(box(0.04, 0.2, 0.02), '#222', false), 0, 0.09, 0.05, clock);
  const minHand = put(new THREE.Group(), 0, 0, 0.06, clock);
  put(mesh(box(0.03, 0.28, 0.02), '#222', false), 0, 0.13, 0, minHand);
  hourHand.rotation.z = -1.2;
  // bằng khen "Gia đình văn hóa"
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.55),
    new THREE.MeshLambertMaterial({ map: textTexture([{ text: 'GIA ĐÌNH VĂN HÓA', size: 46 }], { w: 512, h: 160, bg: '#B71C1C', fg: '#FFD54F', border: '#FFD54F', borderW: 8 }) }),
  );
  plaque.position.set(3.1, 3.55, -3.88);
  g.add(plaque);

  // tủ TV + TV
  put(mesh(box(2.4, 0.7, 0.7), '#6B3E22'), 3.4, 0.35, -3.3, g);
  for (const x of [2.8, 4.0]) put(mesh(box(0.5, 0.4, 0.02), '#7E4C2A', false), x, 0.35, -2.94, g);
  put(mesh(box(1.7, 1.05, 0.28), '#1A1A1A'), 3.4, 1.25, -3.35, g);
  const screenMat = new THREE.MeshBasicMaterial({ color: '#6FA3E8' });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.85), screenMat);
  screen.position.set(3.4, 1.25, -3.2);
  g.add(screen);
  put(mesh(box(0.5, 0.06, 0.3), '#222'), 3.4, 0.73, -3.35, g);

  // sofa gỗ
  const sofa = put(new THREE.Group(), -1.6, 0, -2.4, g);
  put(mesh(box(3.2, 0.42, 1.05), '#6B3E22'), 0, 0.3, 0, sofa);
  put(mesh(box(3.0, 0.16, 0.95), '#C0504D'), 0, 0.59, 0.02, sofa);
  put(mesh(box(3.2, 0.95, 0.16), '#6B3E22'), 0, 0.95, -0.46, sofa);
  put(mesh(box(2.9, 0.6, 0.12), '#C0504D'), 0, 0.98, -0.36, sofa);
  for (const s of [-1, 1]) put(mesh(box(0.18, 0.75, 1.05), '#5A3319'), s * 1.6, 0.6, 0, sofa);
  for (const x of [-1.45, 1.45]) for (const z of [-0.4, 0.4]) put(mesh(box(0.1, 0.12, 0.1), '#4A2A14'), x, 0.06, z, sofa);

  // con nằm lướt điện thoại
  const kid = createKid({ shirt: '#3E7CB1', pants: '#5A5A5A', shorts: true, scarf: false, bag: false, hat: false, sandals: false, buttons: false });
  kid.root.rotation.z = -Math.PI / 2;
  kid.root.position.set(-2.85, 0.96, -2.3);
  kid.armR.rotation.x = -1.35;
  kid.armR.rotation.z = -0.25;
  kid.armL.rotation.x = 0.2;
  const phone = put(new THREE.Group(), 0, -0.05, 0.05, kid.handR);
  put(mesh(box(0.1, 0.18, 0.02), '#111'), 0, 0, 0, phone);
  const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.085, 0.16), new THREE.MeshBasicMaterial({ color: '#9FD3FF' }));
  phoneScreen.position.z = -0.012;
  phoneScreen.rotation.y = Math.PI;
  phone.add(phoneScreen);
  phone.rotation.x = 1.4;
  kid.head.rotation.x = 0.0;
  sofa.add(kid.root);
  kid.root.position.set(-1.25, 0.94, 0.05);
  kid.root.traverse((o) => o.isMesh && (o.castShadow = true));

  // bàn trà + bình trà + phích
  const table = put(new THREE.Group(), -1.4, 0, -0.4, g);
  put(mesh(box(1.7, 0.08, 0.85), '#7A4A28'), 0, 0.45, 0, table);
  for (const x of [-0.75, 0.75]) for (const z of [-0.35, 0.35]) put(mesh(box(0.08, 0.42, 0.08), '#5A3319'), x, 0.21, z, table);
  put(mesh(ico(0.16, 1), '#F4F1E8'), -0.2, 0.62, 0, table);
  stick(table, [-0.05, 0.62, 0], [0.08, 0.72, 0], 0.025, '#F4F1E8', 4);
  put(mesh(cyl(0.06, 0.06, 0.03, 8), '#3E6E6A'), -0.2, 0.78, 0, table);
  for (const [x, z] of [
    [0.15, 0.2],
    [0.3, -0.05],
    [0.05, -0.2],
  ])
    put(mesh(cyl(0.05, 0.04, 0.07, 8), '#F4F1E8'), x, 0.53, z, table);
  put(mesh(cyl(0.1, 0.1, 0.55, 10), '#D84339'), 0.6, 0.76, 0.1, table); // phích nước
  put(mesh(cyl(0.07, 0.1, 0.1, 10), '#C9C9C9'), 0.6, 1.08, 0.1, table);

  // ghế mây + bố đọc báo
  const chair = put(new THREE.Group(), 2.0, 0, -1.5, g);
  chair.rotation.y = -0.45;
  const RAT = '#C9A26B';
  put(mesh(box(1.0, 0.12, 0.95), RAT), 0, 0.5, 0, chair);
  const back = put(mesh(box(1.0, 1.1, 0.1), RAT), 0, 1.05, -0.46, chair);
  back.rotation.x = -0.15;
  for (let k = 0; k < 5; k++) put(mesh(box(1.02, 0.03, 0.12), '#A8834F', false), 0, 0.62 + k * 0.2, -0.47 + k * 0.03, chair);
  for (const s of [-1, 1]) {
    put(mesh(box(0.1, 0.35, 0.9), RAT), s * 0.5, 0.72, 0, chair);
    for (const z of [-0.4, 0.4]) put(mesh(cyl(0.04, 0.04, 0.5, 5), '#A8834F'), s * 0.45, 0.25, z, chair);
  }
  const dad = createKid({ shirt: '#F4F4F4', sleeve: '#E8B48A', skin: '#E8B48A', pants: '#4B5D6E', shorts: true, scarf: false, bag: false, hat: false, mustache: true, glasses: true, belly: true, hair: '#2A2A2A' });
  dad.root.scale.setScalar(1.32);
  dad.root.position.set(0, 0.58 - 0.62 * 1.32 + 0.05, 0.02);
  dad.legL.rotation.x = -1.45;
  dad.legR.rotation.x = -1.45;
  dad.armL.rotation.x = -1.25;
  dad.armR.rotation.x = -1.25;
  dad.armL.rotation.z = -0.25;
  dad.armR.rotation.z = 0.25;
  chair.add(dad.root);
  dad.root.traverse((o) => o.isMesh && (o.castShadow = true));
  const paper = put(new THREE.Group(), 0, 1.05, 0.5, dad.body);
  const paperTex = newspaperTexture();
  const pMat = new THREE.MeshLambertMaterial({ map: paperTex, side: THREE.DoubleSide });
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), pMat);
  pl.position.x = -0.24;
  pl.rotation.y = 0.25;
  const pr = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), pMat);
  pr.position.x = 0.24;
  pr.rotation.y = -0.25;
  paper.add(pl, pr);

  // quạt trần
  const fan = put(new THREE.Group(), 0.2, 4.55, -0.8, g);
  put(mesh(cyl(0.03, 0.03, 0.8, 5), '#888'), 0, 0.4, 0, fan);
  put(mesh(cyl(0.2, 0.25, 0.18, 10), '#E8E2D0'), 0, 0, 0, fan);
  const blades = put(new THREE.Group(), 0, -0.05, 0, fan);
  for (let i = 0; i < 3; i++) {
    const piv = put(new THREE.Group(), 0, 0, 0, blades);
    piv.rotation.y = (i * Math.PI * 2) / 3;
    put(mesh(box(1.5, 0.03, 0.26), '#D9D2BE'), 0.85, 0, 0, piv).rotation.x = 0.12;
  }

  // cây kiểng góc phòng
  const pot = put(new THREE.Group(), -5.4, 0, -3.1, g);
  put(mesh(cyl(0.35, 0.28, 0.6, 8), '#B5533C'), 0, 0.3, 0, pot);
  for (let i = 0; i < 6; i++) {
    const l = put(mesh(ico(0.35, 0), i % 2 ? '#4F8A3B' : '#6BA34A'), Math.cos(i) * 0.25, 0.9 + (i % 3) * 0.3, Math.sin(i) * 0.25, pot);
    l.scale.set(0.7, 1.4, 0.7);
  }

  let speaker = null;
  let time = 0;
  return {
    scene,
    camera,
    setSpeaker(s) {
      speaker = s;
    },
    resize(aspect) {
      camera.aspect = aspect;
      // màn hình dọc: lùi camera để vẫn thấy cả bố và con
      const back = aspect < 1 ? (1 / aspect - 1) * 6 : 0;
      camera.position.set(camBase.x, camBase.y + back * 0.25, camBase.z + back);
      camera.lookAt(lookAt);
      camera.updateProjectionMatrix();
    },
    update(dt) {
      time += dt;
      blades.rotation.y += dt * 7;
      minHand.rotation.z -= dt * 0.05;
      screenMat.color.setHSL(0.58 + Math.sin(time * 3) * 0.04, 0.6, 0.6 + Math.sin(time * 11) * 0.05);
      tvLight.intensity = 2.0 + Math.sin(time * 11) * 0.3;
      const dadTalk = speaker === 'BO';
      const kidTalk = speaker === 'CON';
      // bố nói: hạ báo xuống cho thấy mặt; con nói: báo che mặt
      const py = dadTalk ? 0.78 : 1.12;
      paper.position.y += (py - paper.position.y) * Math.min(1, dt * 6);
      paper.rotation.x += ((dadTalk ? 0.6 : 0) - paper.rotation.x) * Math.min(1, dt * 6);
      dad.head.position.y = 1.38 + (dadTalk ? Math.abs(Math.sin(time * 9)) * 0.03 : 0);
      dad.head.rotation.z = dadTalk ? Math.sin(time * 3) * 0.08 : 0;
      dad.body.rotation.x = dadTalk ? Math.sin(time * 4.5) * 0.04 : 0;
      kid.head.rotation.x = kidTalk ? Math.sin(time * 9) * 0.1 : Math.sin(time * 0.7) * 0.03;
      kid.legL.rotation.x = 0.25 + Math.sin(time * 2.2) * (kidTalk ? 0.35 : 0.12);
      kid.legR.rotation.x = -0.15 - Math.sin(time * 2.2) * (kidTalk ? 0.35 : 0.12);
      phone.rotation.z = Math.sin(time * 1.3) * 0.08;
    },
  };
}
