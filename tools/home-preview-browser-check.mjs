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
   const page=await browser.newPage({viewport:{width,height:width<=390?820:900}});
   const errors=[];page.on('pageerror',err=>errors.push(err.message));
   const response=await page.goto(origin+'/home-preview/',{waitUntil:'domcontentloaded'});
   assert.equal(response.status(),200,'Preview HTML loads');
   await page.locator('.hero h1').waitFor();
   await page.locator('main img').evaluateAll(async images=>{await Promise.all(images.map(async img=>{img.loading='eager';try{await img.decode()}catch{}}))});
   const data=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,images:[...document.querySelectorAll('main img')].map(i=>i.naturalWidth),projects:document.querySelectorAll('.project').length,imagesVisible:[...document.querySelectorAll('.project')].map(x=>getComputedStyle(x).opacity)}));
   assert(data.scrollWidth<=data.width+2,`${width}px viewport does not overflow (${data.scrollWidth})`);
   assert.equal(data.projects,3,'All real projects shown');
   assert.equal(await page.locator('.hero-scene img').count(),0,'Hero no longer uses the fantasy wallpaper');
   assert.equal(await page.locator('.studio-structure').count(),1,'A quiet architectural scene replaces the wallpaper');
   assert.equal(await page.locator('.circle-arrow,.project-arrow').count(),0,'Circular arrow buttons are removed');
   assert.equal(await page.locator('.project-cta').count(),3,'Projects have understated text calls to action');
   assert.equal(await page.locator('.contact-cta').innerText(),'EMAIL ME','Contact button has a clear text label');
   assert.equal(await page.locator('.explore-link').innerText(),'VIEW SELECTED WORK','Hero button is clearly labeled');
   assert.equal(await page.locator('.studio-structure').evaluate(el=>getComputedStyle(el).display!=='none'),true,'Hero detail stays visible');

   assert(data.images.every(w=>w>0),'Artwork fully loads');
   assert(data.imagesVisible.every(v=>Number(v)>.9),'Project previews are not hidden by animation');
   assert.equal(errors.length,0,'No browser JS errors: '+errors.join('; '));
   for(const href of ['../Flow/','../3D%20Navigation%20Bar/','../Enzo/']){
     assert(await page.locator(`a.project-image[href="${href}"]`).count()===1,'Project link '+href+' exists');
   }
   const toggle=page.locator('.menu-button');await toggle.click();
   assert.equal(await toggle.getAttribute('aria-expanded'),'true','Menu opens');
   await page.locator('.menu-panel').waitFor({state:'visible'});
   await page.locator('.menu-panel a[href="#work"]').click();
   assert.equal(await toggle.getAttribute('aria-expanded'),'false','Menu closes on link');
   results.push({width,status:'PASS'});await page.close();
 }
 const reduced=await browser.newPage({viewport:{width:390,height:800},reducedMotion:'reduce'});
 await reduced.goto(origin+'/home-preview/');
 assert.equal(await reduced.locator('.project').count(),3);
 assert.equal(await reduced.locator('.about h2').isVisible(),true);
 await reduced.close();
 console.log('CINEMATIC HOMEPAGE PREVIEW CHECKS PASSED '+JSON.stringify(results));
}finally{await browser.close();await new Promise(done=>server.close(done))}