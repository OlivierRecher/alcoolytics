import { $ } from './dom.js';

const hint = $('hint');
let hintTimer = 0;

/** Bulle d'explication en bas de l'écran, masquée après `ms`. */
export function showHint(text, ms = 2500) {
  hint.textContent = text; hint.classList.add('show');
  clearTimeout(hintTimer); hintTimer = setTimeout(() => hint.classList.remove('show'), ms);
}
