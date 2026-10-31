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
  await page.locator('.enemy-name').waitFor();
  assert.equal(await page.locator('.hand .card').count(),5,'Opening hand has 5 cards');
  assert.equal(await page.locator('.wallet strong').innerText(),'50');
  assert((await page.title()).includes('Arcana Duel'));
  const before=await page.locator('.battle-message').innerText();
  await page.locator('.hand button.card:not([disabled])').first().click();
  assert.notEqual(await page.locator('.battle-message').innerText(),before,'Playing a card causes an effect');
  await page.locator('[data-action="end"]').click();
  assert((await page.locator('.stage-title').innerText()).includes('TURN 2'),'End turn advances turn');
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
 console.log('ARCANA DUEL BROWSER CHECKS PASSED');
}finally{await browser.close();server.close()}
