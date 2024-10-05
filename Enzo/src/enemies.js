import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

export const enemies = [];
export const shootableObjects = [];

// Define the ground level (adjust this value based on your scene)
const GROUND_LEVEL = 0.8;

// Function to create an enemy and add it to the scene
export function createEnemy(scene, position) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const enemy = new THREE.Mesh(geometry, material);

    // Ensure enemy is above the ground
    position.y = GROUND_LEVEL;  // Place the enemy at the ground level or above
    enemy.position.copy(position);
    enemy.castShadow = true;
    scene.add(enemy);

    shootableObjects.push(enemy);

    enemies.push({
        object: enemy,
        health: 150,
        isChasing: false,
        isPatrolling: true, // Enemy will patrol by default
        patrolDirection: getRandomDirection(), // Random patrol direction
        patrolSpeed: 1.2,  // Increased patrolling speed for more engagement
        patrolTime: 0,  // Timer for changing patrol direction
        patrolInterval: THREE.MathUtils.randFloat(1, 3), // More frequent patrol direction changes
        separationDistance: 4,  // Reduced minimum distance for tighter formations
        playerAvoidanceDistance: 3,  // Minimum distance to maintain from player
        originalColor: new THREE.Color(0xff0000),
        isHighlighted: false,
        boundingBox: new THREE.Box3().setFromObject(enemy),  // Store bounding box for collision detection
        stuckTime: 0,  // Timer to detect if enemy is stuck
        orbitAngle: Math.random() * Math.PI * 2,  // Angle for circling behavior
        strafeDirection: Math.random() > 0.5 ? 1 : -1, // Random initial strafe direction (1 for right, -1 for left)
        isMarkedForRemoval: false, // Flag to prevent double removal
        velocityY: 0 // Velocity in the Y direction for simulating gravity
    });
}

// Function to generate a random patrol direction
function getRandomDirection() {
    return new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
}

// Function to spawn a group of enemies at a given position
export function spawnEnemyGroup(scene, groupCenter, groupSize = 1) {
    for (let i = 0; i < groupSize; i++) {
        const offsetX = THREE.MathUtils.randFloat(-5, 5);
        const offsetZ = THREE.MathUtils.randFloat(-5, 5);
        const position = new THREE.Vector3(groupCenter.x + offsetX, GROUND_LEVEL, groupCenter.z + offsetZ);
        createEnemy(scene, position);
    }
}

// Function to spawn multiple groups of enemies at different positions
export function spawnMultipleEnemyGroups(scene, playerSpawnPosition, safeDistance = 30) {
    const groupCenters = [];
    while (groupCenters.length < 2) {
        const randomPosition = new THREE.Vector3(
            THREE.MathUtils.randFloatSpread(100),
            GROUND_LEVEL,
            THREE.MathUtils.randFloatSpread(100)
        );
        if (randomPosition.distanceTo(playerSpawnPosition) > safeDistance) {
            groupCenters.push(randomPosition);
        }
    }
    groupCenters.forEach(groupCenter => {
        spawnEnemyGroup(scene, groupCenter, 1);
    });
}

// Function to update enemies (chasing player, patrolling, respawning, etc.)
export function updateEnemies(scene, delta, playerPosition) {
    enemies.forEach((enemyData, index) => {
        if (enemyData.isMarkedForRemoval) return; // Skip if enemy is marked for removal

        const enemy = enemyData.object;
        const distanceToPlayer = enemy.position.distanceTo(playerPosition);

        // Update bounding box position less frequently
        if (enemyData.isChasing || enemyData.isPatrolling) {
            enemyData.boundingBox.setFromObject(enemy);  // Ensure bounding box is accurate only when moving
        }

        // If player is close, the enemy starts chasing
        if (distanceToPlayer < 25 && distanceToPlayer > enemyData.playerAvoidanceDistance) {
            enemyData.isChasing = true;
            enemyData.isPatrolling = false;
        } else {
            enemyData.isChasing = false;
            enemyData.isPatrolling = true;
        }

        // Patrolling behavior
        if (enemyData.isPatrolling) {
            enemy.position.add(enemyData.patrolDirection.clone().multiplyScalar(enemyData.patrolSpeed * delta));

            enemyData.patrolTime += delta;
            if (enemyData.patrolTime > enemyData.patrolInterval) {
                enemyData.patrolDirection = getRandomDirection();
                enemyData.patrolTime = 0;
                enemyData.patrolInterval = THREE.MathUtils.randFloat(1, 3);
            }

            if (isAtBoundary(enemy)) {
                enemyData.patrolDirection = getRandomDirection();
            }
        }

        // Chasing behavior
        if (enemyData.isChasing) {
            const direction = new THREE.Vector3();
            direction.subVectors(playerPosition, enemy.position).normalize();

            if (distanceToPlayer > enemyData.playerAvoidanceDistance) {
                direction.x += THREE.MathUtils.randFloat(-0.1, 0.1);
                direction.z += THREE.MathUtils.randFloat(-0.1, 0.1);
                enemy.position.add(direction.multiplyScalar(3.5 * delta));
            }

            if (direction.length() < 0.01) {
                enemyData.stuckTime += delta;
            } else {
                enemyData.stuckTime = 0;
            }

            if (enemyData.stuckTime > 2) {
                enemyData.patrolDirection = getRandomDirection();
                enemyData.isChasing = false;
                enemyData.isPatrolling = true;
                enemyData.stuckTime = 0;
            }
        }

        // Apply separation force only during patrolling
        if (enemyData.isPatrolling) {
            applySeparationForce(enemyData, delta);
        }

        // Apply gravity and ensure enemies stay above the ground
        enemyData.velocityY -= 9.8 * delta; // Gravity effect
        enemy.position.y += enemyData.velocityY * delta;
        if (enemy.position.y < GROUND_LEVEL) {
            enemy.position.y = GROUND_LEVEL;
            enemyData.velocityY = 0; // Reset velocity when hitting the ground
        }

        // Reset the enemy's color if highlighted for damage
        if (enemyData.isHighlighted) {
            setTimeout(() => {
                if (enemyData.isMarkedForRemoval) return;
                enemy.material.color.copy(enemyData.originalColor);
                enemyData.isHighlighted = false;
            }, 100);
        }

        // Remove the enemy if health is 0 or less
        if (enemyData.health <= 0) {
            removeEnemy(scene, enemyData, index);
        }
    });
}

// Apply separation force to prevent enemies from overlapping
function applySeparationForce(enemyData, delta) {
    const separationForce = new THREE.Vector3();
    enemies.forEach((otherEnemyData) => {
        if (otherEnemyData === enemyData || otherEnemyData.isMarkedForRemoval) return;

        const otherEnemy = otherEnemyData.object;
        const distance = enemyData.object.position.distanceTo(otherEnemy.position);

        if (distance < enemyData.separationDistance) {
            const directionAway = new THREE.Vector3().subVectors(enemyData.object.position, otherEnemy.position).normalize();
            separationForce.add(directionAway.multiplyScalar(1.0));
        }
    });
    enemyData.object.position.add(separationForce.multiplyScalar(delta));
}

// Helper function to check if the enemy is at a boundary
function isAtBoundary(enemy) {
    const boundaryLimit = getDynamicBoundaryLimit();
    return Math.abs(enemy.position.x) > boundaryLimit || Math.abs(enemy.position.z) > boundaryLimit;
}

// Get dynamic boundary limit based on canvas size
function getDynamicBoundaryLimit() {
    const canvas = document.querySelector('canvas');
    if (!canvas) return 20;
    const aspectRatio = canvas.width / canvas.height;
    const boundaryLimit = 20 * aspectRatio;
    return Math.min(boundaryLimit, 50); // Set a fixed maximum boundary limit to avoid unintended behavior on extreme aspect ratios
}

// Remove the enemy from the scene and respawn after a delay
function removeEnemy(scene, enemyData, index) {
    if (enemyData.isMarkedForRemoval) return;
    enemyData.isMarkedForRemoval = true;

    console.log(`Removing enemy at index ${index}`);

    setTimeout(() => {
        scene.remove(enemyData.object);
        shootableObjects.splice(shootableObjects.indexOf(enemyData.object), 1);
        enemies.splice(index, 1);
        console.log(`Enemy fully removed.`);

        const respawnTime = 3000;
        setTimeout(() => {
            const respawnPosition = new THREE.Vector3(
                THREE.MathUtils.randFloatSpread(100),
                GROUND_LEVEL,
                THREE.MathUtils.randFloatSpread(100)
            );
            spawnEnemyGroup(scene, respawnPosition, 1);
        }, respawnTime);
    }, 100);
}

// Function to apply damage to the enemy
export function damageEnemy(scene, enemy, amount) {
    const enemyData = enemies.find(e => e.object === enemy);

    if (enemyData && !enemyData.isMarkedForRemoval) {
        enemyData.health = Math.max(0, enemyData.health - amount);
        enemyData.isHighlighted = true;
        enemyData.object.material.color.set(0xffff00);

        console.log(`Enemy damaged. Health: ${enemyData.health}`);

        if (enemyData.health <= 0) {
            console.log(`Enemy killed, removing...`);
            removeEnemy(scene, enemyData, enemies.indexOf(enemyData));
        }
    } else {
        console.log("Enemy not found or already marked for removal.");
    }
}

// Collision detection between projectiles and enemies
export function checkProjectileCollision(projectile, scene) {
    const projectileBox = new THREE.Box3().setFromObject(projectile);

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemyData = enemies[i];
        const enemyBox = enemyData.boundingBox;

        if (projectileBox.intersectsBox(enemyBox)) {
            console.log("Projectile hit enemy");
            damageEnemy(scene, enemyData.object, 25);
            setTimeout(() => {
                scene.remove(projectile);
            }, 100); // Add a small delay before removing the projectile for visual consistency
            return true;
        }
    }
    return false;
}

// Function to get an array of enemy hitboxes for raycasting
export function getEnemyHitboxes() {
    return enemies.map(e => e.object);
}