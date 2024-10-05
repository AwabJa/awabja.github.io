import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

const baseMovementSpeed = 3.8;
const crouchSpeed = 0.95;
const sprintSpeed = 6.0;
const acceleration = 15.0;
const deceleration = 7.0;
const jumpSpeed = 4;
const gravity = 4.0;
const maxFallSpeed = -15.0;

let currentSpeed = 0;
let isJumping = false;
let isCrouching = false;
let isSprinting = false;
let verticalVelocity = 0;
const moveDirection = new THREE.Vector3();
const targetDirection = new THREE.Vector3();

const keyStates = {};

let targetHeight = 1.7;
let currentHeight = 1.7;

export function setupMovement(camera) {
    document.addEventListener('keydown', handleKeyDown, { passive: false });
    document.addEventListener('keyup', handleKeyUp, { passive: false });

    function handleKeyDown(event) {
        keyStates[event.code] = true;

        // Prevent default behavior for keys (e.g., space to prevent scroll)
        if (event.code === 'Space') event.preventDefault();
    }

    function handleKeyUp(event) {
        keyStates[event.code] = false;
    }

    function updateMovement(delta) {
        let movementSpeed = baseMovementSpeed;

        // Reset target direction each frame to avoid accumulation
        targetDirection.set(0, 0, 0);

        // Handle crouch (C key)
        if (keyStates['KeyC']) {
            targetHeight = 1.0;
            movementSpeed = crouchSpeed;
            isCrouching = true;
        } else {
            targetHeight = 1.7;
            isCrouching = false;
        }

        // Handle sprint (Shift key)
        isSprinting = (keyStates['ShiftLeft'] || keyStates['ShiftRight']);
        if (!isCrouching) {  // Sprinting should not work while crouching
            movementSpeed = isSprinting ? sprintSpeed : movementSpeed;
        }

        // Smooth height transitions (crouch/stand)
        currentHeight += (targetHeight - currentHeight) * delta * 10;
        camera.position.y = currentHeight;

        // Handle movement directions (WASD keys)
        if (keyStates['KeyW']) targetDirection.z -= 1;
        if (keyStates['KeyS']) targetDirection.z += 1;
        if (keyStates['KeyA']) targetDirection.x -= 1;
        if (keyStates['KeyD']) targetDirection.x += 1;

        // Normalize direction if movement is detected
        if (targetDirection.lengthSq() > 0) {
            targetDirection.normalize();

            // Accelerate towards max allowed speed
            currentSpeed = Math.min(currentSpeed + acceleration * delta, movementSpeed);
        } else {
            // Decelerate if no input is detected
            currentSpeed = Math.max(currentSpeed - deceleration * delta, 0);
        }

        // Apply movement
        if (currentSpeed > 0) {
            moveDirection.copy(targetDirection).multiplyScalar(currentSpeed * delta);
            moveDirection.applyQuaternion(camera.quaternion);
            camera.position.add(moveDirection);
        }

        // Handle jumping (Space key)
        if (!isJumping && keyStates['Space'] && !isCrouching) {  // Can't jump while crouching
            isJumping = true;
            verticalVelocity = jumpSpeed;
        }

        // Apply gravity and jumping logic
        if (isJumping) {
            verticalVelocity -= gravity * delta;
            verticalVelocity = Math.max(verticalVelocity, maxFallSpeed);
            camera.position.y += verticalVelocity * delta;

            // Landing detection
            if (camera.position.y <= currentHeight + 0.01) {
                camera.position.y = currentHeight;
                isJumping = false;
                verticalVelocity = 0;
            }
        }
    }

    return { updateMovement };
}
