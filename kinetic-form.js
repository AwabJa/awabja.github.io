/*
 * Kinetic Form / 001 — a procedural folded-ribbon sculpture.
 * No libraries, trackers, WebGL dependency, image requests, or background workers.
 * Progressive enhancement: the SVG illustration remains if canvas is unavailable.
 */
(() => {
  'use strict';
  const canvas = document.getElementById('kinetic-form');
  const frame = document.querySelector('.kinetic-stage');
  if (!canvas || !frame || typeof canvas.getContext !== 'function') return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = window.matchMedia('(pointer: coarse)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  let width = 0, height = 0, pixelRatio = 1, raf = 0;
  let lastFrame = 0, elapsed = 0, visible = true;
  let dragging = false, pointerX = 0, pointerY = 0;
  let velocityX = 0, velocityY = 0, rotationX = -.27, rotationY = .48;
  let targetX = -.27, targetY = .48;
  let active = !reduced.matches;

  const TAU = Math.PI * 2;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const vector = (x, y, z) => ({ x, y, z });
  const add = (a, b) => vector(a.x+b.x, a.y+b.y, a.z+b.z);
  const sub = (a, b) => vector(a.x-b.x, a.y-b.y, a.z-b.z);
  const scale = (a, k) => vector(a.x*k, a.y*k, a.z*k);
  const cross = (a, b) => vector(a.y*b.z-a.z*b.y, a.z*b.x-a.x*b.z, a.x*b.y-a.y*b.x);
  const dot = (a, b) => a.x*b.x+a.y*b.y+a.z*b.z;
  const unit = a => scale(a, 1/Math.max(.00001,Math.sqrt(dot(a,a))));
  const light = unit(vector(-.47, .75, 1.0));

  // A closed 2:3 torus knot; the twisted flat surface makes it a *ribbon*,
  // rather than a spherical object or another solar-system visual.
  function center(t) {
    const l = .94 + .31 * Math.cos(3*t);
    return vector(l*Math.cos(2*t), l*Math.sin(2*t), .40*Math.sin(3*t));
  }
  function surface(t, across) {
    const middle = center(t);
    const tangent = unit(sub(center(t+.002), center(t-.002)));
    let right = unit(cross(tangent, vector(0,0,1)));
    let normal = unit(cross(tangent, right));
    const twist = 2*t+.25;
    const spread = add(scale(right, Math.cos(twist)), scale(normal, Math.sin(twist)));
    // A fold in the ribbon catches light, without relying on an image texture.
    return add(middle, scale(spread, across*.26));
  }
  function turn(p) {
    // Object-space rotations, then a subtle display tilt to expose depth.
    const a = rotationY + elapsed*.09, b = rotationX;
    const ca = Math.cos(a), sa = Math.sin(a);
    const cb = Math.cos(b), sb = Math.sin(b);
    const x = p.x*ca+p.z*sa, z = -p.x*sa+p.z*ca;
    const y = p.y*cb-z*sb, zz=p.y*sb+z*cb;
    const tilt=.24, ct=Math.cos(tilt), st=Math.sin(tilt);
    return vector(x*ct-y*st, x*st+y*ct, zz);
  }
  function project(p) {
    const lens = 3.7/(3.7-p.z);
    const size = Math.min(width,height)*.325;
    return {x:width*.5+p.x*size*lens, y:height*.50-p.y*size*lens, z:p.z};
  }
  const rgb=(r,g,b,a=1)=>'rgba('+r+','+g+','+b+','+a+')';

  function background() {
    ctx.clearRect(0,0,width,height);
    // Soft studio lighting, rather than a starfield or sci-fi particle cloud.
    const glow = ctx.createRadialGradient(width*.48,height*.5,0,width*.48,height*.5,Math.max(width,height)*.46);
    glow.addColorStop(0,'rgba(120,215,166,.095)');
    glow.addColorStop(.58,'rgba(63,125,107,.035)');
    glow.addColorStop(1,'rgba(20,36,40,0)');
    ctx.fillStyle=glow;
    ctx.fillRect(0,0,width,height);

    const unitSize = Math.min(width,height);
    ctx.lineWidth=Math.max(.5,unitSize*.001);
    ctx.strokeStyle='rgba(166,222,196,.09)';
    for(let k=0;k<12;k++){
      const y=height*(.13+k*.067);
      const h=unitSize*(.011+k*.0016);
      ctx.beginPath();
      ctx.moveTo(width*.04,y+h);
      ctx.bezierCurveTo(width*.22,y-h,width*.47,y+h,width*.77,y-h);
      ctx.lineTo(width*.93,y-h*1.4);
      ctx.stroke();
    }
    // Calibration ticks keep the piece feeling designed rather than random.
    ctx.strokeStyle='rgba(181,235,207,.23)';
    for(let i=0;i<5;i++){
      const x=width*(.20+i*.15);
      ctx.beginPath();
      ctx.moveTo(x,height*.095);
      ctx.lineTo(x,height*(i===2?.116:.105));
      ctx.stroke();
    }
  }
  function render() {
    if(!width || !height) return;
    background();
    const slices=coarse.matches?130:200;
    const strips=coarse.matches?6:9;
    const facets=[];
    let previous=[];
    for(let i=0;i<=slices;i++){
      const t=i/slices*TAU;
      const row=[];
      for(let j=0;j<=strips;j++){
        const v=j/strips*2-1;
        row.push(turn(surface(t,v)));
      }
      if(previous.length){
        for(let j=0;j<strips;j++){
          const p=previous[j],q=row[j],r=row[j+1],s=previous[j+1];
          const normal=unit(cross(sub(q,p),sub(s,p)));
          const diffuse=Math.abs(dot(normal,light));
          const view=Math.abs(normal.z);
          const edge=Math.pow(1-view,2.2);
          const across=(j+.5)/strips;
          const shine=Math.pow(Math.max(0,Math.cos((across-.34)*Math.PI*2)),8);
          const curve=Math.pow(Math.max(0,diffuse),1.55);
          let l=.15+curve*.65+edge*.31+shine*.17;
          if(normal.z<0)l*=.71;
          const color=rgb(
            Math.round(clamp(35+l*179,0,240)),
            Math.round(clamp(70+l*175,0,250)),
            Math.round(clamp(63+l*153,0,225))
          );
          facets.push({
            depth:(p.z+q.z+r.z+s.z)*.25,
            points:[project(p),project(q),project(r),project(s)],
            fill:color,
            rim:edge>.62&&j===0
          });
        }
      }
      previous=row;
    }
    facets.sort((a,b)=>a.depth-b.depth);
    for(const f of facets){
      const pts=f.points;
      ctx.beginPath();
      ctx.moveTo(pts[0].x,pts[0].y);
      for(let i=1;i<4;i++)ctx.lineTo(pts[i].x,pts[i].y);
      ctx.closePath();
      ctx.fillStyle=f.fill;
      ctx.fill();
    }

    // A few fine metal filaments track the surface — restrained reflections.
    for(const across of [-1, -.64, .28, 1]){
      ctx.beginPath();
      for(let i=0;i<=slices;i++){
        const point=project(turn(surface(i/slices*TAU,across)));
        if(i===0) ctx.moveTo(point.x,point.y);
        else ctx.lineTo(point.x,point.y);
      }
      ctx.strokeStyle=across===1?'rgba(226,255,237,.52)':'rgba(195,255,220,.18)';
      ctx.lineWidth=across===1?1.15:.65;
      ctx.stroke();
    }

    // Index point / focus line: graphic-design metadata, not an orbit.
    const guideX=width*.835, guideY=height*.72;
    ctx.beginPath();ctx.arc(guideX,guideY,2.5,0,TAU);
    ctx.fillStyle='rgba(191,255,222,.8)';ctx.fill();
    ctx.beginPath();ctx.moveTo(guideX+9,guideY);ctx.lineTo(width*.955,guideY);
    ctx.lineWidth=.75;ctx.strokeStyle='rgba(166,240,208,.4)';ctx.stroke();
  }
  function resize() {
    const bounds=canvas.getBoundingClientRect();
    if(!bounds.width || !bounds.height)return;
    width=bounds.width;height=bounds.height;
    pixelRatio=Math.min(window.devicePixelRatio||1,coarse.matches?1.35:1.75);
    canvas.width=Math.round(width*pixelRatio);
    canvas.height=Math.round(height*pixelRatio);
    ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
    render();
  }
  function frameLoop(now){
    raf=0;
    if(!active||!visible||document.hidden)return;
    if(now-lastFrame>= (coarse.matches?41:31)){
      const delta=Math.min((now-(lastFrame||now))/1000,.06);
      lastFrame=now;
      elapsed+=delta;
      targetX=clamp(targetX+velocityX,-1.1,1.1);
      targetY+=velocityY;
      velocityX*=.89;velocityY*=.89;
      rotationX+=(targetX-rotationX)*Math.min(1,delta*4.6);
      rotationY+=(targetY-rotationY)*Math.min(1,delta*4.6);
      render();
    }
    raf=requestAnimationFrame(frameLoop);
  }
  function start(){
    if(raf||!active||!visible||document.hidden)return;
    lastFrame=0;
    raf=requestAnimationFrame(frameLoop);
  }
  function stop(){
    if(raf)cancelAnimationFrame(raf);
    raf=0;
  }
  function syncMotion(){
    active=!reduced.matches;
    if(active)start();
    else{stop();render();}
  }
  canvas.addEventListener('pointerdown', e=>{
    if(!fine.matches||reduced.matches)return;
    dragging=true;pointerX=e.clientX;pointerY=e.clientY;
    canvas.setPointerCapture(e.pointerId);
    frame.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', e=>{
    if(!dragging)return;
    const dx=e.clientX-pointerX,dy=e.clientY-pointerY;
    targetY+=clamp(dx*.008,-.22,.22);
    targetX=clamp(targetX+clamp(dy*.008,-.20,.20),-1.1,1.1);
    velocityY=clamp(dx*.0002,-.03,.03);
    velocityX=clamp(dy*.0002,-.03,.03);
    pointerX=e.clientX;pointerY=e.clientY;
    if(!active)render();
  });
  const endDrag=()=>{dragging=false;frame.classList.remove('is-dragging');};
  canvas.addEventListener('pointerup',endDrag);
  canvas.addEventListener('pointercancel',endDrag);
  canvas.addEventListener('lostpointercapture',endDrag);

  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      visible=entries.some(entry=>entry.isIntersecting);
      if(visible)start();else stop();
    },{threshold:0});
    observer.observe(canvas);
  }
  window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
  reduced.addEventListener('change',syncMotion);
  canvas.addEventListener('contextmenu', e=>e.preventDefault());
  try{
    resize();
    canvas.classList.add('is-ready');
    frame.classList.add('has-kinetic-art');
    start();
  }catch(error){
    // Preserve the static CSS/SVG mark on unsupported devices.
    console.warn('[Kinetic Form] Falling back to static composition.',error);
    stop();
  }
})();