import * as THREE from 'three';
import { scene } from '../engine/renderer.js';
import { std, shadowy } from '../utils/meshes.js';
import { POST } from './constants.js';

/** Le poteau (lampadaire) : il ploie sous le choc de la voiture puis se redresse en ressort. */
export const post = { g: new THREE.Group(), angle: 0, vel: 0, target: 0, axis: new THREE.Vector3(1, 0, 0), bulb: null };

export function createLampPost() {
  const metal = std(0x3b3734, { roughness: 0.5, metalness: 0.3 });
  const add = (geo, mat, x, y, z) => { const m = shadowy(new THREE.Mesh(geo, mat)); m.position.set(x, y, z); post.g.add(m); return m; };
  add(new THREE.CylinderGeometry(0.11, 0.13, 0.12, 10), metal, 0, 0.06, 0);
  add(new THREE.CylinderGeometry(0.045, 0.06, 2.0, 10), metal, 0, 1.0, 0);
  for (let i = 0; i < 3; i++) add(new THREE.CylinderGeometry(0.062, 0.062, 0.1, 10), std(i % 2 ? 0xf6efe2 : 0xe06b5a), 0, 0.35 + i * 0.1, 0);
  add(new THREE.BoxGeometry(0.04, 0.04, 0.42), metal, 0, 1.97, 0.2);
  add(new THREE.BoxGeometry(0.16, 0.08, 0.26), metal, 0, 1.94, 0.42);
  post.bulb = add(new THREE.BoxGeometry(0.12, 0.02, 0.2), new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffc86a, emissiveIntensity: 0.6 }), 0, 1.895, 0.42);
  post.g.position.copy(POST);
  scene.add(post.g);
}

export function updatePost(dt) {
  post.vel += ((post.target - post.angle) * 60 - post.vel * 6) * dt;
  post.angle += post.vel * dt;
  post.g.quaternion.setFromAxisAngle(post.axis, post.angle);
}
