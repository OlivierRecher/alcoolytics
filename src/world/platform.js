import * as THREE from 'three';
import { scene } from '../engine/renderer.js';
import { rand } from '../utils/math.js';
import { std, shadowy } from '../utils/meshes.js';
import { S, HALF, ROAD_C, ROAD_R, ROAD_H, ROAD_W, LAWN, PARK } from './constants.js';

function roundedRect(half, r) {
  const s = new THREE.Shape();
  s.moveTo(-half + r, -half); s.lineTo(half - r, -half); s.absarc(half - r, -half + r, r, -Math.PI / 2, 0);
  s.lineTo(half, half - r); s.absarc(half - r, half - r, r, 0, Math.PI / 2);
  s.lineTo(-half + r, half); s.absarc(-half + r, half - r, r, Math.PI / 2, Math.PI);
  s.lineTo(-half, -half + r); s.absarc(-half + r, -half + r, r, Math.PI, Math.PI * 1.5);
  return s;
}
function flat(shape, color, y) {
  const g = new THREE.ShapeGeometry(shape, 24); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, std(color, { roughness: 1 })); m.position.y = y; m.receiveShadow = true;
  scene.add(m); return m;
}

// Road centerline as a closed curve, starting at the parking spot, heading +x
export const roadCurve = (() => {
  const pts = [], c = ROAD_C, r = ROAD_R, h = ROAD_H;
  const line = (x0, z0, x1, z1, n) => { for (let i = 0; i < n; i++) { const t = i / n; pts.push(new THREE.Vector3(x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t)); } };
  const arc = (cx, cz, a0, a1, n) => { for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push(new THREE.Vector3(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r)); } };
  line(PARK.x, h, c, h, 8); arc(c, c, Math.PI / 2, 0, 6);
  line(h, c, h, -c, 8); arc(c, -c, 0, -Math.PI / 2, 6);
  line(c, -h, -c, -h, 8); arc(-c, -c, -Math.PI / 2, -Math.PI, 6);
  line(-h, -c, -h, c, 8); arc(-c, c, Math.PI, Math.PI / 2, 6);
  line(-c, h, PARK.x, h, 2);
  return new THREE.CatmullRomCurve3(pts, true, 'centripetal');
})();

/** Bloc de terre en strates, galets, ombre portée, route, pelouse et marquages. */
export function createPlatform() {
  const layers = [
    [0xeee6d4, 0, -0.14], [0xd9cfbd, -0.14, -0.2], [0xf1eadb, -0.2, -0.95],
    [0xdcc39c, -0.95, -1.55], [0xc4a37a, -1.55, -2.2],
  ];
  for (const [color, top, bot] of layers) {
    const m = shadowy(new THREE.Mesh(new THREE.BoxGeometry(S, top - bot, S), std(color, { roughness: 1 })));
    m.position.y = (top + bot) / 2;
    scene.add(m);
  }
  { // pebbles on the visible faces
    const peb = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), std(0xfbf6ec), 160);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    for (let i = 0; i < 160; i++) {
      const face = i % 4, t = rand(-HALF + 0.1, HALF - 0.1), y = rand(-2.1, -1.1);
      if (face === 0) p.set(t, y, HALF); else if (face === 1) p.set(HALF, y, t);
      else if (face === 2) p.set(t, y, -HALF); else p.set(-HALF, y, t);
      const r = rand(0.025, 0.055);
      s.set(r, r * 0.7, r);
      peb.setMatrixAt(i, m.compose(p, q, s));
    }
    scene.add(peb);
  }
  { // shadow catcher
    const g = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.12 }));
    g.rotation.x = -Math.PI / 2; g.position.y = -2.2; g.receiveShadow = true;
    scene.add(g);
  }
  { // road ring + lawn
    const ring = roundedRect(ROAD_H + ROAD_W / 2, ROAD_R + ROAD_W / 2);
    ring.holes.push(roundedRect(LAWN, ROAD_R - ROAD_W / 2));
    flat(ring, 0x6b6560, 0.004);
    flat(roundedRect(LAWN, ROAD_R - ROAD_W / 2), 0xcfd8ae, 0.002);
  }
  { // dashes
    const dashMat = std(0xf3ecdc, { roughness: 1 }), dashGeo = new THREE.BoxGeometry(0.04, 0.01, 0.26);
    const n = 46, p = new THREE.Vector3(), t = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      roadCurve.getPointAt(i / n, p); roadCurve.getTangentAt(i / n, t);
      const d = new THREE.Mesh(dashGeo, dashMat);
      d.position.set(p.x, 0.008, p.z); d.rotation.y = Math.atan2(t.x, t.z);
      scene.add(d);
    }
    // parking box
    const box = new THREE.Group();
    for (const [x, z, w, d] of [[-0.95, 0, 0.04, 1.0], [0.95, 0, 0.04, 1.0]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.01, d), dashMat); m.position.set(x, 0.008, z); box.add(m);
    }
    box.position.copy(PARK); scene.add(box);
  }
}
