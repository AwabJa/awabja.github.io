import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

/* In-game visual polish: local stone materials, weather, volumetric-feeling
   motes and an animated portal. No external images or additional libraries. */
export function createWorldPolish(scene,world,renderer){
  const compact=window.matchMedia('(max-width:850px), (pointer:coarse)').matches;
  const reduced=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const size=compact?256:512;
  const cvs=document.createElement('canvas');
  const cvsNormal=document.createElement('canvas');
  cvs.width=cvs.height=size;cvsNormal.width=cvsNormal.height=size;
  const ctx=cvs.getContext('2d'),nc=cvsNormal.getContext('2d');
  const pixels=ctx.createImageData(size,size),nm=nc.createImageData(size,size);
  const heights=new Float32Array(size*size);
  const fract=n=>n-Math.floor(n);
  const hash=(x,y)=>fract(Math.sin(x*127.17+y*313.31)*43758.53);
  function noise(x,y,step){
    const gx=x/step,gy=y/step,ix=Math.floor(gx),iy=Math.floor(gy);
    const tx=gx-ix,ty=gy-iy,u=tx*tx*(3-2*tx),v=ty*ty*(3-2*ty);
    return (hash(ix,iy)*(1-u)+hash(ix+1,iy)*u)*(1-v)
      +(hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u)*v;
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=y*size+x,o=i*4;
    const stone=noise(x,y,size/7)*.55+noise(x,y,size/32)*.31+noise(x,y,size/86)*.14;
    const layer=Math.sin(x*.021+y*.065+noise(x,y,size/25)*5);
    const fracture=Math.abs(Math.sin(y*.09+x*.043+noise(x,y,size/9)*5));
    const crack=fracture<.035;
    const light=Math.max(0,stone*62+Math.pow(Math.max(0,layer),5)*8+hash(x,y)*12-3);
    pixels.data[o]=crack?10:12+light*.75;
    pixels.data[o+1]=crack?26:22+light*.87;
    pixels.data[o+2]=crack?46:35+light*1.15;
    pixels.data[o+3]=255;
    heights[i]=stone+layer*.035-(crack?.21:0);
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=y*size+x,o=i*4;
    const l=heights[y*size+(x+size-1)%size],r=heights[y*size+(x+1)%size];
    const u=heights[((y+size-1)%size)*size+x],d=heights[((y+1)%size)*size+x];
    const nx=(l-r)*4,ny=(u-d)*4,len=Math.hypot(nx,ny,1);
    nm.data[o]=128+nx/len*127;nm.data[o+1]=128+ny/len*127;
    nm.data[o+2]=128+127/len;nm.data[o+3]=255;
  }
  ctx.putImageData(pixels,0,0);nc.putImageData(nm,0,0);
  const diffuse=new THREE.CanvasTexture(cvs),normal=new THREE.CanvasTexture(cvsNormal);
  diffuse.encoding=THREE.sRGBEncoding;
  for(const t of [diffuse,normal]){
    t.wrapS=t.wrapT=THREE.RepeatWrapping;
    t.repeat.set(2.8,2.8);
    t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  }
  const materials=new Set();
  scene.traverse(node=>{
    if(!node.isMesh||!node.material||Array.isArray(node.material)||node===world.ground||node===world.sky)return;
    const m=node.material;
    if(!m.isMeshStandardMaterial||materials.has(m))return;
    const hex=m.color.getHex();
    if(hex!==0x28313c&&hex!==0x131a27)return;
    materials.add(m);
    m.map=diffuse;m.normalMap=normal;m.normalScale=new THREE.Vector2(.7,.7);
    m.color.setHex(hex===0x28313c?0xb3becd:0x697587);
    m.metalness=.10;m.roughness=.8;m.needsUpdate=true;
  });
  world.ground.material.roughness=.74;
  world.ground.material.metalness=.19;
  world.ground.material.normalScale=new THREE.Vector2(.72,.72);

  // Broken shoreline-like stone fragments in one instanced draw call.
  const rockMat=new THREE.MeshStandardMaterial({
    color:0x5f6a7b,map:diffuse,normalMap:normal,
    normalScale:new THREE.Vector2(.5,.5),metalness:.17,roughness:.83
  });
  const rockCount=compact?34:78;
  const rocks=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),rockMat,rockCount);
  const dummy=new THREE.Object3D();
  for(let i=0;i<rockCount;i++){
    const a=i*2.39996+.3,r=26+(i*31%53),scale=.55+(i*11%13)*.16;
    dummy.position.set(Math.cos(a)*r,.05+(i%5)*.04,Math.sin(a)*r);
    dummy.rotation.set(i*.2,i*.59,i*.41);
    dummy.scale.set(scale,.15+(i%3)*.05,scale*1.8);
    dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
  }
  rocks.instanceMatrix.needsUpdate=true;rocks.receiveShadow=true;scene.add(rocks);

  const portalUniforms={uTime:{value:0},uMood:{value:0}};
  const portalMaterial=new THREE.ShaderMaterial({
    uniforms:portalUniforms,side:THREE.DoubleSide,transparent:true,depthWrite:false,
    blending:THREE.AdditiveBlending,
    vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader:"precision mediump float;\nvarying vec2 vUv;\nuniform float uTime;\nuniform float uMood;\nfloat hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}\nvoid main(){\n vec2 p=(vUv-.5)*2.;\n float r=length(p);if(r>1.)discard;\n float angle=atan(p.y,p.x);\n float n=noise(p*6.+vec2(uTime*.13,-uTime*.07));\n float spiral=angle*5.5-r*17.5+uTime*.8+n*4.;\n float bands=pow(max(0.,sin(spiral)),8.);\n float waves=pow(max(0.,sin(spiral*.52+n*3.)),5.);\n float inner=exp(-r*r*6.);\n float ring=pow(max(0.,sin(r*47.-uTime*1.6+n*5.)),6.)*.19;\n float lip=1.-smoothstep(.78,.99,r);\n float radial=1.-smoothstep(.1,1.,r);\n vec3 blue=vec3(.16,.54,.95),violet=vec3(.38,.21,.86);\n vec3 color=mix(blue,violet,clamp(uMood*.42+waves*.48,0.,1.));\n float strength=(.06+bands*.27+waves*.12+inner*.38+ring)*lip*radial;\n color+=vec3(.23,.56,.55)*inner;\n gl_FragColor=vec4(color,strength);\n}"
  });
  const portal=new THREE.Mesh(new THREE.CircleGeometry(12.6,72),portalMaterial);
  portal.position.set(0,18,-61.6);
  portal.renderOrder=3;
  scene.add(portal);
  const ringMaterial=new THREE.MeshBasicMaterial({
    color:0x64bfff,transparent:true,opacity:.69,
    blending:THREE.AdditiveBlending,depthWrite:false
  });
  const rings=[];
  for(let i=0;i<3;i++){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(11.1+i*.65,.036-i*.007,4,96),ringMaterial);
    ring.position.set(0,18,-61.45+i*.03);ring.rotation.z=i*.34;
    scene.add(ring);rings.push(ring);
  }

  // One particle draw call; a textured Points field adds atmospheric depth.
  const count=compact?135:400;
  const coords=new Float32Array(count*3),colors=new Float32Array(count*3);
  let seed=0x5e821;
  function random(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;}
  for(let i=0;i<count;i++){
    const angle=random()*Math.PI*2,r=7+random()*75;
    coords[i*3]=Math.cos(angle)*r;coords[i*3+1]=1.5+random()*27;coords[i*3+2]=Math.sin(angle)*r;
    colors[i*3]=.31+random()*.16;colors[i*3+1]=.54+random()*.29;colors[i*3+2]=.80+random()*.20;
  }
  const particlesGeo=new THREE.BufferGeometry();
  particlesGeo.setAttribute('position',new THREE.BufferAttribute(coords,3));
  particlesGeo.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const halo=document.createElement('canvas');halo.width=halo.height=32;
  const haloCtx=halo.getContext('2d'),gradient=haloCtx.createRadialGradient(16,16,0,16,16,16);
  gradient.addColorStop(0,'rgba(255,255,255,.93)');
  gradient.addColorStop(.26,'rgba(255,255,255,.64)');
  gradient.addColorStop(1,'rgba(255,255,255,0)');
  haloCtx.fillStyle=gradient;haloCtx.fillRect(0,0,32,32);
  const dust=new THREE.Points(particlesGeo,new THREE.PointsMaterial({
    map:new THREE.CanvasTexture(halo),size:compact?.3:.45,vertexColors:true,
    transparent:true,opacity:.36,depthWrite:false,
    blending:THREE.AdditiveBlending,sizeAttenuation:true
  }));
  dust.frustumCulled=false;scene.add(dust);

  const gemMat=new THREE.MeshStandardMaterial({
    color:0x586384,roughness:.29,metalness:.52,
    emissive:0x211b41,emissiveIntensity:.4
  });
  const gemGeo=new THREE.OctahedronGeometry(1,0);
  const gems=new THREE.InstancedMesh(gemGeo,gemMat,compact?12:22);
  for(let i=0;i<gems.count;i++){
    const angle=i*2.3997,r=35+(i*19%40),height=1.1+(i%5)*.36;
    dummy.position.set(Math.sin(angle)*r,height*.45,Math.cos(angle)*r);
    dummy.rotation.set(i*.28,i*.37,i*.44);
    dummy.scale.set(.4,height,.55);
    dummy.updateMatrix();gems.setMatrixAt(i,dummy.matrix);
  }
  gems.instanceMatrix.needsUpdate=true;scene.add(gems);

  let time=0;
  function setMood(wave){portalUniforms.uMood.value=Math.floor((Math.max(1,wave)-1)/2)%3;}
  function update(delta){
    if(reduced)return;
    const dt=Math.min(.05,Math.max(0,delta));
    time+=dt;portalUniforms.uTime.value=time;
    dust.rotation.y+=dt*.0009;
    rings.forEach((ring,i)=>ring.rotation.z+=(i%2?-.018:.016)*dt);
  }
  return {update,setMood};
}
