import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,STARTER_DECK,STARTER_UNLOCKED,DECK_SIZE,PACK_PRICE,ENEMIES,newBattle,playCard,endTurn,
  nextEncounter,canAdd,canRemove,drawCards,shuffle} from './engine.mjs';
const random=()=>0.5;

test('catalog, starter collection and costs are consistent',()=>{
 assert.equal(CARDS.length,16);
 assert.equal(new Set(CARDS.map(c=>c.id)).size,CARDS.length);
 assert.equal(STARTER_DECK.length,DECK_SIZE);
 assert(CARDS.every(c=>Number.isInteger(c.cost)&&c.cost>=0&&c.cost<=3));
 assert(STARTER_DECK.every(id=>STARTER_UNLOCKED.includes(id)));
 assert.equal(PACK_PRICE,60);
});
test('battle starts with 5 cards and valid enemy intent',()=>{
 const state=newBattle(STARTER_DECK,0,40,random);
 assert.equal(state.hand.length,5);assert.equal(state.draw.length,7);assert.equal(state.energy,3);
 assert.equal(ENEMIES.length,3);assert.equal(state.enemy.hp,ENEMIES[0].hp);
});
test('playing a card spends energy and moves to discard; unaffordable card cannot play',()=>{
 const s=newBattle(STARTER_DECK,0,40,random);
 const hand=s.hand[0];const before=s.energy;
 assert.equal(playCard(s,0,random),true);
 assert.equal(s.energy,before-CARDS.find(c=>c.id===hand).cost);
 assert.equal(s.discard.length,1);assert.equal(s.hand.length,4);
 assert.equal(playCard(s,-1,random),false);
 s.energy=0;
 const paid=s.hand.findIndex(id=>CARDS.find(c=>c.id===id).cost>0);
 assert.equal(playCard(s,paid,random),false);
});
test('turns resolve enemy attacks and draw new hand',()=>{
 const s=newBattle(STARTER_DECK,0,40,random);
 const hp=s.hp;
 assert.equal(endTurn(s,random),true);
 assert.equal(s.turn,2);assert.equal(s.hp,hp-7);assert.equal(s.hand.length,5);
 assert.equal(s.energy,s.maxEnergy);
});
test('burn can finish enemy before its intent resolves',()=>{
 const s=newBattle(STARTER_DECK,0,40,random);
 s.enemy.hp=2;s.burn=3;
 endTurn(s,random);
 assert.equal(s.phase,'cleared');assert.equal(s.hp,40);
});
test('defeat and victory are terminal phases',()=>{
 const s=newBattle(STARTER_DECK,0,1,random);
 endTurn(s,random);assert.equal(s.phase,'defeat');assert.equal(endTurn(s,random),false);
 const last=newBattle(STARTER_DECK,2,40,random);
 last.enemy.hp=1;last.hand=['ronin'];
 playCard(last,0,random);assert.equal(last.phase,'victory');
});
test('next encounter recovers HP and maintains progress',()=>{
 const s=newBattle(STARTER_DECK,0,25,random);
 s.phase='cleared';
 const next=nextEncounter(s,STARTER_DECK,random);
 assert.equal(next.wave,1);assert.equal(next.hp,35);
});
test('deck builder enforces unlocked status, copy limit, and size',()=>{
 assert.equal(canAdd(STARTER_DECK,'phantom',STARTER_UNLOCKED),false);
 assert.equal(canAdd(STARTER_DECK,'ronin',STARTER_UNLOCKED),false);
 const shorter=STARTER_DECK.slice(1);
 assert.equal(canAdd(shorter,'ronin',STARTER_UNLOCKED),true);
 assert.equal(canRemove(shorter,'duelist'),true);
 assert.equal(canRemove(shorter,'phantom'),false);
 assert.throws(()=>newBattle(shorter,0,40,random));
});
test('shuffle draws without losing cards over multiple cycles',()=>{
 const s=newBattle(STARTER_DECK,0,40,random);
 s.discard.push(...s.hand);s.hand=[];
 drawCards(s,12,random);
 assert.equal(s.hand.length,12);
 assert.deepEqual([...s.hand].sort(),[...STARTER_DECK].sort());
 assert.deepEqual(shuffle([1,2,3],random).sort(),[1,2,3]);
});
