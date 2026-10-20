import * as THREE from 'three';

export const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
export const shadowy = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
/** Matériau invisible des zones de clic. */
export const hidden = new THREE.MeshBasicMaterial({ visible: false });

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

const _q = new THREE.Quaternion();
export function setWorldQuaternion(obj, q) {
  obj.parent.getWorldQuaternion(_q);
  obj.quaternion.copy(_q.invert().multiply(q));
}
