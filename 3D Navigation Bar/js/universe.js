/* =========================================================================
   3D SOLAR SYSTEM NAV BAR
   -------------------------------------------------------------------------
   Each planet is a clickable nav item. Hover shows its name in a tooltip,
   click opens its configured URL. Edit PLANET_LINKS below to point every
   body at a different page on your site.
   ========================================================================= */

// Global safety net: if anything throws anywhere in this file (e.g. a CDN
// script failed to load and a "is not a constructor" error is thrown), make
// sure the loading screen doesn't sit at 0% forever — hide it and surface
// the real error clearly in the console so it's easy to diagnose.
window.addEventListener('error', (event) => {
    console.error('[universe.js] Uncaught error:', event.message, event.error);
    const ls = document.getElementById('loading-screen');
    if (ls && !ls.classList.contains('hidden')) {
        ls.classList.add('hidden');
        setTimeout(() => { ls.style.display = 'none'; }, 700);
    }
});

const PLANET_LINKS = {
    Mercury: 'https://awabja.github.io/',
    Venus:   'https://awabja.github.io/',
    Earth:   'https://awabja.github.io/',
    Mars:    'https://awabja.github.io/',
    Jupiter: 'https://awabja.github.io/',
    Saturn:  'https://awabja.github.io/',
    Uranus:  'https://awabja.github.io/',
    Neptune: 'https://awabja.github.io/',
    Sun:     'https://awabja.github.io/',
};

/* ---------------------------------------------------------------------- */
/* Loading Manager + Texture Loader                                        */
/* -------------------------------------------------------------------------
   IMPORTANT: This block is set up FIRST, before anything else (controls,
   post-processing, etc.). That way, even if a later optional feature fails
   to load from its CDN, texture loading has already kicked off and the
   progress bar will still move. A hard 10s failsafe also force-hides the
   loading screen no matter what, so it can never get stuck forever.
   ------------------------------------------------------------------------- */

const loadingScreen = document.getElementById('loading-screen');
const loadingFill = document.getElementById('loading-bar-fill');
const loadingPercent = document.getElementById('loading-percent');
const loadingTitle = document.getElementById('loading-title');

let loadingDone = false;

function hideLoadingScreen() {
    if (loadingDone) return;
    loadingDone = true;
    loadingScreen.classList.add('hidden');
    setTimeout(() => { loadingScreen.style.display = 'none'; }, 700);
}

const manager = new THREE.LoadingManager();
manager.onProgress = (url, loaded, total) => {
    const pct = Math.round((loaded / total) * 100);
    loadingFill.style.width = pct + '%';
    loadingPercent.textContent = pct + '%';
};
manager.onLoad = hideLoadingScreen;
manager.onError = (url) => {
    console.error('[universe.js] Failed to load asset:', url);
};

// Failsafe: if nothing has finished loading within 10s (e.g. a texture path
// is wrong, assets/ folder is missing, or the browser is blocking local
// file access), stop blocking the page and tell the user why in the console.
setTimeout(() => {
    if (!loadingDone) {
        console.warn(
            '[universe.js] Loading screen force-closed after 10s timeout. ' +
            'Check the Network tab (F12) for 404s under assets/ or CDN scripts.'
        );
        hideLoadingScreen();
    }
}, 10000);

const textureLoader = new THREE.TextureLoader(manager);
const loadTexture = (path) => textureLoader.load(
    path,
    (tex) => { tex.encoding = THREE.sRGBEncoding; },
    undefined,
    (err) => { console.error(`[universe.js] Error loading texture: ${path}`, err); }
);

/* ---------------------------------------------------------------------- */
/* Scene / Camera / Renderer                                               */
/* ---------------------------------------------------------------------- */

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.00028); // subtle depth cue, keeps distant stars from feeling flat

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 6000);
camera.position.set(0, 220, 420);
camera.lookAt(scene.position);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

/* ---------------------------------------------------------------------- */
/* Orbit Controls (guarded: page still works if this CDN script failed)    */
/* ---------------------------------------------------------------------- */

let controls = null;
if (typeof THREE.OrbitControls === 'function') {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 90;
    controls.maxDistance = 1400;
    controls.enablePan = true;
    controls.target.set(0, 0, 0);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.25; // gentle idle drift; feels alive without being distracting
    controls.update();

    // Pause auto-rotate while the user is actively interacting, resume after a short idle period
    let idleTimer = null;
    const pauseAutoRotate = () => {
        controls.autoRotate = false;
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => { controls.autoRotate = true; }, 4000);
    };
    renderer.domElement.addEventListener('pointerdown', pauseAutoRotate);
    renderer.domElement.addEventListener('wheel', pauseAutoRotate, { passive: true });
} else {
    console.error(
        '[universe.js] THREE.OrbitControls was not found — the OrbitControls.js ' +
        '<script> tag likely failed to load (check the Network tab for a 404 or ' +
        'blocked request). Camera dragging/zoom will be disabled, but the rest ' +
        'of the scene will still run.'
    );
}

/* ---------------------------------------------------------------------- */
/* Lighting                                                                 */
/* ---------------------------------------------------------------------- */

// Sun light: positioned at the origin (where the sun actually is) with no
// distance cutoff, so outer planets (Uranus/Neptune) are no longer left unlit.
const sunLight = new THREE.PointLight(0xfff4e0, 3.2, 0, 1.6);
sunLight.position.set(0, 0, 0);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);

// Soft fill light so the night-side of planets isn't pure black
const ambientLight = new THREE.AmbientLight(0x404060, 0.35);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0x3a4d7a, 0x0a0a12, 0.25);
scene.add(hemiLight);

/* ---------------------------------------------------------------------- */
/* Raycasting                                                               */
/* ---------------------------------------------------------------------- */

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const clickableObjects = [];
const tooltip = document.getElementById('tooltip');
const infoBar = document.getElementById('info');

let hoveredObject = null;

/* ---------------------------------------------------------------------- */
/* Planet / Atmosphere / Ring / Orbit-line factories                      */
/* ---------------------------------------------------------------------- */

function createPlanet(name, size, texturePath, distance, orbitSpeed, phaseOffset, rotationSpeed, axialTilt = 0) {
    const geometry = new THREE.SphereGeometry(size, 64, 64);
    const material = new THREE.MeshStandardMaterial({
        map: loadTexture(texturePath),
        roughness: 0.9,
        metalness: 0.0,
    });
    const planet = new THREE.Mesh(geometry, material);
    planet.name = name;
    planet.rotation.z = axialTilt;
    planet.castShadow = true;
    planet.receiveShadow = true;

    planet.userData = { orbitSpeed, distance, phaseOffset, rotationSpeed, baseScale: 1 };

    scene.add(planet);
    clickableObjects.push(planet);
    createOrbitLine(distance);

    return planet;
}

function createOrbitLine(distance) {
    const segments = 128;
    const points = [];
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(theta) * distance, 0, Math.sin(theta) * distance));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
        color: 0x4477aa,
        transparent: true,
        opacity: 0.25,
    });
    const orbitLine = new THREE.LineLoop(geometry, material);
    orbitLine.name = 'Orbit Line';
    scene.add(orbitLine);
}

function createAtmosphere(planet, size, color, opacity) {
    const atmosphereGeometry = new THREE.SphereGeometry(size, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: opacity,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide, // glow reads correctly from outside without occluding the planet surface
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    atmosphere.name = `${planet.name} Atmosphere`;
    planet.add(atmosphere);
}

function addSaturnRings(planet, innerRadius, outerRadius, texturePath) {
    const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 128, 1);

    // Fix RingGeometry's default UVs so the ring texture maps radially instead of stretching
    const pos = ringGeometry.attributes.position;
    const uv = ringGeometry.attributes.uv;
    const v3 = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        v3.fromBufferAttribute(pos, i);
        const u = (v3.length() - innerRadius) / (outerRadius - innerRadius);
        uv.setXY(i, u, 1);
    }

    const ringMaterial = new THREE.MeshStandardMaterial({
        map: loadTexture(texturePath),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        roughness: 1,
        metalness: 0,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2 - 0.15; // slight tilt looks far more natural than perfectly flat
    ring.receiveShadow = true;
    ring.name = `${planet.name} Rings`;
    planet.add(ring);
}

/* ---------------------------------------------------------------------- */
/* Build the Solar System                                                  */
/* ---------------------------------------------------------------------- */

const planets = [
    createPlanet('Mercury', 3,    'assets/mercury.jpg', 60,   0.010, Math.random() * Math.PI * 2, 0.0010),
    createPlanet('Venus',   4,    'assets/venus.jpg',   100,  0.008, Math.random() * Math.PI * 2, 0.0009),
    createPlanet('Earth',   4.5,  'assets/earth.jpg',   150,  0.006, Math.random() * Math.PI * 2, 0.0100, 0.41),
    createPlanet('Mars',    3.5,  'assets/mars.jpg',    200,  0.004, Math.random() * Math.PI * 2, 0.0090),
    createPlanet('Jupiter', 25,   'assets/jupiter.jpg', 280,  0.0022, Math.random() * Math.PI * 2, 0.0200),
    createPlanet('Saturn',  20,   'assets/saturn.jpg',  400,  0.0016, Math.random() * Math.PI * 2, 0.0180, 0.47),
    createPlanet('Uranus',  12,   'assets/uranus.jpg',  520,  0.0012, Math.random() * Math.PI * 2, 0.0120, 1.71),
    createPlanet('Neptune', 12,   'assets/neptune.jpg', 620,  0.0009, Math.random() * Math.PI * 2, 0.0110),
];

const [mercury, venus, earth, mars, jupiter, saturn, uranus, neptune] = planets;

createAtmosphere(earth, 4.75, 0x88ccff, 0.25);
createAtmosphere(venus, 4.35, 0xffcc88, 0.28);
createAtmosphere(mars, 3.65, 0xff5533, 0.15);

addSaturnRings(saturn, 26, 40, 'assets/saturn_ring.png');

/* ---------------------------------------------------------------------- */
/* The Sun                                                                  */
/* ---------------------------------------------------------------------- */

const sunGeometry = new THREE.SphereGeometry(40, 64, 64);
const sunMaterial = new THREE.MeshBasicMaterial({ map: loadTexture('assets/sun.jpg') });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
sun.name = 'Sun';
sun.userData = { rotationSpeed: 0.0005 };
scene.add(sun);
clickableObjects.push(sun);

// Corona glow so the sun doesn't look like a flat lit texture ball
const coronaGeometry = new THREE.SphereGeometry(44, 64, 64);
const coronaMaterial = new THREE.MeshBasicMaterial({
    color: 0xffaa33,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
});
const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
corona.name = 'Sun Corona';
sun.add(corona);

function createLensFlare() {
    const flareTexture = loadTexture('assets/lensflare0.png');
    const flareMaterial = new THREE.SpriteMaterial({
        map: flareTexture,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    const lensFlare = new THREE.Sprite(flareMaterial);
    lensFlare.scale.set(140, 140, 1);
    lensFlare.name = 'Lens Flare';
    sun.add(lensFlare);
}
createLensFlare();

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        const existingFlare = sun.children.find(child => child instanceof THREE.Sprite && child.name === 'Lens Flare');
        if (!existingFlare) createLensFlare();
    }
});

/* ---------------------------------------------------------------------- */
/* Starfield (two layers: fine dust + a handful of brighter glowing stars) */
/* ---------------------------------------------------------------------- */

function createStarField() {
    // Layer 1 — fine, small, mostly-white dust for density
    const dustGeometry = new THREE.BufferGeometry();
    const dustVertices = [];
    const dustCount = 12000;
    for (let i = 0; i < dustCount; i++) {
        dustVertices.push(
            (Math.random() - 0.5) * 6000,
            (Math.random() - 0.5) * 6000,
            (Math.random() - 0.5) * 6000
        );
    }
    dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dustVertices, 3));
    const dustMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.1,
        transparent: true,
        opacity: 0.75,
        sizeAttenuation: true,
    });
    scene.add(new THREE.Points(dustGeometry, dustMaterial));

    // Layer 2 — sparse, larger glowing colored stars for visual interest
    const starsGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    const starColors = [];
    const numberOfStars = 800;

    for (let i = 0; i < numberOfStars; i++) {
        starVertices.push(
            (Math.random() - 0.5) * 6000,
            (Math.random() - 0.5) * 6000,
            (Math.random() - 0.5) * 6000
        );

        const color = new THREE.Color();
        const rand = Math.random();
        if (rand > 0.85) color.set(0xffaa66);       // warm amber (15%)
        else if (rand > 0.65) color.set(0xffffff);  // white (20%)
        else color.set(0x99ccff);                   // cool blue (65%) — matches real star distributions much better
        starColors.push(color.r, color.g, color.b);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

    const starsMaterial = new THREE.PointsMaterial({
        map: loadTexture('assets/blue_star_glow.png'),
        size: 9,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    scene.add(new THREE.Points(starsGeometry, starsMaterial));
}
createStarField();

/* ---------------------------------------------------------------------- */
/* Nebula backdrop                                                          */
/* ---------------------------------------------------------------------- */

const nebulaGeometry = new THREE.PlaneGeometry(2200, 1100);
const nebulaMaterial = new THREE.MeshBasicMaterial({
    map: loadTexture('assets/nebula_texture.jpg'),
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
});
const nebulaPlane = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
nebulaPlane.position.set(0, 200, -2400);
nebulaPlane.name = 'Nebula';
scene.add(nebulaPlane);

/* ---------------------------------------------------------------------- */
/* Post-processing — bloom gives the sun / lens flare a real glow          */
/* Guarded: if any of the postprocessing CDN scripts failed to load, we    */
/* fall back to a plain renderer.render() call instead of crashing the     */
/* whole animation loop (which would otherwise freeze the scene entirely). */
/* ---------------------------------------------------------------------- */

let composer = null;
try {
    if (typeof THREE.EffectComposer === 'function' && typeof THREE.UnrealBloomPass === 'function') {
        composer = new THREE.EffectComposer(renderer);
        composer.addPass(new THREE.RenderPass(scene, camera));

        const bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.85,  // strength
            0.6,   // radius
            0.82   // threshold — keeps planets from blooming, only bright sun/flare/stars do
        );
        composer.addPass(bloomPass);
    } else {
        console.warn('[universe.js] Bloom post-processing unavailable (CDN script missing) — rendering without glow.');
    }
} catch (e) {
    console.error('[universe.js] Failed to set up post-processing, falling back to plain render:', e);
    composer = null;
}

/* ---------------------------------------------------------------------- */
/* Hover + Click Interaction                                                */
/* ---------------------------------------------------------------------- */

function setPointerFromEvent(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
}

function updateHover(clientX, clientY) {
    setPointerFromEvent(clientX, clientY);
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(clickableObjects, false);

    if (intersects.length > 0) {
        const obj = intersects[0].object;
        if (hoveredObject !== obj) {
            hoveredObject = obj;
            infoBar.textContent = obj.name;
        }
        tooltip.textContent = obj.name;
        tooltip.style.left = clientX + 'px';
        tooltip.style.top = clientY + 'px';
        tooltip.classList.add('visible');
        renderer.domElement.classList.add('hovering');
    } else {
        if (hoveredObject) {
            hoveredObject = null;
            infoBar.textContent = 'Click a planet to explore';
        }
        tooltip.classList.remove('visible');
        renderer.domElement.classList.remove('hovering');
    }
}

renderer.domElement.addEventListener('mousemove', (event) => {
    updateHover(event.clientX, event.clientY);
});

renderer.domElement.addEventListener('mouseleave', () => {
    hoveredObject = null;
    tooltip.classList.remove('visible');
    renderer.domElement.classList.remove('hovering');
    infoBar.textContent = 'Click a planet to explore';
});

function handleInteraction(event) {
    if (event.type === 'touchend') event.preventDefault();

    let clientX, clientY;
    if (event.type === 'click') {
        clientX = event.clientX;
        clientY = event.clientY;
    } else if (event.type === 'touchend') {
        if (event.changedTouches && event.changedTouches.length > 0) {
            clientX = event.changedTouches[0].clientX;
            clientY = event.changedTouches[0].clientY;
        } else {
            return;
        }
    } else {
        return;
    }

    setPointerFromEvent(clientX, clientY);
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(clickableObjects, false);

    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        console.log(`You clicked on ${clickedObject.name}`);
        const url = PLANET_LINKS[clickedObject.name] || 'https://awabja.github.io/';
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}

renderer.domElement.addEventListener('click', handleInteraction, false);
renderer.domElement.addEventListener('touchend', handleInteraction, false);

/* ---------------------------------------------------------------------- */
/* Main Animation Loop                                                     */
/* ---------------------------------------------------------------------- */

function animate() {
    requestAnimationFrame(animate);

    if (controls) controls.update();

    const time = Date.now() * 0.005;

    planets.forEach(planet => {
        const { orbitSpeed, distance, phaseOffset, rotationSpeed } = planet.userData;
        planet.position.set(
            Math.cos(time * orbitSpeed + phaseOffset) * distance,
            0,
            Math.sin(time * orbitSpeed + phaseOffset) * distance
        );
        planet.rotation.y += rotationSpeed;

        // Gentle "breathe" highlight while hovered so the clickable target reads clearly
        const targetScale = (hoveredObject === planet) ? 1.08 : 1.0;
        planet.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);
    });

    sun.rotation.y += sun.userData.rotationSpeed;
    const sunTargetScale = (hoveredObject === sun) ? 1.05 : 1.0;
    sun.scale.lerp(new THREE.Vector3(sunTargetScale, sunTargetScale, sunTargetScale), 0.15);

    if (composer) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }
}
animate();

/* ---------------------------------------------------------------------- */
/* Resize handling                                                         */
/* ---------------------------------------------------------------------- */

window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    renderer.setSize(width, height);
    if (composer) composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});
