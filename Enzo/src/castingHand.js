import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

/**
 * ENZO / The Shattered Reach — FIRST-PERSON HAND 2.0
 *
 * An actual authored, weight-painted, 8,120-vertex, 16-bone right-hand GLB
 * (CC0, Innerscene / MakeHuman). No cylinders, boxes, or generated fingers.
 * We retarget the original finger bones for cast -> follow-through -> recovery.
 * Wrist inertia, gaze lag and landing weight are spring-damped secondary
 * animation, not a physics solver that modifies camera aiming or collisions.
 *
 * The model is owned by the game locally, with provenance in
 * ../assets/models/RIGHT-HAND-LICENSE.md.
 */
const MODEL_URL = new URL('../assets/models/anatomical-right-hand.glb', import.meta.url).href;
const HAND_NAMES = ['hand_r','index_01_r','index_02_r','index_03_r',
  'middle_01_r','middle_02_r','middle_03_r','ring_01_r',
  'ring_02_r','ring_03_r','pinky_01_r','pinky_02_r',
  'pinky_03_r','thumb_01_r','thumb_02_r','thumb_03_r'];

const Y_AXIS = new THREE.Vector3(0,1,0);
const BEND_AXIS = new THREE.Vector3(0,0,1);
const Z_AXIS=new THREE.Vector3(0,0,1);
const BASE={x:.43,y:-.44,z:-.77,rx:-.12,ry:.02,rz:-.18};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smoothstep=(a,b,v)=>{const x=clamp((v-a)/(b-a),0,1);return x*x*(3-2*x)};
const springState=()=>({p:0,v:0});
// Exact critically damped secondary-motion springs: frame-rate independent,
// stable through low-FPS spikes, with authoritative aim/collision unaffected.
function settle(s,target,omega,dt){
  const d=s.p-target,j=(s.v+omega*d)*dt,decay=Math.exp(-omega*dt);
  s.p=target+(d+j)*decay;
  s.v=(s.v-omega*j)*decay;
}

function makeFabric() {
  // Deterministic, baked micro-grain texture. This is a fabric material,
  // not fake anatomy; the hand silhouette comes exclusively from the GLB.
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Unable to prepare gauntlet material');
  const pixels=ctx.createImageData(512,512);
  let seed=0x5a17c3;
  function random() {
    seed ^=seed<<13;seed ^=seed>>>17;seed ^=seed<<5;
    return (seed>>>0)/4294967296;
  }
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    const k=(y*512+x)*4;
    const weave=Math.sin(x*2.8+y*.64)*4.2+Math.sin(y*2.3-x*.42)*3.0;
    const thread=((x+y)%7===0?5:0);
    const noise=(random()-.5)*17;
    const shade=Math.max(28,Math.min(150,80+weave+thread+noise));
    pixels.data[k]=Math.round(shade*.57);
    pixels.data[k+1]=Math.round(shade*.71);
    pixels.data[k+2]=Math.round(shade*.87);
    pixels.data[k+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  const tex=new THREE.CanvasTexture(canvas);
  tex.encoding=THREE.sRGBEncoding;
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.anisotropy=4;
  return tex;
}

export function createCastingHand(camera) {
  const rig=new THREE.Group();
  rig.name='First-person anatomical right hand / CC0 skinned model';
  rig.position.set(BASE.x,BASE.y,BASE.z);
  rig.rotation.set(BASE.rx,BASE.ry,BASE.rz);
  camera.add(rig);

  const wrapper=new THREE.Group();
  wrapper.name='Anatomical model orientation';
  rig.add(wrapper);

  const gloveTexture=makeFabric();
  const leather=new THREE.MeshPhysicalMaterial({
    name:'Shattered Reach / armored graphite gauntlet',
    color:0x48505a,
    map:gloveTexture,
    bumpMap:gloveTexture,
    bumpScale:.0018,
    metalness:.22,roughness:.63,
    clearcoat:.22,clearcoatRoughness:.56,
    envMapIntensity:.35,
    side:THREE.DoubleSide,
    depthTest:true,depthWrite:true,
    skinning:true
  });
  // Casting energy is a short blue-white flash, never a permanent circular
  // HUD-like ring floating in front of the player's hand.
  const flareCanvas=document.createElement('canvas');
  flareCanvas.width=flareCanvas.height=64;
  const fctx=flareCanvas.getContext('2d');
  const radial=fctx.createRadialGradient(32,32,0,32,32,32);
  radial.addColorStop(0,'rgba(210,248,255,1)');
  radial.addColorStop(.14,'rgba(95,206,255,.9)');
  radial.addColorStop(.45,'rgba(34,120,255,.28)');
  radial.addColorStop(1,'rgba(27,105,255,0)');
  fctx.fillStyle=radial;
  fctx.fillRect(0,0,64,64);
  const flareMap=new THREE.CanvasTexture(flareCanvas);

  // The source anatomical asset ends at the wrist. Extend it into the camera
  // edge with a smoothly lofted, fabric-covered forearm sleeve (not fingers
  // built from cylinders or block meshes). The anatomical hand stays authored.
  const backAxis=new THREE.Vector3(.38,-.50,.78).normalize();
  const across=new THREE.Vector3().crossVectors(Y_AXIS,backAxis).normalize();
  const vertical=new THREE.Vector3().crossVectors(backAxis,across).normalize();
  const armVertices=[],armUV=[],armFaces=[];
  const sides=28,sections=20;
  for(let i=0;i<=sections;i++){
    const t=i/sections;
    const center=backAxis.clone().multiplyScalar(.12+.66*t);
    center.x+=.065*t*t;
    center.y-=.060*t*t;
    const radius=.105+.042*t;
    const ellipse=.94+.04*Math.sin(t*Math.PI);
    for(let j=0;j<=sides;j++){
      const a=j/sides*Math.PI*2;
      const point=center.clone()
        .addScaledVector(across,Math.cos(a)*radius)
        .addScaledVector(vertical,Math.sin(a)*radius*ellipse);
      armVertices.push(point.x,point.y,point.z);
      armUV.push(j/sides*1.5,t*2.6);
    }
  }
  for(let i=0;i<sections;i++)for(let j=0;j<sides;j++){
    const a=i*(sides+1)+j,b=a+1,c=(i+1)*(sides+1)+j,d=c+1;
    armFaces.push(a,b,c,b,d,c);
  }
  const sleeveGeometry=new THREE.BufferGeometry();
  sleeveGeometry.setAttribute('position',
    new THREE.Float32BufferAttribute(armVertices,3));
  sleeveGeometry.setAttribute('uv',
    new THREE.Float32BufferAttribute(armUV,2));
  sleeveGeometry.setIndex(armFaces);
  sleeveGeometry.computeVertexNormals();
  const sleeveFabric=new THREE.MeshPhysicalMaterial({
    color:0x414954,map:gloveTexture,bumpMap:gloveTexture,
    bumpScale:.0015,metalness:.025,roughness:.91,
    clearcoat:.02,clearcoatRoughness:.9,
    side:THREE.DoubleSide,depthTest:true,depthWrite:true
  });
  const sleeve=new THREE.Mesh(sleeveGeometry,sleeveFabric);
  sleeve.name='Continuous woven forearm sleeve';
  // Align to the *visible* skinned wrist cap, which is offset from the
  // exported skeleton's wrist joint. Overlap slightly for a natural seam.
  // Tuck the cloth sleeve directly behind the anatomical wrist opening.
  // It should enter from the camera edge, not hide fingers or float detached.
  sleeve.position.set(-.195,.035,0);
  sleeve.renderOrder=890;
  rig.add(sleeve);

  // Low-profile, contoured metallic inlays on the existing forearm sleeve.
  // No tubes/boxes as fingers, no new glowing circles around the wrist.
  const trimSteel=new THREE.MeshStandardMaterial({
    color:0x556677,metalness:.68,roughness:.37,envMapIntensity:.62
  });
  const insetRune=new THREE.MeshStandardMaterial({
    color:0x174259,metalness:.34,roughness:.42,
    emissive:0x0a4d78,emissiveIntensity:.24
  });
  for(const [i,angle] of [-.30,.12,.54].entries()){
    const path=[];
    for(let j=0;j<=13;j++){
      const t=.11+j/13*.76;
      const axis=backAxis.clone().multiplyScalar(.12+.66*t);
      axis.x+=.065*t*t;axis.y-=.060*t*t;
      const radius=.105+.042*t+.003;
      const wave=angle+.025*Math.sin(t*8+i*1.4);
      path.push(axis
        .addScaledVector(across,Math.cos(wave)*radius)
        .addScaledVector(vertical,Math.sin(wave)*radius*(.94+.04*Math.sin(t*Math.PI))));
    }
    const strip=new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path),36,
        i===1?.005:.0035,5,false),
      i===1?insetRune:trimSteel
    );
    strip.name=i===1?'Recessed arcane forearm channel':'Brushed metal seam';
    strip.renderOrder=891;
    sleeve.add(strip);
  }

  // Layered articulated armor follows the actual anatomical finger bones.
  // Each plate is parented to its finger segment so casting stays articulated.
  const armorSteel=new THREE.MeshPhysicalMaterial({
    color:0x283541,metalness:.78,roughness:.3,clearcoat:.24,
    clearcoatRoughness:.22,side:THREE.DoubleSide
  });
  const armorEdge=new THREE.MeshStandardMaterial({
    color:0x8398a8,metalness:.85,roughness:.26,side:THREE.DoubleSide
  });
  const armorGlow=new THREE.MeshStandardMaterial({
    color:0x135b87,emissive:0x168dcc,emissiveIntensity:.65,
    metalness:.42,roughness:.34
  });
  // Tapered, bevelled armor shells are fitted in each bone's LOCAL frame.
  // Unlike the old box plates, they follow the exported bone orientation.
  function sculptPlate(length,width){
    const shape=new THREE.Shape();
    shape.moveTo(-width*.37,0);
    shape.quadraticCurveTo(-width*.58,length*.16,-width*.45,length*.35);
    shape.lineTo(-width*.31,length*.87);
    shape.quadraticCurveTo(0,length*1.06,width*.31,length*.87);
    shape.lineTo(width*.45,length*.35);
    shape.quadraticCurveTo(width*.58,length*.16,width*.37,0);
    shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{
      depth:width*.19,bevelEnabled:true,bevelSegments:2,
      steps:1,bevelSize:width*.075,bevelThickness:width*.07,
      curveSegments:6
    });
    geo.computeVertexNormals();
    return geo;
  }
  function attachArmor(){
    for(const finger of ['index','middle','ring','pinky','thumb']){
      for(let segment=1;segment<=3;segment++){
        const bone=bones.get(finger+'_0'+segment+'_r');
        if(!bone)continue;
        const next=segment<3?bones.get(finger+'_0'+(segment+1)+'_r'):null;
        // Local bone direction is authoritative even for rotated GLB skeletons.
        const localEnd=next?bone.worldToLocal(
          next.getWorldPosition(new THREE.Vector3())):new THREE.Vector3(0,.035,0);
        const length=Math.max(.018,Math.min(.085,localEnd.length()*.8));
        const width=(finger==='thumb'?.027:.029)*(1-(segment-1)*.16);
        const plate=new THREE.Mesh(sculptPlate(length,width),armorSteel);
        plate.name=finger+' sculpted phalanx '+segment;
        plate.quaternion.setFromUnitVectors(
          new THREE.Vector3(0,1,0),localEnd.normalize());
        plate.position.set(0,0,width*.36);
        bone.add(plate);
        const seam=new THREE.Mesh(
          new THREE.TorusGeometry(width*.32,.0018,5,12,Math.PI),
          armorEdge
        );
        seam.position.set(0,length*.12,width*.58);
        plate.add(seam);
      }
    }
    // A contoured back-of-hand shell; avoid a flat rectangular crest.
    const wrist=bones.get('hand_r');
    if(wrist){
      const crest=new THREE.Mesh(sculptPlate(.13,.105),armorSteel);
      crest.name='Contoured dorsal gauntlet shell';
      crest.position.set(0,.065,.034);
      wrist.add(crest);
      const rune=new THREE.Mesh(
        new THREE.CapsuleGeometry(.004,.064,4,8),armorGlow);
      rune.position.set(0,.072,.025);
      crest.add(rune);
    }
  }

  // The pulse is placed relative to the loaded palm instead of an arbitrary
  // fixed HUD coordinate. It stays completely hidden between shots.
  const fx=new THREE.Group();
  fx.name='Short-lived palm energy flash';
  fx.visible=false;
  rig.add(fx);
  const flashMaterial=new THREE.SpriteMaterial({
    map:flareMap,color:0x70cdff,
    blending:THREE.AdditiveBlending,
    transparent:true,opacity:0,
    depthTest:true,depthWrite:false
  });
  const flash=new THREE.Sprite(flashMaterial);
  flash.scale.set(.15,.15,1);
  flash.renderOrder=920;
  fx.add(flash);
  // Tiny energy filaments: straight streaks, no floating circles or white
  // reticle. Visible only for the casting impulse and fading immediately.
  const streakCoords=[];
  for(let i=0;i<12;i++){
    const a=i*Math.PI*2/12+.17;
    const inner=.012+(i%3)*.003;
    const outer=.06+(i%4)*.009;
    streakCoords.push(
      Math.cos(a)*inner,Math.sin(a)*inner,0,
      Math.cos(a)*outer,Math.sin(a)*outer,-.015
    );
  }
  const streakGeo=new THREE.BufferGeometry();
  streakGeo.setAttribute('position',new THREE.Float32BufferAttribute(streakCoords,3));
  const streakMaterial=new THREE.LineBasicMaterial({
    color:0x58caff,transparent:true,opacity:0,
    blending:THREE.AdditiveBlending,depthTest:true,depthWrite:false
  });
  const streaks=new THREE.LineSegments(streakGeo,streakMaterial);
  streaks.renderOrder=919;
  fx.add(streaks);
  const castLight=new THREE.PointLight(0x2eaeff,0,1.25,2);
  fx.add(castLight);

  const bones=new Map();
  const bind=new Map();
  const curlQuaternion=new THREE.Quaternion();
  const fingerSprings=new Map();
  const secondary={
    lookX:springState(),lookY:springState(),lookRoll:springState(),
    side:springState(),height:springState(),tilt:springState(),
    pitch:springState(),kick:springState(),strike:springState()
  };
  const palmWrist=new THREE.Vector3(),palmIndex=new THREE.Vector3(),
    palmPinky=new THREE.Vector3(),palmMiddle=new THREE.Vector3();
  const palmAlong=new THREE.Vector3(),palmAcross=new THREE.Vector3(),
    palmNormal=new THREE.Vector3(),palmFacing=new THREE.Vector3();
  const palmCurrent=new THREE.Vector3(),rigQ=new THREE.Quaternion(),
    localNormal=new THREE.Vector3();
  let previousGrounded=true;
  const wristPosition=new THREE.Vector3();
  const fingerPosition=new THREE.Vector3();
  const desiredDirection=new THREE.Vector3(-.24,.28,-.93).normalize();
  const castOrigin=new THREE.Vector3(-.105,.16,-.44);

  // A common anatomical emitter for BOTH spell bolt and flash.
  // This avoids the former fingertip muzzle / back-of-hand FX mismatch.
  function palmWorldPosition(target){
    if(!loaded)return rig.localToWorld(target.copy(castOrigin));
    rig.updateMatrixWorld(true);
    bones.get('hand_r').getWorldPosition(palmWrist);
    bones.get('index_01_r').getWorldPosition(palmIndex);
    bones.get('pinky_01_r').getWorldPosition(palmPinky);
    bones.get('middle_01_r').getWorldPosition(palmMiddle);
    palmAlong.copy(palmMiddle).sub(palmWrist).normalize();
    palmAcross.copy(palmIndex).sub(palmPinky).normalize();
    palmNormal.crossVectors(palmAlong,palmAcross).normalize();
    camera.getWorldDirection(palmFacing).normalize();
    // Keep the visible palm surface toward the camera. The projectile still
    // travels outward along the exact center-screen aim vector.
    // The emission surface faces downward, not back toward the camera.
    const down=new THREE.Vector3(0,-1,0).applyQuaternion(camera.quaternion);
    if(palmNormal.dot(down)<0)palmNormal.negate();
    target.copy(palmIndex).add(palmPinky).multiplyScalar(.5)
      .lerp(palmWrist,.36)
      .addScaledVector(palmNormal,.043)
      .addScaledVector(palmFacing,.014);
    return target;
  }
  function alignPalmFx(){
    if(!loaded)return;
    palmWorldPosition(palmCurrent);
    fx.position.copy(rig.worldToLocal(palmCurrent.clone()));
    rig.getWorldQuaternion(rigQ);
    localNormal.copy(palmNormal).applyQuaternion(rigQ.invert());
    fx.quaternion.setFromUnitVectors(Z_AXIS,localNormal);
  }

  let time=0,shotTime=10,loaded=false;
  let defaultScale=1;

  const ready=new Promise((resolve,reject)=>{
    new GLTFLoader().load(MODEL_URL,gltf=>{
      try {
        const root=gltf.scene;
        if(!root)throw new Error('Anatomical hand mesh missing');
        let handMeshes=0;
        root.traverse(obj=>{
          if(obj.isSkinnedMesh) {
            handMeshes++;
            obj.material=leather;
            obj.material.skinning=true;
            obj.frustumCulled=false;
            obj.renderOrder=900;
            obj.castShadow=false;
            obj.receiveShadow=false;
          }
          if(obj.isBone&&HAND_NAMES.includes(obj.name)) {
            bones.set(obj.name,obj);
            bind.set(obj.name,obj.quaternion.clone());
            if(obj.name!=='hand_r')fingerSprings.set(obj.name,springState());
          }
        });
        if(!handMeshes||bones.size<13||!bones.has('hand_r')||
           !bones.has('middle_01_r'))
          throw new Error('The GLB is not the expected 16-bone right hand');

        // Calculate the actual bone forward axis rather than guessing which
        // Blender export orientation the file used.
        root.updateMatrixWorld(true);
        bones.get('hand_r').getWorldPosition(wristPosition);
        bones.get('middle_01_r').getWorldPosition(fingerPosition);
        const axis=fingerPosition.clone().sub(wristPosition).normalize();
        if(axis.lengthSq()<.01)throw new Error('Unusable anatomical hand rig');

        // A SkinnedMesh's unanimated geometry bounding box is NOT a reliable
        // location for posed/skinned geometry. The authored GLB has negative
        // scale on the skeleton root; using the geometry center pushed the
        // visible hand out of the camera frustum. Anchor to actual wrist bone.
        const tip=bones.get('middle_03_r').getWorldPosition(new THREE.Vector3());
        const dimension=tip.distanceTo(wristPosition);
        if(!Number.isFinite(dimension)||dimension<=.035)
          throw new Error('Anatomical hand bone span invalid');
        root.position.sub(wristPosition);
        // Roll the authored mesh around the finger axis so the PALM,
        // not the dorsal knuckles, reads in first-person view. Using the
        // same anatomical wrist-to-knuckle axis preserves the pose direction.
        const aimAlignment=new THREE.Quaternion()
          .setFromUnitVectors(axis,desiredDirection);
        const palmRoll=new THREE.Quaternion()
          .setFromAxisAngle(desiredDirection,-Math.PI*.18);
        wrapper.quaternion.copy(palmRoll.multiply(aimAlignment));
        defaultScale=Math.max(2,Math.min(5,.72/dimension));
        // Keep the hand at a restrained first-person scale, not an oversized close-up.
        wrapper.scale.setScalar(defaultScale*.70);
        wrapper.add(root);
        attachArmor();
        loaded=true;
        rig.updateMatrixWorld(true);
        // Recompute from the actual palm bones on every update.
        alignPalmFx();
        castLight.position.set(0,0,-.014);
        resolve({meshCount:handMeshes,bones:bones.size,dimension,
          wrist:[wristPosition.x,wristPosition.y,wristPosition.z],
          boneScale:defaultScale});
      }catch(error){
        reject(error);
      }
    },undefined,error=>reject(error));
  });

  function addLookImpulse(dx,dy){
    if(!loaded)return;
    // Mouse controls the aim directly; only the hand responds with inertia.
    secondary.lookX.v+=clamp(dx,-75,75)*-.031;
    secondary.lookY.v+=clamp(dy,-75,75)*.023;
    secondary.lookRoll.v+=clamp(dx,-75,75)*.055;
    secondary.lookX.v=clamp(secondary.lookX.v,-4,4);
    secondary.lookY.v=clamp(secondary.lookY.v,-3,3);
    secondary.lookRoll.v=clamp(secondary.lookRoll.v,-6,6);
  }

  function cast(){
    if(!loaded)return false;
    shotTime=0;
    // Impulse first affects the wrist; finger joints follow in sequence.
    secondary.kick.v+=3.75;
    secondary.strike.v+=5.8;
    return true;
  }

  function update(delta,movement=false,active=true){
    if(!active)return;
    const dt=clamp(delta,0,.05);
    time+=dt;
    shotTime+=dt;
    const state=movement&&typeof movement==='object'?movement:{
      moving:Boolean(movement),speed:movement?4:0,sprinting:false,
      grounded:true,strafe:0,forward:0,jumpHeight:0,verticalSpeed:0
    };
    const speed=clamp(state.speed||0,0,8);
    const locomotion=clamp(speed/7,0,1);
    const moving=speed>.4;
    const pacing=state.sprinting?11.8:8.3;
    const gait=Math.sin(time*pacing);
    const stride=Math.sin(time*pacing*2);
    const bob=moving?locomotion:0;

    // Landing is a delayed weight shift. No camera shake or altered aim.
    if(!previousGrounded&&state.grounded){
      secondary.height.v-=1.0;
      secondary.pitch.v+=.70;
    }
    if(previousGrounded&&!state.grounded)secondary.height.v+=.38;
    previousGrounded=Boolean(state.grounded);

    settle(secondary.lookX,0,16,dt);
    settle(secondary.lookY,0,17,dt);
    settle(secondary.lookRoll,0,15,dt);
    settle(secondary.side,clamp(state.strafe||0,-1,1)*-.018+gait*bob*.006,13,dt);
    settle(secondary.height,(moving?Math.abs(stride)*bob*.015:0)-
      (state.jumpHeight||0)*.018,13,dt);
    settle(secondary.tilt,clamp(state.strafe||0,-1,1)*-.046,11,dt);
    settle(secondary.pitch,(state.sprinting?-.06:0)+
      clamp(state.forward||0,-1,1)*-.025,12,dt);
    settle(secondary.kick,0,23,dt);
    settle(secondary.strike,0,28,dt);

    rig.position.set(
      BASE.x+secondary.side.p+secondary.lookX.p,
      BASE.y+secondary.height.p+secondary.lookY.p+
        (moving?gait*bob*.005:Math.sin(time*1.35)*.004),
      BASE.z-secondary.kick.p*.85-(state.sprinting&&moving?.055:0)
    );
    rig.rotation.set(
      BASE.rx+secondary.pitch.p-secondary.strike.p*.90-secondary.lookY.p*.8,
      BASE.ry+secondary.lookX.p*.9+Math.sin(time*.8)*.006,
      BASE.rz+secondary.tilt.p+secondary.lookRoll.p*.9+
        secondary.strike.p*.19
    );

    if(loaded){
      // Proximal finger joints lead; middle and distal joints follow later.
      // The open palm leads the energy release, then the fingers curl back.
      for(const [name,bone] of bones){
        if(name==='hand_r')continue;
        const finger=name.split('_')[0];
        const part=name.includes('_01_')?1:name.includes('_02_')?2:3;
        const delay=(part-1)*.017+(finger==='pinky'?.025:finger==='ring'?.015:0);
        const age=shotTime-delay;
        const open=age>=0?1-smoothstep(.015,.13,age):0;
        const follow=age>=0?
          smoothstep(.09,.17,age)*(1-smoothstep(.19,.34,age)):0;
        const strength=finger==='thumb'?.65:finger==='pinky'?.79:1;
        const joint=part===1?.59:part===2?.91:1.16;
        const target=(.12-open*.26+follow*.13+
          .014*Math.sin(time*1.4+part*.45))*strength*joint;
        const fingerSpring=fingerSprings.get(name);
        settle(fingerSpring,target,part===1?24:part===2?21:18,dt);
        curlQuaternion.setFromAxisAngle(BEND_AXIS,fingerSpring.p);
        bone.quaternion.copy(bind.get(name)).multiply(curlQuaternion);
      }
      // The muzzle and FX follow the current wrist/finger pose every frame.
      alignPalmFx();
    }

    const visible=loaded&&shotTime<.18;
    fx.visible=visible;
    if(visible){
      const u=clamp(shotTime/.18,0,1),brightness=Math.sin(u*Math.PI);
      flash.scale.setScalar(.12+u*.19);
      flashMaterial.opacity=.62*brightness;
      streaks.rotation.z+=dt*8;
      streaks.scale.setScalar(.60+u*.98);
      streakMaterial.opacity=.48*brightness;
      castLight.intensity=.95*brightness;
    }else{
      flashMaterial.opacity=0;
      streakMaterial.opacity=0;
      castLight.intensity=0;
    }
  }

  function muzzlePosition(){
    camera.updateMatrixWorld(true);
    const origin=palmWorldPosition(new THREE.Vector3());
    const forward=camera.getWorldDirection(new THREE.Vector3());
    return origin.addScaledVector(forward,.045);
  }

  function reset(){
    time=0;shotTime=10;previousGrounded=true;
    rig.position.set(BASE.x,BASE.y,BASE.z);
    rig.rotation.set(BASE.rx,BASE.ry,BASE.rz);
    for(const spring of Object.values(secondary)){spring.p=0;spring.v=0;}
    for(const spring of fingerSprings.values()){spring.p=0;spring.v=0;}
    for(const [name,bone] of bones)bone.quaternion.copy(bind.get(name));
    castLight.intensity=0;fx.visible=false;
    flashMaterial.opacity=0;streakMaterial.opacity=0;
    if(loaded)alignPalmFx();
  }

  return {
    rig,ready,cast,update,muzzlePosition,reset,addLookImpulse,
    isReady:()=>loaded
  };
}
