// src/main.js

import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
import { enemies, createEnemy, updateEnemies, initializeEnemies, clearEnemies } from './enemies.js';
import { createArcaneWorld } from './arcaneWorld.js';
import { createCastingHand } from './castingHand.js';
import { setupCamera } from './fpsCamera.js';
import { setupMovement } from './movement.js';
import { setupShootingEvents } from './shooting.js';

// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = setupCamera();
const movement = setupMovement(camera);
scene.add(camera); // Camera-space casting hand must belong to the rendered scene.
const hand = createCastingHand(camera);
const shooting = setupShootingEvents(camera, scene, hand);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 900 ? 1.1 : 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);

// Phase 2: a custom arcane sky, volcanic runes, floating ruins and a portal.
const world = createArcaneWorld(scene, renderer);

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 900 ? 1.1 : 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    adjustCrosshair(); // Ensure crosshair scales correctly
});

// Spawn enemies only after the player presses Start (not behind the splash screen).

// Animation loop
let previousTime = performance.now();
let isGamePaused = true;
let shouldRequestPointerLock = false; // Flag to manage pointer lock requests
let isExitingToMenu = false; // Flag to indicate exiting to menu

function animate() {
    requestAnimationFrame(animate);

    const currentTime = performance.now();
    const delta = Math.min((currentTime - previousTime) / 1000, 0.05);
    previousTime = currentTime;
    if (!isGamePaused && !document.hidden) {

        const motion = movement.updateMovement(delta);
        updateEnemies(scene, delta, camera.position);
        shooting.update(delta);
        hand.update(delta, motion.moving, true);
        world.update(delta);
        updateSurvival(delta);
    }

    if (!document.hidden) renderer.render(scene, camera);
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

    hud.hidden = false;
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

    hud.hidden = true;
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
        hidePauseScreen();
        previousTime = performance.now();
        isGamePaused = false; // Ensure the game is active
    } else {
        // Pointer lock lost: stop all enemy movement immediately.
        isGamePaused = true;
        if (!isExitingToMenu) showPauseScreen();
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
            hidePauseScreen();
            showSplashScreen();
            isExitingToMenu = false;
            isGamePaused = true;
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
let eliminations = 0;
const goal = 5;
let health = 100;
let wave = 1;
let hitCooldown = 0;
let nextWavePending = false;
let nextWaveTimer = null;
let hitEffectTimer;
window.addEventListener('enzo:player-hit', () => { document.body.classList.remove('player-hit'); void document.body.offsetWidth; document.body.classList.add('player-hit'); clearTimeout(hitEffectTimer); hitEffectTimer = setTimeout(() => document.body.classList.remove('player-hit'), 350); });
window.addEventListener('enzo:enemy-hit', () => { document.body.classList.add('enemy-hit'); setTimeout(() => document.body.classList.remove('enemy-hit'), 130); });
const healthDisplay = document.getElementById('healthValue');
const waveDisplay = document.getElementById('waveValue');
function updateSurvival(delta) {
    if (!document.pointerLockElement || health <= 0) return;
    hitCooldown = Math.max(0, hitCooldown - delta);
    if (hitCooldown === 0 && enemies.some(e => !e.isMarkedForRemoval && e.object.position.distanceTo(camera.position) < 3.3)) {
        health = Math.max(0, health - 12);
        healthDisplay.textContent = String(health);
        hitCooldown = 1.2;
        window.dispatchEvent(new Event('enzo:player-hit'));
        announce(health ? 'Under attack! Health: ' + health : 'GAME OVER — Select Restart');
        if (health === 0) {
            document.getElementById('resumeButton').textContent = 'Restart Game';
            isGamePaused = true;
            if (document.exitPointerLock) document.exitPointerLock();
            showPauseScreen();
        }
    }
    if (!nextWavePending && enemies.every(e => e.isMarkedForRemoval)) {
        nextWavePending = true;
        wave++;
        waveDisplay.textContent = String(wave);
        announce('WAVE ' + wave + ' INCOMING');
        nextWaveTimer = setTimeout(() => {
            nextWaveTimer = null;
            if (!nextWavePending) return;
            initializeEnemies(scene, Math.min(4 + wave * 2, 14));
            nextWavePending = false;
        }, 1800);
    }
}
const hud = document.getElementById('gameHUD');
const toast = document.getElementById('gameToast');
let toastTimer;
function announce(message) { toast.textContent = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.textContent = ''; }, 3500); }
window.addEventListener('enzo:elimination', () => {
    if (isGamePaused || !document.pointerLockElement) return;
    eliminations++;
    document.getElementById('killCount').textContent = String(eliminations);
    if (eliminations === goal) { document.getElementById('objectiveText').textContent = 'Mission complete — keep surviving!'; announce('MISSION COMPLETE — 5 ELIMINATIONS!'); }
    else if (eliminations < goal) announce('Enemy eliminated! ' + eliminations + '/' + goal);
});
function resetGame() {
    if (nextWaveTimer !== null) {
        clearTimeout(nextWaveTimer);
        nextWaveTimer = null;
    }
    health = 100;
    wave = 1;
    hitCooldown = 0;
    nextWavePending = false;
    healthDisplay.textContent = '100';
    waveDisplay.textContent = '1';
    eliminations = 0;
    document.getElementById('killCount').textContent = '0';
    document.getElementById('objectiveText').textContent = 'Eliminate 5 enemies';
    toast.textContent = '';
    document.getElementById('resumeButton').textContent = 'Resume Game';
    // Clear effects, inputs and enemies so a new run always starts cleanly.
    shooting.reset();
    hand.reset();
    movement.reset();
    camera.position.set(0, 1.7, 0);
    camera.rotation.set(0, 0, 0);
    yaw = pitch = 0;
    clearEnemies(scene);
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
    if (health === 0) resetGame(); // Restart after defeat; ordinary pause preserves progress.
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
        isGamePaused = true;
    }
});

// Attach the event listeners for fullscreen changes across different browsers
document.addEventListener('fullscreenchange', onFullscreenChange);
document.addEventListener('webkitfullscreenchange', onFullscreenChange);
document.addEventListener('mozfullscreenchange', onFullscreenChange);
document.addEventListener('MSFullscreenChange', onFullscreenChange);

// Pointer lock change listener remains standard
document.addEventListener('pointerlockchange', onPointerLockChange);
