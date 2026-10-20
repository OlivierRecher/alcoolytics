import { STOMACH, THRESHOLDS, LIMITS } from '../core/alcoholCalculator.js';
import { fmtG, fmtDur } from '../utils/format.js';
import { sim, stats, projection } from '../game/state.js';
import { ch } from '../game/character/character.js';
import { $ } from './dom.js';

const LEVELS = [
  [THRESHOLDS.coma, 'Coma éthylique', '--coma'],
  [THRESHOLDS.vomit, 'Nausées', '--bad'],
  [THRESHOLDS.stagger, 'Titube', '--high'],
  [THRESHOLDS.dance, 'Désinhibé', '--high'],
  [LIMITS.offence, 'Délit routier', '--warn'],
  [LIMITS.legal, 'Interdit au volant', '--warn'],
  [LIMITS.probation, 'Interdit jeune permis', '--ok'],
  [0.02, 'Légal', '--ok'],
  [-1, 'Sobre', '--ok'],
];
const levelOf = (c) => LEVELS.find(([t]) => c >= t);
const G_MAX = 3.5; // g/L en bout de jauge

/** Jauge d'alcoolémie, pic à venir, estimations, alerte coma, horloge et compteurs. Appelé à chaque frame. */
export function updateUI() {
  const c = sim.blood, pr = projection;
  const peak = Math.max(pr.peak, c);
  const [, label, varNow] = levelOf(c);
  const [, , varPeak] = levelOf(peak);
  document.documentElement.style.setProperty('--lvl', `var(${varNow})`);
  document.documentElement.style.setProperty('--peak', `var(${varPeak})`);
  $('vNow').textContent = fmtG(c);
  $('vLevel').textContent = label;
  $('gNow').style.width = `${Math.min(1, c / G_MAX) * 100}%`;
  $('gPeak').style.width = `${Math.min(1, peak / G_MAX) * 100}%`;
  $('gPeak').style.opacity = peak - c > 0.005 ? 1 : 0;
  $('vBlood').textContent = `${fmtG(c)} g/L`;
  $('vPeak').textContent = peak - c > 0.005 ? `${fmtG(peak)} g/L · ${fmtDur(pr.peakIn)}` : `${fmtG(c)} g/L · atteint`;
  const st = sim.stomachGrams;
  $('vStomach').textContent = st > 0.05 ? `${st.toFixed(0)} g · +${fmtG(sim.pendingBlood)}` : '0 g';

  let eta;
  if (c < 0.01 && st < 0.05) eta = 'Rien dans le sang.';
  else if (c >= LIMITS.legal) eta = `Sous 0.5 g/L dans <b>${fmtDur(pr.legalIn)}</b> <em>· élimination complète dans ${fmtDur(pr.soberIn)}</em>`;
  else if (pr.exceedIn !== null) eta = `Dépassera 0.5 g/L dans <b>${fmtDur(pr.exceedIn)}</b> <em>· l'estomac n'a pas fini de digérer</em>`;
  else eta = `Sous la limite légale <em>· tout éliminé dans ${fmtDur(pr.soberIn)}</em>`;
  if (peak >= THRESHOLDS.coma && c < THRESHOLDS.coma) eta = `<b style="color:var(--coma)">Danger : le pic à venir dépasse 3 g/L.</b> <em>Coma éthylique dans ${fmtDur(pr.peakIn)}</em>`;
  if ($('vEta').innerHTML !== eta) $('vEta').innerHTML = eta;

  $('alert').classList.toggle('show', ch.state === 'ko');
  // [accéléré] const hh = Math.floor(simClock / 3600) % 24, mm = Math.floor(simClock / 60) % 60;
  const now = new Date(), hh = now.getHours(), mm = now.getMinutes();
  $('clock').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  $('sCount').textContent = stats.drinks;
  $('sGrams').textContent = `${stats.grams.toFixed(0)} g`;
  $('sVomit').textContent = stats.vomits;
}

/** Note sous le profil : paramètres du modèle pour le corps et l'estomac choisis. */
export function updateModelNote() {
  const vmax = sim.vmax, s = STOMACH[sim.stomachState];
  $('vModel').innerHTML = `Diffusion r = ${sim.widmark.toFixed(2)} L/kg (${sim.volume.toFixed(0)} L) · élimination ≈ ${vmax.toFixed(2)} g/L/h · absorption ½ en ${Math.round(Math.LN2 / s.ka * 60)} min, ${Math.round(sim.bioavailability * 100)} % atteint le sang.`;
}
