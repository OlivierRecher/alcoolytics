import * as THREE from 'three';
import { scene } from '../engine/renderer.js';
import { rand } from '../utils/math.js';
import { fmtG } from '../utils/format.js';
import { sim, stats, projection, refreshProjection } from './state.js';
import { ch, setState } from './character/character.js';
import { remember, pushHistory } from './history.js';
import { showHint } from '../ui/hint.js';

// Vomi façon cartoon : des gouttes jaillissent de la bouche et forment une flaque qui s'efface.
const blobs = [], puddles = [];
const blobGeo = new THREE.IcosahedronGeometry(1, 1);
const _mouth = new THREE.Vector3();

export function emitVomit(dt) {
  if (ch.vomitAmount <= 0.3) return; // estomac vide : haut-le-cœur, rien ne sort
  ch.vomitEmit += dt * 40;
  ch.rig.mouth.getWorldPosition(_mouth);
  const fx = Math.sin(ch.heading), fz = Math.cos(ch.heading);
  while (ch.vomitEmit > 1) {
    ch.vomitEmit--;
    const m = new THREE.Mesh(blobGeo, ch.vomitMat);
    const s = rand(0.025, 0.055); m.scale.setScalar(s);
    m.position.copy(_mouth);
    const sp = rand(0.8, 1.4);
    blobs.push({ m, v: new THREE.Vector3(fx * sp + rand(-0.3, 0.3), rand(0.2, 0.9), fz * sp + rand(-0.3, 0.3)), s, landed: false, puddle: ch.puddle });
    scene.add(m);
  }
}

function newPuddle() {
  const mat = new THREE.MeshStandardMaterial({ color: 0xb6d76a, roughness: 0.35, transparent: true, opacity: 0.95 });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 20), mat);
  disc.rotation.x = -Math.PI / 2; disc.scale.setScalar(0.001);
  const fx = Math.sin(ch.heading), fz = Math.cos(ch.heading);
  disc.position.set(ch.pos.x + fx * 0.7, 0.012, ch.pos.z + fz * 0.7);
  disc.receiveShadow = true;
  scene.add(disc);
  const p = { disc, mat, size: 0, age: 0, blobs: [] };
  puddles.push(p);
  return p;
}

export function updateVomit(dt) {
  for (let i = blobs.length - 1; i >= 0; i--) {
    const b = blobs[i];
    if (!b.landed) {
      b.v.y -= 7 * dt;
      b.m.position.addScaledVector(b.v, dt);
      if (b.m.position.y <= 0.02) {
        b.landed = true; b.m.position.y = 0.015; b.m.scale.set(b.s * 1.4, b.s * 0.35, b.s * 1.4);
        b.puddle.size = Math.min(0.42, b.puddle.size + 0.006);
        b.puddle.blobs.push(b.m);
        blobs.splice(i, 1);
      }
    }
  }
  for (let i = puddles.length - 1; i >= 0; i--) {
    const p = puddles[i]; p.age += dt;
    const s = p.disc.scale.x + (p.size - p.disc.scale.x) * (1 - Math.exp(-dt * 4));
    p.disc.scale.set(s, s * 0.8, 1);
    if (p.age > 9) {
      p.mat.opacity = Math.max(0, 0.95 - (p.age - 9) / 2);
      if (p.mat.opacity <= 0) { scene.remove(p.disc); p.blobs.forEach(m => scene.remove(m)); p.mat.dispose(); puddles.splice(i, 1); }
    }
  }
}

/** Vomir vide l'estomac (pas le sang). Déclenché en touchant le perso. */
export function startVomit() {
  const before = projection.peak, blood = sim.blood;
  const entry = { kind: 'vomit', label: 'Vomi' };
  remember(entry); pushHistory(entry);
  const res = sim.vomit();
  stats.vomits++;
  refreshProjection();
  setState('vomit');
  ch.vomitAmount = res.expelled; ch.vomitEmit = 0; ch.vomitCD = 8;
  if (res.expelled > 0.3) { ch.puddle = entry.puddle = newPuddle(); ch.vomitMat = ch.puddle.mat; }
  if (res.expelled >= 1.5) {
    showHint(`Vomir a évacué ${res.expelled.toFixed(0)} g d'alcool encore dans l'estomac : pic prévu ${fmtG(before)} → ${fmtG(projection.peak)} g/L. Mais les ${fmtG(blood)} g/L déjà dans le sang restent.`, 6500);
  } else {
    showHint(`Estomac (presque) vide : vomir ne sert plus à rien, l'alcool est déjà dans le sang (${fmtG(blood)} g/L). Seul le temps l'élimine.`, 6000);
  }
}

/** Efface une flaque et ses gouttes (annulation d'un vomi). */
export function removePuddle(p) {
  for (let i = blobs.length - 1; i >= 0; i--) if (blobs[i].puddle === p) { scene.remove(blobs[i].m); blobs.splice(i, 1); }
  scene.remove(p.disc); p.blobs.forEach(m => scene.remove(m)); p.mat.dispose();
  const i = puddles.indexOf(p); if (i >= 0) puddles.splice(i, 1);
  if (ch.puddle === p) ch.puddle = null;
}

export function clearVomit() {
  blobs.forEach(b => scene.remove(b.m)); blobs.length = 0;
  puddles.forEach(p => { scene.remove(p.disc); p.blobs.forEach(m => scene.remove(m)); }); puddles.length = 0;
}
