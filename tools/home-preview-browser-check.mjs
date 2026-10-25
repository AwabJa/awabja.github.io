/** Browser QA for the unlisted home preview. `npm install --no-save playwright-core@1.56.1` first. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,access} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=resolve(root,'.'+(path.endsWith('/')?path+'index.html':path));
  if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return}
  const contents=await readFile(file);
  res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(contents)
 }catch{res.writeHead(404);res.end('Not found')}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port;
const candidates=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
let executablePath;
for(const path of candidates){try{await access(path);executablePath=path;break}catch{}}
const browser=await chromium.launch(executablePath?{executablePath,headless:true,args:['--no-sandbox']}:{channel:'chrome',headless:true,args:['--no-sandbox']});
try{
 const checks=[];
 for(const width of [320,390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:width<=390?780:900}});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  const response=await page.goto(origin+'/home-preview/',{waitUntil:'load'});
  assert.equal(response.status(),200,'Preview page must load');
  await page.locator('h1').waitFor();
  // Eagerly decode the preview's lazy-loaded project images before asserting.
  await page.locator('main img').evaluateAll(async images=>{
   await Promise.all(images.map(async image=>{
    image.loading='eager';
    try{await image.decode()}catch{}
   }));
  });
  const data=await page.evaluate(()=>({
   vw:innerWidth,scroll:document.documentElement.scrollWidth,
   imgs:[...document.images].map(img=>({complete:img.complete,width:img.naturalWidth})),
   headings:[...document.querySelectorAll('main h1,main h2')].map(x=>x.textContent.trim()),
   projects:document.querySelectorAll('.feature-project, .editorial-card').length
  }));
  assert(data.scroll<=data.vw+2,`${width}px viewport must not overflow horizontally: ${data.scroll}px`);
  assert(data.imgs.every(x=>x.complete&&x.width>0),'All project artwork must load');
  assert.equal(data.projects,3,'All three projects must appear');
  assert.equal(errors.length,0,'No browser JS errors: '+errors.join('; '));
  for(const href of ['../Flow/index.html','../Enzo/index.html','../3D%20Navigation%20Bar/index.html']){
   assert(await page.locator(`a[href="${href}"]`).count()>0,`Project link missing: ${href}`);
  }
  if(width<=390){
   const toggle=page.locator('.nav-toggle');
   assert.equal(await toggle.isVisible(),true,'Mobile nav toggle visible');
   await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
   await page.locator('.nav-panel a[href="#work"]').click();
   assert.equal(await toggle.getAttribute('aria-expanded'),'false','Mobile nav closes on navigation');
  }else{
   assert.equal(await page.locator('.nav-panel').isVisible(),true,'Desktop navigation visible');
  }
  checks.push({width,result:'PASS'});
  await page.close();
 }
 const reduced=await browser.newPage({viewport:{width:390,height:840},reducedMotion:'reduce'});
 await reduced.goto(origin+'/home-preview/');
 assert.equal(await reduced.locator('h1').isVisible(),true,'Reduced-motion user sees hero');
 assert.equal(await reduced.locator('#work').isVisible(),true,'Reduced-motion user sees work');
 await reduced.close();
 console.log('HOME PREVIEW BROWSER CHECKS PASSED '+JSON.stringify(checks));
}finally{await browser.close();await new Promise(done=>server.close(done))}
