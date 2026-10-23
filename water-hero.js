/*
 * OCEAN TYPE / 002 — living water, not a moving picture.
 *
 * A small WebGL flow-map shader advects the texture through continuous
 * directional currents around the A crest and J curl. A transparent 2D
 * canvas paints foam that travels along those contours, short-lived
 * turbulence, and gravity-driven spray. The original artwork is always
 * available as a static fallback. No libraries or external requests.
 */
(() => {
  'use strict';

  const stage = document.querySelector('.water-stage');
  const canvas = document.getElementById('water-canvas');
  const image = stage && stage.querySelector('.water-art-fallback');
  if (!stage || !canvas || !image) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compact = window.matchMedia('(max-width: 700px), (pointer: coarse)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const TAU = Math.PI * 2;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  let width = 0, height = 0, pixelRatio = 1;
  let raf = 0, lastFrame = 0, elapsed = 0, ready = false, onScreen = true;
  let mouseX = .5, mouseY = .5, mouseForce = 0, lastPointerBurst = 0;
  let renderer = null, spriteCtx = null;
  const droplets = [], ripples = [];
  let seed = 0x2cd517ad;

  function rand() {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  }
  const waterWidth = () => Math.min(width, height);
  const X = u => u * width;
  const Y = v => v * height;

  // Flow lines follow the composition of the *actual* A/J water artwork.
  // Bezier control points are in image-relative coordinates, top to bottom.
  const streams = [
    {p:[[.075,.79],[.14,.75],[.17,.52],[.25,.47]], speed:.14, weight:1.0},
    {p:[[.25,.47],[.26,.37],[.38,.39],[.47,.57]], speed:.17, weight:.85},
    {p:[[.28,.17],[.32,.25],[.42,.56],[.55,.70]], speed:.15, weight:.9},
    {p:[[.80,.16],[.82,.33],[.83,.56],[.77,.70]], speed:.15, weight:1.15},
    {p:[[.77,.69],[.79,.91],[.59,.95],[.48,.79]], speed:.18, weight:1.2},
    {p:[[.48,.78],[.47,.68],[.60,.59],[.64,.69]], speed:.21, weight:.78}
  ];
  function curve(path, t) {
    const p = path.p, q = 1-t;
    const a=q*q*q, b=3*q*q*t, c=3*q*t*t, d=t*t*t;
    return {
      x:X(p[0][0]*a+p[1][0]*b+p[2][0]*c+p[3][0]*d),
      y:Y(p[0][1]*a+p[1][1]*b+p[2][1]*c+p[3][1]*d)
    };
  }

  // Physically small spray launches along the crest; gravity takes over.
  const emitters = [
    {x:.26,y:.14,vx:-49,vy:-120},
    {x:.41,y:.34,vx:81,vy:-77},
    {x:.79,y:.15,vx:56,vy:-138},
    {x:.86,y:.60,vx:95,vy:-37},
    {x:.54,y:.79,vx:-54,vy:-87},
    {x:.12,y:.74,vx:-89,vy:-48}
  ];
  function respawn(p, warm = false, cursor = false) {
    const e = cursor ? {x:mouseX,y:mouseY,vx:(rand()-.5)*70,vy:-85}
                     : emitters[Math.floor(rand()*emitters.length)];
    const scale = waterWidth()/600;
    p.x = X(e.x)+(rand()-.5)*width*.055;
    p.y = Y(e.y)+(rand()-.5)*height*.048;
    p.vx = (e.vx+(rand()-.5)*119)*scale;
    p.vy = (e.vy+(rand()-.5)*135)*scale;
    p.radius = (.45+Math.pow(rand(),1.6)*2.35)*scale;
    p.age = 0;
    p.life = .50+rand()*.90;
    p.sway = rand()*TAU;
    p.bright = cursor ? .78 : .25+rand()*.32;
    if (warm) p.age=rand()*p.life;
  }
  function populate() {
    droplets.length=0;
    const count = compact.matches ? 65 : 145;
    for(let i=0;i<count;i++) {
      const d={};respawn(d,true);droplets.push(d);
    }
  }

  const overlay = document.createElement('canvas');
  overlay.className = 'water-spray-canvas';
  overlay.setAttribute('aria-hidden','true');
  overlay.setAttribute('role','presentation');
  canvas.parentElement.appendChild(overlay);
  spriteCtx = overlay.getContext('2d', {alpha:true});

  const vertexShader = [
    'attribute vec2 a_position;',
    'varying vec2 v_uv;',
    'void main(){',
    '  v_uv = vec2((a_position.x+1.0)*.5,(1.0-a_position.y)*.5);',
    '  gl_Position=vec4(a_position,0.0,1.0);',
    '}'
  ].join('\n');

  const fragmentShader = [
    'precision mediump float;',
    'uniform sampler2D u_texture;',
    'uniform float u_time;',
    'uniform vec2 u_mouse;',
    'uniform float u_force;',
    'varying vec2 v_uv;',
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float noise(vec2 p){',
    ' vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);',
    ' return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),',
    '  mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y);',
    '}',
    'vec2 eddy(vec2 p,vec2 origin,float spread,float gain){',
    ' vec2 v=p-origin;',
    ' float falloff=exp(-dot(v,v)/(spread*spread));',
    ' return vec2(-v.y,v.x)*gain*falloff;',
    '}',
    'vec2 current(vec2 p){',
    ' float a=exp(-pow((p.x-(.33+.13*(p.y-.4)))/.20,2.0));',
    ' float j=exp(-pow((p.x-.81)/.13,2.0))*smoothstep(.08,.29,p.y);',
    ' vec2 v=vec2(-.18,.32)*a + vec2(-.055,.44)*j;',
    ' v+=eddy(p,vec2(.34,.44),.26,.90);',
    ' v+=eddy(p,vec2(.63,.76),.23,-1.70);',
    ' v+=eddy(p,vec2(.82,.17),.19,.54);',
    ' float n=noise(p*10.0+vec2(u_time*.11,-u_time*.19));',
    ' float m=noise(p*17.0+vec2(-u_time*.20,u_time*.13));',
    ' v+=vec2(n-.5,m-.5)*.21;',
    ' vec2 cursor=p-u_mouse;',
    ' v+=vec2(-cursor.y,cursor.x)*u_force*exp(-dot(cursor,cursor)/.020)*.73;',
    ' return v;',
    '}',
    'void main(){',
    ' vec2 uv=v_uv;',
    ' vec4 original=texture2D(u_texture,uv);',
    ' if(original.a < .006){gl_FragColor=vec4(0.0);return;}',
    ' vec2 flow=current(uv);',
    ' float cycle=fract(u_time*.24);',
    ' float second=fract(cycle+.5);',
    ' vec2 displacement=flow*.23;',
    ' vec4 a=texture2D(u_texture,clamp(uv-displacement*cycle,.002,.998));',
    ' vec4 b=texture2D(u_texture,clamp(uv-displacement*second,.002,.998));',
    ' float blend=abs(cycle*2.0-1.0);',
    ' vec4 moving=mix(a,b,blend);',
    ' float coverage=smoothstep(.04,.43,moving.a);',
    ' vec3 liquid=mix(original.rgb,moving.rgb,.76*coverage);',
    ' float bands=sin(uv.x*73.0+uv.y*38.0-u_time*3.1+',
    '     sin(uv.y*20.0+u_time*1.4)*2.2);',
    ' float narrow=pow(max(0.0,bands),8.0);',
    ' float caustic=noise(uv*vec2(23.0,19.0)+flow*.9+u_time*.24);',
    ' float shimmer=pow(smoothstep(.55,.98,caustic),2.0);',
    ' float edge=clamp(original.a-texture2D(u_texture,',
    '                   clamp(uv+vec2(.005,.004),.002,.998)).a,0.0,1.0);',
    ' liquid+=vec3(.37,.77,.61)*(narrow*.12+shimmer*.19);',
    ' liquid+=vec3(.42,.72,.58)*edge*.28;',
    ' float light=clamp(.88+.18*sin(u_time*.70+uv.y*7.0+uv.x*5.0),.72,1.07);',
    ' gl_FragColor=vec4(clamp(liquid*light,0.0,1.0),original.a);',
    '}'
  ].join('\n');

  function compile(gl,type,code) {
    const shader=gl.createShader(type);
    gl.shaderSource(shader,code);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {
      const error=gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error('Water shader: '+error);
    }
    return shader;
  }
  function createRenderer() {
    const gl=canvas.getContext('webgl', {
      alpha:true, antialias:false, premultipliedAlpha:false, preserveDrawingBuffer:false,
      depth:false, stencil:false, powerPreference:'low-power'
    }) || canvas.getContext('experimental-webgl');
    if(!gl) return null;
    const vs=compile(gl,gl.VERTEX_SHADER,vertexShader);
    const fs=compile(gl,gl.FRAGMENT_SHADER,fragmentShader);
    const program=gl.createProgram();
    gl.attachShader(program,vs);gl.attachShader(program,fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
      throw new Error('Water program: '+gl.getProgramInfoLog(program));
    }
    gl.useProgram(program);
    const position=gl.getAttribLocation(program,'a_position');
    const buffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([
      -1,-1, 1,-1, -1,1, 1,1
    ]),gl.STATIC_DRAW);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const tex=gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,tex);
    // v_uv is already top-down (0 at the screen's top), so do NOT flip
    // the source image on upload: a second flip turns the AJ upside down.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(program,'u_texture'),0);
    const time=gl.getUniformLocation(program,'u_time');
    const mouse=gl.getUniformLocation(program,'u_mouse');
    const force=gl.getUniformLocation(program,'u_force');
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    return {
      resize(){gl.viewport(0,0,canvas.width,canvas.height);},
      draw(t){
        gl.clearColor(0,0,0,0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.uniform1f(time,t);
        gl.uniform2f(mouse,mouseX,mouseY);
        gl.uniform1f(force,mouseForce);
        gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      }
    };
  }

  function resize() {
    const b=canvas.getBoundingClientRect();
    if(b.width<2||b.height<2)return;
    width=b.width;height=b.height;
    pixelRatio=Math.min(window.devicePixelRatio||1,compact.matches?1.2:1.55);
    canvas.width=Math.round(width*pixelRatio);
    canvas.height=Math.round(height*pixelRatio);
    overlay.width=canvas.width;
    overlay.height=canvas.height;
    if(spriteCtx)spriteCtx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
    if(renderer)renderer.resize();
    populate();
    if(ready&&!motion.matches)draw(0);
  }

  // Foam ribbons advance *along* the hand-fitted wave contours.
  function drawFoam(t) {
    if(!spriteCtx)return;
    const ctx=spriteCtx;
    ctx.save();ctx.globalCompositeOperation='screen';
    const size=waterWidth()/600;
    for(let p=0;p<streams.length;p++){
      const stream=streams[p];
      for(let k=0;k<(compact.matches?2:4);k++){
        const lead=(t*stream.speed+k*.283+p*.169)%1;
        const length=.11+.055*Math.sin(t*.6+k*1.7+p);
        const steps=11;
        const begin=clamp(lead-length,0,1);
        const end=clamp(lead,0,1);
        const from=curve(stream,begin),to=curve(stream,end);
        const gradient=ctx.createLinearGradient(from.x,from.y,to.x,to.y);
        gradient.addColorStop(0,'rgba(164,255,225,0)');
        gradient.addColorStop(.45,'rgba(192,255,237,.14)');
        gradient.addColorStop(.85,'rgba(232,255,248,.57)');
        gradient.addColorStop(1,'rgba(241,255,250,0)');
        ctx.beginPath();
        for(let step=0;step<=steps;step++){
          const u=begin+(end-begin)*step/steps;
          const point=curve(stream,u);
          const tremor=Math.sin(u*42-t*7+p*2.4)*size*1.2;
          if(!step)ctx.moveTo(point.x+tremor,point.y);
          else ctx.lineTo(point.x+tremor,point.y);
        }
        ctx.strokeStyle=gradient;
        ctx.lineWidth=(.6+stream.weight*1.1)*size;
        ctx.stroke();

        // Smaller streaks break away from the main flow, like surface foam.
        for(let d=0;d<3;d++){
          const offset=clamp(lead-d*.022,0,1);
          const point=curve(stream,offset);
          const previous=curve(stream,clamp(offset-.008,0,1));
          const wobble=Math.sin(t*5.6+p*4.3+d*2.2)*3.4*size;
          const alpha=.15+.25*(1-Math.abs(.5-lead));
          ctx.beginPath();
          ctx.moveTo(previous.x+wobble,previous.y-wobble*.5);
          ctx.lineTo(point.x+wobble,point.y-wobble*.5);
          ctx.strokeStyle='rgba(225,255,246,'+alpha.toFixed(3)+')';
          ctx.lineWidth=(.7+(d===0?.6:0))*size;
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  function drawSpray(delta,t) {
    if(!spriteCtx)return;
    const ctx=spriteCtx;
    const gravity=waterWidth()*.44;
    ctx.save();
    ctx.globalCompositeOperation='screen';
    for(const p of droplets){
      p.age+=delta;
      if(p.age>=p.life){respawn(p);continue;}
      p.x+=(p.vx+Math.sin(p.sway+t*5)*9)*delta;
      p.y+=p.vy*delta;
      p.vy+=gravity*delta;
      const progress=p.age/p.life;
      const alpha=clamp(Math.sin(progress*Math.PI)*p.bright,0,.86);
      const radius=Math.max(.3,p.radius*(1-.36*progress));
      ctx.beginPath();
      ctx.arc(p.x,p.y,radius,0,TAU);
      ctx.fillStyle='rgba(195,250,238,'+alpha.toFixed(3)+')';
      ctx.fill();
      if(radius>1.3){
        ctx.beginPath();
        ctx.arc(p.x-radius*.31,p.y-radius*.42,radius*.27,0,TAU);
        ctx.fillStyle='rgba(255,255,255,'+(alpha*.65).toFixed(3)+')';
        ctx.fill();
      }
    }
    for(let i=ripples.length-1;i>=0;i--){
      const r=ripples[i];
      r.age+=delta;
      if(r.age>r.life){ripples.splice(i,1);continue;}
      const u=r.age/r.life;
      ctx.beginPath();
      ctx.ellipse(r.x,r.y,6+u*43,3+u*25,-.28,0,TAU);
      ctx.strokeStyle='rgba(199,255,229,'+((1-u)*.35).toFixed(3)+')';
      ctx.lineWidth=.9;
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw(delta) {
    if(!width||!height)return;
    if(renderer)renderer.draw(elapsed);
    if(spriteCtx) {
      spriteCtx.clearRect(0,0,width,height);
      drawFoam(elapsed);
      drawSpray(delta,elapsed);
    }
  }
  function tick(now) {
    raf=0;
    if(motion.matches||document.hidden||!onScreen||!ready)return;
    const interval=compact.matches?42:30;
    if(lastFrame&&now-lastFrame<interval){raf=requestAnimationFrame(tick);return;}
    const delta=lastFrame?clamp((now-lastFrame)/1000,0,.055):0;
    lastFrame=now;
    elapsed+=delta;
    mouseForce=Math.max(0,mouseForce-delta*1.3);
    draw(delta);
    raf=requestAnimationFrame(tick);
  }
  function start() {
    if(raf||!ready||motion.matches||document.hidden||!onScreen)return;
    lastFrame=0;
    raf=requestAnimationFrame(tick);
  }
  function stop() {
    if(raf)cancelAnimationFrame(raf);
    raf=0;
  }
  function syncMotion() {
    if(motion.matches){
      stop();
      stage.classList.remove('is-water-running');
    }else if(ready){
      stage.classList.add('is-water-running');
      draw(0);start();
    }
  }
  function interact(event) {
    if(!finePointer.matches||motion.matches||!ready)return;
    if(event.timeStamp-lastPointerBurst<70)return;
    lastPointerBurst=event.timeStamp;
    const bounds=stage.getBoundingClientRect();
    mouseX=clamp((event.clientX-bounds.left)/bounds.width,0,1);
    mouseY=clamp((event.clientY-bounds.top)/bounds.height,0,1);
    mouseForce=.88;
    if(ripples.length>=7)ripples.shift();
    ripples.push({x:X(mouseX),y:Y(mouseY),age:0,life:.62});
    for(let i=0;i<7;i++){
      const p=droplets[Math.floor(rand()*droplets.length)];
      if(p)respawn(p,false,true);
    }
  }
  stage.addEventListener('pointermove',interact,{passive:true});
  stage.addEventListener('pointerleave',()=>{mouseForce=0;});

  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      onScreen=entries.some(e=>e.isIntersecting);
      if(onScreen)start();else stop();
    },{threshold:.01});
    observer.observe(stage);
  }
  if('ResizeObserver' in window)new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
  motion.addEventListener('change',syncMotion);

  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();
    stop();ready=false;
    stage.classList.remove('is-water-running');
  });
  canvas.addEventListener('webglcontextrestored',()=>{
    try{
      renderer=createRenderer();
      if(!renderer){ready=false;stage.classList.remove('is-water-running');return;}
      ready=true;resize();syncMotion();
    }
    catch(error){console.warn('Water rendering unavailable',error);}
  });

  function init() {
    if(!image.naturalWidth||!image.naturalHeight)return;
    try{
      renderer=createRenderer();
      if(!renderer){
        ready=false;
        stage.classList.remove('is-water-running');
        return;
      }
      resize();
      if(!width||!height)return;
      ready=true;
      if(!motion.matches){draw(0);stage.classList.add('is-water-running');}
      start();
    }catch(error){
      // Keep the original image visible, even if the GPU is unavailable.
      renderer=null;
      console.warn('Water hero: falling back to the original artwork',error);
      ready=false;
      stage.classList.remove('is-water-running');
    }
  }

  if(image.complete&&image.naturalWidth)init();
  else{
    image.addEventListener('load',init,{once:true});
    image.addEventListener('error',()=>console.warn('Water hero artwork did not load'),{once:true});
  }
})();
