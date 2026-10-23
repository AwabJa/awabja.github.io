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
const htmlPaths = ['index.html', 'Enzo/index.html', '3D Navigation Bar/index.html'];

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
  hand.includes('muzzlePosition') && hand.includes('fingers'),
  'First-person spellcaster must have a right hand, animation and cast origin');
check(src.includes('hand.cast()') && src.includes('spellBolt(') && src.includes('impact('),
  'Spell projectiles, casting animation and impact effects must remain wired');
check(!existsSync(join(root, 'Enzo/src/objects/Sky.js')),
  'Obsolete daylight sky module must not return');
const game = readFileSync(join(root, 'Enzo/src/main.js'), 'utf8');
check(game.includes('createArcaneWorld(scene, renderer)') && game.includes('createCastingHand(camera)'),
  'Enzo main loop must load the new world and casting viewmodel');
check(game.includes('let isGamePaused = true;'), 'Enzo must not simulate behind its start menu');
check(game.includes('clearTimeout(nextWaveTimer)'), 'Enzo must cancel old wave timers on reset');
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
