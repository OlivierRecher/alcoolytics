import * as THREE from 'three';
import { scene } from '../engine/renderer.js';
import { frame } from '../engine/time.js';
import { rand, smooth } from '../utils/math.js';
import { std, shadowy } from '../utils/meshes.js';

// Oiseaux de passage : une volée en V traverse le ciel de temps en temps.
const birds = { list: [], next: 2.5 };
const birdMat = std(0x6b625a, { roughness: 0.7, side: THREE.DoubleSide });
const wingGeo = (() => {
  const sh = new THREE.Shape(); sh.moveTo(0, -0.045); sh.lineTo(0.13, -0.02); sh.lineTo(0.22, 0.01); sh.lineTo(0, 0.05); sh.closePath();
  return new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2);
})();
const birdBody = new THREE.SphereGeometry(0.045, 10, 8), birdHead = new THREE.SphereGeometry(0.03, 8, 6), beakGeo = new THREE.ConeGeometry(0.012, 0.04, 5).rotateX(Math.PI / 2);

function spawnFlock() {
  const n = 3 + Math.floor(rand(0, 3)), a = rand(0, Math.PI * 2);
  const dx = Math.sin(a), dz = Math.cos(a), off = rand(-3, 3), y = rand(3.8, 5.2), speed = rand(2, 2.6);
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group(); g.scale.setScalar(rand(0.9, 1.1));
    const body = shadowy(new THREE.Mesh(birdBody, birdMat)); body.scale.set(0.8, 0.7, 1.6); g.add(body);
    const head = new THREE.Mesh(birdHead, birdMat); head.position.set(0, 0.02, 0.07); g.add(head);
    const beak = new THREE.Mesh(beakGeo, std(0xe0a33a)); beak.position.set(0, 0.015, 0.105); g.add(beak);
    const wings = [-1, 1].map(s => { const w = shadowy(new THREE.Mesh(wingGeo, birdMat)); w.scale.x = s; w.position.set(s * 0.02, 0.01, 0); g.add(w); return w; });
    const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
    // formation en V : chaque rang un peu derrière et sur le côté
    const bx = -dx * (14 + row * 0.45) + dz * (off + side * row * 0.4), bz = -dz * (14 + row * 0.45) - dx * (off + side * row * 0.4);
    g.position.set(bx, y + rand(-0.15, 0.15), bz); g.rotation.y = a;
    scene.add(g);
    birds.list.push({ g, wings, dx, dz, speed, phase: rand(0, 6), dist: 0 });
  }
}

export function updateBirds(dt) {
  const time = frame.time;
  if ((birds.next -= dt) <= 0) { spawnFlock(); birds.next = rand(9, 18); }
  for (let i = birds.list.length - 1; i >= 0; i--) {
    const b = birds.list[i], step = b.speed * dt;
    b.dist += step;
    b.g.position.x += b.dx * step; b.g.position.z += b.dz * step;
    b.g.position.y += Math.sin(time * 1.3 + b.phase) * 0.12 * dt;
    // battements entrecoupés de planés
    const flap = 0.25 + 0.75 * smooth(-0.2, 0.4, Math.sin(time * 0.9 + b.phase));
    const w = Math.sin(time * 15 + b.phase) * 0.75 * flap + 0.1;
    b.wings[0].rotation.z = w; b.wings[1].rotation.z = -w;
    b.g.rotation.z = Math.sin(time * 0.8 + b.phase) * 0.1;
    if (b.dist > 30) { scene.remove(b.g); birds.list.splice(i, 1); }
  }
}
