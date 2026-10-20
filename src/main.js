import * as THREE from 'three';
import { renderer, scene, camera } from './engine/renderer.js';
import { createControls, controls } from './engine/controls.js';
import { initViewport } from './engine/viewport.js';
import { frame } from './engine/time.js';
import { createPlatform } from './world/platform.js';
import { createKiosk, createTrees, createBushes, createBench, createGrass } from './world/decor.js';
import { createBin, updateBin } from './world/bin.js';
import { createLampPost, updatePost } from './world/lampPost.js';
import { sim, tickProjection } from './game/state.js';
import { advanceSim, restoreState, initPersistence, tickSave } from './game/persistence.js';
import { createCharacter, updateCharacter } from './game/character/character.js';
import { updateFlying, updateBottles } from './game/drinks/bottles.js';
import { updateVomit } from './game/vomit.js';
import { createCar, updateCar } from './game/car.js';
import { createStars, createKoRing, updateFx, updateStars, updateKoRing } from './game/effects.js';
import { createDog, updateDog } from './game/dog.js';
import { updateBirds } from './game/birds.js';
import { initPointer, updatePointer } from './input/pointer.js';
import { createDrinkMenu } from './ui/drinkMenu.js';
import { initSettings } from './ui/settings.js';
import { initSheet, tease } from './ui/sheet.js';
import { updateUI } from './ui/hud.js';
import { showHint } from './ui/hint.js';
import { installManifest } from './pwa/manifest.js';

// ---------- Monde ----------
createPlatform();
createKiosk();
createTrees();
createBushes();
createBench();
createBin();
createGrass();
createLampPost();

// ---------- Acteurs ----------
createCharacter();
createCar();
createStars();
createKoRing();
createDog();

// ---------- Entrées, interface ----------
initPointer();    // avant les contrôles : nos taps sont vus en premier, l'orbite sur glissé
createControls();
createDrinkMenu();
initSettings();
initSheet();
initViewport();
tease();
installManifest();
const resumed = restoreState(); // après initSettings : profil et curseurs suivent la session sauvée
initPersistence();

// ---------- Boucle ----------
const clock = new THREE.Clock();
if (!resumed) showHint('Sers-lui un verre, puis touche le personnage ou la voiture. Maintiens le doigt sur la pelouse pour le faire courir.', 4500);
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1 / 30);
  frame.time += dt;
  // la simulation suit l'horloge murale : le temps passé onglet masqué est rattrapé
  const simSeconds = advanceSim() * 3600;
  // [accéléré] simClock += simSeconds;
  tickProjection(dt);
  tickSave(dt);
  const bac = sim.blood;
  updatePointer();
  updateCharacter(dt, bac);
  updateCar(dt);
  updatePost(dt);
  updateFlying(dt);
  updateBottles(dt);
  updateBin(dt);
  updateDog(dt);
  updateBirds(dt);
  updateVomit(dt);
  updateFx(dt);
  updateStars(dt);
  updateKoRing();
  updateUI();
  controls.update();
  renderer.render(scene, camera);
});
