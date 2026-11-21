import * as THREE from 'three';

const DAWN_TOP = new THREE.Color('#9C8BC9');
const DAWN_BOTTOM = new THREE.Color('#F7B3A1');
const DAY_TOP = new THREE.Color('#4E9BE0');
const DAY_BOTTOM = new THREE.Color('#A9D6F5');
const SUN_DAWN = new THREE.Color('#FFB27A');
const SUN_DAY = new THREE.Color('#FFF1D6');
const HEMI_DAWN = new THREE.Color('#F6DDE2');
const HEMI_DAY = new THREE.Color('#CFE8FF');

/** Bầu trời gradient + mặt trời mọc theo đồng hồ in-game (progress 0 → 1). */
export function createSky(scene) {
  const uniforms = {
    topColor: { value: DAWN_TOP.clone() },
    bottomColor: { value: DAWN_BOTTOM.clone() },
    offset: { value: 30 },
    exponent: { value: 0.65 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vW;
      void main() {
        float h = normalize(vW - cameraPosition + vec3(0.0, offset, 0.0)).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, pow(max(h, 0.0), exponent)), 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(700, 24, 12), material);
  dome.renderOrder = -10;
  scene.add(dome);

  const sunMat = new THREE.MeshBasicMaterial({ color: '#FFE2A0', fog: false });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(16, 20, 12), sunMat);
  const glowMat = new THREE.MeshBasicMaterial({ color: '#FFD08A', transparent: true, opacity: 0.25, fog: false, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(30, 20, 12), glowMat);
  sun.add(glow);
  scene.add(sun);

  const tmp = new THREE.Color();
  return {
    update(progress, camera, sunLight, hemi, fog) {
      const p = Math.min(1, Math.max(0, progress));
      uniforms.topColor.value.copy(DAWN_TOP).lerp(DAY_TOP, p);
      uniforms.bottomColor.value.copy(DAWN_BOTTOM).lerp(DAY_BOTTOM, p);
      dome.position.copy(camera.position);
      sun.position.set(camera.position.x + 90, -10 + p * 110, camera.position.z - 520);
      sunMat.color.copy(tmp.set('#FFC88A').lerp(new THREE.Color('#FFF6D8'), p));
      if (sunLight) {
        sunLight.color.copy(SUN_DAWN).lerp(SUN_DAY, p);
        sunLight.intensity = 1.9 + p * 0.8;
      }
      if (hemi) {
        hemi.color.copy(HEMI_DAWN).lerp(HEMI_DAY, p);
        hemi.intensity = 1.35 + p * 0.45;
      }
      if (fog) fog.color.copy(uniforms.bottomColor.value);
    },
  };
}
