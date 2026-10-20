import * as THREE from 'three';
import { scene } from '../engine/renderer.js';
import { frame } from '../engine/time.js';
import { rand, smooth, dampAngle } from '../utils/math.js';
import { std, shadowy } from '../utils/meshes.js';
import { DOG_PARK, DOG_R } from '../world/constants.js';

/** Le chien et sa balle, dans son coin de pelouse. */
const dog = { g: new THREE.Group(), body: null, head: null, tail: null, tongue: null, legs: [], pos: DOG_PARK.clone().add(new THREE.Vector3(-0.4, 0, 0.2)),
  heading: 0, state: 'chase', t: 0, wait: 0, phase: 0, run: 0, bow: 0, hop: 0, hopV: 0,
  ball: { m: null, pos: DOG_PARK.clone(), v: new THREE.Vector3(), y: 0, vy: 0 } };

export function createDog() {
  const fur = std(0xd99a5b), furDark = std(0xb87a3e), white = std(0xf6efe2), dark = std(0x2b2420, { roughness: 0.35 });
  const add = (geo, mat, parent, x, y, z) => { const m = shadowy(new THREE.Mesh(geo, mat)); m.position.set(x, y, z); parent.add(m); return m; };
  dog.g.scale.setScalar(0.62);
  const B = dog.body = new THREE.Group(); B.position.y = 0.3; dog.g.add(B);
  add(new THREE.CapsuleGeometry(0.14, 0.32, 6, 14), fur, B, 0, 0, 0).rotation.x = Math.PI / 2;
  add(new THREE.CapsuleGeometry(0.105, 0.24, 6, 12), white, B, 0, -0.05, 0.03).rotation.x = Math.PI / 2;
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const p = new THREE.Group(); p.position.set(sx * 0.085, -0.06, sz * 0.16); B.add(p);
    add(new THREE.CapsuleGeometry(0.045, 0.12, 4, 8), fur, p, 0, -0.1, 0);
    add(new THREE.SphereGeometry(0.05, 10, 8), white, p, 0, -0.19, 0.015).scale.set(1, 0.6, 1.25);
    dog.legs.push(p);
  }
  const H = dog.head = new THREE.Group(); H.position.set(0, 0.14, 0.27); B.add(H);
  add(new THREE.SphereGeometry(0.13, 18, 14), fur, H, 0, 0, 0);
  add(new THREE.SphereGeometry(0.075, 12, 10), white, H, 0, -0.04, 0.1).scale.set(1, 0.8, 1.15);
  add(new THREE.SphereGeometry(0.028, 8, 6), dark, H, 0, -0.012, 0.185);
  for (const s of [-1, 1]) {
    add(new THREE.SphereGeometry(0.022, 8, 6), dark, H, s * 0.055, 0.035, 0.112);
    const ear = add(new THREE.ConeGeometry(0.05, 0.13, 4), furDark, H, s * 0.075, 0.13, -0.02); ear.rotation.set(-0.15, 0, -s * 0.35);
  }
  dog.tongue = add(new THREE.BoxGeometry(0.04, 0.01, 0.06), std(0xe86a7a), H, 0, -0.085, 0.15);
  add(new THREE.TorusGeometry(0.095, 0.02, 6, 16), std(0xd94a3a), B, 0, 0.07, 0.22).rotation.x = Math.PI / 2 - 0.5; // collier
  const T = dog.tail = new THREE.Group(); T.position.set(0, 0.07, -0.29); T.rotation.x = -0.7; B.add(T);
  add(new THREE.CapsuleGeometry(0.03, 0.12, 4, 6), fur, T, 0, 0.08, 0);
  add(new THREE.SphereGeometry(0.035, 8, 6), white, T, 0, 0.17, 0);
  dog.ball.m = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), std(0xd8e05a, { roughness: 0.9 })));
  scene.add(dog.g, dog.ball.m);
}

const _d = new THREE.Vector3(), _x = new THREE.Vector3(), _ax = new THREE.Vector3();
export function updateDog(dt) {
  const b = dog.ball, time = frame.time;
  // balle : roule, rebondit, reste dans le coin du chien
  b.pos.addScaledVector(b.v, dt); b.v.multiplyScalar(Math.exp(-1.5 * dt));
  b.vy -= 9.8 * dt; b.y += b.vy * dt; if (b.y < 0) { b.y = 0; b.vy = Math.abs(b.vy) > 0.6 ? -b.vy * 0.45 : 0; }
  _x.subVectors(b.pos, DOG_PARK).setY(0);
  const d = _x.length();
  if (d > DOG_R) { _x.divideScalar(d); b.pos.copy(DOG_PARK).addScaledVector(_x, DOG_R); const vn = b.v.dot(_x); if (vn > 0) b.v.addScaledVector(_x, -1.6 * vn); }
  const bs = b.v.length();
  if (bs > 1e-3) b.m.rotateOnWorldAxis(_ax.set(b.v.z, 0, -b.v.x).normalize(), bs * dt / 0.055);
  b.m.position.set(b.pos.x, 0.055 + b.y, b.pos.z);

  dog.t += dt;
  let run = 0, bow = 0, wag = 0.5;
  _d.subVectors(b.pos, dog.pos).setY(0);
  const dist = _d.length(), want = Math.atan2(_d.x, _d.z);
  if (dog.state === 'chase') {
    dog.heading = dampAngle(dog.heading, want, 1 - Math.exp(-dt * 7));
    if (dist > 0.17) {
      const sp = Math.min(1.6, 0.5 + dist * 2.5);
      dog.pos.x += Math.sin(dog.heading) * sp * dt; dog.pos.z += Math.cos(dog.heading) * sp * dt;
      run = sp / 1.6;
    } else { // coup de museau : la balle repart, plutôt vers le centre si elle est près du bord
      _x.subVectors(DOG_PARK, b.pos).setY(0);
      const a = Math.atan2(_d.x, _d.z) + rand(-1, 1), toC = Math.atan2(_x.x, _x.z), k = smooth(0.3, DOG_R, _x.length());
      const aa = a + (((toC - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI) * k;
      b.v.set(Math.sin(aa), 0, Math.cos(aa)).multiplyScalar(rand(0.9, 1.7)); b.vy = rand(0.6, 1.5);
      dog.state = 'play'; dog.t = 0; dog.wait = rand(0.6, 1.6);
      if (Math.random() < 0.35) dog.hopV = 1.6;
    }
  } else {
    dog.heading = dampAngle(dog.heading, want, 1 - Math.exp(-dt * 4));
    bow = smooth(0, 0.25, dog.t) * (1 - smooth(dog.wait - 0.2, dog.wait, dog.t)); wag = 1;
    if (dog.t > dog.wait) dog.state = 'chase';
  }
  dog.hopV -= 9.8 * dt; dog.hop = Math.max(0, dog.hop + dog.hopV * dt); if (dog.hop === 0) dog.hopV = Math.max(dog.hopV, 0);
  dog.run += (run - dog.run) * (1 - Math.exp(-dt * 8));
  dog.bow += (bow - dog.bow) * (1 - Math.exp(-dt * 8));
  dog.phase += dt * (4 + dog.run * 14);
  const s = Math.sin(dog.phase) * 0.8 * dog.run;
  [s, -s, -s, s].forEach((v, i) => dog.legs[i].rotation.x = v - (i < 2 ? 0.7 * dog.bow : 0));
  dog.body.position.y = 0.3 + Math.abs(Math.sin(dog.phase)) * 0.035 * dog.run - 0.06 * dog.bow;
  dog.body.rotation.x = 0.3 * dog.bow + Math.sin(dog.phase * 2) * 0.03 * dog.run;
  dog.head.rotation.set(-0.25 * dog.bow, 0, Math.sin(time * 2.3) * 0.18 * (1 - dog.run));
  dog.tail.rotation.z = Math.sin(time * (10 + 10 * wag)) * 0.6 * wag;
  dog.tongue.visible = dog.run > 0.3 || dog.bow > 0.5;
  dog.g.position.set(dog.pos.x, dog.hop * 0.6, dog.pos.z);
  dog.g.rotation.y = dog.heading;
}
