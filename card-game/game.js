(()=>{'use strict';
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d',{alpha:false});
const messageNode=document.getElementById('announcer');
const loading=document.getElementById('loadMessage');
const atlas=new Image();atlas.decoding='async';atlas.src='assets/atlas.webp?v=moonfall-1';
const W=1600,H=800,THEME={gold:'#f1d4a1',cream:'#f7e7d0',muted:'#bac0cb',blue:'#a6cbff',red:'#ef8799',green:'#9be3b6'};
const CARDS=[
 {id:'shadow',name:'Shadow Step',rarity:'Rare',cost:1,kind:'attack',description:'Deal 135 damage to your selected enemy. If this defeats it, regain 1 energy.',amount:135,flavor:'Disappear into the night. Return as a blade.',symbol:'✧',hue:'#c4a6ff'},
 {id:'aegis',name:'Guardian Aegis',rarity:'Epic',cost:2,kind:'defend',description:'Give every surviving ally 70 shield, blocking incoming enemy damage.',amount:70,flavor:'Even the moon cannot pierce this ward.',symbol:'⬡',hue:'#e8d09a'},
 {id:'bloom',name:'Crimson Bloom',rarity:'Legendary',cost:3,kind:'area',description:'Deal 95 damage to all living enemies. Apply 20 burn for two turns.',amount:95,flavor:'Let the scarlet petals fall.',symbol:'✿',hue:'#ffbaaf'},
 {id:'healing',name:'Healing Wind',rarity:'Rare',cost:2,kind:'heal',description:'Restore 100 health to your selected ally, up to their maximum.',amount:100,flavor:'A soft wind follows the fallen.',symbol:'✳',hue:'#aae6c3'},
 {id:'bolt',name:'Arcane Bolt',rarity:'Common',cost:1,kind:'attack',description:'Deal 115 lightning damage to the selected enemy.',amount:115,flavor:'A spark can shatter the darkness.',symbol:'ϟ',hue:'#a6bbff'}
];
const ALLIES=[
 {name:'Seraphine',maxHp:190,x:126},{name:'Akari',maxHp:180,x:345},{name:'Elowen',maxHp:185,x:540},{name:'Kael',maxHp:195,x:718}
];
const FOES=[
 {name:'Dusk Reaper',maxHp:250,x:1105,attack:34},{name:'Blood Oracle',maxHp:300,x:1305,attack:39},{name:'Night Knight',maxHp:340,x:1500,attack:44}
];
function freshGame(){return {
 allies:ALLIES.map(x=>({...x,hp:x.maxHp,shield:0})),foes:FOES.map(x=>({...x,hp:x.maxHp,burn:0,burnTurns:0})),
 turn:1,energy:3,maxEnergy:3,draw:[0,1,2,3,4,1,0,4,2,3,0,4,1,2,4,3,0,1],discard:[],hand:[0,1,2,3,4],
 selectedEnemy:0,selectedAlly:0,preview:null,history:null,ended:false,guide:false,handScroll:0,
 toast:'Tap a card to inspect it, then choose PLAY CARD.',toastAt:performance.now(),fx:[],lastEffect:null,hover:-1,
 initial:true};}
let game=freshGame();game.draw=game.draw.slice(5);
const zones=[];
let pointer=null;
function announce(s){game.toast=s;game.toastAt=performance.now();messageNode.textContent=s}
function rr(x,y,w,h,r,fill,stroke,sw=1){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=sw;ctx.stroke()}}
function text(s,x,y,size,color=THEME.cream,font='system-ui',align='left',weight='600'){
 ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.font=`${weight} ${size}px ${font}`;ctx.fillText(String(s),x,y);
}
function gradient(x,y,w,h,stops){const g=ctx.createLinearGradient(x,y,x,y+h);for(const [p,col] of stops)g.addColorStop(p,col);return g}
function line(x,y,w,color='#a99474',size=1){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.lineWidth=size;ctx.strokeStyle=color;ctx.stroke()}
function register(x,y,w,h,action,meta,enabled=true){zones.push({x,y,w,h,action,meta,enabled})}
function glow(x,y,r,color){const g=ctx.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}
function pill(s,x,y,w,h,fill='#161826e9',stroke='#c9a97d',sz=17){rr(x,y,w,h,7,fill,stroke,1.5);text(s,x+w/2,y+h/2,sz,THEME.cream,'system-ui','center','750')}
function hpBar(x,y,w,h,amount,total,friend){rr(x,y,w,h,2,'#111621db','#736968',1);
 const ratio=Math.max(0,Math.min(1,amount/total));
 if(ratio>0)rr(x+2,y+2,Math.max(0,(w-4)*ratio),h-4,1,gradient(x,y,w,h,friend?[[0,'#8feaaf'],[1,'#257b72']]:[[0,'#ffa2a4'],[1,'#a03960']]));
}
function drawHeader(){
 rr(0,0,W,72,0,gradient(0,0,0,72,[[0,'#141726fa'],[1,'#131a29e8']]));
 line(0,70,W,'#bf9c76a6',2);
 text('✧',31,36,42,THEME.gold,'Georgia');text('ARCANA',75,34,32,THEME.cream,'Georgia','left','700');
 text('DUEL',226,34,32,THEME.gold,'Georgia');
 text('MOONFALL  ·  NEW BATTLE BUILD',405,37,18,'#d1d4df','system-ui','left','650');
 pill(`TURN ${game.turn}`,841,16,147,41,'#241d2ce8','#d2af88',21);
 const live=game.foes.filter(f=>f.hp>0).length;
 pill(`${live} ENEMIES`,1010,16,169,41,'#1c1a27e8','#ba8492',17);
 pill('↺ RESTART',1213,16,172,41,'#221d2be8','#a28b84',16);
 pill('HOW TO PLAY  ?',1400,16,178,41,'#332b38ee','#e0c18b',15);
 register(1213,16,172,41,'restart');register(1400,16,178,41,'guide');
}
function scene(){
 ctx.fillStyle='#171b2b';ctx.fillRect(0,72,W,415);
 if(atlas.complete&&atlas.naturalWidth>0){ctx.drawImage(atlas,0,0,960,228,0,73,W,418)}
 else{const g=gradient(0,72,W,418,[[0,'#303546'],[1,'#0e1420']]);ctx.fillStyle=g;ctx.fillRect(0,72,W,418)}
 const shade=gradient(0,325,W,168,[[0,'#0c102600'],[1,'#070a15f5']]);ctx.fillStyle=shade;ctx.fillRect(0,325,W,168);
 for(let i=0;i<4;i++){
   const a=game.allies[i],x=a.x;
   const isSelected=i===game.selectedAlly;
   if(isSelected){glow(x,390,78,'#6fc8ac45');rr(x-87,373,174,7,3,'#e3e0bc','#d0caac',1)}
   rr(x-94,398,188,61,6,'#0a1322ef',isSelected?'#f1d39f':'#7f858fc4',isSelected?2:1);
   text(a.name,x,412,16,THEME.cream,'Georgia','center','600');
   hpBar(x-80,427,160,13,a.hp,a.maxHp,true);
   text(`${a.hp} / ${a.maxHp}`,x,450,13,'#daefdc','system-ui','center','700');
   if(a.shield>0)text(`◆ ${a.shield}`,x+85,414,13,'#b9d8ff','system-ui','right');
   if(a.hp<=0){rr(x-94,398,188,61,6,'#080a14a8');text('FALLEN',x,433,20,THEME.red,'Georgia','center')}
   register(x-92,175,184,279,'ally',i,a.hp>0);
 }
 for(let i=0;i<3;i++){
   const e=game.foes[i],x=e.x,sel=i===game.selectedEnemy;
   if(sel&&e.hp>0){glow(x,364,105,'#efb47877');rr(x-95,376,190,6,3,'#f5daa3','#f5d8a4',2)}
   rr(x-98,398,196,61,6,sel?'#241427f5':'#151421ee',sel?'#f3d191':'#a17d88',sel?2.5:1);
   text(e.name,x,412,16,THEME.cream,'Georgia','center');
   hpBar(x-83,427,166,13,e.hp,e.maxHp,false);
   text(`${e.hp} / ${e.maxHp}`,x,449,13,'#ffe3e4','system-ui','center','700');
   if(e.burnTurns>0)text('🔥',x+79,414,16,THEME.gold,'system-ui','right');
   if(e.hp<=0){rr(x-98,398,196,61,6,'#090a14bf');text('DEFEATED',x,432,18,'#ffc1a4','Georgia','center')}
   register(x-93,153,186,304,'enemy',i,e.hp>0);
 }
 text('TAP AN ENEMY TO TARGET',1305,480,14,'#ffdcac','system-ui','center','800');
}
function cardFrame(index,slot,x,y,w,h,large=false){
 const c=CARDS[index];const active=game.energy>=c.cost;
 ctx.save();ctx.shadowColor=(slot===game.hover?'#f7dc98':'#000a');ctx.shadowBlur=slot===game.hover?22:12;
 rr(x,y,w,h,11,gradient(x,y,w,h,[[0,'#dfc48d'],[.32,'#4e4b72'],[1,'#d5ac78']]),slot===game.hover?'#fff2ca':'#dcbb81',3);ctx.restore();
 rr(x+6,y+6,w-12,h-12,7,'#161624','#726277',1);
 rr(x+10,y+12,w-20,h-24,6,gradient(x+10,y,w-20,h,[[0,'#3b324b'],[1,'#171727']]));
 if(atlas.complete&&atlas.naturalWidth>0)ctx.drawImage(atlas,8+190*index,236,176,194,x+12,y+39,w-24,h-105);
 else{glow(x+w/2,y+125,70,c.hue);text(c.symbol,x+w/2,y+120,64,c.hue,'Georgia','center')}
 rr(x+14,y+12,39,37,20,'#27213e','#f9d8aa',2);
 text(c.cost,x+34,y+31,25,THEME.cream,'Georgia','center','700');
 text(c.rarity.toUpperCase(),x+w-16,y+24,11,'#fbe0bb','system-ui','right','900');
 rr(x+10,y+h-66,w-20,54,5,'#151424ee','#ab896c80',1);
 text(c.name,x+w/2,y+h-49,large?23:17,THEME.cream,'Georgia','center');
 text(c.kind.toUpperCase()+'  ·  '+c.cost+' ENERGY',x+w/2,y+h-24,large?13:11,c.hue,'system-ui','center','800');
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
function drawTable(now){
 ctx.fillStyle=gradient(0,488,W,312,[[0,'#262337'],[.4,'#161827'],[1,'#0d111d']]);ctx.fillRect(0,488,W,312);
 line(0,487,W,'#e4ba81',3);
 const shadow=gradient(0,500,W,240,[[0,'#0000'],[1,'#0006']]);ctx.fillStyle=shadow;ctx.fillRect(0,500,W,300);
 text('YOUR HAND',306,510,20,THEME.gold,'system-ui','left','900');
 text('TAP TO INSPECT  ·  SWIPE TO BROWSE',483,510,15,'#c7bcc8');
 text('✧',37,518,30,'#d3b6fb','Georgia');text('ENERGY',74,507,16,'#ddd3df','system-ui','left','900');
 text(`${game.energy} / ${game.maxEnergy}`,74,534,26,THEME.cream,'Georgia');
 for(let i=0;i<game.maxEnergy;i++){ctx.fillStyle=i<game.energy?'#aee7f9':'#333950';ctx.beginPath();ctx.moveTo(83+i*28,548);ctx.lineTo(92+i*28,560);ctx.lineTo(83+i*28,572);ctx.lineTo(74+i*28,560);ctx.closePath();ctx.fill()}
 cardBack(45,603,105,124,'DECK',game.draw.length);
 cardBack(166,603,93,124,'DISCARD',game.discard.length);
 register(42,577,109,180,'deck');register(162,577,104,180,'discard');
 // Clip the card row so it never overlaps the End Turn button.
 ctx.save();ctx.beginPath();ctx.rect(278,524,1035,254);ctx.clip();
 for(let i=0;i<game.hand.length;i++){
   const x=297+i*198-game.handScroll, y=533+(game.hover===i?-9:0);
   if(x>1330||x+174<278)continue;
   cardFrame(game.hand[i],i,x,y,174,238);
   register(x,533,174,238,'card',i);
 }
 ctx.restore();
 ctx.save();ctx.shadowColor='#f0b57178';ctx.shadowBlur=24;
 rr(1370,576,181,112,20,gradient(1370,576,181,112,[[0,'#4a3142'],[1,'#281928']]),'#edbe83',3);
 ctx.restore();
 text('END TURN',1460,622,30,THEME.cream,'Georgia','center','600');
 text('→',1460,666,27,THEME.gold,'Georgia','center');
 text('Enemy moves next',1460,714,17,'#d4c0b5','system-ui','center');
 register(1364,571,195,131,'end');
 const age=now-game.toastAt;
 rr(315,771,945,25,5,'#171b2ce7');
 text(game.toast,788,784,16,age<8000?'#eed5ad':'#a7a0ad','system-ui','center','650');
}
function wrap(value,x,y,maxW,sz=24,color=THEME.cream,lineHeight=35){const words=value.split(' ');let line='';let row=0;ctx.font=`600 ${sz}px system-ui`;for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>maxW&&line){text(line,x,y+row*lineHeight,sz,color);line=word;row++}else line=next}if(line)text(line,x,y+row*lineHeight,sz,color);return row+1}
function overlayFrame(title,sub){ctx.fillStyle='#070a15d9';ctx.fillRect(0,0,W,H);rr(245,95,1110,615,18,gradient(245,95,1110,615,[[0,'#2c2739'],[1,'#121727']]),'#d7b68b',3);text(title,300,142,36,THEME.cream,'Georgia');if(sub)text(sub,300,183,18,'#cbbdcb');pill('✕ CLOSE',1132,112,180,51,'#2a2b3b','#bca17c',19);register(1132,112,180,51,'close')}
function drawPreview(){
 const idx=game.preview.index,c=CARDS[idx];
 overlayFrame('CARD DETAILS','Inspect first. Playing is always a separate decision.');
 cardFrame(idx,-1,304,208,283,419,true);
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
function drawParticles(now){game.fx=game.fx.filter(f=>now-f.start<850);for(const f of game.fx){const t=(now-f.start)/850;const alpha=1-t;const p=game.foes[f.target];const x=p?.x||800, y=260-(t*95);ctx.save();ctx.globalAlpha=alpha;glow(x,y,55,f.color+'99');text(f.words,x,y,38,f.color,'Georgia','center','700');ctx.restore()}}
let lastSnapshotAt=0;
function draw(now=performance.now()){
 if(now-lastSnapshotAt>100){
   canvas.dataset.turn=String(game.turn);canvas.dataset.energy=String(game.energy);
   canvas.dataset.hand=String(game.hand.length);canvas.dataset.preview=game.preview?.type||'none';
   canvas.dataset.foes=game.foes.map(x=>x.hp).join(',');canvas.dataset.allies=game.allies.map(x=>x.hp).join(',');
   canvas.dataset.phase=game.ended||'playing';lastSnapshotAt=now;
 }
 zones.length=0;ctx.clearRect(0,0,W,H);scene();drawHeader();drawTable(now);drawParticles(now);
 if(game.preview?.type==='card')drawPreview();else if(game.preview?.type==='deck')drawDeck();else if(game.preview?.type==='guide')drawGuide();
 if(game.ended)drawResult();
 requestAnimationFrame(draw);
}
function aliveEnemy(){return game.foes.findIndex(e=>e.hp>0)}
function aliveAlly(){return game.allies.findIndex(a=>a.hp>0)}
function markFx(target,words,color){game.fx.push({target,words,color,start:performance.now()})}
function shuffle(arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr}
function drawToFive(){while(game.hand.length<5){if(!game.draw.length){if(!game.discard.length)break;game.draw=shuffle(game.discard);game.discard=[]}game.hand.push(game.draw.shift())}game.handScroll=0}
function selectCard(slot){if(slot<0||slot>=game.hand.length||game.ended)return;game.preview={type:'card',index:game.hand[slot],slot,readonly:false};announce('Card selected. Read its ability, then choose Play Card or Keep in Hand.')}
function targetDamage(target,damage){const foe=game.foes[target];if(!foe||foe.hp<=0)return;foe.hp=Math.max(0,foe.hp-damage);markFx(target,'−'+damage,THEME.red);if(foe.hp===0){announce(foe.name+' defeated!');if(game.selectedEnemy===target)game.selectedEnemy=aliveEnemy()}}
function winCheck(){if(game.foes.every(f=>f.hp<=0)){game.ended='win';announce('Victory! All three enemies defeated.')}else if(game.allies.every(a=>a.hp<=0)){game.ended='lost';announce('Defeat. Try another strategy.')}}
function play(){if(game.preview?.type!=='card'||game.ended)return;const {index,slot}=game.preview,c=CARDS[index];if(!c||game.hand[slot]!==index)return;if(game.energy<c.cost){announce('Not enough energy. End your turn to refill.');return}game.energy-=c.cost;game.hand.splice(slot,1);game.discard.push(index);game.preview=null;
 if(c.kind==='attack'){
   const target=game.foes[game.selectedEnemy]?.hp>0?game.selectedEnemy:aliveEnemy();
   if(target>=0){targetDamage(target,c.amount);if(index===0&&game.foes[target].hp===0){game.energy=Math.min(game.maxEnergy,game.energy+1);announce('Enemy defeated! Shadow Step refunded 1 energy.')}}
 }else if(c.kind==='area'){
   game.foes.forEach((foe,i)=>{if(foe.hp>0){foe.burn=20;foe.burnTurns=2;targetDamage(i,c.amount)}});
 }else if(c.kind==='defend'){
   game.allies.filter(a=>a.hp>0).forEach(a=>a.shield+=c.amount);
   announce('The party gained 70 shield each.');
 }else if(c.kind==='heal'){
   const target=game.allies[game.selectedAlly]?.hp>0?game.selectedAlly:aliveAlly();
   if(target>=0){const a=game.allies[target];const heal=Math.min(c.amount,a.maxHp-a.hp);a.hp+=heal;announce(a.name+' healed '+heal+' HP.');}
 }
 if(!game.ended&&c.kind==='attack'&&index!==0)announce(c.name+' dealt '+c.amount+' damage.');
 winCheck();
}
function endTurn(){if(game.ended||game.preview)return;
 for(const [i,foe] of game.foes.entries()){
   if(foe.hp<=0)continue;
   if(foe.burnTurns>0){foe.hp=Math.max(0,foe.hp-foe.burn);foe.burnTurns--;markFx(i,'BURN −'+foe.burn,'#ffc596')}
 }
 if(game.foes.every(f=>f.hp===0)){winCheck();return}
 let hits=0,blocked=0;
 for(let i=0;i<game.foes.length;i++){
   const foe=game.foes[i];if(foe.hp<=0)continue;
   const targets=game.allies.map((a,j)=>a.hp>0?j:-1).filter(j=>j>=0);
   if(!targets.length)break;
   const ally=game.allies[targets[(game.turn+i)%targets.length]];
   const dmg=foe.attack+Math.min(18,(game.turn-1)*4);
   const block=Math.min(ally.shield,dmg);
   ally.shield-=block;ally.hp=Math.max(0,ally.hp-(dmg-block));hits+=dmg-block;blocked+=block;
 }
 winCheck();if(game.ended)return;
 game.discard.push(...game.hand);game.hand=[];
 game.turn++;game.maxEnergy=Math.min(5,3+Math.floor((game.turn-1)/2));game.energy=game.maxEnergy;drawToFive();
 announce('Enemies dealt '+hits+' damage; shields blocked '+blocked+'. Your hand is refilled.');
}
function chooseAction(x,y){const z=[...zones].reverse().find(t=>t.enabled&&x>=t.x&&x<=t.x+t.w&&y>=t.y&&y<=t.y+t.h);return z||null}
window.__moonfallTestState=()=>({turn:game.turn,energy:game.energy,maxEnergy:game.maxEnergy,hand:[...game.hand],draw:[...game.draw],discard:[...game.discard],preview:game.preview?.type||null,selectedEnemy:game.selectedEnemy,selectedAlly:game.selectedAlly,allies:game.allies.map(a=>({hp:a.hp,shield:a.shield})),foes:game.foes.map(f=>({hp:f.hp,burnTurns:f.burnTurns})),ended:game.ended});
function activate(z){if(!z)return;
 if(game.ended){if(z.action==='restart'){game=freshGame();game.draw=game.draw.slice(5);announce('New battle started.');}return}
 if(game.preview){
  switch(z.action){
   case 'close':game.preview=null;return;
   case 'play':play();return;
   case 'backdeck':game.preview={type:'deck'};return;
   case 'deckcard':game.preview={type:'card',index:z.meta,readonly:true};return;
   case 'restart':game=freshGame();game.draw=game.draw.slice(5);return;
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
  case 'restart':game=freshGame();game.draw=game.draw.slice(5);announce('New battle started.');break;
  case 'guide':game.preview={type:'guide'};break;
 }
}
function xy(event){const box=canvas.getBoundingClientRect();return {x:(event.clientX-box.left)/box.width*W,y:(event.clientY-box.top)/box.height*H}}
canvas.addEventListener('pointerdown',e=>{const p=xy(e);pointer={id:e.pointerId,x:p.x,y:p.y,scroll:game.handScroll,moved:false};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{const p=xy(e);if(pointer&&pointer.id===e.pointerId){const dx=p.x-pointer.x,dy=p.y-pointer.y;if(Math.abs(dx)>13&&pointer.y>=520&&pointer.y<775&&pointer.x>=275&&pointer.x<1325){pointer.moved=true;const total=game.hand.length*198,visible=1034,max=Math.max(0,total-visible);game.handScroll=Math.max(0,Math.min(max,pointer.scroll-dx));return}}
 const zone=chooseAction(p.x,p.y);game.hover=zone?.action==='card'?zone.meta:-1;});
canvas.addEventListener('pointerup',e=>{if(!pointer||pointer.id!==e.pointerId)return;const p=xy(e);const moved=pointer.moved;pointer=null;if(!moved)activate(chooseAction(p.x,p.y));});
canvas.addEventListener('pointercancel',()=>pointer=null);
canvas.addEventListener('wheel',e=>{const r=canvas.getBoundingClientRect();const p=xy(e);if(!game.preview&&p.y>515&&p.x>273&&p.x<1330){e.preventDefault();const max=Math.max(0,game.hand.length*198-1034);game.handScroll=Math.max(0,Math.min(max,game.handScroll+e.deltaY+e.deltaX))}},{passive:false});
window.addEventListener('keydown',e=>{
 if(e.key==='Escape'){game.preview=null;return}
 if(game.ended){if(e.key==='Enter'){game=freshGame();game.draw=game.draw.slice(5)}return}
 if(game.preview){if(e.key==='Enter'&&game.preview.type==='card'&&!game.preview.readonly)play();return}
 if(/^([1-9])$/.test(e.key)){selectCard(Number(e.key)-1);return}
 if(e.key.toLowerCase()==='e'){endTurn();return}
 if(e.key.toLowerCase()==='h'){game.preview={type:'guide'};return}
 });
let started=false;
function start(){if(started)return;started=true;loading.classList.add('hidden');try{if(localStorage.getItem('arcana-slice-guide-v1')!=='done'){game.preview={type:'guide'};localStorage.setItem('arcana-slice-guide-v1','done')}}catch{}requestAnimationFrame(draw)}
atlas.addEventListener('load',start,{once:true});
if(atlas.complete&&atlas.naturalWidth>0)start();atlas.addEventListener('error',()=>{loading.textContent='Artwork unavailable: the battle can still be played.';setTimeout(()=>{loading.classList.add('hidden');requestAnimationFrame(draw)},1200)},{once:true});
document.getElementById('portraitContinue').addEventListener('click',()=>document.getElementById('orientationPanel').classList.add('dismissed'));
})();
