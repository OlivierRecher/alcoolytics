import * as THREE from 'three';
import { scene } from '../engine/renderer.js';
import { frame } from '../engine/time.js';
import { clamp, rand } from '../utils/math.js';
import { std, shadowy, hidden } from '../utils/meshes.js';
import { fmtG } from '../utils/format.js';
import { PARK, POST, ROAD_H } from '../world/constants.js';
import { roadCurve } from '../world/platform.js';
import { post } from '../world/lampPost.js';
import { stats } from './state.js';
import { ch, setState } from './character/character.js';
import { SKIN, LOOKS } from './character/rig.js';
import { puff, stars } from './effects.js';
import { showHint } from '../ui/hint.js';

/** La voiture : garée, en route (tour de piste sobre, ou trajet ivre vers le poteau), accidentée. */
export const car = { root: new THREE.Group(), body: new THREE.Group(), wheels: [], driver: null, driverHair: null, hit: null,
  mode: 'parked', t: 0, dur: 0, curve: null, drunk: false, crumple: 1, crumpleV: 0, crumpleT: 1, lastU: 0, smokeT: 0 };

export function createCar() {
  const paint = std(0xd94a3a, { roughness: 0.45 }), dark = std(0x2b2420), chrome = std(0xf3ecdc, { roughness: 0.4 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xbfe3ea, roughness: 0.05, transparent: true, opacity: 0.45, clearcoat: 1, depthWrite: false });
  const add = (geo, mat, x, y, z, parent = car.body) => { const m = shadowy(new THREE.Mesh(geo, mat)); m.position.set(x, y, z); parent.add(m); return m; };
  add(new THREE.BoxGeometry(0.86, 0.32, 1.6), paint, 0, 0.34, 0);
  add(new THREE.BoxGeometry(0.88, 0.08, 1.64), std(0xb93a2c, { roughness: 0.5 }), 0, 0.2, 0);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.3, 0.84), glass); cabin.position.set(0, 0.65, -0.1); car.body.add(cabin);
  add(new THREE.BoxGeometry(0.8, 0.05, 0.9), paint, 0, 0.82, -0.1);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.BoxGeometry(0.05, 0.3, 0.05), paint, sx * 0.375, 0.65, -0.1 + sz * 0.405);
  for (const sx of [-1, 1]) {
    add(new THREE.BoxGeometry(0.16, 0.08, 0.03), new THREE.MeshStandardMaterial({ color: 0xfff6dc, emissive: 0xffe2a0, emissiveIntensity: 0.5 }), sx * 0.27, 0.38, 0.8);
    add(new THREE.BoxGeometry(0.14, 0.07, 0.03), new THREE.MeshStandardMaterial({ color: 0xff6a5a, emissive: 0xc0392b, emissiveIntensity: 0.4 }), sx * 0.29, 0.38, -0.8);
  }
  add(new THREE.BoxGeometry(0.9, 0.07, 0.06), chrome, 0, 0.22, 0.82);
  add(new THREE.BoxGeometry(0.9, 0.07, 0.06), chrome, 0, 0.22, -0.82);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(sx * 0.42, 0.17, sz * 0.5); car.body.add(w);
    const tyre = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.13, 16), dark)); tyre.rotation.z = Math.PI / 2; w.add(tyre);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.135, 8), chrome); hub.rotation.z = Math.PI / 2; w.add(hub);
    car.wheels.push(w);
  }
  // le conducteur (visible seulement en route)
  car.driver = new THREE.Group(); car.driver.position.set(0.17, 0.66, -0.05); car.driver.visible = false; car.body.add(car.driver);
  car.driver.add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), std(SKIN, { roughness: 0.7 })));
  car.driverHair = new THREE.Mesh(new THREE.SphereGeometry(0.138, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), std(LOOKS.male.hair));
  car.driverHair.rotation.x = -0.3; car.driver.add(car.driverHair);
  car.hit = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 1.9), hidden); car.hit.position.y = 0.5; car.root.add(car.hit);
  car.root.add(car.body);
  scene.add(car.root);
  parkCar();
}

export function setDriverLook() { car.driverHair.material.color.set(LOOKS[ch.sex].hair); }

export function parkCar() {
  car.mode = 'parked'; car.root.position.copy(PARK); car.root.rotation.set(0, Math.PI / 2, 0);
  car.body.rotation.set(0, 0, 0); car.body.position.set(0, 0, 0); car.crumpleT = 1;
  car.driver.rotation.set(0, 0, 0);
}

const _door = new THREE.Vector3();
export const carDoor = () => car.root.localToWorld(_door.set(0.78, 0, 0.1)).setY(0);

function buildDrunkCurve() {
  const pts = [[PARK.x, ROAD_H], [-1.25, ROAD_H + 0.28], [-0.55, ROAD_H - 0.2], [0.05, ROAD_H + 0.06]].map(([x, z]) => new THREE.Vector3(x, 0, z));
  const last = pts[pts.length - 1];
  const dir = new THREE.Vector3().subVectors(POST, last).setY(0).normalize();
  pts.push(POST.clone().addScaledVector(dir, -0.86).setY(0));
  car.impactDir = dir;
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
}

export function startDrive(drunk) {
  car.drunk = drunk; car.t = 0; car.lastU = 0; car.mode = 'drive';
  car.curve = drunk ? buildDrunkCurve() : roadCurve;
  car.dur = drunk ? 3.2 : 8.5;
}

const _p = new THREE.Vector3(), _t = new THREE.Vector3();
export function updateCar(dt) {
  car.crumpleV += ((car.crumpleT - car.crumple) * 90 - car.crumpleV * 9) * dt;
  car.crumple += car.crumpleV * dt;
  car.body.scale.set(1 + (1 - car.crumple) * 0.25, 1 + (1 - car.crumple) * 0.3, car.crumple);
  car.driver.position.y = 0.66 + Math.sin(frame.time * 9) * 0.01 * (car.mode === 'drive' ? 1 : 0);

  if (car.mode === 'drive') {
    car.t += dt;
    const u = clamp(car.t / car.dur, 0, 1);
    const e = car.drunk ? u * (0.45 + 0.55 * u) : 0.5 - 0.5 * Math.cos(Math.PI * u);
    car.curve.getPointAt(e, _p); car.curve.getTangentAt(e, _t);
    const wobble = car.drunk ? Math.sin(car.t * 8) * 0.18 * (1 - u * 0.3) : 0;
    car.root.position.set(_p.x, 0, _p.z);
    car.root.rotation.y = Math.atan2(_t.x, _t.z) + wobble;
    car.body.rotation.z = car.drunk ? Math.sin(car.t * 8 + 1) * 0.05 : 0;
    car.body.position.y = Math.abs(Math.sin(car.t * 14)) * 0.012;
    const dist = (e - car.lastU) * car.curve.getLength(); car.lastU = e;
    car.wheels.forEach(w => w.rotation.x += dist / 0.17);
    if (car.drunk && car.driver) car.driver.rotation.z = Math.sin(car.t * 6) * 0.25;
    if (u >= 1) car.drunk ? crash() : arrive();
  } else if (car.mode === 'crashed') {
    car.t += dt;
    if ((car.smokeT -= dt) < 0 && car.t < 4.5) {
      car.smokeT = 0.12;
      puff(car.root.localToWorld(_p.set(rand(-0.2, 0.2), 0.55, 0.6)), 0xd9d4cc, 0.08, 1.6);
    }
    if (car.t > 3.2 && ch.state === 'driving') {
      car.driver.visible = false;
      ch.pos.copy(carDoor()); ch.rig.root.visible = true;
      setState('dizzy'); stars.target = 'head';
    }
    if (car.t > 6) {
      const at = car.root.position.clone();
      for (let i = 0; i < 14; i++) puff(at.clone().add(new THREE.Vector3(rand(-0.6, 0.6), rand(0.1, 0.8), rand(-0.6, 0.6))), 0xffffff, 0.16, 0.9);
      parkCar(); post.target = 0; post.bulb.material.emissiveIntensity = 0.6;
      for (let i = 0; i < 10; i++) puff(PARK.clone().add(new THREE.Vector3(rand(-0.6, 0.6), rand(0.1, 0.8), rand(-0.6, 0.6))), 0xffffff, 0.14, 0.9);
    }
  }
  if (car.mode === 'crashed' && car.t < 4) post.bulb.material.emissiveIntensity = Math.random() < 0.15 ? 0 : 0.6;
}

function arrive() {
  parkCar();
  car.driver.visible = false;
  ch.pos.copy(carDoor()); ch.rig.root.visible = true;
  setState('toHome');
  showHint(`Un tour sans encombre. Retour à la fête.`, 2500);
}

function crash() {
  car.mode = 'crashed'; car.t = 0; car.smokeT = 0;
  car.crumpleT = 0.8; car.crumpleV = -3;
  car.body.rotation.z = 0.06;
  car.root.position.addScaledVector(car.impactDir, -0.08);
  post.axis.set(car.impactDir.z, 0, -car.impactDir.x).normalize();
  post.target = 0.42; post.vel = 3;
  stars.target = 'car';
  stats.crashes++;
  const b = ch.drunkAt;
  const risk = b >= 1.2 ? 35 : b >= 0.8 ? 10 : 2;
  showHint(`Boum. À ${fmtG(b)} g/L, le risque d'accident mortel est multiplié par ~${risk}. Au-delà de 0.5 g/L : on ne conduit pas.`, 6500);
  for (let i = 0; i < 8; i++) puff(POST.clone().add(new THREE.Vector3(rand(-0.3, 0.3), rand(0.2, 1.2), rand(-0.3, 0.3))), 0xf3ecdc, 0.1, 0.7);
}
