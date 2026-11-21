import * as THREE from 'three';

/** Pool hạt đơn giản: bụi, nước bắn, khói "poof". */
export class Particles {
  constructor(scene, max = 220) {
    this.geo = new THREE.BoxGeometry(1, 1, 1);
    this.pool = [];
    this.active = [];
    for (let i = 0; i < max; i++) {
      const m = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false }));
      m.visible = false;
      m.renderOrder = 3;
      scene.add(m);
      this.pool.push(m);
    }
  }

  spawn({ x, y, z = 0, vx = 0, vy = 0, vz = 0, color = '#ffffff', size = 0.15, life = 0.6, gravity = 0, drag = 0, grow = 0, opacity = 0.9 }) {
    const m = this.pool.pop() || this.active.shift()?.m;
    if (!m) return;
    m.visible = true;
    m.position.set(x, y, z);
    m.material.color.set(color);
    m.material.opacity = opacity;
    m.scale.setScalar(size);
    m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    this.active.push({ m, vx, vy, vz, life, max: life, gravity, drag, grow, size, opacity });
  }

  burst(n, o) {
    for (let i = 0; i < n; i++) {
      const sp = o.spread ?? 2;
      this.spawn({
        ...o,
        x: o.x + (Math.random() - 0.5) * (o.jx ?? 0.4),
        y: o.y + (Math.random() - 0.5) * (o.jy ?? 0.1),
        z: (o.z ?? 0) + (Math.random() - 0.5) * (o.jz ?? 0.6),
        vx: (o.vx ?? 0) + (Math.random() - 0.5) * sp,
        vy: (o.vy ?? 0) + Math.random() * (o.up ?? sp),
        vz: (o.vz ?? 0) + (Math.random() - 0.5) * sp,
        size: (o.size ?? 0.15) * (0.6 + Math.random() * 0.8),
        life: (o.life ?? 0.6) * (0.7 + Math.random() * 0.6),
      });
    }
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.m.visible = false;
        this.active.splice(i, 1);
        this.pool.push(p.m);
        continue;
      }
      p.vy -= p.gravity * dt;
      const k = 1 - Math.min(1, p.drag * dt);
      p.vx *= k;
      p.vz *= k;
      p.m.position.x += p.vx * dt;
      p.m.position.y += p.vy * dt;
      p.m.position.z += p.vz * dt;
      const t = p.life / p.max;
      p.m.scale.setScalar(Math.max(0.001, p.size * (1 + p.grow * (1 - t)) * (0.4 + 0.6 * t)));
      p.m.material.opacity = p.opacity * Math.min(1, t * 2);
      p.m.rotation.x += dt * 3;
    }
  }

  dispose() {
    this.geo.dispose();
    for (const m of this.pool) m.material.dispose();
    for (const p of this.active) p.m.material.dispose();
  }
}
