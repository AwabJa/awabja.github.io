import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

/**
 * ENZO / The Shattered Reach — FIRST-PERSON HAND 2.0
 *
 * An actual authored, weight-painted, 8,120-vertex, 16-bone right-hand GLB
 * (CC0, Innerscene / MakeHuman). No cylinders, boxes, or generated fingers.
 * We retarget the original finger bones for cast -> follow-through -> recovery.
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
  rig.position.set(.49,-.42,-.62);
  rig.rotation.set(-.13,.02,-.21);
  camera.add(rig);

  const wrapper=new THREE.Group();
  wrapper.name='Anatomical model orientation';
  rig.add(wrapper);

  const gloveTexture=makeFabric();
  const leather=new THREE.MeshPhysicalMaterial({
    name:'Shattered Reach / graphite woven glove',
    color:0x48505a,
    map:gloveTexture,
    bumpMap:gloveTexture,
    bumpScale:.0018,
    metalness:.03,roughness:.88,
    clearcoat:.04,clearcoatRoughness:.89,
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
  sleeve.position.set(-.08,-.065,.10);
  sleeve.renderOrder=890;
  rig.add(sleeve);

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
    depthTest:false,depthWrite:false
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
    blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false
  });
  const streaks=new THREE.LineSegments(streakGeo,streakMaterial);
  streaks.renderOrder=919;
  fx.add(streaks);
  const castLight=new THREE.PointLight(0x2eaeff,0,1.25,2);
  fx.add(castLight);

  const bones=new Map();
  const bind=new Map();
  const curlQuaternion=new THREE.Quaternion();
  const wristPosition=new THREE.Vector3();
  const fingerPosition=new THREE.Vector3();
  const desiredDirection=new THREE.Vector3(-.24,.28,-.93).normalize();
  const castOrigin=new THREE.Vector3(-.105,.16,-.44);

  let time=0,shotTime=10,loaded=false;
  let defaultScale=1,activeModel=null,distalBone=null;

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
        wrapper.quaternion.setFromUnitVectors(axis,desiredDirection);
        defaultScale=Math.max(2,Math.min(5,.72/dimension));
        wrapper.scale.setScalar(defaultScale);
        wrapper.add(root);
        activeModel=root;
        distalBone=bones.get('middle_03_r')||bones.get('middle_02_r');
        loaded=true;
        rig.updateMatrixWorld(true);
        // Anchor at the fingers' base rather than on the forearm.
        const palmWorld=bones.get('middle_01_r').getWorldPosition(new THREE.Vector3())
          .lerp(bones.get('middle_02_r').getWorldPosition(new THREE.Vector3()),.32);
        const normal=camera.getWorldDirection(new THREE.Vector3());
        palmWorld.addScaledVector(normal,-.035);
        fx.position.copy(rig.worldToLocal(palmWorld));
        castLight.position.set(0,0,-.018);
        resolve({meshCount:handMeshes,bones:bones.size,dimension,
          wrist:[wristPosition.x,wristPosition.y,wristPosition.z],
          boneScale:defaultScale});
      }catch(error){
        reject(error);
      }
    },undefined,error=>reject(error));
  });

  function cast(){
    shotTime=0;
    return loaded;
  }

  function update(delta,moving=false,active=true){
    if(!active)return;
    const dt=Math.max(0,Math.min(.06,delta));
    time+=dt;
    shotTime+=dt;
    const t=Math.max(0,Math.min(1,shotTime/.32));
    const impulse=Math.sin(Math.min(1,t)*Math.PI);
    const release=Math.max(0,1-shotTime/.11);
    const walk=moving?.016:.007;
    rig.position.set(
      .49-.048*impulse+Math.sin(time*(moving?7.7:2.2))*.006,
      -.42+Math.cos(time*(moving?9.0:2.6))*walk+.023*impulse,
      -.62-.14*impulse
    );
    rig.rotation.set(
      -.13-.22*impulse,
      .02+.09*impulse,
      -.21-.105*impulse+Math.sin(time*1.3)*.009
    );

    if(loaded) {
      // Bone-space finger rotations preserve skinning and original anatomy.
      // Release: fan open -> brief follow-through -> settle to curved rest.
      for(const [name,bone] of bones){
        if(name==='hand_r')continue;
        const factor=name.startsWith('thumb')?.70:
          name.startsWith('index')?.84:
          name.startsWith('middle')?1.0:
          name.startsWith('ring')?.88:.80;
        const segment=name.includes('_01_')?.57:name.includes('_02_')?.91:1.15;
        const spring=(Math.sin(time*1.45+factor*2)*.012);
        const curl=(.08+impulse*.24-release*.37+spring)*factor*segment;
        curlQuaternion.setFromAxisAngle(BEND_AXIS,curl);
        bone.quaternion.copy(bind.get(name)).multiply(curlQuaternion);
      }
    }
    const activeFlash=loaded&&shotTime<.22;
    fx.visible=activeFlash;
    if(activeFlash){
      const flashAge=Math.max(0,Math.min(1,shotTime/.22));
      const flicker=Math.sin(flashAge*Math.PI);
      flash.scale.setScalar(.10+flashAge*.24);
      flashMaterial.opacity=.72*flicker;
      streaks.rotation.z+=dt*9;
      streaks.scale.setScalar(.55+flashAge*1.6);
      streakMaterial.opacity=.68*flicker;
      castLight.intensity=1.35*flicker;
    }else{
      flashMaterial.opacity=0;
      streakMaterial.opacity=0;
      castLight.intensity=0;
    }
  }

  function muzzlePosition(){
    camera.updateMatrixWorld(true);
    if(loaded&&distalBone) {
      const point=distalBone.getWorldPosition(new THREE.Vector3());
      const forward=camera.getWorldDirection(new THREE.Vector3());
      return point.addScaledVector(forward,.075);
    }
    return rig.localToWorld(castOrigin.clone());
  }

  function reset(){
    time=0;shotTime=10;
    rig.position.set(.49,-.42,-.62);
    rig.rotation.set(-.13,.02,-.21);
    for(const [name,bone] of bones)bone.quaternion.copy(bind.get(name));
    castLight.intensity=0;
    fx.visible=false;
    flashMaterial.opacity=0;
    streakMaterial.opacity=0;
  }

  return {
    rig,ready,cast,update,muzzlePosition,reset,
    isReady:()=>loaded
  };
}
