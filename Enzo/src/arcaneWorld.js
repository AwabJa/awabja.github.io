import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

// ENZO: The Shattered Reach. Entirely procedural and shared-material / instanced.
export function createArcaneWorld(scene, renderer) {
  const compact=window.matchMedia('(max-width:850px), (pointer:coarse)').matches;
  const reduced=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  scene.background=new THREE.Color(0x090c18);
  scene.fog=new THREE.FogExp2(0x12152a, compact?.012:.0095);
  scene.add(new THREE.HemisphereLight(0x9d9bff,0x3e1e20,.72));
  const sun=new THREE.DirectionalLight(0xc2cdff,1.7);
  sun.position.set(-42,75,-48);sun.castShadow=true;
  sun.shadow.mapSize.set(compact?512:1024,compact?512:1024);
  sun.shadow.camera.left=-65;sun.shadow.camera.right=65;
  sun.shadow.camera.top=65;sun.shadow.camera.bottom=-65;
  sun.shadow.camera.far=170;sun.shadow.bias=-.0007;
  scene.add(sun);
  const amber=new THREE.PointLight(0xff7143,1.5,70,2);
  amber.position.set(0,14,-40);scene.add(amber);
  const uniforms={uTime:{value:0}};
  const sky=new THREE.Mesh(new THREE.SphereGeometry(450,40,28),
    new THREE.ShaderMaterial({
      side:THREE.BackSide,depthWrite:false,fog:false,
      uniforms,vertexShader:"varying vec3 vDir; void main(){vDir=normalize(position); vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}",fragmentShader:"precision mediump float;\nvarying vec3 vDir;\nuniform float uTime;\nfloat hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}\nfloat noise(vec3 p) {\n vec3 i=floor(p), f=fract(p);f=f*f*(3.-2.*f);\n return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),\n mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);\n}\nvoid main(){\n vec3 d=normalize(vDir);\n float h=smoothstep(-.15,.78,d.y);\n vec3 dusk=mix(vec3(.34,.12,.19),vec3(.056,.066,.18),smoothstep(-.18,.30,d.y));\n vec3 c=mix(dusk,vec3(.012,.009,.052),h);\n float cloud=noise(d*6.+vec3(uTime*.009,uTime*.004,0.));\n cloud=.65*cloud+.35*noise(d*13.+vec3(-uTime*.012,0.,uTime*.003));\n float storm=smoothstep(.45,.72,cloud)*smoothstep(.05,.55,d.y);\n c+=vec3(.22,.06,.43)*storm;\n float horizon=exp(-pow((d.y-.045)*8.,2.));\n c+=vec3(.29,.095,.048)*horizon*(.5+.5*cloud);\n vec3 eclipse=normalize(vec3(.38,.63,-.68));\n float moon=dot(d,eclipse);\n c+=vec3(.46,.15,.77)*pow(max(0.,moon),45.)*.65;\n float disc=smoothstep(.9988,.9994,moon);\n c=mix(c,vec3(.009,.009,.022),disc);\n c+=vec3(.6,.29,.91)*smoothstep(.9979,.9994,moon)*(1.-disc);\n float star=step(.9982,hash(floor(d*780.)))*smoothstep(.16,.42,d.y);\n c+=star*vec3(.72,.83,1.);\n gl_FragColor=vec4(c,1.);\n}"
    }));
  sky.frustumCulled=false;sky.renderOrder=-1000;scene.add(sky);

  // A tileable volcanic/arcane material replaces the flat cement texture.
  const size=compact?256:512;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d');
  const pixels=ctx.createImageData(size,size);
  const normalCanvas=document.createElement('canvas');normalCanvas.width=normalCanvas.height=size;
  const nctx=normalCanvas.getContext('2d');
  const normal=nctx.createImageData(size,size);
  const heights=new Float32Array(size*size);
  const fract=n=>n-Math.floor(n);
  const hash=(x,y)=>fract(Math.sin(x*127.1+y*311.7)*43758.5453);
  function noise(x,y,f) {
    const gx=x/f,gy=y/f,ix=Math.floor(gx),iy=Math.floor(gy);
    const fx=gx-ix,fy=gy-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
    return (hash(ix,iy)*(1-u)+hash(ix+1,iy)*u)*(1-v)+
      (hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u)*v;
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=y*size+x,o=i*4;
    const coarse=noise(x,y,size/5),detail=noise(x,y,size/29),grit=hash(x,y);
    const line=Math.abs(Math.sin(x/size*31+y/size*18+noise(x,y,size/11)*5));
    const fissure=line<.035;
    const shade=13+coarse*23+detail*17+grit*13;
    pixels.data[o]=fissure?20:shade*.76;
    pixels.data[o+1]=fissure?76:shade*.88;
    pixels.data[o+2]=fissure?108:shade*1.26;
    pixels.data[o+3]=255;
    heights[i]=coarse*.6+detail*.3-(fissure?.35:0);
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=y*size+x,o=i*4;
    const l=heights[y*size+(x+size-1)%size],r=heights[y*size+(x+1)%size];
    const u=heights[((y+size-1)%size)*size+x],d=heights[((y+1)%size)*size+x];
    const n=new THREE.Vector3((l-r)*2.4,(u-d)*2.4,1).normalize();
    normal.data[o]=128+n.x*127;normal.data[o+1]=128+n.y*127;
    normal.data[o+2]=128+n.z*127;normal.data[o+3]=255;
  }
  ctx.putImageData(pixels,0,0);nctx.putImageData(normal,0,0);
  const albedo=new THREE.CanvasTexture(canvas),bump=new THREE.CanvasTexture(normalCanvas);
  albedo.encoding=THREE.sRGBEncoding;
  for(const t of [albedo,bump]){
    t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(15,15);
    t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  }
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(190,190),
    new THREE.MeshStandardMaterial({map:albedo,normalMap:bump,roughness:.98,metalness:.06}));
  ground.name='Obsidian ground';ground.rotation.x=-Math.PI/2;
  ground.receiveShadow=true;scene.add(ground);

  const stone=new THREE.MeshStandardMaterial({color:0x28313c,roughness:.81,metalness:.25,flatShading:true});
  const dark=new THREE.MeshStandardMaterial({color:0x131a27,roughness:.88,metalness:.28,flatShading:true});
  const trim=new THREE.MeshStandardMaterial({color:0x606675,metalness:.82,roughness:.4});
  const cyan=new THREE.MeshBasicMaterial({color:0x38cfff,transparent:true,opacity:.78,depthWrite:false});
  const purple=new THREE.MeshBasicMaterial({color:0x9551ff,transparent:true,opacity:.65,depthWrite:false});
  const animated=[];
  function block(x,y,z,w,h,d,mat=stone){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);
    return m;
  }
  function ring(radius,tube,material,y,place=scene){
    const m=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,6,72),material);
    m.rotation.x=-Math.PI/2;m.position.y=y;place.add(m);return m;
  }
  ring(14,.07,purple,.065);ring(25,.045,cyan,.064);
  const outer=ring(28,.04,purple,.052);
  // A ring of ruined obelisks; leave the middle of the arena fully playable.
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6+.22,dist=38+(i%4)*7;
    const x=Math.sin(a)*dist,z=Math.cos(a)*dist,h=10+(i*7%10);
    const p=block(x,h*.49,z,3.1,h,3.1,i%3?stone:dark);
    p.rotation.y=a*.35;
    block(x,h*.15,z,4.5,.65,4.5,trim);
    const top=new THREE.Mesh(new THREE.ConeGeometry(2.3,4.8,5),stone);
    top.position.set(x,h+1,z);top.rotation.z=.13*(i%2?1:-1);
    top.castShadow=true;scene.add(top);
    const slit=new THREE.Mesh(new THREE.BoxGeometry(.14,h*.37,.15),cyan);
    slit.position.set(x+Math.sin(a)*1.6,h*.56,z+Math.cos(a)*1.6);slit.rotation.y=a;scene.add(slit);
  }
  // Far landmark: a monumental ancient portal with rotating cyan tracery.
  const gate=new THREE.Group();gate.position.set(0,0,-62);scene.add(gate);
  const gatePiece=(g,m,x,y,z)=>{
    const obj=new THREE.Mesh(g,m);obj.position.set(x,y,z);gate.add(obj);return obj;
  };
  for(const side of [-1,1]){
    gatePiece(new THREE.BoxGeometry(5,25,5),stone,side*15,12,0);
    gatePiece(new THREE.ConeGeometry(4.3,6.2,5),trim,side*15,27,0);
  }
  gatePiece(new THREE.TorusGeometry(14.3,1.2,8,64),stone,0,18,0);
  const gateGlow=gatePiece(new THREE.TorusGeometry(12.8,.13,6,64),cyan,0,18,.2);
  const portal=gatePiece(new THREE.CircleGeometry(12.7,64),new THREE.MeshBasicMaterial({
    color:0x56327c,transparent:true,opacity:.2,side:THREE.DoubleSide,depthWrite:false
  }),0,18,-.2);
  const portalLight=new THREE.PointLight(0x8461ff,2.2,65,2);
  portalLight.position.set(0,18,-61);scene.add(portalLight);
  // Debris and floating island silhouettes. Props do not block the player.
  for(let i=0;i<15;i++){
    const a=i*2.399,rad=23+(i%7)*7,x=Math.sin(a)*rad,z=Math.cos(a)*rad;
    const h=1.6+(i%5)*.7;
    block(x,h*.5,z,1.9,h,1.5,i%2?stone:dark);
    const shard=new THREE.Mesh(new THREE.OctahedronGeometry(.65+(i%3)*.17),i%4?trim:purple);
    shard.position.set(x,h+.7,z);scene.add(shard);
    animated.push({mesh:shard,y:h+.7,p:i*.7});
  }
  for(let i=0;i<10;i++){
    const a=i*2.4,dist=72+(i%4)*7,x=Math.sin(a)*dist,z=Math.cos(a)*dist;
    const island=new THREE.Group();
    island.position.set(x,23+(i%4)*6,z);
    island.add(new THREE.Mesh(new THREE.ConeGeometry(3+(i%3),7+(i%4),5),dark));
    const tower=new THREE.Mesh(new THREE.BoxGeometry(1.6,4+(i%3)*2,1.6),stone);
    tower.position.y=3;island.add(tower);
    scene.add(island);animated.push({mesh:island,y:island.position.y,p:i*.5});
  }
  const rockGeo=new THREE.DodecahedronGeometry(1,0);
  const rocks=new THREE.InstancedMesh(rockGeo,dark,compact?100:220);
  const dummy=new THREE.Object3D();
  for(let i=0;i<rocks.count;i++){
    const a=i*2.39996,dist=30+(i*67)%62,scale=.38+(i*17%13)*.13;
    dummy.position.set(Math.cos(a)*dist,scale*.2,Math.sin(a)*dist);
    dummy.rotation.set(i*.35,i*1.3,i*.63);
    dummy.scale.set(scale,scale*.4,scale*1.5);
    dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
  }
  rocks.instanceMatrix.needsUpdate=true;scene.add(rocks);
  let time=0;
  function update(delta){
    if(reduced)return;
    time+=Math.min(.05,delta);uniforms.uTime.value=time;
    outer.rotation.z=time*.02;
    gateGlow.rotation.z=time*.06;
    portal.material.opacity=.16+Math.sin(time*.8)*.055;
    for(const obj of animated){
      obj.mesh.position.y=obj.y+Math.sin(time*.6+obj.p)*.2;
      obj.mesh.rotation.y+=delta*.04;
    }
  }
  return {update,ground,sky};
}
