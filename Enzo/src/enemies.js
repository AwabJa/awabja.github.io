import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

/*
 * Shattered Reach sentinels:
 * - Scout: light cyan fins, fast approach
 * - Sentinel: armored crimson core, steady pressure
 * - Brute: broad dark-metal body, slow and tough
 * - Support drone: violet ring, flanks and circles
 * The root is the registered raycast body; the luminous exposed eye
 * is tagged as a weak point for the spell projectile system.
 */
export const enemies = [];
export const shootableObjects = [];

const ROLES = [
  {name:'scout',scale:.74,health:75,speed:5.2,glow:0x4bdfff,armor:0x303c50,range:6,damage:8},
  {name:'sentinel',scale:1,health:150,speed:3.3,glow:0xff4767,armor:0x242837,range:4,damage:12},
  {name:'brute',scale:1.45,health:295,speed:1.7,glow:0xff8c47,armor:0x34333e,range:4.7,damage:19},
  {name:'support',scale:.87,health:110,speed:3.6,glow:0xbb68ff,armor:0x343148,range:11,damage:10}
];
const roamLimit=79;
const tmpForward=new THREE.Vector3();

function disposeEnemy(scene, enemyData) {
  const enemy=enemyData.object;
  scene.remove(enemy);
  enemy.traverse(child => {
    if(child.geometry)child.geometry.dispose();
    if(child.material){
      const materials=Array.isArray(child.material)?child.material:[child.material];
      for(const mat of materials)mat.dispose();
    }
  });
  const index=shootableObjects.indexOf(enemy);
  if(index>=0)shootableObjects.splice(index,1);
}

function createArmourPiece(root,geometry,material,x,y,z,rotation=null) {
  const piece=new THREE.Mesh(geometry,material);
  piece.position.set(x,y,z);
  if(rotation)piece.rotation.set(...rotation);
  root.add(piece);
  return piece;
}

let nextId=0;
export function createEnemy(scene, position, roleName) {
  const role=ROLES.find(x=>x.name===roleName)||ROLES[nextId%ROLES.length];
  nextId++;
  const armor=new THREE.MeshStandardMaterial({
    color:role.armor,metalness:.79,roughness:.38,flatShading:true,
    emissive:0x10131e,emissiveIntensity:.25
  });
  const steel=new THREE.MeshStandardMaterial({
    color:0x68738b,metalness:.87,roughness:.29,flatShading:true
  });
  const obsidian=new THREE.MeshStandardMaterial({
    color:0x121927,metalness:.67,roughness:.45,flatShading:true
  });
  const glow=new THREE.MeshStandardMaterial({
    color:role.glow,emissive:role.glow,emissiveIntensity:2.8,
    metalness:.20,roughness:.14
  });
  const aura=new THREE.MeshBasicMaterial({
    color:role.glow,transparent:true,opacity:.63,
    side:THREE.DoubleSide,depthWrite:false
  });
  const shell=new THREE.Mesh(new THREE.IcosahedronGeometry(.78,1),armor);
  shell.name=role.name+' sentinel';
  shell.userData.role=role.name;
  shell.scale.setScalar(role.scale);
  const underShell=createArmourPiece(shell,new THREE.OctahedronGeometry(.71,1),obsidian,0,0,0);
  underShell.rotation.y=Math.PI/4;
  underShell.scale.set(.95,.95,.8);

  // Distinctive fractured armor and a bright front-facing weak point.
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2+.25;
    const x=Math.cos(a),y=Math.sin(a);
    const fin=createArmourPiece(shell,new THREE.ConeGeometry(.24,1.03,4),steel,
      x*1.01,y*1.01,-.16);
    fin.rotation.z=-a+Math.PI/2;
    fin.rotation.x=.15;
    const shard=createArmourPiece(shell,new THREE.OctahedronGeometry(.21,0),armor,x*.63,y*.63,.34);
    shard.scale.set(.65,1.5,.75);
  }
  if(role.name==='brute') {
    for(const dir of [-1,1]) {
      const shoulder=createArmourPiece(shell,new THREE.DodecahedronGeometry(.46,0),armor,dir*.95,-.15,0);
      shoulder.scale.set(1.3,.75,1.1);
    }
  }
  if(role.name==='support') {
    const arc=createArmourPiece(shell,new THREE.TorusGeometry(1.14,.045,6,40),aura,0,0,-.2);
    arc.name='Control ring';
    shell.userData.arc=arc;
  }
  if(role.name==='scout'){
    for(const dir of [-1,1]){
      const wing=createArmourPiece(shell,new THREE.ConeGeometry(.24,1.2,3),steel,dir*.93,.18,-.30);
      wing.rotation.z=dir*.49;
    }
  }
  const optic=createArmourPiece(shell,new THREE.SphereGeometry(.28,18,12),glow,0,.035,.815);
  optic.name='Exposed energy weakpoint';
  optic.userData.weakPoint=true;
  const reticle=createArmourPiece(shell,new THREE.TorusGeometry(.36,.035,6,30),aura,0,.035,.83);
  reticle.name='Targeting ring';
  const iris=createArmourPiece(shell,new THREE.SphereGeometry(.11,12,8),obsidian,0,.035,1.07);
  iris.name='Pupil';
  if(role.name==='brute')reticle.scale.setScalar(1.16);

  // Lighting stays on the emissive eye material. Avoid one PointLight per enemy.
  const spawn=position.clone();
  spawn.y=2.25+role.scale*.35;
  shell.position.copy(spawn);
  shell.castShadow=true;
  scene.add(shell);
  shootableObjects.push(shell);
  enemies.push({
    object:shell,role,optic,reticle,eyeMaterial:glow,
    baseColor:new THREE.Color(role.armor),health:role.health,
    phase:nextId*.91,patrolAngle:Math.random()*Math.PI*2,
    patrolTime:1+Math.random()*3,
    strafe:nextId%2?1:-1,
    speed:role.speed, isMarkedForRemoval:false,
    isHighlighted:false,highlightTime:0
  });
  return shell;
}
export function spawnEnemyGroup(scene,groupCenter,groupSize=1) {
  for(let i=0;i<groupSize;i++) {
    const pos=groupCenter.clone().add(new THREE.Vector3(
      THREE.MathUtils.randFloat(-4,4),0,THREE.MathUtils.randFloat(-4,4)));
    createEnemy(scene,pos);
  }
}
export function spawnMultipleEnemyGroups(scene,playerSpawnPosition,safeDistance=30) {
  for(let i=0;i<2;i++){
    const a=Math.random()*Math.PI*2,dist=Math.max(safeDistance,32)+i*11;
    const pos=new THREE.Vector3(Math.cos(a)*dist,0,Math.sin(a)*dist);
    spawnEnemyGroup(scene,pos);
  }
}
export function updateEnemies(scene,delta,playerPosition) {
  const dt=Math.min(.05,Math.max(0,delta));
  for(let i=enemies.length-1;i>=0;i--){
    const data=enemies[i];
    if(data.isMarkedForRemoval) {
      enemies.splice(i,1);
      disposeEnemy(scene,data);
      continue;
    }
    const enemy=data.object, role=data.role;
    tmpForward.copy(playerPosition).sub(enemy.position);
    tmpForward.y=0;
    const distance=tmpForward.length();
    const dir=distance>.001?tmpForward.divideScalar(distance):tmpForward.set(0,0,1);
    const dx=dir.x,dz=dir.z;
    let vx=0,vz=0;

    if(distance<43) {
      // A hovering tactical chase: ranged roles keep distance and strafe.
      const approach=distance>role.range+1?1:distance<role.range-1?-.48:0;
      vx=dx*role.speed*approach + (-dz)*role.speed*.29*data.strafe;
      vz=dz*role.speed*approach + dx*role.speed*.29*data.strafe;
      if(role.name==='brute'){vx=dx*role.speed;vz=dz*role.speed;}
    }else{
      data.patrolTime-=dt;
      if(data.patrolTime<=0){
        data.patrolAngle=Math.random()*Math.PI*2;
        data.patrolTime=1.8+Math.random()*2.3;
      }
      vx=Math.cos(data.patrolAngle)*role.speed*.45;
      vz=Math.sin(data.patrolAngle)*role.speed*.45;
    }
    enemy.position.x=THREE.MathUtils.clamp(enemy.position.x+vx*dt,-roamLimit,roamLimit);
    enemy.position.z=THREE.MathUtils.clamp(enemy.position.z+vz*dt,-roamLimit,roamLimit);
    data.phase+=dt*(1+role.speed*.12);
    enemy.position.y=2.25+role.scale*.35+Math.sin(data.phase*1.9)*.19;
    if(distance<85){
      const targetAngle=Math.atan2(dx,dz);
      const turn=Math.atan2(Math.sin(targetAngle-enemy.rotation.y),Math.cos(targetAngle-enemy.rotation.y));
      enemy.rotation.y+=turn*Math.min(1,dt*3.5);
    }
    data.reticle.rotation.z+=dt*(role.name==='support'?2.3:.55);
    data.eyeMaterial.emissiveIntensity=2.55+Math.sin(data.phase*2.7)*.6;
    if(enemy.userData.arc)enemy.userData.arc.rotation.z+=dt*.8;
    if(data.isHighlighted){
      data.highlightTime-=dt;
      if(data.highlightTime<=0){
        enemy.material.color.copy(data.baseColor);
        data.isHighlighted=false;
      }
    }
  }
}
export function damageEnemy(scene,enemy,amount) {
  const data=enemies.find(e=>e.object===enemy);
  if(!data||data.isMarkedForRemoval)return false;
  data.health=Math.max(0,data.health-amount);
  data.isHighlighted=true;
  data.highlightTime=.13;
  enemy.material.color.set(0xa5ffff);
  if(data.health===0){
    window.dispatchEvent(new Event('enzo:elimination'));
    removeEnemy(scene,data);
  }
  return true;
}
export function removeEnemy(scene,data) {
  if(!data||data.isMarkedForRemoval)return;
  data.isMarkedForRemoval=true;
  const index=shootableObjects.indexOf(data.object);
  if(index>=0)shootableObjects.splice(index,1);
}
export function getEnemyHitboxes() {
  return enemies.filter(e=>!e.isMarkedForRemoval).map(e=>e.object);
}
export function initializeEnemies(scene,count) {
  for(let i=0;i<count;i++){
    const a=(i/count)*Math.PI*2+(Math.random()-.5)*.35;
    const radius=26+(i%5)*6;
    const position=new THREE.Vector3(Math.cos(a)*radius,0,Math.sin(a)*radius);
    createEnemy(scene,position);
  }
}
export function clearEnemies(scene) {
  for(const enemy of enemies)disposeEnemy(scene,enemy);
  enemies.length=0;
  shootableObjects.length=0;
}
