import { fmtG, fmtDur } from '../utils/format.js';
import { sim, stats, speed, refreshProjection } from './state.js';
import { $ } from '../ui/dom.js';
import { showHint } from '../ui/hint.js';

// L'alcool continue d'agir quand l'onglet est masqué ou l'appli fermée : requestAnimationFrame
// est alors suspendu, donc la simulation suit l'horloge murale (Date.now) et non les frames.
// Au retour, on rattrape tout le temps écoulé via sim.step, qui sous-découpe en pas de 30 s
// simulées (stable même pour plusieurs heures). L'état est sauvé dans localStorage avec son
// horodatage pour reprendre aussi après fermeture / réouverture de la page.

const KEY = 'alcoolytics:sim';
const VERSION = 1;
/** Grandeurs du modèle sauvegardées (en grammes / heures). */
const FIELDS = ['stomach', 'body', 'elapsed', 'ingested', 'expelled', 'firstPass', 'eliminated', 'maxBlood'];
/** Rattrapage plafonné à 72 h : même un coma à 5 g/L est entièrement éliminé bien avant. */
export const MAX_CATCHUP_H = 72;
const SAVE_EVERY = 2;   // s réelles entre deux sauvegardes périodiques
const AWAY_HINT = 1 / 60; // h : en dessous d'une minute d'absence, rien à signaler

let last = Date.now(), saveT = 0;

/** Avance le modèle du temps mural écoulé depuis le dernier appel. Renvoie les heures simulées. */
export function advanceSim() {
  const now = Date.now();
  const hours = Math.min(MAX_CATCHUP_H, Math.max(0, now - last) / 1000 * speed / 3600);
  last = now;
  if (hours > 0) sim.step(hours);
  return hours;
}

export function saveState() {
  const data = { v: VERSION, t: Date.now(), profile: sim.profile, stomachState: sim.stomachState, stats: { ...stats } };
  for (const k of FIELDS) data[k] = sim[k];
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* stockage indisponible (navigation privée…) */ }
}

function loadState() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    return data?.v === VERSION && FIELDS.every(k => Number.isFinite(data[k])) ? data : null;
  } catch { return null; }
}

/** Remet un réglage via l'interface, pour que curseurs, boutons et personnage restent cohérents. */
function applySlider(id, v) {
  const el = $(id);
  if (!Number.isFinite(v) || String(v) === el.value) return;
  el.value = v; el.dispatchEvent(new Event('input'));
}
const press = (attr, v) => document.querySelector(`[data-${attr}="${v}"]:not(.on)`)?.click();

/** Rattrape le temps de fermeture / mise en arrière-plan. Renvoie true s'il a été signalé. */
function catchUp() {
  const active = sim.blood > 0.005 || sim.stomach > 0.05;
  const hours = advanceSim();
  refreshProjection();
  if (hours < AWAY_HINT || !active) return false;
  showHint(`${fmtDur(hours)} écoulées entre-temps : l'alcool a continué d'agir. Alcoolémie : ${fmtG(sim.blood)} g/L.`, 4500);
  return true;
}

/**
 * Restaure la dernière session (profil, estomac, grammes, compteurs) puis rattrape le temps
 * écoulé depuis sa sauvegarde. À appeler après initSettings. Renvoie true si le retour a été signalé.
 */
export function restoreState() {
  const data = loadState();
  if (!data) return false;
  const p = data.profile ?? {};
  applySlider('weight', p.weight); applySlider('height', p.height); applySlider('age', p.age);
  press('sex', p.sex);
  press('stomach', data.stomachState);
  for (const k of FIELDS) sim[k] = data[k];
  Object.assign(stats, data.stats);
  last = Math.min(Date.now(), data.t);
  return catchUp();
}

/** Sauvegarde périodique, appelée à chaque frame avec le dt réel. */
export function tickSave(dt) { if ((saveT += dt) > SAVE_EVERY) { saveT = 0; saveState(); } }

/** Masquage : on sauve (la page peut être tuée sans prévenir). Retour : on rattrape. */
export function initPersistence() {
  document.addEventListener('visibilitychange', () => (document.hidden ? saveState() : catchUp()));
  addEventListener('pagehide', saveState);
  addEventListener('pageshow', (e) => { if (e.persisted) catchUp(); }); // retour depuis le bfcache
}
