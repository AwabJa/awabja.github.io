/** Moonfall vertical-slice smoke tests. Runs against shipped HTML/CSS/JS and illustrated atlas. */
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

const root=dirname(fileURLToPath(import.meta.url));
const htmlRaw=await readFile(join(root,'index.html'),'utf8');
const css=await readFile(join(root,'style.css'),'utf8');
const jsRaw=await readFile(join(root,'game.js'),'utf8');
const scene=(await readFile(join(root,'assets/battle-hd.webp'))).toString('base64');
const cards=(await readFile(join(root,'assets/cards-hd.webp'))).toString('base64');
const manifest=JSON.parse(await readFile(join(root,'manifest.webmanifest'),'utf8'));
assert.match(htmlRaw,/src="game\.js\?v=moonfall-2"/);
assert.match(htmlRaw,/apple-mobile-web-app-capable/);
assert.match(htmlRaw,/href="style\.css\?v=moonfall-2"/);
assert.match(jsRaw,/sceneArt\.src='assets\/battle-hd\.webp\?v=moonfall-2'/);
assert.match(jsRaw,/cardsArt\.src='assets\/cards-hd\.webp\?v=moonfall-2'/);
assert(scene.length>150000,'High-resolution illustrated background must be present');
assert(cards.length>100000,'High-resolution illustrated card art must be present');
assert.equal(manifest.display,'fullscreen');
assert.equal(manifest.orientation,'landscape');
assert.match(css,/\.game-shell\{position:relative;width:100vw!important;height:100dvh!important/);

// Inline only in tests to avoid network dependencies and guarantee the tested source is this commit.
const html=htmlRaw.replace(/<meta http-equiv="Content-Security-Policy"[^>]+>/,'')
  .replace(/<link rel="stylesheet"[^>]+>/,`<style>${css}</style>`)
  .replace(/<script src="game\.js\?v=moonfall-2" defer><\/script>/,'');
const js=jsRaw
  .replace("sceneArt.src='assets/battle-hd.webp?v=moonfall-2';",`sceneArt.src='data:image/webp;base64,${scene}';`)
  .replace("cardsArt.src='assets/cards-hd.webp?v=moonfall-2';",`cardsArt.src='data:image/webp;base64,${cards}';`);
let executablePath;
for (const candidate of [process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium'].filter(Boolean)) {
  try {await access(candidate);executablePath=candidate;break;} catch {}
}
const browser=await chromium.launch(executablePath?
  {executablePath,headless:true,args:['--no-sandbox']}:
  {channel:'chrome',headless:true,args:['--no-sandbox']});
try {
  for(const [width,height] of [[844,390],[390,844],[1440,800]]) {
    const page=await browser.newPage({viewport:{width,height},isMobile:width<900,hasTouch:width<900});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.setContent(html);
    await page.addScriptTag({content:js});
    await page.locator('#loadMessage').waitFor({state:'hidden'});
    const canvas=page.locator('#game');
    const box=await canvas.boundingBox();
    assert(box && box.width>=100 && box.height>=50,'Canvas must render at '+width+'×'+height);
    assert(Math.abs(box.width-width)<=1 && Math.abs(box.height-height)<=1,'Canvas fills entire viewport');
    const raster=await page.evaluate(()=>({w:document.getElementById('game').width,h:document.getElementById('game').height}));
    assert(raster.w>=1600 && raster.h>=800,'Canvas draws above baseline logical resolution');
    assert.equal(await page.locator('#fullscreenButton').count(),1,'Fullscreen control is present');
    assert(box.x>=0 && box.x+box.width<=width+2,'Canvas fits screen width');
    if(width===390){
      assert.equal(await page.locator('#orientationPanel').isVisible(),true,'Portrait gives a clear rotate instruction');
      await page.locator('#portraitContinue').click();
      assert.equal(await page.locator('#orientationPanel').isVisible(),false,'Portrait preview opt-out works');
    }
    if(width===844){
      assert(box.height<=height+1,'Landscape canvas fits the phone height');
      const click=async(x,y)=>{
        const rect=await canvas.boundingBox();
        await page.mouse.click(rect.x+x/1600*rect.width,rect.y+y/800*rect.height);
        await page.waitForTimeout(30);
      };
      const state=()=>page.evaluate(()=>window.__moonfallTestState());
      const before=await state();
      assert.equal(before.hand.length,5,'Five opening cards');
      assert.equal(before.foes.length,3,'Three actual enemy combatants');
      assert.equal(before.allies.length,4,'Four allied characters');
      // The first-run guide is unavailable on about:blank; open it explicitly and verify close.
      await page.keyboard.press('h');
      assert.equal((await state()).preview,'guide','Help overlay can open');
      await click(800,650);
      assert.equal((await state()).preview,null,'Help overlay closes');
      await click(1305,300);
      assert.equal((await state()).selectedEnemy,1,'Player can target the center enemy');
      await click(846,630);
      assert.equal((await state()).previewCard,'bloom','Topmost middle fanned card receives taps');
      await click(1120,628);
      await click(438,648);
      assert.equal((await state()).preview,'card','Tapping a card inspects it; does not immediately play');
      assert.equal((await state()).previewCard,'shadow','Left fan card opens the proper original illustration');
      assert.equal((await state()).energy,3,'Preview costs no energy');
      await click(1112,628);
      assert.equal((await state()).preview,null,'Keep in hand closes preview');
      assert.equal((await state()).hand.length,5,'Cancel does not discard card');
      await click(438,648);
      await click(820,628);
      const played=await state();
      assert.equal(played.energy,2,'Confirming a 1-energy card spends 1 energy');
      assert.equal(played.foes[1].hp,165,'Selected enemy actually takes damage');
      assert.equal(played.hand.length,4,'Played card moves out of hand');
      assert.equal(played.discard.length,1,'Played card enters discard');
      await click(89,640);
      assert.equal((await state()).preview,'deck','Deck stack opens collection view');
      await click(1190,136);
      assert.equal((await state()).preview,null,'Deck view closes');
      await click(1460,635);
      const next=await state();
      assert.equal(next.turn,2,'End Turn advances actual turn');
      assert.equal(next.energy,next.maxEnergy,'Energy refills on next turn');
      assert.equal(next.hand.length,5,'A new playable hand is drawn');
      await click(1280,35);
      assert.equal((await state()).turn,1,'Restart resets battle state');
    }
    assert.deepEqual(errors,[],'No browser JavaScript errors at '+width+'×'+height);
    await page.close();
  }
  console.log('MOONFALL BATTLE CHECKS PASSED: illustrated arena, mobile layout, target/card/turn gameplay');
} finally {await browser.close();}
