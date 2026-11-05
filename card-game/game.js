(()=>{'use strict';
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d',{alpha:true});
const messageNode=document.getElementById('announcer');
const loading=document.getElementById('loadMessage');
const inspector=document.getElementById('cardInspector');
const inspectorArt=document.getElementById('cardInspectorArt');
const inspectorPlay=document.getElementById('cardInspectorPlay');
const inspectorCancel=document.getElementById('cardInspectorCancel');
const mobileInspector=window.matchMedia('(max-width:1050px)');
let inspectorKey='';
function renderCardInspector(){
 const preview=game.preview;
 const visible=mobileInspector.matches&&preview?.type==='card'&&!game.ended;
 inspector.hidden=!visible;inspector.setAttribute('aria-hidden',String(!visible));
 if(!visible){inspectorKey='';return}
 const c=CARDS[preview.index],key=c.id+':'+game.energy+':'+!!preview.readonly;
 if(inspectorKey===key)return;
 inspectorKey=key;
 document.getElementById('cardInspectorName').textContent=c.name;
 document.getElementById('cardInspectorRarity').textContent=c.rarity.toUpperCase()+'  ·  '+c.kind.toUpperCase();
 document.getElementById('cardInspectorCost').textContent=String(c.cost);
 document.getElementById('cardInspectorDescription').textContent=c.description;
 document.getElementById('cardInspectorFlavor').textContent=c.flavor;
 inspectorArt.style.backgroundPosition=(preview.index*25)+'% 50%';
 inspectorPlay.hidden=!!preview.readonly;
 inspectorPlay.disabled=game.energy<c.cost||!!preview.readonly;
 inspectorPlay.textContent=inspectorPlay.disabled?'Not enough energy':'Play card';
 inspectorCancel.textContent=preview.readonly?'Back to deck':'Keep in hand';
}
inspectorPlay.addEventListener('click',()=>{if(game.preview?.type==='card'&&!game.preview.readonly)play()});
inspectorCancel.addEventListener('click',()=>{game.preview=game.preview?.readonly?{type:'deck'}:null});

const cardsArt=new Image();
cardsArt.decoding='async';
const artwork=[cardsArt];
cardsArt.src='assets/cards-hd.webp?v=moonfall-clean-sprites-1';
const W=1600,H=800,THEME={gold:'#f1d4a1',cream:'#f7e7d0',muted:'#bac0cb',blue:'#a6cbff',red:'#ef8799',green:'#9be3b6'};
const CARDS=[
 {id:'shadow',name:'Shadow Step',rarity:'Rare',cost:1,kind:'attack',description:'Deal 135 damage to your selected enemy. If this defeats it, regain 1 energy.',amount:135,flavor:'Disappear into the night. Return as a blade.',hue:'#c4a6ff'},
 {id:'aegis',name:'Guardian Aegis',rarity:'Epic',cost:2,kind:'defend',description:'Give every surviving ally 70 shield, blocking incoming enemy damage.',amount:70,flavor:'Even the moon cannot pierce this ward.',hue:'#e8d09a'},
 {id:'bloom',name:'Crimson Bloom',rarity:'Legendary',cost:3,kind:'area',description:'Deal 95 damage to all living enemies. Apply 20 burn for two turns.',amount:95,flavor:'Let the scarlet petals fall.',hue:'#ffbaaf'},
 {id:'healing',name:'Healing Wind',rarity:'Rare',cost:2,kind:'heal',description:'Restore 100 health to your selected ally, up to their maximum.',amount:100,flavor:'A soft wind follows the fallen.',hue:'#aae6c3'},
 {id:'bolt',name:'Arcane Bolt',rarity:'Common',cost:1,kind:'attack',description:'Deal 115 lightning damage to the selected enemy.',amount:115,flavor:'A spark can shatter the darkness.',hue:'#a6bbff'}
];
const ALLIES=[
 {name:'Seraphine',maxHp:190,x:220},{name:'Akari',maxHp:180,x:380},{name:'Elowen',maxHp:185,x:540},{name:'Kael',maxHp:195,x:700}
];
const FOES=[
 {name:'Dusk Reaper',maxHp:250,x:1060,attack:34},{name:'Blood Oracle',maxHp:300,x:1220,attack:39},{name:'Night Knight',maxHp:340,x:1380,attack:44}
];
function freshGame(){return {
 allies:ALLIES.map(x=>({...x,hp:x.maxHp,shield:0})),foes:FOES.map(x=>({...x,hp:x.maxHp,burn:0,burnTurns:0})),
 turn:1,energy:3,maxEnergy:3,draw:[0,1,2,3,4,1,0,4,2,3,0,4,1,2,4,3,0,1],discard:[],hand:[0,1,2,3,4],
 selectedEnemy:0,selectedAlly:0,preview:null,history:null,ended:false,guide:false,handScroll:0,
 toast:'Tap a card to inspect it, then choose PLAY CARD.',toastAt:performance.now(),fx:[],lastEffect:null,hover:-1,
 initial:true};}
let game=freshGame();game.draw=game.draw.slice(5);
// Combat state changes land on the same frame as their corresponding animation hits.
let pendingImpacts=[],afterImpacts=null;
function isResolving(){return pendingImpacts.length>0||afterImpacts!==null}
function clearImpacts(){pendingImpacts=[];afterImpacts=null}
function flushImpacts(now){
 const due=pendingImpacts.filter(action=>action.at<=now);
 pendingImpacts=pendingImpacts.filter(action=>action.at>now);
 for(const action of due)action.apply();
 if(!pendingImpacts.length&&afterImpacts){
  const next=afterImpacts;afterImpacts=null;next();
 }
}
function impactCue(kind,source,target,apply,delay=0){
 const motion=actionCue(kind,source,target,delay);
 if(!motion||!Number.isFinite(motion.impactAt)){apply();return}
 pendingImpacts.push({at:motion.impactAt,apply});
}

const zones=[];
let pointer=null;
function announce(s){game.toast=s;game.toastAt=performance.now();messageNode.textContent=s}
function rr(x,y,w,h,r,fill,stroke,sw=1){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=sw;ctx.stroke()}}
function text(s,x,y,size,color=THEME.cream,font='system-ui',align='left',weight='600'){
 ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.font=`${weight} ${size}px ${font}`;ctx.fillText(String(s),x,y);
}
function gradient(x,y,w,h,stops){const g=ctx.createLinearGradient(x,y,x,y+h);for(const [p,col] of stops)g.addColorStop(p,col);return g}
function line(x,y,w,color='#a99474',size=1){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.lineWidth=size;ctx.strokeStyle=color;ctx.stroke()}
function register(x,y,w,h,action,meta,enabled=true,polygon=null){zones.push({x,y,w,h,action,meta,enabled,polygon})}
function glow(x,y,r,color){const g=ctx.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}
function pill(s,x,y,w,h,fill='#161826e9',stroke='#c9a97d',sz=17){rr(x,y,w,h,7,fill,stroke,1.5);text(s,x+w/2,y+h/2,sz,THEME.cream,'system-ui','center','750')}
function hpBar(x,y,w,h,amount,total,friend){rr(x,y,w,h,2,'#111621db','#736968',1);
 const ratio=Math.max(0,Math.min(1,amount/total));
 if(ratio>0)rr(x+2,y+2,Math.max(0,(w-4)*ratio),h-4,1,gradient(x,y,w,h,friend?[[0,'#8feaaf'],[1,'#257b72']]:[[0,'#ffa2a4'],[1,'#a03960']]));
}
function drawHeader(){
 // Floating HUD, not a website navigation strip.
 const grad=ctx.createLinearGradient(0,0,0,106);
 grad.addColorStop(0,'#080d1cf3');grad.addColorStop(.72,'#080d1cb0');grad.addColorStop(1,'#080d1c00');
 ctx.fillStyle=grad;ctx.fillRect(0,0,W,106);
 text('✧',31,37,42,THEME.gold,'Georgia');
 text('MOONFALL',79,35,34,THEME.cream,'Georgia','left','700');
 text('SHATTERED COURT',300,39,14,'#e7d4b2','system-ui','left','700');
 if(isResolving()){
  rr(433,22,179,31,7,'#292239ed','#e7c690bd',1);
  text('✦ RESOLVING',523,38,13,'#ffdfa2','system-ui','center','800');
 }
 pill(`TURN ${game.turn}`,758,15,155,40,'#211e2bdb','#d6b78d',21);
 const live=game.foes.filter(f=>f.hp>0).length;
 pill(`${live} ENEMIES`,927,15,155,40,'#231b2bd8','#c58e9d',16);
 pill('HOW TO PLAY',1096,15,154,40,'#252034dc','#c5a67d',14);
 pill('↺ RESTART',1260,15,140,40,'#242132dc','#b6a48f',14);
 register(1096,15,154,40,'guide');register(1260,15,140,40,'restart');
}
function scene(){
 // Character gauges are grounded directly below each independently positioned model.
 const gaugeY=447;
 for(let i=0;i<game.allies.length;i++){
  const a=game.allies[i],x=a.x,selected=i===game.selectedAlly;
  if(selected&&a.hp>0){glow(x,gaugeY-5,50,'#7df0cb30');rr(x-62,gaugeY-8,124,3,2,'#bde6d3');}
  rr(x-70,gaugeY,140,45,6,'#0c1425e7',selected?'#e9d5aa':'#7b99a58c',selected?2:1);
  text(a.name,x,gaugeY+11,15,THEME.cream,'Georgia','center','600');
  hpBar(x-60,gaugeY+22,120,10,a.hp,a.maxHp,true);
  text(a.hp+' / '+a.maxHp,x,gaugeY+39,12,'#dcf7e2','system-ui','center','700');
  if(a.shield>0)text('◆'+a.shield,x+62,gaugeY+10,10,'#a9d5ff','system-ui','right');
  if(a.hp===0){rr(x-70,gaugeY,140,45,6,'#0a0e17a9');text('FALLEN',x,gaugeY+20,13,THEME.red,'Georgia','center');}
  register(x-70,190,140,gaugeY+45-190,'ally',i,a.hp>0);
 }
 for(let i=0;i<game.foes.length;i++){
  const e=game.foes[i],x=e.x,selected=i===game.selectedEnemy;
  if(selected&&e.hp>0){glow(x,gaugeY-4,50,'#e69ca54a');rr(x-67,gaugeY-8,134,3,2,'#f9ce9e');}
  rr(x-71,gaugeY,142,45,6,selected?'#291b2be8':'#181822e7',selected?'#f1cf96':'#aa81908c',selected?2:1);
  text(e.name,x,gaugeY+11,15,THEME.cream,'Georgia','center','600');
  hpBar(x-61,gaugeY+22,122,10,e.hp,e.maxHp,false);
  text(e.hp+' / '+e.maxHp,x,gaugeY+39,12,'#ffe3e8','system-ui','center','700');
  if(e.burnTurns>0)text('✦',x+62,gaugeY+10,13,'#f8ad75','Georgia','right');
  if(e.hp===0){rr(x-71,gaugeY,142,45,6,'#0b0d17b8');text('DEFEATED',x,gaugeY+20,12,'#ffd0bb','Georgia','center');}
  register(x-72,190,144,gaugeY+45-190,'enemy',i,e.hp>0);
 }
}
function fittedCardText(value,x,y,maxW,size,minSize,color,font='Georgia',weight='700'){
 ctx.font=`${weight} ${size}px ${font}`;
 const fitted=Math.max(minSize,Math.min(size,size*maxW/Math.max(1,ctx.measureText(String(value)).width)));
 text(value,x,y,fitted,color,font,'center',weight);
}
function cardFrame(index,slot,x,y,w,h,large=false){
 const c=CARDS[index];const active=game.energy>=c.cost;
 ctx.save();
 ctx.shadowColor=slot===game.hover?'#ffe0a5b5':'#050414d0';
 ctx.shadowBlur=slot===game.hover?26:17;ctx.shadowOffsetY=7;
 rr(x,y,w,h,11,gradient(x,y,w,h,[[0,'#f0d4a0'],[.32,'#53416b'],[1,'#d6ae78']]),slot===game.hover?'#fff2ca':'#dcbb81',3);
 ctx.restore();
 ctx.save();ctx.strokeStyle='#fff1c27a';ctx.lineWidth=1;
 ctx.beginPath();ctx.moveTo(x+17,y+6);ctx.quadraticCurveTo(x+w/2,y+3,x+w-17,y+6);ctx.stroke();ctx.restore();
 rr(x+6,y+6,w-12,h-12,7,'#161624','#c3a578',1.4);
 rr(x+9,y+9,w-18,h-18,5,null,'#997a59',.7);
 rr(x+10,y+12,w-20,h-24,6,gradient(x+10,y,w-20,h,[[0,'#3b324b'],[1,'#171727']]));
 if(cardsArt.complete&&cardsArt.naturalWidth>0){
   const dx=x+(large?12:9),dy=y+(large?39:35),dw=w-(large?24:18),dh=h-(large?105:93),srcW=276,srcH=272;
   const targetRatio=dw/dh,sourceRatio=srcW/srcH;
   let sx=276*index,sy=0,sw=srcW,sh=srcH;
   if(sourceRatio>targetRatio){sw=srcH*targetRatio;sx+=Math.max(0,(srcW-sw)/2)}
   else{sh=srcW/targetRatio;sy+=Math.max(0,(srcH-sh)/2)}
   ctx.save();ctx.beginPath();ctx.roundRect(dx,dy,dw,dh,4);ctx.clip();
   ctx.drawImage(cardsArt,sx,sy,sw,sh,dx,dy,dw,dh);ctx.restore();
 }
 else{rr(x+10,y+39,w-20,h-105,5,'#25243c');fittedCardText('ARTWORK LOADING',x+w/2,y+h*.48,w-25,12,9,'#e6d7ba','system-ui');}
 const badge=large?37:30;
 rr(x+10,y+10,badge,badge,badge/2,'#25233b','#fae2b8',2);
 text(c.cost,x+10+badge/2,y+10+badge/2,large?24:19,THEME.cream,'Georgia','center','700');
 if(large)text(c.rarity.toUpperCase(),x+w-14,y+25,11,'#ffe1ba','system-ui','right','900');
 else text(c.rarity.toUpperCase(),x+w-12,y+25,9,'#ffe1ba','system-ui','right','850');
 const bandH=large?66:56;
 rr(x+8,y+h-bandH-8,w-16,bandH,5,'#111523f7','#dabd8bce',1.5);
 fittedCardText(c.name,x+w/2,y+h-bandH+9,w-25,large?24:14,large?17:10.8,THEME.cream);
 const kindLabel=large?c.kind.toUpperCase()+' · '+c.cost+' ENERGY':c.kind.toUpperCase();
 fittedCardText(kindLabel,x+w/2,y+h-25,w-21,large?13:10,9,c.hue,'system-ui','850');
 if(!large&&!active){rr(x+6,y+6,w-12,h-12,7,'#0a0a1666')}
}
function cardBack(x,y,w,h,label,count){
 ctx.save();ctx.shadowBlur=10;ctx.shadowColor='#0009';rr(x,y,w,h,9,gradient(x,y,w,h,[[0,'#44344d'],[1,'#171625']]),'#ba9a70',3);ctx.restore();
 rr(x+9,y+9,w-18,h-18,6,'#151729','#dfbe8888',1.5);
 ctx.beginPath();ctx.arc(x+w/2,y+h/2-9,w*.27,0,Math.PI*2);ctx.strokeStyle='#e5c188a0';ctx.lineWidth=2;ctx.stroke();
 text('✧',x+w/2,y+h/2-9,54,THEME.gold,'Georgia','center');
 text(label,x+w/2,y+h+22,17,'#f2d6af','Georgia','center');
 pill(String(count),x+w/2-22,y-17,44,30,'#211b2b','#d4b783',17);
}
// Finger-fan layout: preserved 2:3 card ratio, overlapping edges and curved baseline.
function handLayout(){
 const n=game.hand.length,mid=(n-1)/2;
 // The viewport is uniformly letterboxed; all card geometry is true 2:3.
 const height=186,width=height*(2/3);
 // A tighter fan leaves a clearer battlefield and makes the cards feel held together.
 const spacing=n<=5?65:Math.max(49,Math.min(65,360/Math.max(1,n-1)));
 const total=width+Math.max(0,n-1)*spacing;
 const first=800-total/2-game.handScroll;
 // Narrower viewports automatically reduce card tilt to avoid clipping the bottom edge.
 const maxAngle=Math.min(.225,25/Math.max(70,width/2));
 return Array.from({length:n},(_,i)=>{
   const d=i-mid,outer=mid?d/mid:0;
   return {
     slot:i,x:first+i*spacing,
     y:569+Math.abs(d)*(n<=5?8:5)-(game.hover===i?12:0),
     w:width,h:height,angle:outer*maxAngle
   };
 });
}
function cardPolygon(c){
 const pivot={x:c.x+c.w/2,y:c.y+c.h*.88},co=Math.cos(c.angle),si=Math.sin(c.angle);
 const corner=(xx,yy)=>({x:pivot.x+(xx-pivot.x)*co-(yy-pivot.y)*si,
                         y:pivot.y+(xx-pivot.x)*si+(yy-pivot.y)*co});
 return [corner(c.x,c.y),corner(c.x+c.w,c.y),corner(c.x+c.w,c.y+c.h),corner(c.x,c.y+c.h)];
}
function drawTable(now){
 // A minimal vignette behind a real fan of cards; no separate bottom menu.
 const vignette=ctx.createLinearGradient(0,544,0,800);
 vignette.addColorStop(0,'#080d1900');vignette.addColorStop(1,'#070b18a2');
 ctx.fillStyle=vignette;ctx.fillRect(0,544,W,256);
 // Compact, non-overlapping controls pinned to both bottom corners.
 rr(28,591,184,53,9,'#111728d5','#c2ad82a1',1.3);
 text('✧ ENERGY',43,608,13,THEME.gold,'system-ui','left','850');
 text(game.energy+' / '+game.maxEnergy,49,631,24,THEME.cream,'Georgia');
 for(let i=0;i<game.maxEnergy;i++){
  const x=130+i*22,y=625;ctx.fillStyle=i<game.energy?'#a2eaf9':'#41455b';
  ctx.beginPath();ctx.moveTo(x,y-8);ctx.lineTo(x+7,y);ctx.lineTo(x,y+8);ctx.lineTo(x-7,y);ctx.closePath();ctx.fill();
 }
 // This is deliberately visible and does NOT modify hit points or spend cards.
 pill('▶ SEE ANIMATIONS',233,599,218,46,'#423148e8','#edcd94',16);
 register(233,599,218,46,'motionDemo');
 cardBack(45,691,56,68,'DECK',game.draw.length);
 cardBack(126,691,56,68,'DISCARD',game.discard.length);
 register(27,660,83,140,'deck');register(111,660,84,140,'discard');
 // Subtle enchanted filigree behind the low, tightly overlapped hand.
 ctx.save();
 const fanGlow=ctx.createRadialGradient(800,740,38,800,740,295);
 fanGlow.addColorStop(0,'#f2c78829');
 fanGlow.addColorStop(.6,'#9673a413');
 fanGlow.addColorStop(1,'#070b1800');
 ctx.fillStyle=fanGlow;ctx.fillRect(505,553,590,247);
 ctx.beginPath();ctx.ellipse(800,783,253,38,0,Math.PI*1.08,Math.PI*1.92);
 ctx.strokeStyle='#d4ac7e65';ctx.lineWidth=1.5;ctx.stroke();
 for(const dx of [-244,-183,0,183,244]){
  ctx.beginPath();ctx.arc(800+dx,780-(dx===0?23:3),dx===0?2.7:1.7,0,Math.PI*2);
  ctx.fillStyle=dx===0?'#ffe4adab':'#e8c58b69';ctx.fill();
 }
 ctx.restore();
 // Draw back-to-front. Raised center cards win overlapping hit tests.
 const fan=handLayout(),middle=(fan.length-1)/2;
 const order=fan.slice().sort((a,b)=>Math.abs(b.slot-middle)-Math.abs(a.slot-middle));
 for(const c of order){
   ctx.save();ctx.translate(c.x+c.w/2,c.y+c.h*.88);ctx.rotate(c.angle);
   cardFrame(game.hand[c.slot],c.slot,-c.w/2,-c.h*.88,c.w,c.h);
   ctx.restore();
   register(c.x,c.y,c.w,c.h,'card',c.slot,true,cardPolygon(c));
 }
 ctx.save();ctx.shadowColor='#e2a97777';ctx.shadowBlur=17;
 rr(1410,673,165,73,12,gradient(1410,673,165,73,[[0,'#603247'],[1,'#2a1c2b']]),'#f9d3a0',2.5);ctx.restore();
 text('END TURN',1492,701,22,THEME.cream,'Georgia','center','650');
 text('→',1492,729,19,THEME.gold,'Georgia','center');
 register(1397,657,190,108,'end');
 const age=now-game.toastAt;
 rr(534,496,560,26,8,'#111827b9');
 text(game.toast,814,509,13,age<9000?'#f6dbb6':'#b6b6bd','system-ui','center','700');
}
function wrap(value,x,y,maxW,sz=24,color=THEME.cream,lineHeight=35){const words=value.split(' ');let line='';let row=0;ctx.font=`600 ${sz}px system-ui`;for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>maxW&&line){text(line,x,y+row*lineHeight,sz,color);line=word;row++}else line=next}if(line)text(line,x,y+row*lineHeight,sz,color);return row+1}
function overlayFrame(title,sub){ctx.fillStyle='#070a15d9';ctx.fillRect(0,0,W,H);rr(245,95,1110,615,18,gradient(245,95,1110,615,[[0,'#2c2739'],[1,'#121727']]),'#d7b68b',3);text(title,300,142,36,THEME.cream,'Georgia');if(sub)text(sub,300,183,18,'#cbbdcb');pill('✕ CLOSE',1132,112,180,51,'#2a2b3b','#bca17c',19);register(1132,112,180,51,'close')}
function drawPreview(){
 const idx=game.preview.index,c=CARDS[idx];
 overlayFrame('CARD DETAILS','Inspect first. Playing is always a separate decision.');
 const previewWidth=419*(2/3);
 cardFrame(idx,-1,445-previewWidth/2,208,previewWidth,419,true);
 text(c.name,650,255,41,THEME.cream,'Georgia');
 text(c.rarity.toUpperCase()+'  ·  '+c.kind.toUpperCase(),650,311,20,c.hue,'system-ui','left','800');
 pill(`${c.cost} ENERGY`,650,346,170,43,'#342c3f','#cda77b',20);
 wrap(c.description,650,445,620,24,'#f2e5da',39);
 text(c.flavor,650,525,20,'#bcb5c9','Georgia','left','500');
 if(game.preview.readonly){pill('← BACK TO DECK',635,603,325,65,'#302f40','#d2b489',21);register(635,603,325,65,'backdeck');return}
 const affordable=game.energy>=c.cost;
 pill(affordable?'PLAY CARD':'NOT ENOUGH ENERGY',646,593,337,76,affordable?'#75513de8':'#4e3e44','#e9c28d',25);
 pill('KEEP IN HAND',1003,593,270,76,'#2b2b3d','#bdb5bf',22);
 register(646,593,337,76,'play',null,affordable);register(1003,593,270,76,'close');
}
function drawDeck(){
 overlayFrame(game.history==='discard'?'DISCARD PILE':'YOUR DECK',game.history==='discard'?'Cards already played in this battle.':'Choose a card to inspect. You cannot play it from here.');
 const list=game.history==='discard'?game.discard:[...game.draw,...game.hand,...game.discard];
 const counts=Array(5).fill(0);list.forEach(n=>counts[n]++);
 for(let i=0;i<5;i++){
   if(game.history==='discard'&&!counts[i])continue;
   const x=320+i*199, y=274;
   cardFrame(i,-1,x,y,180,279,true);
   pill('× '+counts[i],x+42,574,96,41,'#272233','#bd9a7c',19);
   register(x,y,182,327,'deckcard',i);
 }
 text('Tap an illustrated card to read its full ability.',800,647,20,'#d9c7c2','system-ui','center');
}
function drawGuide(){
 overlayFrame('HOW TO PLAY','One battle. Four allies. Three enemies. No complicated setup.');
 const steps=[
  ['1', 'CHOOSE A TARGET', 'Tap an enemy to attack it, or tap an ally to choose who receives healing.'],
  ['2', 'INSPECT A CARD', 'Tap any card in your hand. Read its power and energy cost. Then press PLAY CARD.'],
  ['3', 'END YOUR TURN', 'When you are done, End Turn lets the surviving enemies attack and draws your next hand.']
 ];
 steps.forEach((v,i)=>{const y=257+i*123;rr(320,y,70,66,16,'#4c3950','#dab780',2);text(v[0],355,y+33,29,THEME.gold,'Georgia','center');text(v[1],415,y+13,24,THEME.cream,'system-ui','left','800');wrap(v[2],415,y+50,760,19,'#cec6d6',29)});
 pill('START BATTLE',619,616,365,66,'#67513c','#f7d49d',25);register(619,616,365,66,'close');
}
function drawResult(){
 overlayFrame(game.ended==='win'?'VICTORY — MOONFALL CLEARED':'THE PARTY HAS FALLEN',game.ended==='win'?'All three enemies have been defeated.':'Your four heroes have fallen. Try a different card strategy.');
 text(game.ended==='win'?'✦':'☾',800,340,145,THEME.gold,'Georgia','center');
 text(game.ended==='win'?'THE CATHEDRAL IS YOURS':'YOUR LEGEND IS NOT OVER',800,461,28,THEME.cream,'Georgia','center');
 pill('PLAY AGAIN',604,582,390,70,'#684c3e','#f2d4a4',26);register(604,582,390,70,'restart');
}
function drawParticles(now){game.fx=game.fx.filter(f=>now-f.start<850);for(const f of game.fx){const t=(now-f.start)/850;const alpha=1-t;const p=f.team==='ally'?game.allies[f.target]:game.foes[f.target];const x=p?.x||800, y=260-(t*95);ctx.save();ctx.globalAlpha=alpha;ctx.shadowColor=f.color;ctx.shadowBlur=12*(1-t);glow(x,y,47,f.color+'55');text(f.words,x,y,33,f.color,'Georgia','center','700');ctx.restore()}}
let lastSnapshotAt=0;
function draw(now=performance.now()){
 flushImpacts(now);
 if(now-lastSnapshotAt>100){
   canvas.dataset.turn=String(game.turn);canvas.dataset.energy=String(game.energy);canvas.dataset.resolving=String(isResolving());
   canvas.dataset.hand=String(game.hand.length);canvas.dataset.preview=game.preview?.type||'none';
   canvas.dataset.foes=game.foes.map(x=>x.hp).join(',');canvas.dataset.allies=game.allies.map(x=>x.hp).join(',');
   canvas.dataset.phase=game.ended||'playing';lastSnapshotAt=now;
 }
 zones.length=0;window.MoonfallScene?.render(now,game);ctx.clearRect(0,0,W,H);scene();drawHeader();drawTable(now);drawParticles(now);
 if(game.preview?.type==='card'){
  if(mobileInspector.matches){ctx.fillStyle='#050914dc';ctx.fillRect(0,0,W,H)}
  else drawPreview();
 }else if(game.preview?.type==='deck')drawDeck();else if(game.preview?.type==='guide')drawGuide();
 renderCardInspector();
 if(game.ended)drawResult();
 requestAnimationFrame(draw);
}
function demoAnimations(){
 if(game.preview||game.ended)return;
 const showcase=[
  {kind:'strike',source:1,target:4,delay:0},
  {kind:'heal',source:2,target:0,delay:1700},
  {kind:'area',source:0,target:5,delay:3400},
  {kind:'enemy',source:6,target:3,delay:5300}
 ];
 showcase.forEach(c=>window.MoonfallScene?.cue?.(c));
 announce('Animation demo: sword attack, spellcasting, area magic, and enemy strike. No health is changed.');
}
function aliveEnemy(){return game.foes.findIndex(e=>e.hp>0)}
function aliveAlly(){return game.allies.findIndex(a=>a.hp>0)}
function markFx(target,words,color,team='enemy'){game.fx.push({target,words,color,team,start:performance.now()})}
function actionCue(kind,source,target,delay=0){return window.MoonfallScene?.cue?.({kind,source,target,delay})}
function shuffle(arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr}
function drawToFive(){while(game.hand.length<5){if(!game.draw.length){if(!game.discard.length)break;game.draw=shuffle(game.discard);game.discard=[]}game.hand.push(game.draw.shift())}game.handScroll=0}
function selectCard(slot){if(slot<0||slot>=game.hand.length||game.ended)return;game.preview={type:'card',index:game.hand[slot],slot,readonly:false};announce('Card selected. Read its ability, then choose Play Card or Keep in Hand.')}
function targetDamage(target,damage){const foe=game.foes[target];if(!foe||foe.hp<=0)return;foe.hp=Math.max(0,foe.hp-damage);markFx(target,'−'+damage,THEME.red);if(foe.hp===0){announce(foe.name+' defeated!');if(game.selectedEnemy===target)game.selectedEnemy=aliveEnemy()}}
function winCheck(){if(game.foes.every(f=>f.hp<=0)){game.ended='win';announce('Victory! All three enemies defeated.')}else if(game.allies.every(a=>a.hp<=0)){game.ended='lost';announce('Defeat. Try another strategy.')}}
function play(){
 if(game.preview?.type!=='card'||game.ended||isResolving())return;
 const {index,slot}=game.preview,c=CARDS[index];
 if(!c||game.hand[slot]!==index)return;
 if(game.energy<c.cost){announce('Not enough energy. End your turn to refill.');return}
 game.energy-=c.cost;game.hand.splice(slot,1);game.discard.push(index);game.preview=null;
 if(c.kind==='attack'){
  const target=game.foes[game.selectedEnemy]?.hp>0?game.selectedEnemy:aliveEnemy();
  if(target>=0)impactCue(index===0?'strike':'bolt',1,4+target,()=>{
   targetDamage(target,c.amount);
   if(index===0&&game.foes[target].hp===0){
    game.energy=Math.min(game.maxEnergy,game.energy+1);
    announce('Enemy defeated! Shadow Step refunded 1 energy.');
   }
   winCheck();
  });
 }else if(c.kind==='area'){
  game.foes.forEach((foe,i)=>{
   if(foe.hp<=0)return;
   impactCue('area',0,4+i,()=>{
    if(foe.hp<=0)return;
    foe.burn=20;foe.burnTurns=2;targetDamage(i,c.amount);winCheck();
   },i*75);
  });
 }else if(c.kind==='defend'){
  impactCue('defend',0,0,()=>{
   game.allies.forEach((a,i)=>{if(a.hp>0){a.shield+=c.amount;markFx(i,'+'+c.amount+' SHIELD','#e8d09a','ally')}});
   announce('The party gained '+c.amount+' shield each.');
  });
 }else if(c.kind==='heal'){
  const target=game.allies[game.selectedAlly]?.hp>0?game.selectedAlly:aliveAlly();
  if(target>=0)impactCue('heal',2,target,()=>{
   const a=game.allies[target];
   if(a.hp<=0)return;
   const healed=Math.min(c.amount,a.maxHp-a.hp);
   a.hp+=healed;markFx(target,'+'+healed,THEME.green,'ally');
   announce(a.name+' healed '+healed+' HP.');
  });
 }
 if(!game.ended)announce(c.name+' — casting…');
}
function resolveEnemyAttacks(){
 if(game.foes.every(f=>f.hp<=0)){winCheck();return}
 let hits=0,blocked=0;
 // Predict each strike in sequence, so later enemies retarget if a prior strike
 // will defeat an ally. Animation targets match the eventual gameplay targets.
 const projected=game.allies.map(a=>({hp:a.hp,shield:a.shield}));
 for(let i=0;i<game.foes.length;i++){
  const foe=game.foes[i];
  if(foe.hp<=0)continue;
  const targetIds=projected.map((a,j)=>a.hp>0?j:-1).filter(j=>j>=0);
  if(!targetIds.length)break;
  const target=targetIds[(game.turn+i)%targetIds.length];
  const dmg=foe.attack+Math.min(18,(game.turn-1)*4);
  const predictedBlock=Math.min(projected[target].shield,dmg);
  projected[target].shield-=predictedBlock;
  projected[target].hp=Math.max(0,projected[target].hp-(dmg-predictedBlock));
  impactCue('enemy',4+i,target,()=>{
   const ally=game.allies[target];
   if(ally.hp<=0||foe.hp<=0)return;
   const block=Math.min(ally.shield,dmg);
   ally.shield-=block;ally.hp=Math.max(0,ally.hp-(dmg-block));
   hits+=dmg-block;blocked+=block;
   if(dmg>block)markFx(target,'−'+(dmg-block),THEME.red,'ally');
   winCheck();
  },i*210);
 }
 afterImpacts=()=>{
  if(game.ended)return;
  game.discard.push(...game.hand);game.hand=[];
  game.turn++;game.maxEnergy=Math.min(5,3+Math.floor((game.turn-1)/2));
  game.energy=game.maxEnergy;drawToFive();
  announce('Enemies dealt '+hits+' damage; shields blocked '+blocked+'. Your hand is refilled.');
 };
}
function endTurn(){
 if(game.ended||game.preview||isResolving())return;
 const burning=game.foes.map((foe,i)=>({foe,i})).filter(({foe})=>foe.hp>0&&foe.burnTurns>0);
 if(!burning.length){resolveEnemyAttacks();return}
 for(const {foe,i} of burning){
  impactCue('burn',0,4+i,()=>{
   if(foe.hp<=0)return;
   foe.hp=Math.max(0,foe.hp-foe.burn);foe.burnTurns--;
   markFx(i,'BURN −'+foe.burn,'#ffc596');
  },i*95);
 }
 afterImpacts=()=>{winCheck();if(!game.ended)resolveEnemyAttacks()};
 announce('Burn damage resolving…');
}
function insidePolygon(x,y,points){
 let inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[i],b=points[j];
  if(((a.y>y)!==(b.y>y))&&(x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x))inside=!inside;
 }
 return inside;
}
function chooseAction(x,y){
 return [...zones].reverse().find(t=>t.enabled&&(t.polygon?insidePolygon(x,y,t.polygon):
    x>=t.x&&x<=t.x+t.w&&y>=t.y&&y<=t.y+t.h))||null;
}
window.__moonfallHitTest=(x,y)=>{const z=chooseAction(x,y);return z?{action:z.action,meta:z.meta}:null};
window.__moonfallPreviewSize=()=>({width:419*(2/3),height:419});
window.__moonfallFanLayout=()=>handLayout().map(c=>({slot:c.slot,card:CARDS[game.hand[c.slot]]?.id,x:c.x,y:c.y,w:c.w,h:c.h,angle:c.angle,polygon:cardPolygon(c)}));
window.__moonfallTestState=()=>({models:window.MoonfallScene?.getStats?.()||null,turn:game.turn,energy:game.energy,maxEnergy:game.maxEnergy,hand:[...game.hand],draw:[...game.draw],discard:[...game.discard],preview:game.preview?.type||null,selectedEnemy:game.selectedEnemy,selectedAlly:game.selectedAlly,allies:game.allies.map(a=>({hp:a.hp,shield:a.shield})),foes:game.foes.map(f=>({hp:f.hp,burnTurns:f.burnTurns})),ended:game.ended,pendingImpacts:pendingImpacts.length,resolving:isResolving(),previewCard:game.preview?.type==='card'?CARDS[game.preview.index].id:null});
function activate(z){if(!z)return;
 if(game.ended){if(z.action==='restart'){clearImpacts();game=freshGame();game.draw=game.draw.slice(5);window.MoonfallScene?.reset?.();announce('New battle started.');}return}
 if(isResolving()&&z.action!=='restart')return;
 if(game.preview){
  switch(z.action){
   case 'close':game.preview=null;return;
   case 'play':play();return;
   case 'backdeck':game.preview={type:'deck'};return;
   case 'deckcard':game.preview={type:'card',index:z.meta,readonly:true};return;
   case 'restart':clearImpacts();game=freshGame();game.draw=game.draw.slice(5);window.MoonfallScene?.reset?.();return;
  }
  return;
 }
 switch(z.action){
  case 'ally':game.selectedAlly=z.meta;announce('Healing target: '+game.allies[z.meta].name+'.');break;
  case 'enemy':game.selectedEnemy=z.meta;announce('Attack target: '+game.foes[z.meta].name+'.');break;
  case 'card':selectCard(z.meta);break;
  case 'deck':game.preview={type:'deck'};game.history='deck';announce('Your deck is open. Tap a card to inspect it.');break;
  case 'discard':game.preview={type:'deck'};game.history='discard';announce('Discard pile opened.');break;
  case 'end':endTurn();break;
  case 'restart':clearImpacts();game=freshGame();game.draw=game.draw.slice(5);window.MoonfallScene?.reset?.();announce('New battle started.');break;
  case 'motionDemo':demoAnimations();break;
  case 'guide':game.preview={type:'guide'};break;
 }
}
function xy(event){const box=canvas.getBoundingClientRect();return {x:(event.clientX-box.left)/box.width*W,y:(event.clientY-box.top)/box.height*H}}
canvas.addEventListener('pointerdown',e=>{const p=xy(e);pointer={id:e.pointerId,x:p.x,y:p.y,scroll:game.handScroll,moved:false};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{const p=xy(e);if(pointer&&pointer.id===e.pointerId){const dx=p.x-pointer.x,dy=p.y-pointer.y;if(Math.abs(dx)>13&&pointer.y>=480&&pointer.y<800&&pointer.x>=280&&pointer.x<1325){pointer.moved=true;const total=194+Math.max(0,game.hand.length-1)*(game.hand.length<=5?148:120),visible=980,max=Math.max(0,total-visible);game.handScroll=Math.max(0,Math.min(max,pointer.scroll-dx));return}}
 const zone=chooseAction(p.x,p.y);game.hover=zone?.action==='card'?zone.meta:-1;});
canvas.addEventListener('pointerup',e=>{if(!pointer||pointer.id!==e.pointerId)return;const p=xy(e);const moved=pointer.moved;pointer=null;if(!moved)activate(chooseAction(p.x,p.y));});
canvas.addEventListener('pointercancel',()=>pointer=null);
canvas.addEventListener('wheel',e=>{const r=canvas.getBoundingClientRect();const p=xy(e);if(!game.preview&&p.y>475&&p.x>273&&p.x<1330){e.preventDefault();const max=Math.max(0,194+Math.max(0,game.hand.length-1)*(game.hand.length<=5?148:120)-980);game.handScroll=Math.max(0,Math.min(max,game.handScroll+e.deltaY+e.deltaX))}},{passive:false});
window.addEventListener('keydown',e=>{
 if(e.key==='Escape'){game.preview=null;return}
 if(isResolving())return;
 if(game.ended){if(e.key==='Enter'){clearImpacts();game=freshGame();game.draw=game.draw.slice(5);window.MoonfallScene?.reset?.()}return}
 if(game.preview){if(e.key==='Enter'&&game.preview.type==='card'&&!game.preview.readonly)play();return}
 if(/^([1-9])$/.test(e.key)){selectCard(Number(e.key)-1);return}
 if(e.key.toLowerCase()==='e'){endTurn();return}
 if(e.key.toLowerCase()==='h'){game.preview={type:'guide'};return}
 if(e.key.toLowerCase()==='m'){demoAnimations();return}
 });
function configureResolution(){
 const box=canvas.getBoundingClientRect();
 const scale=Math.min(1.65,Math.max(1,(window.devicePixelRatio||1)*box.width/W));
 const bw=Math.round(W*scale),bh=Math.round(H*scale);
 if(canvas.width!==bw||canvas.height!==bh){canvas.width=bw;canvas.height=bh;}
 ctx.setTransform(bw/W,0,0,bh/H,0,0);
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
}
window.addEventListener('resize',()=>requestAnimationFrame(configureResolution));
window.addEventListener('orientationchange',()=>requestAnimationFrame(configureResolution));
let started=false;
function start(){if(started)return;started=true;configureResolution();loading.classList.add('hidden');
 try{if(localStorage.getItem('arcana-slice-guide-v1')!=='done'){game.preview={type:'guide'};localStorage.setItem('arcana-slice-guide-v1','done')}}catch{}
 requestAnimationFrame(draw)}
let assetsSettled=0;
function settleAsset(){if(++assetsSettled>=artwork.length)start()}
for(const img of artwork){
 if(img.complete)settleAsset();
 else{img.addEventListener('load',settleAsset,{once:true});img.addEventListener('error',settleAsset,{once:true})}
}
const fsButton=document.getElementById('fullscreenButton');
const fsHint=document.getElementById('fullscreenHint');
fsButton.addEventListener('click',async()=>{
 if(document.fullscreenElement){try{await document.exitFullscreen()}catch{}return}
 try{
   if(typeof document.getElementById('gameShell').requestFullscreen==='function'){
     await document.getElementById('gameShell').requestFullscreen({navigationUI:'hide'});
     if(screen.orientation?.lock)screen.orientation.lock('landscape').catch(()=>{});
     return;
   }
 }catch{}
 fsHint.hidden=false;
 announce('iPhone fullscreen: Share → Add to Home Screen, then open Moonfall from its icon.');
});
document.getElementById('dismissFullscreenHint').addEventListener('click',()=>fsHint.hidden=true);
document.addEventListener('fullscreenchange',()=>{
 fsButton.textContent=document.fullscreenElement?'⛶ EXIT FULLSCREEN':'⛶ FULLSCREEN';
 configureResolution();
});
document.getElementById('portraitContinue').addEventListener('click',()=>document.getElementById('orientationPanel').classList.add('dismissed'));
})();
