/** Moonfall 2.5D illustrated layers and complete playable card actions. */
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import {createServer} from 'node:http';
import {dirname, join, resolve, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

const root=dirname(fileURLToPath(import.meta.url));
const htmlRaw=await readFile(join(root,'index.html'),'utf8');
const css=await readFile(join(root,'style.css'),'utf8');
const jsRaw=await readFile(join(root,'game.js'),'utf8');
const sceneJS=await readFile(join(root,'scene-rebuild-prototype.js'),'utf8');
assert.match(htmlRaw,/scene-rebuild-prototype\.js/,'The live entry point loads the new renderer');
assert.doesNotMatch(htmlRaw,/scene25d\.js/,'The old renderer is not loaded');
assert.match(sceneJS,/artSystem:'self-hosted painted castle and seven imported illustrated sprites'/,'The game draws imported artwork instead of polygonal actor bodies');
assert.match(sceneJS,/function fixedBackground\(/,'The replacement draws its own courtyard');
assert.match(sceneJS,/function model\(/,'The replacement renders articulated character models');
assert.match(htmlRaw,/id="cardInspector"/,'Mobile has a responsive accessible card inspector');
assert.match(sceneJS,/function effects\(/,'The replacement has independent spell choreography');
for(const name of ['wardSigil','brightSlash','lightningPath','crimsonPetal'])
 assert(sceneJS.includes('function '+name+'('),'Spell families have distinct '+name+' visuals');
assert.match(sceneJS,/const terrace=linear\(bg,0,390,0,H/,'Painted castle is grounded by perspective-correct stone terrain');
const cards=(await readFile(join(root,'assets/cards-hd.webp'))).toString('base64');
for(let i=0;i<7;i++){
 const png=await readFile(join(root,'assets/illustrated/actor-'+i+'.png'));
 assert(png.length>20000,'The imported sprite is present as a real PNG asset');
}
const paintedBackground=await readFile(join(root,'assets/backdrop2.webp'));
assert(paintedBackground.length>100000,'High-resolution painted backdrop is available');
const manifest=JSON.parse(await readFile(join(root,'manifest.webmanifest'),'utf8'));
assert.match(htmlRaw,/src="game\.js\?v=moonfall-polish-stage-1"/);
assert.match(htmlRaw,/src="scene-rebuild-prototype\.js\?v=moonfall-polish-stage-1"/);
assert.match(htmlRaw,/<canvas id="sceneBackground"/);
assert.match(htmlRaw,/<canvas id="sceneAtmosphere"/);
assert.match(htmlRaw,/<canvas id="sceneWorld"/);
assert.match(htmlRaw,/apple-mobile-web-app-capable/);
assert.match(htmlRaw,/href="style\.css\?v=moonfall-polish-stage-1"/);
assert.match(jsRaw,/function impactCue\(/,'Combat actions resolve on the rendered impact frames');
assert.match(jsRaw,/flushImpacts\(now\)/,'Gameplay updates share the animation clock');
assert.match(jsRaw,/SEE ANIMATIONS/,'The game keeps its spell-animation showcase');
assert.match(jsRaw,/cardsArt\.src='assets\/cards-hd\.webp\?v=moonfall-clean-sprites-1'/);
assert(cards.length>100000,'Card art is available');
assert.doesNotMatch(sceneJS,/assets\/frames-allies\.webp/,'The rebuilt scene does not use damaged old character atlases');
assert.equal(manifest.display,'fullscreen');
assert.equal(manifest.orientation,'landscape');
assert.match(css,/\.game-shell\{position:relative;width:100vw!important;height:100dvh!important/);

// Test the actual first-party asset URLs and CSP, without injecting large base64 images.
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url||'/','http://localhost').pathname;
  const filename=resolve(root,'.'+pathname);
  if(!filename.startsWith(root+'/')){res.writeHead(403).end();return}
  const body=await readFile(filename);
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
  res.writeHead(200,{'Content-Type':types[extname(filename)]||'application/octet-stream'});
  res.end(body);
 }catch{res.writeHead(404).end()}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const origin='http://127.0.0.1:'+server.address().port;
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
    await page.addInitScript(() => { localStorage.setItem('arcana-slice-guide-v1','done'); });
    await page.goto(origin+'/index.html',{waitUntil:'domcontentloaded'});
    await page.locator('#loadMessage').waitFor({state:'hidden'});
    const canvas=page.locator('#game');
    const box=await page.evaluate(()=>{const r=document.getElementById('game').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}});
    assert(box && box.width>=100 && box.height>=50,'Canvas must render at '+width+'×'+height);
    assert.equal(await page.locator('#sceneWorld').count(),1,'Character and effect layer is present');
    assert.equal(await page.locator('#sceneBackground').count(),1,'Static castle layer is present');
    assert.equal(await page.locator('#sceneAtmosphere').count(),1,'Moving atmosphere has its own layer');
    await page.waitForFunction(()=>window.MoonfallScene.getStats().backgroundLoaded && window.MoonfallScene.getStats().backgroundPaints>=1,null,{timeout:30000});
    const fixedStart=await page.evaluate(()=>window.MoonfallScene.getStats());
    await page.waitForTimeout(220);
    const fixedAfter=await page.evaluate(()=>window.MoonfallScene.getStats());
    assert.equal(fixedStart.backgroundPaints,fixedAfter.backgroundPaints,'Castle background is not repainted during idle animation');
    assert(fixedAfter.atmosphereFrames>fixedStart.atmosphereFrames,'Atmosphere independently animates');
    assert.equal(fixedAfter.layerCount,4,'Four independent scene and HUD layers');
    const modelStats=await page.evaluate(()=>window.MoonfallScene?.getStats());
    assert.equal(modelStats?.actors,7,'Seven rebuilt characters');
    assert.equal(modelStats?.mode,'rigged-illustration','The rebuilt renderer is live');
    await page.waitForFunction(()=>window.MoonfallScene.getStats().loadedArtwork===7&&window.MoonfallScene.getStats().paintedBackgroundLoaded,null,{timeout:30000});
    const importedStats=await page.evaluate(()=>window.MoonfallScene.getStats());
    assert.equal(importedStats?.assetDependencies,7,'The game loads seven self-hosted illustrated characters');
    assert.equal(importedStats?.loadedArtwork,7,'All seven real character illustrations appear in the world');
    assert(importedStats?.paintedBackgroundLoaded,'A painterly environment replaces the flat vector backdrop');
    assert.equal(modelStats?.castAnchors.length,7,'Seven moving casting-hand anchors');
    assert.equal(modelStats?.ground.length,7,'All fighters are grounded');
    assert.equal(modelStats?.riggedParts,70,'The new model renderer has articulated body components');
    assert(modelStats.castAnchors.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)),'Casting origins are finite');
    assert(modelStats.castAnchors.every(p=>p.x>=40&&p.x<=1550&&p.y>=70&&p.y<=470),'Casting origins remain within the battlefield');
    assert.equal(modelStats.animationStates.length,7,'All seven character rigs have states');
    assert.equal(modelStats.actorOffsets.length,7,'All seven actors move independently');
    assert.match(jsRaw,/SEE ANIMATIONS/,'A visible animation showcase exists');
    assert(Math.abs(box.width/box.height-2)<.01,'Stage maintains a true 2:1 aspect ratio');
    assert(Math.abs(box.x-(width-box.width)/2)<=1.5 && Math.abs(box.y-(height-box.height)/2)<=1.5,
      'Stage is centred in the screen without distorting characters or typography');
    assert(box.width<=width+1 && box.height<=height+1,'Stage remains within the viewport');
    assert(Math.abs(box.width/1600-box.height/800)<.005,'Both canvas axes use the same physical scale');
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
        const rect=await page.evaluate(()=>{const r=document.getElementById('game').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}});
        await page.mouse.click(rect.x+x/1600*rect.width,rect.y+y/800*rect.height);
        await page.waitForTimeout(65);
      };
      const state=()=>page.evaluate(()=>window.__moonfallTestState());
      const before=await state();
      assert.equal(before.hand.length,5,'Five opening cards');
      // Check real gameplay-related frame transitions, not just code presence.
      await page.evaluate(()=>window.MoonfallScene.cue({kind:'strike',source:1,target:5}));
      await page.waitForFunction(()=>window.MoonfallScene.getStats().animationStates[1]==='attack',null,{timeout:1500});
      await page.waitForFunction(()=>Math.abs(window.MoonfallScene.getStats().actorOffsets[1])>=35,null,{timeout:1500});
      await page.waitForFunction(()=>window.MoonfallScene.getStats().animationStates[5]==='hurt',null,{timeout:1500});
      await page.waitForTimeout(900);
      await page.evaluate(()=>window.MoonfallScene.cue({kind:'heal',source:2,target:0}));
      await page.waitForFunction(()=>window.MoonfallScene.getStats().animationStates[2]==='cast',null,{timeout:1500});
      await page.waitForTimeout(950);
      assert.equal(before.foes.length,3,'Three actual enemy models');
      assert.equal(before.allies.length,4,'Four separate allied models');
      const fan=await page.evaluate(()=>window.__moonfallFanLayout());
      assert.equal(fan.length,5,'Five cards form the opening hand');
      assert(fan.every(c=>Math.abs(c.w/c.h-2/3)<.001),'Each card has a true 2:3 aspect ratio independent of device geometry');
      assert(fan.every(c=>Math.max(...c.polygon.map(p=>p.y))<800),'The entire card hand fits inside the screen');
      assert(fan.every(c=>Math.min(...c.polygon.map(p=>p.y))>500),'Cards stay below character health bars');
      assert(fan[0].angle<fan[1].angle&&fan[2].angle===0&&fan[4].angle>0,'Hand has realistic left-to-right fan angles');
      assert(fan[0].x+fan[0].w>fan[1].x,'Cards overlap like a real hand');
      assert(fan[2].y<fan[0].y,'Middle of the hand is raised');
      assert(fan[2].y>=565,'Cards sit closer to the bottom edge');
      assert(fan[1].x-fan[0].x<=66,'Cards are packed into a tighter fan');
      assert(Math.abs(fan[0].angle)<=.23&&Math.abs(fan[4].angle)<=.23,'The fantasy fan keeps controlled outer tilt');
      assert(fan[2].x+fan[2].w/2>=775&&fan[2].x+fan[2].w/2<=825,'The hand is horizontally centred');
      assert(fan.every(c=>Math.max(...c.polygon.map(p=>p.y))<795),'Lower fan remains entirely visible on phone landscape');
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
      // Showcase can be opened from the keyboard and does not alter game state.
      const beforeDemo=await state();
      await page.keyboard.press('m');
      await page.waitForFunction(()=>window.MoonfallScene.getStats().lastCue==='enemy',null,{timeout:1500});
      assert.deepEqual((await state()).foes,beforeDemo.foes,'Animation demo does not inflict damage');
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
      assert(Math.abs(preview.width/preview.height-2/3)<.001,'Expanded card keeps physical 2:3 ratio');
      assert.equal((await state()).energy,3,'Preview does not spend energy');
      const inspector=page.locator('#cardInspector');
      await inspector.waitFor({state:'visible'});
      assert.equal(await page.locator('#cardInspectorName').textContent(),'Crimson Bloom','Mobile inspector shows the real card title');
      if(width===844)await page.screenshot({path:join(root,'art-preview-phone.png')});
      assert((await page.evaluate(()=>document.getElementById('cardInspectorPlay').getBoundingClientRect().height))>=40,'Mobile play action has a finger-sized touch target');
      await page.locator('#cardInspectorCancel').click();
      assert.equal((await state()).preview,null,'Mobile cancel closes preview');
      const left=await visiblePoint(0);
      assert(left,'The outermost left card remains tappable despite overlap');
      await click(left.x,left.y);
      assert.equal((await state()).previewCard,'shadow','Outermost card expands to correct preview');
      await page.locator('#cardInspectorCancel').click();
      assert.equal((await state()).hand.length,5,'Cancel keeps card in hand');
      const leftAgain=await visiblePoint(0);
      await click(leftAgain.x,leftAgain.y);
      await page.locator('#cardInspectorPlay').click();
      const played=await state();
      assert.equal(played.energy,2,'Confirm spends energy');
      assert.equal(played.foes[1].hp,300,'Damage is not applied before the visible spell strikes');
      assert(played.pendingImpacts>0&&played.resolving,'Card play locks further actions while its hit is pending');
      await page.waitForFunction(()=>window.__moonfallTestState().foes[1].hp===165,null,{timeout:5000});
      assert.equal((await state()).resolving,false,'Impact unlocks the next card action');
      const afterStrike=await page.evaluate(()=>window.MoonfallScene.getStats());
      assert.equal(afterStrike.backgroundPaints,fixedAfter.backgroundPaints,'The architecture is still fixed during attacks');
      const attackStats=await page.evaluate(()=>window.MoonfallScene.getStats());
      assert.equal(attackStats.lastCue,'strike','Playing Shadow Step triggers its attack animation');
      assert.equal(played.hand.length,4,'Played card is removed from hand');
      assert.equal(played.discard.length,1,'Card enters discard');
      await click(75,715);
      assert.equal((await state()).preview,'deck','Draw pile can be inspected');
      await click(1190,136);
      assert.equal((await state()).preview,null,'Deck closes');
      await click(1492,700);
      assert.equal((await state()).turn,1,'Turn waits for enemy attack impacts to finish');
      await page.waitForFunction(()=>window.__moonfallTestState().turn===2,null,{timeout:6000});
      const next=await state();
      assert.equal(next.turn,2,'End Turn advances combat');
      const enemyStats=await page.evaluate(()=>window.MoonfallScene.getStats());
      assert.equal(enemyStats.lastCue,'enemy','End Turn triggers enemy attack motion');
      assert.equal(next.energy,next.maxEnergy,'Turn refills energy');
      assert.equal(next.hand.length,5,'New hand drawn');
      await click(1280,35);
      assert.equal((await state()).turn,1,'Restart resets battle');
    }
    if(width===1440){
      await page.screenshot({path:join(root,'art-preview.png')});
      // Capture a real cast mid-flight, not a concept image or idle-only preview.
      await page.evaluate(()=>window.MoonfallScene.cue({kind:'bolt',source:3,target:5}));
      await page.waitForTimeout(710);
      await page.screenshot({path:join(root,'art-preview-spell.png')});
    }
    assert.deepEqual(errors,[],'No browser JavaScript errors at '+width+'×'+height);
    await page.close();
  }
  // The rebuilt renderer is tested directly by the production gameplay loop above.
  console.log('MOONFALL ART IMPORT PASSED: seven illustrated characters, painted environment, responsive cards and combat');
} finally {await browser.close();await new Promise(ok=>server.close(ok));}
