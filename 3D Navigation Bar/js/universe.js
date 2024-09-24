// Scene, Camera, Renderer Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); // Black background (space)

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
camera.position.set(0, 250, 400);
camera.lookAt(scene.position); // Focus on the center

// Renderer Setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio); // High DPI support
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Orbit Controls Setup
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.minDistance = 100;
controls.maxDistance = 500;
controls.enablePan = true;
controls.target.set(0, 0, 0);
controls.update();

// Texture Loader with Error Handling
const textureLoader = new THREE.TextureLoader();
const loadTexture = (path) => textureLoader.load(
    path,
    undefined,
    undefined,
    (err) => { console.error(`Error loading texture: ${path}`, err); }
);

// Lighting Setup
const light = new THREE.PointLight(0xffffff, 2, 500);
light.position.set(0, 0, 1);
light.castShadow = true;
scene.add(light);

const ambientLight = new THREE.AmbientLight(0x404040, 1); // Soft white light
scene.add(ambientLight);

// Raycaster and Mouse Vector
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Clickable Objects Array
const clickableObjects = [];

// Function to Create a Planet
function createPlanet(name, size, texturePath, distance, orbitSpeed, phaseOffset, rotationSpeed) {
    const geometry = new THREE.SphereGeometry(size, 64, 64);
    const material = new THREE.MeshStandardMaterial({
        map: loadTexture(texturePath),
    });
    const planet = new THREE.Mesh(geometry, material);
    planet.name = name; // Assign a name for identification

    // Orbit and Rotation Properties
    planet.userData = {
        orbitSpeed,
        distance,
        phaseOffset,
        rotationSpeed,
    };

    scene.add(planet);
    clickableObjects.push(planet); // Make the planet clickable

    return planet;
}

// Function to Create an Atmosphere
function createAtmosphere(planet, size, color, opacity) {
    const atmosphereGeometry = new THREE.SphereGeometry(size, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: opacity,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    atmosphere.name = `${planet.name} Atmosphere`;
    planet.add(atmosphere);
}

// Function to Add Saturn's Rings
function addSaturnRings(planet, innerRadius, outerRadius, texturePath) {
    const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 128);
    const ringMaterial = new THREE.MeshPhongMaterial({
        map: loadTexture(texturePath),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2; // Align rings horizontally
    ring.name = `${planet.name} Rings`;
    planet.add(ring);
}

// Creating Planets
const planets = [
    createPlanet('Mercury', 3, 'assets/mercury.jpg', 50, 0.01, Math.random() * Math.PI * 2, 0.001),
    createPlanet('Venus', 4, 'assets/venus.jpg', 100, 0.008, Math.random() * Math.PI * 2, 0.0009),
    createPlanet('Earth', 4.5, 'assets/earth.jpg', 150, 0.006, Math.random() * Math.PI * 2, 0.001),
    createPlanet('Mars', 3.5, 'assets/mars.jpg', 200, 0.004, Math.random() * Math.PI * 2, 0.0007),
    createPlanet('Jupiter', 25, 'assets/jupiter.jpg', 250, 0.001, Math.random() * Math.PI * 2, 0.0005),
    createPlanet('Uranus', 12, 'assets/uranus.jpg', 800, 0.0015, Math.random() * Math.PI * 2, 0.0002),
    createPlanet('Neptune', 12, 'assets/neptune.jpg', 1000, 0.0012, Math.random() * Math.PI * 2, 0.0002),
];

// Adding Atmospheres to Earth, Venus, and Mars
createAtmosphere(planets[2], 4.8, 0x88ccff, 0.2); // Earth
createAtmosphere(planets[1], 4.5, 0xffcc88, 0.2); // Venus
createAtmosphere(planets[3], 4.0, 0xff5533, 0.15); // Mars

// Creating Saturn and Its Rings
const saturn = createPlanet('Saturn', 20, 'assets/saturn.jpg', 600, 0.0018, Math.random() * Math.PI * 2, 0.0003);
addSaturnRings(saturn, 23, 30, 'assets/saturn_ring.png');
planets.push(saturn); // Add Saturn to the planets array

// Creating the Sun
const sunGeometry = new THREE.SphereGeometry(40, 64, 64);
const sunMaterial = new THREE.MeshBasicMaterial({ map: loadTexture('assets/sun.jpg') });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
sun.name = 'Sun'; // Assign a name
sun.userData.rotationSpeed = 0.0005;
scene.add(sun);
clickableObjects.push(sun); // Make the sun clickable

// Function to Create and Add Lens Flare to the Sun
function createLensFlare() {
    const flareTexture = loadTexture('assets/lensflare0.png');
    const flareMaterial = new THREE.SpriteMaterial({
        map: flareTexture,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    const lensFlare = new THREE.Sprite(flareMaterial);
    lensFlare.scale.set(100, 100, 1);
    lensFlare.name = 'Lens Flare';
    sun.add(lensFlare);
}

// Adding Lens Flare to the Sun
createLensFlare();

// Update Lens Flare on Visibility Change
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        const existingFlare = sun.children.find(child => child instanceof THREE.Sprite && child.name === 'Lens Flare');
        if (!existingFlare) {
            createLensFlare(); // Recreate if missing
        }
    }
});

// Function to Create Starfield
function createStarField() {
    const starsGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    const starColors = [];
    const numberOfStars = 10000;

    for (let i = 0; i < numberOfStars; i++) {
        const x = (Math.random() - 0.5) * 8000;
        const y = (Math.random() - 0.5) * 8000;
        const z = (Math.random() - 0.5) * 8000;
        starVertices.push(x, y, z);

        const color = new THREE.Color();
        const rand = Math.random();

        // Color Probabilities
        if (rand > 0.7) {
            color.set(0xff0000); // Red (30% chance)
        } else if (rand > 0.4) {
            color.set(0xffff00); // Yellow (30% chance)
        } else if (rand > 0.2) {
            color.set(0xffffff); // White (20% chance)
        } else {
            color.set(0x00aaff); // Blue (20% chance)
        }

        starColors.push(color.r, color.g, color.b);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

    const starsMaterial = new THREE.PointsMaterial({
        map: loadTexture('assets/blue_star_glow.png'),
        size: 36,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}

// Adding Starfield to the Scene
createStarField();

// Creating Nebula Background
const nebulaGeometry = new THREE.PlaneGeometry(400, 200);
const nebulaMaterial = new THREE.MeshBasicMaterial({
    map: loadTexture('assets/nebula_texture.jpg'),
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
});
const nebulaPlane = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
nebulaPlane.position.set(0, 300, -1500);
nebulaPlane.scale.set(0.4, 0.4, 0.4);
nebulaPlane.name = 'Nebula';
scene.add(nebulaPlane);

// Function to Handle Click Interactions
function handleInteraction(event) {
    // Only prevent default for touchend events to allow normal click behavior
    if (event.type === 'touchend') {
        event.preventDefault();
    }

    let clientX, clientY;

    if (event.type === 'click') {
        clientX = event.clientX;
        clientY = event.clientY;
    } else if (event.type === 'touchend') {
        if (event.changedTouches && event.changedTouches.length > 0) {
            clientX = event.changedTouches[0].clientX;
            clientY = event.changedTouches[0].clientY;
        } else {
            return; // No touch data available
        }
    } else {
        return; // Unsupported event type
    }

    // Calculate normalized device coordinates (-1 to +1)
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    // Update the raycaster
    raycaster.setFromCamera(mouse, camera);

    // Determine intersections with clickable objects
    const intersects = raycaster.intersectObjects(clickableObjects, false); // No recursion to exclude child objects

    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        console.log(`You clicked on ${clickedObject.name}`);
        window.open('https://awabja.github.io', '_blank'); // Open your website in a new tab
    }
}

// Attach event listeners to the renderer's DOM element
renderer.domElement.addEventListener('click', handleInteraction, false);
renderer.domElement.addEventListener('touchend', handleInteraction, false);

// Main Animation Loop
function animate() {
    requestAnimationFrame(animate);

    // Update controls
    controls.update();

    // Time variable for orbital mechanics
    const time = Date.now() * 0.005;

    // Update planet positions and rotations
    planets.forEach(planet => {
        const { orbitSpeed, distance, phaseOffset, rotationSpeed } = planet.userData;
        planet.position.set(
            Math.cos(time * orbitSpeed + phaseOffset) * distance,
            0,
            Math.sin(time * orbitSpeed + phaseOffset) * distance
        );
        planet.rotation.y += rotationSpeed;
    });

    // Rotate the Sun
    sun.rotation.y += sun.userData.rotationSpeed;

    // Render the scene
    renderer.render(scene, camera);
}

// Start the Animation Loop
animate();

// Handle Window Resize
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});
