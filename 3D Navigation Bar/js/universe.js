/* 3D SOLAR SYSTEM EXPLORER — select a world to inspect it in the scene. */

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

const compactScreen = window.matchMedia('(max-width: 700px)').matches;
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compactScreen ? 1.35 : 1.75));
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
    controls.dampingFactor = 0.075;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.72;
    controls.panSpeed = 0.55;
    controls.minDistance = 12;
    controls.maxDistance = 1400;
    controls.minPolarAngle = 0.05;
    controls.maxPolarAngle = Math.PI - 0.05;
    controls.enablePan = true;
    controls.target.set(0, 0, 0);
    // Never resume autonomous camera rotation after the user has taken control.
    controls.autoRotate = false;
    controls.update();
} else {
    console.warn('[Solar System] OrbitControls unavailable; using simple camera fallback.');
}

/* ---------------------------------------------------------------------- */
/* Lighting                                                                 */
/* ---------------------------------------------------------------------- */

// Sun light: positioned at the origin (where the sun actually is) with no
// distance cutoff, so outer planets (Uranus/Neptune) are no longer left unlit.
const sunLight = new THREE.PointLight(0xfff4e0, 3.2, 0, 1.6);
sunLight.position.set(0, 0, 0);
sunLight.castShadow = false; // The Sun's surface lighting is directional; avoid expensive point-light cube shadows.
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);

// Soft fill light so the night-side of planets isn't pure black
const ambientLight = new THREE.AmbientLight(0x29364a, 0.16);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0x3a4d7a, 0x0a0a12, 0.15);
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

function createPlanet(name, size, distance, orbitSpeed, phaseOffset, rotationSpeed, axialTilt = 0) {
    const geometry = new THREE.SphereGeometry(size, 64, 48);
    const surface = window.generateSpaceTexture(name, THREE);
    const material = new THREE.MeshStandardMaterial({
        map: surface.map,
        bumpMap: surface.bumpMap,
        bumpScale: name === 'Earth' ? 0.09 : (name === 'Mercury' || name === 'Mars' ? 0.2 : 0),
        roughness: name === 'Earth' ? 0.84 : 0.96,
        metalness: 0.0
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
    createPlanet('Mercury', 3, 60,   0.010, Math.random() * Math.PI * 2, 0.0010),
    createPlanet('Venus',   4,   100,  0.008, Math.random() * Math.PI * 2, 0.0009),
    createPlanet('Earth',   4.5,   150,  0.006, Math.random() * Math.PI * 2, 0.0100, 0.41),
    createPlanet('Mars',    3.5,    200,  0.004, Math.random() * Math.PI * 2, 0.0090),
    createPlanet('Jupiter', 25, 280,  0.0022, Math.random() * Math.PI * 2, 0.0200),
    createPlanet('Saturn',  20,  400,  0.0016, Math.random() * Math.PI * 2, 0.0180, 0.47),
    createPlanet('Uranus',  12,  520,  0.0012, Math.random() * Math.PI * 2, 0.0120, 1.71),
    createPlanet('Neptune', 12, 620,  0.0009, Math.random() * Math.PI * 2, 0.0110),
];

const [mercury, venus, earth, mars, jupiter, saturn, uranus, neptune] = planets;

// Semi-transparent cloud map floats over Earth and rotates independently.
const cloudTexture = window.generateSpaceTexture('Clouds', THREE).map;
const cloudLayer = new THREE.Mesh(
    new THREE.SphereGeometry(4.57, 48, 32),
    new THREE.MeshStandardMaterial({map: cloudTexture, transparent: true, depthWrite: false, roughness: 1, opacity: .84})
);
earth.add(cloudLayer);
createAtmosphere(earth, 4.75, 0x88ccff, 0.25);
createAtmosphere(venus, 4.35, 0xffcc88, 0.28);
createAtmosphere(mars, 3.65, 0xff5533, 0.15);

// Earth's Moon is a separate selectable world. Unlike Mercury and the other
// planets it revolves around Earth, with a mildly inclined orbit.
// Sizes and orbital distances are compressed for interactive visibility.
const moonSurface = window.generateSpaceTexture('Moon', THREE);
const moon = new THREE.Mesh(new THREE.SphereGeometry(1.24, 40, 28), new THREE.MeshStandardMaterial({
    map: moonSurface.map, bumpMap: moonSurface.bumpMap, bumpScale: 0.16, roughness: 1
}));
moon.name = 'Moon';
moon.castShadow = true;
moon.receiveShadow = true;
moon.userData = {distance: 12, baseScale: 1};
scene.add(moon);
clickableObjects.push(moon);
const moonOrbitVertices=[];
for(let i=0;i<96;i++){
    const a=i/96*Math.PI*2;
    moonOrbitVertices.push(new THREE.Vector3(Math.cos(a)*12,Math.sin(a)*12*.09,Math.sin(a)*12));
}
const moonOrbit=new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(moonOrbitVertices),
    new THREE.LineBasicMaterial({color:0x9eb4c3, transparent:true, opacity:.27})
);
scene.add(moonOrbit);

addSaturnRings(saturn, 26, 40, 'assets/saturn_ring.png');

/* ---------------------------------------------------------------------- */
/* The Sun                                                                  */
/* ---------------------------------------------------------------------- */

const sunGeometry = new THREE.SphereGeometry(40, 64, 64);
const sunMaterial = new THREE.MeshBasicMaterial({ map: window.generateSpaceTexture('Sun', THREE).map });
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
    opacity: 0.06,
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
    if (!compactScreen && typeof THREE.EffectComposer === 'function' && typeof THREE.UnrealBloomPass === 'function') {
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


// Science-led explorer: every body remains in the 3D scene when selected.
// NASA links have been checked against their individual NASA Science pages.
const BODY_DATA = {
    Sun: {
        subtitle: 'The star at the center of our solar system', type: 'G-type star',
        period: '~230 million years around the galaxy',
        description: 'The Sun is a huge, hot sphere of plasma. Its gravity holds the solar system together and its energy powers life on Earth.',
        fact: 'Sunlight takes about eight minutes to travel to Earth.',
        nasa: 'https://science.nasa.gov/sun/'
    },
    Mercury: {
        subtitle: 'Closest planet to the Sun', type: 'Terrestrial planet', period: '88 Earth days',
        description: 'A small, rocky world covered in impact craters, with almost no atmosphere to protect its surface.',
        fact: 'Mercury has extreme temperature swings between day and night.',
        nasa: 'https://science.nasa.gov/mercury/'
    },
    Venus: {
        subtitle: 'A world hidden beneath thick clouds', type: 'Terrestrial planet', period: '225 Earth days',
        description: 'Venus is wrapped in a dense carbon-dioxide atmosphere that traps heat through an intense greenhouse effect.',
        fact: 'Venus has the hottest planetary surface in our solar system.',
        nasa: 'https://science.nasa.gov/venus/'
    },
    Earth: {
        subtitle: 'Our home, the ocean planet', type: 'Terrestrial planet', period: '365.25 days',
        description: 'Earth has liquid oceans, a protective atmosphere and active geology, making it the only world known to support life.',
        fact: 'About 71% of Earth’s surface is covered by water.',
        nasa: 'https://science.nasa.gov/earth/'
    },
    Moon: {
        subtitle: 'Earth’s natural satellite', type: 'Rocky moon', period: '27.3 days around Earth',
        description: 'The Moon is a cratered rocky world held in orbit by Earth’s gravity. It moves with Earth as our planet travels around the Sun.',
        fact: 'The Moon’s gravity is the primary cause of Earth’s ocean tides.',
        nasa: 'https://science.nasa.gov/moon/'
    },
    Mars: {
        subtitle: 'The rusty-red desert planet', type: 'Terrestrial planet', period: '687 Earth days',
        description: 'Mars is a cold, dusty world with ancient riverbeds, polar ice, enormous volcanoes and a thin atmosphere.',
        fact: 'Olympus Mons on Mars is the largest known volcano in the solar system.',
        nasa: 'https://science.nasa.gov/mars/'
    },
    Jupiter: {
        subtitle: 'King of the planets', type: 'Gas giant', period: '11.86 Earth years',
        description: 'Jupiter is the largest planet. Its swirling cloud bands reveal an atmosphere shaped by fierce winds and storms.',
        fact: 'The Great Red Spot is a giant storm larger than Earth.',
        nasa: 'https://science.nasa.gov/jupiter/'
    },
    Saturn: {
        subtitle: 'The ringed gas giant', type: 'Gas giant', period: '29.45 Earth years',
        description: 'Saturn is a gas giant best known for its extensive ring system made mainly of countless icy particles.',
        fact: 'Saturn’s average density is lower than that of water.',
        nasa: 'https://science.nasa.gov/saturn/'
    },
    Uranus: {
        subtitle: 'The sideways ice giant', type: 'Ice giant', period: '84 Earth years',
        description: 'Uranus is a pale blue-green ice giant whose atmosphere contains methane and whose rotation axis is strongly tilted.',
        fact: 'Uranus spins at an angle of about 98 degrees relative to its orbit.',
        nasa: 'https://science.nasa.gov/uranus/'
    },
    Neptune: {
        subtitle: 'The most distant major planet', type: 'Ice giant', period: '164.8 Earth years',
        description: 'Neptune is a dark, cold ice giant with deep blue hues and powerful atmospheric winds.',
        fact: 'Neptune was the first planet discovered using mathematical predictions.',
        nasa: 'https://science.nasa.gov/neptune/'
    }
};

const inspector = document.getElementById('planet-inspector');
const inspectorTitle = document.getElementById('inspector-name');
const inspectorLink = document.getElementById('inspector-link');
const inspectorWorld = document.getElementById('inspector-world');
const guideToggle = document.getElementById('guide-toggle');
const guidePanel = document.getElementById('planet-links');
const bodyButtons = [...document.querySelectorAll('[data-body]')];
const texturePreviews = new Map();
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const overviewPosition = camera.position.clone();
const overviewTarget = controls ? controls.target.clone() : new THREE.Vector3();

let selectedBody = null;
let focusActive = false;
let focusTransition = false;
let trackedPosition = null;
let cameraFlight = null;
let simulationTime = 0;
let simulationPlaying = !prefersReducedMotion;
let speedMultiplier = 1;
let previousFrameTime = null;
const EASE = t => t * t * t * (t * (t * 6 - 15) + 10); // smooth acceleration and deceleration
const flightDuration = prefersReducedMotion ? 0 : 2.0;
const centerOffset = new THREE.Vector3(0, 0, 0);
const tempMovement = new THREE.Vector3();

function cancelCameraFlight() {
    if (!cameraFlight) return;
    cameraFlight = null;
    focusTransition = false;
    if (controls) controls.enableDamping = true;
}
function startCameraFlight(targetPosition, radius, duration = null) {
    const away = camera.position.clone().sub(targetPosition);
    if (away.lengthSq() < 0.01) away.set(0, .3, 1);
    away.normalize();
    const distance = Math.max(radius * (selectedBody?.name === 'Saturn' ? 5.2 : 3.8), 13);
    const destinationOffset = away.multiplyScalar(distance);
    destinationOffset.y += Math.max(1.5, radius * .35);
    const absoluteDestination = targetPosition.clone().add(destinationOffset);
    const travelDistance = camera.position.distanceTo(absoluteDestination);
    const seconds = duration === null
        ? (prefersReducedMotion ? 0 : Math.max(1.45, Math.min(3.1, 1.45 + travelDistance * 0.0022)))
        : duration;
    cameraFlight = {
        elapsed: 0,
        duration: seconds,
        positionStart: camera.position.clone(),
        targetStart: controls ? controls.target.clone() : new THREE.Vector3(),
        destinationOffset,
        targetPosition: targetPosition.clone(),
        arcHeight: Math.min(70, travelDistance * .12)
    };
    if (controls) {
        controls.enableDamping = false; // Remove residual inertia during camera tween.
        controls.autoRotate = false;
        controls.minDistance = Math.max(7, radius * 1.35);
    }
    if (seconds === 0) {
        camera.position.copy(absoluteDestination);
        if (controls) {
            controls.target.copy(targetPosition);
            controls.update();
            controls.enableDamping = true;
        } else camera.lookAt(targetPosition);
        cameraFlight = null;
        focusTransition = false;
    }
}
const ALL_BODIES = new Map([
    ['Sun', sun], ['Mercury', mercury], ['Venus', venus], ['Earth', earth],
    ['Moon', moon], ['Mars', mars], ['Jupiter', jupiter], ['Saturn', saturn],
    ['Uranus', uranus], ['Neptune', neptune]
]);

function setGuideOpen(open) {
    guidePanel.hidden = !open;
    guideToggle.setAttribute('aria-expanded', String(open));
}
guideToggle.addEventListener('click', () => setGuideOpen(guidePanel.hidden));

function markSelectedBody(name) {
    for (const button of bodyButtons) {
        button.setAttribute('aria-pressed', String(button.dataset.body === name));
    }
}
function closeInspector() {
    inspector.hidden = true;
    focusActive = false;
    focusTransition = false;
    cancelCameraFlight();
    selectedBody = null;
    trackedPosition = null;
    markSelectedBody(null);
}
function resetOverview() {
    closeInspector();
    setGuideOpen(false);
    if (prefersReducedMotion) {
        camera.position.copy(overviewPosition);
        if (controls) controls.target.copy(overviewTarget);
        else camera.lookAt(overviewTarget);
    } else {
        cameraFlight = {
            elapsed: 0, duration: 1.8,
            positionStart: camera.position.clone(),
            targetStart: controls ? controls.target.clone() : new THREE.Vector3(),
            destinationPosition: overviewPosition.clone(),
            targetPosition: overviewTarget.clone(),
            arcHeight: Math.min(60, camera.position.distanceTo(overviewPosition) * .1)
        };
        if (controls) controls.enableDamping = false;
    }
    if (controls) {
        controls.autoRotate = false;
        controls.minDistance = 12;
    }
    infoBar.textContent = 'Explore the Sun, eight planets and Earth’s Moon · Not to scale';
}
const motionButton = document.getElementById('toggle-motion');
if (prefersReducedMotion) {
    motionButton.setAttribute('aria-pressed', 'true');
    motionButton.textContent = '▶ Play';
    motionButton.title = 'Resume planet motion';
}
motionButton.addEventListener('click', () => {
    simulationPlaying = !simulationPlaying;
    motionButton.setAttribute('aria-pressed', String(!simulationPlaying));
    motionButton.textContent = simulationPlaying ? 'Ⅱ Pause' : '▶ Play';
    motionButton.title = simulationPlaying ? 'Pause planet motion' : 'Resume planet motion';
});
document.getElementById('orbit-speed').addEventListener('change', event => {
    const value = Number(event.target.value);
    if ([.5, 1, 2, 4].includes(value)) speedMultiplier = value;
});
document.getElementById('reset-view').addEventListener('click', resetOverview);
document.getElementById('inspector-close').addEventListener('click', closeInspector);
document.getElementById('inspector-reset').addEventListener('click', resetOverview);
document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        if (!guidePanel.hidden) setGuideOpen(false);
        else if (!inspector.hidden) closeInspector();
    }
});

function inspectorTexture(body) {
    if (texturePreviews.has(body.name)) return texturePreviews.get(body.name);
    let preview = '';
    try {
        const canvas = body.material.map && body.material.map.image;
        if (canvas && typeof canvas.toDataURL === 'function') {
            preview = canvas.toDataURL('image/png');
        }
    } catch (error) {
        console.warn('Preview unavailable for', body.name, error);
    }
    texturePreviews.set(body.name, preview);
    return preview;
}

function inspectBody(body, keyboardSelected = false) {
    if (!body) return;
    const data = BODY_DATA[body.name];
    if (!data) return;
    selectedBody = body;
    focusActive = true;
    focusTransition = true;
    trackedPosition = body.position.clone();
    if (controls) controls.autoRotate = false;
    startCameraFlight(body.position, body.geometry.parameters.radius || 2);

    inspectorTitle.textContent = body.name;
    document.getElementById('inspector-subtitle').textContent = data.subtitle;
    document.getElementById('inspector-description').textContent = data.description;
    document.getElementById('inspector-type').textContent = data.type;
    document.getElementById('inspector-period').textContent = data.period;
    document.getElementById('inspector-fact').textContent = data.fact;
    inspectorLink.href = data.nasa;
    inspectorLink.textContent = 'Learn more about ' + body.name + ' at NASA ↗';

    const image = inspectorTexture(body);
    inspectorWorld.style.backgroundImage = image
        ? 'radial-gradient(circle at 32% 26%,rgba(255,255,255,.24),transparent 44%,rgba(0,0,0,.78) 100%),url("' + image + '")'
        : 'radial-gradient(circle at 32% 26%,#799fb3,#182d48 72%,#030b13)';
    inspectorWorld.style.backgroundSize = image ? '100% 100%,auto 100%' : '100% 100%';

    markSelectedBody(body.name);
    setGuideOpen(false);
    inspector.hidden = false;
    infoBar.textContent = body.name + ' · ' + data.subtitle;
    if (keyboardSelected) inspectorTitle.focus({preventScroll:true});
}

for (const button of bodyButtons) {
    button.addEventListener('click', () => inspectBody(ALL_BODIES.get(button.dataset.body), true));
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
            infoBar.textContent = 'Select a planet or the Moon to explore';
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
    infoBar.textContent = 'Explore the Sun, eight planets and Earth’s Moon · Not to scale';
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
        inspectBody(clickedObject);
    }
}

// Only treat a genuine tap/click as selection, not the end of a camera drag.
let pointerStart = null;
renderer.domElement.addEventListener('pointerdown', e => { pointerStart = {x:e.clientX,y:e.clientY}; });
renderer.domElement.addEventListener('pointermove', e => {
    if (pointerStart && Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>8) pointerStart.dragged=true;
});
const selectWithoutDrag = e => {
    const dragging = pointerStart && pointerStart.dragged;
    pointerStart = null;
    if (!dragging) handleInteraction(e);
};
renderer.domElement.addEventListener('click', selectWithoutDrag, false);
// Pointer/click events also cover taps; a touchend listener caused double selection.

/* ---------------------------------------------------------------------- */
/* Main Animation Loop                                                     */
/* ---------------------------------------------------------------------- */

function animate(frameTimestamp) {
    requestAnimationFrame(animate);
    if (previousFrameTime === null) previousFrameTime = frameTimestamp;
    const frameDelta = Math.min(Math.max((frameTimestamp - previousFrameTime) / 1000, 0), .05);
    previousFrameTime = frameTimestamp;
    if (document.hidden) return;

    // Simulation uses elapsed time, not frame count; speed controls stay smooth on 60/120 Hz screens.
    if (simulationPlaying) simulationTime += frameDelta * 5 * speedMultiplier;
    const time = simulationTime;

    planets.forEach(planet => {
        const { orbitSpeed, distance, phaseOffset, rotationSpeed } = planet.userData;
        planet.position.set(
            Math.cos(time * orbitSpeed + phaseOffset) * distance,
            0,
            Math.sin(time * orbitSpeed + phaseOffset) * distance
        );
        if (simulationPlaying) planet.rotation.y += rotationSpeed * frameDelta * 60 * speedMultiplier;
        const scale = hoveredObject === planet ? 1.04 : 1.0;
        planet.scale.setScalar(THREE.MathUtils.lerp(planet.scale.x, scale, Math.min(1, frameDelta * 8)));
    });

    const lunarAngle = time * 0.078 + 1.7;
    moon.position.copy(earth.position).add(new THREE.Vector3(
        Math.cos(lunarAngle) * 12, Math.sin(lunarAngle) * 1.08, Math.sin(lunarAngle) * 12
    ));
    moon.rotation.y = -lunarAngle;
    moonOrbit.position.copy(earth.position);
    if (simulationPlaying) {
        cloudLayer.rotation.y += 0.0003 * frameDelta * 60 * speedMultiplier;
        sun.rotation.y += sun.userData.rotationSpeed * frameDelta * 60 * speedMultiplier;
    }
    const sunScale = hoveredObject === sun ? 1.025 : 1;
    sun.scale.setScalar(THREE.MathUtils.lerp(sun.scale.x, sunScale, Math.min(1, frameDelta * 8)));

    // Track the orbiting target without pulling the user back after they rotate/zoom.
    if (focusActive && selectedBody && trackedPosition) {
        tempMovement.copy(selectedBody.position).sub(trackedPosition);
        if (!cameraFlight) {
            camera.position.add(tempMovement);
            if (controls) controls.target.add(tempMovement);
            else camera.lookAt(selectedBody.position);
        }
        trackedPosition.copy(selectedBody.position);
    }
    if (cameraFlight) {
        const flight = cameraFlight;
        flight.elapsed += frameDelta;
        const t = flight.duration ? EASE(Math.min(1, flight.elapsed / flight.duration)) : 1;
        const target = selectedBody ? selectedBody.position : flight.targetPosition;
        const destination = flight.destinationOffset
            ? target.clone().add(flight.destinationOffset)
            : flight.destinationPosition;
        camera.position.lerpVectors(flight.positionStart, destination, t);
        if (controls) controls.target.lerpVectors(flight.targetStart, target, t);
        else camera.lookAt(target);
        if (t >= 1) {
            cameraFlight = null;
            focusTransition = false;
            if (!selectedBody && controls && !prefersReducedMotion) controls.autoRotate = true;
        }
    }

    if (controls) controls.update();
    if (composer) composer.render();
    else renderer.render(scene, camera);
}
requestAnimationFrame(animate);

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
