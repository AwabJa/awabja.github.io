import {characterArt} from './character-art.mjs';
import {CARDS,BY_ID,STARTER_DECK,STARTER_UNLOCKED,DECK_SIZE,PACK_PRICE,ENEMIES,
  newBattle,playCard,endTurn,nextEncounter,enemyIntent,canAdd,canRemove} from './engine.mjs';

const KEY='arcana-duel-v1';
const main=document.getElementById('gameMain');
const wallet=document.getElementById('walletAmount');
const battleTab=document.getElementById('battleTab');
const collectionTab=document.getElementById('collectionTab');
let screen='battle';
let notice='';
function initialSave(){return {unlocked:[...STARTER_UNLOCKED],deck:[...STARTER_DECK],shards:50,wins:0}}
function loadSave(){
  const fresh=initialSave();
  try{
    const raw=localStorage.getItem(KEY);if(!raw)return fresh;
    const data=JSON.parse(raw);
    if(!data||!Array.isArray(data.unlocked)||!Array.isArray(data.deck))return fresh;
    const unlocked=[...new Set(data.unlocked.filter(x=>typeof x==='string'&&BY_ID[x]))];
    if(!STARTER_UNLOCKED.every(x=>unlocked.includes(x)))return fresh;
    const deck=data.deck.filter(id=>typeof id==='string'&&unlocked.includes(id));
    if(deck.length>DECK_SIZE||new Set(deck).size===0||deck.some(id=>deck.filter(x=>x===id).length>3))return fresh;
    return {unlocked,deck,shards:Number.isSafeInteger(data.shards)&&data.shards>=0?Math.min(data.shards,1000000):fresh.shards,
      wins:Number.isSafeInteger(data.wins)&&data.wins>=0?data.wins:0};
  }catch{return fresh}
}
let progress=loadSave();
let battle=null;
function save(){
  try{localStorage.setItem(KEY,JSON.stringify(progress))}catch{notice='Storage is unavailable; progress may not persist.'}
}
function el(tag,klass,content){
  const node=document.createElement(tag);
  if(klass)node.className=klass;
  if(content!==undefined && content!==null)node.textContent=String(content);
  return node;
}
function add(parent,...nodes){for(const n of nodes){if(n)parent.appendChild(n)}return parent}
function button(label,action,kind='secondary',disabled=false,meta){
  const node=el('button',kind,label);
  node.type='button';node.dataset.action=action;node.disabled=disabled;
  if(meta!==undefined)node.dataset.value=String(meta);
  return node;
}
function label(text){return el('p','eyebrow',text)}
function heading(title,accent,subtitle){
  const block=el('div','heading-wrap');
  const titleEl=el('h1','heading',title+' ');
  titleEl.appendChild(el('em','',accent));
  add(block,titleEl,el('p','subheading',subtitle));return block;
}
function cardFace(card,playable,index,locked=false){
  const face=el(playable?'button':'article','card '+card.element+' '+card.rarity.toLowerCase()+(locked?' locked':''));
  if(playable){face.type='button';face.dataset.action='play';face.dataset.value=String(index);face.disabled=card.cost>battle.energy||battle.phase!=='playing';face.setAttribute('aria-label','Play '+card.name+', '+card.cost+' energy. '+card.text)}
  if(locked)face.setAttribute('aria-label','Locked card: '+card.name);
  const inner=el('div','card-inner');
  const top=el('div','card-top');add(top,el('span','card-cost',card.cost),el('span','card-rarity',card.rarity));
  const art=el('div','card-art');art.setAttribute('aria-hidden','true');art.appendChild(characterArt(card.id));art.appendChild(el('span','card-glyph',card.glyph));
  const name=el('strong','card-title',locked?'Undiscovered':card.name);
  const info=el('p','card-text',locked?'Unlock through card packs.':card.text);
  const bottom=el('div','card-bottom');add(bottom,el('span','',card.element),el('span','',card.type));
  add(inner,top,art,name,info,bottom);face.appendChild(inner);return face;
}
function progressBar(current,total,player=false){
  const bar=el('div','health-track');
  bar.setAttribute('role','progressbar');
  bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',String(total));
  bar.setAttribute('aria-valuenow',String(current));
  const fill=el('div','health-fill'+(player?' player':''));
  fill.style.width=(100*current/total)+'%';bar.appendChild(fill);return bar;
}
function stat(name,value){
  const line=el('div','stat-line');add(line,el('span','',name),el('strong','',value));return line;
}

function fighter(id,name,side,{hp,maxHp,shield,intent,leader=false}={}){
  const unit=el('div','fighter fighter-'+side+(leader?' fighter-leader':''));
  const figure=el('div','fighter-figure');
  figure.appendChild(characterArt(id));unit.appendChild(figure);
  const plate=el('div','fighter-plate');
  const title=el('strong','fighter-name',name);
  const line=el('div','fighter-life');
  if(Number.isFinite(hp)){
    const health=el('div','health-track fighter-health');
    health.setAttribute('role','progressbar');health.setAttribute('aria-valuemin','0');
    health.setAttribute('aria-valuemax',String(maxHp));health.setAttribute('aria-valuenow',String(hp));
    const bar=el('span','health-fill'+(side==='ally'?' player':''));
    bar.style.width=(hp/maxHp*100)+'%';health.appendChild(bar);
    add(line,el('span','',hp+' / '+maxHp),health);
  }else add(line,el('span','fighter-tag',side==='ally'?'ALLY · TEAM HEALTH':'SPECTRAL ECHO · VISUAL'));
  add(plate,title,line);
  if(shield)plate.appendChild(el('small','fighter-shield','◆ '+shield+' shield'));
  if(intent)plate.appendChild(el('small','fighter-intent','NEXT: '+intent));
  unit.appendChild(plate);
  return unit;
}
function renderBattle(){
  const shell=el('div','duel-shell');
  const header=el('div','duel-heading');
  const intro=el('div','duel-heading-left');
  add(intro,label('CHAPTER I  ·  THE SHATTERED CONSTELLATION'),el('h1','duel-title','The Hollow Cathedral'));
  const meta=el('div','duel-meta');
  add(meta,el('span','duel-stat','WAVE '+(battle.wave+1)+' / '+ENEMIES.length),
    el('span','duel-stat','TURN '+battle.turn));
  add(header,intro,meta);shell.appendChild(header);
  const arena=el('section','duel-arena');
  arena.setAttribute('aria-label','Battlefield: your party faces the enemy');
  const stageHead=el('div','stage-title');
  add(stageHead,el('span','','✦  '+ENEMIES[battle.wave].title),
    el('span','','TURN '+battle.turn));
  arena.appendChild(stageHead);
  const roster=el('div','duel-roster');
  const allies=el('div','duel-team duel-allies');
  add(allies,
    fighter('healer','Aurelia','ally',{hp:battle.hp,maxHp:battle.maxHp}),
    fighter('kitsune','Mika','ally'),
    fighter('ronin','Caelum','ally'),
    fighter('oracle','Luna','ally'));
  const enemies=el('div','duel-team duel-enemies');
  const foeIds=['wisp','stalker','queen'];
  const foeId=foeIds[battle.wave];
  const intent=enemyIntent(battle);
  const badge=el('div','enemy-name',ENEMIES[battle.wave].name);
  add(enemies,
    fighter('phantom','Shade','enemy'),
    fighter(foeId,ENEMIES[battle.wave].name,'enemy',{hp:battle.enemy.hp,maxHp:battle.enemy.maxHp,shield:battle.enemy.shield,intent:intent.label,leader:true}),
    fighter('empress','Echo','enemy'));
  const mark=el('div','duel-vs','✧');mark.setAttribute('aria-hidden','true');
  add(roster,allies,mark,enemies);arena.appendChild(roster);
  const status=el('div','duel-status');
  const hero=el('div','team-stat');
  add(hero,el('span','team-stat-icon','◈'),el('span','', 'HERO '+battle.hp+'/'+battle.maxHp+' HP'+(battle.shield?' · '+battle.shield+' SHIELD':'')));
  const enemy=el('div','team-stat enemy-stat');
  add(enemy,el('span','team-stat-icon','✦'),el('span','',ENEMIES[battle.wave].name+' '+battle.enemy.hp+'/'+battle.enemy.maxHp+' HP'));
  add(status,hero,enemy);arena.appendChild(status);
  shell.appendChild(arena);
  if(battle.phase!=='playing'){
    const result=el('section','duel-result result');
    const failed=battle.phase==='defeat',completed=battle.phase==='victory';
    add(result,el('div','result-glyph',failed?'☽':completed?'✷':'✦'),
      el('h2','',failed?'The stars fade':completed?'Legend Ascendant':'Trial complete'),
      el('p','',failed?'Your party has fallen. Rearrange your deck and try again.':completed?'All three trials cleared. Your rewards have been added to the collection.':'You defeated '+ENEMIES[battle.wave].name+'. You recover 10 HP before the next battle.'));
    const controls=el('div','result-actions');
    if(battle.phase==='cleared')controls.appendChild(button('Continue to next trial','next','primary'));
    controls.appendChild(button('Restart run','restart','secondary'));
    controls.appendChild(button('Edit deck','collection','secondary'));
    result.appendChild(controls);shell.appendChild(result);main.appendChild(shell);return;
  }
  const command=el('div','duel-command');
  const support=el('div','duel-hero');
  const avatar=el('div','duel-avatar');avatar.appendChild(characterArt('ronin'));
  const heroCopy=el('div','duel-hero-copy');
  add(heroCopy,el('strong','','CAELUM'),el('span','', 'Level 01 · Arcane Vanguard'),
    el('small','', 'Draw '+battle.draw.length+'  ·  Discard '+battle.discard.length));
  add(support,avatar,heroCopy);
  const mana=el('div','duel-mana');
  add(mana,el('strong','',battle.energy+' / '+battle.maxEnergy),el('span','','ENERGY'));
  const gems=el('div','duel-gems');
  for(let i=0;i<Math.max(battle.maxEnergy,battle.energy);i++)gems.appendChild(el('i',i<battle.energy?'lit':''));
  gems.setAttribute('aria-label',battle.energy+' energy points remaining');mana.appendChild(gems);
  const actionBar=el('div','duel-actions');
  actionBar.appendChild(button('End Turn','end','duel-end'));
  actionBar.appendChild(button('↺ Restart','restart','duel-restart'));
  add(command,support,mana,actionBar);shell.appendChild(command);
  const handBlock=el('section','duel-hand-section');
  const handHead=el('div','hand-heading');add(handHead,el('h2','','YOUR HAND'),el('span','',battle.hand.length+' CARDS  ·  TAP TO CAST'));
  const hand=el('div','hand');
  if(!battle.hand.length)hand.appendChild(el('p','empty','Your hand is empty. End turn to draw five cards.'));
  battle.hand.forEach((id,index)=>hand.appendChild(cardFace(BY_ID[id],true,index)));
  const message=el('p','battle-message',battle.message);
  message.setAttribute('role','status');message.setAttribute('aria-live','polite');
  add(handBlock,handHead,hand,message);
  shell.appendChild(handBlock);
  const bottomNote=el('p','duel-note','Shield protects one enemy attack · Burn damages at end of turn · Your 4 allies share the hero health pool. Spectral echoes are visual only.');
  shell.appendChild(bottomNote);main.appendChild(shell);
}
function renderCollection(){
  const head=el('div','section-head');
  const intro=el('div','');add(intro,label('YOUR COLLECTION / DECK FORGE'),heading('Collect the','extraordinary.','Unlock powerful cards with shards. Build a 12-card deck before entering battle.'));
  add(head,intro,el('span','pill','✦  '+progress.unlocked.length+' / '+CARDS.length+' DISCOVERED'));main.appendChild(head);
  const layout=el('div','collection-layout');
  const grid=el('section','collection-grid');
  for(const card of CARDS){
    const owned=progress.unlocked.includes(card.id);
    const item=el('div','collect-item');item.appendChild(cardFace(card,false,-1,!owned));
    const actions=el('div','collect-actions');
    if(owned){
      const count=progress.deck.filter(id=>id===card.id).length;
      actions.appendChild(button('− Remove','remove','secondary',!canRemove(progress.deck,card.id),card.id));
      actions.appendChild(button('+ Add ('+count+'/3)','add','primary',!canAdd(progress.deck,card.id,progress.unlocked),card.id));
    }else actions.appendChild(button('LOCKED','locked','secondary',true));
    add(item,actions);grid.appendChild(item);
  }
  const sidebar=el('aside','panel');
  add(sidebar,el('h3','','THE DECK FORGE'),el('div','deck-count',progress.deck.length+' / '+DECK_SIZE),
    el('p','subheading','Choose exactly 12 cards. A maximum of 3 copies of each card.'));
  const rows=el('div','deck-list');
  for(const c of CARDS){
    const count=progress.deck.filter(id=>id===c.id).length;
    if(count){const row=el('div','deck-row');add(row,el('span','',c.name),el('small','',count+'×'));rows.appendChild(row)}
  }
  sidebar.appendChild(rows);
  const alert=el('p','notice',notice||'Win trials to earn shards. One pack reveals one new card.');
  alert.setAttribute('role','status');
  add(sidebar,stat('Shards',progress.shards),alert,
    button('Open card pack · '+PACK_PRICE+' ✦','pack','primary full',progress.shards<PACK_PRICE||progress.unlocked.length===CARDS.length),
    el('p','tip',progress.unlocked.length===CARDS.length?'Collection complete. Every card is unlocked.':'Each pack unlocks one random card you do not own. No duplicates.'),
    button('Battle with this deck','start','secondary full',progress.deck.length!==DECK_SIZE),
    el('p','tip','Your cards and shards are saved in this browser only. There is no account or real-money purchasing.'));
  add(layout,grid,sidebar);main.appendChild(layout);
}
function render(){
  wallet.textContent=String(progress.shards);
  battleTab.classList.toggle('active',screen==='battle');
  collectionTab.classList.toggle('active',screen==='collection');
  battleTab.setAttribute('aria-current',screen==='battle'?'page':'false');
  collectionTab.setAttribute('aria-current',screen==='collection'?'page':'false');
  main.classList.toggle('battle-screen',screen==='battle');
  main.replaceChildren();
  if(screen==='battle'){if(!battle)startBattle(false);renderBattle()}else renderCollection();
}
function startBattle(refresh=true){
  if(progress.deck.length!==DECK_SIZE){notice='Complete your 12-card deck first.';screen='collection';if(refresh)render();return}
  battle=newBattle(progress.deck);notice='';
  if(refresh){screen='battle';render()}
}
function resolveRewards(oldPhase){
  if(oldPhase==='playing' && battle.phase!=='playing' && battle.phase!=='defeat'){
    progress.shards+=battle.phase==='victory'?100:45;progress.wins++;
    save();
  }
}
function switchScreen(next){screen=next;notice='';render();window.scrollTo({top:0,behavior:'instant'})}
battleTab.addEventListener('click',()=>switchScreen('battle'));
collectionTab.addEventListener('click',()=>switchScreen('collection'));
main.addEventListener('click',event=>{
  const target=event.target.closest('button[data-action]');
  if(!target||target.disabled)return;
  const action=target.dataset.action;const value=target.dataset.value;
  if(action==='play'&&battle){const old=battle.phase;playCard(battle,Number(value));resolveRewards(old);render();return}
  if(action==='end'&&battle){const old=battle.phase;endTurn(battle);resolveRewards(old);render();return}
  if(action==='next'&&battle&&battle.phase==='cleared'){battle=nextEncounter(battle,progress.deck);render();return}
  if(action==='restart'||action==='start'){startBattle();return}
  if(action==='collection'){switchScreen('collection');return}
  if(action==='add'&&canAdd(progress.deck,value,progress.unlocked)){progress.deck.push(value);notice=BY_ID[value].name+' added to the deck.';save();render();return}
  if(action==='remove'&&canRemove(progress.deck,value)){progress.deck.splice(progress.deck.indexOf(value),1);notice=BY_ID[value].name+' removed from the deck.';save();render();return}
  if(action==='pack'){
    if(progress.shards<PACK_PRICE){notice='You need '+PACK_PRICE+' shards to unlock a new card.';render();return}
    const remaining=CARDS.filter(c=>!progress.unlocked.includes(c.id));
    if(!remaining.length){notice='Your collection is complete.';render();return}
    const chosen=remaining[Math.floor(Math.random()*remaining.length)];
    progress.shards-=PACK_PRICE;progress.unlocked.push(chosen.id);
    notice='✦ New '+chosen.rarity+' card: '+chosen.name+'!';
    save();render();return;
  }
});
startBattle(false);render();
