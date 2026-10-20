import * as THREE from 'three';
import { scene } from '../engine/renderer.js';
import { frame } from '../engine/time.js';
import { rand } from '../utils/math.js';
import { ch } from './character/character.js';
import { car } from './car.js';

// ---------- Bouffées de fumée / poussière ----------
const fx = [];
const puffGeo = new THREE.IcosahedronGeometry(1, 1);
export function puff(pos, color, size, life) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 1, transparent: true, opacity: 0.9, depthWrite: false });
  const m = new THREE.Mesh(puffGeo, mat); m.position.copy(pos); m.scale.setScalar(size);
  scene.add(m);
  fx.push({ m, mat, v: new THREE.Vector3(rand(-0.2, 0.2), rand(0.4, 0.8), rand(-0.2, 0.2)), size, age: 0, life });
}
export function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i]; f.age += dt;
    const u = f.age / f.life;
    f.m.position.addScaledVector(f.v, dt);
    f.m.scale.setScalar(f.size * (1 + u * 1.8));
    f.mat.opacity = 0.9 * (1 - u);
    if (u >= 1) { scene.remove(f.m); f.mat.dispose(); fx.splice(i, 1); }
  }
}

// ---------- Étoiles d'étourdissement (au-dessus de la voiture ou de la tête) ----------
/** target : null | 'car' | 'head' */
export const stars = { g: new THREE.Group(), target: null };
export function createStars() {
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.035 : 0.08, a = i / 10 * Math.PI * 2 + Math.PI / 2;
    i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.025, bevelEnabled: false }); geo.center();
  const mat = new THREE.MeshStandardMaterial({ color: 0xf5c542, emissive: 0xc08a10, emissiveIntensity: 0.3, roughness: 0.5 });
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(geo, mat), a = i / 5 * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3); stars.g.add(s);
  }
  stars.g.visible = false; scene.add(stars.g);
}
const _h = new THREE.Vector3(), _x = new THREE.Vector3();
export function updateStars(dt) {
  const time = frame.time;
  stars.g.visible = !!stars.target;
  if (!stars.target) return;
  if (stars.target === 'car') stars.g.position.copy(car.root.position).setY(1.15);
  else { ch.rig.head.getWorldPosition(_h); stars.g.position.copy(_h).add(_x.set(0, 0.3, 0)); }
  stars.g.rotation.y += dt * 4;
  stars.g.children.forEach((s, i) => { s.rotation.y = -stars.g.rotation.y + time * 3; s.position.y = Math.sin(time * 5 + i) * 0.04; });
}

// ---------- Anneau rouge pulsé autour du perso en coma ----------
let koRing = null;
export function createKoRing() {
  koRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 48), new THREE.MeshBasicMaterial({ color: 0xd94a3a, transparent: true, opacity: 0, depthWrite: false }));
  koRing.rotation.x = -Math.PI / 2; scene.add(koRing);
}
export function updateKoRing() {
  const on = ch.state === 'ko';
  koRing.position.set(ch.pos.x - Math.sin(ch.heading) * 0.35, 0.02, ch.pos.z - Math.cos(ch.heading) * 0.35);
  const pulse = 0.5 + 0.5 * Math.sin(frame.time * 5);
  koRing.material.opacity += ((on ? 0.35 + 0.45 * pulse : 0) - koRing.material.opacity) * 0.1;
  koRing.scale.setScalar(1 + pulse * 0.15);
}
