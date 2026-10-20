import { sim, stats, refreshProjection } from '../state.js';
import { CHAR_SCALE, GLASS_SCALE } from '../../world/constants.js';
import { ch, setState, pronoun } from '../character/character.js';
import { remember, pushHistory } from '../history.js';
import { showHint } from '../../ui/hint.js';
import { makeDrinkModel } from './models.js';

/** Le perso porte le verre à la bouche : l'alcool arrive dans l'estomac. */
export function startDrink(entry) {
  const { d } = entry;
  setState('drink');
  remember(entry);
  sim.drink(d.grams);
  stats.drinks++; stats.grams += d.grams;
  ch.drink = d;
  const g = makeDrinkModel(d.id);
  g.scale.setScalar(GLASS_SCALE / CHAR_SCALE);
  g.position.set(0, -0.16, 0.05);
  ch.rig.arms[0].hand.add(g);
  ch.glass = g;
  entry.glass = g;
  refreshProjection();
}

/** Servir un verre : bu tout de suite, ou mis en file d'attente (3 max) si le perso est occupé. */
export function serve(d) {
  const p = pronoun();
  if (ch.state === 'ko' || ch.state === 'getup') return showHint(`On ne fait jamais boire quelqu'un d'inconscient.`, 3000);
  if (['toCar', 'driving', 'dizzy'].includes(ch.state)) return showHint(`Pas d'alcool au volant.`, 2000);
  if (ch.state !== 'idle' && ch.queue.length >= 3) return showHint(`${p.Il} n'a que deux mains.`, 1500);
  const entry = { kind: 'drink', label: d.label, d };
  if (ch.state === 'idle') startDrink(entry); else ch.queue.push(entry);
  pushHistory(entry);
}
