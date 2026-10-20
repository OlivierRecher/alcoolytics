import * as THREE from 'three';
import { renderer, camera, CAM_DIR, CAM_DIR_PORTRAIT, TARGET_HOME } from './renderer.js';
import { controls } from './controls.js';
import { sheet, SHEET_TOP, layoutSheet, frameSheet } from '../ui/sheet.js';
import { $ } from '../ui/dom.js';

const panel = $('panel');

/** Cadre la caméra pour que le plateau reste dégagé du panneau (à droite sur desktop, en bas sur mobile). */
export function fit() {
  const W = innerWidth, H = innerHeight, mobile = W <= 720;
  renderer.setSize(W, H);
  camera.aspect = W / H;
  layoutSheet();
  const pr = panel.getBoundingClientRect();
  let availW = W, availH = H, offX = 0, offY = 0;
  if (mobile) {
    // Size the scene for the middle level so changing level never zooms or resets the orbit
    availH = Math.max(160, H - sheet.snaps[1] - SHEET_TOP);
    frameSheet();
  } else {
    const pw = pr.width + 24, bottom = 150;
    availW = Math.max(240, W - pw); offX = pw / 2;
    availH = H - bottom; offY = bottom / 2 - 20;
    camera.setViewOffset(W, H, offX, offY, W, H);
    camera.updateProjectionMatrix();
  }
  const t = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const D = Math.max(14.5 * H / (availW * t), 12.5 * H / (availH * t));
  camera.position.copy(TARGET_HOME).addScaledVector(availW < availH ? CAM_DIR_PORTRAIT : CAM_DIR, D);
  controls.target.copy(TARGET_HOME);
  controls.minDistance = D * 0.45; controls.maxDistance = D * 1.6;
  controls.update();
}

export function initViewport() {
  addEventListener('resize', fit);
  fit();
  document.fonts?.ready.then(fit);
}
