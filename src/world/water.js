import * as THREE from 'three';

/**
 * Khối nước kiểu diorama (box trong suốt) — mặt trên gợn sóng, mực nước chỉnh được.
 * Gốc của box ở (x0, bottom, z0).
 */
export function createWaterBox({ x0, x1, z0, z1, bottom, level, color, opacity = 0.78, segX = 48, wave = 0.05 }) {
  const w = x1 - x0;
  const d = z1 - z0;
  const geo = new THREE.BoxGeometry(w, 1, d, segX, 1, 4);
  geo.translate(w / 2, 0.5, d / 2);
  const pos = geo.attributes.position;
  const base = Float32Array.from(pos.array);
  const material = new THREE.MeshLambertMaterial({ color, transparent: true, opacity, flatShading: true, depthWrite: false });
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x0, bottom, z0);
  mesh.receiveShadow = true;
  mesh.renderOrder = 2;
  let h = Math.max(0.01, level - bottom);
  mesh.scale.y = h;
  const tmpColor = new THREE.Color();

  return {
    mesh,
    material,
    get level() {
      return bottom + h;
    },
    setLevel(y) {
      h = Math.max(0.01, y - bottom);
      mesh.scale.y = h;
    },
    setColor(c) {
      material.color.set(c);
    },
    lerpColor(a, b, k) {
      tmpColor.set(a).lerp(new THREE.Color(b), k);
      material.color.copy(tmpColor);
    },
    update(t) {
      for (let i = 0; i < pos.count; i++) {
        if (base[i * 3 + 1] > 0.99) {
          const x = base[i * 3] + x0;
          const z = base[i * 3 + 2];
          pos.setY(i, 1 + (Math.sin(t * 2.1 + x * 0.8 + z * 1.3) * wave + Math.sin(t * 1.3 - x * 0.35) * wave * 0.6) / h);
        }
      }
      pos.needsUpdate = true;
    },
  };
}
