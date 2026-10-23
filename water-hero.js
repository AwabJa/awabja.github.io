/*
 * Ocean Type / 001
 * Water displacement and spray over original AJ water artwork.
 * Canvas 2D, capped frame rate, no external libraries and a static image fallback.
 *
 * This is stylized animated liquid imagery, not an expensive fluid simulation.
 */
(() => {
  'use strict';

  const stage = document.querySelector('.water-stage');
  const canvas = document.getElementById('water-canvas');
  const image = stage && stage.querySelector('.water-art-fallback');
  if (!stage || !canvas || !image) return;

  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compact = window.matchMedia('(max-width: 700px), (pointer: coarse)');
  const mouse = window.matchMedia('(hover: hover) and (pointer: fine)');
  const TAU = Math.PI * 2;
  const clamp = (n, low, high) => Math.min(high, Math.max(low, n));

  let width = 0, height = 0, ratio = 1;
  let last = 0, elapsed = 0, raf = 0, onScreen = true;
  let ready = false, pointerStrength = 0, pointerX = .5, pointerY = .5;
  let lastBurstAt = 0;
  let seed = 0x9e3779b9;
  const particles = [];
  const ripples = [];

  const rand = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const emitters = [
    { x: .29, y: .18, vx: -56, vy: -120 },
    { x: .45, y: .36, vx: 63, vy: -76 },
    { x: .79, y: .16, vx: 53, vy: -117 },
    { x: .86, y: .59, vx: 78, vy: -45 },
    { x: .59, y: .78, vx: -25, vy: -87 },
    { x: .17, y: .69, vx: -93, vy: -45 }
  ];

  function resetParticle(p, warm = false, cursor = null) {
    const e = cursor || emitters[Math.floor(rand() * emitters.length)];
    const unit = Math.min(width, height) / 600;
    p.x = e.x * width + (rand() - .5) * width * .062;
    p.y = e.y * height + (rand() - .5) * height * .046;
    p.vx = (e.vx + (rand() - .5) * 145) * unit;
    p.vy = (e.vy + (rand() - .5) * 132) * unit;
    p.radius = (.6 + Math.pow(rand(), 1.35) * 2.3) * unit;
    p.life = .55 + rand() * 1.12;
    p.age = warm ? rand() * p.life : 0;
    p.phase = rand() * TAU;
    p.cursor = !!cursor;
  }

  function initParticles() {
    particles.length = 0;
    const count = compact.matches ? 57 : 115;
    for (let i = 0; i < count; i++) {
      const p = {};
      resetParticle(p, true);
      particles.push(p);
    }
  }

  function resize() {
    const b = canvas.getBoundingClientRect();
    if (b.width < 2 || b.height < 2) return;
    width = b.width;
    height = b.height;
    ratio = Math.min(window.devicePixelRatio || 1, compact.matches ? 1.25 : 1.7);
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    initParticles();
    if (ready && !motion.matches) render(0);
  }

  // A lightweight two-vortex flow field. Small image patches drift around
  // the curling wave inside the A and the J, with interference ripples.
  // Unlike a whole-image wobble, currents turn in different directions.
  function drawWater(t) {
    const naturalW = image.naturalWidth;
    const naturalH = image.naturalHeight;
    if (!naturalW || !naturalH) return;

    const destHeight = height * .975;
    const destWidth = destHeight * naturalW / naturalH;
    const ox = (width - destWidth) * .5;
    const oy = (height - destHeight) * .5;

    const columns = compact.matches ? 17 : 29;
    const rows = compact.matches ? 21 : 31;
    const srcTileW = naturalW / columns;
    const srcTileH = naturalH / rows;
    const destTileW = destWidth / columns;
    const destTileH = destHeight / rows;
    ctx.clearRect(0, 0, width, height);

    const vortices = [
      { x: .36, y: .43, radius: .25, strength: 1.0, direction: 1 },
      { x: .68, y: .76, radius: .25, strength: .86, direction: -1 }
    ];

    for (let j = 0; j < rows; j++) {
      const v = (j + .5) / rows;
      for (let i = 0; i < columns; i++) {
        const u = (i + .5) / columns;
        const ripple = Math.sin(v * 24 - t * 1.6 + u * 5.2);
        const finer = Math.sin(u * 27 + v * 18 + t * 1.25);
        let shiftX = (ripple * .0036 + finer * .0012) * destWidth;
        let shiftY = Math.cos(u * 15 + v * 8 - t * 1.0) * .0024 * destHeight;

        for (const vortex of vortices) {
          const rx = u - vortex.x;
          const ry = v - vortex.y;
          const influence = Math.exp(-(rx * rx + ry * ry) /
                            (2 * vortex.radius * vortex.radius));
          const strength = Math.sin(t * .92 + vortex.direction * 1.4) *
                           vortex.strength * influence * .043;
          shiftX -= ry * strength * destWidth * vortex.direction;
          shiftY += rx * strength * destHeight * vortex.direction;
        }

        if (pointerStrength > .02) {
          const rx = u - pointerX;
          const ry = v - pointerY;
          const proximity = Math.exp(-(rx * rx + ry * ry) / .019);
          shiftX -= ry * proximity * pointerStrength * destWidth * .092;
          shiftY += rx * proximity * pointerStrength * destHeight * .092;
        }

        // Overlap each patch slightly to prevent visible seams from motion.
        ctx.drawImage(
          image,
          i * srcTileW, j * srcTileH,
          srcTileW + .55, srcTileH + .55,
          ox + i * destTileW + shiftX,
          oy + j * destTileH + shiftY,
          destTileW + 1.2, destTileH + 1.2
        );
      }
    }
  }

  function updateSpray(delta, t) {
    const gravity = Math.min(width, height) * .35;
    const len = particles.length;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < len; i++) {
      const p = particles[i];
      p.age += delta;
      if (p.age >= p.life) {
        resetParticle(p);
        continue;
      }
      p.x += (p.vx + Math.sin(p.phase + t * 4) * 8) * delta;
      p.y += p.vy * delta;
      p.vy += gravity * delta;
      const fade = Math.sin(Math.PI * (p.age / p.life));
      const alpha = Math.max(0, Math.min(.85, fade * (p.cursor ? .82 : .43)));
      const radius = Math.max(.38, p.radius * (1 - p.age / p.life * .32));

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, TAU);
      ctx.fillStyle = 'rgba(202,255,238,' + alpha.toFixed(3) + ')';
      ctx.fill();
      if (radius > 1.3) {
        ctx.beginPath();
        ctx.arc(p.x - radius * .35, p.y - radius * .4, radius * .29, 0, TAU);
        ctx.fillStyle = 'rgba(255,255,255,' + (alpha * .65).toFixed(3) + ')';
        ctx.fill();
      }
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.age += delta;
      if (r.age > r.life) {
        ripples.splice(i, 1);
        continue;
      }
      const u = r.age / r.life;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, 6 + u * 30, 3 + u * 18, -.26, 0, TAU);
      ctx.strokeStyle = 'rgba(202,255,235,' + ((1-u) * .30).toFixed(3) + ')';
      ctx.lineWidth = .9;
      ctx.stroke();
    }

    // A restrained wet highlight travels across the inner wave edge.
    const glints = [
      [.38, .39, -.7], [.75, .30, .2], [.62, .77, 1.1]
    ];
    for (const [gx, gy, phase] of glints) {
      const pulse = .5 + .5 * Math.sin(t * 1.15 + phase);
      const x = gx * width + Math.sin(t*.7 + phase) * width*.011;
      const y = gy * height + Math.cos(t*.8 + phase) * height*.008;
      ctx.beginPath();
      ctx.ellipse(x, y, 2 + pulse * 3.2, .45 + pulse * .7, -.4, 0, TAU);
      ctx.fillStyle = 'rgba(221,255,248,' + (pulse*.25).toFixed(3) + ')';
      ctx.fill();
    }
    ctx.restore();
  }

  function render(delta) {
    if (!width || !height) return;
    drawWater(elapsed);
    updateSpray(delta, elapsed);
  }

  function step(timestamp) {
    raf = 0;
    if (motion.matches || document.hidden || !onScreen || !ready) return;

    const interval = compact.matches ? 43 : 32;
    if (last && timestamp - last < interval) {
      raf = requestAnimationFrame(step);
      return;
    }
    const delta = last ? clamp((timestamp - last) / 1000, 0, .05) : 0;
    last = timestamp;
    elapsed += delta;
    pointerStrength = Math.max(0, pointerStrength - delta * .75);
    render(delta);
    raf = requestAnimationFrame(step);
  }

  function start() {
    if (raf || !ready || document.hidden || !onScreen || motion.matches) return;
    last = 0;
    raf = requestAnimationFrame(step);
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }
  function syncMotion() {
    if (motion.matches) {
      stop();
      stage.classList.remove('is-water-running');
    } else if (ready) {
      stage.classList.add('is-water-running');
      start();
    }
  }

  function burst(event) {
    if (!mouse.matches || motion.matches || !ready) return;
    if (event.timeStamp - lastBurstAt < 70) return;
    lastBurstAt = event.timeStamp;

    const r = stage.getBoundingClientRect();
    pointerX = clamp((event.clientX - r.left) / r.width, 0, 1);
    pointerY = clamp((event.clientY - r.top) / r.height, 0, 1);
    pointerStrength = .95;

    if (ripples.length > 7) ripples.shift();
    ripples.push({ x: pointerX * width, y: pointerY * height, age: 0, life: .6 });
    // Reuse a handful of particles rather than growing an unbounded collection.
    for (let j = 0; j < 7; j++) {
      const p = particles[(Math.floor(rand() * particles.length))];
      if (p) resetParticle(p, false, {x: pointerX, y: pointerY, vx: 0, vy: -72});
    }
  }

  stage.addEventListener('pointermove', burst, { passive: true });
  stage.addEventListener('pointerleave', () => { pointerStrength = 0; });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      onScreen = entries.some(entry => entry.isIntersecting);
      if (onScreen) start();
      else stop();
    }, { threshold: 0.01 });
    observer.observe(stage);
  }
  if ('ResizeObserver' in window) {
    new ResizeObserver(resize).observe(canvas);
  } else {
    window.addEventListener('resize', resize, { passive: true });
  }
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  motion.addEventListener('change', syncMotion);

  function init() {
    if (!image.naturalWidth || !image.naturalHeight) return;
    try {
      resize();
      if (!width || !height) return;
      ready = true;
      if (!motion.matches) {
        render(0);
        stage.classList.add('is-water-running');
      }
      start();
    } catch (error) {
      // The standalone image stays visible if Canvas fails.
      console.warn('Water hero: using static artwork', error);
      ready = false;
      stage.classList.remove('is-water-running');
      stop();
    }
  }

  if (image.complete && image.naturalWidth) init();
  else {
    image.addEventListener('load', init, { once: true });
    image.addEventListener('error', () => {
      console.warn('Water hero artwork unavailable; static fallback not loaded.');
    }, { once: true });
  }
})();