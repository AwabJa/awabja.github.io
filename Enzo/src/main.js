// src/main.js

import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
import { enemies, createEnemy, updateEnemies, initializeEnemies, clearEnemies } from './enemies.js';
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
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 900 ? 1.1 : 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);

// Lighting setup
const ambientLight = new THREE.AmbientLight(0x9ab6d0, 0.42);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffe2b4, 1.4);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = window.innerWidth < 900 ? 1024 : 2048;
directionalLight.shadow.mapSize.height = window.innerWidth < 900 ? 1024 : 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 100;
directionalLight.shadow.bias = -0.0005;

directionalLight.shadow.camera.left = -50;
directionalLight.shadow.camera.right = 50;
directionalLight.shadow.camera.top = 50;
directionalLight.shadow.camera.bottom = -50;
scene.add(directionalLight);

// Cinematic ground: procedural, tileable albedo and roughness/normal maps.
// Generated in the browser to avoid heavy external texture downloads.
function createGroundMaps(size = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(size, size);
    const heights = new Float32Array(size * size);
    const fract = n => n - Math.floor(n);
    const hash = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
    const noise = (x, y, scale) => {
        const gx = x / scale, gy = y / scale, ix = Math.floor(gx), iy = Math.floor(gy);
        const fx = gx - ix, fy = gy - iy;
        const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
        const h = (dx, dy) => hash((ix + dx + 4096) % 4096, (iy + dy + 4096) % 4096);
        return (h(0,0)*(1-u)+h(1,0)*u)*(1-v)+(h(0,1)*(1-u)+h(1,1)*u)*v;
    };
    for (let y=0;y<size;y++) for(let x=0;x<size;x++) {
        const i=y*size+x;
        const coarse=noise(x,y,90), medium=noise(x,y,22), fine=noise(x,y,5);
        const grit=hash(x,y);
        const cracks=Math.min(x%128,128-x%128,y%128,128-y%128)<1.7 ? .33 : 0;
        const h=coarse*.48+medium*.32+fine*.14+grit*.06-cracks;
        heights[i]=h;
        const shade=Math.max(0,Math.min(255, Math.round(34+h*61)));
        const o=i*4;
        image.data[o]=shade+7;image.data[o+1]=shade+5;image.data[o+2]=shade+1;image.data[o+3]=255;
    }
    ctx.putImageData(image,0,0);
    const color = new THREE.CanvasTexture(canvas);
    color.encoding=THREE.sRGBEncoding;
    const normalCanvas=document.createElement('canvas');normalCanvas.width=normalCanvas.height=size;
    const nctx=normalCanvas.getContext('2d');const normal=nctx.createImageData(size,size);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
        const i=y*size+x;
        const left=heights[y*size+(x+size-1)%size],right=heights[y*size+(x+1)%size];
        const up=heights[((y+size-1)%size)*size+x],down=heights[((y+1)%size)*size+x];
        const nx=(left-right)*2.5,ny=(up-down)*2.5,nz=1;
        const len=Math.hypot(nx,ny,nz);const o=i*4;
        normal.data[o]=128+127*nx/len;normal.data[o+1]=128+127*ny/len;normal.data[o+2]=128+127*nz/len;normal.data[o+3]=255;
    }
    nctx.putImageData(normal,0,0);
    const normalMap=new THREE.CanvasTexture(normalCanvas);
    for(const texture of [color,normalMap]){
        texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
        texture.repeat.set(22,22);
        texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    }
    return {color,normalMap};
}
const groundMaps=createGroundMaps();
const floorMaterial=new THREE.MeshStandardMaterial({map:groundMaps.color,normalMap:groundMaps.normalMap,roughness:.97,metalness:.03});
const floor=new THREE.Mesh(new THREE.PlaneGeometry(175,175,1,1),floorMaterial);
floor.rotation.x=-Math.PI/2;floor.position.y=0;floor.receiveShadow=true;scene.add(floor);

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 900 ? 1.1 : 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    adjustCrosshair(); // Ensure crosshair scales correctly
});

// Spawn enemies only after the player presses Start (not behind the splash screen).

// Animation loop
const dayDurationInSeconds = 900;
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

        movement.updateMovement(delta);
        updateEnemies(scene, delta, camera.position);
        updateSurvival(delta);

        const currentTimeOfDay = (Date.now() % (dayDurationInSeconds * 1000)) / (dayDurationInSeconds * 1000);
        updateSunPosition(currentTimeOfDay);
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
