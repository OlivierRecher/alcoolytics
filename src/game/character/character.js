import * as THREE from 'three';
import { THRESHOLDS } from '../../core/alcoholCalculator.js';
import { scene, camera } from '../../engine/renderer.js';
import { frame } from '../../engine/time.js';
import { clamp, lerp, rand, smooth, noise, dampAngle } from '../../utils/math.js';
import { setWorldQuaternion } from '../../utils/meshes.js';
import { UP, HOME, LAWN, OBST, KIOSK_BOX } from '../../world/constants.js';
import { showHint } from '../../ui/hint.js';
import { buildRig, disposeRig } from './rig.js';
import { POSE, applyPose, faceLook, behaviour } from './animation.js';
import { car, carDoor, startDrive, setDriverLook } from '../car.js';
import { stars } from '../effects.js';
import { startVomit, emitVomit } from '../vomit.js';
import { startDrink } from '../drinks/drinking.js';
import { throwGlass } from '../drinks/bottles.js';
import { updateUndo } from '../history.js';

/**
 * Le personnage. `state` pilote la machine à états :
 * idle · drink · vomit · toCar · driving · dizzy · toHome · run · ko · getup
 */
export const ch = {
  sex: 'male', rig: null, pos: HOME.clone(), heading: 0.68, state: 'idle', t: 0,
  moving: 0, walkPhase: 0, spin: 0, wander: HOME.clone(), wanderT: 0,
  vomitCD: 2, vomitAmount: 0, vomitEmit: 0, vomitMat: null, blinkT: 2, queue: [], glass: null, drink: null,
  pose: null, rate: 10,
  home: HOME.clone(), grab: HOME.clone(), runHeld: false,
};
let runMarker = null;

export const pronoun = () => ch.sex === 'female' ? { il: 'elle', Il: 'Elle', e: 'e' } : { il: 'il', Il: 'Il', e: '' };

export function createCharacter() {
  ch.rig = buildRig(ch.sex);
  runMarker = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.19, 32), new THREE.MeshBasicMaterial({ color: 0x2b2420, transparent: true, opacity: 0, depthWrite: false }));
  runMarker.rotation.x = -Math.PI / 2; scene.add(runMarker);
  ch.pose = { ...POSE };
}

const _d = new THREE.Vector3();
export function walkTo(target, dt, bac, speedMul = 1) {
  _d.subVectors(target, ch.pos); _d.y = 0;
  const dist = _d.length();
  if (dist < 0.05) return true;
  const speed = (1.15 - 0.45 * smooth(0.5, 2.5, bac)) * speedMul;
  _d.normalize();
  ch.pos.addScaledVector(_d, Math.min(dist, speed * dt));
  const wob = smooth(0.6, 2.2, bac) * noise(frame.time * 1.7 + 11);
  ch.pos.x += -_d.z * wob * dt * 1.2; ch.pos.z += _d.x * wob * dt * 1.2;
  ch.heading = dampAngle(ch.heading, Math.atan2(_d.x, _d.z) + wob * 0.5, 1 - Math.exp(-dt * 8));
  ch.moving = speed;
  return false;
}
function wanderAround(dt, bac, w) {
  if (w.dance < 0.15 && w.stagger < 0.15) {
    if (ch.pos.distanceTo(ch.home) > 0.06) walkTo(ch.home, dt, bac, 0.6);
    return;
  }
  ch.wanderT -= dt;
  if (ch.wanderT <= 0) {
    const r = 0.25 + 0.6 * w.stagger + 0.3 * w.dance, a = rand(0, Math.PI * 2);
    ch.wander.set(ch.home.x + Math.cos(a) * r, 0, ch.home.z + Math.sin(a) * r);
    ch.wanderT = rand(1.2, 3) * (1 - 0.4 * w.stagger);
  }
  walkTo(ch.wander, dt, bac, 0.35 + 0.4 * w.stagger);
}

export function setState(s) { ch.state = s; ch.t = 0; ch.rate = 10; }

export const grabbable = () => ch.rig.root.visible && ['idle', 'toHome', 'dizzy', 'run'].includes(ch.state);
// garde un point (perso ou cible) hors des arbres, buissons, banc, poubelle et bar
function pushOut(v, pad) {
  for (const [x, z, r] of OBST) {
    const dx = v.x - x, dz = v.z - z, d = Math.hypot(dx, dz), R = r + pad;
    if (d < R && d > 1e-4) { v.x = x + dx / d * R; v.z = z + dz / d * R; }
  }
  const [x0, x1, z0, z1] = KIOSK_BOX;
  if (v.x > x0 - pad && v.x < x1 + pad && v.z > z0 - pad && v.z < z1 + pad) {
    const d = [v.x - x0 + pad, x1 + pad - v.x, v.z - z0 + pad, z1 + pad - v.z], m = d.indexOf(Math.min(...d));
    if (m === 0) v.x = x0 - pad; else if (m === 1) v.x = x1 + pad; else if (m === 2) v.z = z0 - pad; else v.z = z1 + pad;
  }
  v.x = clamp(v.x, -LAWN + 0.15, LAWN - 0.15); v.z = clamp(v.z, -LAWN + 0.15, LAWN - 0.15);
  return v;
}
export function runTo(p) {
  ch.grab.copy(p); pushOut(ch.grab, 0.2);
  if (ch.state !== 'run') { if (ch.state === 'dizzy') stars.target = null; setState('run'); }
  ch.runHeld = true;
}

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _x = new THREE.Vector3();
export function updateCharacter(dt, bac) {
  const P = { ...POSE };
  ch.moving = 0; ch.t += dt;
  let faceCam = false;
  const r = ch.rig, time = frame.time;
  r.mouth.visible = false; r.smile.visible = true;

  switch (ch.state) {
    case 'idle': {
      if (bac >= THRESHOLDS.coma) { enterKO(); break; }
      const w = behaviour(P, dt, bac);
      ch.spin += w.spin;
      wanderAround(dt, bac, w);
      faceCam = ch.moving === 0;
      if (bac < THRESHOLDS.vomit) ch.vomitCD = Math.max(ch.vomitCD - dt, 1.5);
      else if ((ch.vomitCD -= dt) <= 0) { startVomit(true); break; }
      if (ch.queue.length) startDrink(ch.queue.shift());
      break;
    }
    case 'drink': {
      behaviour(P, dt, bac, false);
      faceCam = true;
      const u = ch.t;
      const raise = smooth(0, 0.4, u) * (1 - smooth(1.4, 1.75, u));
      const sip = smooth(0.45, 1.3, u) * (1 - smooth(1.3, 1.55, u));
      P.aRx = lerp(P.aRx, -2.1, raise); P.aRz = lerp(P.aRz, 0.55, raise);
      P.hx = lerp(P.hx, -0.38, sip);
      if (ch.glass) {
        _q.setFromAxisAngle(UP, ch.heading);
        _q2.setFromAxisAngle(_x.set(1, 0, 0), -1.35 * sip * raise);
        setWorldQuaternion(ch.glass, _q.multiply(_q2));
        const liquid = ch.glass.userData.liquid;
        if (liquid) liquid.scale.y = Math.max(0.02, 1 - smooth(0.5, 1.3, u));
      }
      if (u >= 1.75) { throwGlass(bac); setState('idle'); }
      break;
    }
    case 'vomit': {
      behaviour(P, dt, bac, false);
      const u = ch.t, bend = smooth(0, 0.35, u) * (1 - smooth(1.9, 2.3, u));
      P.sp += 0.8 * bend; P.hx += 0.3 * bend;
      P.aRx -= 0.6 * bend; P.aLx -= 0.6 * bend; P.aRz += 0.4 * bend; P.aLz -= 0.4 * bend;
      P.lRx -= 0.15 * bend; P.lLx += 0.15 * bend;
      P.eyes = lerp(P.eyes, 0.15, bend);
      const open = u > 0.35 && u < 1.8;
      r.mouth.visible = open; r.smile.visible = !open;
      if (open && u > 0.45 && u < 1.5) emitVomit(dt);
      if (u >= 2.4) setState('idle');
      break;
    }
    case 'toCar': {
      behaviour(P, dt, bac, false);
      if (walkTo(carDoor(), dt, bac)) {
        r.root.visible = false; car.driver.visible = true;
        setState('driving');
        startDrive(ch.drunk);
      }
      break;
    }
    case 'driving': break;
    case 'dizzy': {
      behaviour(P, dt, Math.max(bac, 1.6), false);
      P.sz += Math.sin(time * 5) * 0.2; P.hz += Math.sin(time * 5 + 1) * 0.3;
      P.eyes = 0.3;
      if (ch.t > 2.6) { stars.target = null; setState('toHome'); }
      break;
    }
    case 'toHome': {
      behaviour(P, dt, bac, false);
      if (walkTo(ch.home, dt, bac)) setState('idle');
      break;
    }
    case 'run': { // court vers le point maintenu ; s'arrête quand on relâche
      ch.rate = 14;
      behaviour(P, dt, bac, false);
      const there = walkTo(ch.grab, dt, bac, 2.3);
      pushOut(ch.pos, 0.2);
      if (ch.moving > 0) { P.sp += 0.22; P.hx -= 0.12; } else faceCam = true;
      if (there && !ch.runHeld) { ch.home.copy(ch.pos); setState('idle'); }
      else if (!ch.runHeld && ch.t > 0.5 && ch.moving === 0) { ch.home.copy(ch.pos); setState('idle'); }
      break;
    }
    case 'ko': {
      ch.rate = ch.t < 1.2 ? 4 : 8;
      Object.assign(P, { sx: -1.5, y: 0.21, sp: Math.sin(time * 1.2) * 0.02, hz: 0.45, hx: 0, aRz: -1.25, aLz: 1.1, aRx: -0.2, lRz: -0.18, lLz: 0.22, eyes: 0.06 });
      if (bac < THRESHOLDS.coma - 0.2) { setState('getup'); ch.rate = 3; }
      break;
    }
    case 'getup': {
      ch.rate = 3;
      behaviour(P, dt, bac, false);
      if (ch.t > 1.8) { ch.vomitCD = 3; setState('idle'); }
      break;
    }
  }

  // walking cycle
  if (ch.moving > 0) {
    const run = ch.state === 'run' ? 1 : 0;
    ch.walkPhase += dt * ch.moving * (9 - 3 * run);
    const s = Math.sin(ch.walkPhase);
    P.lRx += s * (0.6 + 0.35 * run); P.lLx -= s * (0.6 + 0.35 * run);
    P.aRx -= s * (0.45 + 0.5 * run); P.aLx += s * (0.45 + 0.5 * run);
    P.aRz -= 0.25 * run; P.aLz += 0.25 * run;
    P.y += Math.abs(Math.cos(ch.walkPhase)) * (0.04 + 0.05 * run);
  }
  if (faceCam) {
    const want = Math.atan2(camera.position.x - ch.pos.x, camera.position.z - ch.pos.z) + ch.spin;
    ch.heading = dampAngle(ch.heading, want, 1 - Math.exp(-dt * 3));
  }
  if (ch.state !== 'idle' || bac < 0.95) ch.spin = dampAngle(ch.spin, 0, 1 - Math.exp(-dt * 2));

  // blink
  if ((ch.blinkT -= dt) < 0) { P.eyes = 0.08; if (ch.blinkT < -0.12) ch.blinkT = rand(2, 5); }

  ch.pos.x = clamp(ch.pos.x, -LAWN + 0.15, LAWN - 0.15);
  ch.pos.z = clamp(ch.pos.z, -LAWN + 0.15, LAWN + 0.1);
  r.root.position.copy(ch.pos);
  // repère au sol là où on maintient le doigt
  runMarker.position.set(ch.grab.x, 0.02, ch.grab.z);
  runMarker.material.opacity += ((ch.state === 'run' && ch.runHeld ? 0.55 : 0) - runMarker.material.opacity) * 0.2;
  runMarker.scale.setScalar(1 + 0.15 * Math.sin(time * 6));
  r.root.rotation.y = ch.heading;
  applyPose(r, ch.pose, P, 1 - Math.exp(-dt * ch.rate));
  faceLook(r, bac);
}

function enterKO() {
  setState('ko');
  if (ch.glass) { scene.attach(ch.glass); throwGlass(THRESHOLDS.coma); }
  ch.queue.length = 0; updateUndo();
  showHint(`${pronoun().Il} s'effondre : coma éthylique. Ce n'est plus drôle du tout — c'est une urgence vitale.`, 6000);
}

/** Change de personnage (homme / femme) en gardant son état, sa pose et son verre en main. */
export function rebuildRig(sex) {
  const old = ch.rig;
  ch.sex = sex;
  ch.rig = buildRig(sex);
  ch.rig.root.visible = old.root.visible;
  if (ch.glass) ch.rig.arms[0].hand.add(ch.glass);
  disposeRig(old);
  applyPose(ch.rig, ch.pose, ch.pose, 1);
  setDriverLook();
}
