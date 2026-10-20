import * as THREE from 'three';
import { scene } from '../../engine/renderer.js';
import { std, shadowy, hidden } from '../../utils/meshes.js';
import { CHAR_SCALE } from '../../world/constants.js';

export const SKIN = 0xf3c9a8;
export const LOOKS = {
  male: { top: 0x3f6fb5, trim: 0xf6efe2, bottom: 0x2f3542, hair: 0x4a3222, shoe: 0x2b2420 },
  female: { top: 0xe0607a, trim: 0xf6efe2, bottom: 0x3a3f6b, hair: 0xa0522d, shoe: 0x6b3b2a },
};

/** Construit le personnage articulé (homme ou femme) et l'ajoute à la scène. */
export function buildRig(sex) {
  const L = LOOKS[sex], female = sex === 'female';
  const skin = std(SKIN, { roughness: 0.7 }), top = std(L.top, { roughness: 0.8 }), trim = std(L.trim), bottom = std(L.bottom), hair = std(L.hair, { roughness: 0.9 });
  const shoe = std(L.shoe, { roughness: 0.55 }), sole = std(0xf6efe2), gold = std(0xf5c542, { roughness: 0.3, metalness: 0.6 });
  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0) => { const m = shadowy(new THREE.Mesh(geo, mat)); m.position.set(x, y, z); parent.add(m); return m; };
  const root = new THREE.Group(); root.scale.setScalar(CHAR_SCALE);
  const sway = new THREE.Group(); root.add(sway);
  const hips = new THREE.Group(); hips.position.y = 0.5; sway.add(hips);
  const legs = [-1, 1].map(s => {
    const pivot = new THREE.Group(); pivot.position.x = s * 0.1; hips.add(pivot);
    mesh(new THREE.CapsuleGeometry(0.075, 0.3, 4, 10), female ? skin : bottom, pivot, 0, -0.23);
    if (female) mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.05, 10), trim, pivot, 0, -0.4); // socquette
    // chaussure arrondie façon basket : coque + semelle claire
    mesh(new THREE.SphereGeometry(0.085, 14, 10), shoe, pivot, 0, -0.45, 0.035).scale.set(0.95, 0.62, 1.4);
    mesh(new THREE.BoxGeometry(0.15, 0.025, 0.24), sole, pivot, 0, -0.485, 0.035);
    return pivot;
  });
  if (female) {
    mesh(new THREE.CylinderGeometry(0.19, 0.3, 0.3, 18), bottom, hips, 0, -0.04);
    mesh(new THREE.TorusGeometry(0.295, 0.012, 6, 24), trim, hips, 0, -0.18).rotation.x = Math.PI / 2;
  }
  const spine = new THREE.Group(); hips.add(spine);
  const torso = mesh(new THREE.CapsuleGeometry(0.2, 0.28, 6, 16), top, spine, 0, 0.3); if (female) torso.scale.x = 0.92;
  mesh(new THREE.TorusGeometry(0.1, 0.028, 8, 18), trim, spine, 0, 0.6).rotation.x = Math.PI / 2; // col
  if (female) {
    mesh(new THREE.TorusGeometry(0.19, 0.014, 6, 20), trim, spine, 0, 0.36).rotation.x = Math.PI / 2;
  } else {
    mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.08, 16), bottom, spine, 0, 0.02);
    mesh(new THREE.BoxGeometry(0.07, 0.05, 0.02), gold, spine, 0, 0.02, 0.205);
    mesh(new THREE.BoxGeometry(0.035, 0.38, 0.012), trim, spine, 0, 0.31, 0.198); // patte de boutonnage
    for (const y of [0.2, 0.32, 0.44]) mesh(new THREE.SphereGeometry(0.014, 6, 4), std(L.top), spine, 0, y, 0.208);
  }
  const arms = [-1, 1].map(s => {
    const pivot = new THREE.Group(); pivot.position.set(s * 0.25, 0.54, 0); spine.add(pivot);
    mesh(new THREE.CapsuleGeometry(0.068, 0.1, 4, 10), top, pivot, 0, -0.08);
    mesh(new THREE.CapsuleGeometry(0.05, 0.18, 4, 8), skin, pivot, 0, -0.25);
    const hand = mesh(new THREE.SphereGeometry(0.07, 12, 10), skin, pivot, 0, -0.39);
    mesh(new THREE.SphereGeometry(0.03, 8, 6), skin, hand, -s * 0.05, 0.025, 0.03); // pouce
    return { pivot, hand };
  });
  const neck = new THREE.Group(); neck.position.y = 0.66; spine.add(neck);
  mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.12, 10), skin, neck, 0, 0.02);
  const head = new THREE.Group(); head.position.y = 0.25; neck.add(head);
  mesh(new THREE.SphereGeometry(0.27, 24, 18), skin, head);
  for (const s of [-1, 1]) {
    mesh(new THREE.SphereGeometry(0.06, 10, 8), skin, head, s * 0.262, -0.01, 0).scale.set(0.55, 1, 0.8);
    if (female) mesh(new THREE.SphereGeometry(0.022, 8, 6), gold, head, s * 0.27, -0.075, 0.01);
  }
  const black = std(0x221c18, { roughness: 0.3 }), white = std(0xffffff, { roughness: 0.3 });
  const browMat = std(new THREE.Color(L.hair).multiplyScalar(0.7), { roughness: 0.9 });
  const brows = [-1, 1].map(s => {
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.055, 2, 6), browMat);
    b.position.set(s * 0.095, 0.125, 0.228); b.userData.s = s; head.add(b);
    return b;
  });
  const eyes = [-1, 1].map(s => {
    const e = new THREE.Group(); e.position.set(s * 0.095, 0.03, 0.235); head.add(e);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 8), black); ball.scale.set(1, 1.25, 0.6); e.add(ball);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), white); glint.position.set(0.012, 0.02, 0.024); e.add(glint);
    return e;
  });
  const noseMat = std(SKIN, { roughness: 0.6 });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), noseMat); nose.position.set(0, -0.03, 0.265); head.add(nose);
  const cheekMat = new THREE.MeshStandardMaterial({ color: 0xf07a7a, transparent: true, opacity: 0.2, roughness: 1, depthWrite: false });
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 6), cheekMat); c.position.set(s * 0.155, -0.07, 0.21); c.scale.set(1, 0.6, 0.35); c.lookAt(c.position.clone().multiplyScalar(2)); head.add(c); }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 6, 14, Math.PI), black); smile.rotation.z = Math.PI; smile.position.set(0, -0.09, 0.25); head.add(smile);
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), std(0x7a2a2a, { roughness: 0.6 })); mouth.scale.set(1, 0.85, 0.4); mouth.position.set(0, -0.12, 0.245); mouth.visible = false; head.add(mouth);
  const cap = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.29, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), hair)); cap.rotation.x = -0.32; cap.position.y = 0.01; head.add(cap);
  if (female) {
    mesh(new THREE.SphereGeometry(0.3, 20, 14), hair, head, 0, -0.04, -0.11).scale.set(1.06, 1.05, 0.8);
    mesh(new THREE.SphereGeometry(0.1, 12, 10), hair, head, 0, 0.22, -0.2);
    mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 14), std(L.top), head, 0, 0.2, -0.16).rotation.x = 0.9; // chouchou
    mesh(new THREE.SphereGeometry(0.11, 12, 10), hair, head, -0.1, 0.17, 0.17).scale.set(1.3, 0.55, 0.8); // mèche
  } else {
    // houppe sur le devant + épi
    [[-0.1, 0.19, 0.17, 0.07], [0, 0.21, 0.18, 0.075], [0.1, 0.2, 0.16, 0.065]].forEach(([x, y, z, r]) => mesh(new THREE.SphereGeometry(r, 10, 8), hair, head, x, y, z).scale.set(1.1, 0.75, 0.9));
    const tuft = mesh(new THREE.ConeGeometry(0.035, 0.12, 6), hair, head, 0.02, 0.31, -0.02); tuft.rotation.set(-0.4, 0, -0.3);
  }
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.9, 8), hidden); hit.position.y = 0.95; sway.add(hit);
  scene.add(root);
  return { root, sway, hips, spine, neck, head, arms, legs, eyes, brows, noseMat, cheekMat, smile, mouth, hit, hairColor: L.hair };
}

/** Retire un rig de la scène et libère sa mémoire GPU. */
export function disposeRig(rig) {
  scene.remove(rig.root);
  rig.root.traverse(o => { if (o.isMesh) { o.geometry.dispose(); [].concat(o.material).forEach(m => m !== hidden && m.dispose()); } });
}
