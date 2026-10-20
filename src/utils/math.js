import * as THREE from 'three';

export const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const rand = (a, b) => a + Math.random() * (b - a);
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const noise = (t) => (Math.sin(t * 1.3) + 0.6 * Math.sin(t * 2.17 + 1.3) + 0.35 * Math.sin(t * 3.71 + 2.1)) / 1.95;
export const dampAngle = (a, b, k) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * k; };
