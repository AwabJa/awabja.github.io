/* Arcana Duel Moonfall: original procedural 3D environment and independently animated
   character meshes. All geometry is generated locally; no image background, CDN, or model fetch. */
(()=>{'use strict';
const canvas=document.getElementById('scene3d');
const gl=canvas?.getContext('webgl',{alpha:false,antialias:true,powerPreference:'high-performance',premultipliedAlpha:false}) || canvas?.getContext('experimental-webgl');
if(!gl){window.Moonfall3D=window.MoonfallFallback(canvas);return;}
const vs=`attribute vec3 p,n; uniform mat4 mvp,model; uniform vec3 light; uniform float emissive; varying float shade,depth; void main(){vec3 N=normalize((model*vec4(n,0.)).xyz); float d=max(0.,dot(N,normalize(light)));shade=mix(0.43+floor(d*3.)*.21,1.,emissive);vec4 clip=mvp*vec4(p,1.);depth=clip.z/clip.w;gl_Position=clip;}`;
const fs=`precision mediump float; uniform vec3 tint,fog;uniform float fogAmt; varying float shade,depth; void main(){float t=clamp((depth-.55)*fogAmt,0.,.70);gl_FragColor=vec4(mix(tint*shade,fog,t),1.);}`;
function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
const loc={p:gl.getAttribLocation(program,'p'),n:gl.getAttribLocation(program,'n'),mvp:gl.getUniformLocation(program,'mvp'),model:gl.getUniformLocation(program,'model'),light:gl.getUniformLocation(program,'light'),tint:gl.getUniformLocation(program,'tint'),fog:gl.getUniformLocation(program,'fog'),emissive:gl.getUniformLocation(program,'emissive'),fogAmt:gl.getUniformLocation(program,'fogAmt')};
gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.clearColor(.018,.027,.056,1);gl.uniform3f(loc.light,-.48,.85,1.1);gl.uniform3f(loc.fog,.078,.105,.177);gl.uniform1f(loc.fogAmt,.54);
const mat=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function mul(a,b){const out=new Float32Array(16);for(let j=0;j<4;j++)for(let i=0;i<4;i++)out[i+j*4]=a[i]*b[j*4]+a[i+4]*b[j*4+1]+a[i+8]*b[j*4+2]+a[i+12]*b[j*4+3];return out;}
function trans(x=0,y=0,z=0){const m=mat();m[12]=x;m[13]=y;m[14]=z;return m;}
function scale(x=1,y=1,z=1){const m=mat();m[0]=x;m[5]=y;m[10]=z;return m;}
function rotX(a){const m=mat(),c=Math.cos(a),s=Math.sin(a);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m;}
function rotY(a){const m=mat(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m;}
function rotZ(a){const m=mat(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m;}
function xform(base,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){return mul(base,mul(trans(x,y,z),mul(rotZ(rz),mul(rotY(ry),mul(rotX(rx),scale(sx,sy,sz))))));}
function perspectiveOrtho(l,r,b,t,n,f){const m=mat();m[0]=2/(r-l);m[5]=2/(t-b);m[10]=-2/(f-n);m[12]=-(r+l)/(r-l);m[13]=-(t+b)/(t-b);m[14]=-(f+n)/(f-n);return m;}
function lookAt(eye,target){const norm=a=>{const d=Math.hypot(...a)||1;return a.map(v=>v/d)}, sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);const z=norm(sub(eye,target)),x=norm(cross([0,1,0],z)),y=cross(z,x);const m=mat();m[0]=x[0];m[4]=x[1];m[8]=x[2];m[12]=-dot(x,eye);m[1]=y[0];m[5]=y[1];m[9]=y[2];m[13]=-dot(y,eye);m[2]=z[0];m[6]=z[1];m[10]=z[2];m[14]=-dot(z,eye);return m;}
const VP=mul(perspectiveOrtho(-10.9,10.9,-5.6,4.25,.1,65),lookAt([0,5.8,22],[0,1.32,0]));
function mesh(verts){const v=new Float32Array(verts);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,v,gl.STATIC_DRAW);return {buffer:b,count:v.length/6};}
function pushTri(out,a,b,c){const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const len=Math.hypot(...n)||1;n=n.map(x=>x/len);for(const p of [a,b,c])out.push(...p,...n);}
function makeBox(){const o=[];const ps=[[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],[[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]],[[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]],[[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]],[[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]],[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]]];for(const q of ps){pushTri(o,q[0],q[1],q[2]);pushTri(o,q[0],q[2],q[3]);}return mesh(o);}
function makeSphere(lat=10,lon=14){const o=[];function point(a,b){const v=a*Math.PI/lat,u=b*2*Math.PI/lon;return [Math.sin(v)*Math.cos(u),Math.cos(v),Math.sin(v)*Math.sin(u)];}for(let y=0;y<lat;y++)for(let x=0;x<lon;x++){const a=point(y,x),b=point(y+1,x),c=point(y+1,x+1),d=point(y,x+1);pushTri(o,a,d,b);pushTri(o,b,d,c)}return mesh(o);}
function makeCone(segments=12){const o=[];for(let i=0;i<segments;i++){const a=i*2*Math.PI/segments,b=(i+1)*2*Math.PI/segments;const p=[Math.cos(a),0,Math.sin(a)],q=[Math.cos(b),0,Math.sin(b)],t=[0,1,0];pushTri(o,p,t,q);pushTri(o,[0,0,0],q,p)}return mesh(o);}
function makeCylinder(segments=12){const o=[];for(let i=0;i<segments;i++){const a=i*2*Math.PI/segments,b=(i+1)*2*Math.PI/segments;const p=[Math.cos(a),0,Math.sin(a)],q=[Math.cos(b),0,Math.sin(b)],r=[Math.cos(a),1,Math.sin(a)],s=[Math.cos(b),1,Math.sin(b)];pushTri(o,p,r,q);pushTri(o,q,r,s);pushTri(o,[0,0,0],q,p);pushTri(o,[0,1,0],r,s)}return mesh(o);}
const GEO={box:makeBox(),sphere:makeSphere(),cone:makeCone(),cylinder:makeCylinder()};
function hex(s){const c=s.replace('#','');return [0,2,4].map(i=>parseInt(c.slice(i,i+2),16)/255)}
const colors=new Map();function material(s){if(!colors.has(s))colors.set(s,hex(s));return colors.get(s);}
let drawCalls=0;
function draw(type,m,col,em=0){const geo=GEO[type];if(!geo)return;gl.bindBuffer(gl.ARRAY_BUFFER,geo.buffer);gl.enableVertexAttribArray(loc.p);gl.enableVertexAttribArray(loc.n);gl.vertexAttribPointer(loc.p,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(loc.n,3,gl.FLOAT,false,24,12);gl.uniformMatrix4fv(loc.mvp,false,mul(VP,m));gl.uniformMatrix4fv(loc.model,false,m);gl.uniform3fv(loc.tint,material(col));gl.uniform1f(loc.emissive,em);gl.drawArrays(gl.TRIANGLES,0,geo.count);drawCalls++;}
const STATIC=[];function add(type,x,y,z,sx,sy,sz,col,em=0,rx=0,ry=0,rz=0){STATIC.push([type,xform(mat(),x,y,z,sx,sy,sz,rx,ry,rz),col,em]);}
// Modeled environment: physical flagstones, gothic columns, flying buttresses, spires and moon.
// All geometry is mesh-based WebGL, not a photo backdrop.
for(let y=0;y<11;y++){const strip=['#182033','#20283a','#1b2435','#293246'][y%4];add('box',0,6.5-y*1.12,-21,20,.55,.10,strip,0.17)}
add('sphere',4.2,5,-19,2.45,2.45,.38,'#c5d4f6',1);add('sphere',4.4,5.18,-18.5,1.62,1.62,.30,'#e8eeff',1);
for(let i=0;i<18;i++){const x=((i*7)%19-9)*1.55,z=-12.4-(i%4)*1.6,y=.1+(i%3)*.85;add('sphere',x,y+4,z,.32,.22,.2,i%2?'#4a526b':'#5b5a76',.12)}
// Ground extends deep into the world, tile seams and scattered reflections.
add('box',0,-.42,-2,17,.3,18,'#141c2b');
for(let i=-9;i<=9;i++)for(let j=0;j<11;j++){
 const x=i*.95,z=4-j*1.37;const col=(i+j)%4===0?'#344057':(i+j)%4===1?'#222d42':(i+j)%4===2?'#1e293c':'#2e3449';
 add('box',x,-.236,z,.46,.018,.66,col,.08);
 if((i*3+j*5)%17===0)add('box',x,-.219,z,.34,.006,.04,'#8e7891',.45);
}
// Rear castle, arched walkways and spires.
add('box',0,1.1,-14,5.6,1.8,.85,'#2b334e');add('box',0,3.8,-14,3.6,1.4,.62,'#3e4563');
add('cone',0,5.2,-14,2.4,2.6,2.4,'#252e4b');
for(let x=-4;x<=4;x+=2){add('box',x,2.6,-13,0.22,2.3,.3,'#3b4159');add('cone',x,4.9,-13,.38,1.8,.38,'#313855');}
for(let i=-2;i<=2;i++){add('box',i*.82,3.3,-13.45,.08,.43,.05,'#c7a579',.9);add('box',i*.82,3.3,-13.42,.14,.52,.04,'#7c5260',.4);}
for(const side of [-1,1]){
 for(let i=0;i<5;i++){
  const x=side*(4.2+i*.75),z=-7.7-i*1.0;
  add('cylinder',x,-.08,z,.38,3.35,.38,'#2b3448');add('box',x,3.17,z,.57,.18,.56,'#495067');
  add('cone',x,3.45,z,.55,1.24,.55,'#2c3552');
  add('box',x,2.45,z+.02,.25,.5,.45,'#cca473',.8);
 }
 for(let i=0;i<4;i++){const x=side*(4.4+i*1.0);add('box',x,2.7,-8.7, .34,.4,1.1,'#2a344d');}
}
for(const side of [-1,1]){
 const x=side*8.6;add('cylinder',x,.1,-7,.6,5.0,.6,'#343747');add('cone',x,5,-7,.7,2,.7,'#4d4051');
 for(let y=1.4;y<4.8;y+=1.1)add('box',x,y,-6.3,.19,.28,.04,'#ffc08c',.82);
}
// Low stone altar and gothic candle braziers.
for(const x of [-6.1,-3.1,0,3.3,6.4]){add('cylinder',x,-.1,-3.2,.3,.7,.3,'#4e5060');add('cone',x,.55,-3.2,.12,.3,.12,'#e2a76a',1);}
// Minimal red maple foliage is geometric rather than photo textures.
for(let i=0;i<25;i++){const x=Math.sin(i*16.1)*8,z=-6-(i%6)*.9,y=3.8+(i%4)*.4;
 add('sphere',x,y,z,.18+(i%3)*.1,.14,.2,i%3?'#87374f':'#ad5265',.19);}
// Character palettes and mesh-based rig designs. All seven are independent dynamic meshes.
const figures=[
 {x:-7.95,z:.4,coat:'#efe4da',dark:'#303143',trim:'#e5c398',hair:'#f1e4f3',skin:'#ead0c2',eyes:'#9daccd',weapon:'spear',hairStyle:1,hat:false},
 {x:-5.72,z:.48,coat:'#332639',dark:'#211e35',trim:'#d8717d',hair:'#30293d',skin:'#e9c7bb',eyes:'#c9708e',weapon:'blade',hairStyle:2,hat:false},
 {x:-3.48,z:.6,coat:'#e9dfcd',dark:'#4e4550',trim:'#e6bf83',hair:'#c9ae7d',skin:'#f0d6c7',eyes:'#9a7d6a',weapon:'staff',hairStyle:1,hat:true},
 {x:-1.35,z:.55,coat:'#263b5a',dark:'#20283e',trim:'#93b7df',hair:'#b1c1df',skin:'#e0c7c0',eyes:'#8caadd',weapon:'blade',hairStyle:0,hat:false},
 {x:3.45,z:.1,coat:'#28283b',dark:'#161827',trim:'#9888b7',hair:'#272739',skin:'#bfa3a6',eyes:'#e48ab1',weapon:'scythe',hairStyle:2,hat:false},
 {x:5.65,z:.1,coat:'#d8c2cb',dark:'#622e48',trim:'#e4aab2',hair:'#e7dce2',skin:'#e8b9b9',eyes:'#b46285',weapon:'staff',hairStyle:1,hat:false,halo:true},
 {x:7.8,z:.2,coat:'#2b3043',dark:'#1e2333',trim:'#d7b87a',hair:'#353340',skin:'#b7a8a4',eyes:'#b6a090',weapon:'spear',hairStyle:0,hat:false,armor:true}
];
function segment(base,type,x,y,z,sx,sy,sz,color,rx=0,ry=0,rz=0,em=0){draw(type,xform(base,x,y,z,sx,sy,sz,rx,ry,rz),color,em)}
function humanoid(p,i,t,health,selected){
 const living=health>0, fall=living?0:1,phase=t*1.15+i*.7;
 const bob=living?Math.sin(phase)*.065:0,sway=living?Math.sin(phase*.55)*.055:0;
 const base=mul(trans(p.x,-.04+bob*.68-fall*.46,p.z),mul(rotY(i<4?-.12:.12),mul(rotZ(sway+fall*.48),scale(.86,.86,.86))));
 const skin=p.skin,cloth=p.coat,trim=p.trim,dark=p.dark,mainHair=p.hair;
 // shadow on ground and boots
 segment(mat(),'sphere',p.x,-.16,p.z,.57,.027,.32,'#0a0e17',0,0,0,.4);
 for(const side of [-1,1]){
  segment(base,'cylinder',side*.25,.1,.05,.14,.71,.15,dark,0,0,side*.02);
  segment(base,'sphere',side*.25,.08,.24,.22,.13,.3,dark);
 }
 // skirt / coat flares, cloak and moving layered panels
 segment(base,'cone',0,.57,0,.75,1.24,.55,cloth,0,0,0);
 for(const side of [-1,1]){
  segment(base,'cone',side*.36,.43,.04,.29,.82,.33,side>0?trim:dark,0,0,side*.1);
 }
 segment(base,'box',0,1.23,-.22,.58,.65,.14,dark);
 segment(base,'sphere',0,1.42,0,.47,.64,.28,cloth);
 segment(base,'box',0,1.55,.31,.12,.45,.05,trim);
 segment(base,'sphere',0,1.16,.29,.27,.13,.09,dark);
 segment(base,'sphere',0,1.06,.27,.06,.09,.07,trim,0,0,0,.65);
 // shaped arms with separately animated lower forearms
 for(const side of [-1,1]){
  const arm=side*.62,wiggle=living?Math.sin(phase+i)*.11*side:0;
  segment(base,'sphere',arm,1.7,0,.26,.26,.27,cloth);
  segment(base,'cylinder',arm,1.11+.1*wiggle,.05,.15,.67,.17,dark,0,0,side*.08+wiggle);
  segment(base,'sphere',arm,1.11,.12,.18,.15,.18,trim);
  segment(base,'sphere',arm,1.02,.17,.13,.16,.12,skin);
 }
 // face and distinct locks; the geometry is independent of the source illustration
 segment(base,'sphere',0,2.25,.06,.4,.49,.35,skin);
 segment(base,'sphere',0,2.56,-.13,.42,.32,.36,mainHair);
 // back of hair / long tail locks
 for(let j=-2;j<=2;j++){
  const bx=j*.16;
  if(p.hairStyle===1)segment(base,'cone',bx,1.35,-.2,.16,1.35,.18,mainHair,Math.sin(phase+j)*.065,0,bx*.13);
  else if(p.hairStyle===2)segment(base,'cone',bx*1.3,1.77,-.23,.17,.9,.19,mainHair,0,0,bx*.2);
 }
 // left/right fringe and anime lashes, eyes and pupils
 for(const side of [-1,1]){
  segment(base,'cone',side*.26,2.17,.31,.17,.60,.11,mainHair,0,0,side*.26);
  segment(base,'sphere',side*.17,2.32,.374,.133,.081,.049,'#f7efec');
  segment(base,'sphere',side*.17,2.32,.419,.065,.076,.02,p.eyes,.0,0,0,.3);
  segment(base,'sphere',side*.17,2.32,.437,.025,.055,.015,'#1b1c2f');
  segment(base,'box',side*.17,2.41,.39,.15,.025,.03,mainHair);
 }
 segment(base,'sphere',0,2.1,.39,.075,.02,.018,'#bc8391');
 // crest and collar
 segment(base,'sphere',0,1.91,.18,.21,.13,.22,trim);
 if(p.hat){segment(base,'cone',0,2.73,-.07,.63,.92,.53,'#3b3446');segment(base,'cylinder',0,2.74,-.08,.82,.075,.72,trim)}
 if(p.armor){for(const side of [-1,1]){segment(base,'box',side*.51,1.62,.01,.33,.28,.32,trim);segment(base,'cone',side*.45,2.1,-.1,.12,.33,.16,trim)}}
 if(p.halo){for(let a=0;a<12;a++){const th=a*Math.PI/6;segment(base,'sphere',Math.cos(th)*.66,2.40+Math.sin(th)*.66,-.25,.07,.07,.08,trim,0,0,0,.75)}}
 // Weapon meshes are independently rigged, bobbing with the character.
 const right=xform(base,.89,1.08,.14,1,1,1,0,0,.04+Math.sin(phase*1.2)*.035);
 if(p.weapon==='blade'){
  segment(right,'box',0,.22,0,.07,.49,.08,trim);
  segment(right,'box',0,.76,0,.11,.58,.045,'#d5dce8',0,0,0,.3);
  segment(right,'cone',0,1.32,0,.105,.27,.07,'#d5dce8');
 } else if(p.weapon==='spear'||p.weapon==='scythe'){
  segment(right,'cylinder',0,.35,0,.052,2.55,.05,trim,0,0,.16);
  segment(right,'cone',-.14,2.82,0,.20,.54,.11,'#c4d4e6',0,0,.16,.37);
  if(p.weapon==='scythe')segment(right,'cone',-.39,2.63,0,.4,.60,.12,'#a698c8',0,0,1.2);
 } else {
  segment(right,'cylinder',0,.25,0,.055,2.5,.06,trim,0,0,.12);
  segment(right,'sphere',-.18,2.65,0,.24,.24,.24,p.eyes,0,0,0,.7);
 }
 if(selected&&living){
  const k=.09+.05*Math.sin(t*2);
  segment(base,'sphere',0,.04,0,.72+k,.07,.42,i<4?'#92eed2':'#f5a4b4',0,0,0,.75);
 }
}
let lastW=0,lastH=0,lastFrame=-1;
const api={supported:true,models:7,render(now,state){
 // Keep input/HUD at native resolution; scene uses capped DPR for mobile GPU stability.
 const w=Math.max(1,Math.round(canvas.clientWidth*Math.min(devicePixelRatio||1,2))),h=Math.max(1,Math.round(canvas.clientHeight*Math.min(devicePixelRatio||1,2)));
 if(w!==lastW||h!==lastH){canvas.width=w;canvas.height=h;lastW=w;lastH=h;gl.viewport(0,0,w,h)}
 const f=Math.floor(now/33);if(f===lastFrame)return;lastFrame=f;gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 for(const [type,m,c,em] of STATIC)draw(type,m,c,em);
 for(let i=0;i<figures.length;i++){
  const hp=i<4?state.allies[i]?.hp:state.foes[i-4]?.hp;
  humanoid(figures[i],i,now/1000,hp??1,i<4?state.selectedAlly===i:state.selectedEnemy===i-4);
 }
},getStats(){return {models:figures.length,drawCalls,supported:true}}};
window.Moonfall3D=api;
})();
