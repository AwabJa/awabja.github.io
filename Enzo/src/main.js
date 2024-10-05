import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
import { createEnemy, updateEnemies, enemies } from './enemies.js';
import { Sky } from './objects/Sky.js';
import { setupCamera } from './fpsCamera.js';
import { setupMovement } from './movement.js';
import { setupShootingEvents, updateProjectiles } from './shooting.js';

let hasEnteredFullscreen = false;
let isShootingEnabled = false;
let manualPointerUnlock = false;

const gunOffset = new THREE.Vector3(0.2, -0.1, -0.5);
const activeProjectiles = [];

// Event listener to handle click on the splash screen
document.getElementById('splashScreen').addEventListener('click', () => {
    if (!hasEnteredFullscreen) {
        // Enter fullscreen and pointer lock directly inside the click event
        document.body.requestFullscreen().then(() => {
            requestPointerLock(); // Call pointer lock after fullscreen is successful
            hasEnteredFullscreen = true;
            removeSplashScreen(); // Remove splash screen and show the crosshair
        }).catch((err) => console.error(`Error attempting fullscreen: ${err.message}`));
    }
});

// Handle pointer lock change event
document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement) {
        isShootingEnabled = true;
        setupShootingEvents(camera, scene, activeProjectiles, gunOffset);  // Set up shooting events via shooting.js
    } else {
        isShootingEnabled = false;
    }
});

// Handle fullscreen and pointer lock after ESC
document.addEventListener('keydown', (event) => {
    if (event.code === 'Escape') {
        manualPointerUnlock = true;
        if (document.fullscreenElement) {
            document.exitFullscreen().catch((err) => console.error(`Error exiting fullscreen: ${err.message}`));
        }
    }
});

// Re-request pointer lock and fullscreen when user clicks after exiting fullscreen
document.addEventListener('click', () => {
    if (!document.pointerLockElement && hasEnteredFullscreen) {
        manualPointerUnlock = false; // Reset manual unlock to allow re-engagement
        document.body.requestFullscreen().then(() => {
            requestPointerLock(); // Re-request pointer lock after fullscreen
        }).catch((err) => console.error(`Error attempting fullscreen: ${err.message}`));
    }
});

// Handle fullscreen change event
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        manualPointerUnlock = true;
    } else {
        manualPointerUnlock = false;  // Reset manual unlock when re-entering fullscreen
        requestPointerLock();
    }
});

// Function to request pointer lock
function requestPointerLock() {
    const canvas = document.querySelector('canvas');  // Assuming canvas is your game area
    if (canvas && canvas.requestPointerLock) {
        canvas.requestPointerLock();
    }
}

// Function to remove the splash screen and show the crosshair
function removeSplashScreen() {
    const splashScreen = document.getElementById('splashScreen');
    const crosshair = document.getElementById('crosshair'); // Get the crosshair element

    if (splashScreen) {
        splashScreen.style.display = 'none';  // Hide the splash screen
    }

    if (crosshair) {
        crosshair.classList.add('show');  // Show the crosshair by adding the 'show' class
    }
}

const scene = new THREE.Scene();
const camera = setupCamera();
const movement = setupMovement(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);

// Lighting setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 4096;
directionalLight.shadow.mapSize.height = 4096;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 100;
directionalLight.shadow.bias = -0.0005;

directionalLight.shadow.camera.left = -50;
directionalLight.shadow.camera.right = 50;
directionalLight.shadow.camera.top = 50;
directionalLight.shadow.camera.bottom = -50;
scene.add(directionalLight);

// Ground textures setup
const textureLoader = new THREE.TextureLoader();
const groundColorMap = textureLoader.load('assets/textures/Ground037_2K-PNG_Color.png');
const groundNormalMap = textureLoader.load('assets/textures/Ground037_2K-PNG_NormalGL.png');
const groundRoughnessMap = textureLoader.load('assets/textures/Ground037_2K-PNG_Roughness.png');
const groundDisplacementMap = textureLoader.load('assets/textures/Ground037_2K-PNG_Displacement.png');
const groundAmbientOcclusionMap = textureLoader.load('assets/textures/Ground037_2K-PNG_AmbientOcclusion.png');

groundColorMap.wrapS = groundColorMap.wrapT = THREE.RepeatWrapping;
groundNormalMap.wrapS = groundNormalMap.wrapT = THREE.RepeatWrapping;
groundRoughnessMap.wrapS = groundRoughnessMap.wrapT = THREE.RepeatWrapping;
groundDisplacementMap.wrapS = groundDisplacementMap.wrapT = THREE.RepeatWrapping;
groundAmbientOcclusionMap.wrapS = groundAmbientOcclusionMap.wrapT = THREE.RepeatWrapping;

groundColorMap.repeat.set(20, 20);
groundNormalMap.repeat.set(20, 20);
groundRoughnessMap.repeat.set(20, 20);
groundDisplacementMap.repeat.set(20, 20);
groundAmbientOcclusionMap.repeat.set(20, 20);

const floorMaterial = new THREE.MeshStandardMaterial({
    map: groundColorMap,
    normalMap: groundNormalMap,
    roughnessMap: groundRoughnessMap,
    displacementMap: groundDisplacementMap,
    aoMap: groundAmbientOcclusionMap,
    roughness: 0.95,
    metalness: 0.0,
    displacementScale: 0.05
});

const floor = new THREE.Mesh(new THREE.PlaneGeometry(175, 175, 175, 175), floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
floor.receiveShadow = true;
scene.add(floor);

// Sky setup
const sky = new Sky();
sky.scale.setScalar(450);
scene.add(sky);

const skyUniforms = sky.material.uniforms;
skyUniforms['turbidity'].value = 12;
skyUniforms['rayleigh'].value = 0.09;
skyUniforms['mieCoefficient'].value = 0.0009;
skyUniforms['mieDirectionalG'].value = 0.7;

const sun = new THREE.Vector3();
function updateSunPosition(timeOfDay) {
    const theta = Math.PI * timeOfDay;
    const phi = 0.5 * Math.PI;

    sun.x = Math.cos(phi);
    sun.y = Math.sin(theta);
    sun.z = Math.sin(phi) * Math.cos(theta);

    skyUniforms['sunPosition'].value.copy(sun);
    directionalLight.position.copy(sun);
    directionalLight.intensity = Math.max(0, sun.y * 0.8);
}

updateSunPosition(0.25);

// Camera and mouse control
let yaw = 0;
let pitch = 0;
const maxPitch = Math.PI / 2;

document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement) {
        const mouseSensitivity = 0.002;
        yaw -= event.movementX * mouseSensitivity;
        pitch -= event.movementY * mouseSensitivity;

        pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));
        yaw = yaw % (2 * Math.PI);

        const quaternion = new THREE.Quaternion();
        quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
        camera.quaternion.copy(quaternion);
    }
});

// Window resize handling
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Create enemies
for (let i = 0; i < 5; i++) {
    const position = new THREE.Vector3(
        Math.random() * 20 - 10,
        0,
        Math.random() * 20 - 10
    );
    createEnemy(scene, position);
}

// Animation loop
const dayDurationInSeconds = 900;
let previousTime = performance.now();

function animate() {
    requestAnimationFrame(animate);

    const currentTime = performance.now();
    const delta = (currentTime - previousTime) / 1000;
    previousTime = currentTime;

    movement.updateMovement(delta);
    updateProjectiles(scene, delta, activeProjectiles);
    updateEnemies(scene, delta, camera.position);

    const currentTimeOfDay = (Date.now() % (dayDurationInSeconds * 1000)) / (dayDurationInSeconds * 1000);
    updateSunPosition(currentTimeOfDay);

    renderer.render(scene, camera);
}

animate();
