/* Moonfall illustrated frame animation: 7 independent characters x 5 action states x 6
   DISTINCT prebaked RGBA frames. Poses are digitally generated from source character art,
   not independently hand-drawn. Action cues select walking, attack, cast, and hurt frames. */
(()=>{'use strict';
 const canvas=document.getElementById('sceneWorld');
 const backgroundCanvas=document.getElementById('sceneBackground');
 const atmosphereCanvas=document.getElementById('sceneAtmosphere');
 const ctx=canvas?.getContext('2d',{alpha:true,desynchronized:true});
 const backgroundCtx=backgroundCanvas?.getContext('2d',{alpha:false});
 const atmosphereCtx=atmosphereCanvas?.getContext('2d',{alpha:true});
 if(!ctx||!backgroundCtx||!atmosphereCtx){
  window.MoonfallScene={render(){},cue(){},reset(){},getStats(){return {mode:'unavailable',actors:0}}};return;
 }
 const W=1600,H=800,TAU=Math.PI*2;
 const background=new Image();background.decoding='async';background.src='assets/backdrop2.webp?v=moonfall-clean-sprites-1';
 const actors=new Image();actors.decoding='async';actors.src='assets/characters.webp?v=moonfall-clean-sprites-1';
 const frameAtlases=[new Image(),new Image()];
 frameAtlases.forEach(image=>image.decoding='async');
 frameAtlases[0].src='assets/frames-allies.webp?v=moonfall-clean-sprites-1';
 frameAtlases[1].src='assets/frames-enemies.webp?v=moonfall-clean-sprites-1';

 // Clean foreground-only silhouettes traced from the real character illustrations.
 // The source atlases contain leftover castle pixels. These contours remove those
 // pixels at render time, without adding another large texture download.
 const encodedCutouts=["AgfrAAgB6QAKAekAEwHsABYB7AAbAfAAHgHxABgBXZ4ARAChAEYAmQBLAJYAUACXAFMAkwBYAJsAWwCiAFoApABUAKcAWACnAGIAogBrAJEAfgCEAIIAcwB/AHIAeQB0AHYAcgB1AGwAfABmAHwAYACBAGMAhwBWAJUAVgCbAFkAnwBTAKQAVACpAFEArwBOAMEAVQDHAFcAwwBdAMIAXgDEAFkAyQBTANgAUwDdAFcA4gBMAOYASwDtAEgA8QBRAPIAUwD2AFoA9gBkAO4AaQDuAGsA8wB4APAAfQD9AIgACAGHAA0BiQAPAYYAEgGIACEBmwAoAZ8ALQGmACwBqgAoAaoAJQGyACYBuQAsAcEALAHDAC4ByQAuAcwAJgHVACcB2AArAd0AKgHiACUB2wDhANwAzADZAMMA3AC1ANYApgDWAJ0A2QCaANoAkQDPAIgAzACCANAAfADQAHYAzQBwANMAaQDTAGAA0ABZAMgAUgDCAE8AvABPALsATAC9AEkAuQBIALYAQwCvAEYArABDAA==","AV6pAFUAnQBXAJIAXQCMAGQAjgByAIgAdgCAAHUAewB5AHoAgQB/AIoAeACNAHkAkQByAJoAcwCfAG8ArABnALQAZgC4AGoAvABmAMQAYQDGAF4AywBSANUAUQDmAE0A6gBMAPAARgD1AD0AAgE3AA4BNwAXAUAAIgFEACMBRQAoAUkAKAFSAC8BXwAuAWcANQFzADgBdgAnAXoAJwF8ACsBhAAsAYYALgGAADoBggA+AZAAPAGQADMBlgApAZsAKQGjAC8BqAAvAawAKwGrACcBrgAlAbYAJwG5ADABwwAwAcUAKAHHACsB0QArAdMAKQHTACQB1gAjAdwAJQHhACsB4QA2AeUAMwHoACwB6AAfAeQAGwHdAAIB3gD8ANkA+ADSAOQA0gDgANgA3ADYANYA2gDUANIAygDSAMIA3QCyANoAsQDYALQAywC0AMgAsADEAKEAxQCSAL8AiwDCAIQAuQB/ALkAegDBAHIAwgBnALsAWgC1AFoA","AVeVAFIAhwBYAHsAYwB5AGoAegB0AHIAdQBwAHcAcgB8AGgAeABlAHoAaAB+AGYAggB6AIIAdgCHAHcAkQBxAJwAegCfAG8AogBkAKgAWwCwAFcAuABYAMEAYgDGAFsA0ABbANYAXwDZAGAA4gBkAOUAaADlAGwA6QBlAPIAZQD4AGgA/ABYAAcBXgAKAV4AEgFiABYBYgAaAWoAIwF1ACsBhAAtAYcAMwGJADEBkAAxAZUANgGhADYBoQAtAaMAKQGzAB4BtwAfAcAAGAHEABkByQAMAdMAFQHRABwB1QAaAdYADwHQAP4A1wD5ANkA8wDRAOUA0QDgAMwA3gDJANYAygDMAMcAxwDJAMMAwQCwAMEArADFAKcAvwCjAMQAlwDBAJIAvACPAL4AiwC8AIYAvAB7AMAAdwC6AGMAvQBeALoAWwC1AFsAswBVAK8AVwCrAFQAqABYAJ4AUwA=","AVeYAGAAlABlAIwAZQCNAGoAhgBsAIkAcACHAHQAhwB9AIIAfwB6AH4AeQCDAHsAhgB5AIgAdgCGAHIAiwB1AI8AcwCVAHgAmwB9AJoAggCeAH8AoQB+AKcAeACsAHoAsQByALkAbgC4AGoAvwBqAMIAbgDEAHYAwQB2AMgAcwDLAHAA2ABhAPEAYQD1AFgAAQFUAAIBTgAIAUgAFAFJABgBUgAfAVEAJgFZAC8BXQAtAV0AKAFhACUBZAAnAWMALgFxADcBdgA1AXcAJgF9ACgBgQAtAYcALgGMACYBkAAmAZUALAGeACwBogAkAagAJQGrACkBtwAoAboAKwHCACsBxgAlAcwAJwHSACUByQD6AMIA6wC/ANcAugDRALwAyQC1AL0AtgC2ALQAswC0AKsAsQCnALIAowCuAKEAsgCUALIAjACuAIgAqQCHAKoAgwCzAHoAsgBvAKsAZgA=","AgW0ADkBtgA7Ab8AOgG9ADYBtwA2AUuuAGYAqABmAJgAcACWAH0AmACMAJUAjgCUAJYAkQCYAJEAnwCLAKMAiwCmAJIAqgCSAK4AjAC1AIYAyACDAMMAfQDGAH0A1gB7ANgAfQDfAEYAKgFHAC0BTAApAVkAFQF7AOkAhQDsAIMA8QCMAPsAjQALAYsADQGJABwBkgAhAZgAHwGjACQBqgAiAa8AJwG2ACcBugAkAb0AJwHFACYByAApAdIAKQHWACIB2QAiAd0AHgHhAB4B4wAiAeIAKgHlACsB7AAnAfUAHAH2ABIB6wD9AOsA+gDzAPQA8wDtAOEA1gDgANAA2ADMANUAxwDZAMIA1QC/ANEAtQDVALIA3ACzAN0AsADUAKUA1QChAMwAmgDKAIgAvwCDAMEAgQDAAHsAuwB2ALkAbQA=","AVykADYAogA5AKIAQACdAEMAmQA/AJcAQACYAEQAkABIAIMAWACCAGUAegBpAIMAbACGAHcAjwCCAHwAjwBzAI8AbgCTAGQAlQBYAJsAUwChAFwAtABeALUAZgCwAGkAsQBgAL4AWgDCAF8AxQBfAM8AZADXAE4A4gBQAOYARwDuAEsA8ABJAPQASQD9AEsAAgFVAAkBYgAcAWYAHAF3AC4BewAqAYMANAGJADgBjgA0Aa8ANAGxADYBtwA0AboANwHAADUBwwA5AckANAHOADgB2AAwAfsAKgH7ACcB8wAbAfgAGQH9ABMB/gACAfwA/QAEAfUABAHrAAkB5QAOAeUAEwHfABMB2AAQAdAAAAG8AP0AvAD6ALcA9wC3AO8AsADrAK8A6QCqAOoAngDmAJYA3wCQANkAkADWAI0A0ACMAMQAfwDKAHIAzABhAMcAVQC+AEsAwwBAALkARQC0AEIAtAA9AK4AQgCmADwApgA3AA==","AVh0AFwAbABmAGwAcQBoAHYAbAB2AG0AegBiAIQAYgCPAF4AmwBjAKQAXQCxAFkAtQBTANAAUwDcAFcA3wBbAN4AXgDiAFcA7QBPAAEBUAAFAVUA/QBaAP8AVwALAVcAFwFQACMBWwAqAWIANQFqADUBcQAqAXcALgF7ACwBfgAoAX4AJAGHACEBiQAnAY4AKgGVACoBmgAkAZ4AJAGkACcBqQAuAawALgG0ACgBvwAmAcUAHgHHACIBzwAoAdkAKAHhAB4B7gAdAfQAJwH6ACcBAQEbAQEBEgH+AA8B/gAKAQcBAgENAfkADQH1ABQB8wAUAekADwHgAAsB3QAMAdkAAgHSAAIByQD9AMUA8ADDAOcAtwDqALYA7gC4AO8AtgDsALMA5wCzAN4ArwDRAKUA0AChAMkAmwDJAJYAxACTAL8AiwDCAIUAwQCDALcAfQCnAHgAlQBcAIkAVQCBAFoA"];
 function unpackCutout(b64){
  const bytes=atob(b64);let p=0;const rings=[],n=bytes.charCodeAt(p++);
  for(let i=0;i<n;i++){
   const ring=[],count=bytes.charCodeAt(p++);
   for(let j=0;j<count;j++){
    const x=bytes.charCodeAt(p++)|bytes.charCodeAt(p++)<<8;
    const y=bytes.charCodeAt(p++)|bytes.charCodeAt(p++)<<8;
    ring.push([x,y]);
   }
   rings.push(ring);
  }
  return rings;
 }
 const cutouts=encodedCutouts.map(unpackCutout);
 function clipActor(i,pose,left,top,w,h){
  const f=pose.frame,state=pose.state,u=f/5,wave=Math.sin(2*Math.PI*f/6);
  ctx.beginPath();
  for(const ring of cutouts[i]){
   for(let j=0;j<ring.length;j++){
    const [x,y]=ring[j],torso=clamp((235-y)/165,0,1),
       legs=clamp((y-176)/125,0,1),
       hair=clamp((192-y)/153,0,1)*clamp((150-x)/88,0,1),
       right=clamp((x-152)/90,0,1)*clamp((y-115)/75,0,1)*clamp((240-y)/60,0,1),
       leftArm=clamp((152-x)/90,0,1)*clamp((y-112)/70,0,1)*clamp((248-y)/70,0,1),
       dress=clamp((y-185)/135,0,1);
    let dx=0,dy=0;
    if(state==='idle'){
     dx=.55*wave*torso+1.8*Math.sin(f*.60+y*.039+i*.7)*hair+1.1*Math.sin(f*.69+y*.045)*dress;
     dy=-.65*Math.sin(f*.56)*torso;
    }else if(state==='walk'){
     dx=2.4*wave*torso+4*Math.sin(f*.82+y*.037+i*.4)*hair
        +6.4*wave*legs*Math.tanh((x-150)/23)+4.5*Math.sin(f*1.13+i*.3)*dress;
     dy=-3*Math.abs(wave)*(1-legs*.4)+1.7*Math.sin(f*2.2)*legs;
    }else if(state==='attack'){
     const shift=[-9,-14,2,27,16,0][f];
     dx=shift+[-9,-13,0,12,7,0][f]*torso
        +(f===2||f===3?8:f===1?-4:0)*right
        -3.3*Math.sin(y*.06+f*1.1)*hair-shift*.30*dress;
     dy=(f===1||f===2?-2:f===3?-5:1)*torso;
    }else if(state==='cast'){
     dy=[0,-3,-7,-10,-7,-1][f]*(1-legs*.65);
     dx=3.3*Math.sin(f*.74+y*.043)*hair+7*Math.sin(Math.PI*u)*right
        -4*Math.sin(Math.PI*u)*leftArm+4.8*Math.sin(f*.85+y*.057)*dress;
    }else if(state==='hurt'){
     dx=[0,-10,-22,-13,-6,0][f]+[-1,-5,-13,-7,-4,0][f]*torso
        +4*Math.sin(f*1.7+y*.06)*dress;
     dy=[0,2,7,5,2,0][f]*(1-legs*.6);
    }
    const px=left+(x+dx)*w/300,py=top+(y+dy)*h/320;
    if(j===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
   }
   ctx.closePath();
  }
  ctx.clip('evenodd');
 }
 const ACTION_NAMES=['idle','walk','attack','cast','hurt'];
 const FRAME_COUNT=6,FRAME_W=300,FRAME_H=320;
 const currentClips=Array(7).fill('idle'),currentFrames=Array(7).fill(0),actorOffsets=Array(7).fill(0);
 // All geometry uses one 1600x800 world space shared with the HUD.
 const positions=[220,380,540,700,1060,1220,1380];
 const sizes=[235,232,225,222,232,239,236];
 const actorGround=[443,443,444,443,443,443,443];
 // Per-character artwork landmarks: normalized hand/weapon positions within each cutout.
 const castingLandmarks=[[.73,.44],[.74,.42],[.70,.38],[.70,.42],[.27,.43],[.28,.40],[.26,.46]];
 const impactPhase={strike:.56,bolt:.57,area:.55,defend:.52,heal:.52,enemy:.56,burn:.46};
 const palette={strike:'#bbafff',bolt:'#9dc9ff',area:'#ff708c',defend:'#eed6a5',heal:'#9cf7c4',enemy:'#f19ca4',burn:'#ffb46f'};
 const leaves=Array.from({length:29},(_,i)=>({x:(i*181+29)%W,y:(i*113+31)%730,seed:i*.87+1,speed:9+i%5*4,radius:2+i%4}));
 const embers=Array.from({length:27},(_,i)=>({x:(i*197+93)%W,y:(i*67+15)%365,seed:i*1.43,speed:12+i%8*3}));
 const previous=Array(7).fill(null),hits=Array(7).fill(0);
 const hitStops=Array(7).fill(0);
 let cues=[],frames=0,activeCueCount=0,lastCue=null,nowClock=0;
 let backgroundDirty=true,backgroundPaints=0,atmosphereFrames=0;
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
 function ready(img){return img.complete&&img.naturalWidth>0}
 function clamp(v,min,max){return Math.min(max,Math.max(min,v))}
 function smooth(x){x=clamp(x,0,1);return x*x*(3-2*x)}
 function particle(x,y,r,color,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,Math.max(.1,r),0,TAU);ctx.fill();ctx.restore()}
 function shimmer(x,y,r,color,alpha=1){
  const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');
  ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
 }
 function cue(e){
  if(!e||!['strike','bolt','area','defend','heal','enemy','burn'].includes(e.kind))return;
  const source=Number.isInteger(e.source)&&e.source>=0&&e.source<=6?e.source:(e.kind==='enemy'?4:1);
  const target=Number.isInteger(e.target)&&e.target>=0&&e.target<=6?e.target:(e.kind==='heal'?0:4);
  const event={kind:e.kind,source,target,start:performance.now()+clamp(Number(e.delay)||0,0,7000),duration:reduced?480:e.kind==='area'?1750:e.kind==='enemy'?1650:e.kind==='defend'||e.kind==='heal'?1800:1550,color:palette[e.kind],impact:impactPhase[e.kind]};
  event.impactAt=event.start+event.duration*event.impact;
  cues.push(event);cues=cues.slice(-24);lastCue=event.kind;
  return {impactAt:event.impactAt,endsAt:event.start+event.duration,kind:event.kind};
 }
 function reset(){cues=[];hits.fill(0);hitStops.fill(0);previous.fill(null);lastCue=null;activeCueCount=0;currentClips.fill('idle');currentFrames.fill(0);actorOffsets.fill(0)}
 // Actions visibly move characters through space rather than barely warping one still image.
 function actorMove(i,now){
  let dx=0,dy=0,roll=0,flash=0,reach=0;
  for(const e of cues){
   const p=(now-e.start)/e.duration;
   if(p<0||p>=1)continue;
   const actualStrike=['strike','enemy'].includes(e.kind);
   if(e.source===i){
    if(actualStrike){
     // A distinct anticipation pose, forward dash, moment of contact, and full retreat.
     const approach=smooth((p-.12)/.31)*(1-smooth((p-.64)/.30));
     const direction=e.kind==='enemy'?-1:1;
     const distance=Math.min(178,Math.abs(positions[e.target]-positions[i])*.33);
     dx+=direction*distance*approach;
     dy+=-16*Math.sin(Math.PI*clamp((p-.1)/.82,0,1));
     roll+=direction*.09*Math.sin(Math.PI*p);
     reach=Math.max(reach,approach);
    }else{
     // Spellcasting keeps the feet planted instead of levitating the whole sprite.
     dy+=-4*Math.sin(Math.PI*p);
     roll+=.018*Math.sin(Math.PI*p);
    }
   }
   if(e.target===i){
    if(['defend','heal'].includes(e.kind)){dy+=-7*Math.sin(Math.PI*p);continue;}
    if(p>=e.impact){
     const q=clamp((p-e.impact)/(1-e.impact),0,1),strength=Math.pow(1-q,1.5);
     const dir=i<4?-1:1;
     dx+=dir*(26*Math.sin(Math.PI*q)+10*Math.sin(q*35)*strength);
     roll+=dir*.13*Math.sin(Math.PI*q);
     dy+=4*Math.sin(Math.PI*q);
     flash=Math.max(flash,Math.max(0,1-q*2));
    }
   }
  }
  return {dx,dy,roll,flash,reach};
 }

 // Never animate, sway, or translate the architecture: painted only when
 // dimensions or the underlying image change.
 background.addEventListener('load',()=>{backgroundDirty=true});
 function paintFixedBackground(){
  backgroundCtx.setTransform(backgroundCanvas.width/W,0,0,backgroundCanvas.height/H,0,0);
  backgroundCtx.clearRect(0,0,W,H);
  if(ready(background)){
   // Give the painterly background the same cool nighttime palette as the actors.
   backgroundCtx.save();
   backgroundCtx.filter='saturate(.79) contrast(.95) brightness(.80)';
   backgroundCtx.drawImage(background,-10,-5,1620,810);
   backgroundCtx.restore();
  }else{
   const g=backgroundCtx.createLinearGradient(0,0,0,H);
   g.addColorStop(0,'#14203b');g.addColorStop(.62,'#3d3c56');
   g.addColorStop(1,'#090d19');
   backgroundCtx.fillStyle=g;backgroundCtx.fillRect(0,0,W,H);
  }
  // Static depth grade: keep the distant stone soft and the active ground readable.
  const depth=backgroundCtx.createLinearGradient(0,0,0,545);
  depth.addColorStop(0,'#08132858');depth.addColorStop(.48,'#141a2d12');
  depth.addColorStop(.76,'#201f3112');depth.addColorStop(1,'#070b17b0');
  backgroundCtx.fillStyle=depth;backgroundCtx.fillRect(0,0,W,545);
  const groundLight=backgroundCtx.createRadialGradient(W*.5,395,125,W*.5,395,710);
  groundLight.addColorStop(0,'#71809916');groundLight.addColorStop(.7,'#10152407');
  groundLight.addColorStop(1,'#07091b91');backgroundCtx.fillStyle=groundLight;
  backgroundCtx.fillRect(0,0,W,550);
  backgroundDirty=false;backgroundPaints++;
 }
 // A distinct transparent layer for environmental movement. This never draws
 // onto the architecture or touches actor transforms.
 function paintAtmosphere(t){
  const ac=atmosphereCtx;
  ac.setTransform(atmosphereCanvas.width/W,0,0,atmosphereCanvas.height/H,0,0);
  ac.clearRect(0,0,W,H);
  for(let j=0;j<2;j++){
   const yy=155+j*185;
   for(let i=0;i<5;i++){
    const x=((i*380+(reduced?0:t*(j?7:-5)))%1880+1880)%1880-120;
    const g=ac.createRadialGradient(x,yy,3,x,yy,245);
    g.addColorStop(0,j?'#a1a5ce13':'#b9c8e119');
    g.addColorStop(1,'#d6def000');
    ac.fillStyle=g;ac.fillRect(x-245,yy-135,490,270);
   }
  }
  if(!reduced)for(const x of [187,815,1274]){
   const flick=.61+.13*Math.sin(t*7+x)+.09*Math.sin(t*12.3+x*.15);
   const yy=271+(x===187?-34:0),r=41;
   const g=ac.createRadialGradient(x,yy,0,x,yy,r);
   g.addColorStop(0,'#ffa44c');g.addColorStop(1,'#ffa44c00');
   ac.save();ac.globalAlpha=flick*.18;
   ac.fillStyle=g;ac.fillRect(x-r,yy-r,r*2,r*2);ac.restore();
  }
  atmosphereFrames++;
 }
 function syncCanvasSizes(){
  const ratio=Math.min(2,Math.max(1,window.devicePixelRatio||1));
  const cw=Math.min(3200,Math.max(1,Math.round(canvas.clientWidth*ratio)));
  const ch=Math.min(1600,Math.max(1,Math.round(canvas.clientHeight*ratio)));
  for(const layer of [backgroundCanvas,atmosphereCanvas,canvas]){
   if(layer.width!==cw||layer.height!==ch){
    layer.width=cw;layer.height=ch;
    if(layer===backgroundCanvas)backgroundDirty=true;
   }
  }
  ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
 }

 function poseFor(i,now,alive){
  if(!alive)return {state:'hurt',frame:5};
  for(let j=cues.length-1;j>=0;j--){
   const e=cues[j],p=(now-e.start)/e.duration;
   if(p<0||p>=1)continue;
   if(e.target===i && !['heal','defend'].includes(e.kind) && p>=e.impact){
    return {state:'hurt',frame:Math.min(5,Math.floor(((p-e.impact)/(1-e.impact))*6))};
   }
   if(e.source!==i)continue;
   if(e.kind==='enemy'||e.kind==='strike'){
    if(p<.23)return {state:'walk',frame:Math.min(5,Math.floor(p/.23*6))};
    if(p<.76)return {state:'attack',frame:Math.min(5,Math.floor((p-.23)/.53*6))};
    return {state:'walk',frame:5-Math.min(5,Math.floor((p-.76)/.24*6))};
   }
   return {state:'cast',frame:Math.min(5,Math.floor(p*6))};
  }
  // Idle never spontaneously shows an attack or cast; only game events change action.
  return {state:'idle',frame:Math.floor(now/170+i*1.3)%FRAME_COUNT};
 }
 function drawActor(i,t,hp,selected,now){
  const x=positions[i],h=sizes[i],w=300/320*h,alive=hp>0;
  const phase=t*1.52+i*1.11;
  const breath=alive&&!reduced?Math.sin(phase)*.004:0;
  const bob=alive&&!reduced?Math.sin(phase)*1.1:0;
  const tilt=alive&&!reduced?Math.sin(t*.9+i*1.47)*.006:0;
  const pose=poseFor(i,now,alive);
  currentClips[i]=pose.state;currentFrames[i]=pose.frame;
  const move=actorMove(i,now),base=actorGround[i]+bob+move.dy;actorOffsets[i]=Math.round(move.dx);
  // Ground contact is fixed to the battle plane; only the shadow's X follows lunges.
  const footX=x+move.dx,footY=actorGround[i]+3;
  const shadowWidth=w*(.39+(move.reach*.07));
  ctx.save();
  ctx.translate(footX,footY);
  ctx.scale(1,Math.max(.72,1+move.dy*.008));
  const shadow=ctx.createRadialGradient(0,0,2,0,0,shadowWidth);
  shadow.addColorStop(0,'#03040ac9');shadow.addColorStop(.58,'#06071079');shadow.addColorStop(1,'#03060e00');
  ctx.fillStyle=shadow;ctx.fillRect(-shadowWidth,-17,shadowWidth*2,34);
  ctx.restore();
  if(selected&&alive){
   ctx.save();ctx.globalAlpha=.6+.20*Math.sin(t*2.6+i);
   ctx.beginPath();ctx.ellipse(footX,footY,w*.43,9,0,0,TAU);ctx.fillStyle=i<4?'#9debc83d':'#f6a9ad3d';ctx.fill();
   ctx.strokeStyle='#ffe4b0';ctx.lineWidth=1.6;ctx.stroke();ctx.restore();
  }
  ctx.save();ctx.translate(x+move.dx,base-h*.06);ctx.rotate(tilt+move.roll);
  ctx.scale(1+breath*.25+move.reach*.02,1-breath*.35+move.reach*.015);
  const top=-h*.94,left=-w/2;
  const sheet=frameAtlases[i<4?0:1];
  if(ready(sheet)){
   ctx.filter='saturate(.86) contrast(1.06) brightness(.95)';
   ctx.globalAlpha=alive?1:.32;
   if(hits[i]>0){ctx.shadowColor=i<4?'#9cfff1':'#ff9ba7';ctx.shadowBlur=hits[i]*28}
   const localIndex=i<4?i:i-4;
   const row=(localIndex*ACTION_NAMES.length+ACTION_NAMES.indexOf(pose.state))*FRAME_H;
   const col=pose.frame*FRAME_W;
   ctx.save();clipActor(i,pose,left,top,w,h);
   ctx.drawImage(sheet,col,row,FRAME_W,FRAME_H,left,top,w,h);ctx.restore();
   ctx.globalAlpha=1;
  }else if(ready(actors)){
   // Initial-load fallback only. Normal combat draws a separately pre-rendered frame.
   ctx.filter='saturate(.86) contrast(1.06) brightness(.95)';
   ctx.globalAlpha=alive?1:.32;
   ctx.save();clipActor(i,{state:'idle',frame:0},left,top,w,h);
   ctx.drawImage(actors,i*300,0,300,320,left,top,w,h);ctx.restore();
   ctx.globalAlpha=1;
  }else{ctx.fillStyle='#787490';ctx.beginPath();ctx.ellipse(0,-h*.5,w*.22,h*.44,0,0,TAU);ctx.fill()}
  ctx.filter='none';
  if(move.flash>0){ctx.globalCompositeOperation='screen';ctx.globalAlpha=move.flash*.62;ctx.fillStyle=i<4?'#d4fff4':'#ffb7c0';ctx.fillRect(left,top,w,h);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1}
  ctx.restore();
  hits[i]=Math.max(0,hits[i]-.05);
 }
 // Casting points follow the moving actor, not the static stage or target centre.
 function castOrigin(i,now){
  const h=sizes[i],w=h*300/320,[u,v]=castingLandmarks[i],motion=actorMove(i,now);
  return {x:positions[i]+motion.dx+(u-.5)*w,y:actorGround[i]+motion.dy-h*(1-v)};
 }
 function drawSpells(now){
  activeCueCount=0;
  cues=cues.filter(e=>now<e.start+e.duration);
  for(const e of cues){
   const p=(now-e.start)/e.duration;
   if(p<0||p>=1)continue;
   activeCueCount++;
   const from=castOrigin(e.source,now),tx=positions[e.target],ty=actorGround[e.target]-sizes[e.target]*.49;
   const alpha=Math.sin(Math.PI*p),hit=p>=e.impact;
   const charge=smooth((p-.07)/.24)*(1-smooth((p-.34)/.15));
   if(!reduced && charge>0){
    shimmer(from.x,from.y,40+18*charge,e.color,charge*.34);
    ctx.save();ctx.globalAlpha=charge*.85;ctx.strokeStyle=e.color;ctx.lineWidth=2.5;
    ctx.beginPath();ctx.arc(from.x,from.y,10+23*charge,0,TAU);ctx.stroke();ctx.restore();
    for(let a=0;a<7;a++){
     const angle=TAU*a/7+now*.002;
     particle(from.x+Math.cos(angle)*(24-12*charge),from.y+Math.sin(angle)*(24-12*charge),2.3,e.color,charge);
    }
   }
   if(e.kind==='defend'||e.kind==='heal'){
    if(p<.32)continue;
    const count=e.kind==='defend'?4:1;
    for(let k=0;k<count;k++){
     const id=e.kind==='defend'?k:e.target,dest=positions[id],cy=actorGround[id]-sizes[id]*.52;
     const sweep=smooth((p-.28)/.42),r=30+47*sweep;
     const fade=1-smooth((p-.76)/.24);
     ctx.save();ctx.globalAlpha=fade*.65;ctx.lineWidth=e.kind==='defend'?3.2:2.5;ctx.strokeStyle=e.color;
     ctx.beginPath();ctx.ellipse(dest,cy,r,r*.85,0,0,TAU);ctx.stroke();ctx.restore();
     shimmer(dest,cy,r*1.2,e.color,fade*.14);
     for(let n=0;n<9;n++){
      const angle=TAU*n/9+p*4+k;
      particle(dest+Math.cos(angle)*r,cy+Math.sin(angle)*r*.8,2,e.color,fade*.85);
     }
    }
    continue;
   }
   if(e.kind==='burn'){
    if(!hit)continue;
    const q=clamp((p-e.impact)/(1-e.impact),0,1),r=16+72*smooth(q);
    shimmer(tx,ty,r,e.color,(1-q)*.35);
    for(let n=0;n<13;n++){
     const a=TAU*n/13;
     particle(tx+Math.cos(a)*r,ty+Math.sin(a)*r*.7,2.5,e.color,1-q);
    }
    continue;
   }
   if(e.kind==='area'){
    if(!hit)continue;
    const q=clamp((p-e.impact)/(1-e.impact),0,1),radius=24+130*smooth(q/.58);
    ctx.save();ctx.globalAlpha=(1-smooth(q))*.8;ctx.lineWidth=4;ctx.strokeStyle=e.color;
    ctx.beginPath();ctx.ellipse(tx,ty,radius,radius*.55,0,0,TAU);ctx.stroke();ctx.restore();
    shimmer(tx,ty,radius*.75,e.color,(1-q)*.24);
    for(let n=0;n<16;n++){
     const a=TAU*n/16+q*.8;
     particle(tx+Math.cos(a)*radius,ty+Math.sin(a)*radius*.55,3,e.color,(1-q)*.9);
    }
    continue;
   }
   // Release follows anticipation; projectile completes exactly at the gameplay impact event.
   const release=.36,flight=clamp((p-release)/(e.impact-release),0,1);
   if(p>=release && p<=e.impact){
    const u=smooth(flight),x=from.x+(tx-from.x)*u,y=from.y+(ty-from.y)*u-72*Math.sin(Math.PI*u);
    ctx.save();ctx.globalAlpha=Math.min(1,(1-flight)*5)*.94;ctx.strokeStyle=e.color;
    ctx.lineWidth=e.kind==='strike'||e.kind==='enemy'?10:6;
    ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x-(tx-from.x)*.045,y+13);ctx.lineTo(x+16,y-15);ctx.stroke();ctx.restore();
    shimmer(x,y,41,e.color,.3);particle(x,y,6,e.color,.95);
    if(!reduced)for(let n=0;n<3;n++)particle(x-(tx-from.x)*(.016+n*.009),y+7+n*3,3-n*.6,e.color,.7);
   }
   if(hit){
    const q=clamp((p-e.impact)/(1-e.impact),0,1),r=9+119*smooth(q/.46);
    ctx.save();ctx.globalAlpha=(1-smooth(q))*.82;ctx.strokeStyle=e.color;ctx.lineWidth=Math.max(.8,6*(1-q));
    ctx.beginPath();ctx.ellipse(tx,ty,r,r*.62,-.25,0,TAU);ctx.stroke();ctx.restore();
    shimmer(tx,ty,r*.76,e.color,(1-q)*.21);
    for(let n=0;n<18;n++){
     const a=TAU*n/18+n*.17;
     particle(tx+Math.cos(a)*r,ty+Math.sin(a)*r*.62,3.5,e.color,1-q);
    }
   }
  }
 }
 function foreground(t){
  const fog=ctx.createLinearGradient(0,427,0,595);
  fog.addColorStop(0,'#8c9bcd00');fog.addColorStop(.42,'#82849f13');fog.addColorStop(1,'#090d2029');ctx.fillStyle=fog;ctx.fillRect(0,427,W,168);
  for(const p of leaves){
   const x=(p.x+t*p.speed+Math.sin(t*.63+p.seed)*24)%W;
   const y=((p.y+(reduced?0:t*p.speed*.59))%780);
   if(y<58)continue;
   ctx.save();ctx.translate(x,y);ctx.rotate(t*(reduced?0:.45)+p.seed);ctx.globalAlpha=.22+.29*Math.sin(t+p.seed)**2;
   ctx.fillStyle=p.seed%2?'#f16b80':'#b54b6a';const r=p.radius;
   ctx.beginPath();ctx.moveTo(0,-r*1.5);ctx.lineTo(r,0);ctx.lineTo(0,r*1.2);ctx.lineTo(-r,0);ctx.closePath();ctx.fill();ctx.restore();
  }
  if(!reduced)for(const p of embers){
   const x=p.x+Math.sin(t*1.1+p.seed)*17,y=405-((p.y+t*p.speed)%330);
   if(y>60){shimmer(x,y,5,'#ffa75d',.12);particle(x,y,1.2,'#ffbc74',.27)}
  }
  const vignette=ctx.createRadialGradient(W*.5,H*.42,180,W*.5,H*.42,960);
  vignette.addColorStop(0,'#070a1700');vignette.addColorStop(1,'#0406138c');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
 }
 function render(now,game){
  syncCanvasSizes();
  if(backgroundDirty)paintFixedBackground();
  const t=now/1000;
  paintAtmosphere(t);
  ctx.clearRect(0,0,W,H);
  const hps=[...game.allies.map(a=>a.hp),...game.foes.map(f=>f.hp)];
  hps.forEach((hp,i)=>{if(previous[i]!==null&&hp<previous[i])hits[i]=1;previous[i]=hp});
  for(let i=0;i<7;i++){
   const alive=hps[i]>0,selected=i<4?game.selectedAlly===i:game.selectedEnemy===i-4;
   drawActor(i,t,hps[i],selected,now);
  }
  drawSpells(now);foreground(t);frames++;nowClock=now;
 }
 window.MoonfallScene={render,cue,reset,getStats(){return {mode:'layered-2.5D',actors:7,backgroundLoaded:ready(background),backgroundFixed:true,backgroundPaints,atmosphereFrames,layerCount:4,spritesLoaded:ready(actors),frames,activeEffects:activeCueCount,lastCue,reducedMotion:reduced,atlasLoaded:frameAtlases.map(ready),framesPerAction:FRAME_COUNT,cutouts:cutouts.length,cutoutMode:'foreground-only animated silhouettes',actionNames:ACTION_NAMES,animationStates:[...currentClips],frameIndices:[...currentFrames],actorOffsets:[...actorOffsets],castAnchors:castingLandmarks.map((_,i)=>castOrigin(i,nowClock)),ground:actorGround.slice()}}};
})();
