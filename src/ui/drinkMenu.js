import { DRINKS } from '../core/alcoholCalculator.js';
import { DRINK_LOOK } from '../game/drinks/models.js';
import { serve } from '../game/drinks/drinking.js';
import { $ } from './dom.js';

/** Grille « Servir un verre » : un bouton par boisson du catalogue. */
export function createDrinkMenu() {
  const grid = $('drinkGrid');
  for (const d of DRINKS) {
    const b = document.createElement('button');
    b.className = 'drink';
    b.style.setProperty('--c', DRINK_LOOK[d.id].dot);
    b.innerHTML = `<i></i>${d.label}<small>${d.grams.toFixed(0)} g</small>`;
    b.title = `${d.label} — ${d.detail} — ${d.grams.toFixed(1)} g d'alcool pur`;
    b.onclick = () => {
      b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
      serve(d);
    };
    grid.appendChild(b);
  }
}
