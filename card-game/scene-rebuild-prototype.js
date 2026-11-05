/* Moonfall: Shattered Court — original procedural gothic battlefield and articulated 2D fighter rigs.
 * No atlases or baked characters: bodies, weapons, arms, capes and spell hands move independently.
 * Scene architecture is rendered only when the canvas size changes. */
(()=>{'use strict';
const back=document.getElementById('sceneBackground'),atmo=document.getElementById('sceneAtmosphere'),world=document.getElementById('sceneWorld');
const bg=back?.getContext('2d',{alpha:false}),fog=atmo?.getContext('2d',{alpha:true}),ctx=world?.getContext('2d',{alpha:true,desynchronized:true});
if(!ctx||!bg||!fog){window.MoonfallScene={render(){},cue(){},reset(){},getStats(){return {mode:'unavailable',actors:0}}};return}
const W=1600,H=800,PI=Math.PI,T=PI*2;
const positions=[220,380,540,700,1060,1220,1380],ground=[445,447,446,445,445,446,447];
const kindColors={strike:'#dcb5ff',bolt:'#84dfff',area:'#f76d9e',defend:'#f2cf82',heal:'#81efd2',enemy:'#ff9b93',burn:'#ffa962'};
const impact={strike:.56,bolt:.56,area:.55,defend:.52,heal:.52,enemy:.56,burn:.46};
const actors=[
 {name:'Seraphine',type:'paladin',coat:'#ddd7ea',deep:'#534e7b',trim:'#efc789',hair:'#f5e6cc',skin:'#efd9ce',glow:'#ffd995',weapon:'blade',height:245},
 {name:'Akari',type:'rogue',coat:'#9d3459',deep:'#291f49',trim:'#df8da5',hair:'#232035',skin:'#f1ccba',glow:'#ef78c1',weapon:'twin',height:228},
 {name:'Elowen',type:'healer',coat:'#b5d8c4',deep:'#326766',trim:'#f5dd9c',hair:'#e7e4cb',skin:'#e9d7bb',glow:'#87edc9',weapon:'staff',height:240},
 {name:'Kael',type:'mage',coat:'#6687c8',deep:'#293758',trim:'#bad8ff',hair:'#dedfef',skin:'#e5c7b3',glow:'#8fd7ff',weapon:'orb',height:239},
 {name:'Dusk Reaper',type:'reaper',coat:'#603651',deep:'#161823',trim:'#e06c8e',hair:'#d9d9de',skin:'#c7a4a3',glow:'#f277a2',weapon:'scythe',height:246},
 {name:'Blood Oracle',type:'oracle',coat:'#8a2b45',deep:'#1c192e',trim:'#f4a1a6',hair:'#f1bdc6',skin:'#cba8a8',glow:'#ff6f92',weapon:'orb',height:254},
 {name:'Night Knight',type:'knight',coat:'#45506b',deep:'#161c2c',trim:'#c8a7ab',hair:'#bcc5d1',skin:'#a49da6',glow:'#e88397',weapon:'blade',height:263}
];
let cues=[],frames=0,backgroundPaints=0,atmosphereFrames=0,lastCue=null,dirty=true,nowClock=0,activeCueCount=0;
const states=actors.map(()=> 'idle'),offsets=actors.map(()=>0),castPoints=actors.map(()=>({x:0,y:0})),previous=actors.map(()=>null),hits=actors.map(()=>0);
// These are real, transparent illustration files imported to this repository.
// No drawn-body substitute is displayed once the image finishes loading.
const importedArt=actors.map((_,i)=>{
 const sprite=new Image();
 sprite.decoding='async';
 sprite.src=window.__moonfallArtSources?.[i]||`assets/illustrated/actor-${i}.png?v=moonfall-imported-art-1`;
 return sprite;
});
const paintedBackground=new Image();
paintedBackground.onload=()=>{dirty=true};
paintedBackground.src=window.__moonfallBackgroundSource||'assets/backdrop2.webp?v=moonfall-imported-art-1';
const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches??false;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x)};
const rand=n=>{const q=Math.sin(n*128.543+29.21)*48947.392;return q-Math.floor(q)};
function gradient(g,x,y,r,stops){const c=g.createRadialGradient(x,y,0,x,y,r);for(const [at,color] of stops)c.addColorStop(at,color);return c}
function linear(g,x,y,X,Y,stops){const c=g.createLinearGradient(x,y,X,Y);for(const [at,color] of stops)c.addColorStop(at,color);return c}
function path(g,points,fill,stroke=null,sw=1){g.beginPath();g.moveTo(...points[0]);for(let j=1;j<points.length;j++)g.lineTo(...points[j]);g.closePath();if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.lineWidth=sw;g.strokeStyle=stroke;g.stroke()}}
function line(g,x,y,X,Y,color,sw=1){g.beginPath();g.moveTo(x,y);g.lineTo(X,Y);g.strokeStyle=color;g.lineWidth=sw;g.stroke()}
function ellipse(g,x,y,rx,ry,fill,stroke=null,sw=1){g.beginPath();g.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,T);if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=sw;g.stroke()}}
function glow(g,x,y,r,color,opacity=1){g.save();g.globalAlpha=opacity;g.fillStyle=gradient(g,x,y,r,[[0,color],[.4,color+'55'],[1,color+'00']]);g.fillRect(x-r,y-r,r*2,r*2);g.restore()}
function stoneTower(g,x,y,w,h,depth=0){
 const dark=depth?'#16203a':'#1a2237',lit=depth?'#293351':'#2d304a';
 g.fillStyle=linear(g,x,y,x+w,y,[[0,dark],[.33,lit],[.72,dark],[1,'#101626']]);g.fillRect(x,y,w,h);
 g.fillStyle=depth?'#1a243d':'#283048';g.fillRect(x-8,y-12,w+16,14);
 for(let i=0;i<Math.ceil(w/23);i++)g.fillRect(x+i*23-3,y-32,14,24);
 for(let row=0;row<5;row++)for(let col=0;col<Math.floor(w/42);col++){
  let xx=x+14+col*42,yy=y+25+row*53;
  g.strokeStyle='#8591a11d';g.strokeRect(xx-9,yy-15,31,37);
  if((col+row)%3===0){g.fillStyle='#efb98175';g.fillRect(xx+1,yy-5,9,19)}
 }
}
function spire(g,x,base,w,h,col){path(g,[[x-w/2,base],[x-w*.37,base-h*.67],[x,base-h],[x+w*.37,base-h*.67],[x+w/2,base]],col,'#8992b138',1);
 line(g,x,base-h,x,base-h-22,'#c4bdd377',2);ellipse(g,x,base-h-23,3,3,'#e3b4a1')}
function arch(g,x,y,w,h){
 g.beginPath();g.moveTo(x,y+h);g.lineTo(x,y+h*.48);g.quadraticCurveTo(x+w*.07,y+h*.12,x+w*.5,y);g.quadraticCurveTo(x+w*.93,y+h*.12,x+w,y+h*.48);g.lineTo(x+w,y+h);g.closePath();
 g.fillStyle='#090f1f';g.fill();g.strokeStyle='#77738e8b';g.lineWidth=13;g.stroke();g.strokeStyle='#b8afc04d';g.lineWidth=3;g.stroke();
 path(g,[[x+w*.48,y+9],[x+w*.49,y+h*.48],[x+w*.49,y+h],[x+w*.51,y+h],[x+w*.51,y+h*.48],[x+w*.52,y+9]],'#39354955');
}
function tree(g,x,y,scale,color){g.save();g.translate(x,y);g.scale(scale,scale);
 g.strokeStyle='#14101d';g.lineWidth=22;g.lineCap='round';g.beginPath();g.moveTo(0,190);g.bezierCurveTo(-8,93,30,45,42,-80);g.stroke();
 for(let i=0;i<10;i++){const q=i*1.73;const bx=42+Math.cos(q)*100,by=-125+Math.sin(q*.71)*70;
  line(g,22,40,bx,by,'#1c1525',7);
  for(let j=0;j<22;j++){const px=bx+(rand(i*38+j)-.5)*135,py=by+(rand(i*77+j)-.5)*70;
   ellipse(g,px,py,4+rand(j+i*8)*11,3+rand(j*4+i)*8,color, null)
  }
 }
 g.restore()}
function fixedBackground(){
 bg.setTransform(back.width/W,0,0,back.height/H,0,0);
 // Prefer the authored painterly castle to the old vector geometry.
 if(paintedBackground.complete&&paintedBackground.naturalWidth>0){
  bg.drawImage(paintedBackground,0,0,W,H);
  // Harmonize the imported anime illustrations with the blue-violet night scene.
  const shade=linear(bg,0,0,0,H,[[0,'#0c123429'],[.57,'#11182b0d'],[1,'#0609174c']]);
  bg.fillStyle=shade;bg.fillRect(0,0,W,H);
  dirty=false;backgroundPaints++;return;
 }
 bg.fillStyle=linear(bg,0,0,0,590,[[0,'#060c21'],[.36,'#1c2e50'],[.78,'#43394e'],[1,'#111827']]);bg.fillRect(0,0,W,H);
 // The moon and far mountains make a new open sightline rather than a repeated castle facade.
 glow(bg,826,112,300,'#aec8f1',.22);ellipse(bg,826,110,97,97,'#f0ecdf');ellipse(bg,811,97,83,83,'#e8e9e4');
 for(let i=0;i<30;i++){const x=826+(rand(i)*2-1)*77,y=110+(rand(i+41)*2-1)*72;
  if((x-826)**2+(y-110)**2<78*78)ellipse(bg,x,y,5+rand(i*7)*13,3+rand(i+33)*6,'#a7acc62f')}
 for(let l=0;l<5;l++){const y=185+l*30;
  path(bg,Array.from({length:18},(_,i)=>[i*105-50,y+Math.sin(i*1.3+l)*23+(rand(i+l*45)-.5)*37]).concat([[W,460],[0,460]]),['#131b35','#18243e','#1a2744','#253147','#192136'][l]);}
 // Distant cathedral and watch towers to the right, behind the moon.
 for(const [x,y,w,h] of [[875,193,110,260],[985,155,99,298],[1081,202,128,256],[1224,175,115,275]])stoneTower(bg,x,y,w,h,1);
 for(const [x,b,w,h] of [[936,191,62,151],[1036,158,57,198],[1149,193,69,131],[1282,161,59,183]])spire(bg,x,b,w,h,'#19233e');
 path(bg,[[0,373],[172,340],[359,357],[523,334],[713,374],[872,352],[1012,380],[1204,357],[1416,355],[1600,372],[1600,520],[0,520]],'#111826');
 // Architectural left flank: stepped, carved gothic ruined archway.
 stoneTower(bg,0,115,158,399);stoneTower(bg,285,85,108,412);
 arch(bg,142,126,147,300);
 stoneTower(bg,396,183,58,309,1);
 stoneTower(bg,1488,116,115,410);stoneTower(bg,1378,195,70,300,1);
 arch(bg,1463,181,106,270);
 for(let i=0;i<9;i++){line(bg,0,194+i*37,155,193+i*37,'#a4a4b51b',2);line(bg,285,159+i*37,390,159+i*37,'#a4a4b51d',2)}
 // Hanging crimson banners and stained glass apertures.
 path(bg,[[307,151],[349,151],[349,306],[328,286],[307,306]],'#671e3f','#d3a28b',2);
 path(bg,[[1510,186],[1546,186],[1546,320],[1528,302],[1510,320]],'#7d2d4c','#d3a28b',2);
 ellipse(bg,329,194,14,22,'#ad8a8165','#e1b78a75',2);
 // Wrought iron bridges, balustrades and candlelit braziers.
 bg.fillStyle='#26283a';bg.fillRect(0,369,W,13);bg.fillStyle='#756c79';bg.fillRect(0,368,W,2);
 for(let i=0;i<53;i++){const x=i*31;bg.fillStyle='#1d2030';bg.fillRect(x,347,8,28);ellipse(bg,x+4,347,4,6,'#55556a')}
 // Ground is a perspective-correct wet stone terrace rather than flat repeated architecture.
 path(bg,[[0,402],[1600,402],[1600,592],[0,592]],linear(bg,0,398,0,600,[[0,'#34364b'],[.18,'#292c40'],[.78,'#1a2032'],[1,'#0c1423']]));
 for(let i=0;i<13;i++){const z=ease(i/13),y=403+z*190;
  line(bg,0,y,1600,y,'#8994ad2f',i%2?1:2);
  for(let j=0;j<28;j++){const x=800+(j-14)*(25+70*z)+(i%2?20:0);
   line(bg,x,y,x+(x-800)*.10,y+(5+25*z),'#8c85972d',1.7);
  }
 }
 for(let i=0;i<65;i++){const x=rand(i*19)*W,y=413+rand(i*31+19)*178,w=20+rand(i+29)*116;
  ellipse(bg,x,y,w,2+rand(i+81)*4,'#a4bad016');line(bg,x-w*.55,y,x+w*.60,y,'#91a0c120',1)}
 // Crimson canopies frame the camera without obscuring unit silhouettes.
 tree(bg,12,165,1.04,'#732541');tree(bg,1612,159,-.97,'#7d2944');
 for(const x of [107,440,1519]){
  line(bg,x,333,x,366,'#171522',8);
  glow(bg,x,311,86,'#f9a359',.28);
  path(bg,[[x-12,320],[x,276],[x+12,320]],'#f8ae61','#ffdf9c',2);
  path(bg,[[x-19,332],[x-17,309],[x+17,309],[x+19,332]],'#2a2330','#e2a87a',2)
 }
 const veil=linear(bg,0,410,0,555,[[0,'#191d3200'],[.5,'#20223815'],[1,'#080e1e8c']]);bg.fillStyle=veil;bg.fillRect(0,405,W,200);
 dirty=false;backgroundPaints++;
}
function atmosphere(now){
 fog.setTransform(atmo.width/W,0,0,atmo.height/H,0,0);fog.clearRect(0,0,W,H);
 let t=now*.001;
 for(let i=0;i<13;i++){const x=(i*153+(reduced?0:t*([5,-9,8][i%3]))+1900)%1820-110,y=260+(i%4)*43;
  glow(fog,x,y,97+(i%5)*19,'#a0b8de',.032)}
 if(!reduced)for(let i=0;i<22;i++){const x=(i*261+t*(10+i%4*8))%1730-60,y=((i*71+t*(13+i%3*8))%440)+50;
  ellipse(fog,x,y,2.6+rand(i)*2,1.4,'#b84d6998')}
 atmosphereFrames++;
}
function sync(){const ratio=Math.min(2,Math.max(1,window.devicePixelRatio||1));let w=Math.min(3200,Math.max(1,Math.round(world.clientWidth*ratio))),h=Math.min(1600,Math.max(1,Math.round(world.clientHeight*ratio)));
 for(const el of [back,atmo,world]){if(el.width!==w||el.height!==h){el.width=w;el.height=h;if(el===back)dirty=true}}
 ctx.setTransform(world.width/W,0,0,world.height/H,0,0);
}
function cue(e){if(!e||!Object.hasOwn(kindColors,e.kind))return;
 const source=Number.isInteger(e.source)&&e.source>=0&&e.source<7?e.source:1,target=Number.isInteger(e.target)&&e.target>=0&&e.target<7?e.target:4;
 const duration=reduced?560:e.kind==='area'?1650:e.kind==='defend'||e.kind==='heal'?1590:1450;
 const event={kind:e.kind,source,target,start:performance.now()+clamp(Number(e.delay)||0,0,7000),duration,impact:impact[e.kind],color:kindColors[e.kind]};
 event.impactAt=event.start+event.duration*event.impact;
 cues.push(event);cues=cues.slice(-36);lastCue=e.kind;
 return {impactAt:event.impactAt,endsAt:event.start+event.duration,kind:e.kind};
}
function reset(){cues=[];lastCue=null;states.fill('idle');offsets.fill(0);previous.fill(null);hits.fill(0);activeCueCount=0}
function actorAnimation(i,now){
 let move=0,lift=0,arm=0,offHand=0,turn=0,cast=0,slash=0,hurt=0,state='idle';
 for(let j=cues.length-1;j>=0;j--){const e=cues[j],p=(now-e.start)/e.duration;if(p<0||p>1)continue;
 if(e.target===i&&p>=e.impact&&!['heal','defend'].includes(e.kind)){hurt=Math.max(hurt,(1-ease((p-e.impact)/.37)));state='hurt'}
 if(e.source===i&&e.kind!=='burn'){
  if(e.kind==='strike'||e.kind==='enemy'){
   state='attack';
   const windup=ease((p-.06)/.19)*(1-ease((p-.32)/.10));
   const dash=ease((p-.27)/.22)*(1-ease((p-.65)/.24));
   const sign=i<4?1:-1;
   move=sign*(-19*windup+Math.min(132,Math.abs(positions[e.target]-positions[i])*.23)*dash);
   lift=-12*Math.sin(PI*ease((p-.22)/.55));slash=dash;
   arm=-.57*windup+1.13*slash;turn=-.13*slash+.055*windup;
  }else{
   state='cast';
   const focus=ease((p-.05)/.24),release=ease((p-.38)/.15);
   cast=focus*(1-ease((p-.76)/.18));
   arm=-.65*cast;offHand=.27*cast;turn=-.065*cast+.08*release;
   lift=-4*cast;
  }
 }
 }
 return {move,lift,arm,offHand,turn,cast,slash,hurt,state};
}
function limb(g,a,b,thick,base,highlight,cap=true){g.save();g.lineCap=cap?'round':'butt';g.strokeStyle='#0b0e1c';g.lineWidth=thick+6;g.beginPath();g.moveTo(...a);g.lineTo(...b);g.stroke();g.strokeStyle=base;g.lineWidth=thick;g.stroke();g.strokeStyle=highlight;g.lineWidth=2;g.beginPath();g.moveTo(a[0]-thick*.17,a[1]-2);g.lineTo(b[0]-thick*.17,b[1]-2);g.stroke();g.restore()}
function blade(g,x,y,c,scale=1){g.save();g.translate(x,y);g.scale(scale,scale);
 path(g,[[-8,0],[-4,-13],[9,-111],[15,-138],[20,-110],[9,-12],[5,0]],linear(g,0,-120,16,-22,[[0,'#fbf8fb'],[.34,'#9aa8c9'],[.72,'#e2e4ee'],[1,'#64708d']]),'#0b1125',2);
 line(g,9,-109,6,-20,c.trim,2);path(g,[[-22,-3],[-1,-9],[23,-3],[17,4],[-19,4]],c.trim,'#161321',2);
 line(g,0,-5,0,23,'#513d4a',8);ellipse(g,0,24,6,6,c.trim,'#10121d',2);g.restore()}
function staff(g,x,y,c){g.save();g.translate(x,y);line(g,0,5,13,-141,'#070d22',11);line(g,0,5,13,-141,'#cfb89a',6);
 glow(g,13,-151,34,c.glow,.41);ellipse(g,13,-153,13,16,c.glow,'#ffffffd7',2);
 for(let j=0;j<4;j++){const q=j*T/4;line(g,13,-153,13+Math.cos(q)*25,-153+Math.sin(q)*25,c.trim,2)}g.restore()}
function drawnCharacter(i,now,hp,selected){
 const img=importedArt[i];
 if(!img.complete||!img.naturalWidth)return false;
 const c=actors[i],a=actorAnimation(i,now);
 const face=i<4?1:-1,x=positions[i]+a.move,y=ground[i]+a.lift;
 const height=c.height*1.02,width=height*384/512;
 offsets[i]=a.move;states[i]=a.state;
 const shadow=gradient(ctx,x,ground[i]+2,width*.49,[[0,'#02030bcb'],[.64,'#03060c65'],[1,'#06091500']]);
 ctx.save();ctx.translate(x,ground[i]+1);ctx.scale(1,.22);ctx.fillStyle=shadow;
 ctx.beginPath();ctx.arc(0,0,width*.49,0,T);ctx.fill();ctx.restore();
 if(selected&&hp>0)ellipse(ctx,x,ground[i]+2,width*.35,10,'#e4b78312','#ffdfb5bf',2);
 // A drawn cutout cannot articulate individual limbs. Staged weight shifts,
 // a short windup, impact recoil and controlled afterimages make the pose readable
 // without falsely stretching a static illustration into rubber-like movement.
 const idle=hp>0&&!reduced?Math.sin(now*.00135+i*1.7)*.004:0;
 const attackPose=a.state==='attack'?Math.min(1,a.slash):0;
 const castPose=a.state==='cast'?a.cast:0;
 ctx.save();ctx.translate(x,y);
 ctx.rotate((a.turn+idle)*face);
 if(a.hurt)ctx.translate(-face*a.hurt*14,5*a.hurt);
 ctx.scale(1+attackPose*.025+castPose*.012,1-attackPose*.023);
 if(a.slash>.12&&!reduced){
  for(let trail=2;trail>=1;trail--){
   ctx.save();
   ctx.globalAlpha=.10*a.slash*(3-trail);
   ctx.filter='blur(2px)';
   ctx.drawImage(img,-width*.5-face*trail*19,-height,width,height);
   ctx.restore();
  }
 }
 ctx.globalAlpha=hp>0?1:.28;
 ctx.filter=hp>0?'drop-shadow(0px 8px 10px rgba(2,3,11,.64))':'grayscale(1) brightness(.64)';
 ctx.drawImage(img,-width*.5,-height,width,height);
 ctx.filter='none';
 if(a.hurt>.08&&hp>0){
  ctx.globalCompositeOperation='screen';ctx.globalAlpha=a.hurt*.25;
  ctx.filter='brightness(0) invert(1)';
  ctx.drawImage(img,-width*.5,-height,width,height);
  ctx.filter='none';ctx.globalCompositeOperation='source-over';
 }
 ctx.restore();
 // Each illustration retains a fixed foot anchor and a believable casting point.
 // Still-image sprites cannot articulate fingers: richer attack poses require authored frames.
 const reach=(.22+a.cast*.12)*width;
 castPoints[i]={x:x+face*reach,y:y-height*(.57+a.cast*.14)};
 if(a.hurt>0&&hp>0)glow(ctx,x,ground[i]-height*.56,58,c.glow,a.hurt*.1);
 return true;
}
function model(i,now,hp,selected){
 if(drawnCharacter(i,now,hp,selected))return;
 const c=actors[i],a=actorAnimation(i,now),x=positions[i]+a.move,y=ground[i]+a.lift,height=c.height;
 const front=i<4?1:-1,scale=height/250;
 const breathing=!reduced&&hp>0?Math.sin(now*.0014+i)*.65:0;
 offsets[i]=a.move;states[i]=a.state;
 // Character feet, shadows and ground effects occupy the same 1600x800 coordinates as the HUD.
 const shadow=gradient(ctx,x,ground[i]+2,83,[[0,'#040713d7'],[.49,'#05071076'],[1,'#01041100']]);
 ctx.save();ctx.translate(x,ground[i]+3);ctx.scale(1,.23);ctx.fillStyle=shadow;ctx.beginPath();ctx.arc(0,0,83,0,T);ctx.fill();ctx.restore();
 if(selected&&hp>0){ellipse(ctx,x,ground[i]+3,60,12,'#e4b7830f','#ffdfb5bf',2)}
 ctx.save();ctx.translate(x,y);ctx.scale(front*scale,scale);ctx.rotate(a.turn*front);
 if(a.hurt>0){ctx.translate(-front*a.hurt*12,0);ctx.rotate(-front*a.hurt*.09)}
 const flick=1+breathing*.004;
 ctx.scale(flick,1);
 // Cloak is multi-panelled and animated separately from the body.
 let sway=(!reduced&&hp>0?Math.sin(now*.002+i)*7:0)+a.move*.16;
 path(ctx,[[-28,-178],[-50,-175],[-79+sway*.5,-96],[-83+sway,-11],[-48+sway,-24],[-21,-94],[18,-94],[47+sway*.6,-18],[74+sway,1],[58+sway,-118],[35,-178]],
 linear(ctx,-65,-167,74,4,[[0,c.coat],[.35,c.deep],[.72,c.deep],[1,'#0a0e1c']]),'#121321',4);
 for(let k=0;k<5;k++)line(ctx,-49+k*22,-128,-61+k*26+sway*.6,-22,c.trim+'60',1.2);
 // Left and right articulated legs: alternating recovery/dash poses.
 const step=a.move?Math.sin(a.slash*PI)*11:0;
 limb(ctx,[-20,-81],[-30-step,-6],23,c.deep,c.trim);
 limb(ctx,[19,-81],[24+step,0],23,c.deep,c.trim);
 path(ctx,[[-42,-10],[-15,-12],[-9,-2],[-50,4]],'#111523',c.trim,2);
 path(ctx,[[13,-7],[39,-7],[50,4],[15,5]],'#111523',c.trim,2);
 // Breastplate, cuirass, insignia and layered waist armour.
 path(ctx,[[-39,-185],[-48,-154],[-38,-90],[0,-77],[39,-92],[50,-155],[31,-185]],
 linear(ctx,-45,-171,46,-113,[[0,c.deep],[.36,c.coat],[.65,c.deep],[1,'#1d2033']]),'#0c1021',4);
 path(ctx,[[-18,-178],[0,-191],[19,-178],[22,-126],[0,-111],[-22,-127]],c.coat,c.trim,2.4);
 path(ctx,[[-3,-176],[0,-153],[8,-151],[0,-143],[-8,-151]],c.trim);
 line(ctx,-39,-103,40,-105,'#0c101a',11);line(ctx,-36,-104,35,-105,c.trim,3);
 for(let n=0;n<3;n++){let py=-86+n*13;path(ctx,[[-43+n*2,py],[0,py+6],[42-n*2,py],[-7,py+21]],n%2?c.coat:c.deep,'#13131d',1.7)}
 // Cast hand is a real animated limb with independent forearm and wrist positions.
 const castProgress=a.cast,reach=26+castProgress*38;
 let sx=34,sy=-170,elbowX=43+castProgress*17,elbowY=-143-castProgress*9,handX=reach+28,handY=-131-castProgress*54;
 limb(ctx,[sx,sy],[elbowX,elbowY],19,c.deep,c.trim);
 limb(ctx,[elbowX,elbowY],[handX,handY],14,c.coat,c.trim);
 ellipse(ctx,handX,handY,10,10,c.skin,c.trim,1.8);
 for(let q=0;q<3;q++)line(ctx,handX+4,handY-2+q*3,handX+14,handY-8+q*4,c.skin,2);
 // Second arm and equipment swing independently from casting arm.
 const shoulder=[-35,-171],elbow=[-51-a.slash*11,-133],hand=[-55-a.slash*29,-94-a.slash*24];
 limb(ctx,shoulder,elbow,20,c.deep,c.trim);limb(ctx,elbow,hand,15,c.coat,c.trim);ellipse(ctx,hand[0],hand[1],10,10,c.skin,c.trim,1.5);
 if(c.weapon==='blade'||c.weapon==='twin'){
  ctx.save();ctx.translate(hand[0]-6,hand[1]-6);ctx.rotate(-.15-a.slash*1.05);blade(ctx,0,0,c,.75);ctx.restore();
  if(c.weapon==='twin'){ctx.save();ctx.translate(handX+11,handY+6);ctx.rotate(-.7+a.slash*.7);blade(ctx,0,0,c,.52);ctx.restore()}
 }else if(c.weapon==='staff'){staff(ctx,hand[0]-8,hand[1]+22,c)}
 else if(c.weapon==='scythe'){staff(ctx,hand[0]-15,hand[1]+17,c);path(ctx,[[-73,-187],[-45,-208],[-16,-194],[-44,-182]],'#e5a7b3','#14101b',2)}
 else if(c.weapon==='orb'){glow(ctx,hand[0]-5,hand[1]-34,31,c.glow,.45);ellipse(ctx,hand[0]-5,hand[1]-34,11,11,c.glow,'#ffffffb5',2)}
 // Face, head and independently drifting hair framing the silhouette.
 path(ctx,[[-23,-196],[-20,-226],[21,-226],[24,-196],[0,-190]],c.skin,'#0d1222',3);
 ellipse(ctx,0,-220,24,29,c.skin,'#211624',2);
 path(ctx,[[-27,-225],[-19,-253],[3,-261],[24,-246],[30,-227],[15,-238],[4,-236],[-8,-245],[-22,-227]],c.hair,'#121320',3);
 for(let n=0;n<6;n++){let xx=-25+n*9;
  path(ctx,[[xx,-253],[xx+14,-252],[xx+8+Math.sin(now*.002+n+i)*2,-229+(n%3)*8],[xx+5,-242]],n%2?c.hair:c.trim,'#17203999',.6)}
 for(let side of [-1,1]){
  const xx=side*23;path(ctx,[[xx,-238],[xx+side*8,-222],[xx+side*(13+sway*.13),-167],[xx+side*6,-183]],c.hair,'#131727',2)
 }
 // Distinct profile/helmet on heavy opponents, glowing irises on enemy models.
 if(i===4||i===5||i===6){path(ctx,[[-21,-221],[-18,-242],[19,-240],[24,-215],[16,-204],[-16,-204]],'#1b1b29cc',c.trim,2.1);
  ellipse(ctx,-7,-220,3,2.5,c.glow);ellipse(ctx,9,-220,3,2.5,c.glow)}
 else{ellipse(ctx,front*7,-221,2,2,'#1c1c2d');line(ctx,front*5,-231,front*13,-230,c.deep,2)}
 // Layered shoulder guards and embroidery are distinct silhouettes, not a scaled single image.
 for(const sign of [-1,1]){
  const xx=sign*35;path(ctx,[[xx-sign*13,-187],[xx+sign*12,-190],[xx+sign*28,-164],[xx,-153],[xx-sign*9,-168]],
  linear(ctx,xx-20,-188,xx+20,-151,[[0,c.coat],[.7,c.deep],[1,'#121727']]),c.trim,2.7);
  line(ctx,xx-sign*8,-180,xx+sign*13,-163,'#ffffff3c',2);
 }
 if(c.type==='healer'||c.type==='mage'||c.type==='oracle'){
  path(ctx,[[-4,-168],[0,-175],[4,-168],[0,-148]],c.glow);
  glow(ctx,0,-157,22,c.glow,.12)
 }
 if(a.hurt>0){ctx.globalCompositeOperation='screen';ctx.globalAlpha=.28*a.hurt;
  path(ctx,[[-38,-248],[37,-248],[42,-83],[-42,-83]],c.glow);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
 // Inverse the transformed local hand anchor to account for the character direction.
 ctx.restore();
 castPoints[i]={x:x+front*scale*(handX*Math.cos(a.turn*front)-handY*Math.sin(a.turn*front)),y:y+scale*(handX*Math.sin(a.turn*front)+handY*Math.cos(a.turn*front))};
 if(hp<=0){glow(ctx,x,ground[i]-115,130,'#11151d',.52)}
}
function magicalCircle(x,y,r,color,alpha=1,spin=0){ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=2;
 for(let k=0;k<2;k++){ctx.beginPath();ctx.arc(x,y,r*(1+k*.22),spin*(k?-.5:1),spin*(k?-.5:1)+T);ctx.stroke()}
 for(let q=0;q<8;q++){const a=q*T/8+spin;line(ctx,x+Math.cos(a)*r*.76,y+Math.sin(a)*r*.76,x+Math.cos(a)*r*1.12,y+Math.sin(a)*r*1.12,color,1.5)}
 ctx.beginPath();for(let i=0;i<8;i++){const a=spin+i*T/8;i?ctx.lineTo(x+Math.cos(a)*r*.68,y+Math.sin(a)*r*.68):ctx.moveTo(x+Math.cos(a)*r*.68,y+Math.sin(a)*r*.68)}ctx.closePath();ctx.stroke();ctx.restore()}
function particle(x,y,r,color,alpha=1){ctx.save();ctx.globalAlpha=alpha;ellipse(ctx,x,y,r,r,color);ctx.restore()}
function effects(now){activeCueCount=0;cues=cues.filter(e=>now<e.start+e.duration);
 for(const e of cues){const p=(now-e.start)/e.duration;if(p<0||p>1)continue;activeCueCount++;
  const from=castPoints[e.source],to={x:positions[e.target],y:ground[e.target]-actors[e.target].height*.51},col=e.color;
  if(e.kind!=='burn'&&p<.42){const strength=ease((p-.04)/.29)*(1-ease((p-.35)/.08));if(strength>0){
    glow(ctx,from.x,from.y,92,col,strength*.42);magicalCircle(from.x,from.y,16+strength*32,col,strength*.9,p*3);
    for(let j=0;j<15;j++){const a=j*T/15+now*.002,r=62-33*strength+(j%3)*7;
     particle(from.x+Math.cos(a)*r,from.y+Math.sin(a)*r,1.1+(j%4)*.6,col,strength*.82)}
  }}
  if(e.kind==='heal'||e.kind==='defend'){
   if(p<.4)continue;
   const ids=e.kind==='defend'?[0,1,2,3]:[e.target];const q=ease((p-.40)/.38),fade=1-ease((p-.77)/.23);
   for(const id of ids){const x=positions[id],y=ground[id]-actors[id].height*.5;
    glow(ctx,x,y,87,col,fade*.20);magicalCircle(x,y,28+q*56,col,fade*.75,-p*1.5);
    for(let n=0;n<13;n++){const a=n*T/13,rad=40+q*70;
     particle(x+Math.cos(a)*rad,y+Math.sin(a)*rad*.6,1.8,col,fade*.85)}
   }continue
  }
  if(e.kind==='burn'){
   if(p<e.impact)continue;const q=clamp((p-e.impact)/(1-e.impact));glow(ctx,to.x,to.y,85,col,(1-q)*.25);
   for(let n=0;n<19;n++){const theta=n*T/19;particle(to.x+Math.cos(theta)*(23+q*61),to.y+Math.sin(theta)*36-q*48,2.4,col,(1-q)*.85)}continue;
  }
  if(e.kind==='area'){
   if(p<e.impact)continue;const q=clamp((p-e.impact)/(1-e.impact)),r=22+ease(q/.6)*133;
   glow(ctx,to.x,to.y,r*1.25,col,(1-q)*.23);
   magicalCircle(to.x,to.y,r,col,(1-q)*.85,q*1.8);
   for(let n=0;n<22;n++){const a=n*T/22+q*2.3;particle(to.x+Math.cos(a)*r,to.y+Math.sin(a)*r*.66,2.3,col,(1-q)*.95)}continue;
  }
  if(p>=.37&&p<=e.impact){const u=ease((p-.37)/(e.impact-.37)),x=from.x+(to.x-from.x)*u,y=from.y+(to.y-from.y)*u-63*Math.sin(u*PI);
   for(let n=0;n<10;n++){const q=clamp(u-n*.03),px=from.x+(to.x-from.x)*q,py=from.y+(to.y-from.y)*q-63*Math.sin(q*PI);
    particle(px,py,3.4+n*.48,col,(1-n/10)*.62)}
   glow(ctx,x,y,48,col,.55);magicalCircle(x,y,13,col,.95,u*5);particle(x,y,7,'#f9f8ff',.9)
  }
  if(p>=e.impact){const q=clamp((p-e.impact)/(1-e.impact)),fade=1-ease(q),r=14+ease(q/.5)*129;
   glow(ctx,to.x,to.y,r,col,fade*.25);
   magicalCircle(to.x,to.y,r,col,fade*.94,now*.002);
   for(let n=0;n<24;n++){const a=n*T/24+q*.7,dist=r*(.6+rand(n*17)*.45);
    particle(to.x+Math.cos(a)*dist,to.y+Math.sin(a)*dist*.72,2.3+rand(n)*2.8,col,fade*.90)}
  }
 }
}
function foreground(now){const g=linear(ctx,0,383,0,552,[[0,'#171b3200'],[.54,'#a5b6db0b'],[1,'#070b19a2']]);ctx.fillStyle=g;ctx.fillRect(0,385,W,168);
 // Balanced vignette retains readability along the front-line silhouettes.
 ctx.fillStyle=gradient(ctx,800,275,1080,[[0,'#09101d00'],[.65,'#08101a03'],[1,'#030711a1']]);ctx.fillRect(0,0,W,H);
}
function render(now,game){sync();if(dirty)fixedBackground();atmosphere(now);ctx.clearRect(0,0,W,H);
 const hp=[...game.allies.map(a=>a.hp),...game.foes.map(f=>f.hp)];
 hp.forEach((value,i)=>{if(previous[i]!=null&&value<previous[i])hits[i]=1;previous[i]=value});
 for(let i=0;i<7;i++)model(i,now,hp[i],i<4?game.selectedAlly===i:game.selectedEnemy===i-4);
 effects(now);foreground(now);frames++;nowClock=now;
}
window.MoonfallScene={render,cue,reset,getStats(){return {mode:'rigged-illustration',actors:7,backgroundFixed:true,backgroundLoaded:true,backgroundPaints,atmosphereFrames,layerCount:4,frames,activeEffects:activeCueCount,lastCue,reducedMotion:reduced,animationStates:[...states],actorOffsets:[...offsets],castAnchors:castPoints.map(p=>({...p})),ground:ground.slice(),riggedParts:7*10,artSystem:'self-hosted painted castle and seven imported illustrated sprites',assetDependencies:7,loadedArtwork:importedArt.filter(a=>a.complete&&a.naturalWidth>0).length,paintedBackgroundLoaded:paintedBackground.complete&&paintedBackground.naturalWidth>0}}};
})();