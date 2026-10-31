/** Automated end-to-end vertical-slice smoke test; no third-party game assets or runtime libraries. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, dirname, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  const decoded=decodeURIComponent(url.pathname);
  const dest=resolve(root,'.'+(decoded.endsWith('/')?decoded+'index.html':decoded));
  if(!dest.startsWith(root+sep)){res.writeHead(403);res.end();return}
  const data=await readFile(dest);
  res.writeHead(200,{'content-type':types[extname(dest)]||'application/octet-stream','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(data);
 }catch{res.writeHead(404);res.end('Not found')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const res=await page.goto(base+'/card-game/',{waitUntil:'networkidle'});
 assert.equal(res.status(),200);
 await page.waitForFunction(()=>document.getElementById('game')?.dataset.phase==='playing');
 const canvas=page.locator('#game');
 const state=async key=>canvas.getAttribute('data-'+key);
 const click=async(x,y)=>{
  const b=await canvas.boundingBox();
  await page.mouse.click(b.x+x/1600*b.width,b.y+y/800*b.height);
  await page.waitForTimeout(150);
 };
 assert.equal(await state('energy'),'3');assert.equal(await state('hand'),'5');
 assert.equal(await state('foes'),'250,300,340');
 assert.equal((await page.locator('#loadMessage').getAttribute('class')).includes('hidden'),true);
 assert.equal(await state('preview'),'guide','First-time how-to-play guide is visible');
 await click(785,650);assert.equal(await state('preview'),'none');
 await click(382,650);assert.equal(await state('preview'),'card','Tap previews the first card');
 assert.equal(await state('energy'),'3','Preview does not spend energy');
 assert.equal(await state('foes'),'250,300,340','Preview does not deal damage');
 await click(1117,630);assert.equal(await state('preview'),'none','Keep in Hand closes the preview');
 assert.equal(await state('hand'),'5');
 await click(382,650);await click(800,631);
 assert.equal(await state('hand'),'4');assert.equal(await state('energy'),'2');
 assert.equal(await state('foes'),'115,300,340','Shadow Step attacks selected target');
 await click(1460,630);assert.equal(await state('turn'),'2');assert.equal(await state('hand'),'5');
 assert.notEqual(await state('allies'),'190,180,185,195','Enemies act and deal damage on End Turn');
 await click(90,670);assert.equal(await state('preview'),'deck','Deck opens');
 await click(380,347);assert.equal(await state('preview'),'card','Deck cards are inspectable');
 await click(775,634);assert.equal(await state('preview'),'deck');
 await click(1225,135);assert.equal(await state('preview'),'none');
 await click(1465,35);assert.equal(await state('preview'),'guide');
 await click(785,650);assert.equal(await state('preview'),'none');
 assert.deepEqual(errors,[],'No JavaScript exceptions in the landscape flow');
 const box=await canvas.boundingBox();
 assert(box.width>700&&box.height>=350,'Landscape game fits and remains readable');
 await page.close();
 const portrait=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await portrait.goto(base+'/card-game/',{waitUntil:'networkidle'});
 await portrait.locator('.orientation-panel').waitFor();
 assert.equal(await portrait.locator('.orientation-panel').isVisible(),true,'Rotation guidance appears in portrait');
 await portrait.locator('#portraitContinue').click();
 assert.equal(await portrait.locator('.orientation-panel').isVisible(),false,'Users may override the rotation hint');
 await portrait.close();
 const desktop=await browser.newPage({viewport:{width:1440,height:800}});
 await desktop.goto(base+'/card-game/',{waitUntil:'networkidle'});
 await desktop.waitForFunction(()=>document.getElementById('game').dataset.phase==='playing');
 assert.equal(await desktop.locator('#orientationPanel').isVisible(),false);
 assert.equal(await desktop.locator('#game').getAttribute('data-hand'),'5');
 await desktop.close();
 console.log('ARCANA DUEL VERTICAL SLICE BROWSER TESTS PASSED');
}finally{await browser.close();server.close()}