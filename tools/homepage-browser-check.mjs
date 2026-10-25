/** Browser QA for the unlisted cinematic homepage design; chromium via CHROME_BIN. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, access } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 try{
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   const file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
   if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
   const bytes=await readFile(file);
   res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port;
const candidates=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
let executablePath;for(const p of candidates){try{await access(p);executablePath=p;break;}catch{}}
const browser=await chromium.launch(executablePath?{executablePath,headless:true,args:['--no-sandbox']}:{channel:'chrome',headless:true,args:['--no-sandbox']});
try{
 const results=[];
 for(const width of [320,390,768,1440]){
   // Validate the published homepage independently from both design previews.
   const production=await browser.newPage({viewport:{width,height:width<=390?820:900}});
   const prodErrors=[];production.on('pageerror',err=>prodErrors.push(err.message));
   const prodResponse=await production.goto(origin+'/',{waitUntil:'domcontentloaded'});
   assert.equal(prodResponse.status(),200,'Published homepage responds successfully');
   await production.locator('.hero h1').waitFor();
   await production.locator('main img').evaluateAll(async images=>{
     await Promise.all(images.map(async img=>{img.loading='eager';try{await img.decode()}catch{}}));
   });
   const prodData=await production.evaluate(()=>({
     width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
     images:[...document.querySelectorAll('main img')].map(i=>i.naturalWidth)
   }));
   assert(prodData.scrollWidth<=prodData.width+2,'Published homepage fits '+width+'px ('+prodData.scrollWidth+')');
   assert(prodData.images.every(n=>n>0),'Production project images load');
   assert.equal(await production.locator('.hero-display-line').count(),1,'Published line-art hero is active');
   assert.equal(await production.locator('.hero-display-line-secondary').count(),1,'Published second rule is active');
   assert.equal(await production.locator('.hero-display-type,.studio-structure').count(),0,'Published hero has no oversized monogram or slab');
   assert.equal(await production.locator('meta[name="robots"][content*="noindex"]').count(),0,'Published homepage is indexable');
   assert.equal(await production.locator('.preview-pill').count(),0,'Published homepage has no preview badge');
   assert.equal(await production.title(),'A.J. Ahmed — Creative Developer','Published page has a production title');
   assert.equal(await production.locator('.project').count(),3,'Existing project cards remain intact');
   assert.equal(await production.locator('.project-flow a').getAttribute('href'),'Flow/','Published Flow link is correct');
   assert.equal(await production.locator('.project-solar a').getAttribute('href'),'3D%20Navigation%20Bar/','Published Solar link is correct');
   assert.equal(await production.locator('.project-enzo a').getAttribute('href'),'Enzo/','Published Enzo link is correct');
   assert.equal(await production.locator('.project-flow img').getAttribute('src'),'assets/homepage/flow-product.svg','Published Flow image is production-owned');
   assert.equal(await production.locator('.contact-cta').getAttribute('href'),'mailto:awabjahmed@gmail.com','Email Me contact button is preserved');
   assert.equal(await production.locator('.desktop-nav>a').count(),3,'Desktop links remain');
   const liveMenu=production.locator('.menu-button');await liveMenu.click();
   assert.equal(await liveMenu.getAttribute('aria-expanded'),'true','Published hamburger opens');
   await production.locator('.menu-panel a[href="#work"]').click();
   assert.equal(await liveMenu.getAttribute('aria-expanded'),'false','Published hamburger closes');
   assert.deepEqual(prodErrors,[],'Published homepage has no browser JavaScript errors');
   for(const href of ['Flow/','3D%20Navigation%20Bar/','Enzo/']){
     assert.equal((await production.request.get(origin+'/'+href)).status(),200,'Live project '+href+' resolves');
   }
   assert.equal(await production.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(9, 9, 9)','Near-black theme is retained');
   assert.equal(await production.locator('.email-link').count(),0,'Old visible email link remains removed');
   await production.close();
   results.push({width,status:'PASS'});
 }
 const reduced=await browser.newPage({viewport:{width:390,height:800},reducedMotion:'reduce'});
 await reduced.goto(origin+'/');
 assert.equal(await reduced.locator('.hero-display-line').count(),1);
 assert.equal(await reduced.locator('.project').count(),3);
 await reduced.close();
 for(const legacy of ['index.previous.html','home-preview/','water-hero.js','styles.css','assets/water-aj.webp']){
   const response=await browser.newPage();
   assert.equal((await response.goto(origin+'/'+legacy,{waitUntil:'domcontentloaded'})).status(),404,'Obsolete file no longer served: '+legacy);
   await response.close();
 }
 console.log('PRODUCTION HOMEPAGE BROWSER CHECKS PASSED '+JSON.stringify(results));
}finally{await browser.close();await new Promise(done=>server.close(done))}