import * as THREE from 'three';
import { scene } from '../../engine/renderer.js';
import { clamp, lerp, rand, smooth } from '../../utils/math.js';
import { hidden } from '../../utils/meshes.js';
import { UP, LAWN, KIOSK_BOX, OBST, DOG_PARK, DOG_R, TRASH, TRASH_R, GLASS_SCALE } from '../../world/constants.js';
import { bin, dropInBin } from '../../world/bin.js';
import { ch } from '../character/character.js';
import { showHint } from '../../ui/hint.js';
import { releaseBottle, forgetBottle } from '../../input/pointer.js';

/** Bouteilles vides posées au sol (attrapables) et celles encore en vol. */
export const bottles = [], flying = [];

const bottleHitGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.3, 8);
const B_R = 0.1;
const _q = new THREE.Quaternion(), _x = new THREE.Vector3(), _tq = new THREE.Quaternion(), _ax = new THREE.Vector3();

function pickSlot() {
  let best = null, bestD = -1;
  const reach = 1.1 + Math.min(2, bottles.length * 0.04);
  for (let i = 0; i < 40; i++) {
    const a = rand(0, Math.PI * 2), r = rand(0.95, reach);
    const p = new THREE.Vector3(ch.home.x + Math.cos(a) * r, 0, ch.home.z + Math.sin(a) * r);
    if (Math.abs(p.x) > LAWN - 0.2 || Math.abs(p.z) > LAWN - 0.2) continue;
    if (p.x > KIOSK_BOX[0] - 0.15 && p.x < KIOSK_BOX[1] + 0.15 && p.z > KIOSK_BOX[2] - 0.15 && p.z < KIOSK_BOX[3] + 0.2) continue;
    if (OBST.some(([x, z, r]) => Math.hypot(p.x - x, p.z - z) < r + 0.25)) continue;
    if (p.distanceTo(DOG_PARK) < DOG_R + 0.15) continue;
    let dmin = 9; for (const b of bottles) dmin = Math.min(dmin, b.rest.distanceTo(p));
    if (dmin > bestD) { bestD = dmin; best = p; }
    if (dmin > 0.38) break;
  }
  return best || new THREE.Vector3(ch.home.x + rand(-1.5, 1.5), 0, ch.home.z - 1.2);
}

/** Le perso jette son verre vide par-dessus l'épaule. */
export function throwGlass(bac) {
  const g = ch.glass; if (!g) return;
  ch.glass = null;
  scene.attach(g);
  if (g.userData.liquid) g.userData.liquid.visible = false;
  const rest = pickSlot();
  const lying = Math.random() < 0.15 + 0.35 * clamp(bac / 2, 0, 1);
  const qEnd = new THREE.Quaternion().setFromAxisAngle(UP, rand(0, Math.PI * 2));
  if (lying) qEnd.multiply(_q.setFromAxisAngle(_x.set(0, 0, 1), Math.PI / 2));
  const end = rest.clone(); end.y = lying ? g.userData.radius * GLASS_SCALE : 0;
  const scale0 = g.scale.x;
  g.scale.setScalar(GLASS_SCALE);
  const hit = new THREE.Mesh(bottleHitGeo, hidden); hit.position.y = 0.13; g.add(hit);
  const b = { g, rest, hit, flying: true, lying, y0: end.y, q0: qEnd.clone(), qCur: qEnd.clone(), vx: 0, vz: 0, lift: 0, drag: null, awake: false };
  hit.userData.bottle = b;
  flying.push({ g, b, from: g.position.clone(), to: end, q0: g.quaternion.clone(), q1: qEnd, t: 0, dur: 0.55 + rest.distanceTo(ch.pos) * 0.08, scale0 });
  bottles.push(b);
  if (bottles.length > 80) { const i = bottles.findIndex(o => !o.drag && !o.flying); if (i >= 0) scene.remove(bottles.splice(i, 1)[0].g); }
}

export function updateFlying(dt) {
  for (let i = flying.length - 1; i >= 0; i--) {
    const f = flying[i]; f.t += dt;
    const u = clamp(f.t / f.dur, 0, 1);
    f.g.position.lerpVectors(f.from, f.to, u);
    f.g.position.y += Math.sin(Math.PI * u) * 0.7;
    f.g.quaternion.slerpQuaternions(f.q0, f.q1, smooth(0, 1, u));
    if (u >= 1) {
      const b = f.t - f.dur; // petit rebond
      f.g.position.y = f.to.y + Math.abs(Math.sin(b * 14)) * 0.06 * Math.exp(-b * 8);
      if (b > 0.5) { f.g.position.copy(f.to); f.b.flying = false; flying.splice(i, 1); }
    }
  }
}

// Bouteilles au sol : on les attrape, on les traîne, on les lance (elles glissent, se cognent, se renversent)
function topple(o, nx, nz) {
  o.lying = true; o.awake = true;
  o.q0.setFromAxisAngle(UP, Math.atan2(nz, -nx)).multiply(_q.setFromAxisAngle(_x.set(0, 0, 1), Math.PI / 2));
  o.y0 = o.g.userData.radius * GLASS_SCALE;
}
function collideCircle(b, x, z, r, bounce = 0.6) {
  const p = b.g.position, dx = p.x - x, dz = p.z - z, d = Math.hypot(dx, dz);
  if (d >= r || d < 1e-4) return false;
  const nx = dx / d, nz = dz / d;
  p.x = x + nx * r; p.z = z + nz * r;
  const dot = b.vx * nx + b.vz * nz; if (dot < 0) { b.vx -= (1 + bounce) * dot * nx; b.vz -= (1 + bounce) * dot * nz; }
  return true;
}

export function updateBottles(dt) {
  const chOn = ch.rig.root.visible;
  bin.hold = 0;
  const cfx = Math.sin(ch.heading) * ch.moving, cfz = Math.cos(ch.heading) * ch.moving;
  for (const b of bottles) {
    if (b.flying || b.trashed) continue;
    const p = b.g.position;
    // le perso shoote dans les bouteilles en marchant
    if (chOn && Math.hypot(p.x - ch.pos.x, p.z - ch.pos.z) < 0.24 && !b.drag) {
      if (collideCircle(b, ch.pos.x, ch.pos.z, 0.24, 0.2)) { b.vx += cfx * 1.2; b.vz += cfz * 1.2; b.awake = true; }
    }
    if (!b.awake && !b.drag) continue;
    b.awake = true;
    if (b.drag) {
      const nx = lerp(p.x, b.drag.x, 0.35), nz = lerp(p.z, b.drag.z, 0.35);
      b.vx = (nx - p.x) / Math.max(dt, 1e-3); b.vz = (nz - p.z) / Math.max(dt, 1e-3);
      p.x = nx; p.z = nz;
    } else {
      const fr = Math.exp(-(b.lying ? 2.2 : 3.2) * dt); b.vx *= fr; b.vz *= fr;
      p.x += b.vx * dt; p.z += b.vz * dt;
    }
    const dBin = Math.hypot(p.x - TRASH.x, p.z - TRASH.z);
    if (b.drag && dBin < 0.9) bin.hold = 1; // le couvercle s'ouvre quand on approche une bouteille
    if (dBin < TRASH_R + 0.06) { b.trashed = true; continue; }
    const lim = LAWN - 0.08;
    if (Math.abs(p.x) > lim) { p.x = Math.sign(p.x) * lim; b.vx *= -0.5; }
    if (Math.abs(p.z) > lim) { p.z = Math.sign(p.z) * lim; b.vz *= -0.5; }
    for (const [x, z, r] of OBST) collideCircle(b, x, z, r + 0.07);
    const [x0, x1, z0, z1] = KIOSK_BOX;
    if (p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1) { // sortir par le côté le plus proche
      const d = [p.x - x0, x1 - p.x, p.z - z0, z1 - p.z], m = d.indexOf(Math.min(...d));
      if (m === 0) { p.x = x0; b.vx = -Math.abs(b.vx) * 0.5; } else if (m === 1) { p.x = x1; b.vx = Math.abs(b.vx) * 0.5; }
      else if (m === 2) { p.z = z0; b.vz = -Math.abs(b.vz) * 0.5; } else { p.z = z1; b.vz = Math.abs(b.vz) * 0.5; }
    }
    for (const o of bottles) { // chocs entre bouteilles : transfert d'élan, quilles qui tombent
      if (o === b || o.flying) continue;
      const op = o.g.position, dx = op.x - p.x, dz = op.z - p.z, dd = Math.hypot(dx, dz);
      if (dd >= B_R * 2 || dd < 1e-4) continue;
      const nx = dx / dd, nz = dz / dd, push = (B_R * 2 - dd) / 2;
      op.x += nx * push; op.z += nz * push; p.x -= nx * push; p.z -= nz * push;
      const vn = (b.vx - o.vx) * nx + (b.vz - o.vz) * nz;
      if (vn > 0) {
        o.vx += nx * vn * 0.8; o.vz += nz * vn * 0.8; b.vx -= nx * vn * 0.5; b.vz -= nz * vn * 0.5;
        if (vn > 1.3 && !o.lying) topple(o, nx, nz);
      }
      o.awake = true;
    }
    const speed = Math.hypot(b.vx, b.vz);
    b.lift += ((b.drag ? 0.2 : 0) - b.lift) * (1 - Math.exp(-dt * 12));
    if (b.lying && !b.drag) b.q0.premultiply(_q.setFromAxisAngle(UP, speed * dt * 1.5));
    b.qCur.slerp(b.q0, 1 - Math.exp(-dt * 12));
    // inclinaison dans le sens du mouvement quand on la porte
    const tilt = b.drag ? clamp(speed * 0.08, 0, 0.6) : 0;
    if (tilt > 1e-3) _tq.setFromAxisAngle(_ax.set(b.vz, 0, -b.vx).normalize(), tilt); else _tq.identity();
    b.g.quaternion.copy(_tq).multiply(b.qCur);
    b.yCur = lerp(b.yCur ?? b.y0, b.y0, 1 - Math.exp(-dt * 12));
    p.y = b.yCur + b.lift;
    b.rest.set(p.x, 0, p.z);
    if (!b.drag && speed < 0.02 && b.lift < 0.002 && b.qCur.angleTo(b.q0) < 0.01 && Math.abs(b.yCur - b.y0) < 0.002) {
      b.vx = b.vz = 0; b.awake = false;
    }
  }
  for (let i = bottles.length - 1; i >= 0; i--) if (bottles[i].trashed) trashBottle(bottles.splice(i, 1)[0]);
}

function trashBottle(b) {
  releaseBottle(b);
  const n = dropInBin(b.g);
  showHint(n === 1 ? `Une bouteille à la poubelle. Ranger, c'est aussi la fête.` : `${n} bouteilles à la poubelle.`, 1800);
}

/** Retire la bouteille issue de ce verre (annulation d'une conso). */
export function removeBottle(glass) {
  const i = bottles.findIndex(b => b.g === glass);
  if (i >= 0) { const [b] = bottles.splice(i, 1); scene.remove(b.g); forgetBottle(b); }
  const f = flying.findIndex(o => o.g === glass); if (f >= 0) flying.splice(f, 1);
}

export function clearBottles() {
  bottles.forEach(b => scene.remove(b.g)); bottles.length = 0; flying.length = 0;
}
