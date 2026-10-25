/** Production homepage responsive, keyboard, security, and performance checks. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, access, stat } from 'node:fs/promises';
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
 const bytes=await Promise.all(['index.html','homepage.css','homepage.js'].map(p=>stat(resolve(root,p)).then(x=>x.size)));
 assert(bytes[0]<12000&&bytes[1]<30000&&bytes[2]<7500,'Homepage HTML, CSS and JS stay below byte budgets');
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
   const projectLayout=await production.evaluate(()=>({
     columns:getComputedStyle(document.querySelector('.projects-grid')).gridTemplateColumns.trim().split(/\s+/).length,
     cards:[...document.querySelectorAll('.project')].map(card=>{
       const image=card.querySelector('img');
       const info=card.querySelector('.project-info');
       const frame=card.getBoundingClientRect();
       const infoFrame=info.getBoundingClientRect();
       const imageStyle=getComputedStyle(image);
       return {
         fit:imageStyle.objectFit,
         position:imageStyle.objectPosition,
         infoInside:infoFrame.left>=frame.left-1&&infoFrame.right<=frame.right+1&&
           infoFrame.top>=frame.top-1&&infoFrame.bottom<=frame.bottom+1
       };
     })
   }));
   assert(projectLayout.cards.every(x=>x.infoInside),'All project labels fit inside their cards');
   if(width<=390){
     assert.equal(projectLayout.columns,1,'Mobile project cards stack in one column');
     assert(projectLayout.cards.every(x=>x.fit==='contain'&&x.position==='50% 0%'),
       'All mobile artwork fits inside its frame without cropping');
   }else if(width===768){
     assert.equal(projectLayout.columns,1,'Tablet project cards stack instead of squeezing the featured image');
   }else{
     assert.equal(projectLayout.columns,2,'Desktop project grid layout stays unchanged');
   }
   assert.equal(await production.locator('.hero-display-line').count(),1,'Published line-art hero is active');
   assert.equal(await production.locator('.hero-display-line-secondary').count(),1,'Published second rule is active');
   assert.equal(await production.locator('.hero-display-type,.studio-structure').count(),0,'Published hero has no oversized monogram or slab');
   assert.equal(await production.locator('meta[name="robots"][content*="noindex"]').count(),0,'Published homepage is indexable');
   assert.equal(await production.locator('.preview-pill').count(),0,'Published homepage has no preview badge');
   assert.equal(await production.title(),'A.J. Ahmed — Creative Developer','Published page has a production title');
   assert.equal(await production.locator('link[href^="homepage.css"]').count(),1,'Single main CSS stylesheet');
   assert.equal(await production.locator('link[href*="hero-lines.css"]').count(),0,'No secondary blocking hero stylesheet');
   assert.equal(await production.locator('link[rel="canonical"]').getAttribute('href'),'https://awabja.github.io/','Canonical URL');
   const security=await production.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
   assert(security.includes("script-src 'self';")&&security.includes("object-src 'none'"),'Strict homepage CSP');
   assert.equal(await production.locator('.project').count(),3,'Existing project cards remain intact');
   assert.equal(await production.locator('.project-flow a').getAttribute('href'),'Flow/','Published Flow link is correct');
   assert.equal(await production.locator('.project-serivia a').getAttribute('href'),'serivia/','serivia project links to named route');
   assert.equal(await production.locator('.project-serivia .project-title').innerText(),'serivia','serivia branding is lowercase');
   assert.equal(await production.locator('.project-serivia img').getAttribute('src'),'assets/homepage/serivia-product.svg','Local serivia card artwork');
   assert.equal(await production.locator('.project-solar').count(),0,'Old Solar project card removed');
   assert.equal(await production.locator('.project-enzo a').getAttribute('href'),'Enzo/','Published Enzo link is correct');
   assert.equal(await production.locator('.project-flow img').getAttribute('src'),'assets/homepage/flow-product.svg','Published Flow image is production-owned');
   assert.equal(await production.locator('.contact-cta').getAttribute('href'),'mailto:awabjahmed@gmail.com','Email Me contact button is preserved');
   assert.equal(await production.locator('.desktop-nav>a').count(),3,'Desktop links remain');
   const liveMenu=production.locator('.menu-button');await liveMenu.click();
   assert.equal(await liveMenu.getAttribute('aria-expanded'),'true','Published hamburger opens');
   if(width===390){
     const first=production.locator('.menu-panel a').first();
     const last=production.locator('.menu-panel a').last();
     await production.waitForFunction(()=>document.activeElement===document.querySelector('.menu-panel a'),null,{timeout:2500});
     assert.equal(await first.evaluate(el=>document.activeElement===el),true,'Opening the drawer focuses its first link');
     await first.press('Shift+Tab');
     assert.equal(await liveMenu.evaluate(el=>document.activeElement===el),true,'Reverse Tab reaches close button');
     await liveMenu.press('Shift+Tab');
     assert.equal(await last.evaluate(el=>document.activeElement===el),true,'Focus wraps to last menu link');
     await last.press('Tab');
     assert.equal(await liveMenu.evaluate(el=>document.activeElement===el),true,'Focus wraps to menu toggle');
     await liveMenu.press('Escape');
     assert.equal(await liveMenu.getAttribute('aria-expanded'),'false','Escape closes drawer');
     await liveMenu.click();
   }
   await production.locator('.menu-panel a[href="#work"]').click();
   assert.equal(await liveMenu.getAttribute('aria-expanded'),'false','Published hamburger closes');
   assert.deepEqual(prodErrors,[],'Published homepage has no browser JavaScript errors');
   for(const href of ['Flow/','serivia/','Enzo/']){
     assert.equal((await production.request.get(origin+'/'+href)).status(),200,'Live project '+href+' resolves');
   }
   const legacyHtml=await production.request.get(origin+'/Cinema/',{maxRedirects:0});
   assert.equal(legacyHtml.status(),200,'Previous Cinema link still responds');
   assert((await legacyHtml.text()).includes('url=../serivia/'),'Old Cinema URL redirects to serivia');
   assert.equal(await production.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(9, 9, 9)','Near-black theme is retained');
   assert.equal(await production.locator('.email-link').count(),0,'Old visible email link remains removed');
   if(width>=768){
     const animation=await production.locator('.project-flow img').evaluate(el=>getComputedStyle(el).transitionDuration);
     assert(animation.includes('.85s')||animation.includes('0.85s'),'Desktop keeps its smooth hover zoom');
   }
   await production.close();
   results.push({width,status:'PASS'});
 }
 // Real touch input: feedback appears while pressed, cancels cleanly on a swipe,
 // and a single tap opens the destination without a two-tap requirement.
 const touchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const touchPage=await touchContext.newPage();
 await touchPage.goto(origin+'/',{waitUntil:'domcontentloaded'});
 const flowLink=touchPage.locator('.project-flow .project-image');
 await flowLink.scrollIntoViewIfNeeded();
 const pressBox=await flowLink.boundingBox();
 const touchX=pressBox.x+pressBox.width/2;
 const touchY=pressBox.y+Math.min(90,pressBox.height/3);
 const session=await touchContext.newCDPSession(touchPage);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchX,y:touchY}]});
 assert.equal(await flowLink.evaluate(el=>el.classList.contains('is-touching')),true,'Touch press activates card feedback');
 await touchPage.waitForTimeout(80);
 const pressed=await flowLink.evaluate(el=>({
   border:getComputedStyle(el).borderColor,
   scale:getComputedStyle(el).transform,
   imageScale:getComputedStyle(el.querySelector('img')).transform
 }));
 assert(pressed.border!=='rgb(43, 43, 43)','Touch provides a visible border highlight');
 assert(pressed.scale!=='none'&&pressed.imageScale!=='none','Touch press smoothly moves the image and card');
 await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
 assert.equal(await flowLink.evaluate(el=>el.classList.contains('is-touching')),false,'Canceled touch clears feedback');
 assert.equal(new URL(touchPage.url()).pathname,'/','Cancel does not navigate');
 await Promise.all([
   touchPage.waitForURL(url=>url.pathname==='/Flow/',{waitUntil:'domcontentloaded'}),
   touchPage.touchscreen.tap(touchX,touchY)
 ]);
 assert.equal(new URL(touchPage.url()).pathname,'/Flow/','One tap opens Flow without an extra touch');
 await touchContext.close();
 const landscape=await browser.newPage({viewport:{width:568,height:320},isMobile:true,hasTouch:true});
 await landscape.goto(origin+'/');
 await landscape.locator('.menu-button').click();
 const menuScroll=await landscape.locator('.menu-panel').evaluate(el=>({overflow:getComputedStyle(el).overflowY,height:el.clientHeight}));
 assert.equal(menuScroll.overflow,'auto','Short mobile landscape drawer can scroll');
 assert(menuScroll.height<=321,'Drawer fits landscape screen height');
 assert.equal(await landscape.locator('.menu-panel a').count(),4);
 await landscape.close();
 const reduced=await browser.newPage({viewport:{width:390,height:800},reducedMotion:'reduce'});
 await reduced.goto(origin+'/');
 assert.equal(await reduced.locator('.hero-display-line').count(),1);
 assert.equal(await reduced.locator('.project').count(),3);
 await reduced.close();
 for(const legacy of ['index.previous.html','home-preview/','water-hero.js','styles.css','assets/water-aj.webp','3D%20Navigation%20Bar/','assets/homepage/solar-interface.svg']){
   const response=await browser.newPage();
   assert.equal((await response.goto(origin+'/'+legacy,{waitUntil:'domcontentloaded'})).status(),404,'Obsolete file no longer served: '+legacy);
   await response.close();
 }
 console.log('PRODUCTION HOMEPAGE BROWSER CHECKS PASSED '+JSON.stringify(results));
}finally{await browser.close();await new Promise(done=>server.close(done))}