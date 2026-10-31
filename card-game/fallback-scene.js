/* GPU-independent fallback: hand-drawn model components, not an embedded picture. */
window.MoonfallFallback=(canvas)=>{
 const ctx=canvas.getContext('2d',{alpha:false});
 const colors=[
 {hair:'#e4dcea',cloth:'#f5e8df',trim:'#e9c895',skin:'#ecd3cb',kind:'spear'},
 {hair:'#30293d',cloth:'#3b2c41',trim:'#e67c88',skin:'#e9cabe',kind:'sword'},
 {hair:'#dbbf8d',cloth:'#f0e7d3',trim:'#dcbb82',skin:'#efcfc0',kind:'staff',hat:true},
 {hair:'#9baed0',cloth:'#293950',trim:'#83b5ef',skin:'#dfbcb7',kind:'sword'},
 {hair:'#2a293d',cloth:'#2e2d45',trim:'#b3a0dd',skin:'#c0a5a8',kind:'spear'},
 {hair:'#eddfeb',cloth:'#d8b4c8',trim:'#e69cac',skin:'#ebc5c8',kind:'staff',halo:true},
 {hair:'#3d4156',cloth:'#303343',trim:'#d6bb83',skin:'#bfae9f',kind:'spear',armor:true}
 ];
 const W=1600,H=800;
 function polygon(points,color,stroke){ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);ctx.closePath();ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.stroke()}}
 function circle(x,y,r,color,stroke){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();if(stroke){ctx.lineWidth=2;ctx.strokeStyle=stroke;ctx.stroke()}}
 function ellipse(x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill()}
 function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h)}
 function grad(a,b,y1,y2){const g=ctx.createLinearGradient(0,y1,0,y2);g.addColorStop(0,a);g.addColorStop(1,b);return g}
 function environment(t){
  rect(0,0,W,H,grad('#121c3b','#424158',0,500));
  // The sky, moon, clouds and ruined architecture are shapes, never source images.
  const glow=ctx.createRadialGradient(810,140,25,810,140,290);glow.addColorStop(0,'#dcd8ff88');glow.addColorStop(1,'#dcd8ff00');rect(520,-90,580,480,glow);
  circle(855,130,98,'#d9ddf5');circle(880,108,81,'#f7eeec');
  for(let i=0;i<45;i++){const x=(i*211+57)%W,y=(i*79+33)%270;circle(x,y,i%4===0?2:1,i%5===0?'#f0ddd8':'#b3bad5')}
  for(let i=0;i<23;i++){const x=(i*237+60)%W,y=170+(i%4)*35;ellipse(x,y,80+i%3*34,18+i%2*9,'#6e71817a')}
  function tower(x,width,height,far=false){
   rect(x-width/2,384-height,width,height,far?'#25293e':'#303748');
   polygon([[x-width*.67,384-height],[x,384-height-width*.8],[x+width*.67,384-height]],far?'#232940':'#3c4054');
   rect(x-width*.1,384-height-width*.94,width*.2,-width*.5,far?'#232940':'#35354b');
   for(let j=0;j<3;j++)rect(x-width*.2,384-height+35+j*48,width*.4,21,far?'#a08ca155':'#f6bd8055');
  }
  for(let i=0;i<17;i++){const x=i*100-20;tower(x,95+(i%3)*30,118+(i%4)*28,true)}
  tower(795,185,340,true);tower(685,75,226,true);tower(908,88,240,true);
  rect(0,355,W,420,grad('#3e4558','#161b2a',350,800));
  // Perspective wet flagstone ground and moving reflective glints.
  for(let j=0;j<13;j++){const y=386+j*j*2.5;rect(0,y,W,1,'#98a7af44')}
  ctx.lineWidth=2;ctx.strokeStyle='#8a96a451';for(let i=-11;i<12;i++){ctx.beginPath();ctx.moveTo(800+i*43,376);ctx.lineTo(800+i*230,900);ctx.stroke()}
  for(let i=0;i<23;i++){const x=(i*179+23)%W,y=410+(i*39)%360;rect(x,y,28,2,i%4===0?'#e8b9a099':'#b7bfc644')}
  // Columned arches with real-time parallax sway (2D fallback only).
  for(let s of [-1,1])for(let i=0;i<5;i++){
   const x=s>0?1208+i*96:370-i*96,yy=260+i*9;
   rect(x-11,yy-100,22,205,'#33394a');rect(x-23,yy-109,46,16,'#515265');
   polygon([[x-32,yy-110],[x,yy-156],[x+32,yy-110]],'#292e45');
   rect(x-4,yy-80,8,31,'#debd916e');
  }
  // Small procedurally scattered red leaves.
  for(let i=0;i<20;i++){const x=(i*113+Math.sin(t*.34+i)*17+54)%W,y=(i*61+54)%H;polygon([[x,y],[x+7,y-4],[x+4,y+4],[x+11,y+9],[x+1,y+5]],i%2?'#9d5367':'#a94761')}
 }
 function model(x,y,p,t,alive,selected,i){
  ctx.save();ctx.translate(x,y-(alive?Math.sin(t*1.4+i)*4:-36));ctx.rotate(alive?Math.sin(t*.8+i)*.025:-.27);
  const left=i<4,sc=(i===0||i===6)?1.07:1;
  ctx.scale(sc,sc);ellipse(0,4,68,14,'#050817aa');
  if(selected&&alive){ellipse(0,-4,70,15,left?'#85e8cf75':'#f5a8b475');ctx.strokeStyle='#f3d29a';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,-4,70,15,0,0,Math.PI*2);ctx.stroke()}
  // Long hair and fabric cloaks are discrete articulated shapes.
  polygon([[-40,-245],[-43,-154],[-58,-61],[-18,-78],[20,-72],[54,-60],[42,-171],[38,-250]],p.hair);
  polygon([[-42,-164],[-82,-37],[-44,-8],[0,-49],[47,-3],[75,-32],[34,-164]],p.cloth,'#ffffff49');
  polygon([[-33,-162],[-56,-29],[-15,-30],[0,-75],[17,-28],[52,-31],[34,-162]],p.trim);
  // Boots, legs, torso and chest ornament.
  rect(-24,-54,18,60,'#242538');rect(7,-54,18,60,'#242538');
  ellipse(-17,-3,23,11,'#151927');ellipse(18,-3,23,11,'#151927');
  polygon([[-32,-166],[-44,-128],[-22,-97],[20,-97],[44,-130],[32,-166]],p.cloth,p.trim);
  polygon([[-16,-151],[0,-132],[16,-151],[0,-186]],p.trim);
  for(const side of [-1,1]){
   polygon([[side*35,-162],[side*52,-151],[side*54,-98],[side*37,-97]],p.cloth);
   ellipse(side*48,-96,11,13,p.skin);
  }
  // Oversized face for readability at handheld resolutions.
  ellipse(0,-222,34,44,p.skin);ellipse(0,-260,38,23,p.hair);
  for(const side of [-1,1]){
   polygon([[side*7,-270],[side*31,-264],[side*37,-210],[side*21,-223]],p.hair);
   ellipse(side*14,-221,11,5,'#fff3ef');ellipse(side*14,-220,6,7,left?'#84a8d1':'#bd7eaa');circle(side*14,-220,3,'#21273d');
  }
  ellipse(0,-195,7,2,'#bd8290');
  if(p.hat){ellipse(0,-275,74,11,'#47415a');polygon([[-37,-280],[-3,-334],[37,-280]],'#403c5a')}
  if(p.halo){ctx.strokeStyle='#f4d4a9';ctx.lineWidth=7;ctx.beginPath();ctx.ellipse(0,-236,69,81,0,0,Math.PI*2);ctx.stroke()}
  if(p.armor){polygon([[-37,-163],[-70,-160],[-49,-134]],p.trim);polygon([[37,-163],[70,-160],[49,-134]],p.trim)}
  // Weapons are independent, rotate with the actor and are never pre-rendered background art.
  const wx=67;ctx.strokeStyle=p.trim;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(wx,-55);ctx.lineTo(wx+7,-286);ctx.stroke();
  if(p.kind==='sword')polygon([[wx+6,-270],[wx-4,-305],[wx+15,-318],[wx+15,-274]],'#e2e4eb');
  else if(p.kind==='spear')polygon([[wx+7,-272],[wx-6,-294],[wx+7,-345],[wx+18,-293]],'#c2d3e8');
  else{circle(wx+7,-291,18,'#9cc4df');circle(wx+7,-291,9,'#dee8f4')}
  if(!alive){ctx.fillStyle='#050a1890';ctx.fillRect(-80,-340,160,352)}
  ctx.restore();
 }
 let supported=false,stats={models:7,supported:false,renderer:'2D geometry fallback'};
 return {supported,render(now,state){
  const w=Math.max(1,Math.round(canvas.clientWidth*Math.min(devicePixelRatio||1,2))),h=Math.max(1,Math.round(canvas.clientHeight*Math.min(devicePixelRatio||1,2)));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
  ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
  environment(now/1000);
  const xs=[126,345,540,718,1105,1305,1500];
  for(let i=0;i<7;i++){
   const health=i<4?state.allies[i]?.hp:state.foes[i-4]?.hp;
   const selected=i<4?state.selectedAlly===i:state.selectedEnemy===i-4;
   model(xs[i],412,colors[i],now/1000,health>0,selected,i);
  }
 },getStats(){return stats}};
};
