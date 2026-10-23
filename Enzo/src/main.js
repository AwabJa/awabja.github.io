// src/main.js

import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
import { enemies, createEnemy, updateEnemies, initializeEnemies, clearEnemies } from './enemies.js';
import { createArcaneWorld } from './arcaneWorld.js';
import { createWorldPolish } from './worldPolish.js';
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
// Temporarily suppress the distorted gauntlet until the asset is rebuilt.
hand.rig.visible = false;


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
const worldPolish = createWorldPolish(scene, world, renderer);
const shooting = setupShootingEvents(camera, scene, hand, world.colliders, renderer.domElement, () => !isGamePaused);

// Camera and mouse control
let yaw = 0;
let pitch = 0;
const maxPitch = Math.PI / 2;

document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement === renderer.domElement) {
        const mouseSensitivity = 0.002;
        yaw -= event.movementX * mouseSensitivity;
        pitch -= event.movementY * mouseSensitivity;
        hand.addLookImpulse(event.movementX,event.movementY);

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
});

// Spawn enemies only after the player presses Start (not behind the splash screen).

// Animation loop
let previousTime = performance.now();
let isGamePaused = true;
let isExitingToMenu = false; // Flag to indicate exiting to menu

function animate() {
    requestAnimationFrame(animate);

    const currentTime = performance.now();
    const delta = Math.min((currentTime - previousTime) / 1000, 0.05);
    previousTime = currentTime;
    if (!isGamePaused && !document.hidden) {

        const motion = movement.updateMovement(delta, world.colliders);
        updateEnemies(scene, delta, camera.position);
        shooting.update(delta);
        // The hand rig is intentionally hidden pending a proper model rebuild.
        world.update(delta);
        worldPolish.update(delta);
        updateSurvival(delta);
    }

    // Menus and pause screens do not need a continuously rendered 3D frame.
    // Keep the last gameplay frame frozen rather than burning GPU behind overlays.
    if (!document.hidden && !isGamePaused) renderer.render(scene, camera);
}

animate();

// The splash menu stays interactive until the browser confirms mouse capture.
// Fullscreen is not required for pointer lock (and requesting fullscreen first
// can consume the activation needed for pointer lock on some browsers).
const splashScreen = document.getElementById('splashScreen');
const menuStatusText = document.getElementById('menuStatusText');
const startButton = document.getElementById('startButton');
const pauseScreen = document.getElementById('pauseScreen');
let gameStarted = false;

function setMenuStatus(message) {
    menuStatusText.textContent = message;
}
function removeSplashScreen() {
    splashScreen.classList.add('fade-out');
    splashScreen.setAttribute('aria-hidden', 'true');
    hud.hidden = false;
    document.getElementById('crosshair').classList.add('show');
}
function showSplashScreen() {
    splashScreen.classList.remove('fade-out');
    splashScreen.removeAttribute('aria-hidden');
    hud.hidden = true;
    document.getElementById('crosshair').classList.remove('show');
    setMenuStatus('THE SHATTERED REACH IS READY');
}
function showPauseScreen() {
    pauseScreen.classList.add('active');
    const defeated=health===0;
    document.getElementById('pauseTitle').innerHTML=defeated?'YOUR LIGHT <em>FADES.</em>':'THE REACH <em>AWAITS.</em>';
    document.getElementById('pauseDescription').textContent=defeated?'The sentinels overwhelmed your last stand. The Reach will remember.':"Your fight isn't over. Return to the arena when you're ready.";
    document.getElementById('resumeButton').firstChild.textContent=defeated?'RESTART GAME ':'RESUME GAME ';
    hideWaveBanner();
    pauseScreen.setAttribute('aria-hidden', 'false');
    document.getElementById('resumeButton').focus({preventScroll:true});
}
function hidePauseScreen() {
    pauseScreen.classList.remove('active');
    pauseScreen.setAttribute('aria-hidden', 'true');
}
function requestGameplayLock() {
    const canvas = renderer.domElement;
    if (typeof canvas.requestPointerLock !== 'function') {
        enterGameplay();
        return;
    }
    try {
        const result = canvas.requestPointerLock();
        if (result && typeof result.catch === 'function') {
            result.catch(error => {
                console.warn('Unable to capture mouse:', error);
                onPointerLockError();
            });
        }
    } catch (error) {
        console.warn('Unable to capture mouse:', error);
        onPointerLockError();
    }
}
function enterGameplay() {
    const firstEntry = !gameStarted;
    gameStarted = true;
    isExitingToMenu = false;
    removeSplashScreen();
    hidePauseScreen();
    previousTime = performance.now();
    isGamePaused = false;
    if(firstEntry) showWaveBanner(wave, 'THE TRIAL BEGINS');
}
function onPointerLockChange() {
    if (document.pointerLockElement === renderer.domElement) {
        enterGameplay();
        return;
    }
    isGamePaused = true;
    if (isExitingToMenu) {
        isExitingToMenu = false;
        gameStarted = false;
        hidePauseScreen();
        showSplashScreen();
        startButton.focus({preventScroll:true});
    } else if (gameStarted) {
        showPauseScreen();
    } else {
        hidePauseScreen();
        showSplashScreen();
    }
}
function onPointerLockError() {
    // Some browsers reject mouse capture; keyboard movement and click-to-cast
    // must remain available instead of trapping the player in a pause screen.
    if (!gameStarted) enterGameplay();
    setMenuStatus('MOUSE LOCK UNAVAILABLE — CLICK TO CAST');
}

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
    if (isGamePaused || health <= 0) return;
    hitCooldown = Math.max(0, hitCooldown - delta);
    const attacker = enemies.find(e => !e.isMarkedForRemoval &&
        e.object.position.distanceTo(camera.position) < 2.7 + e.role.scale * .6);
    if (hitCooldown === 0 && attacker) {
        health = Math.max(0, health - attacker.role.damage);
        setHealth(health);
        hitCooldown = 1.2;
        window.dispatchEvent(new Event('enzo:player-hit'));
        announce(health ? 'Under attack! Health: ' + health : 'GAME OVER — Select Restart');
        if (health === 0) {
            document.getElementById('resumeButton').firstChild.textContent = 'RESTART GAME ';
            isGamePaused = true;
            if (document.exitPointerLock) document.exitPointerLock();
            showPauseScreen();
        }
    }
    if (!nextWavePending && enemies.every(e => e.isMarkedForRemoval)) {
        nextWavePending = true;
        wave++;
        world.setMood(wave);
        worldPolish.setMood(wave);
        document.getElementById('waveState').textContent = 'NEXT WAVE INBOUND';
        showWaveBanner(wave, 'SENTINELS APPROACHING');
        waveDisplay.textContent = String(wave).padStart(2,'0');
        announce('WAVE ' + wave + ' INCOMING');
        nextWaveTimer = setTimeout(() => {
            nextWaveTimer = null;
            if (!nextWavePending) return;
            initializeEnemies(scene, Math.min(4 + wave * 2, 14));
            nextWavePending = false;
            document.getElementById('waveState').textContent = 'SENTINELS ACTIVE';
        }, 1800);
    }
}
const hud = document.getElementById('gameHUD');
const toast = document.getElementById('gameToast');
const healthMeter = document.getElementById('healthMeter');
const healthFill = document.getElementById('healthFill');
const waveBanner = document.getElementById('waveBanner');
const waveBannerTitle = document.getElementById('waveBannerTitle');
const waveBannerSubtitle = document.getElementById('waveBannerSubtitle');
let toastTimer, bannerTimer;
function setHealth(value) {
    const hp=Math.max(0,Math.min(100,value));
    healthDisplay.textContent=String(hp);
    document.getElementById('healthPercent').textContent=hp+'%';
    document.getElementById('healthState').textContent=hp>55?'STABLE':hp>25?'WOUNDED':'CRITICAL';
    healthFill.style.width=hp+'%';
    healthMeter.setAttribute('aria-valuenow',String(hp));
    hud.classList.toggle('is-critical',hp<=25);
}
function announce(message) {
    toast.textContent=message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>{toast.textContent='';toast.classList.remove('is-visible');},2100);
}
function hideWaveBanner() {
    clearTimeout(bannerTimer);
    waveBanner.classList.remove('is-visible');
    waveBanner.setAttribute('aria-hidden','true');
}
function showWaveBanner(number,subtitle) {
    hideWaveBanner();
    waveBannerTitle.textContent='WAVE '+String(number).padStart(2,'0');
    waveBannerSubtitle.textContent=subtitle;
    waveBanner.classList.add('is-visible');
    waveBanner.setAttribute('aria-hidden','false');
    bannerTimer=setTimeout(hideWaveBanner,2100);
}
window.addEventListener('enzo:elimination', () => {
    if (isGamePaused) return;
    eliminations++;
    document.getElementById('killCount').textContent = String(eliminations);
    document.getElementById('killFill').style.width = Math.min(100,eliminations/goal*100)+'%';
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
    world.setMood(1);
    worldPolish.setMood(1);
    hitCooldown = 0;
    nextWavePending = false;
    setHealth(100);
    waveDisplay.textContent = '01';
    document.getElementById('waveState').textContent = 'SENTINELS ACTIVE';
    eliminations = 0;
    document.getElementById('killCount').textContent = '0';
    document.getElementById('killFill').style.width = '0%';
    document.getElementById('objectiveText').textContent = 'Eliminate 5 enemies';
    toast.textContent = '';
    toast.classList.remove('is-visible');
    hideWaveBanner();
    document.getElementById('resumeButton').firstChild.textContent = 'RESUME GAME ';
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

// Start and resume run from a direct user click. No fake loading percentage.
startButton.addEventListener('click', () => {
    if (startButton.disabled) return;
    resetGame();
    enterGameplay();
    requestGameplayLock();
});
document.getElementById('resumeButton').addEventListener('click', () => {
    if (health === 0) resetGame();
    enterGameplay();
    requestGameplayLock();
});
document.getElementById('exitButton').addEventListener('click', () => {
    isExitingToMenu = true;
    gameStarted = false;
    isGamePaused = true;
    hidePauseScreen();
    shooting.reset();
    hand.reset();
    movement.reset();
    if (document.pointerLockElement === renderer.domElement && document.exitPointerLock) {
        document.exitPointerLock();
    } else {
        isExitingToMenu = false;
        showSplashScreen();
    }
    // Exit fullscreen if the player enabled it independently of the game.
    if (document.fullscreenElement && document.exitFullscreen) {
        const result = document.exitFullscreen();
        if (result && typeof result.catch === 'function') result.catch(() => {});
    }
});

// Native dialog gives keyboard users proper focus management and Esc-to-close.
const helpDialog = document.getElementById('howToPlayDialog');
const helpButton = document.getElementById('howToPlayButton');
helpButton.addEventListener('click', () => helpDialog.showModal());
function closeHelp() {
    if (helpDialog.open) helpDialog.close();
}
document.getElementById('closeHowToPlay').addEventListener('click', closeHelp);
document.getElementById('returnToMenu').addEventListener('click', closeHelp);
helpDialog.addEventListener('click', event => {
    if (event.target === helpDialog) closeHelp();
});
helpDialog.addEventListener('close', () => helpButton.focus({preventScroll:true}));

document.addEventListener('pointerlockchange', onPointerLockChange);
document.addEventListener('pointerlockerror', onPointerLockError);
document.addEventListener('visibilitychange', () => {
    if (document.hidden && document.pointerLockElement !== renderer.domElement) {
        isGamePaused = true;
    }
});

// Never block the whole game on a cosmetic hand model. If the asset fails,
// gameplay and mouse capture still work; the model can be repaired separately.
startButton.disabled = false;
setMenuStatus('READY TO PLAY / LOADING GAUNTLET IN BACKGROUND…');
window.dispatchEvent(new Event('enzo:boot-ready'));
Promise.race([
    hand.ready,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Hand load timed out')), 10000))
]).then(() => {
    if (!gameStarted) setMenuStatus('GAUNTLET ONLINE / READY TO PLAY');
}).catch(error => {
    console.error('Optional hand model failed to load:', error);
    if (!gameStarted) setMenuStatus('READY TO PLAY / GAUNTLET UNAVAILABLE');
});
