import { $ } from '../ui/dom.js';

/** Icône de l'appli (le verre) dessinée en PNG à la taille demandée. */
function icon(size) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), k = size / 64;
  g.fillStyle = '#ece9e4'; g.fillRect(0, 0, size, size);
  g.scale(k, k); g.lineJoin = 'round';
  g.fillStyle = '#fff'; g.strokeStyle = '#2a2622'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(20, 14); g.lineTo(44, 14); g.lineTo(41, 44); g.arc(32, 44, 9, 0, Math.PI); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#e0a33a'; g.beginPath(); g.moveTo(22.5, 30); g.lineTo(41.5, 30); g.lineTo(40.1, 44); g.arc(32, 44, 7.6, 0, Math.PI); g.closePath(); g.fill();
  return c.toDataURL('image/png');
}

/** Manifeste PWA généré à l'exécution (start_url / scope suivent l'URL de déploiement) + icône Apple. */
export function installManifest() {
  const base = location.href.split('#')[0];
  const manifest = {
    name: 'Alcoolytics — simulateur d\'alcoolémie', short_name: 'Alcoolytics', lang: 'fr',
    start_url: base, scope: new URL('./', base).href, display: 'standalone', orientation: 'portrait',
    background_color: '#ece9e4', theme_color: '#ece9e4',
    icons: [192, 512].map(s => ({ src: icon(s), sizes: `${s}x${s}`, type: 'image/png', purpose: 'any maskable' })),
  };
  $('manifest').href = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }));
  const apple = document.createElement('link'); apple.rel = 'apple-touch-icon'; apple.href = icon(180); document.head.appendChild(apple);
}
