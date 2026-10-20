import * as THREE from 'three';
import { scene } from '../engine/renderer.js';
import { clamp, lerp, smooth } from '../utils/math.js';
import { std, shadowy } from '../utils/meshes.js';
import { TRASH } from './constants.js';

export const bin = { g: new THREE.Group(), lid: new THREE.Group(), open: 0, openV: 0, hold: 0, count: 0 };
const binning = []; // bouteilles en train de tomber dedans

/** Poubelle à pédale. */
export function createBin() {
  const body = std(0x4f7a5a, { roughness: 0.55, metalness: 0.2 }), rim = std(0x3e6248, { roughness: 0.5, metalness: 0.3 }), white = std(0xf6efe2);
  const add = (geo, mat, parent, x, y, z) => { const m = shadowy(new THREE.Mesh(geo, mat)); m.position.set(x, y, z); parent.add(m); return m; };
  add(new THREE.CylinderGeometry(0.165, 0.14, 0.42, 20), body, bin.g, 0, 0.21, 0);
  add(new THREE.CylinderGeometry(0.168, 0.168, 0.05, 20, 1, true), white, bin.g, 0, 0.27, 0);
  add(new THREE.TorusGeometry(0.165, 0.012, 6, 24), rim, bin.g, 0, 0.42, 0).rotation.x = Math.PI / 2;
  add(new THREE.BoxGeometry(0.1, 0.02, 0.07), rim, bin.g, 0, 0.03, 0.17);
  bin.lid.position.set(0, 0.425, -0.165); bin.g.add(bin.lid);
  add(new THREE.CylinderGeometry(0.172, 0.172, 0.03, 20), body, bin.lid, 0, 0.015, 0.165);
  add(new THREE.BoxGeometry(0.08, 0.025, 0.03), rim, bin.lid, 0, 0.04, 0.3);
  bin.g.position.copy(TRASH);
  scene.add(bin.g);
}

/** Fait sauter l'objet dans la poubelle. Renvoie le nombre total de bouteilles jetées. */
export function dropInBin(g) {
  binning.push({ g, from: g.position.clone(), s0: g.scale.x, t: 0 });
  bin.openV += 6;
  return ++bin.count;
}

export function updateBin(dt) {
  for (let i = binning.length - 1; i >= 0; i--) { // la bouteille saute au-dessus et tombe dedans
    const f = binning[i]; f.t += dt;
    const u = clamp(f.t / 0.45, 0, 1);
    f.g.position.set(lerp(f.from.x, TRASH.x, smooth(0, 0.6, u)), lerp(f.from.y, 0.3, u) + Math.sin(Math.PI * u) * 0.45, lerp(f.from.z, TRASH.z, smooth(0, 0.6, u)));
    f.g.rotateX(dt * 6);
    f.g.scale.setScalar(f.s0 * (1 - 0.6 * smooth(0.6, 1, u)));
    if (u >= 1) { scene.remove(f.g); binning.splice(i, 1); }
  }
  const target = bin.hold || binning.length ? 1 : 0;
  bin.openV += ((target - bin.open) * 70 - bin.openV * 8) * dt;
  bin.open = clamp(bin.open + bin.openV * dt, -0.05, 1.1);
  bin.lid.rotation.x = -1.6 * bin.open;
}

export function resetBin() {
  binning.forEach(f => scene.remove(f.g)); binning.length = 0; bin.count = 0;
}
