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


const TUTORIAL_KEY='arcana-duel-tutorial-v2';
const LESSONS=[
 {heading:'1. Play a card',body:'Tap any glowing card in your hand. The number in its corner is its energy cost. Attack cards reduce enemy health.'},
 {heading:'2. Watch the numbers',body:'Your energy goes down when you play cards. Green is your health, red is enemy health, and a shield blocks damage.'},
 {heading:'3. End your turn',body:'The enemy moves after you press End Turn. Read its NEXT ATTACK before deciding which cards to play.'}
];
let lesson=0;
let guideOpen=true;
try{if(localStorage.getItem(TUTORIAL_KEY)==='done'){lesson=3;guideOpen=false}}catch{}
function closeGuide(){
  guideOpen=false;lesson=3;
  try{localStorage.setItem(TUTORIAL_KEY,'done')}catch{}
}
function barFor(value,max,friend){
  const track=el('div','duel-hp-track');
  track.setAttribute('role','progressbar');
  track.setAttribute('aria-label',friend?'Hero health':'Enemy health');
  track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(max));
  track.setAttribute('aria-valuenow',String(value));
  const fill=el('span',friend?'duel-hp-fill ally':'duel-hp-fill enemy');
  fill.style.width=(100*value/Math.max(1,max))+'%';
  track.appendChild(fill);return track;
}
function combatant(id,name,role,hp,max,shield,friend){
  const unit=el('div','combatant '+(friend?'combatant-ally':'combatant-enemy'));
  const visual=el('div','combatant-visual');
  const halo=el('div','combatant-halo');halo.setAttribute('aria-hidden','true');
  visual.appendChild(halo);
  visual.appendChild(characterArt(id));
  const summary=el('div','combatant-summary');
  add(summary,el('span','combatant-role',role),el('h2','combatant-name',name),
      el('span','combatant-hp-number',hp+' / '+max+' HP'),barFor(hp,max,friend));
  if(shield>0)summary.appendChild(el('span','combatant-shield','◆ '+shield+' shield'));
  add(unit,visual,summary);return unit;
}
function renderGuide(){
  if(!guideOpen||lesson>=3)return null;
  const item=LESSONS[lesson];
  const guide=el('aside','battle-guide');
  guide.setAttribute('aria-label','How to play');
  add(guide,el('span','guide-count','HOW TO PLAY · '+(lesson+1)+' OF 3'),
      el('h3','guide-heading',item.heading),
      el('p','guide-copy',item.body));
  const actions=el('div','guide-actions');
  actions.appendChild(button(lesson===2?'Got it':'Next tip','guideNext','guide-next'));
  actions.appendChild(button('Skip guide','guideSkip','guide-skip'));
  guide.appendChild(actions);
  return guide;
}
function renderBattle(){
  const shell=el('div','duel-shell');
  const header=el('div','duel-heading');
  const intro=el('div','duel-heading-left');
  add(intro,el('p','eyebrow','CHAPTER 01 · THE SHATTERED CONSTELLATION'),
    el('h1','duel-title','The Hollow Cathedral'));
  const meta=el('div','duel-meta');
  add(meta,el('span','duel-stat','WAVE '+(battle.wave+1)+' / '+ENEMIES.length),
    el('span','duel-stat','TURN '+battle.turn),
    button('? How to play','guideOpen','guide-launch'));
  add(header,intro,meta);shell.appendChild(header);
  const orientation=el('div','orientation-note','↻ Rotate your phone sideways to see the whole card table and swipe through your hand.');
  shell.appendChild(orientation);
  const arena=el('section','duel-arena');
  arena.setAttribute('aria-label','Battlefield');
  const matchup=el('div','duel-matchup');
  matchup.appendChild(combatant('ronin','Caelum','YOU · ARCANE VANGUARD',
    battle.hp,battle.maxHp,battle.shield,true));
  const center=el('div','duel-center');
  add(center,el('span','duel-versus','VS'),
    el('span','duel-round','TURN '+battle.turn));
  matchup.appendChild(center);
  const enemy=ENEMIES[battle.wave];
  const enemyId=['wisp','stalker','queen'][battle.wave];
  matchup.appendChild(combatant(enemyId,enemy.name,'ENEMY · '+enemy.title,
    battle.enemy.hp,battle.enemy.maxHp,battle.enemy.shield,false));
  arena.appendChild(matchup);
  const intent=enemyIntent(battle);
  const attack=el('div','duel-forecast');
  add(attack,el('span','forecast-eye','◈'),
    el('span','forecast-label','ENEMY NEXT MOVE'),
    el('strong','',intent.label));
  if(battle.weak>0)attack.appendChild(el('span','forecast-debuff','WEAKENED'));
  if(battle.burn>0)attack.appendChild(el('span','forecast-debuff','BURN '+battle.burn));
  arena.appendChild(attack);
  shell.appendChild(arena);
  if(battle.phase!=='playing'){
    const failed=battle.phase==='defeat',finished=battle.phase==='victory';
    const panel=el('section','duel-result result');
    add(panel,el('div','result-glyph',failed?'☽':finished?'✷':'✦'),
      el('h2','',failed?'Try another strategy':finished?'Victory!':'Enemy defeated!'),
      el('p','',failed?'The enemy took your final health point. Use shields, heals, and damage cards to survive.':finished?'All three enemies defeated. Your rewards are saved on this device.':'Your next enemy is stronger. You restore 10 HP before the next round.'));
    const actions=el('div','result-actions');
    if(battle.phase==='cleared')actions.appendChild(button('Next enemy','next','primary'));
    actions.appendChild(button('Restart battle','restart','secondary'));
    actions.appendChild(button('Edit deck','collection','secondary'));
    panel.appendChild(actions);shell.appendChild(panel);main.appendChild(shell);return;
  }
  const guide=renderGuide();
  if(guide)shell.appendChild(guide);
  const controls=el('section','duel-controls');
  const mana=el('div','duel-energy');
  add(mana,el('span','energy-heading','YOUR ENERGY'),el('strong','',battle.energy+' / '+battle.maxEnergy));
  const jewels=el('div','duel-gems');
  for(let i=0;i<battle.maxEnergy;i++){
    const gem=el('i',i<battle.energy?'lit':'');
    jewels.appendChild(gem);
  }
  mana.appendChild(jewels);
  const info=el('div','duel-turn-explain');
  add(info,el('strong','','YOUR TURN'),
    el('span','', 'Play cards to attack, defend, or heal. Then end your turn.'));
  const endButton=button('End Turn  →','end','duel-end');
  endButton.setAttribute('aria-label','End your turn and let the enemy act');
  add(controls,mana,info,endButton);shell.appendChild(controls);
  const handSection=el('section','duel-hand-section');
  const handHeader=el('div','hand-heading');
  add(handHeader,el('h2','','YOUR CARDS — TAP TO PLAY'),
    el('span','',battle.hand.length+' CARDS · '+battle.energy+' ENERGY'));
  const hand=el('div','hand');
  if(battle.hand.length===0)hand.appendChild(el('p','empty','No cards left in hand. Press End Turn to draw new ones.'));
  battle.hand.forEach((id,i)=>hand.appendChild(cardFace(BY_ID[id],true,i)));
  const feedback=el('p','battle-message',battle.message);
  feedback.setAttribute('aria-live','polite');
  add(handSection,handHeader,hand,feedback);shell.appendChild(handSection);
  const foot=el('div','battle-bottom');
  add(foot,el('span','', 'WIN: RED ENEMY HP REACHES 0'),
    el('span','', 'LOSE: GREEN HERO HP REACHES 0'),
    button('↺ Restart battle','restart','duel-restart'));
  shell.appendChild(foot);main.appendChild(shell);
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
  if(action==='guideOpen'){guideOpen=true;lesson=0;render();return}
  if(action==='guideSkip'){closeGuide();render();return}
  if(action==='guideNext'){if(lesson>=2)closeGuide();else lesson++;render();return}
  if(action==='play'&&battle){const old=battle.phase;const played=playCard(battle,Number(value));if(played&&guideOpen&&lesson===0)lesson=1;resolveRewards(old);render();return}
  if(action==='end'&&battle){const old=battle.phase;endTurn(battle);if(guideOpen&&lesson<2)lesson=2;resolveRewards(old);render();return}
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
