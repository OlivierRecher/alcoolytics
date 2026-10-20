import { fmtG } from '../utils/format.js';
import { sim, stats, refreshProjection } from './state.js';
import { ch, setState } from './character/character.js';
import { removeBottle } from './drinks/bottles.js';
import { removePuddle } from './vomit.js';
import { $ } from '../ui/dom.js';
import { showHint } from '../ui/hint.js';

// Annuler la dernière action (conso ou vomi).
// Temps réel : on restaure l'état d'avant l'action puis on rejoue le temps écoulé depuis.
const history = [];
export function remember(entry) { entry.snap = { ...sim }; entry.stats = { ...stats }; }
export function pushHistory(entry) {
  history.push(entry);
  if (history.length > 30) history.shift();
  updateUndo();
}
export function updateUndo() {
  // une conso jamais servie (file vidée au volant ou au KO) n'est plus annulable
  while (history.length && !history.at(-1).snap && !ch.queue.includes(history.at(-1))) history.pop();
  const last = history.at(-1);
  $('bUndo').disabled = !last;
  $('bUndo').textContent = last ? `Annuler · ${last.label}` : 'Annuler';
}
export function undo() {
  updateUndo();
  const e = history.pop();
  if (!e) return;
  if (!e.snap) { ch.queue.splice(ch.queue.indexOf(e), 1); updateUndo(); return showHint(`Annulé : ${e.label.toLowerCase()} (pas encore servi).`, 1800); }
  const now = sim.elapsed;
  Object.assign(sim, e.snap, { profile: sim.profile, stomachState: sim.stomachState });
  sim.step(Math.max(0, now - sim.elapsed));
  Object.assign(stats, e.stats);
  if (e.kind === 'drink') {
    if (ch.glass && ch.glass === e.glass) { ch.glass.removeFromParent(); ch.glass = null; if (ch.state === 'drink') setState('idle'); }
    removeBottle(e.glass);
  } else {
    if (ch.state === 'vomit') { setState('idle'); ch.rig.mouth.visible = false; ch.rig.smile.visible = true; }
    if (e.puddle) removePuddle(e.puddle);
  }
  refreshProjection(); updateUndo();
  showHint(`Annulé : ${e.label.toLowerCase()}. Alcoolémie recalculée : ${fmtG(sim.blood)} g/L.`, 2500);
}
export function clearHistory() { history.length = 0; updateUndo(); }
