import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

// Arena movement — camera pitch must never push WASD movement into the sky.
// The jump offset is accumulated separately from the crouch/eye height.
export function setupMovement(camera) {
  const keys=new Set();
  const velocity=new THREE.Vector3();
  const forward=new THREE.Vector3(),right=new THREE.Vector3();
  const wanted=new THREE.Vector3(),temp=new THREE.Vector3();
  let height=1.7,vertical=0,jump=0,grounded=true;
  const speeds={walk:4.5,sprint:7.1,crouch:2.35};
  document.addEventListener('keydown', e=>{
    if(e.code==='Space' && document.pointerLockElement)e.preventDefault();
    keys.add(e.code);
  });
  document.addEventListener('keyup',e=>keys.delete(e.code));
  window.addEventListener('blur',()=>keys.clear());
  document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement)keys.clear();});

  const obstacleCenter=new THREE.Vector3();
  function updateMovement(delta, colliders=[]) {
    const dt=Math.min(.05,Math.max(0,delta));
    const crouch=keys.has('KeyC');
    const sprint=!crouch&&(keys.has('ShiftLeft')||keys.has('ShiftRight'));
    const speed=crouch?speeds.crouch:sprint?speeds.sprint:speeds.walk;
    const newHeight=crouch?1.07:1.7;
    height+=(newHeight-height)*Math.min(1,dt*11);

    camera.getWorldDirection(forward);
    forward.y=0;
    if(forward.lengthSq()<.0001)forward.set(0,0,-1);
    forward.normalize();
    right.crossVectors(forward,new THREE.Vector3(0,1,0)).normalize();

    const z=Number(keys.has('KeyW'))-Number(keys.has('KeyS'));
    const x=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
    wanted.copy(forward).multiplyScalar(z).addScaledVector(right,x);
    const moving=wanted.lengthSq()>.001;
    if(moving)wanted.normalize().multiplyScalar(speed);
    velocity.lerp(wanted,Math.min(1,dt*(moving?9:12)));

    camera.position.addScaledVector(velocity,dt);
    // Collide against actual stone pillar meshes (never the invisible sky/ground).
    for(const obstacle of colliders){
      const geo=obstacle.geometry;
      if(!geo || geo.type!=='BoxGeometry')continue;
      const dims=geo.parameters;
      obstacle.getWorldPosition(obstacleCenter);
      if(obstacleCenter.y-dims.height*.5>1.5)continue;
      const radius=Math.max(dims.width,dims.depth)*.52+.75;
      const dx=camera.position.x-obstacleCenter.x;
      const dz=camera.position.z-obstacleCenter.z;
      const dist=Math.hypot(dx,dz);
      if(dist<radius){
        const nx=dist>.001?dx/dist:1;
        const nz=dist>.001?dz/dist:0;
        camera.position.x=obstacleCenter.x+nx*radius;
        camera.position.z=obstacleCenter.z+nz*radius;
        velocity.multiplyScalar(.55);
      }
    }
    // Stay inside the playable arena; terrain props occupy its outer rim.
    const radial=Math.hypot(camera.position.x,camera.position.z);
    if(radial>77){
      const ratio=77/radial;
      camera.position.x*=ratio;camera.position.z*=ratio;
      velocity.multiplyScalar(.2);
    }

    if(grounded && keys.has('Space') && !crouch) {
      grounded=false;vertical=5.6;
    }
    if(!grounded){
      vertical-=13.5*dt;
      jump+=vertical*dt;
      if(jump<=0){jump=0;vertical=0;grounded=true;}
    }
    camera.position.y=height+jump;
    return {moving:velocity.lengthSq()>.35,sprinting:sprint,grounded};
  }
  function reset(){
    keys.clear();velocity.set(0,0,0);
    height=1.7;vertical=0;jump=0;grounded=true;
    camera.position.set(0,1.7,0);
  }
  return {updateMovement,reset};
}
