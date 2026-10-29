import * as THREE from './vendor/three.module.js';

// Lightweight first-person sci-fi glove. No network-loaded mesh or external assets.
// Three.js r128 predates CapsuleGeometry. Build a compatible capsule from a cylinder and spheres.
function capsuleGeometry(radius, length, capSegments=5, radialSegments=12) {
  const r=Math.max(.001,radius), h=Math.max(0,length);
  const points=[];
  const steps=Math.max(4,capSegments*2);
  for(let i=0;i<=steps;i++) {
    const angle=-Math.PI/2+i*Math.PI/steps;
    points.push(new THREE.Vector2(Math.max(.0001,r*Math.cos(angle)),h/2+r*Math.sin(angle)));
  }
  for(let i=1;i<=steps;i++) {
    const angle=Math.PI/2+i*Math.PI/steps;
    points.push(new THREE.Vector2(Math.max(.0001,r*Math.cos(angle)),-h/2+r*Math.sin(angle)));
  }
  return new THREE.CylinderGeometry(r,r,h+2*r,Math.max(8,radialSegments),1);
}
export function createSciFiGlove(camera) {
  const rig=new THREE.Group();
  rig.name='ENZO / sci-fi casting glove';
  camera.add(rig);
  const fabric=new THREE.MeshStandardMaterial({color:0x19232e,roughness:.91,metalness:.08});
  const armor=new THREE.MeshStandardMaterial({color:0x354755,roughness:.42,metalness:.68});
  const edge=new THREE.MeshStandardMaterial({color:0x687e91,roughness:.3,metalness:.75});
  const glow=new THREE.MeshBasicMaterial({color:0x37caff});
  const joints=[];
  function part(parent,geometry,material,pos,rot) {
    const mesh=new THREE.Mesh(geometry,material);
    mesh.position.set(...pos);
    if(rot)mesh.rotation.set(...rot);
    parent.add(mesh);return mesh;
  }
  function box(parent,w,h,d,material,pos,rot) {
    return part(parent,new THREE.BoxGeometry(w,h,d),material,pos,rot);
  }
  // Palm lies below the crosshair and faces forward.
  const wrist=new THREE.Group();rig.add(wrist);
  part(wrist,capsuleGeometry(.105,.20,5,12),fabric,[0,-.17,.02],[0,0,-.18]);
  box(wrist,.23,.27,.095,fabric,[0,.015,-.015],[0,0,-.08]);
  box(wrist,.195,.18,.035,armor,[0,.045,.044],[0,0,-.08]);
  box(wrist,.15,.035,.048,edge,[0,.12,.065]);
  // Thin emissive conduits across the dorsal plate.
  for(const x of [-.065,.065])box(wrist,.009,.125,.007,glow,[x,.035,.066]);
  // Individually articulated, tapered finger segments.
  for(let i=0;i<4;i++){
    const x=(i-1.5)*.059;
    const lengths=[.12,.145,.135,.105];
    const base=new THREE.Group();
    base.position.set(x,.155,-.014);
    wrist.add(base);joints.push({node:base,index:i});
    const lean=(i-1.5)*-.055;
    base.rotation.z=lean;
    part(base,capsuleGeometry(.024,lengths[i]*.55,4,8),fabric,[0,lengths[i]*.31,0]);
    box(base,.046,lengths[i]*.48,.042,armor,[0,lengths[i]*.32,.029]);
    const tip=new THREE.Group();tip.position.y=lengths[i]*.69;base.add(tip);
    part(tip,capsuleGeometry(.020,lengths[i]*.30,4,8),fabric,[0,.027,0]);
    box(tip,.037,lengths[i]*.25,.038,armor,[0,.025,.023]);
    box(tip,.029,.012,.009,edge,[0,.067,.038]);
    joints.push({node:tip,index:i+4});
  }
  const thumb=new THREE.Group();thumb.position.set(-.13,-.045,-.012);thumb.rotation.z=.78;wrist.add(thumb);
  part(thumb,capsuleGeometry(.035,.13,5,10),fabric,[0,.055,0]);
  box(thumb,.06,.09,.052,armor,[0,.055,.027]);
  joints.push({node:thumb,index:8});
  // Forearm sleeve is broad enough to meet the camera edge.
  part(wrist,new THREE.CylinderGeometry(.108,.16,.43,16,1),fabric,[.025,-.41,.035],[0,0,-.14]);
  part(wrist,new THREE.CylinderGeometry(.114,.118,.045,16),edge,[.012,-.235,.038],[0,0,-.14]);
  const emitter=part(wrist,new THREE.CylinderGeometry(.036,.036,.013,20),armor,[0,.012,-.071],[Math.PI/2,0,0]);
  part(emitter,new THREE.CylinderGeometry(.023,.023,.016,20),glow,[0,.008,0]);
  const flash=part(wrist,new THREE.SphereGeometry(.055,12,8),glow,[0,.014,-.115]);
  flash.visible=false;
  let time=0,castAge=10,lookX=0,lookY=0;
  function cast(){castAge=0;return true;}
  function update(dt,motion={},active=true){
    if(!active)return;
    dt=Math.min(dt,.05);time+=dt;castAge+=dt;
    const moving=Boolean(motion.moving || motion.speed>.4);
    const bob=moving?Math.sin(time*9)*.014:Math.sin(time*1.5)*.003;
    const recoil=castAge<.27?Math.sin(castAge/.27*Math.PI)*.085:0;
    lookX*=Math.exp(-dt*9);lookY*=Math.exp(-dt*9);
    rig.position.set(.45+lookX*.012,-.48+bob+lookY*.012,-.85+recoil);
    rig.rotation.set(-.47+recoil*.6,-.38+lookX*.012,-.38+Math.sin(time*1.3)*.008);
    joints.forEach(({node,index})=>{
      const target=index===8?-.08:index<4?-.09:.13;
      node.rotation.x=target+(castAge<.3?Math.sin(castAge/.3*Math.PI)*.32:0);
    });
    flash.visible=castAge<.12;
    if(flash.visible)flash.scale.setScalar(.5+Math.sin(castAge/.12*Math.PI)*1.4);
  }
  function reset(){castAge=10;flash.visible=false;}
  function addLookImpulse(dx,dy){lookX=Math.max(-4,Math.min(4,lookX+dx*.018));lookY=Math.max(-4,Math.min(4,lookY+dy*.018));}
  update(0);
  return {rig,ready:Promise.resolve(),cast,update,reset,addLookImpulse,isReady:()=>true,
    muzzlePosition:()=>camera.localToWorld(new THREE.Vector3(.24,-.22,-.72))};
}
