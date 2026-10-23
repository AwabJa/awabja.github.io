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
    controls.enableZoom = true;
    controls.target.set(0, 0, 0);
    // Constant automatic rotation made the camera feel like it was fighting the user.
    controls.autoRotate = false;
    controls.update();
} else {
    console.warn('[Solar System] OrbitControls unavailable; using a simple camera fallback.');
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
        console.info('[Solar System] Using lightweight direct rendering (mobile or bloom unavailable).');
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
let trackedPosition = null;
let cameraFlight = null;
let simulationTime = 0;
let motionPaused = prefersReducedMotion;
let motionSpeed = 1;
let lastFrameTime = null;
const speeds = [0.5, 1, 2];
const statusText = document.getElementById('scene-status');
const motionButton = document.getElementById('motion-toggle');
const motionLabel = document.getElementById('motion-label');
const motionGlyph = document.getElementById('motion-glyph');
const speedButton = document.getElementById('speed-toggle');

const ALL_BODIES = new Map([
    ['Sun', sun], ['Mercury', mercury], ['Venus', venus], ['Earth', earth],
    ['Moon', moon], ['Mars', mars], ['Jupiter', jupiter], ['Saturn', saturn],
    ['Uranus', uranus], ['Neptune', neptune]
]);

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
// Quintic easing provides zero velocity and acceleration at each end of a flight.
const easeCamera = t => t * t * t * (t * (t * 6 - 15) + 10);
const lerpResponse = (lambda, dt) => 1 - Math.exp(-lambda * dt);

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

// Reusable camera director for both fly-to selection and returning home.
function startCameraFlight(body) {
    const point = body ? body.position.clone() : overviewTarget.clone();
    const radius = body ? (body.geometry.parameters.radius || 2) : 0;
    const offset = body
        ? new THREE.Vector3(0, Math.max(4, radius * 0.85), Math.max(12, radius * (body.name === 'Saturn' ? 5.2 : 3.8)))
        : null;
    const destination = body ? point.clone().add(offset) : overviewPosition;
    const distance = camera.position.distanceTo(destination);
    const duration = prefersReducedMotion ? 0 : clamp(1.45 + distance * 0.0022, 1.45, 3.05);

    cameraFlight = {
        body,
        fromPosition: camera.position.clone(),
        fromTarget: controls ? controls.target.clone() : point.clone(),
        offset,
        duration,
        elapsed: 0,
        arcHeight: Math.min(75, distance * 0.13)
    };
    trackedPosition = point.clone();
    if (controls) {
        controls.enabled = false;
        controls.enableDamping = false; // Do not let orbit inertia fight the cinematic tween.
        controls.autoRotate = false;
        controls.minDistance = body ? Math.max(7, radius * 1.35) : 12;
    }
}

function endFlight() {
    cameraFlight = null;
    if (controls) {
        controls.enabled = true;
        controls.enableDamping = true;
        controls.update();
    }
}

// Fly-to uses elapsed real seconds, not number of frames, so 30/60/120 Hz
// devices see the same duration and near-identical movement.
function updateCamera(dt) {
    if (cameraFlight) {
        const flight = cameraFlight;
        flight.elapsed += dt;
        const t = flight.duration === 0 ? 1 : Math.min(1, flight.elapsed / flight.duration);
        const eased = easeCamera(t);
        const target = flight.body ? flight.body.position : overviewTarget;
        const destination = flight.body ? target.clone().add(flight.offset) : overviewPosition;

        camera.position.copy(flight.fromPosition).lerp(destination, eased);
        camera.position.y += Math.sin(Math.PI * t) * flight.arcHeight;
        if (controls) {
            controls.target.copy(flight.fromTarget).lerp(target, eased);
            controls.update();
        } else {
            camera.lookAt(controls ? controls.target : target);
        }
        if (t >= 1) {
            if (flight.body) trackedPosition.copy(target);
            endFlight();
        }
        return;
    }

    // Once a flight finishes, match the orbital translation of the selected
    // body while preserving user-chosen drag, pan and zoom relative to it.
    if (selectedBody && trackedPosition) {
        const move = selectedBody.position.clone().sub(trackedPosition);
        camera.position.add(move);
        if (controls) controls.target.add(move);
        else camera.lookAt(selectedBody.position);
        trackedPosition.copy(selectedBody.position);
    }
    if (controls) controls.update();
}

function closeInspector() {
    inspector.hidden = true;
    selectedBody = null;
    trackedPosition = null;
    markSelectedBody(null);
    endFlight();
    infoBar.textContent = 'Explore the Sun, eight planets and Earth’s Moon · Not to scale';
}
function resetOverview() {
    closeInspector();
    setGuideOpen(false);
    startCameraFlight(null);
}
document.getElementById('inspector-close').addEventListener('click', closeInspector);
document.getElementById('inspector-reset').addEventListener('click', resetOverview);
document.getElementById('camera-home').addEventListener('click', resetOverview);

function updateMotionButtons() {
    motionButton.setAttribute('aria-pressed', String(motionPaused));
    motionButton.title = motionPaused ? 'Resume planetary motion' : 'Pause planetary motion';
    motionLabel.textContent = motionPaused ? 'Resume' : 'Pause';
    motionGlyph.textContent = motionPaused ? '▶' : 'Ⅱ';
    speedButton.textContent = motionSpeed + '× speed';
    speedButton.setAttribute('aria-label', 'Orbit speed ' + motionSpeed + ' times. Activate to change');
}
motionButton.addEventListener('click', () => {
    motionPaused = !motionPaused;
    updateMotionButtons();
    statusText.textContent = motionPaused ? 'Planetary motion paused' : 'Planetary motion resumed';
});
speedButton.addEventListener('click', () => {
    const idx = speeds.indexOf(motionSpeed);
    motionSpeed = speeds[(idx + 1) % speeds.length];
    updateMotionButtons();
    statusText.textContent = 'Orbit speed set to ' + motionSpeed + ' times';
});
updateMotionButtons();

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
    startCameraFlight(body);

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

renderer.domElement.addEventListener('click', handleInteraction, false);
renderer.domElement.addEventListener('touchend', handleInteraction, false);

/* ---------------------------------------------------------------------- */
/* Main Animation Loop                                                     */
/* ---------------------------------------------------------------------- */

function animate() {
    requestAnimationFrame(animate);

    if (document.hidden) return;
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

    // Lunar orbit is relative to Earth's current position, not the Sun's.
    const lunarAngle = time * 0.078 + 1.7; // approximately 13 lunar orbits per Earth solar orbit
    moon.position.copy(earth.position).add(new THREE.Vector3(
        Math.cos(lunarAngle) * 12,
        Math.sin(lunarAngle) * 1.08,
        Math.sin(lunarAngle) * 12
    ));
    moon.rotation.y = -lunarAngle;
    moonOrbit.position.copy(earth.position);
    cloudLayer.rotation.y += 0.0003;

    sun.rotation.y += sun.userData.rotationSpeed;
    const sunTargetScale = (hoveredObject === sun) ? 1.05 : 1.0;
    sun.scale.lerp(new THREE.Vector3(sunTargetScale, sunTargetScale, sunTargetScale), 0.15);

    // Follow the selected world without fighting the user's own drag/zoom after arrival.
    // First fly to it; afterwards move the camera and orbit target with its orbit.
    if (focusActive && selectedBody) {
        const target = selectedBody.position;
        if (trackedPosition && !focusTransition && controls) {
            const movement = target.clone().sub(trackedPosition);
            controls.target.add(movement);
            camera.position.add(movement);
        }
        if (!trackedPosition) trackedPosition = target.clone();
        else trackedPosition.copy(target);

        if (focusTransition) {
            const radius = selectedBody.geometry.parameters.radius || 2;
            const desired = target.clone().add(new THREE.Vector3(
                0, Math.max(3, radius * 0.75), Math.max(9, radius * 3.3)
            ));
            const speed = prefersReducedMotion ? 1 : 0.065;
            if (controls) controls.target.lerp(target, speed);
            else camera.lookAt(target);
            camera.position.lerp(desired, speed);
            if (camera.position.distanceTo(desired) < 0.9 &&
                (!controls || controls.target.distanceTo(target) < 0.9)) {
                focusTransition = false;
            }
        }
    }
    if (controls) controls.update();

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
