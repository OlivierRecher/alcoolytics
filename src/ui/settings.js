import { sim, refreshProjection } from '../game/state.js';
import { ch, rebuildRig } from '../game/character/character.js';
import { undo } from '../game/history.js';
import { resetGame } from '../game/actions.js';
import { updateModelNote } from './hud.js';
import { sheet, setLevel, untease } from './sheet.js';
import { $ } from './dom.js';

function bindSlider(id, out, fmt, fn) {
  const el = $(id), o = $(out);
  const apply = () => { const v = parseFloat(el.value); o.textContent = fmt(v); fn(v); };
  el.oninput = apply; apply();
}
const setProfile = (k, v) => { sim.setProfile({ [k]: v }); refreshProjection(); updateModelNote(); };

/** Profil (sexe, corps), état de l'estomac, et boutons Réglages / Annuler / Réinitialiser. */
export function initSettings() {
  bindSlider('weight', 'oWeight', v => `${v} kg`, v => setProfile('weight', v));
  bindSlider('height', 'oHeight', v => `${v} cm`, v => setProfile('height', v));
  bindSlider('age', 'oAge', v => `${v} ans`, v => setProfile('age', v));

  document.querySelectorAll('[data-sex]').forEach(b => b.onclick = () => {
    document.querySelectorAll('[data-sex]').forEach(o => o.classList.toggle('on', o === b));
    if (b.dataset.sex === ch.sex) return;
    setProfile('sex', b.dataset.sex);
    rebuildRig(b.dataset.sex);
  });
  document.querySelectorAll('[data-stomach]').forEach(b => b.onclick = () => {
    document.querySelectorAll('[data-stomach]').forEach(o => o.classList.toggle('on', o === b));
    sim.setStomach(b.dataset.stomach); refreshProjection(); updateModelNote();
  });
  $('bCfg').onclick = () => { untease(); setLevel(sheet.level === 2 ? 1 : 2); };
  $('bUndo').onclick = undo;
  // [accéléré]
  // const speedLabel = (s) => `1 s = ${s / 60} min`;
  // $('bSpeed').onclick = (e) => {
  //   speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
  //   e.target.textContent = speedLabel(speed); $('speedLbl').textContent = `×${speed}`;
  // };
  $('bReset').onclick = resetGame;
  updateModelNote();
}
