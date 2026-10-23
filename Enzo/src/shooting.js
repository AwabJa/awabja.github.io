import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
import {damageEnemy, getEnemyHitboxes} from './enemies.js';

/**
 * Spell bullets: instant, accurate FPS hit registration + high-visibility
 * traveling bolts from the palm. Impact bursts / trails use shared GPU assets.
 * No fake gun, no per-shot geometry allocation or per-shot RAF loops.
 */
const boltGeo=new THREE.IcosahedronGeometry(1,1);
const trailGeo=new THREE.CylinderGeometry(.014,.075,1,8,1);
const burstGeo=new THREE.TorusGeometry(.35,.038,5,20);
const sparkGeo=new THREE.TetrahedronGeometry(.075,0);
const boltMat=new THREE.MeshBasicMaterial({color:0xd9ffff,depthWrite:false});
const auraMat=new THREE.MeshBasicMaterial({
  color:0x26aaff,transparent:true,opacity:.36,blending:THREE.AdditiveBlending,depthWrite:false
});
const trailMat=new THREE.MeshBasicMaterial({
  color:0x3cbbff,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false
});
const burstMat=new THREE.MeshBasicMaterial({
  color:0x9beeff,transparent:true,opacity:.87,blending:THREE.AdditiveBlending,
  depthWrite:false,side:THREE.DoubleSide
});
const sparkMat=new THREE.MeshBasicMaterial({
  color:0x7abfff,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false
});
const UP=new THREE.Vector3(0,1,0);
const blasts=[];
const bolts=[];
const raycaster=new THREE.Raycaster();
let lastShot=-Infinity;
let installed=false;

function spellBolt(scene,origin,destination,camera) {
  const start=origin.clone(),end=destination.clone();
  const length=start.distanceTo(end);
  const dir=end.clone().sub(start).normalize();
  const group=new THREE.Group();
  group.position.copy(start);
  const core=new THREE.Mesh(boltGeo,boltMat);
  core.scale.set(.065,.065,.21);
  core.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),dir);
  const aura=new THREE.Mesh(boltGeo,auraMat);
  aura.scale.set(.145,.145,.28);
  aura.quaternion.copy(core.quaternion);
  const trail=new THREE.Mesh(trailGeo,trailMat);
  trail.quaternion.setFromUnitVectors(UP,dir);
  trail.scale.y=1.25;
  trail.position.copy(dir).multiplyScalar(-.52);
  group.add(core,aura,trail);scene.add(group);
  bolts.push({
    group,start,end,dir,age:0,duration:Math.max(.10,Math.min(.75,length/105)),
    onImpact:()=>impact(scene,end,camera)
  });
}

function impact(scene,point,camera) {
  const group=new THREE.Group();
  group.position.copy(point);
  const ring=new THREE.Mesh(burstGeo,burstMat);
  ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),
    camera.position.clone().sub(point).normalize());
  group.add(ring);
  for(let i=0;i<8;i++) {
    const spark=new THREE.Mesh(sparkGeo,sparkMat);
    const theta=i*Math.PI/4,phi=.2+.3*Math.sin(i*5);
    spark.userData.velocity=new THREE.Vector3(
      Math.cos(theta)*Math.cos(phi),Math.sin(phi),Math.sin(theta)*Math.cos(phi)
    ).multiplyScalar(4+(i%3)*1.4);
    group.add(spark);
  }
  scene.add(group);blasts.push({group,ring,age:0,life:.28});
}

export function setupShootingEvents(camera,scene,hand,environment=[],surface=null,isPlaying=()=>false) {
  if(installed) return {update,reset};
  installed=true;
  function handle(event) {
    if(event.button!==0 || !isPlaying()) return;
    const now=performance.now();
    if(now-lastShot<135)return;  // maximum ~7 casts/second
    lastShot=now;
    const forward=new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.normalize();
    // Fall back to a stable camera-space palm position if the hand GLB fails.
    const start=camera.localToWorld(new THREE.Vector3(.24,-.22,-.72));
    const roots=new Set(getEnemyHitboxes());
    raycaster.set(camera.position,forward);
    raycaster.near=0;
    raycaster.far=125;
    const hits=raycaster.intersectObjects([...roots,...environment],true);
    let end=camera.position.clone().addScaledVector(forward,90);
    if(hits.length){
      const hit=hits[0];
      end=hit.point.clone();
      let hitObject=hit.object;
      while (hitObject && !roots.has(hitObject)) hitObject=hitObject.parent;
      if(hitObject){
        const damage=hit.object.userData.weakPoint?80:36;
        if(damageEnemy(scene,hitObject,damage))window.dispatchEvent(new Event('enzo:enemy-hit'));
      }
    }
    // Hit registration and projectiles must not depend on a cosmetic asset.
    spellBolt(scene,start,end,camera);
  }
  window.addEventListener('mousedown',handle);
  return {update,reset};
}

function update(delta) {
  const dt=Math.min(.05,delta);
  for(let i=bolts.length-1;i>=0;i--){
    const bolt=bolts[i];
    bolt.age+=dt;
    const t=Math.min(1,bolt.age/bolt.duration);
    bolt.group.position.lerpVectors(bolt.start,bolt.end,t);
    bolt.group.scale.setScalar(.85+Math.sin(t*Math.PI)*.22);
    if(t>=1){
      bolt.onImpact();
      bolt.group.parent?.remove(bolt.group);
      bolts.splice(i,1);
    }
  }
  for(let i=blasts.length-1;i>=0;i--){
    const flash=blasts[i];flash.age+=dt;
    const t=Math.min(1,flash.age/flash.life);
    flash.ring.scale.setScalar(.3+t*3.8);
    for(let j=1;j<flash.group.children.length;j++){
      const spark=flash.group.children[j];
      spark.position.copy(spark.userData.velocity).multiplyScalar(flash.age);
      spark.scale.setScalar(1-t);
    }
    if(t>=1){flash.group.parent?.remove(flash.group);blasts.splice(i,1);}
  }
}
function reset() {
  for(const p of bolts)p.group.parent?.remove(p.group);
  for(const p of blasts)p.group.parent?.remove(p.group);
  bolts.length=0;blasts.length=0;lastShot=-Infinity;
}
