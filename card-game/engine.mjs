export const CARDS = Object.freeze([
  {id:'ronin',name:'Ember Ronin',element:'flame',rarity:'Common',type:'strike',cost:1,power:6,glyph:'✦',text:'Deal 6 damage.'},
  {id:'sentinel',name:'Moon Sentinel',element:'moon',rarity:'Common',type:'guard',cost:1,power:6,glyph:'☽',text:'Gain 6 shield.'},
  {id:'kitsune',name:'Foxfire Adept',element:'flame',rarity:'Common',type:'burn',cost:1,power:4,extra:2,glyph:'✧',text:'Deal 4 damage. Apply 2 burn.'},
  {id:'oracle',name:'Star Oracle',element:'star',rarity:'Common',type:'draw',cost:1,power:2,glyph:'✳',text:'Draw 2 cards.'},
  {id:'healer',name:'Dawn Priestess',element:'star',rarity:'Common',type:'heal',cost:1,power:6,glyph:'❂',text:'Restore 6 health.'},
  {id:'duelist',name:'Lunar Duelist',element:'moon',rarity:'Rare',type:'strike',cost:2,power:13,glyph:'❖',text:'Deal 13 damage.'},
  {id:'phantom',name:'Phantom Blade',element:'void',rarity:'Rare',type:'weaken',cost:1,power:5,extra:2,glyph:'♠',text:'Deal 5 damage. Weaken enemy for 2 attacks.'},
  {id:'sakura',name:'Sakura Guardian',element:'moon',rarity:'Rare',type:'guard',cost:2,power:15,glyph:'✿',text:'Gain 15 shield.'},
  {id:'witch',name:'Cinder Witch',element:'flame',rarity:'Rare',type:'burn',cost:2,power:8,extra:4,glyph:'✴',text:'Deal 8 damage. Apply 4 burn.'},
  {id:'channeler',name:'Aether Channeler',element:'star',rarity:'Rare',type:'channel',cost:0,power:1,glyph:'✧',text:'Gain 1 energy and draw 1.'},
  {id:'reaper',name:'Night Reaper',element:'void',rarity:'Rare',type:'leech',cost:2,power:10,glyph:'⟡',text:'Deal 10 damage. Heal 3.'},
  {id:'samurai',name:'Iron Samurai',element:'moon',rarity:'Rare',type:'hybrid',cost:2,power:9,extra:7,glyph:'⚔',text:'Deal 9 damage. Gain 7 shield.'},
  {id:'dragon',name:'Celestial Dragon',element:'flame',rarity:'Epic',type:'burn',cost:3,power:18,extra:4,glyph:'✺',text:'Deal 18 damage. Apply 4 burn.'},
  {id:'empress',name:'Void Empress',element:'void',rarity:'Epic',type:'weaken',cost:3,power:17,extra:3,glyph:'♛',text:'Deal 17 damage. Weaken for 3 attacks.'},
  {id:'archmage',name:'Astral Archmage',element:'star',rarity:'Epic',type:'aegis',cost:2,power:14,glyph:'✵',text:'Gain 14 shield. Heal 5.'},
  {id:'blade',name:'Twilight Blade',element:'void',rarity:'Epic',type:'pierce',cost:2,power:7,glyph:'◇',text:'Deal 7 damage + half your shield.'}
]);
export const BY_ID = Object.freeze(Object.fromEntries(CARDS.map(card=>[card.id,card])));
export const STARTER_DECK = Object.freeze(['ronin','ronin','ronin','sentinel','sentinel','sentinel','kitsune','kitsune','oracle','oracle','healer','duelist']);
export const STARTER_UNLOCKED = Object.freeze(['ronin','sentinel','kitsune','oracle','healer','duelist']);
export const DECK_SIZE = 12;
export const PACK_PRICE = 60;
export const ENEMIES = Object.freeze([
  {name:'Ashen Wisp',title:'THE FIRST TRIAL',element:'flame',hp:33,glyph:'✺',moves:[{type:'attack',value:7,label:'Strike · 7'},{type:'guard',value:8,label:'Ward · 8'},{type:'attack',value:10,label:'Flare · 10'}]},
  {name:'Nightfall Stalker',title:'THE SECOND TRIAL',element:'void',hp:49,glyph:'♠',moves:[{type:'attack',value:11,label:'Claw · 11'},{type:'attack',value:8,label:'Lunge · 8'},{type:'guard',value:10,label:'Shadow Ward · 10'}]},
  {name:'The Starless Queen',title:'THE FINAL TRIAL',element:'moon',hp:66,glyph:'♛',moves:[{type:'attack',value:12,label:'Judgment · 12'},{type:'guard',value:12,label:'Eclipse Ward · 12'},{type:'attack',value:16,label:'Moonfall · 16'}]}
]);
export function shuffle(items,rng=Math.random){
  const array=[...items];
  for(let i=array.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[array[i],array[j]]=[array[j],array[i]]}
  return array;
}
export function drawCards(state,n,rng=Math.random){
  for(let i=0;i<n;i++){
    if(!state.draw.length){if(!state.discard.length)break;state.draw=shuffle(state.discard,rng);state.discard=[]}
    state.hand.push(state.draw.pop());
  }
}
export function newBattle(deck,wave=0,hp=40,rng=Math.random){
  if(deck.length!==DECK_SIZE || deck.some(id=>!BY_ID[id]))throw Error('A valid 12-card deck is required');
  if(wave<0||wave>=ENEMIES.length)throw Error('Unknown encounter');
  const foe=ENEMIES[wave];
  const state={wave,phase:'playing',turn:1,hp:Math.max(1,Math.min(40,hp)),maxHp:40,shield:0,
    energy:3,maxEnergy:3,draw:shuffle(deck,rng),hand:[],discard:[],burn:0,weak:0,
    enemy:{hp:foe.hp,maxHp:foe.hp,shield:0},message:'Play cards to prepare for the enemy attack.'};
  drawCards(state,5,rng);
  return state;
}
export function enemyIntent(state){
  const foe=ENEMIES[state.wave];
  return foe.moves[(state.turn-1)%foe.moves.length];
}
function damageEnemy(s,amount){
  const blocked=Math.min(s.enemy.shield,amount);
  s.enemy.shield-=blocked;
  s.enemy.hp=Math.max(0,s.enemy.hp-(amount-blocked));
}
function checkVictory(s){
  if(s.enemy.hp<=0){s.phase=s.wave===ENEMIES.length-1?'victory':'cleared';s.message=s.phase==='victory'?'The Starless Queen has fallen!':'Encounter cleared. Claim your reward!';return true}
  return false;
}
export function playCard(s,handIndex,rng=Math.random){
  if(s.phase!=='playing')return false;
  if(!Number.isInteger(handIndex)||handIndex<0||handIndex>=s.hand.length)return false;
  const card=BY_ID[s.hand[handIndex]];
  if(!card||card.cost>s.energy)return false;
  s.energy-=card.cost;s.hand.splice(handIndex,1);
  if(card.type==='strike')damageEnemy(s,card.power);
  if(card.type==='guard')s.shield+=card.power;
  if(card.type==='burn'){damageEnemy(s,card.power);s.burn+=card.extra}
  if(card.type==='draw')drawCards(s,card.power,rng);
  if(card.type==='heal')s.hp=Math.min(s.maxHp,s.hp+card.power);
  if(card.type==='weaken'){damageEnemy(s,card.power);s.weak=Math.max(s.weak,card.extra)}
  if(card.type==='channel'){s.energy+=card.power;drawCards(s,1,rng)}
  if(card.type==='leech'){damageEnemy(s,card.power);s.hp=Math.min(s.maxHp,s.hp+3)}
  if(card.type==='hybrid'){damageEnemy(s,card.power);s.shield+=card.extra}
  if(card.type==='aegis'){s.shield+=card.power;s.hp=Math.min(s.maxHp,s.hp+5)}
  if(card.type==='pierce')damageEnemy(s,card.power+Math.floor(s.shield/2));
  s.discard.push(card.id);s.message=card.name+' activated.';
  checkVictory(s);
  return true;
}
export function endTurn(s,rng=Math.random){
  if(s.phase!=='playing')return false;
  if(s.burn>0){damageEnemy(s,s.burn);s.burn=Math.max(0,s.burn-1);if(checkVictory(s))return true}
  const move=enemyIntent(s);
  s.enemy.shield=0;
  if(move.type==='guard'){s.enemy.shield+=move.value;s.message=ENEMIES[s.wave].name+' gained '+move.value+' shield.'}
  else {
    const power=Math.max(0,move.value-(s.weak>0?3:0));
    if(s.weak>0)s.weak--;
    const hit=Math.max(0,power-s.shield);
    s.shield=Math.max(0,s.shield-power);
    s.hp=Math.max(0,s.hp-hit);
    s.message=hit>0?'Enemy dealt '+hit+' damage.':'You blocked the attack!';
  }
  if(s.hp===0){s.phase='defeat';s.message='Your party has fallen. Try another strategy.';return true}
  s.shield=0;
  s.discard.push(...s.hand);s.hand=[];
  s.turn++;s.maxEnergy=Math.min(5,3+Math.floor((s.turn-1)/2));s.energy=s.maxEnergy;
  drawCards(s,5,rng);
  return true;
}
export function nextEncounter(s,deck,rng=Math.random){
  if(s.phase!=='cleared')throw Error('Encounter is not cleared');
  return newBattle(deck,s.wave+1,Math.min(40,s.hp+10),rng);
}
export function canAdd(deck,id,unlocked){
  return !!BY_ID[id]&&unlocked.includes(id)&&deck.length<DECK_SIZE&&deck.filter(x=>x===id).length<3;
}
export function canRemove(deck,id){return deck.includes(id)}
