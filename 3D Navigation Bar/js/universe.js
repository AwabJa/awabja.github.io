// Scene, Camera, Renderer Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); // Set background to black (space)

// Camera setup for a more immersive experience
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
camera.position.set(0, 250, 400);
camera.lookAt(scene.position); // Focus on the center of the solar system

// WebGL Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio); // Adjust for device pixel ratio
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Orbit Controls for navigation
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.minDistance = 100;
controls.maxDistance = 500;
controls.enablePan = true;
controls.target.set(0, 0, 0);
controls.update();

// Texture Loader
const textureLoader = new THREE.TextureLoader();

// Lighting Setup
const light = new THREE.PointLight(0xffffff, 2, 500);
light.position.set(0, 0, 1);
light.castShadow = true;
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040, 1)); // Ambient Light for overall scene visibility

// Raycaster and Mouse/Touch for object interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const clickableObjects = []; // Store clickable objects (planets and the sun)

// Utility function to load a texture
function loadTexture(path) {
    return textureLoader.load(path);
}

// Function to create a planet with textures, orbit, and rotation properties
function createPlanet(size, texturePath, bumpMapPath, bumpScale, distanceFromCenter, speed, phaseOffset, rotationSpeed) {
    const geometry = new THREE.SphereGeometry(size, 64, 64);
    const material = new THREE.MeshStandardMaterial({
        map: loadTexture(texturePath),
        bumpMap: bumpMapPath ? loadTexture(bumpMapPath) : null,
        bumpScale: bumpScale
    });
    const planet = new THREE.Mesh(geometry, material);

    // Orbit and rotation properties
    planet.orbitSpeed = speed;
    planet.distance = distanceFromCenter;
    planet.phaseOffset = phaseOffset;
    planet.rotationSpeed = rotationSpeed;

    scene.add(planet);
    clickableObjects.push(planet); // Make the planet clickable

    return planet;
}

// Function to create an atmosphere around planets
function createAtmosphere(planet, size, color, intensity) {
    const atmosphereGeometry = new THREE.SphereGeometry(size, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: intensity,
        blending: THREE.AdditiveBlending
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    planet.add(atmosphere);
}

// Add rings to Saturn
function addSaturnRings(planet, innerRadius, outerRadius, texturePath) {
    const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 128);
    const ringMaterial = new THREE.MeshPhongMaterial({
        map: loadTexture(texturePath),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = THREE.Math.degToRad(27);
    ring.position.y = 0.1;
    planet.add(ring);
}

// Planets creation (stored in an array for easy management)
const planets = [
    createPlanet(3, 'assets/mercury.jpg', null, 0, 50, 0.01, Math.random() * Math.PI * 2, 0.001),
    createPlanet(4, 'assets/venus.jpg', null, 0, 100, 0.008, Math.random() * Math.PI * 2, 0.0009),
    createPlanet(4.5, 'assets/earth.jpg', 'assets/earth_bump.jpg', 0.1, 150, 0.006, Math.random() * Math.PI * 2, 0.001),
    createPlanet(3.5, 'assets/mars.jpg', 'assets/mars_bump.jpg', 0.05, 200, 0.004, Math.random() * Math.PI * 2, 0.0007),
    createPlanet(25, 'assets/jupiter.jpg', null, 0, 400, 0.002, Math.random() * Math.PI * 2, 0.0005),
    createPlanet(12, 'assets/uranus.jpg', null, 0, 800, 0.0015, Math.random() * Math.PI * 2, 0.0002),
    createPlanet(12, 'assets/neptune.jpg', null, 0, 1000, 0.0012, Math.random() * Math.PI * 2, 0.0002),
];

// Add Saturn with rings
const saturn = createPlanet(20, 'assets/saturn.jpg', null, 0, 600, 0.0018, Math.random() * Math.PI * 2, 0.0003);
addSaturnRings(saturn, 23, 30, 'assets/saturn_ring.png');

// Add atmospheres to Earth and Venus
createAtmosphere(planets[2], 4.8, 0x88ccff, 0.2);
createAtmosphere(planets[1], 4.5, 0xffcc88, 0.2);

// Sun creation with rotation speed
const sun = new THREE.Mesh(new THREE.SphereGeometry(30, 64, 64), new THREE.MeshBasicMaterial({ map: loadTexture('assets/sun.jpg') }));
sun.rotationSpeed = 0.0005;
scene.add(sun);
clickableObjects.push(sun);

// Lens flare for the Sun
const flareTexture = loadTexture('assets/lensflare0.png');
const flareMaterial = new THREE.SpriteMaterial({
    map: flareTexture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    opacity: 0.05
});
const lensFlare = new THREE.Sprite(flareMaterial);
lensFlare.scale.set(100, 100, 1);
sun.add(lensFlare);

// Handle clicks and touch events on planets using raycasting
function handleInteraction(event) {
    event.preventDefault(); // Prevent any unwanted default behavior
    if (event.type === 'touchstart') {
        mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
    } else if (event.type === 'click') {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(clickableObjects);
    if (intersects.length > 0) {
        const planet = intersects[0].object;
        console.log(`You clicked on ${planet.name}`);
        window.open('https://awabja.github.io', '_blank');
    }
}

// Add event listeners for both click and touchstart
window.addEventListener('click', handleInteraction);
window.addEventListener('touchstart', handleInteraction);

// Starfield with blue glow effect (adjusted for density)
function createStarField() {
    const starsGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    const starColors = [];

    // Adjust star density based on device type
    const numberOfStars = window.innerWidth < 768 ? 10000 : 10000; // Adjust star count for mobile and desktop

    for (let i = 0; i < numberOfStars; i++) {
        const x = (Math.random() - 0.5) * 8000;
        const y = (Math.random() - 0.5) * 8000;
        const z = (Math.random() - 0.5) * 8000;
        starVertices.push(x, y, z);

        const color = new THREE.Color();
        color.set(Math.random() > 0.8 ? 0xff0000 : Math.random() > 0.6 ? 0x00aaff : Math.random() > 0.4 ? 0xffff00 : 0xffffff);
        starColors.push(color.r, color.g, color.b);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

    const starsMaterial = new THREE.PointsMaterial({
        map: loadTexture('assets/blue_star_glow.png'),
        size: window.innerWidth < 768 ? 20 : 36, // Adjust star size for mobile
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}
createStarField();

// Nebula background
const nebulaPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 200),
    new THREE.MeshBasicMaterial({
        map: loadTexture('assets/nebula_texture.jpg'),
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    })
);
nebulaPlane.position.set(0, 300, -1500);
nebulaPlane.scale.set(0.4, 0.4, 0.4);
scene.add(nebulaPlane);

// Planet orbit and rotation animation
function animatePlanets() {
    const time = Date.now() * 0.005;
    planets.forEach(planet => {
        planet.position.set(
            Math.cos(time * planet.orbitSpeed + planet.phaseOffset) * planet.distance,
            0,
            Math.sin(time * planet.orbitSpeed + planet.phaseOffset) * planet.distance
        );
        planet.rotation.y += planet.rotationSpeed;
    });
    sun.rotation.y += sun.rotationSpeed;
}

// Main animation loop
let nebulaMovement = 0;
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    animatePlanets();
    nebulaPlane.position.x = Math.sin(nebulaMovement += 0.001) * 50;
    renderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});
