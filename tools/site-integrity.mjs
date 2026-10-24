/**
 * Dependency-free site regression checks.
 * Run: node tools/site-integrity.mjs
 * Checks references, accessible local routes, security policies and JS syntax.
 * These are STATIC checks, not a browser/WebGL/security penetration test.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
let assertions = 0;
const check = (ok, label) => {
  assertions++;
  if (!ok) problems.push(label);
};
const htmlPaths = ['index.html', 'Enzo/index.html', '3D Navigation Bar/index.html', 'Flow/index.html'];

const scripts = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) scripts.push(path);
  }
}
walk(root);

for (const path of scripts) {
  const syntax = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
  check(syntax.status === 0,
    'Invalid JavaScript: ' + path.slice(root.length + 1) + '\n' + (syntax.stderr || '').trim());
}
const seen = new Set();

for (const path of htmlPaths) {
  const html = readFileSync(join(root, path), 'utf8');
  const dir = dirname(join(root, path));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  check(new Set(ids).size === ids.length, 'Duplicate element IDs in ' + path);
  check(/<html[^>]*\blang="en"/i.test(html), 'Missing page language: ' + path);
  check(/<meta[^>]*\bname="viewport"/i.test(html), 'Missing viewport tag: ' + path);
  const csp = html.match(/<meta[^>]*http-equiv="Content-Security-Policy"[^>]*content="([^"]+)"/i)?.[1];
  check(Boolean(csp), 'No CSP in ' + path);
  if (csp) {
    for (const directive of ["object-src 'none'", "base-uri 'self'", "frame-src 'none'"]) {
      check(csp.includes(directive), 'CSP missing ' + directive + ': ' + path);
    }
    check(!/unsafe-inline|unsafe-eval/i.test(csp), 'Unsafe CSP script/style permission in ' + path);
  }
  check(/<meta[^>]*name="referrer"[^>]*content="no-referrer"/i.test(html),
    'Missing referrer policy: ' + path);

  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const ref = match[1];
    if (/^(?:https?:|mailto:|tel:|data:|blob:|javascript:)/i.test(ref)) {
      check(!/^javascript:/i.test(ref), 'JavaScript URL in ' + path);
      continue;
    }
    if (ref.startsWith('#')) {
      check(ids.includes(ref.slice(1)), 'Missing #' + ref.slice(1) + ' anchor in ' + path);
      continue;
    }
    const pathname = decodeURIComponent(ref.split(/[?#]/)[0]);
    const destination = pathname.startsWith('/')
      ? join(root, pathname.slice(1))
      : resolve(dir, pathname);
    check(destination.startsWith(root) && existsSync(destination),
      'Broken local asset/link "' + ref + '" in ' + path);
  }

  // Opening an untrusted page in a new tab must not expose window.opener.
  for (const tag of html.matchAll(/<a\b[^>]+>/g)) {
    if (/target="_blank"/.test(tag[0])) {
      check(/rel="[^"]*\bnoopener\b/.test(tag[0]),
        'New-tab link missing rel=noopener in ' + path);
    }
  }

  // Ensure all static script hosts are explicitly allowed by that page's CSP.
  for (const match of html.matchAll(/<script\b[^>]*\bsrc="(https:\/\/[^"]+)"/g)) {
    const origin = new URL(match[1]).origin;
    check(Boolean(csp?.includes(origin)), 'External script host not in CSP for ' + path + ': ' + origin);
  }
  seen.add(path);
}

// FLOW security and data-preservation regression checks.
const flowHtml = readFileSync(join(root, 'Flow/index.html'), 'utf8');
const flowApp = readFileSync(join(root, 'Flow/app.js'), 'utf8');
const flowExport = readFileSync(join(root, 'Flow/enhancements.js'), 'utf8');
const flowCsp = flowHtml.match(/<meta[^>]*http-equiv="Content-Security-Policy"[^>]*content="([^"]+)"/i)?.[1] || '';
for (const directive of ["default-src 'self'", "script-src 'self'", "style-src 'self'",
                         "connect-src 'self'", "object-src 'none'", "base-uri 'self'",
                         "frame-src 'none'", "form-action 'self'"]) {
  check(flowCsp.split(';').map(s => s.trim()).includes(directive),
    'FLOW security policy missing exact directive: ' + directive);
}
check(!/<script\\b(?![^>]*\\bsrc=)[^>]*>/i.test(flowHtml),
  'FLOW must not introduce inline executable scripts');
check(!/\\b(?:eval|Function)\\s*\\(|\\.innerHTML\\s*=|insertAdjacentHTML|document\\.write/i.test(flowApp + flowExport),
  'FLOW must not introduce dynamic code execution or HTML injection sinks');
check(!/FileReader|readAsText|type=["']file|\\.files\\s*\\[/i.test(flowHtml + flowApp + flowExport),
  'FLOW must remain export-only without file import');
for (const key of ['flow.tasks.v1', 'flow.projects.v1', 'flow.activity.v1']) {
  check(flowApp.includes(key) && flowExport.includes(key),
    'FLOW must preserve existing storage key: ' + key);
}
check(flowApp.includes('if(raw===null)return fallback') &&
      flowApp.includes('damagedKeys.push(key)') &&
      flowApp.includes('if(damagedKeys.length){if(!storageWarned)'),
  'FLOW must detect malformed storage and block overwriting original data');
check(flowApp.includes("type:'raw-recovery'") &&
      flowApp.includes("a.download='flow-recovery-backup.json'") &&
      flowApp.includes('raw[key]=localStorage.getItem(key)'),
  'FLOW must provide an export-only raw recovery backup for damaged data');
check(flowHtml.includes('app.js?v=33') && flowHtml.includes('style.css?v=6') && flowHtml.includes('enhancements.css?v=11'),
  'FLOW must load the current recurrence-safe JavaScript and styling');
check(flowApp.includes('const workflowTasks=') && flowApp.includes('const completeOccurrence=') &&
      flowApp.includes('const nextPendingRepeat=') && flowApp.includes('occurrenceDate:original'),
  'FLOW must distinguish projected recurring occurrences from saved task history');
check(flowApp.includes('...(old||{})') && flowApp.includes('recurrenceMoves') && flowApp.includes('stopRepeating(old)'),
  'FLOW editing must preserve individual recurrence date changes');
check(flowApp.includes("done.onchange=()=>{if(done.checked)completeOccurrence(t)") &&
      flowApp.includes("finish.onclick=()=>completeOccurrence(t)"),
  'FLOW must permit completing a recurring calendar occurrence from every task view');
check(flowHtml.includes('id="exportData"') && flowExport.includes('flow-workspace.json'),
  'FLOW must retain the JSON export control');
check(!/(?<!\$)\$\('[^']+'\)\.forEach/.test(flowApp) &&
      flowApp.includes("$$('[data-mode]').forEach"),
  'FLOW view buttons must use querySelectorAll rather than querySelector for iteration');

const flowViews = spawnSync(process.execPath,
  [join(root, 'tools/flow-view-smoke-check.mjs')], { encoding: 'utf8' });
check(flowViews.status === 0,
  'FLOW startup and navigation smoke test failed:\n' + (flowViews.stderr || flowViews.stdout || '').trim());

// Exercise actual FLOW recurrence and completion helpers, not just source tokens.
const flowRecurrence = spawnSync(process.execPath,
  [join(root, 'tools/flow-recurrence-check.mjs')], { encoding: 'utf8' });
check(flowRecurrence.status === 0,
  'FLOW recurrence behavioral regressions:\n' + (flowRecurrence.stderr || flowRecurrence.stdout || '').trim());

// The game only generates its ground maps in JS; the original ~35 MB
// texture pair and the obsolete Moon photo must not silently return.
for (const path of [
  'Enzo/assets/textures/Ground037_2K-PNG_Color.png',
  'Enzo/assets/textures/Ground037_2K-PNG_NormalGL.png',
  '3D Navigation Bar/assets/moon.jpg'
]) {
  check(!existsSync(join(root, path)), 'Unused legacy asset reappeared: ' + path);
}

const src = readFileSync(join(root, 'Enzo/src/shooting.js'), 'utf8');
check(/while\s*\(\s*hitObject\s*&&\s*!roots\.has\(hitObject\)\s*\)/.test(src) && src.includes('hit.object.userData.weakPoint'),
  'Enzo must resolve child hits to their registered roots and detect the exposed core');
// Phase-two world/weapon wiring must remain connected to the FPS loop.
const world = readFileSync(join(root, 'Enzo/src/arcaneWorld.js'), 'utf8');
const hand = readFileSync(join(root, 'Enzo/src/castingHand.js'), 'utf8');
check(world.includes('export function createArcaneWorld') &&
  world.includes('ShaderMaterial') && world.includes('InstancedMesh'),
  'Enzo must keep the procedural arena, storm sky and low-draw-call stones');
check(hand.includes('export function createCastingHand') &&
  hand.includes('muzzlePosition') && hand.includes('new GLTFLoader().load(MODEL_URL') &&
  hand.includes('bones.set(obj.name,obj)') && hand.includes('BEND_AXIS') &&
  !/new THREE\.(CylinderGeometry|BoxGeometry|IcosahedronGeometry)/.test(hand),
  'First-person model must use a real anatomical rig, not fake primitive fingers');
// The casting gauntlet must not have a bright circular ornament permanently
// hovering above the fingers. Flash VFX belong to short-lived casts only.
check(!/new THREE\.(RingGeometry|TorusGeometry)/.test(hand) &&
  hand.includes("fx.visible=false") &&
  hand.includes("const visible=loaded&&shotTime<.18") &&
  hand.includes("fx.visible=visible") &&
  hand.includes("fx.position.copy(rig.worldToLocal(palmCurrent.clone()))"),
  'No persistent floating white ring; palm flash must be bone-aligned and temporary');
// Hand inertia may affect the viewmodel, never the aim or raycaster.
const casting = readFileSync(join(root,'Enzo/src/castingHand.js'),'utf8');
const locomotion = readFileSync(join(root,'Enzo/src/movement.js'),'utf8');
const shootSource = readFileSync(join(root,'Enzo/src/shooting.js'),'utf8');
check(casting.includes('function palmWorldPosition(target)') &&
      casting.includes('palmWorldPosition(new THREE.Vector3())') &&
      casting.includes('fx.position.copy(rig.worldToLocal(palmCurrent.clone()))') &&
      !casting.includes('distalBone.getWorldPosition(new THREE.Vector3())'),
  'Muzzle and casting flash must share the actual palm, not a fingertip/back-of-hand origin');
check(casting.includes('function settle(s,target,omega,dt)') &&
      casting.includes('function addLookImpulse(dx,dy)') &&
      casting.includes('settle(fingerSpring,target') &&
      casting.includes('secondary.kick.v+=3.75'),
  'Hand must retain frame-rate-stable wrist inertia and delayed finger recovery');
const gameMotionCode=readFileSync(join(root,'Enzo/src/main.js'),'utf8');
check(gameMotionCode.includes('hand.addLookImpulse(event.movementX,event.movementY)') &&
      gameMotionCode.includes('hand.update(delta, motion, true)') &&
      locomotion.includes('strafe:velocity.dot(right)') &&
      shootSource.includes('if(!hand.isReady())return;') &&
      shootSource.includes('if(hand.cast())spellBolt(scene,start,end,camera)'),
  'Hand physics and palm shooting must remain connected to live gameplay');
check(casting.includes('new THREE.CatmullRomCurve3(path)') &&
      !/new THREE\.(RingGeometry|TorusGeometry)/.test(casting),
  'Gauntlet forearm details must follow the wrist without recreating floating circles');
const modelFile=join(root,'Enzo/assets/models/anatomical-right-hand.glb');
const modelLicense=join(root,'Enzo/assets/models/RIGHT-HAND-LICENSE.md');
check(existsSync(modelFile),'Skinned CC0 hand GLB must exist locally');
check(existsSync(modelLicense) &&
  readFileSync(modelLicense,'utf8').includes('Creative Commons Zero'),
  'The GLB must retain its CC0 provenance');
if(existsSync(modelFile)) {
  const glb=readFileSync(modelFile);
  check(glb.toString('ascii',0,4)==='glTF' &&
      glb.readUInt32LE(4)===2 && glb.readUInt32LE(8)===glb.length,
    'Hand GLB must have valid binary glTF 2.0 header');
  try {
    const length=glb.readUInt32LE(12);
    const info=JSON.parse(glb.toString('utf8',20,20+length));
    const skinned=(info.skins||[]).some(s=>(s.joints||[]).length>=16);
    const position=(info.meshes||[]).flatMap(m=>m.primitives||[])
      .map(p=>info.accessors[p.attributes.POSITION])
      .some(p=>p&&p.count>=4000);
    const names=new Set((info.nodes||[]).map(n=>n.name));
    check(skinned&&position&&names.has('hand_r')&&
      names.has('index_01_r')&&names.has('middle_03_r'),
      'Hand model must contain anatomical mesh and usable finger skeleton');
  } catch(error) {
    check(false,'Hand GLB JSON inaccessible: '+error.message);
  }
}
check(readFileSync(join(root,'Enzo/src/main.js'),'utf8').includes('hand.ready.then(') &&
      readFileSync(join(root,'Enzo/src/main.js'),'utf8').includes('startButton.disabled = true;'),
  'Enzo must not begin gameplay before its actual 3D hand loads');
check(src.includes('hand.cast()') && src.includes('spellBolt(') && src.includes('impact('),
  'Spell projectiles, casting animation and impact effects must remain wired');
check(!existsSync(join(root, 'Enzo/src/objects/Sky.js')),
  'Obsolete daylight sky module must not return');
const game = readFileSync(join(root, 'Enzo/src/main.js'), 'utf8');
check(game.includes('createArcaneWorld(scene, renderer)') && game.includes('createCastingHand(camera)'),
  'Enzo main loop must load the new world and casting viewmodel');
check(game.includes('let isGamePaused = true;'), 'Enzo must not simulate behind its start menu');
check(game.includes('clearTimeout(nextWaveTimer)'), 'Enzo must cancel old wave timers on reset');
const enzoHtml = readFileSync(join(root, 'Enzo/index.html'), 'utf8');
const splashCss = readFileSync(join(root, 'Enzo/styles/splash.css'), 'utf8');
check(existsSync(join(root, 'Enzo/assets/shattered-reach-splash.webp')),
  'Cinematic Enzo title artwork must exist locally');
check(!existsSync(join(root, 'Enzo/logo.png')),
  'The obsolete Enzo splash logo must not return');
check(enzoHtml.includes('id="howToPlayDialog"') && enzoHtml.includes('id="startButton"') &&
  enzoHtml.includes('id="menuStatusText"') && enzoHtml.includes('id="howToPlayButton"'),
  'Splash must retain working Start and How to Play controls');
check(game.includes("document.addEventListener('pointerlockerror'") &&
  game.includes('function requestGameplayLock()') && game.includes("helpDialog.showModal()"),
  'Splash needs working pointer-lock start and accessible How to Play modal');
check(splashCss.includes('prefers-reduced-motion:reduce') &&
  splashCss.includes('.enzo-splash .splash-art') &&
  splashCss.includes('.howto-dialog'),
  'New splash needs its responsive artwork and reduced-motion menu styles');
// The in-game art and combat HUD must stay connected to actual gameplay.
const polish = readFileSync(join(root, 'Enzo/src/worldPolish.js'), 'utf8');
const gameplayCss = readFileSync(join(root, 'Enzo/styles/gameplay.css'), 'utf8');
for(const id of ['healthMeter','healthFill','killFill','waveState','waveBanner',
                 'pauseDescription','healthState','crosshair']) {
  check(enzoHtml.includes('id="' + id + '"'),
    'Cinematic Enzo HUD missing #' + id);
}
check(enzoHtml.includes('styles/gameplay.css?v=1') &&
      game.includes("import { createWorldPolish } from './worldPolish.js'") &&
      game.includes('worldPolish.update(delta)') &&
      game.includes('worldPolish.setMood(wave)'),
  'Enzo must load the cinematic HUD and update world effects with survival waves');
check(polish.includes('scene.environment=environment') &&
      polish.includes('new THREE.ShaderMaterial(') &&
      polish.includes('new THREE.Points('),
  'In-game visual polish requires reflective materials, living portal and atmosphere');
check(gameplayCss.includes('.hud-health-fill') &&
      gameplayCss.includes('.hud-kill-fill') &&
      gameplayCss.includes('.pause-panel') &&
      gameplayCss.includes('prefers-reduced-motion:reduce'),
  'Cinematic HUD must retain meter, pause and low-motion styles');
check(game.includes("healthMeter.setAttribute('aria-valuenow'") &&
      game.includes("healthFill.style.width=hp+'%'") &&
      game.includes('showWaveBanner('),
  'Cinematic health, mission and wave HUD must reflect gameplay state');
const enzoEnemies = readFileSync(join(root, 'Enzo/src/enemies.js'), 'utf8');
check(enzoEnemies.includes('enemy.traverse(child =>'),
  'Enzo must dispose meshes in enemy subtrees');
const solar = readFileSync(join(root, '3D Navigation Bar/js/universe.js'), 'utf8');
check(solar.includes("generateSpaceTexture('Moon'"),
  'Moon should use generated texture, not the deleted photograph');
const hero = readFileSync(join(root, 'water-hero.js'), 'utf8');
check(hero.includes('gl.UNPACK_FLIP_Y_WEBGL,false'), 'Water hero must keep the artwork upright');
check(hero.includes('prefers-reduced-motion: reduce'), 'Water hero needs reduced-motion fallback');

if (problems.length) {
  console.error('SITE AUDIT FAILED (' + problems.length + ' problems):');
  for (const problem of problems) console.error(' - ' + problem);
  process.exitCode = 1;
} else {
  console.log('SITE AUDIT PASSED: ' + assertions + ' checks, ' +
    scripts.length + ' JavaScript files, ' + seen.size + ' HTML entry points.');
}
