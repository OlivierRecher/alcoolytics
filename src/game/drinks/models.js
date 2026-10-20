import * as THREE from 'three';
import { std, shadowy } from '../../utils/meshes.js';

const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.35, clearcoat: 1, envMapIntensity: 1.3, side: THREE.DoubleSide, depthWrite: false });
const liquidMat = (c, o = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.2, transparent: true, opacity: o });

/** Couleur de la pastille de chaque boisson dans le menu. */
export const DRINK_LOOK = {
  beer: { dot: '#b0702a' }, pint: { dot: '#e0a33a' }, wine: { dot: '#8a1f3a' },
  champ: { dot: '#ead27a' }, shot: { dot: '#c7dbe0' }, cocktail: { dot: '#7cc96a' },
};

function lathe(points, mat, seg = 18) {
  return shadowy(new THREE.Mesh(new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), seg), mat));
}
function liquidCylinder(r0, r1, h, y0, mat) {
  const g = new THREE.CylinderGeometry(r1, r0, h, 16); g.translate(0, h / 2, 0);
  const m = new THREE.Mesh(g, mat); m.position.y = y0; return m;
}

/** Verre ou bouteille 3D d'une boisson. userData : { liquid (mesh qui se vide), radius }. */
export function makeDrinkModel(id) {
  const g = new THREE.Group();
  let liquid = null, radius = 0.05;
  if (id === 'beer') {
    const brown = new THREE.MeshPhysicalMaterial({ color: 0x7a4a1f, roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.92 });
    g.add(lathe([[0, 0], [0.05, 0], [0.052, 0.01], [0.052, 0.17], [0.03, 0.22], [0.018, 0.26], [0.02, 0.29], [0.016, 0.3], [0, 0.3]], brown));
    const label = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.054, 0.07, 16, 1, true), std(0xf3ecdc)));
    label.position.y = 0.1; g.add(label);
    radius = 0.052;
  } else if (id === 'pint') {
    g.add(lathe([[0, 0], [0.05, 0], [0.052, 0.012], [0.068, 0.25], [0.066, 0.25], [0.048, 0.015], [0, 0.015]], glassMat));
    liquid = liquidCylinder(0.047, 0.064, 0.21, 0.015, liquidMat(0xe0a33a));
    const foam = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.064, 0.03, 16), std(0xfaf6ec)); foam.position.y = 0.21; liquid.add(foam);
    radius = 0.068;
  } else if (id === 'wine') {
    g.add(lathe([[0, 0], [0.05, 0], [0.05, 0.006], [0.008, 0.012], [0.007, 0.1], [0.045, 0.13], [0.052, 0.18], [0.04, 0.23], [0.039, 0.23], [0.05, 0.18], [0.044, 0.135], [0.006, 0.106], [0, 0.106]], glassMat));
    liquid = liquidCylinder(0.035, 0.05, 0.05, 0.11, liquidMat(0x8a1f3a, 0.9));
    radius = 0.05;
  } else if (id === 'champ') {
    g.add(lathe([[0, 0], [0.045, 0], [0.045, 0.006], [0.007, 0.012], [0.006, 0.1], [0.026, 0.13], [0.03, 0.26], [0.029, 0.26], [0.024, 0.135], [0.005, 0.106], [0, 0.106]], glassMat));
    liquid = liquidCylinder(0.018, 0.027, 0.12, 0.11, liquidMat(0xead27a, 0.8));
    radius = 0.045;
  } else if (id === 'shot') {
    g.add(lathe([[0, 0], [0.032, 0], [0.036, 0.1], [0.033, 0.1], [0.026, 0.03], [0, 0.03]], glassMat));
    liquid = liquidCylinder(0.026, 0.032, 0.06, 0.03, liquidMat(0xc7dbe0, 0.6));
    radius = 0.036;
  } else { // cocktail : tumbler, paille, rondelle de citron vert
    g.add(lathe([[0, 0], [0.055, 0], [0.058, 0.17], [0.055, 0.17], [0.052, 0.02], [0, 0.02]], glassMat));
    liquid = liquidCylinder(0.05, 0.053, 0.13, 0.02, liquidMat(0x9fd67a, 0.75));
    const straw = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.24, 6), std(0xe06b5a)));
    straw.position.set(0.018, 0.15, 0); straw.rotation.z = -0.2; g.add(straw);
    const lime = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.008, 12), std(0x8fcf4a)));
    lime.position.set(-0.05, 0.17, 0); lime.rotation.x = Math.PI / 2; g.add(lime);
    radius = 0.058;
  }
  if (liquid) g.add(liquid);
  g.userData = { liquid, radius };
  return g;
}
