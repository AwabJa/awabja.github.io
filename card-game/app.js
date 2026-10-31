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
let cardPreview=null;
let previewReturn=null;
let deckViewer=null;
let lastPreviewTrigger=null;
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
  if(playable){face.type='button';face.dataset.action='inspectHand';face.dataset.value=String(index);face.setAttribute('aria-label','Inspect '+card.name+', '+card.cost+' energy. '+card.text);if(card.cost>battle.energy)face.classList.add('unaffordable')}
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
 {heading:'1. Tap a card to inspect',body:'Swipe sideways through your hand, then tap a card. It opens a large preview, so you can read what it does before spending energy.'},
 {heading:'2. Choose Play Card',body:'Use the Play Card button in the preview to activate the card. Its number is the energy cost. Cancel to keep it in your hand.'},
 {heading:'3. End your turn',body:'When you are done playing cards, tap End Turn. The enemy performs its displayed next move, then you draw a new hand.'}
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
  const shell=el('div','duel-shell board-v5');
  const upper=el('header','game-head');
  const left=el('div','game-head-name');
  add(left,el('span','head-prefix','CHAPTER I · THE SHATTERED CONSTELLATION'),
    el('h1','', 'The Hollow Cathedral'));
  const round=el('div','game-head-status');
  add(round,el('span','round-pill','WAVE '+(battle.wave+1)+' / '+ENEMIES.length),
    el('span','duel-round round-pill','TURN '+battle.turn),
    button('HOW TO PLAY','guideOpen','guide-launch'));
  add(upper,left,round);shell.appendChild(upper);

  const rotate=el('div','orientation-note');
  add(rotate,el('span','rotate-icon','↻'),
    el('span','','Turn your phone sideways for the full card table. Tap a card to inspect it before playing.'));
  shell.appendChild(rotate);

  const arena=el('section','duel-arena game-battlefield');
  arena.setAttribute('aria-label','Your hero versus the enemy');
  const matchup=el('div','duel-matchup game-matchup');
  const hero=combatant('ronin','Caelum','YOUR HERO',battle.hp,battle.maxHp,battle.shield,true);
  const middle=el('div','duel-center');
  add(middle,el('span','duel-versus','VS'),
    el('span','middle-hint','TACTICAL BATTLE'));
  const enemy=ENEMIES[battle.wave];
  const enemyId=['wisp','stalker','queen'][battle.wave];
  const villain=combatant(enemyId,enemy.name,'ENEMY',battle.enemy.hp,battle.enemy.maxHp,battle.enemy.shield,false);
  add(matchup,hero,middle,villain);arena.appendChild(matchup);
  const upcoming=enemyIntent(battle);
  const forecast=el('div','duel-forecast');
  add(forecast,el('span','forecast-eye','◇'),
    el('span','forecast-label','ENEMY NEXT'),
    el('strong','',upcoming.label));
  if(battle.weak>0)forecast.appendChild(el('span','forecast-debuff','WEAK '+battle.weak));
  if(battle.burn>0)forecast.appendChild(el('span','forecast-debuff','BURN '+battle.burn));
  arena.appendChild(forecast);
  shell.appendChild(arena);

  if(battle.phase!=='playing'){
    const failed=battle.phase==='defeat',won=battle.phase==='victory';
    const result=el('section','duel-result result');
    add(result,el('div','result-glyph',failed?'☽':won?'✷':'✦'),
      el('h2','',failed?'Try another strategy':won?'Victory!':'Enemy defeated!'),
      el('p','',failed?'You lost all your health. Use shields and healing to survive.':won?'All encounters cleared. Your reward is saved on this device.':'One enemy down. You recover 10 HP before the next challenge.'));
    const actions=el('div','result-actions');
    if(battle.phase==='cleared')actions.appendChild(button('Next enemy','next','primary'));
    add(actions,button('Restart','restart','secondary'),button('Edit deck','collection','secondary'));
    result.appendChild(actions);
    shell.appendChild(result);main.appendChild(shell);return;
  }
  const guide=renderGuide();
  if(guide)shell.appendChild(guide);

  const board=el('section','game-table');
  const boardHeading=el('div','game-table-head');
  const info=el('div','game-table-info');
  add(info,el('span','table-head-kicker','YOUR HAND'),
    el('strong','', 'Tap to inspect · Swipe to browse'));
  const resources=el('div','game-resource-bar');
  const mana=el('div','duel-energy');
  add(mana,el('span','energy-heading','ENERGY'),el('strong','',battle.energy+' / '+battle.maxEnergy));
  const jewels=el('div','duel-gems');
  for(let i=0;i<battle.maxEnergy;i++)jewels.appendChild(el('i',i<battle.energy?'lit':''));
  mana.appendChild(jewels);
  add(resources,mana,el('span','hand-count',battle.hand.length+' IN HAND'));
  add(boardHeading,info,resources);board.appendChild(boardHeading);

  const tabletop=el('div','game-tabletop');
  const piles=el('div','table-piles');
  const deck=button('DRAW '+battle.draw.length,'openDeck','pile-button');
  deck.setAttribute('aria-label','View your full deck. '+battle.draw.length+' cards remain in the draw pile');
  const dArt=el('span','pile-back','✧');dArt.setAttribute('aria-hidden','true');deck.prepend(dArt);
  const discard=button('DISCARD '+battle.discard.length,'openDiscard','pile-button');
  discard.setAttribute('aria-label','Inspect cards in the discard pile');
  const discarded=el('span','pile-back discard-back','◈');discarded.setAttribute('aria-hidden','true');discard.prepend(discarded);
  add(piles,deck,discard);

  const handSection=el('div','duel-hand-section');
  const table=el('div','card-table');
  const hand=el('div','hand');
  hand.setAttribute('aria-label','Hand of cards. Scroll sideways, then tap to inspect.');
  if(battle.hand.length===0)hand.appendChild(el('p','empty','No cards left. End your turn to draw again.'));
  battle.hand.forEach((id,i)=>hand.appendChild(cardFace(BY_ID[id],true,i)));
  table.appendChild(hand);handSection.appendChild(table);
  const endArea=el('div','game-endarea');
  const end=button('END TURN','end','duel-end');
  end.setAttribute('aria-label','End turn and let enemy perform its next move');
  add(endArea,end,el('small','', 'Enemy moves next'));
  add(tabletop,piles,handSection,endArea);board.appendChild(tabletop);
  const footer=el('div','game-battle-message');
  const message=el('p','battle-message',battle.message);
  message.setAttribute('aria-live','polite');
  add(footer,message,button('↺ Restart','restart','duel-restart'));
  board.appendChild(footer);shell.appendChild(board);
  main.appendChild(shell);
}
/** A native modal keeps tap-to-inspect separate from the action of spending energy. */
const inspectorDialog=document.createElement('dialog');
inspectorDialog.className='inspect-dialog';
inspectorDialog.setAttribute('aria-label','Card details');
document.body.appendChild(inspectorDialog);
inspectorDialog.addEventListener('click',event=>{
  if(event.target===inspectorDialog)closeCardDialog();
});
inspectorDialog.addEventListener('close',()=>{
  cardPreview=null;deckViewer=null;previewReturn=null;
  document.body.classList.remove('dialog-open');
  lastPreviewTrigger?.focus?.({preventScroll:true});
  lastPreviewTrigger=null;
});
function closeCardDialog(){
  if(inspectorDialog.open)inspectorDialog.close();
}
function showDialog(trigger){
  if(trigger)lastPreviewTrigger=trigger;
  if(!inspectorDialog.open)inspectorDialog.showModal();
  document.body.classList.add('dialog-open');
}
function openCardPreview(id,index,source,trigger){
  if(!BY_ID[id] || (source==='hand'&&(!battle||battle.phase!=='playing'||battle.hand[index]!==id)))return;
  cardPreview={id,index,source};
  if(source!=='pile')previewReturn=null;
  renderInspector();
  showDialog(trigger);
}
function openDeckViewer(kind,trigger){
  if(!battle)return;
  cardPreview=null;
  deckViewer=kind;
  previewReturn=null;
  renderInspector();
  showDialog(trigger);
}
function cardTypeName(card){
  return ({strike:'Attack',guard:'Defense',burn:'Fire damage',draw:'Draw cards',heal:'Healing',
    weaken:'Debuff',channel:'Energy boost',leech:'Lifesteal',hybrid:'Attack & defense',
    aegis:'Healing & shield',pierce:'Piercing attack'})[card.type]||'Ability';
}
function renderInspector(){
  inspectorDialog.replaceChildren();
  if(cardPreview){
    const card=BY_ID[cardPreview.id];
    if(!card)return;
    const frame=el('div','inspect-panel');
    const top=el('div','inspect-top');
    add(top,el('span','inspect-kicker','CARD INFORMATION'),
      button('✕ Close','closeInspect','inspect-close'));
    const layout=el('div','inspect-layout');
    const art=el('div','inspect-card-art');
    art.appendChild(cardFace(card,false,-1));
    const detail=el('div','inspect-details');
    add(detail,el('span','inspect-rarity',card.rarity.toUpperCase()+' · '+card.element.toUpperCase()),
      el('h2','inspect-title',card.name),
      el('span','inspect-type',cardTypeName(card)),
      el('p','inspect-description',card.text));
    const cost=el('div','inspect-cost');
    add(cost,el('span','','ENERGY COST'),el('strong','',card.cost));
    detail.appendChild(cost);
    if(cardPreview.source==='hand'){
      const canPlay=!!battle && battle.phase==='playing' && battle.hand[cardPreview.index]===card.id && card.cost<=battle.energy;
      const msg=canPlay?'Playing spends '+card.cost+' energy.':'Not enough energy to play this card this turn.';
      detail.appendChild(el('p','inspect-hint',msg));
      const actions=el('div','inspect-actions');
      actions.appendChild(button('Play Card','confirmPlay','inspect-play',!canPlay));
      actions.appendChild(button('Keep in Hand','closeInspect','inspect-cancel'));
      detail.appendChild(actions);
    }else{
      const actions=el('div','inspect-actions');
      if(previewReturn)actions.appendChild(button('← Back to '+(previewReturn==='discard'?'discard':'deck'),'returnPile','inspect-cancel'));
      else actions.appendChild(button('Close','closeInspect','inspect-cancel'));
      detail.appendChild(actions);
    }
    add(layout,art,detail);
    add(frame,top,layout);
    inspectorDialog.appendChild(frame);
    return;
  }
  const kind=deckViewer;
  if(!kind)return;
  const cards=kind==='discard'?battle.discard:progress.deck;
  const counts=new Map();
  for(const id of cards)counts.set(id,(counts.get(id)||0)+1);
  const frame=el('div','inspect-panel pile-panel');
  const top=el('div','inspect-top');
  add(top,el('span','inspect-kicker',kind==='discard'?'DISCARD PILE':'YOUR 12-CARD DECK'),
    button('✕ Close','closeInspect','inspect-close'));
  const title=el('h2','inspect-title',kind==='discard'?'Discard pile':'Your deck');
  const explanation=el('p','inspect-description',
    kind==='discard'?'Cards played or discarded during this battle. These are shuffled back when the draw pile runs out.':
      'These are all the cards in your deck. '+battle.draw.length+' remain in the draw pile; '+battle.hand.length+' are in your hand. Tap an entry to inspect it.');
  const list=el('div','pile-list');
  for(const [id,count] of counts){
    const card=BY_ID[id];
    const item=button(card.name+' · '+card.cost+' energy · ×'+count,'inspectPileCard','pile-entry',false,id);
    item.prepend(el('span','pile-symbol',card.glyph));
    list.appendChild(item);
  }
  if(!counts.size)list.appendChild(el('p','empty','No cards in this pile yet.'));
  add(frame,top,title,explanation,list);
  inspectorDialog.appendChild(frame);
}
inspectorDialog.addEventListener('click',event=>{
  const target=event.target.closest('button[data-action]');
  if(!target||target.disabled)return;
  const action=target.dataset.action;
  if(action==='closeInspect'){closeCardDialog();render();return}
  if(action==='confirmPlay'&&cardPreview?.source==='hand'&&battle){
    const {id,index}=cardPreview;
    if(battle.hand[index]!==id)return;
    const old=battle.phase;
    const played=playCard(battle,index);
    if(played){
      if(guideOpen&&lesson===1)lesson=2;
      resolveRewards(old);
      closeCardDialog();
      render();
    }else renderInspector();
    return;
  }
  if(action==='inspectPileCard'&&deckViewer){
    const id=target.dataset.value;
    if(BY_ID[id]){const kind=deckViewer;previewReturn=kind;cardPreview={id,index:-1,source:'pile'};deckViewer=null;renderInspector()}
    return;
  }
  if(action==='returnPile'&&previewReturn){
    const kind=previewReturn;cardPreview=null;deckViewer=kind;previewReturn=null;renderInspector();
  }
});
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
  if(action==='inspectHand'&&battle){const index=Number(value);if(Number.isInteger(index)&&index>=0&&index<battle.hand.length){if(guideOpen&&lesson===0)lesson=1;openCardPreview(battle.hand[index],index,'hand',target)}return}
  if(action==='openDeck'||action==='openDiscard'){openDeckViewer(action==='openDiscard'?'discard':'deck',target);return}
  if(action==='end'&&battle){const old=battle.phase;endTurn(battle);if(guideOpen&&lesson===2)closeGuide();resolveRewards(old);render();return}
  if(action==='next'&&battle&&battle.phase==='cleared'){battle=nextEncounter(battle,progress.deck);render();return}
  if(action==='restart'||action==='start'){closeCardDialog();startBattle();return}
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
