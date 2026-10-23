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
    color:0x7f90a8,
    map:gloveTexture,
    bumpMap:gloveTexture,
    bumpScale:.0016,
    metalness:.08,roughness:.78,
    clearcoat:.12,clearcoatRoughness:.78,
    envMapIntensity:.86,
    side:THREE.DoubleSide,
    depthTest:true,depthWrite:true,
    skinning:true
  });
  const cyan=new THREE.MeshBasicMaterial({
    color:0x69d9ff,transparent:true,opacity:.75,
    blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false
  });
  const energy=new THREE.MeshBasicMaterial({
    color:0xb4faff,transparent:true,opacity:.92,
    blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false
  });
  const pulseMaterial=cyan.clone();
  pulseMaterial.opacity=0;

  const fx=new THREE.Group();
  fx.name='Palm sigil / not a finger mesh';
  rig.add(fx);

  const rune=new THREE.Mesh(new THREE.RingGeometry(.076,.083,56),cyan);
  rune.position.set(-.105,.185,-.38);
  rune.rotation.x=-.20;
  rune.renderOrder=910;
  fx.add(rune);
  const rune2=new THREE.Mesh(new THREE.TorusGeometry(.046,.0035,6,44),energy);
  rune2.position.set(-.105,.185,-.384);
  rune2.rotation.x=-.20;
  rune2.renderOrder=911;
  fx.add(rune2);
  const symbol=new THREE.Mesh(new THREE.RingGeometry(.025,.029,4),energy);
  symbol.position.set(-.105,.185,-.39);
  symbol.rotation.set(0,0,Math.PI/4);
  symbol.renderOrder=912;
  fx.add(symbol);
  const halo=new THREE.Mesh(new THREE.RingGeometry(.07,.10,56),pulseMaterial);
  halo.position.copy(rune.position);
  halo.position.z-=.006;
  halo.renderOrder=912;
  fx.add(halo);

  // The wrist stays naturally attached to the skinned mesh. No giant
  // floating cuff ring that competes with the real anatomical model.

  const castLight=new THREE.PointLight(0x4abfff,0,.95,2);
  castLight.position.set(-.105,.185,-.39);
  rig.add(castLight);

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
    rune.rotation.z=time*.53;
    rune2.rotation.z=-time*1.15;
    symbol.rotation.z=Math.PI/4+time*.8;
    rune.scale.setScalar(1+impulse*.85);
    halo.scale.setScalar(.3+impulse*3.3);
    pulseMaterial.opacity=impulse*.46;
    castLight.intensity=impulse*1.9;
    const quiet=.68+.08*Math.sin(time*3.1);
    cyan.opacity=Math.min(.98,quiet+impulse*.3);
    energy.opacity=Math.min(1,.83+impulse*.18);
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
    castLight.intensity=0;pulseMaterial.opacity=0;
  }

  return {
    rig,ready,cast,update,muzzlePosition,reset,
    isReady:()=>loaded
  };
}
