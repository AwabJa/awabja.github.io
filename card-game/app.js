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
  const art=el('div','card-art');art.setAttribute('aria-hidden','true');art.appendChild(el('span','card-glyph',card.glyph));
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
function renderBattle(){
  const head=el('div','section-head');
  const left=el('div','');add(left,label('CHAPTER 01 / THE SHATTERED CONSTELLATION'),heading('Choose your','destiny.','Fight three encounters. Read enemy intentions, combine your cards, and survive.'));
  add(head,left,el('div','pill','✦  ENCOUNTER '+(battle.wave+1)+' / '+ENEMIES.length));main.appendChild(head);
  if(battle.phase!=='playing'){
    const panel=el('section','result');
    const victory=battle.phase==='victory';
    const failed=battle.phase==='defeat';
    add(panel,el('div','result-glyph',failed?'☽':victory?'✷':'✦'),el('h2','',failed?'The stars fade':victory?'Legend Ascendant':'Trial complete'),
      el('p','',failed?'Your hero was defeated. Adjust your deck and try again.':victory?'You completed all three encounters and earned your victory rewards.':'You defeated '+ENEMIES[battle.wave].name+'. Your hero recovers 10 HP before the next trial.'));
    const buttons=el('div','result-actions');
    if(battle.phase==='cleared')buttons.appendChild(button('Continue to next trial','next','primary'));
    buttons.appendChild(button(failed||victory?'Begin a new run':'Restart run','restart','secondary'));
    buttons.appendChild(button('Edit deck','collection','secondary'));
    panel.appendChild(buttons);main.appendChild(panel);return;
  }
  const layout=el('div','battle-layout');
  const stage=el('section','stage');
  const stageLabel=el('div','stage-title');add(stageLabel,el('span','',ENEMIES[battle.wave].title),el('span','','TURN '+battle.turn));
  const foe=el('div','enemy-display');
  const portrait=el('div','enemy-portrait '+ENEMIES[battle.wave].element);portrait.setAttribute('aria-hidden','true');portrait.appendChild(el('span','',ENEMIES[battle.wave].glyph));
  const intent=enemyIntent(battle);
  add(foe,portrait,el('h2','enemy-name',ENEMIES[battle.wave].name),progressBar(battle.enemy.hp,battle.enemy.maxHp),
    el('p','health-copy',battle.enemy.hp+' / '+battle.enemy.maxHp+' HP'+(battle.enemy.shield?' · '+battle.enemy.shield+' shield':'')),
    el('div','intent','NEXT · '+intent.label+(battle.weak?' · WEAKENED':'')+(battle.burn?' · '+battle.burn+' BURN':'')));
  add(stage,stageLabel,foe);
  const sidebar=el('aside','battle-sidebar');
  const heroPanel=el('div','panel');
  add(heroPanel,el('h3','','YOUR HERO'),stat('Health',battle.hp+' / '+battle.maxHp),progressBar(battle.hp,battle.maxHp,true),
    stat('Shield',battle.shield),stat('Draw pile',battle.draw.length),stat('Discard pile',battle.discard.length));
  const actionPanel=el('div','panel');
  add(actionPanel,el('h3','','ARCANE ENERGY'),stat('Available',battle.energy+' / '+battle.maxEnergy));
  const orbs=el('div','energy-orbs');
  for(let i=0;i<Math.max(battle.maxEnergy,battle.energy);i++)orbs.appendChild(el('span','orb'+(i<battle.energy?' filled':'')));
  orbs.setAttribute('aria-label',battle.energy+' energy remaining');
  add(actionPanel,orbs,el('p','battle-message',battle.message),button('End turn →','end','primary full'),
    el('p','tip','Shield expires at the end of an enemy attack. Burn damages the enemy at the end of your turn.'),
    button('Restart run','restart','secondary full'));
  add(sidebar,heroPanel,actionPanel);add(layout,stage,sidebar);main.appendChild(layout);
  const handBox=el('section','hand-section');
  const handHead=el('div','hand-heading');add(handHead,el('h2','','YOUR HAND'),el('span','',battle.hand.length+' cards · '+battle.energy+' energy'));
  const hand=el('div','hand');
  if(!battle.hand.length)hand.appendChild(el('p','empty','No cards in your hand. End your turn to draw again.'));
  battle.hand.forEach((id,index)=>hand.appendChild(cardFace(BY_ID[id],true,index)));
  add(handBox,handHead,hand);main.appendChild(handBox);
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
