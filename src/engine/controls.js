import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { camera, canvas, TARGET_HOME } from './renderer.js';

export let controls = null;

/** À appeler APRÈS l'enregistrement des écouteurs pointeur : nos taps passent en premier, l'orbite sur glissé. */
export function createControls() {
  controls = new OrbitControls(camera, canvas);
  controls.target.copy(TARGET_HOME);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.maxPolarAngle = 1.35;
  return controls;
}
