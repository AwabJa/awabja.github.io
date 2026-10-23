import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

// Arcane FPS movement: horizontal aim-relative locomotion, predictable jumping,
// acceleration/deceleration and clean input state across restarts/pause.
export function setupMovement(camera) {
  const keys=new Set();
  const velocity=new THREE.Vector3();
  const wish=new THREE.Vector3();
  const forward=new THREE.Vector3();
  const right=new THREE.Vector3();
  const worldUp=new THREE.Vector3(0,1,0);
  let currentHeight=1.7;
  let verticalSpeed=0;
  let onGround=true;
  let moving=false;
  const maxDelta=.05;

  const controlled=new Set([
    'KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','ShiftRight','KeyC'
  ]);
  const handleDown=event=>{
    if(!controlled.has(event.code))return;
    if(event.code==='Space')event.preventDefault();
    keys.add(event.code);
  };
  const handleUp=event=>keys.delete(event.code);
  document.addEventListener('keydown',handleDown,{passive:false});
  document.addEventListener('keyup',handleUp);
  window.addEventListener('blur',()=>keys.clear());

  function updateMovement(dt) {
    const delta=Math.min(maxDelta,Math.max(0,dt));
    const crouch=keys.has('KeyC');
    const sprint=!crouch&&(keys.has('ShiftLeft')||keys.has('ShiftRight'));
    const speed=crouch?2.15:sprint?8.2:5.25;
    const desiredHeight=crouch?1.05:1.7;
    currentHeight+= (desiredHeight-currentHeight)*Math.min(1,delta*13);

    camera.getWorldDirection(forward);
    forward.y=0;
    if(forward.lengthSq()<.001)forward.set(0,0,-1);
    else forward.normalize();
    right.crossVectors(forward,worldUp).normalize();
    wish.set(0,0,0);
    if(keys.has('KeyW'))wish.add(forward);
    if(keys.has('KeyS'))wish.sub(forward);
    if(keys.has('KeyD'))wish.add(right);
    if(keys.has('KeyA'))wish.sub(right);
    if(wish.lengthSq()>0)wish.normalize().multiplyScalar(speed);

    const easing=1-Math.exp(-(wish.lengthSq()>0?13:10)*delta);
    velocity.lerp(wish,easing);
    if(velocity.lengthSq()<.00001)velocity.set(0,0,0);
    moving=velocity.lengthSq()>.08;
    camera.position.x=THREE.MathUtils.clamp(camera.position.x+velocity.x*delta,-86,86);
    camera.position.z=THREE.MathUtils.clamp(camera.position.z+velocity.z*delta,-86,86);

    if(onGround && keys.has('Space') && !crouch) {
      verticalSpeed=7.0;
      onGround=false;
      keys.delete('Space');
    }
    if(!onGround) {
      verticalSpeed-=16.5*delta;
      camera.position.y+=verticalSpeed*delta;
      if(camera.position.y<=currentHeight) {
        camera.position.y=currentHeight;
        verticalSpeed=0;
        onGround=true;
      }
    }else{
      camera.position.y=THREE.MathUtils.lerp(camera.position.y,currentHeight,Math.min(1,delta*18));
    }
    const targetFov=sprint&&moving?79:74;
    const newFov=THREE.MathUtils.lerp(camera.fov,targetFov,Math.min(1,delta*8));
    if(Math.abs(camera.fov-newFov)>.002) {
      camera.fov=newFov;
      camera.updateProjectionMatrix();
    }
  }
  function reset() {
    keys.clear();velocity.set(0,0,0);wish.set(0,0,0);
    verticalSpeed=0;currentHeight=1.7;onGround=true;moving=false;
    camera.fov=74;camera.updateProjectionMatrix();
  }
  return {updateMovement,reset,isMoving:()=>moving};
}
