/** Arcana Duel smoke tests at phone, tablet and desktop widths. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,access} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const filepath=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!filepath.startsWith(root+sep)){res.writeHead(403);res.end();return}
  const bytes=await readFile(filepath);
  res.writeHead(200,{'content-type':mime[extname(filepath)]||'application/octet-stream','cache-control':'no-store'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port;
let executablePath;
for(const path of [process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium'].filter(Boolean)){
 try{await access(path);executablePath=path;break}catch{}
}
const browser=await chromium.launch(executablePath?{executablePath,headless:true,args:['--no-sandbox']}:{channel:'chrome',headless:true,args:['--no-sandbox']});
try{
 for(const width of [320,390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:850},isMobile:width<=390,hasTouch:width<=390});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const res=await page.goto(base+'/card-game/',{waitUntil:'networkidle'});
  assert.equal(res.status(),200);
  await page.locator('.combatant-enemy .combatant-name').waitFor();
  assert.equal(await page.locator('.duel-arena').count(),1,'Battlefield is visible');
  assert.equal(await page.locator('.board-v5 .game-table').count(),1,'New card-first game table is present');
  assert.match(await page.locator('#buildVersion').innerText(),/BUILD 09/,'Updated version is visible');
  assert.equal(await page.locator('.combatant').count(),2,'Real one-on-one combatants are shown');
  assert.equal(await page.locator('.combatant .character-art').count(),2,'Hero and enemy have original illustrations');
  assert.equal(await page.locator('.duel-hand-section').count(),1,'Hand is visible');
  assert.equal(await page.locator('.duel-end').count(),1,'End Turn action is visible');
  assert.equal(await page.locator('.battle-guide').count(),1,'First-time how-to-play guide is visible');
  assert.equal(await page.locator('.duel-forecast').count(),1,'Enemy intent is visible');
  assert.equal(await page.locator('.guide-heading').innerText(),'1. Tap a card to inspect');
  assert.equal(await page.locator('.hand .card').count(),5,'Opening hand has 5 cards');
  assert.equal(await page.locator('.wallet strong').innerText(),'50');
  assert((await page.title()).includes('Arcana Duel'));
  assert.equal(await page.locator('.table-piles .pile-button').count(),2,'Draw and discard piles are visible');
  const before=await page.locator('.battle-message').innerText();
  const hpBefore=await page.locator('.combatant-enemy .combatant-hp-number').innerText();
  const energyBefore=await page.locator('.duel-energy strong').innerText();
  const geometry=await page.evaluate(()=>{
    const names=['.game-table','.game-table-head','.game-tabletop','.card-table','.hand','.hand button.card','.game-battle-message'];
    return Object.fromEntries(names.map(name=>{const node=document.querySelector(name),r=node?.getBoundingClientRect();return [name,r?{x:r.x,y:r.y,w:r.width,h:r.height}:null]}));
  });
  console.log('HAND GEOMETRY',width,JSON.stringify(geometry));
  await page.locator('.hand button.card').first().click();
  assert.equal(await page.locator('.inspect-dialog[open]').count(),1,'Tapping a card opens its details');
  assert.equal(await page.locator('.inspect-description').count(),1,'Preview explains the card');
  assert.equal(await page.locator('.inspect-play').count(),1,'Playing requires confirmation');
  assert.equal(await page.locator('.duel-energy strong').innerText(),energyBefore,'Preview does not spend energy');
  assert.equal(await page.locator('.combatant-enemy .combatant-hp-number').innerText(),hpBefore,'Preview does not damage the enemy');
  await page.locator('[data-action="closeInspect"]').last().click();
  assert.equal(await page.locator('.inspect-dialog[open]').count(),0,'Cancel closes preview');
  assert.equal(await page.locator('.hand .card').count(),5,'Cancel retains the card');
  assert.equal(await page.locator('.guide-heading').innerText(),'2. Choose Play Card','Guide advances after inspection');
  await page.locator('.hand button.card').first().click();
  await page.locator('.inspect-play').click();
  assert.notEqual(await page.locator('.battle-message').innerText(),before,'Confirmed card play causes an effect');
  assert.notEqual(await page.locator('.hand .card').count(),5,'Playing the card changes the hand');
  assert.equal(await page.locator('.guide-heading').innerText(),'3. End your turn','Guide advances after playing');
  await page.locator('[data-action="openDeck"]').click();
  assert.equal(await page.locator('.pile-panel').count(),1,'Deck viewer opens');
  assert((await page.locator('.pile-panel .inspect-title').innerText()).includes('Your deck'));
  await page.locator('[data-action="inspectPileCard"]').first().click();
  assert.equal(await page.locator('.inspect-details').count(),1,'Deck entries can be inspected');
  await page.locator('[data-action="returnPile"]').click();
  assert.equal(await page.locator('.pile-panel').count(),1,'Back returns to deck');
  await page.locator('[data-action="closeInspect"]').first().click();
  await page.locator('[data-action="openDiscard"]').click();
  assert.equal(await page.locator('.pile-panel').count(),1,'Discard pile viewer opens');
  await page.locator('[data-action="closeInspect"]').first().click();
  await page.locator('[data-action="end"]').click();
  assert.equal(await page.locator('.battle-guide').count(),0,'Tutorial finishes after ending a turn');
  await page.locator('[data-action="guideOpen"]').click();
  assert.equal(await page.locator('.guide-heading').innerText(),'1. Tap a card to inspect','Tutorial can be replayed');
  await page.locator('[data-action="guideSkip"]').click();
  assert((await page.locator('.duel-round').innerText()).includes('TURN 2'),'End turn advances turn');
  await page.locator('#collectionTab').click();
  assert.equal(await page.locator('.collection-grid .collect-item').count(),16,'All cards appear in collection');
  assert.equal(await page.locator('.deck-count').innerText(),'12 / 12');
  await page.locator('.collect-item [data-action="remove"]:not([disabled])').first().click();
  assert.equal(await page.locator('.deck-count').innerText(),'11 / 12');
  await page.locator('.collect-item [data-action="add"]:not([disabled])').first().click();
  assert.equal(await page.locator('.deck-count').innerText(),'12 / 12');
  const overflow=await page.evaluate(()=>({width:innerWidth,content:document.documentElement.scrollWidth}));
  assert(overflow.content<=overflow.width+2,'Game should fit '+width+'px viewport: '+JSON.stringify(overflow));
  await page.evaluate(()=>{
   const current=JSON.parse(localStorage.getItem('arcana-duel-v1'));
   current.shards=200;
   localStorage.setItem('arcana-duel-v1',JSON.stringify(current));
  });
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#collectionTab').click();
  await page.locator('[data-action="pack"]').click();
  assert.equal(await page.locator('.wallet strong').innerText(),'140','Pack costs 60 shards');
  assert((await page.locator('.pill').innerText()).includes('7 / 16'),'Pack unlocks a new card');
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#collectionTab').click();
  assert.equal(await page.locator('.wallet strong').innerText(),'140','Shards persist after reload');
  assert.deepEqual(errors,[],'No browser exceptions on '+width+'px');
  await page.close();
 }
 const landscape=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
 const landRes=await landscape.goto(base+'/card-game/',{waitUntil:'networkidle'});
 assert.equal(landRes.status(),200,'Landscape game loads');
 assert.equal(await landscape.locator('.duel-arena').count(),1,'Landscape arena is present');
 assert.equal(await landscape.locator('.game-tabletop .table-piles').count(),1,'Deck piles live on the game table');
 assert.equal(await landscape.locator('.game-tabletop .game-endarea').count(),1,'End Turn is beside the hand');
 assert.equal(await landscape.locator('.combatant').count(),2,'Landscape shows only active fighters');
 const handBox=await landscape.locator('.card-table').boundingBox();
 assert(handBox&&handBox.height>=110&&handBox.y+handBox.height<=395,'Landscape hand has real tappable height and fits on screen');
 const landscapeGeometry=await landscape.evaluate(()=>{
   const picks=['.board-v5','.game-table','.game-table-head','.game-tabletop','.duel-hand-section','.card-table','.hand','.hand button.card','.game-battle-message'];
   const geom=Object.fromEntries(picks.map(sel=>{const e=document.querySelector(sel),r=e?.getBoundingClientRect();return [sel,r?{x:r.x,y:r.y,w:r.width,h:r.height,p:getComputedStyle(e).pointerEvents,z:getComputedStyle(e).zIndex}:null]}));
   const card=document.querySelector('.hand button.card'),r=card.getBoundingClientRect();
   const midX=r.x+r.width/2,midY=r.y+r.height/2;
   geom.hit={x:midX,y:midY,tag:document.elementFromPoint(midX,midY)?.outerHTML?.slice(0,140)};
   return geom;
 });
 console.log('LANDSCAPE GEOMETRY',JSON.stringify(landscapeGeometry));
 await landscape.locator('.hand button.card').first().click();
 assert.equal(await landscape.locator('.inspect-dialog[open]').count(),1,'Landscape card preview opens');
 const modalBox=await landscape.locator('.inspect-dialog').boundingBox();
 assert(modalBox&&modalBox.height<=390,'Card preview fits short landscape screen');
 await landscape.locator('[data-action="closeInspect"]').last().click();
 await landscape.locator('.hand button.card').first().click();
 await landscape.locator('.inspect-play').click();
 await landscape.locator('.duel-end').click();
 assert((await landscape.locator('.duel-round').innerText()).includes('TURN 2'),'Landscape controls are usable');
 await landscape.close();
 console.log('ARCANA DUEL BROWSER CHECKS PASSED');
}finally{await browser.close();server.close()}
