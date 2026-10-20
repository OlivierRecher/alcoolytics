import { AlcoholSimulation } from '../core/alcoholCalculator.js';

export const sim = new AlcoholSimulation({ sex: 'male', weight: 75, height: 178, age: 30 }, 'light');
// Temps réel : 1 s simulée = 1 s réelle, l'horloge affiche l'heure locale.
// [accéléré] Pour retester le temps accéléré, décommenter les blocs marqués [accéléré].
// export const SPEEDS = [60, 120, 300, 900];        // secondes simulées par seconde réelle
// export let speed = 120, simClock = 20 * 3600;
export const speed = 1;
export const stats = { drinks: 0, grams: 0, vomits: 0, crashes: 0 };

/** Projection « sans rien boire de plus », recalculée après chaque action et toutes les 0,25 s. */
export let projection = sim.project();
let projT = 0;
export function refreshProjection() { projection = sim.project(); projT = 0; }
export function tickProjection(dt) { if ((projT += dt) > 0.25) refreshProjection(); }
