// enemies.js

import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

export const enemies = [];
export const shootableObjects = [];

// Define the ground level (adjust this value based on your scene)
const GROUND_LEVEL = 0.8;

/* Every drone has armor, an eye and a light. Dispose descendant meshes too:
 * disposing only the root leaked GPU buffers/materials across survival waves. */
function disposeEnemy(scene, enemyData) {
    const enemy = enemyData.object;
    scene.remove(enemy);
    enemy.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            for (const material of materials) material.dispose();
        }
    });
    const i = shootableObjects.indexOf(enemy);
    if (i !== -1) shootableObjects.splice(i, 1);
}

// Four corrupted sentinel silhouettes. All child meshes raycast back to
// the registered root for damage; bright face cores are deliberate weak points.
const TYPES=[
  {name:'Scout',size:.70,health:85,patrol:2.35,chase:5.15,accent:0xff5677,shape:4},
  {name:'Sentinel',size:.94,health:150,patrol:1.45,chase:3.55,accent:0xf13861,shape:6},
  {name:'Brute',size:1.30,health:285,patrol:.85,chase:2.15,accent:0xff7350,shape:8},
  {name:'Warden',size:.79,health:110,patrol:1.85,chase:3.65,accent:0xb870ff,shape:5}
];
export function createEnemy(scene, position, kind=0) {
  const type=TYPES[((kind%TYPES.length)+TYPES.length)%TYPES.length];
  const size=type.size;
  const geometry=new THREE.IcosahedronGeometry(size,1);
  const material=new THREE.MeshStandardMaterial({
    color:0x35404e,metalness:.78,roughness:.33,flatShading:true,
    emissive:0x111522,emissiveIntensity:.25
  });
  const enemy=new THREE.Mesh(geometry,material);
  enemy.name=type.name+' / corrupted sentinel';
  enemy.position.copy(position);
  enemy.position.y=size+.15;
  enemy.castShadow=true;
  scene.add(enemy);

  function part(geometry,material,x=0,y=0,z=0){
    const mesh=new THREE.Mesh(geometry,material);
    mesh.position.set(x,y,z);
    enemy.add(mesh);
    return mesh;
  }
  const frameMat=new THREE.MeshStandardMaterial({
    color:0x131b29,metalness:.91,roughness:.23,flatShading:true
  });
  const trimMat=new THREE.MeshStandardMaterial({
    color:0x647183,metalness:.88,roughness:.28,emissive:0x110c18
  });
  const glowMat=new THREE.MeshBasicMaterial({color:type.accent});
  const haloMat=new THREE.MeshBasicMaterial({
    color:type.accent,transparent:true,opacity:.5,depthWrite:false,side:THREE.DoubleSide
  });
  const shell=part(new THREE.IcosahedronGeometry(size*.81,0),frameMat);
  shell.rotation.y=.33;
  for(let i=0;i<type.shape;i++){
    const theta=i*Math.PI*2/type.shape;
    const shard=part(new THREE.ConeGeometry(size*.27,size*.85,4),
      i%2?trimMat:frameMat,
      Math.sin(theta)*size*.89,Math.cos(theta)*size*.88,.05);
    shard.rotation.z=-theta;
    shard.rotation.x=.27;
    shard.rotation.y=theta;
  }
  // Bright optical heart floats ahead of the armor, facing the player.
  const eye=part(new THREE.IcosahedronGeometry(size*.30,2),glowMat,0,.03,size*1.01);
  eye.name='Exposed arcane core';eye.userData.weakPoint=true;
  const halo=part(new THREE.TorusGeometry(size*.41,size*.042,6,32),haloMat,0,.03,size*.89);
  const rim=part(new THREE.TorusGeometry(size*.76,size*.047,6,32),trimMat,0,0,size*.16);
  const rings=[];
  if(type.name==='Warden'){
    const satellite=part(new THREE.TorusGeometry(size*1.05,size*.045,6,40),haloMat);
    satellite.rotation.x=.9;
    rings.push(satellite);
  }
  if(type.name==='Brute'){
    const plate=part(new THREE.DodecahedronGeometry(size*.7,0),frameMat,0,0,-size*.23);
    plate.rotation.z=.3;
    for(const side of [-1,1]){
      const shoulder=part(new THREE.BoxGeometry(size*.66,size*.46,size*.59),
        frameMat,side*size*.69,size*.33,-size*.10);
      shoulder.rotation.z=side*.32;
    }
  }
  shootableObjects.push(enemy);
  const originalColor=material.color.clone();
  enemies.push({
    object:enemy,type,typeName:type.name,
    core:eye,halo,rim,rings,
    baseY:enemy.position.y,phase:Math.random()*Math.PI*2,health:type.health,maxHealth:type.health,
    isChasing:false,isPatrolling:true,patrolDirection:getRandomDirection(),
    patrolSpeed:type.patrol,patrolTime:0,patrolInterval:THREE.MathUtils.randFloat(1,3),
    separationDistance:4,playerAvoidanceDistance:2.6+size*.35,
    originalColor,isHighlighted:false,highlightTime:0,stuckTime:0,
    strafeDirection:Math.random()>.5?1:-1,isMarkedForRemoval:false,velocityY:0
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
    // Iterate in reverse order to safely remove enemies during iteration
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemyData = enemies[i];

        if (enemyData.isMarkedForRemoval) {
            // Remove the enemy from arrays and scene
            enemies.splice(i, 1);
            disposeEnemy(scene, enemyData);
            continue;
        }

        const enemy = enemyData.object;
        const distanceToPlayer = enemy.position.distanceTo(playerPosition);

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
            const direction = new THREE.Vector3().subVectors(playerPosition, enemy.position).normalize();

            if (distanceToPlayer > enemyData.playerAvoidanceDistance) {
                direction.x += THREE.MathUtils.randFloat(-0.1, 0.1);
                direction.z += THREE.MathUtils.randFloat(-0.1, 0.1);
                enemy.position.add(direction.multiplyScalar(enemyData.type.chase * delta));
            }

            // Handling enemy getting stuck
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

        // Hovering sentinels: motion is frame-rate independent and direction faces player.
        enemyData.phase += delta * (enemyData.typeName === 'Scout' ? 2.35 : 1.45);
        enemy.position.y = enemyData.baseY + Math.sin(enemyData.phase) * .15;
        enemy.rotation.y = Math.atan2(playerPosition.x-enemy.position.x, playerPosition.z-enemy.position.z);
        enemyData.core.scale.setScalar(1+.10*Math.sin(enemyData.phase*2.5));
        enemyData.halo.rotation.z += delta*.55;
        enemyData.rim.rotation.z -= delta*.10;
        for(const ring of enemyData.rings)ring.rotation.y+=delta*.42;
        // Support wardens slowly repair nearby allies.
        if(enemyData.typeName==='Warden') {
            for(const ally of enemies) {
                if(ally===enemyData || ally.isMarkedForRemoval)continue;
                if(ally.object.position.distanceToSquared(enemy.position)<144) {
                    ally.health=Math.min(ally.maxHealth,ally.health+delta*1.5);
                }
            }
        }

        // Reset the enemy's color if highlighted for damage
        if (enemyData.isHighlighted) {
            enemyData.highlightTime -= delta;
            if (enemyData.highlightTime <= 0) {
                enemy.material.color.copy(enemyData.originalColor);
                enemyData.isHighlighted = false;
            }
        }

        // Remove the enemy if health is 0 or less
        if (enemyData.health <= 0) {
            removeEnemy(scene, enemyData);
        }
    }
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

// Function to apply damage to the enemy
export function damageEnemy(scene, enemy, amount) {
    const enemyData = enemies.find(e => e.object === enemy);

    if (enemyData && !enemyData.isMarkedForRemoval) {
        // Apply damage and update health
        enemyData.health = Math.max(0, enemyData.health - amount);
        enemyData.isHighlighted = true;  // Highlight enemy when damaged
        enemyData.highlightTime = 0.1;   // Highlight duration in seconds (e.g., 0.1 seconds)
        enemyData.object.material.color.set(0xffff00);  // Change color to indicate hit

        console.log(`Enemy damaged. Health: ${enemyData.health}`);

        // If health is zero or below, mark for removal
        if (enemyData.health <= 0) {
            window.dispatchEvent(new Event('enzo:elimination'));
            console.log(`Enemy killed, removing...`);

            // Remove the enemy from shootableObjects array immediately
            const objIndex = shootableObjects.indexOf(enemyData.object);
            if (objIndex > -1) {
                shootableObjects.splice(objIndex, 1);
            }

            // Mark the enemy for removal
            removeEnemy(scene, enemyData);
        }

        return true;  // Return true if enemy was found and damaged
    } else {
        console.log("Enemy not found or already marked for removal.");
        return false;  // Return false if enemy was not found or already marked for removal
    }
}

// Remove the enemy from the scene and handle respawn
export function removeEnemy(scene, enemyData) {
    if (enemyData.isMarkedForRemoval) return;  // If already marked, avoid double removal
    enemyData.isMarkedForRemoval = true;  // Mark the enemy as ready for removal

    console.log(`Removing enemy`);

    // Enemy will be removed from arrays and scene in updateEnemies

    // Wave spawning is coordinated by main.js, not per-enemy timers.
}

// Function to get an array of enemy hitboxes for raycasting
export function getEnemyHitboxes() {
    // Return only active enemies that are not marked for removal
    return enemies.filter(e => !e.isMarkedForRemoval).map(e => e.object);
}

// Initialize enemies (added function)
export function initializeEnemies(scene, count) {
    for (let i = 0; i < count; i++) {
        const angle = (i * 2.399963 + Math.random() * .8) % (Math.PI * 2);
        const distance = 17 + Math.random() * 23;
        const position = new THREE.Vector3(
            Math.cos(angle) * distance, GROUND_LEVEL, Math.sin(angle) * distance
        );
        createEnemy(scene, position, i % TYPES.length);
    }
}

// Clear all enemies from the scene and enemies array (added function)
export function clearEnemies(scene) {
    enemies.forEach(enemyData => disposeEnemy(scene, enemyData));
    enemies.length = 0;  // Clear the array
    shootableObjects.length = 0; // Clear shootableObjects if necessary
    console.log("All enemies have been cleared from the scene.");
}
