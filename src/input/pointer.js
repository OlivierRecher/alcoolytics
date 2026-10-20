import * as THREE from 'three';
import { canvas, camera } from '../engine/renderer.js';
import { controls } from '../engine/controls.js';
import { UP, LAWN } from '../world/constants.js';
import { bin } from '../world/bin.js';
import { ch, grabbable, runTo } from '../game/character/character.js';
import { bottles } from '../game/drinks/bottles.js';
import { car } from '../game/car.js';
import { tapCharacter, tapCar } from '../game/actions.js';

// ---------- Raycasting ----------
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
function setRay(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
}
function pick(e) {
  setRay(e);
  // les bouteilles d'abord : la zone de clic du perso est large et les masquerait
  const bHit = raycaster.intersectObjects(bottles.filter(b => !b.flying).map(b => b.hit), false)[0];
  if (bHit) return { kind: 'bottle', b: bHit.object.userData.bottle };
  const targets = [car.hit];
  if (ch.rig.root.visible) targets.push(ch.rig.hit);
  const hit = raycaster.intersectObjects(targets, false)[0];
  if (!hit) return null;
  if (hit.object === car.hit) return { kind: 'car' };
  return { kind: 'char' };
}
const ground = new THREE.Plane(UP, 0);
function groundPoint(e) {
  setRay(e);
  const p = new THREE.Vector3();
  return raycaster.ray.intersectPlane(ground, p) ? p : null;
}

// ---------- Gestes ----------
// Tap court = action (vomir, conduire). Doigt maintenu sur la pelouse (ou glissé depuis le perso) =
// le perso court jusque-là et suit le doigt. Bouteille = on la traîne, on la lance, on la jette.
// Glissé rapide ailleurs = la caméra tourne.
const HOLD_MS = 250;
const onLawn = (p) => Math.abs(p.x) < LAWN && Math.abs(p.z) < LAWN;
let down = null, drag = null;

function onPointerDown(e) {
  down = { x: e.clientX, y: e.clientY, t: performance.now() };
  const what = pick(e), g = groundPoint(e);
  if (!g || what?.kind === 'car') return;
  if (what?.kind === 'bottle') {
    const at = what.b.g.position;
    drag = { kind: 'bottle', b: what.b, off: new THREE.Vector3(at.x - g.x, 0, at.z - g.z) };
    what.b.drag = new THREE.Vector3(at.x, 0, at.z);
    controls.enabled = false; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing';
    return;
  }
  const onChar = what?.kind === 'char';
  if (!onChar && !onLawn(g)) return;
  drag = { kind: 'run', active: false, onChar, pt: g, id: e.pointerId };
  if (onChar) { controls.enabled = false; canvas.setPointerCapture(e.pointerId); }
}
function activateRun() {
  if (!drag || drag.kind !== 'run' || drag.active) return;
  if (!grabbable()) { if (!drag.onChar) drag = null; return; }
  drag.active = true; controls.enabled = false;
  try { canvas.setPointerCapture(drag.id); } catch {}
  canvas.style.cursor = 'crosshair';
  runTo(drag.pt);
}
function onPointerMove(e) {
  if (drag) {
    const g = groundPoint(e); if (!g) return;
    if (drag.kind === 'bottle') {
      drag.b.drag.copy(g.add(drag.off));
      if (raycaster.intersectObject(bin.g, true).length) drag.b.trashed = true; // lâchée au-dessus de la poubelle
      return;
    }
    drag.pt = g;
    if (!drag.active) {
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      if (drag.onChar && moved > 6) activateRun();
      else if (!drag.onChar && moved > 8) { drag = null; return; } // c'était un glissé de caméra
    }
    if (drag.active) runTo(g);
    if (drag.onChar || drag.active) return;
  }
  if (e.buttons || e.pointerType !== 'mouse') return;
  const what = pick(e);
  canvas.style.cursor = !what ? 'default' : what.kind === 'car' ? 'pointer' : 'grab';
}
function endPointer(e) {
  const tap = down && Math.hypot(e.clientX - down.x, e.clientY - down.y) <= 8 && performance.now() - down.t <= 600 && e.type === 'pointerup';
  down = null;
  if (drag) {
    const d = drag; drag = null;
    controls.enabled = true; canvas.style.cursor = 'default';
    if (d.kind === 'bottle') d.b.drag = null;
    else if (d.active) ch.runHeld = false;
    else if (d.onChar && tap) tapCharacter();
    if (d.kind === 'bottle' || d.active || d.onChar) return;
  }
  if (!tap) return;
  const what = pick(e);
  if (what?.kind === 'car') tapCar(); else if (what?.kind === 'char') tapCharacter();
}

/** À appeler AVANT createControls() pour que nos écouteurs voient les taps avant l'orbite. */
export function initPointer() {
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
}

/** À chaque frame : un doigt maintenu assez longtemps sur la pelouse lance la course. */
export function updatePointer() {
  if (drag && drag.kind === 'run' && !drag.active && down && performance.now() - down.t > HOLD_MS) activateRun();
}

/** La bouteille tenue vient d'être jetée : on lâche le glissé et on rend la caméra. */
export function releaseBottle(b) {
  if (drag && drag.b === b) { drag = null; controls.enabled = true; canvas.style.cursor = 'default'; }
}
/** La bouteille tenue vient d'être supprimée (annulation). */
export function forgetBottle(b) {
  if (drag?.b === b) drag = null;
}
export function resetPointer() {
  drag = null; controls.enabled = true;
}
