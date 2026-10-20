import * as THREE from 'three';
import { scene } from '../engine/renderer.js';
import { rand } from '../utils/math.js';
import { std, shadowy, canvasTexture } from '../utils/meshes.js';
import { KIOSK, KIOSK_BOX, TREES, BUSHES, BENCH, HOME, DOG_PARK, DOG_R, OBST, LAWN } from './constants.js';

const woodMat = std(0xb98d5e), wallMat = std(0xead6b0), darkWood = std(0x8f6e4a);

/** Le bar : comptoir, étagère à bouteilles, auvent rayé, enseigne. */
export function createKiosk() {
  const g = new THREE.Group(); g.position.copy(KIOSK);
  const add = (geo, mat, x, y, z) => { const m = shadowy(new THREE.Mesh(geo, mat)); m.position.set(x, y, z); g.add(m); return m; };
  add(new THREE.BoxGeometry(1.5, 0.55, 0.45), woodMat, 0, 0.275, 0.05);
  add(new THREE.BoxGeometry(1.62, 0.05, 0.58), darkWood, 0, 0.575, 0.05);
  add(new THREE.BoxGeometry(1.62, 1.45, 0.08), wallMat, 0, 0.725, -0.55);
  add(new THREE.BoxGeometry(1.5, 0.04, 0.16), darkWood, 0, 0.98, -0.45);
  for (const sx of [-1, 1]) add(new THREE.CylinderGeometry(0.025, 0.025, 1.4, 6), darkWood, sx * 0.76, 0.7, 0.28);
  const stripes = canvasTexture(256, 32, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#f6efe2' : '#e06b5a'; c.fillRect(i * w / 8, 0, w / 8, h); } });
  const awning = add(new THREE.BoxGeometry(1.8, 0.04, 0.95), std(0xffffff, { map: stripes, roughness: 0.9 }), 0, 1.45, -0.08);
  awning.rotation.x = 0.22;
  const bottleCols = [0x7a4a1f, 0x3f7a4a, 0xe0a33a, 0x5a2a3a, 0x9fd3d6, 0x7a4a1f, 0xd94a3a];
  bottleCols.forEach((c, i) => {
    const b = add(new THREE.CylinderGeometry(0.035, 0.04, 0.16, 8), std(c, { roughness: 0.3 }), -0.6 + i * 0.2, 1.08, -0.45);
    add(new THREE.CylinderGeometry(0.012, 0.02, 0.06, 6), std(c, { roughness: 0.3 }), b.position.x, 1.19, -0.45);
  });
  const signTex = canvasTexture(256, 96, () => {});
  const drawSign = () => {
    const c = signTex.image.getContext('2d');
    c.fillStyle = '#2b2420'; c.fillRect(0, 0, 256, 96);
    c.fillStyle = '#f6efe2'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'italic 64px "Instrument Serif", serif'; c.fillText('Le Bar', 128, 52);
    signTex.needsUpdate = true;
  };
  drawSign(); document.fonts?.ready.then(drawSign);
  add(new THREE.BoxGeometry(0.75, 0.28, 0.04), [darkWood, darkWood, darkWood, darkWood, std(0xffffff, { map: signTex }), darkWood], 0, 1.74, -0.5);
  scene.add(g);
}

export function createTrees() {
  for (const [x, z, s] of TREES) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
    const trunk = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.9, 6), std(0x8f6e4a))); trunk.position.y = 0.45; g.add(trunk);
    [[0, 1.15, 0, 0.5, 0x7fa86a], [0.22, 0.95, 0.1, 0.34, 0x6a9a5a], [-0.18, 1.0, -0.12, 0.36, 0x8db577]].forEach(([fx, fy, fz, r, c]) => {
      const f = shadowy(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), std(c, { flatShading: true })));
      f.position.set(fx, fy, fz); f.rotation.set(rand(0, 3), rand(0, 3), 0); g.add(f);
    });
    scene.add(g);
  }
}

export function createBushes() {
  for (const [x, z, r] of BUSHES) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    [[0, 0.8, 0, 1, 0x7fa86a], [0.55, 0.55, 0.2, 0.7, 0x6a9a5a], [-0.5, 0.5, -0.15, 0.75, 0x8db577], [0.1, 0.5, -0.55, 0.65, 0x6a9a5a]].forEach(([fx, fy, fz, k, c]) => {
      const f = shadowy(new THREE.Mesh(new THREE.IcosahedronGeometry(r * k, 0), std(c, { flatShading: true })));
      f.position.set(fx * r, fy * r, fz * r); f.rotation.set(rand(0, 3), rand(0, 3), 0); g.add(f);
    });
    scene.add(g);
  }
}

/** Banc (face au centre de la pelouse). */
export function createBench() {
  const g = new THREE.Group(); g.position.copy(BENCH); g.rotation.y = Math.PI / 2;
  const iron = std(0x3b3734, { roughness: 0.5, metalness: 0.3 }), slat = std(0xc98f55);
  const add = (geo, mat, x, y, z, rx = 0) => { const m = shadowy(new THREE.Mesh(geo, mat)); m.position.set(x, y, z); m.rotation.x = rx; g.add(m); return m; };
  for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(1.1, 0.035, 0.1), slat, 0, 0.3, -0.12 + i * 0.12);
  for (const y of [0.45, 0.58]) add(new THREE.BoxGeometry(1.1, 0.09, 0.03), slat, 0, y, -0.17 - (y - 0.31) * 0.18, -0.18);
  for (const sx of [-1, 1]) {
    add(new THREE.BoxGeometry(0.04, 0.3, 0.04), iron, sx * 0.45, 0.15, 0.13);
    add(new THREE.BoxGeometry(0.04, 0.64, 0.04), iron, sx * 0.45, 0.32, -0.2, -0.18);
    add(new THREE.BoxGeometry(0.04, 0.04, 0.38), iron, sx * 0.45, 0.27, -0.03);
    add(new THREE.BoxGeometry(0.05, 0.03, 0.34), iron, sx * 0.52, 0.42, -0.02);
    add(new THREE.BoxGeometry(0.03, 0.14, 0.03), iron, sx * 0.52, 0.35, 0.13);
  }
  scene.add(g);
}

/** Touffes d'herbe et fleurs, posées là où rien d'autre ne se trouve. */
export function createGrass() {
  const free = (x, z) => Math.hypot(x - HOME.x, z - HOME.z) > 1.1
    && !(x > KIOSK_BOX[0] - 0.2 && x < KIOSK_BOX[1] + 0.2 && z > KIOSK_BOX[2] - 0.2 && z < KIOSK_BOX[3] + 0.3)
    && Math.hypot(x - DOG_PARK.x, z - DOG_PARK.z) > DOG_R + 0.2
    && OBST.every(([ox, oz, r]) => Math.hypot(x - ox, z - oz) > r + 0.12);
  const spot = () => { for (;;) { const x = rand(-LAWN + 0.3, LAWN - 0.3), z = rand(-LAWN + 0.3, LAWN - 0.3); if (free(x, z)) return [x, z]; } };
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), e = new THREE.Euler(), c = new THREE.Color();
  const blades = new THREE.InstancedMesh(new THREE.ConeGeometry(0.022, 0.13, 3).translate(0, 0.065, 0), std(0xffffff, { roughness: 1 }), 70 * 3);
  for (let i = 0; i < 70; i++) {
    const [x, z] = spot();
    for (let j = 0; j < 3; j++) {
      p.set(x + rand(-0.03, 0.03), 0, z + rand(-0.03, 0.03));
      q.setFromEuler(e.set(rand(-0.35, 0.35), rand(0, 3), rand(-0.35, 0.35)));
      s.setScalar(rand(0.7, 1.2));
      blades.setMatrixAt(i * 3 + j, m.compose(p, q, s));
      blades.setColorAt(i * 3 + j, c.set(0x8fb06a).offsetHSL(rand(-0.02, 0.02), 0, rand(-0.06, 0.04)));
    }
  }
  scene.add(blades);
  const PETALS = [0xffffff, 0xf5c542, 0xf29bb0, 0xe06b5a, 0xffffff];
  const heads = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.032, 0), std(0xffffff, { roughness: 0.8, flatShading: true }), 18 * 4);
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 4).translate(0, 0.5, 0), std(0x6a9a5a), 18 * 4);
  let k = 0;
  for (let i = 0; i < 18; i++) {
    const [x, z] = spot(), col = PETALS[i % PETALS.length];
    for (let j = 0; j < 4; j++, k++) {
      const h = rand(0.07, 0.13), fx = x + rand(-0.08, 0.08), fz = z + rand(-0.08, 0.08);
      stems.setMatrixAt(k, m.compose(p.set(fx, 0, fz), q.identity(), s.set(1, h, 1)));
      heads.setMatrixAt(k, m.compose(p.set(fx, h, fz), q.setFromEuler(e.set(rand(0, 3), rand(0, 3), 0)), s.setScalar(rand(0.8, 1.2))));
      heads.setColorAt(k, c.set(col));
    }
  }
  heads.castShadow = true;
  scene.add(stems, heads);
}
