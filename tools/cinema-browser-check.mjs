/** Serivia responsive and functional browser QA. Run with playwright-core and Chrome/Chromium. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,access,stat} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(root+sep)){res.writeHead(403);res.end('Forbidden');return}
  const bytes=await readFile(file);
  res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const binaries=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
let executablePath;
for(const path of binaries){try{await access(path);executablePath=path;break}catch{}}
const browser=await chromium.launch(executablePath?{executablePath,headless:true,args:['--no-sandbox']}:{channel:'chrome',headless:true,args:['--no-sandbox']});
try{
 const budgets=await Promise.all(['Cinema/index.html','Cinema/styles.css','Cinema/app.js'].map(file=>stat(resolve(root,file)).then(result=>result.size)));
 assert(budgets[0]<20000&&budgets[1]<35000&&budgets[2]<28000,'Static app files remain compact');
 const results=[];
 for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:width<500?812:1000},isMobile:width<500,hasTouch:width<500});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // The curated app is tested offline from TMDB; poster failures must be graceful.
  await page.route('https://image.tmdb.org/**',route=>route.abort('failed'));
  const response=await page.goto(origin+'/Cinema/',{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200,'Cinema opens');
  await page.locator('.movie-card').first().waitFor();
  assert.equal(await page.title(),'Serivia — Discover great movies');
  assert.equal(await page.locator('.movie-card').count(),12,'Twelve curated film cards render');
  assert.equal(await page.locator('#slideDots button').count(),4,'Featured carousel has four slides');
  assert.equal(await page.locator('#featuredNext').isVisible(),true,'Featured next arrow is visible');
  await page.locator('#featuredNext').click();
  assert.equal(await page.locator('#featuredTitle').innerText(),'Dune: Part Two','Arrow navigates to next featured movie');
  assert.equal(await page.locator('#slideDots button[aria-pressed="true"]').count(),1,'Current dot stays synced');
  await page.locator('#featuredPrevious').click();
  assert.equal(await page.locator('#featuredTitle').innerText(),'How to Train Your Dragon','Previous arrow navigates backwards');
  await page.locator('#peekFront').click();
  assert.equal(await page.locator('#featuredTitle').innerText(),'Dune: Part Two','Exposed next card is clickable');
  if(width>760){
   await page.locator('#peekBack').click();
   assert.equal(await page.locator('#featuredTitle').innerText(),'Moana 2','Farther exposed card opens its featured slide');
  }
  await page.locator('#slideDots button').first().click();
  assert.equal(await page.locator('#featuredTitle').innerText(),'How to Train Your Dragon','Dots select a particular movie');
  await page.locator('#featuredNext').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#featuredTitle').innerText(),'Dune: Part Two','Keyboard arrow changes featured movie');
  await page.locator('#slideDots button').first().click();
  assert.equal(await page.locator('#featureArt').getAttribute('alt'),'Artwork for How to Train Your Dragon');
  assert.equal(await page.locator('#genreScroll button').count(),11,'Genre chips render');
  assert.equal((await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')).includes("script-src 'self'"),true,'Scripts limited to same origin');
  const doc=await page.evaluate(()=>({
   width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
   shell:document.querySelector('.app-shell').getBoundingClientRect().width,
   filmSrc:document.querySelector('.movie-card img')?.getAttribute('src'),
   area:document.querySelector('.main-area').getBoundingClientRect().width
  }));
  assert(doc.scrollWidth<=doc.width+2,'No horizontal page overflow at '+width+'px: '+doc.scrollWidth);
  assert(Math.abs(doc.shell-doc.width)<3,'App uses the entire viewport width at '+width+'px');
  if(width===1440){
   const dimensions=await page.locator('.app-shell').evaluate(el=>({height:el.getBoundingClientRect().height,viewport:innerHeight,radius:getComputedStyle(el).borderTopLeftRadius}));
   assert(Math.abs(dimensions.height-dimensions.viewport)<=2,'Desktop app uses full browser height');
   assert.equal(dimensions.radius,'0px','No desktop framed window corners');
  }
  assert(doc.area>180,'Content pane is usable');
  assert(doc.filmSrc.startsWith('https://image.tmdb.org/t/p/w342/'),'Licensed media paths use TMDB HTTPS CDN');
  if(width<=390){
   assert.equal(await page.locator('#mobileMenu').isVisible(),true,'Mobile has navigation toggle');
   await page.locator('#mobileMenu').click();
   assert.equal(await page.locator('#mobileMenu').getAttribute('aria-expanded'),'true','Mobile navigation opens');
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('.sidebar')).visibility==='visible');
   await page.locator('.side-link[data-view="home"]').click();
   assert.equal(await page.locator('#mobileMenu').getAttribute('aria-expanded'),'false','Mobile navigation closes on selection');
  }else{
   assert.equal(await page.locator('.sidebar').isVisible(),true,'Desktop/tablet sidebar visible');
  }
  if(width<=390){
   // Simulate a real finger dragging the large hero horizontally.
   const hero=page.locator('#featured');await hero.scrollIntoViewIfNeeded();
   const r=await hero.boundingBox();
   const from={x:r.x+r.width*.38,y:r.y+r.height*.53},to={x:from.x-80,y:from.y+6};
   const cdp=await context.newCDPSession(page);
   await page.evaluate(()=>{window.__swipeEvents=[];for(const n of ['pointerdown','pointerup','pointercancel','touchstart','touchmove','touchend'])document.addEventListener(n,e=>window.__swipeEvents.push({event:n,target:e.target?.className?.baseVal??e.target?.className,at:[e.clientX,e.clientY],touches:e.touches?.length,changed:[...e.changedTouches||[]].map(t=>[t.clientX,t.clientY])}),true)});
   const touched=await page.evaluate(p=>{const el=document.elementFromPoint(p.x,p.y);return {tag:el?.tagName,cls:el?.className,rect:el?.getBoundingClientRect()?.toJSON()}},from);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[to]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   console.log('SWIPE DEBUG',width,JSON.stringify({from,to,touched,events:await page.evaluate(()=>window.__swipeEvents)}));
   assert.equal(await page.locator('#featuredTitle').innerText(),'Dune: Part Two','Swiping featured banner moves to next movie');
   await page.locator('#slideDots button').first().click();
  }
  await page.locator('#searchInput').fill('interstellar');
  assert.equal(await page.locator('.movie-card').count(),1,'Search finds Interstellar');
  assert((await page.locator('.movie-card .movie-name').innerText()).includes('Interstellar'));
  await page.locator('#searchInput').fill('<script>not a movie</script>');
  assert.equal(await page.locator('.movie-card').count(),0,'Untrusted search text is plain text');
  assert.equal(await page.locator('#emptyState').isVisible(),true);
  await page.locator('#searchInput').fill('');
  await page.locator('#genreScroll button[data-genre="Action"]').click();
  assert((await page.locator('.movie-card').count())>=3,'Action genre returns films');
  assert.equal(await page.locator('.movie-card .movie-name').allTextContents().then(xs=>xs.includes('Flow')),false,'Genres actually filter');
  await page.locator('#genreScroll button[data-genre="Trending"]').click();
  await page.locator('#filterBtn').click();
  await page.locator('#yearFilter').selectOption('2025');
  assert((await page.locator('.movie-card').count())>=1,'Year filter returns films');
  await page.locator('#ratingFilter').selectOption('8');
  assert.equal(await page.locator('.movie-card').count(),0,'Year + rating combine');
  await page.locator('#resetFilters').click();
  assert.equal(await page.locator('.movie-card').count(),12,'Reset restores all films');
  await page.locator('.movie-card').first().click();
  assert.equal(await page.locator('#detailDialog').evaluate(el=>el.open),true,'Movie details dialog opens');
  assert.equal(await page.locator('#detailTitle').innerText(),'How to Train Your Dragon');
  assert((await page.locator('#detailTrailer').getAttribute('href')).includes('themoviedb.org/movie/1087192/videos'));
  await page.locator('#detailFavorite').click();
  assert.equal(await page.locator('#detailFavorite').innerText(),'Saved to watchlist');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#detailDialog').evaluate(el=>el.open),false,'Escape closes details');
  await page.locator('#profileBtn').click();
  assert.equal(await page.locator('#pageTitle').innerText(),'Your watchlist');
  assert.equal(await page.locator('.movie-card').count(),1,'Favorites view shows saved movie');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('.movie-card').first().waitFor();
  await page.locator('#profileBtn').click();
  assert.equal(await page.locator('.movie-card').count(),1,'Watchlist persists after reload');
  assert.deepEqual(errors,[],'No JavaScript errors at '+width+'px: '+errors.join(','));
  results.push({width,status:'PASS'});
  await context.close();
 }
 const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await reduced.route('https://image.tmdb.org/**',route=>route.abort());
 await reduced.goto(origin+'/Cinema/');
 assert.equal(await reduced.locator('.movie-card').count(),12);
 await reduced.close();
 console.log('CINEMA BROWSER CHECKS PASSED '+JSON.stringify(results));
}finally{
 await browser.close();await new Promise(done=>server.close(done));
}