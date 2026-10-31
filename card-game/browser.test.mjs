/** Moonfall 2.5D illustrated layers and complete playable card actions. */
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

const root=dirname(fileURLToPath(import.meta.url));
const htmlRaw=await readFile(join(root,'index.html'),'utf8');
const css=await readFile(join(root,'style.css'),'utf8');
const jsRaw=await readFile(join(root,'game.js'),'utf8');
const sceneJS=await readFile(join(root,'scene25d.js'),'utf8');
const background=(await readFile(join(root,'assets/backdrop2.webp'))).toString('base64');
const actors=(await readFile(join(root,'assets/characters.webp'))).toString('base64');
const cards=(await readFile(join(root,'assets/cards-hd.webp'))).toString('base64');
const manifest=JSON.parse(await readFile(join(root,'manifest.webmanifest'),'utf8'));
assert.match(htmlRaw,/src="game\.js\?v=moonfall-25d-1"/);
assert.match(htmlRaw,/src="scene25d\.js\?v=moonfall-25d-1"/);
assert.match(htmlRaw,/<canvas id="sceneWorld"/);
assert.match(htmlRaw,/apple-mobile-web-app-capable/);
assert.match(htmlRaw,/href="style\.css\?v=moonfall-25d-1"/);
assert.doesNotMatch(jsRaw,/sceneArt|battle-hd|atlas\.webp/,'Old painted battlefield not used');
assert.match(sceneJS,/layered illustration/);
assert.match(sceneJS,/drawActor\(/);
assert.doesNotMatch(sceneJS,/getContext\('webgl'/);
assert.match(jsRaw,/cardsArt\.src='assets\/cards-hd\.webp\?v=moonfall-25d-1'/);
assert(cards.length>100000,'Card art must be present');
assert(background.length>150000 && actors.length>100000,'High-resolution illustration layers must be present');
assert.equal(manifest.display,'fullscreen');
assert.equal(manifest.orientation,'landscape');
assert.match(css,/\.game-shell\{position:relative;width:100vw!important;height:100dvh!important/);

// Inline only in tests to avoid network dependencies and guarantee the tested source is this commit.
const html=htmlRaw.replace(/<meta http-equiv="Content-Security-Policy"[^>]+>/,'')
  .replace(/<link rel="stylesheet"[^>]+>/,`<style>${css}</style>`)
  .replace(/<script src="[^"]+" defer><\/script>/g,'');
const js=jsRaw.replace("cardsArt.src='assets/cards-hd.webp?v=moonfall-25d-1';",`cardsArt.src='data:image/webp;base64,${cards}';`);
const scene=sceneJS.replace("background.src='assets/backdrop2.webp?v=moonfall-25d-1';",`background.src='data:image/webp;base64,${background}';`)
 .replace("actors.src='assets/characters.webp?v=moonfall-25d-1';",`actors.src='data:image/webp;base64,${actors}';`);
let executablePath;
for (const candidate of [process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium'].filter(Boolean)) {
  try {await access(candidate);executablePath=candidate;break;} catch {}
}
const browser=await chromium.launch(executablePath?
  {executablePath,headless:true,args:['--no-sandbox']}:
  {channel:'chrome',headless:true,args:['--no-sandbox']});
try {
  for(const [width,height] of [[844,390],[932,430],[390,844],[1440,800]]) {
    const page=await browser.newPage({viewport:{width,height},isMobile:width<900,hasTouch:width<900});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.setContent(html);
    await page.addScriptTag({content:scene});
    await page.addScriptTag({content:js});
    await page.locator('#loadMessage').waitFor({state:'hidden'});
    const canvas=page.locator('#game');
    const box=await canvas.boundingBox();
    assert(box && box.width>=100 && box.height>=50,'Canvas must render at '+width+'×'+height);
    assert.equal(await page.locator('#sceneWorld').count(),1,'Separate illustration canvas is present');
    const modelStats=await page.evaluate(()=>window.MoonfallScene?.getStats());
    assert.equal(modelStats?.actors,7,'Seven independently rendered anime character sprites');
    assert.equal(modelStats?.mode,'layered-2.5D','Renderer is an illustrated 2.5D scene');
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
    if(width===844||width===932){
      assert(box.height<=height+1,'Landscape canvas fits phone height');
      const click=async(x,y)=>{
        const rect=await canvas.boundingBox();
        await page.mouse.click(rect.x+x/1600*rect.width,rect.y+y/800*rect.height);
        await page.waitForTimeout(65);
      };
      const state=()=>page.evaluate(()=>window.__moonfallTestState());
      const before=await state();
      assert.equal(before.hand.length,5,'Five opening cards');
      assert.equal(before.foes.length,3,'Three actual enemy models');
      assert.equal(before.allies.length,4,'Four separate allied models');
      const fan=await page.evaluate(()=>window.__moonfallFanLayout());
      assert.equal(fan.length,5,'Five cards form the opening hand');
      assert(fan.every(c=>Math.abs((c.w/c.h)*((width/height)/2)-2/3)<.025),'Each physical card has an unsquished 2:3 ratio');
      assert(fan.every(c=>Math.max(...c.polygon.map(p=>p.y))<800),'The entire card hand fits inside the screen');
      assert(fan.every(c=>Math.min(...c.polygon.map(p=>p.y))>500),'Cards stay below character health bars');
      assert(fan[0].angle<fan[1].angle&&fan[2].angle===0&&fan[4].angle>0,'Hand has realistic left-to-right fan angles');
      assert(fan[0].x+fan[0].w>fan[1].x,'Cards overlap like a real hand');
      assert(fan[2].y<fan[0].y,'Middle of the hand is raised');
      assert.match(jsRaw,/const gaugeY=447/,'Health bars are anchored under characters');
      assert.match(sceneJS,/positions=\[/,'Sprites are laid out on the battlefield');
      const visiblePoint=async slot=>{
        return page.evaluate(slot=>{
          const c=window.__moonfallFanLayout()[slot];
          for(let fy=.36;fy<.80;fy+=.07)for(let fx=.09;fx<.87;fx+=.08){
            const x=c.x+c.w*fx,y=c.y+c.h*fy,action=window.__moonfallHitTest(x,y);
            if(action?.action==='card'&&action.meta===slot)return {x,y};
          }
          return null;
        },slot);
      };
      // Reveal guide with keyboard and dismiss without affecting the battle.
      await page.keyboard.press('h');
      assert.equal((await state()).preview,'guide','Help overlay opens');
      await click(800,650);
      assert.equal((await state()).preview,null,'Help overlay closes');
      await click(1261,330);
      assert.equal((await state()).selectedEnemy,1,'Center enemy is independently targetable');
      const center=await visiblePoint(2);
      assert(center,'The center card exposes a tappable face');
      await click(center.x,center.y);
      assert.equal((await state()).previewCard,'bloom','Center card expands to correct full card preview');
      const preview=await page.evaluate(()=>window.__moonfallPreviewSize());
      assert(Math.abs((preview.width/preview.height)*((width/height)/2)-2/3)<.025,'Expanded card keeps physical 2:3 ratio');
      assert.equal((await state()).energy,3,'Preview does not spend energy');
      await click(1112,628);
      assert.equal((await state()).preview,null,'Cancel closes preview');
      const left=await visiblePoint(0);
      assert(left,'The outermost left card remains tappable despite overlap');
      await click(left.x,left.y);
      assert.equal((await state()).previewCard,'shadow','Outermost card expands to correct preview');
      await click(1112,628);
      assert.equal((await state()).hand.length,5,'Cancel keeps card in hand');
      const leftAgain=await visiblePoint(0);
      await click(leftAgain.x,leftAgain.y);
      await click(820,628);
      const played=await state();
      assert.equal(played.energy,2,'Confirm spends energy');
      assert.equal(played.foes[1].hp,165,'Card damages selected enemy');
      assert.equal(played.hand.length,4,'Played card is removed from hand');
      assert.equal(played.discard.length,1,'Card enters discard');
      await click(75,715);
      assert.equal((await state()).preview,'deck','Draw pile can be inspected');
      await click(1190,136);
      assert.equal((await state()).preview,null,'Deck closes');
      await click(1492,700);
      const next=await state();
      assert.equal(next.turn,2,'End Turn advances combat');
      assert.equal(next.energy,next.maxEnergy,'Turn refills energy');
      assert.equal(next.hand.length,5,'New hand drawn');
      await click(1280,35);
      assert.equal((await state()).turn,1,'Restart resets battle');
    }
    assert.deepEqual(errors,[],'No browser JavaScript errors at '+width+'×'+height);
    await page.close();
  }
  console.log('MOONFALL 2.5D CHECKS PASSED: illustration layers, seven sprites, cards, turns and mobile layout');
} finally {await browser.close();}
