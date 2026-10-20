import * as THREE from 'three';

export const UP = new THREE.Vector3(0, 1, 0);

export const S = 10, HALF = S / 2;
export const ROAD_C = 2.85, ROAD_R = 1.05, ROAD_H = ROAD_C + ROAD_R, ROAD_W = 1.3; // ligne médiane : rectangle arrondi
export const LAWN = ROAD_H - ROAD_W / 2;                                           // 3.25
export const HOME = new THREE.Vector3(0.3, 0, 0.5);
export const PARK = new THREE.Vector3(-2, 0, ROAD_H);
export const POST = new THREE.Vector3(1.4, 0, LAWN - 0.2);
export const KIOSK = new THREE.Vector3(-1.9, 0, -2.25);
export const TREES = [[2.5, -2.4, 1], [2.75, -0.7, 0.8], [-2.65, 1.3, 0.9]];
export const BUSHES = [[2.9, 2.85, 0.28], [-2.9, -0.95, 0.26], [0.95, -2.95, 0.24]];
export const BENCH = new THREE.Vector3(-2.6, 0, 0.05);
export const DOG_PARK = new THREE.Vector3(2.15, 0, 1.75), DOG_R = 0.75;
export const TRASH = new THREE.Vector3(-0.45, 0, -2.78), TRASH_R = 0.17;
// obstacles ronds [x, z, r] : les bouteilles rebondissent dessus
export const OBST = [
  ...TREES.map(([x, z, s]) => [x, z, 0.1 * s]), ...BUSHES,
  [POST.x, POST.z, 0.13], [TRASH.x, TRASH.z, TRASH_R], [BENCH.x, BENCH.z - 0.3, 0.3], [BENCH.x, BENCH.z + 0.3, 0.3],
];
export const KIOSK_BOX = [KIOSK.x - 0.81, KIOSK.x + 0.81, KIOSK.z - 0.6, KIOSK.z + 0.36]; // xmin, xmax, zmin, zmax
export const CHAR_SCALE = 0.72, GLASS_SCALE = 1.5;
