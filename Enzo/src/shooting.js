import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
import { damageEnemy, getEnemyHitboxes } from './enemies.js';

// Set this to `true` to enable debug mode or `false` to disable it
const debugMode = true;

// Helper function for logging when debug mode is enabled
function debugLog(message, ...optionalParams) {
    if (debugMode) {
        console.log(message, ...optionalParams);
    }
}

// Set up shooting events (listens for mouse click)
export function setupShootingEvents(camera, scene, gunOffset) {
    window.addEventListener('mousedown', (event) =>
        handleShooting(event, camera, scene, gunOffset)
    );
}

// Handle shooting
function handleShooting(event, camera, scene, gunOffset) {
    if (event.isTrusted && document.pointerLockElement) {
        const gunPosition = camera.position
            .clone()
            .add(gunOffset.clone().applyQuaternion(camera.quaternion));
        const bulletDirection = new THREE.Vector3();
        camera.getWorldDirection(bulletDirection);
        bulletDirection.normalize();

        // Perform hitscan shooting and create a visual bullet
        performRaycastShooting(scene, gunPosition, bulletDirection);
    }
}

// Perform hitscan shooting
function performRaycastShooting(scene, origin, direction) {
    const raycaster = new THREE.Raycaster(origin, direction, 0, 1000);
    const shootableObjects = getEnemyHitboxes();

    const intersects = raycaster.intersectObjects(shootableObjects, true);

    if (intersects.length > 0) {
        const hitPoint = intersects[0].point;
        const hitObject = intersects[0].object;

        // Handle the hit
        handleProjectileHit(scene, hitObject);

        // Create a visual bullet that stops at the hit point
        createVisualBullet(scene, origin, direction, hitPoint);
    } else {
        debugLog('Shot missed.');

        // Create a visual bullet that goes the full distance
        createVisualBullet(scene, origin, direction);
    }
}

// Function to handle projectile hits and damage
function handleProjectileHit(scene, hitObject) {
    debugLog('Projectile hit enemy');

    // Apply damage to the enemy via enemies.js
    const enemyFound = damageEnemy(scene, hitObject, 25);

    if (!enemyFound) {
        debugLog('Enemy not found or already marked for removal.');
    } else if (enemyFound.health <= 0) {
        debugLog('Enemy fully removed.');
    }
}

// Create a visual bullet (green sphere)
function createVisualBullet(scene, origin, direction, hitPoint = null) {
    const geometry = new THREE.SphereGeometry(0.04, 16, 16); // Green sphere
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Green color
    const visualBullet = new THREE.Mesh(geometry, material);

    visualBullet.position.copy(origin);
    scene.add(visualBullet);

    const bulletSpeed = 500; // Adjust speed as needed (units per second)
    let travelDistance = 1000;
    let travelTime = travelDistance / bulletSpeed;
    let targetPosition = origin.clone().add(direction.clone().multiplyScalar(travelDistance));

    if (hitPoint) {
        targetPosition.copy(hitPoint);
        const actualDistance = origin.distanceTo(hitPoint);
        travelTime = actualDistance / bulletSpeed;
    }

    const startTime = performance.now();

    function animateBullet() {
        const elapsedTime = (performance.now() - startTime) / 1000; // Convert to seconds
        const t = elapsedTime / travelTime;

        if (t >= 1) {
            scene.remove(visualBullet);
            return;
        }

        visualBullet.position.lerpVectors(origin, targetPosition, t);
        requestAnimationFrame(animateBullet);
    }

    animateBullet();
}
