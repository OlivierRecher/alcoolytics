import { camera } from '../engine/renderer.js';
import { clamp01 } from '../utils/math.js';
import { $ } from './dom.js';

// Tiroir mobile à 3 crans : jauge · + verres · + profil
const panel = $('panel');
export const isMobile = () => innerWidth <= 720;
export const sheet = { level: 2, h: 0, snaps: [0, 0, 0], v: 0, raf: 0, last: 0, target: 0 };
export const SHEET_TOP = 70;
const sheetParts = [panel.querySelector('.meter'), panel.querySelector('.drinks'), ...panel.querySelectorAll('.cfg')];

function measureSheet() {
  const pad = parseFloat(getComputedStyle(panel).paddingBottom) || 0;
  const bottom = (el) => panel.clientTop + el.offsetTop + el.offsetHeight + pad;
  const max = innerHeight - SHEET_TOP - 20;
  sheet.snaps = [bottom(sheetParts[0]), bottom(sheetParts[1]), bottom(sheetParts[sheetParts.length - 1])].map(h => Math.min(max, h));
}
function setSheetH(h) {
  sheet.h = h;
  panel.style.height = `${h}px`;
  // Sections fade in as the sheet uncovers them
  for (const el of sheetParts.slice(1)) el.style.opacity = clamp01((h - el.offsetTop - 6) / (el.offsetHeight * 0.6)).toFixed(3);
  frameSheet();
}
export function frameSheet() {
  const W = innerWidth, H = innerHeight;
  // Scene follows the sheet, without zooming past the profile level
  const ph = Math.min(sheet.h, H * 0.55);
  camera.setViewOffset(W, H, 0, (ph - SHEET_TOP) / 2, W, H);
  camera.updateProjectionMatrix();
  document.documentElement.style.setProperty('--ph', `${sheet.h}px`);
}
export function setLevel(lvl, v = 0) {
  sheet.level = lvl;
  panel.dataset.level = lvl;
  $('bCfg').setAttribute('aria-expanded', lvl === 2);
  panel.classList.remove('scroll');
  if (lvl < 2) panel.scrollTop = 0;
  springTo(sheet.snaps[lvl], v);
}
// Critically-damped spring, seeded with the release velocity
function springTo(target, v = 0) {
  sheet.target = target; sheet.v = Math.max(-2500, Math.min(2500, v));
  if (!sheet.raf) { sheet.last = performance.now(); sheet.raf = requestAnimationFrame(stepSheet); }
}
function stepSheet(t) {
  const dt = Math.min(0.032, (t - sheet.last) / 1000); sheet.last = t;
  const K = 220, C = 2 * Math.sqrt(K) * 0.95;
  let h = sheet.h;
  for (let i = 0; i < 4; i++) {
    sheet.v += (-K * (h - sheet.target) - C * sheet.v) * dt / 4;
    h += sheet.v * dt / 4;
  }
  if (Math.abs(h - sheet.target) < 0.5 && Math.abs(sheet.v) < 8) {
    setSheetH(sheet.target); sheet.raf = 0;
    panel.classList.toggle('scroll', sheet.level === 2 && panel.scrollHeight > panel.clientHeight + 1);
    return;
  }
  setSheetH(h);
  sheet.raf = requestAnimationFrame(stepSheet);
}
const stopSpring = () => { cancelAnimationFrame(sheet.raf); sheet.raf = 0; };
function release(v) {
  const s = sheet.snaps, h = sheet.h;
  let lvl = 0;
  // A flick goes to the next snap in its direction; a slow drop takes the nearest one
  if (v > 350) { const i = s.findIndex(x => x > h + 4); lvl = i === -1 ? 2 : i; }
  else if (v < -350) lvl = Math.max(0, s.findLastIndex(x => x < h - 4));
  else s.forEach((x, i) => { if (Math.abs(x - h) < Math.abs(s[lvl] - h)) lvl = i; });
  setLevel(lvl, v);
}
function rubber(h) {
  const lo = sheet.snaps[0], hi = sheet.snaps[2];
  if (h < lo) return lo - (lo - h) * 0.3;
  if (h > hi) return hi + (h - hi) * 0.3;
  return h;
}

// First-run teaching: open on the profile, wiggle to show it moves
export function untease() { panel.classList.remove('nudge', 'teach'); }
export function tease() {
  if (!isMobile()) return;
  panel.classList.add('nudge', 'teach');
  setTimeout(untease, 4800);
}

/** Glisser au doigt, molette / trackpad, et tap ou clavier sur la poignée. */
export function initSheet() {
  let sd = null;
  panel.addEventListener('touchstart', (e) => {
    if (!isMobile() || e.touches.length > 1 || e.target.closest('input[type=range]')) { sd = null; return; }
    const t = e.touches[0];
    sd = { x0: t.clientX, y0: t.clientY, h0: sheet.h, on: false, y: t.clientY, t: performance.now(), v: 0 };
  }, { passive: true });
  panel.addEventListener('touchmove', (e) => {
    if (!sd) return;
    const t = e.touches[0], dy = t.clientY - sd.y0, dx = t.clientX - sd.x0;
    if (!sd.on) {
      if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
      if (Math.abs(dx) > Math.abs(dy)) { sd = null; return; }
      // Fully open and scrollable: let the content scroll unless pulling down from its top
      const scrolls = panel.classList.contains('scroll');
      if (scrolls && (panel.scrollTop > 0 || dy < 0)) { sd = null; return; }
      sd.on = true; sd.y0 = t.clientY; sd.h0 = sheet.h;
      stopSpring(); untease(); panel.classList.remove('scroll');
    }
    e.preventDefault();
    const now = performance.now(), dt = Math.max(1, now - sd.t);
    sd.v = sd.v * 0.4 + ((sd.y - t.clientY) / dt * 1000) * 0.6;
    sd.y = t.clientY; sd.t = now;
    setSheetH(rubber(sd.h0 - (t.clientY - sd.y0)));
  }, { passive: false });
  const endDrag = () => {
    if (sd?.on) release(performance.now() - sd.t > 100 ? 0 : sd.v);
    sd = null;
  };
  panel.addEventListener('touchend', endDrag);
  panel.addEventListener('touchcancel', endDrag);

  // Wheel / trackpad: one notch per gesture
  let wheelAcc = 0, wheelLock = 0;
  panel.addEventListener('wheel', (e) => {
    if (!isMobile()) return;
    if (panel.classList.contains('scroll') && (panel.scrollTop > 0 || e.deltaY > 0)) return;
    e.preventDefault();
    const now = performance.now();
    if (now < wheelLock) return;
    wheelAcc += e.deltaY;
    if (Math.abs(wheelAcc) < 40) return;
    const lvl = Math.max(0, Math.min(2, sheet.level + Math.sign(wheelAcc)));
    wheelAcc = 0; wheelLock = now + 450; untease();
    if (lvl !== sheet.level) setLevel(lvl);
  }, { passive: false });

  const cycleSheet = () => { untease(); setLevel(sheet.level === 2 ? 0 : sheet.level + 1); };
  $('grip').onclick = cycleSheet;
  $('grip').onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycleSheet(); } };
}

export function layoutSheet() {
  if (!isMobile()) {
    stopSpring(); untease(); panel.classList.remove('scroll');
    panel.style.height = ''; sheetParts.forEach(el => el.style.opacity = '');
    return;
  }
  measureSheet();
  stopSpring();
  setSheetH(sheet.snaps[sheet.level]);
  panel.dataset.level = sheet.level;
  panel.classList.toggle('scroll', sheet.level === 2 && panel.scrollHeight > panel.clientHeight + 1);
}
