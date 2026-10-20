import { LIMITS } from '../core/alcoholCalculator.js';
import { fmtG } from '../utils/format.js';
import { HOME } from '../world/constants.js';
import { post } from '../world/lampPost.js';
import { resetBin } from '../world/bin.js';
import { sim, stats, projection, refreshProjection } from './state.js';
import { ch, setState, pronoun } from './character/character.js';
import { POSE } from './character/animation.js';
import { car, parkCar } from './car.js';
import { stars } from './effects.js';
import { startVomit, clearVomit } from './vomit.js';
import { clearBottles } from './drinks/bottles.js';
import { updateUndo, clearHistory } from './history.js';
import { resetPointer } from '../input/pointer.js';
import { fit } from '../engine/viewport.js';
import { showHint } from '../ui/hint.js';

/** Toucher le perso : il vomit (si c'est encore possible et utile de le montrer). */
export function tapCharacter() {
  const p = pronoun();
  if (ch.state === 'ko' || ch.state === 'getup') return showHint(`Inconscient${p.e} : surtout pas faire vomir — risque d'étouffement. PLS et 15 / 112.`, 5000);
  if (ch.state === 'run') return;
  if (ch.state !== 'idle') return showHint(`Un instant…`, 1200);
  startVomit();
}

/** Toucher la voiture : le perso va prendre le volant, ivre ou non. */
export function tapCar() {
  const p = pronoun(), bac = sim.blood;
  if (car.mode !== 'parked' || ch.state === 'driving' || ch.state === 'toCar') return showHint(`La voiture est déjà en route.`, 1500);
  if (ch.state === 'ko' || ch.state === 'getup') return showHint(`${p.Il} est inconscient${p.e} : incapable de marcher, encore moins de conduire.`, 3500);
  if (ch.state !== 'idle') return showHint(`Un instant…`, 1200);
  ch.drunk = bac >= LIMITS.legal; ch.drunkAt = bac;
  ch.queue.length = 0; updateUndo();
  setState('toCar');
  if (ch.drunk) showHint(`${fmtG(bac)} g/L : au-dessus de la limite légale (0.5 g/L). ${p.Il} prend quand même le volant…`, 3500);
  else if (projection.peak >= LIMITS.legal) showHint(`${fmtG(bac)} g/L pour l'instant — mais l'alcool encore dans l'estomac va ${p.il === 'il' ? 'le' : 'la'} faire monter à ${fmtG(projection.peak)} g/L pendant le trajet.`, 5000);
  else if (bac >= LIMITS.probation) showHint(`${fmtG(bac)} g/L : autorisé… sauf en permis probatoire, où la limite est 0.2 g/L.`, 4000);
  else showHint(`${fmtG(bac)} g/L : ${p.il} peut conduire.`, 2500);
}

/** Bouton « Réinitialiser » : tout revient à l'état de départ (le profil est conservé). */
export function resetGame() {
  sim.reset(); /* [accéléré] simClock = 20 * 3600; */ refreshProjection();
  Object.assign(stats, { drinks: 0, grams: 0, vomits: 0, crashes: 0 });
  clearHistory();
  clearBottles();
  resetBin();
  clearVomit();
  if (ch.glass) { ch.glass.removeFromParent(); ch.glass = null; }
  ch.queue.length = 0; ch.pos.copy(HOME); ch.home.copy(HOME); ch.grab.copy(HOME); ch.runHeld = false; ch.spin = 0; ch.vomitCD = 2;
  resetPointer();
  ch.rig.root.visible = true; car.driver.visible = false; stars.target = null;
  parkCar(); post.target = 0; post.angle = 0; post.vel = 0;
  setState('idle'); Object.assign(ch.pose, POSE);
  fit();
}
