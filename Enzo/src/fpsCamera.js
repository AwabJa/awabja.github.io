import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

// Constants for player settings
const EYE_LEVEL = 1.7;
const CROUCH_HEIGHT = 1.0;
const MIN_HEIGHT = 1.0;
const ACCELERATION = 10;
const DECELERATION = 8;
const SPRINT_MULTIPLIER = 1.5;
const GRAVITY = 9.8;
const JUMP_SPEED = 5;
const COLLISION_DISTANCE = 0.5;
const NORMAL_FOV = 74;
const SPRINT_FOV = 80;
const SMOOTH_STOP_FACTOR = 0.8;
const FOV_LERP_FACTOR = 0.1;
const MOUSE_SENSITIVITY = 0.002;

const DIRECTIONS = [
    new THREE.Vector3(1, 0, 0),   // +X (right)
    new THREE.Vector3(-1, 0, 0),  // -X (left)
    new THREE.Vector3(0, 0, 1),   // +Z (forward)
    new THREE.Vector3(0, 0, -1),  // -Z (backward)
    new THREE.Vector3(0, -1, 0),  // -Y (downward, for ground collision)
];

let velocity = new THREE.Vector3(0, 0, 0);
let isSprinting = false;
let isJumping = false;
let isCrouching = false;
let verticalVelocity = 0;
let yaw = 0;
let pitch = 0;

const raycaster = new THREE.Raycaster();

export function setupCamera() {
    const camera = new THREE.PerspectiveCamera(NORMAL_FOV, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, EYE_LEVEL, 0);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });

    return camera;
}

function updateFOV(camera) {
    const targetFOV = isSprinting ? SPRINT_FOV : NORMAL_FOV;
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, FOV_LERP_FACTOR);
    camera.updateProjectionMatrix();
}

export function updateCameraPosition(camera, deltaTime) {
    velocity.x -= velocity.x * DECELERATION * deltaTime;
    velocity.z -= velocity.z * DECELERATION * deltaTime;

    if (isJumping || camera.position.y > MIN_HEIGHT) {
        verticalVelocity -= GRAVITY * deltaTime;
    }
    camera.position.y += verticalVelocity * deltaTime;

    // Smooth stopping when landing on the ground
    if (camera.position.y <= MIN_HEIGHT) {
        camera.position.y = MIN_HEIGHT;
        isJumping = false;
        verticalVelocity = 0;
    }

    camera.position.x += velocity.x * deltaTime;
    camera.position.z += velocity.z * deltaTime;

    // Update height for crouching or normal stance smoothly
    const targetHeight = isCrouching ? CROUCH_HEIGHT : EYE_LEVEL;
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetHeight, 0.1);

    updateFOV(camera);
}

export function updateCameraRotation(camera, movementX, movementY) {
    const maxPitch = Math.PI / 2;

    yaw -= movementX * MOUSE_SENSITIVITY;
    pitch -= movementY * MOUSE_SENSITIVITY;
    pitch = THREE.MathUtils.clamp(pitch, -maxPitch, maxPitch);

    const quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
    camera.quaternion.copy(quaternion);
}

// Helper function to apply smooth stopping
function smoothStop() {
    velocity.x *= SMOOTH_STOP_FACTOR;
    velocity.z *= SMOOTH_STOP_FACTOR;
}

export function preventCollisions(camera, scene) {
    const rayOrigin = camera.position.clone();
    rayOrigin.y -= EYE_LEVEL;  // Adjust raycast to originate from player's feet

    DIRECTIONS.forEach((direction) => {
        raycaster.set(rayOrigin, direction);
        const intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0 && intersects[0].distance < COLLISION_DISTANCE) {
            if (direction.y === -1 && isJumping) {
                verticalVelocity = 0;  // Stop jumping if hitting the ground
                isJumping = false;
            } else {
                smoothStop();  // Apply smooth stop on collision
                camera.position.add(direction.multiplyScalar(-0.1));  // Push camera slightly back to prevent overlap
            }
        }
    });
}

// Generic key handling function
function handleKeyState(keyPressed, state) {
    switch (keyPressed) {
        case 'Shift':
            isSprinting = state;
            break;
        case 'Space':
            if (!isJumping && !isCrouching && state) {
                isJumping = true;
                verticalVelocity = JUMP_SPEED;
            }
            break;
        case 'C':
            if (!isJumping) {
                isCrouching = state;
            }
            break;
    }
}

// Sprint handling (Shift)
export function handleSprint(keyPressed) {
    handleKeyState(keyPressed, keyPressed === 'Shift');
}

// Jumping logic (Space)
export function handleJump(keyPressed) {
    handleKeyState(keyPressed, keyPressed === 'Space');
}

// Crouch handling (C key)
export function handleCrouch(keyPressed) {
    handleKeyState(keyPressed, keyPressed === 'C');
}