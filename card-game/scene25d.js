/* Moonfall illustrated frame animation: 7 independent characters x 5 action states x 6
   DISTINCT prebaked RGBA frames. Poses are digitally generated from source character art,
   not independently hand-drawn. Action cues select walking, attack, cast, and hurt frames. */
(()=>{'use strict';
 const canvas=document.getElementById('sceneWorld');
 const ctx=canvas?.getContext('2d',{alpha:false,desynchronized:true});
 if(!ctx){window.MoonfallScene={render(){},cue(){},reset(){},getStats(){return {mode:'unavailable',actors:0}}};return}
 const W=1600,H=800,TAU=Math.PI*2;
 const background=new Image();background.decoding='async';background.src='assets/backdrop2.webp?v=moonfall-frames-1';
 const actors=new Image();actors.decoding='async';actors.src='assets/characters.webp?v=moonfall-frames-1';
 const frameAtlases=[new Image(),new Image()];
 frameAtlases.forEach(image=>image.decoding='async');
 frameAtlases[0].src='assets/frames-allies.webp?v=moonfall-frames-1';
 frameAtlases[1].src='assets/frames-enemies.webp?v=moonfall-frames-1';
 const ACTION_NAMES=['idle','walk','attack','cast','hurt'];
 const FRAME_COUNT=6,FRAME_W=300,FRAME_H=320;
 const currentClips=Array(7).fill('idle'),currentFrames=Array(7).fill(0);
 const positions=[137,344,548,724,1071,1261,1451];
 const sizes=[239,234,223,218,230,241,237];
 const palette={strike:'#bbafff',bolt:'#9dc9ff',area:'#ff708c',defend:'#eed6a5',heal:'#9cf7c4',enemy:'#f19ca4',burn:'#ffb46f'};
 const leaves=Array.from({length:29},(_,i)=>({x:(i*181+29)%W,y:(i*113+31)%730,seed:i*.87+1,speed:9+i%5*4,radius:2+i%4}));
 const embers=Array.from({length:27},(_,i)=>({x:(i*197+93)%W,y:(i*67+15)%365,seed:i*1.43,speed:12+i%8*3}));
 const previous=Array(7).fill(null),hits=Array(7).fill(0);
 let cues=[],frames=0,activeCueCount=0,lastCue=null,nowClock=0;
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
  const event={kind:e.kind,source,target,start:performance.now()+clamp(Number(e.delay)||0,0,1400),duration:e.kind==='area'?1150:850,color:palette[e.kind]};
  cues.push(event);cues=cues.slice(-24);lastCue=event.kind;
 }
 function reset(){cues=[];hits.fill(0);previous.fill(null);lastCue=null;activeCueCount=0;currentClips.fill('idle');currentFrames.fill(0)}
 function actorMove(i,now){
  let dx=0,dy=0,roll=0,flash=0,lunge=0;
  for(const e of cues){
   const p=(now-e.start)/e.duration;
   if(p<0||p>=1)continue;
   if(e.source===i){
    // Anticipation, fast lunge, then recovery back to the original position.
    const a=smooth(p/.20),b=smooth((p-.20)/.27),c=smooth((p-.53)/.38);
    const forward=e.kind==='enemy'?-1:1;
    lunge=forward*(a*(1-b)*18+b*(1-c)*37);
    dy-=Math.sin(Math.PI*clamp(p,0,1))*9;
    roll+=forward*Math.sin(Math.PI*p)*.046;
   }
   if(e.target===i){
    if(e.kind==='defend'||e.kind==='heal')dy-=Math.sin(Math.PI*p)*3;
    else if(p>.30){const q=(p-.30)/.7;dx+=Math.sin(q*33)*Math.pow(1-q,2)*11*(i<4?-1:1);roll+=Math.sin(q*26)*Math.pow(1-q,2)*.037;flash=Math.max(flash,Math.sin(Math.PI*clamp(q*2.6,0,1)))}
   }
  }
  return {dx:dx+lunge,dy,roll,flash};
 }
 function paintBackground(t){
  // Restrained, layered camera parallax; keep gameplay targets stationary.
  if(ready(background)){
   const sway=reduced?0:Math.sin(t*.15)*3;
   ctx.drawImage(background,-10+sway,-5,1620,810);
  }else{
   const g=ctx.createLinearGradient(0,0,0,H);
   g.addColorStop(0,'#14203b');g.addColorStop(.62,'#3d3c56');g.addColorStop(1,'#090d19');ctx.fillStyle=g;ctx.fillRect(0,0,W,H)
  }
  // Two translucent fog layers move at different speeds to suggest a deep courtyard.
  for(let j=0;j<2;j++){
   const yy=155+j*185;
   for(let i=0;i<5;i++){
    const x=((i*380+(reduced?0:t*(j?7:-5)))%1880+1880)%1880-120;
    const g=ctx.createRadialGradient(x,yy,3,x,yy,245);
    g.addColorStop(0,j?'#a1a5ce13':'#b9c8e119');g.addColorStop(1,'#d6def000');ctx.fillStyle=g;ctx.fillRect(x-245,yy-135,490,270);
   }
  }
  // Fire braziers in the illustration flicker on an independent layer.
  if(!reduced){for(const x of [187,815,1274]){
   const flick=.66+.18*Math.sin(t*7+x)+.12*Math.sin(t*12.3+x*.15);
   shimmer(x,271+(x===187?-34:0),41,'#ffa44c',flick*.28);
  }}
 }
 function poseFor(i,now,alive){
  if(!alive)return {state:'hurt',frame:5};
  for(let j=cues.length-1;j>=0;j--){
   const e=cues[j],p=(now-e.start)/e.duration;
   if(p<0||p>=1)continue;
   if(e.target===i && !['heal','defend'].includes(e.kind) && p>=.42){
    return {state:'hurt',frame:Math.min(5,Math.floor(((p-.42)/.58)*6))};
   }
   if(e.source!==i)continue;
   if(e.kind==='enemy'||e.kind==='strike'){
    if(p<.23)return {state:'walk',frame:Math.min(5,Math.floor(p/.23*6))};
    if(p<.76)return {state:'attack',frame:Math.min(5,Math.floor((p-.23)/.53*6))};
    return {state:'walk',frame:5-Math.min(5,Math.floor((p-.76)/.24*6))};
   }
   return {state:'cast',frame:Math.min(5,Math.floor(p*6))};
  }
  return {state:'idle',frame:Math.floor(now/220+i*1.3)%FRAME_COUNT};
 }
 function drawActor(i,t,hp,selected,now){
  const x=positions[i],h=sizes[i],w=300/320*h,alive=hp>0;
  const phase=t*1.52+i*1.11;
  const breath=alive&&!reduced?Math.sin(phase)*.008:0;
  const bob=alive&&!reduced?Math.sin(phase)*2.2+Math.sin(t*.47+i*2.1)*1.0:0;
  const tilt=alive&&!reduced?Math.sin(t*.9+i*1.47)*.009:0;
  const pose=poseFor(i,now,alive);
  currentClips[i]=pose.state;currentFrames[i]=pose.frame;
  const move=actorMove(i,now),base=442+bob+move.dy;
  // Contact shadows compress when a character lunges, lift when a character jumps.
  const shadow=ctx.createRadialGradient(x,445,3,x,445,w*.46);
  shadow.addColorStop(0,'#03060ea8');shadow.addColorStop(1,'#03060e00');ctx.fillStyle=shadow;ctx.fillRect(x-w/2,429,w,36);
  if(selected&&alive){
   ctx.save();ctx.globalAlpha=.6+.20*Math.sin(t*2.6+i);
   ctx.beginPath();ctx.ellipse(x,445,w*.44,10,0,0,TAU);ctx.fillStyle=i<4?'#9debc83d':'#f6a9ad3d';ctx.fill();
   ctx.strokeStyle='#ffe4b0';ctx.lineWidth=1.6;ctx.stroke();ctx.restore();
  }
  ctx.save();ctx.translate(x+move.dx,base-h*.06);ctx.rotate(tilt+move.roll);
  ctx.scale(1+breath*.35,1-breath);
  const top=-h*.94,left=-w/2;
  const sheet=frameAtlases[i<4?0:1];
  if(ready(sheet)){
   ctx.globalAlpha=alive?1:.32;
   if(hits[i]>0){ctx.shadowColor=i<4?'#9cfff1':'#ff9ba7';ctx.shadowBlur=hits[i]*28}
   const localIndex=i<4?i:i-4;
   const row=(localIndex*ACTION_NAMES.length+ACTION_NAMES.indexOf(pose.state))*FRAME_H;
   const col=pose.frame*FRAME_W;
   ctx.drawImage(sheet,col,row,FRAME_W,FRAME_H,left,top,w,h);
   ctx.globalAlpha=1;
  }else if(ready(actors)){
   // Initial-load fallback only. Normal combat draws a separately pre-rendered frame.
   ctx.globalAlpha=alive?1:.32;
   ctx.drawImage(actors,i*300,0,300,320,left,top,w,h);
   ctx.globalAlpha=1;
  }else{ctx.fillStyle='#787490';ctx.beginPath();ctx.ellipse(0,-h*.5,w*.22,h*.44,0,0,TAU);ctx.fill()}
  if(move.flash>0){ctx.globalCompositeOperation='screen';ctx.globalAlpha=move.flash*.24;ctx.fillStyle=i<4?'#d4fff4':'#ffb7c0';ctx.fillRect(left,top,w,h);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1}
  ctx.restore();
  hits[i]=Math.max(0,hits[i]-.05);
 }
 function drawSpells(now){
  activeCueCount=0;
  cues=cues.filter(e=>now<e.start+e.duration);
  for(const e of cues){
   const p=(now-e.start)/e.duration;
   if(p<0||p>=1)continue;
   activeCueCount++;
   const sx=positions[e.source],tx=positions[e.target],startY=323,endY=318;
   const alpha=Math.sin(Math.PI*p);
   if(e.kind==='defend'||e.kind==='heal'){
    for(let k=0;k<(e.kind==='defend'?4:1);k++){
     const dest=e.kind==='defend'?positions[k]:tx;
     const offset=.045*Math.sin(now*.009+k),r=31+44*smooth(p/.45);
     ctx.save();ctx.globalAlpha=alpha*.68;ctx.lineWidth=2.4;ctx.strokeStyle=e.color;
     ctx.beginPath();ctx.ellipse(dest,355,r,r*.87,offset,0,TAU);ctx.stroke();ctx.restore();
     shimmer(dest,360,r*1.2,e.color,alpha*.13);
     for(let j=0;j<7;j++){const a=TAU*j/7+p*4+k;particle(dest+Math.cos(a)*r,355+Math.sin(a)*r*.7,1.8,e.color,alpha)}
    }
    continue;
   }
   if(e.kind==='area'){
    const radius=20+260*smooth((p-.1)/.72);
    ctx.save();ctx.globalAlpha=alpha*.78;ctx.lineWidth=4;ctx.strokeStyle=e.color;
    ctx.beginPath();ctx.ellipse(1250,342,radius,radius*.25,0,0,TAU);ctx.stroke();ctx.restore();
    for(let j=0;j<17;j++){const a=j*2.4+p*5;particle(1250+Math.cos(a)*radius,342+Math.sin(a)*radius*.24,3.5,e.color,alpha*.75)}
    shimmer(1250,340,radius*.65,e.color,alpha*.18);continue;
   }
   const travel=smooth((p-.12)/.45),x=sx+(tx-sx)*travel,y=startY+(endY-startY)*travel-68*Math.sin(Math.PI*travel);
   if(p<.6){
    ctx.save();ctx.globalAlpha=Math.sin(Math.PI*travel)*.9;ctx.strokeStyle=e.color;ctx.lineWidth=e.kind==='strike'?7:5;
    ctx.beginPath();ctx.moveTo(x-(e.kind==='enemy'?-1:1)*39,y+18);ctx.lineTo(x+22,y-20);ctx.stroke();ctx.restore();
    shimmer(x,y,52,e.color,.38);particle(x,y,6,e.color,.9);
   }
   if(p>.47){
    const q=(p-.47)/.53,r=9+105*smooth(q/.42);
    ctx.save();ctx.globalAlpha=(1-smooth(q))*.75;ctx.strokeStyle=e.color;ctx.lineWidth=Math.max(1,6*(1-q));
    ctx.beginPath();ctx.ellipse(tx,334,r,r*.58,-.3,0,TAU);ctx.stroke();ctx.restore();
    shimmer(tx,330,r*.75,e.color,(1-q)*.18);
    for(let j=0;j<12;j++){const a=TAU*j/12+j*.2;particle(tx+Math.cos(a)*r,330+Math.sin(a)*r*.53,2.5,e.color,1-q)}
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
  const ratio=Math.min(2,Math.max(1,window.devicePixelRatio||1));
  const cw=Math.min(3200,Math.max(1,Math.round(canvas.clientWidth*ratio))),ch=Math.min(1600,Math.max(1,Math.round(canvas.clientHeight*ratio)));
  if(cw!==canvas.width||ch!==canvas.height){canvas.width=cw;canvas.height=ch}
  ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
  const t=now/1000;paintBackground(t);
  const hps=[...game.allies.map(a=>a.hp),...game.foes.map(f=>f.hp)];
  hps.forEach((hp,i)=>{if(previous[i]!==null&&hp<previous[i])hits[i]=1;previous[i]=hp});
  for(let i=0;i<7;i++){
   const alive=hps[i]>0,selected=i<4?game.selectedAlly===i:game.selectedEnemy===i-4;
   drawActor(i,t,hps[i],selected,now);
  }
  drawSpells(now);foreground(t);frames++;nowClock=now;
 }
 window.MoonfallScene={render,cue,reset,getStats(){return {mode:'layered-2.5D',actors:7,backgroundLoaded:ready(background),spritesLoaded:ready(actors),frames,activeEffects:activeCueCount,lastCue,reducedMotion:reduced,atlasLoaded:frameAtlases.map(ready),framesPerAction:FRAME_COUNT,actionNames:ACTION_NAMES,animationStates:[...currentClips],frameIndices:[...currentFrames]}}};
})();
