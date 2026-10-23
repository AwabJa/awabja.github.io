import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

/**
 * First-person right-hand spellcaster. No gun meshes or downloaded models.
 * Model is built in camera space so the glove stays responsive at any FOV.
 * Stage 2: idle -> palm impulse -> recoil -> recovery.
 */
export function createCastingHand(camera) {
  const rig=new THREE.Group();
  rig.name='Right-hand arcane gauntlet';
  rig.position.set(.33,-.35,-.69);
  rig.rotation.set(-.19,-.22,-.21);
  camera.add(rig);

  const armor=new THREE.MeshStandardMaterial({
    color:0x17243a,roughness:.36,metalness:.84,
    emissive:0x080e25,emissiveIntensity:.15,depthTest:false,depthWrite:false
  });
  const plate=new THREE.MeshStandardMaterial({
    color:0x4f6485,roughness:.28,metalness:.86,
    emissive:0x081322,emissiveIntensity:.22,depthTest:false,depthWrite:false
  });
  const seam=new THREE.MeshBasicMaterial({
    color:0x19bfff,transparent:true,opacity:.88,depthTest:false,depthWrite:false
  });
  const energy=new THREE.MeshBasicMaterial({
    color:0x7feaff,transparent:true,opacity:.94,depthTest:false,depthWrite:false
  });
  function attach(geometry,material,x,y,z,parent=rig){
    const m=new THREE.Mesh(geometry,material);
    m.position.set(x,y,z);m.renderOrder=900;
    m.frustumCulled=false;parent.add(m);return m;
  }
  function segment(a,b,r1,r2,material,parent=rig){
    const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b);
    const d=bv.clone().sub(av),len=d.length();
    const m=attach(new THREE.CylinderGeometry(r2,r1,len,8,1),material,
      (a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,parent);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
    return m;
  }
  const forearm=segment([.12,-.34,.12],[.02,-.095,-.10],.125,.105,armor);
  const cuff=attach(new THREE.CylinderGeometry(.133,.139,.105,10),plate,.085,-.21,-.02);
  cuff.rotation.x=-.30;
  // Layered gauntlet palm and angular backplate.
  const palm=attach(new THREE.BoxGeometry(.26,.19,.105),armor,-.035,.025,-.185);
  palm.rotation.z=-.1;
  const back=attach(new THREE.IcosahedronGeometry(.125,0),plate,-.03,.038,-.236);
  back.scale.set(1.08,.68,.45);

  // Four independently jointed fingers, fanned into an open casting pose.
  const fingers=[];
  for(let i=0;i<4;i++){
    const x=-.144+i*.078;
    const tipx=x+(i-1.5)*.031;
    const base=[x,.10,-.205];
    const mid=[x+(i-1.5)*.013,.193-(Math.abs(i-1.5)*.008),-.265];
    const tip=[tipx,.254-(Math.abs(i-1.5)*.024),-.338];
    const group=new THREE.Group();rig.add(group);
    segment(base,mid,.029,.024,armor,group);
    segment(mid,tip,.023,.012,plate,group);
    attach(new THREE.SphereGeometry(.024,8,6),seam,...mid,group);
    fingers.push(group);
  }
  // Thumb curves inward toward an illuminated rune floating above the palm.
  segment([.098,-.018,-.16],[.172,.075,-.24],.041,.030,armor);
  segment([.172,.075,-.24],[.106,.134,-.305],.030,.014,plate);

  // Wrist circuitry: layered rings and bright channels, all camera-facing.
  const cuffRune=attach(new THREE.TorusGeometry(.095,.007,6,32),seam,.067,-.20,-.13);
  cuffRune.rotation.y=.13;
  const glyph=attach(new THREE.TorusGeometry(.070,.007,6,40),seam,-.038,.056,-.317);
  const glyph2=attach(new THREE.TorusGeometry(.045,.004,5,4),energy,-.038,.056,-.320);
  glyph2.rotation.z=Math.PI/4;
  const core=attach(new THREE.SphereGeometry(.025,12,8),energy,-.038,.056,-.341);
  const flare=attach(new THREE.RingGeometry(.075,.09,40),energy,-.038,.056,-.35);
  flare.material=energy.clone();flare.material.opacity=0;
  flare.scale.setScalar(.4);

  let time=0,castTime=10;
  const base=rig.position.clone(),baseRot=rig.rotation.clone();
  const palmWorld=new THREE.Vector3();
  function cast() {
    castTime=0;
    return true;
  }
  function update(delta, moving=false, active=true) {
    if(!active)return;
    time+=Math.min(delta,.06);
    castTime+=Math.min(delta,.06);
    const impact=Math.max(0,1-castTime/.33);
    const snap=Math.sin(Math.min(1,castTime/.33)*Math.PI);
    const bob=moving?.013:.006;
    rig.position.copy(base);
    rig.position.y+=Math.sin(time*(moving?10:2.7))*bob;
    rig.position.z-=snap*.105;
    rig.position.x-=snap*.04;
    rig.rotation.set(baseRot.x-snap*.21,baseRot.y+snap*.075,baseRot.z+snap*.12);
    // Fingers naturally tuck inward as a shot forms, then open to release.
    fingers.forEach((finger,i)=>{
      finger.rotation.x=-snap*(.23+i*.024);
      finger.rotation.y=(i-1.5)*snap*.085;
    });
    glyph.rotation.z=time*.7;
    glyph2.rotation.z=-time*.9;
    glyph.scale.setScalar(1+snap*.43);
    core.scale.setScalar(.85+snap*1.75+.08*Math.sin(time*5));
    energy.opacity=.78+snap*.22;
    flare.scale.setScalar(.2+snap*4.0);
    flare.material.opacity=.55*impact;
  }
  function muzzlePosition() {
    camera.updateMatrixWorld(true);
    return rig.localToWorld(palmWorld.set(-.038,.066,-.42));
  }
  function reset(){castTime=10;rig.position.copy(base);rig.rotation.copy(baseRot);}
  return {rig,cast,update,muzzlePosition,reset};
}
