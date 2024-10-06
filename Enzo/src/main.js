// src/main.js

import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
import { createEnemy, updateEnemies, initializeEnemies, clearEnemies } from './enemies.js';
import { Sky } from './objects/Sky.js';
import { setupCamera } from './fpsCamera.js';
import { setupMovement } from './movement.js';
import { setupShootingEvents } from './shooting.js';

const gunOffset = new THREE.Vector3(0.2, -0.1, -0.5);

// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = setupCamera();
const movement = setupMovement(camera);
setupShootingEvents(camera, scene, gunOffset); // Set up shooting events once

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

// Ground textures setup (Color and Normal Maps)
const textureLoader = new THREE.TextureLoader();
const groundColorMap = textureLoader.load('assets/textures/Ground037_2K-PNG_Color.png');
const groundNormalMap = textureLoader.load('assets/textures/Ground037_2K-PNG_NormalGL.png');

// Apply wrapping and repeat settings
groundColorMap.wrapS = groundColorMap.wrapT = THREE.RepeatWrapping;
groundNormalMap.wrapS = groundNormalMap.wrapT = THREE.RepeatWrapping;

groundColorMap.repeat.set(20, 20);
groundNormalMap.repeat.set(20, 20);

const floorMaterial = new THREE.MeshStandardMaterial({
    map: groundColorMap,
    normalMap: groundNormalMap,
    roughness: 0.95,
    metalness: 0.0,
    displacementScale: 0
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
    if (document.pointerLockElement === renderer.domElement) {
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
    adjustCrosshair(); // Ensure crosshair scales correctly
});

// Initialize enemies at game start
initializeEnemies(scene, 5);

// Animation loop
const dayDurationInSeconds = 900;
let previousTime = performance.now();
let isGamePaused = false;
let shouldRequestPointerLock = false; // Flag to manage pointer lock requests
let isExitingToMenu = false; // Flag to indicate exiting to menu

function animate() {
    requestAnimationFrame(animate);

    if (!isGamePaused) {
        const currentTime = performance.now();
        const delta = (currentTime - previousTime) / 1000;
        previousTime = currentTime;

        movement.updateMovement(delta);
        updateEnemies(scene, delta, camera.position);

        const currentTimeOfDay = (Date.now() % (dayDurationInSeconds * 1000)) / (dayDurationInSeconds * 1000);
        updateSunPosition(currentTimeOfDay);
    }

    renderer.render(scene, camera);
}

animate();

// Function to check if the document is in fullscreen
function isFullscreen() {
    return document.fullscreenElement ||
           document.webkitFullscreenElement ||
           document.mozFullScreenElement ||
           document.msFullscreenElement ||
           null;
}

// Function to request fullscreen
function requestFullscreen() {
    // Check if already in fullscreen
    if (isFullscreen()) {
        console.log("Already in fullscreen mode.");
        if (shouldRequestPointerLock) {
            requestPointerLock();
            shouldRequestPointerLock = false;
        }
        return;
    }

    const requestFullscreenMethod = document.body.requestFullscreen ||
                                    document.body.webkitRequestFullscreen ||
                                    document.body.mozRequestFullScreen ||
                                    document.body.msRequestFullscreen;
    if (requestFullscreenMethod) {
        requestFullscreenMethod.call(document.body).then(() => {
            // Fullscreen entered successfully
            console.log("Fullscreen mode activated.");
            if (shouldRequestPointerLock) {
                requestPointerLock();
                shouldRequestPointerLock = false;
            }
        }).catch(err => {
            console.error(`Error attempting fullscreen: ${err.message}`);
            alert("Unable to enter fullscreen mode. Please try again.");
        });
    } else {
        console.error("Fullscreen API is not supported.");
        alert("Fullscreen mode is not supported by your browser.");
    }
}

// Function to request pointer lock
function requestPointerLock() {
    const canvas = renderer.domElement;
    if (canvas && canvas.requestPointerLock) {
        canvas.requestPointerLock();
    } else {
        console.error("Pointer Lock API is not supported by this browser.");
    }
}

// Function to remove the splash screen and show the crosshair
function removeSplashScreen() {
    const splashScreen = document.getElementById('splashScreen');
    const crosshair = document.getElementById('crosshair');

    if (splashScreen) {
        splashScreen.classList.add('fade-out'); // Add fade-out class
    }

    if (crosshair) {
        crosshair.classList.add('show'); // Show crosshair
    }
}

// Function to show the splash screen again
function showSplashScreen() {
    const splashScreen = document.getElementById('splashScreen');
    const crosshair = document.getElementById('crosshair');

    if (splashScreen) {
        splashScreen.classList.remove('fade-out');
    }

    if (crosshair) {
        crosshair.classList.remove('show'); // Hide crosshair
    }

    // Remove pointer lock message if present
    const message = document.getElementById('pointerLockMessage');
    if (message && splashScreen.contains(message)) {
        splashScreen.removeChild(message);
    }
}

// Function to handle pointer lock changes
function onPointerLockChange() {
    if (document.pointerLockElement === renderer.domElement) {
        // Pointer lock acquired
        console.log("Pointer lock acquired.");
        removeSplashScreen();
        isGamePaused = false; // Ensure the game is active
    } else {
        // Pointer lock lost
        console.log("Pointer lock lost.");
        isGamePaused = true; // Pause the game immediately
        showPauseScreen();
    }
}

// Function to handle fullscreen changes
function onFullscreenChange() {
    if (isFullscreen()) {
        // Fullscreen mode has been entered
        console.log("Entered fullscreen mode.");
        if (shouldRequestPointerLock) {
            requestPointerLock();
            shouldRequestPointerLock = false;
        }
    } else {
        // Exited fullscreen mode
        console.log("Exited fullscreen mode.");
        if (isExitingToMenu) {
            // User is exiting to menu; show splash screen
            showSplashScreen();
            isExitingToMenu = false;
            isGamePaused = false;
        } else if (!isGamePaused) {
            // Only show splash screen if the game is not paused
            showSplashScreen();
        }
        // If the game is paused, do not show splash screen
    }
}

// Function to show the pause screen
function showPauseScreen() {
    const pauseScreen = document.getElementById('pauseScreen');
    if (pauseScreen) {
        pauseScreen.classList.add('active'); // Show pause screen
        // isGamePaused is already set to true in onPointerLockChange()
    }
}

// Function to hide the pause screen
function hidePauseScreen() {
    const pauseScreen = document.getElementById('pauseScreen');
    if (pauseScreen) {
        pauseScreen.classList.remove('active'); // Hide pause screen
        // isGamePaused is set to false in onPointerLockChange() when pointer lock is re-acquired
    }
}

// Function to adjust crosshair size based on viewport
function adjustCrosshair() {
    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
        const size = Math.min(window.innerWidth, window.innerHeight) * 0.02; // 2% of the smaller dimension
        crosshair.style.width = `${size}px`;
        crosshair.style.height = `${size}px`;

        // Adjust inner lines
        const horizontal = crosshair.querySelector('.horizontal');
        const vertical = crosshair.querySelector('.vertical');
        if (horizontal && vertical) {
            horizontal.style.width = `${size}px`;
            vertical.style.height = `${size}px`;
        }
    }
}

// Initial call to adjust crosshair
adjustCrosshair();

// Function to reset the game (including enemies)
function resetGame() {
    // Clear existing enemies
    clearEnemies(scene);

    // Re-initialize enemies
    initializeEnemies(scene, 5);

    // Reset other game states if necessary
    // For example, reset player position, score, etc.
}

// Event listener to handle click on the start button
document.getElementById('startButton').addEventListener('click', () => {
    resetGame(); // Reset the game when starting
    shouldRequestPointerLock = true; // Flag to request pointer lock after fullscreen
    requestFullscreen();
});

// Event listener to handle click on the resume button
document.getElementById('resumeButton').addEventListener('click', () => {
    hidePauseScreen();
    resetGame(); // Reset the game when resuming
    shouldRequestPointerLock = true; // Flag to request pointer lock after fullscreen
    requestFullscreen();
});

// Event listener to handle click on the exit button
document.getElementById('exitButton').addEventListener('click', () => {
    hidePauseScreen();
    isExitingToMenu = true; // Indicate that the user is exiting to menu
    // Exit pointer lock and fullscreen, then show splash screen
    if (document.exitPointerLock) {
        document.exitPointerLock();
    }
    if (isFullscreen()) {
        document.exitFullscreen().catch(err => {
            console.error(`Error exiting fullscreen: ${err.message}`);
            alert("Unable to exit fullscreen mode. Please try again.");
        });
    } else {
        console.log("Not in fullscreen mode. No need to exit fullscreen.");
        // If not in fullscreen, still show splash screen
        showSplashScreen();
        isExitingToMenu = false;
        isGamePaused = false;
    }
});

// Attach the event listeners for fullscreen changes across different browsers
document.addEventListener('fullscreenchange', onFullscreenChange);
document.addEventListener('webkitfullscreenchange', onFullscreenChange);
document.addEventListener('mozfullscreenchange', onFullscreenChange);
document.addEventListener('MSFullscreenChange', onFullscreenChange);

// Pointer lock change listener remains standard
document.addEventListener('pointerlockchange', onPointerLockChange);
