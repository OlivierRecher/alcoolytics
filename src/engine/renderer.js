import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const canvas = document.getElementById('c');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0xece9e4);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

export const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 300);
export const CAM_DIR = new THREE.Vector3(15, 12.5, 18.5).normalize();
export const CAM_DIR_PORTRAIT = new THREE.Vector3(11, 17, 14).normalize();
export const TARGET_HOME = new THREE.Vector3(0, 0.3, 0.2);

scene.add(new THREE.HemisphereLight(0xffffff, 0xd8cbb5, 0.7));
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.position.set(-8, 14, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun);
