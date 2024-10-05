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

// Function to create and return a projectile (bullet)
export function createProjectile(scene, playerPosition, direction) {
    const geometry = new THREE.SphereGeometry(0.04, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00  });
    const bullet = new THREE.Mesh(geometry, material);

    bullet.position.copy(playerPosition);  // Start at player's position
    bullet.previousPosition = bullet.position.clone();
    bullet.velocity = direction.clone().normalize().multiplyScalar(50);  // Normalize and set higher speed
    bullet.lifespan = 2;  // Lifespan of the projectile (in seconds)
    bullet.targetHit = false;  // Track whether the bullet has hit a target
    bullet.distanceTraveled = 0;  // Track how far the bullet has traveled
    bullet.lastLoggedDistance = 0;  // Track last logged distance

    scene.add(bullet);
    return bullet;
}

// Set up shooting events (listens for mouse click)
export function setupShootingEvents(camera, scene, activeProjectiles, gunOffset) {
    window.addEventListener('mousedown', (event) => handleShooting(event, camera, scene, activeProjectiles, gunOffset));
}

// Handle shooting (create projectile on mouse click)
function handleShooting(event, camera, scene, activeProjectiles, gunOffset) {
    if (event.isTrusted && document.pointerLockElement) {
        const gunPosition = camera.position.clone().add(gunOffset.clone().applyQuaternion(camera.quaternion));
        const bulletDirection = new THREE.Vector3();
        camera.getWorldDirection(bulletDirection);
        bulletDirection.normalize();

        const projectile = createProjectile(scene, gunPosition, bulletDirection);
        if (projectile) {
            activeProjectiles.push(projectile);
        }
    }
}

// Update projectiles, check for collisions, and apply damage
export function updateProjectiles(scene, delta, projectiles) {
    const shootableObjects = getEnemyHitboxes();  // Get enemy hitboxes from enemies.js

    for (let i = projectiles.length - 1; i >= 0; i--) {
        const bullet = projectiles[i];

        if (!bullet.targetHit) {
            bullet.previousPosition.copy(bullet.position);  // Store previous position
            bullet.position.add(bullet.velocity.clone().multiplyScalar(delta));  // Move the bullet
            bullet.distanceTraveled += bullet.velocity.length() * delta;  // Update the distance traveled

            // Log distance only in debug mode
            if (bullet.distanceTraveled - bullet.lastLoggedDistance >= 1) {
                debugLog(`Bullet Distance Traveled: ${bullet.distanceTraveled}`);
                bullet.lastLoggedDistance = bullet.distanceTraveled;
            }

            // First, check for raycast collision only if the bullet has traveled
            let collisionResult = checkProjectileCollisionWithRay(scene, bullet, shootableObjects);
            if (collisionResult.hit && !bullet.targetHit) {
                handleProjectileHit(scene, bullet, collisionResult.hitObject, projectiles, i);
                continue;
            }
        }

        // Update bullet lifespan and remove when expired
        bullet.lifespan -= delta;
        if (bullet.lifespan <= 0) {
            debugLog("Bullet expired, removing from scene.");
            scene.remove(bullet);
            projectiles.splice(i, 1);
        }
    }
}

// Function to handle projectile hits and damage
function handleProjectileHit(scene, bullet, hitObject, projectiles, index) {
    bullet.targetHit = true;  // Mark bullet as having hit a target

    debugLog("Projectile hit enemy");

    // Apply damage to the enemy via enemies.js
    const enemyFound = damageEnemy(scene, hitObject, 25);

    // Delay removal of the bullet to ensure no interference with ongoing raycasting
    setTimeout(() => {
        if (scene && bullet) {
            scene.remove(bullet);
        }
        projectiles.splice(index, 1);

        if (!enemyFound) {
            debugLog("Enemy not found or already marked for removal.");
        } else {
            debugLog("Enemy fully removed.");
        }
    }, 0);
}

// Raycasting to check if a projectile hits an enemy
export function checkProjectileCollisionWithRay(scene, projectile, shootableObjects) {
    if (projectile.distanceTraveled < 0.5) {
        return { hit: false };  // Do not check for collisions if bullet hasn't traveled enough
    }

    const raycaster = new THREE.Raycaster();
    raycaster.set(projectile.previousPosition, projectile.velocity.clone().normalize());
    raycaster.far = projectile.previousPosition.distanceTo(projectile.position) + 1.0;  // Increased buffer to avoid missing targets

    const intersects = raycaster.intersectObjects(shootableObjects, true);  // Detect intersections

    if (intersects.length > 0) {
        const hitObject = intersects[0].object;

        // Ensure the hit object is actually a shootable object (enemy)
        if (shootableObjects.includes(hitObject)) {
            return { hit: true, hitObject: hitObject, hitPoint: intersects[0].point };  // Return hit object and point
        }
    }

    return { hit: false };  // No hit detected
}