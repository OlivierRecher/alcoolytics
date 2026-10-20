import * as THREE from 'three';
import { scene } from '../engine/renderer.js';
import { frame } from '../engine/time.js';
import { rand } from '../utils/math.js';
import { canvasTexture } from '../utils/meshes.js';
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

// ---------- Nausée : bulle « touche pour vomir » + anneau vert pulsé ----------
let nauseaBubble = null, nauseaRing = null;
export function createNauseaCue() {
  const label = matchMedia('(pointer: coarse)').matches ? 'Touche pour vomir' : 'Clique pour vomir';
  const tex = canvasTexture(512, 160, () => {});
  const draw = () => {
    const c = tex.image.getContext('2d');
    c.clearRect(0, 0, 512, 160);
    c.fillStyle = '#f6efe2'; c.strokeStyle = '#2b2420'; c.lineWidth = 6;
    c.beginPath(); c.roundRect(12, 10, 488, 108, 54); c.moveTo(236, 115); c.lineTo(256, 150); c.lineTo(276, 115);
    c.fill(); c.stroke();
    c.fillStyle = '#f6efe2'; c.fillRect(242, 110, 28, 12); // efface le trait entre bulle et pointe
    c.fillStyle = '#5f8a1c'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '600 46px Inter, system-ui, sans-serif'; c.fillText(label, 256, 66);
    tex.needsUpdate = true;
  };
  draw(); document.fonts?.ready.then(draw);
  nauseaBubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
  nauseaBubble.center.set(0.5, 0); nauseaBubble.renderOrder = 10; nauseaBubble.visible = false;
  nauseaRing = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.55, 48), new THREE.MeshBasicMaterial({ color: 0x9cc84a, transparent: true, opacity: 0, depthWrite: false }));
  nauseaRing.rotation.x = -Math.PI / 2;
  scene.add(nauseaBubble, nauseaRing);
}
export function updateNauseaCue() {
  const n = ch.nausea, time = frame.time;
  nauseaBubble.visible = nauseaRing.visible = n > 0.01;
  if (!nauseaBubble.visible) return;
  ch.rig.head.getWorldPosition(_h);
  const pulse = 0.5 + 0.5 * Math.sin(time * 6);
  nauseaBubble.position.copy(_h).add(_x.set(0, 0.32 + 0.03 * Math.sin(time * 3), 0));
  nauseaBubble.scale.set(0.8, 0.25, 1).multiplyScalar((0.85 + 0.15 * n) * (1 + 0.06 * pulse));
  nauseaBubble.material.opacity = n;
  nauseaRing.position.set(ch.pos.x, 0.021, ch.pos.z);
  nauseaRing.scale.setScalar(1 + pulse * 0.15);
  nauseaRing.material.opacity = (0.25 + 0.4 * pulse) * n;
}
