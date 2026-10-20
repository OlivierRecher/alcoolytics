import * as THREE from 'three';
import { frame } from '../../engine/time.js';
import { clamp, smooth, noise } from '../../utils/math.js';
import { SKIN } from './rig.js';

/** Pose neutre : chaque clé est un angle (ou une hauteur) d'une articulation du rig. */
export const POSE = { y: 0, sx: 0, sz: 0, sp: 0, hx: 0, hy: 0, hz: 0, aRx: 0, aRz: -0.08, aLx: 0, aLz: 0.08, lRx: 0, lLx: 0, lRz: 0, lLz: 0, eyes: 1, brow: 0 };

/** Amène la pose courante `C` vers la cible `P` (facteur k) et l'applique au rig. */
export function applyPose(r, C, P, k) {
  for (const key in P) C[key] += (P[key] - C[key]) * k;
  r.sway.position.y = C.y; r.sway.rotation.set(C.sx, 0, C.sz);
  r.spine.rotation.x = C.sp; r.neck.rotation.set(C.hx, C.hy, C.hz);
  r.arms[0].pivot.rotation.set(C.aRx, 0, C.aRz); r.arms[1].pivot.rotation.set(C.aLx, 0, C.aLz);
  r.legs[0].rotation.set(C.lRx, 0, C.lRz); r.legs[1].rotation.set(C.lLx, 0, C.lLz);
  const open = clamp(C.eyes, 0.08, 1);
  r.eyes.forEach(e => e.scale.y = open);
  // sourcils : >0 surpris (levés, inclinés vers le haut), <0 paupières lourdes (tombants)
  r.brows.forEach(b => { b.position.y = 0.125 + C.brow * 0.03; b.rotation.z = Math.PI / 2 + b.userData.s * C.brow * 0.3; });
}

const _skin = new THREE.Color(SKIN), _red = new THREE.Color(0xe2574c);
/** Nez et joues qui rougissent avec l'alcoolémie. */
export function faceLook(r, bac) {
  r.noseMat.color.copy(_skin).lerp(_red, smooth(0.3, 2.0, bac));
  r.cheekMat.opacity = 0.18 + 0.55 * smooth(0.3, 1.8, bac);
}

/**
 * Comportement selon l'alcool DANS LE SANG : respiration, ivresse, danse, titubation.
 * Modifie la pose cible P ; `spin` est la rotation de danse à ajouter au personnage.
 */
export function behaviour(P, dt, bac, allowDance = true) {
  const t = frame.time;
  let spin = 0;
  P.y += Math.sin(t * 2.2) * 0.008;
  P.sp += Math.sin(t * 2.2) * 0.015;
  const tipsy = smooth(0.3, 1.0, bac);
  P.sz += Math.sin(t * 1.1) * 0.045 * tipsy;
  P.hz += Math.sin(t * 0.9 + 1) * 0.1 * tipsy;
  P.eyes -= 0.15 * tipsy;
  P.brow -= 0.5 * tipsy;
  const stagger = smooth(1.4, 1.65, bac);
  const dance = allowDance ? smooth(0.95, 1.1, bac) * (1 - 0.75 * stagger) : 0;
  if (dance > 0) {
    const b = t * 7;
    P.y += Math.abs(Math.sin(b)) * 0.09 * dance;
    P.sz += Math.sin(b / 2) * 0.14 * dance;
    P.hz += Math.sin(b) * 0.2 * dance;
    P.hy += Math.sin(b / 2) * 0.35 * dance;
    P.aRz += (-2.5 - 0.35 * Math.sin(b)) * dance;
    P.aLz += (2.5 - 0.35 * Math.sin(b)) * dance;
    P.aRx += Math.sin(b / 2) * 0.5 * dance;
    P.aLx -= Math.sin(b / 2) * 0.5 * dance;
    P.lRx -= Math.max(0, Math.sin(b)) * 0.55 * dance;
    P.lLx -= Math.max(0, -Math.sin(b)) * 0.55 * dance;
    P.sp -= 0.1 * dance;
    spin = dt * 2.2 * dance * Math.sin(t * 0.4);
  }
  if (stagger > 0) {
    P.sx += noise(t * 0.9) * 0.3 * stagger;
    P.sz += noise(t * 0.75 + 7) * 0.4 * stagger;
    P.hx += (0.22 + noise(t * 1.3 + 3) * 0.18) * stagger;
    P.hz += noise(t * 1.1 + 5) * 0.25 * stagger;
    P.aRz -= (0.9 + 0.3 * Math.sin(t * 2.3)) * stagger;
    P.aLz += (0.9 + 0.3 * Math.sin(t * 1.9)) * stagger;
    P.eyes -= 0.35 * stagger;
  }
  return { dance, stagger, spin };
}
