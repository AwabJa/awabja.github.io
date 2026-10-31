/* Moonfall 2.5D: layered illustration, independent character sprites and atmospheric depth.
   This is intentionally NOT a low-poly model renderer or one flattened battle screenshot. */
(()=>{'use strict';
 const canvas=document.getElementById('sceneWorld');
 const ctx=canvas?.getContext('2d',{alpha:false,desynchronized:true});
 if(!ctx){window.MoonfallScene={render(){},getStats(){return {mode:'unavailable',actors:0}}};return}
 const W=1600,H=800;
 const background=new Image();background.decoding='async';background.src='assets/backdrop2.webp?v=moonfall-25d-1';
 const actors=new Image();actors.decoding='async';actors.src='assets/characters.webp?v=moonfall-25d-1';
 const names=['Seraphine','Akari','Elowen','Kael','Dusk Reaper','Blood Oracle','Night Knight'];
 const positions=[137,344,548,724,1071,1261,1451];
 const sizes=[239,234,223,218,230,241,237];
 const particles=Array.from({length:37},(_,i)=>({x:(i*137+59)%W,y:(i*79+43)%H,scale:.45+(i%4)*.27,speed:.26+(i%6)*.10,seed:i*3.91}));
 const previous=Array(7).fill(null),flashes=Array(7).fill(0);
 let state=null,last=0,rendered=0;
 function ready(im){return im.complete&&im.naturalWidth>0}
 function paintBackground(t){
  if(ready(background)){
   // Slow 2D parallax of the environment, with edge bleed to avoid exposed canvas.
   const sway=Math.sin(t*.17)*3;
   ctx.drawImage(background,-10+sway,-4,1620,810);
  }else{
   const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#15203b');g.addColorStop(.55,'#2e2f4d');g.addColorStop(1,'#0b0e1b');ctx.fillStyle=g;ctx.fillRect(0,0,W,H)
  }
  // Dim behind the action so independently composited sprites stay readable.
  const mist=ctx.createLinearGradient(0,140,0,545);
  mist.addColorStop(0,'rgba(15,19,37,0)');mist.addColorStop(.30,'rgba(22,24,41,.13)');mist.addColorStop(1,'rgba(7,11,24,.04)');ctx.fillStyle=mist;ctx.fillRect(0,140,W,405);
 }
 function drawActor(index,t,alive,selected,hp){
  const x=positions[index],h=sizes[index],w=300/320*h;
  const bob=alive?Math.sin(t*1.25+index*.91)*2.2:0;
  const tilt=alive?Math.sin(t*.68+index*1.1)*.008:0;
  const bottom=442+bob;
  ctx.save();
  // Contact shadows and distinct selection target ellipse, below character feet.
  const shadow=ctx.createRadialGradient(x,bottom+3,9,x,bottom+3,w*.46);
  shadow.addColorStop(0,'rgba(0,0,0,.57)');shadow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=shadow;ctx.fillRect(x-w/2,bottom-19,w,44);
  if(selected&&alive){ctx.beginPath();ctx.ellipse(x,bottom+2,w*.45,12,0,0,Math.PI*2);ctx.fillStyle=index<4?'#6be6ca32':'#e8a39d38';ctx.fill();ctx.strokeStyle='#f8dba8';ctx.lineWidth=2;ctx.stroke()}
  ctx.translate(x,bottom-h*.06);ctx.rotate(tilt);
  const top=-h*.94, left=-w*.5;
  if(ready(actors)){
   ctx.globalAlpha=alive?1:.31;
   if(flashes[index]>0){ctx.shadowColor=index<4?'#8fffe2':'#ffa0b3';ctx.shadowBlur=flashes[index]*22}
   ctx.drawImage(actors,index*300,0,300,320,left,top,w,h);
   ctx.globalAlpha=1;
  }else{
   // A loading silhouette, NOT the old procedural cuboid figure.
   ctx.fillStyle='#5b526c';ctx.beginPath();ctx.ellipse(0,-h*.5,w*.22,h*.44,0,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
  if(flashes[index]>0)flashes[index]=Math.max(0,flashes[index]-.023);
 }
 function foreground(t){
  // A separate foreground atmosphere layer creates depth over characters and the card hand.
  const fog=ctx.createLinearGradient(0,427,0,590);
  fog.addColorStop(0,'rgba(112,118,153,0)');fog.addColorStop(.55,'rgba(125,119,151,.08)');fog.addColorStop(1,'rgba(10,10,25,.17)');ctx.fillStyle=fog;ctx.fillRect(0,427,W,163);
  for(const p of particles){
   const x=(p.x+Math.sin(t*.31+p.seed)*28+W)%W;
   const y=((p.y+t*p.speed*9)%860)-30;
   if(y<50)continue;
   ctx.save();ctx.translate(x,y);ctx.rotate(t*.5+p.seed);ctx.globalAlpha=.33+.2*Math.sin(t+p.seed)**2;
   const size=5*p.scale;ctx.fillStyle=p.seed%2?'#c65972':'#ae536b';ctx.beginPath();ctx.moveTo(0,-size);ctx.lineTo(size*.64,0);ctx.lineTo(0,size);ctx.lineTo(-size*.56,0);ctx.closePath();ctx.fill();ctx.restore();
  }
  const vignette=ctx.createRadialGradient(W*.5,H*.42,180,W*.5,H*.42,940);
  vignette.addColorStop(0,'rgba(5,6,16,0)');vignette.addColorStop(1,'rgba(3,5,15,.51)');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
 }
 function render(now,game){
  const ratio=Math.min(2,Math.max(1,window.devicePixelRatio||1));
  const cw=Math.min(3200,Math.max(1,Math.round(canvas.clientWidth*ratio))),ch=Math.min(1600,Math.max(1,Math.round(canvas.clientHeight*ratio)));
  if(cw!==canvas.width||ch!==canvas.height){canvas.width=cw;canvas.height=ch}
  ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
  const t=now/1000;paintBackground(t);
  const hps=[...game.allies.map(a=>a.hp),...game.foes.map(f=>f.hp)];
  hps.forEach((hp,i)=>{if(previous[i]!==null&&hp<previous[i])flashes[i]=1;previous[i]=hp});
  // Individual depth-sorted character layers: independently selectable/animatable sprites.
  for(let i=0;i<7;i++){const alive=hps[i]>0,selected=i<4?game.selectedAlly===i:game.selectedEnemy===i-4;drawActor(i,t,alive,selected,hps[i])}
  foreground(t);rendered++;
 }
 window.MoonfallScene={render,getStats(){return {mode:'layered-2.5D',actors:7,backgroundLoaded:ready(background),spritesLoaded:ready(actors),frames:rendered}}};
})();
