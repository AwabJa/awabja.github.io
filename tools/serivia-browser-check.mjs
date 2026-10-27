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
 const budgets=await Promise.all(['serivia/index.html','serivia/styles.css','serivia/app.js'].map(file=>stat(resolve(root,file)).then(result=>result.size)));
 assert(budgets[0]<20000&&budgets[1]<65000&&budgets[2]<42000,'Static app files remain compact');
 // Capture the live-style desktop composition for pixel-level review.
 const visualContext=await browser.newContext({viewport:{width:1672,height:941},deviceScaleFactor:1});
 const visualPage=await visualContext.newPage();
 await visualPage.goto(origin+'/serivia/',{waitUntil:'domcontentloaded'});
 await visualPage.locator('.movie-card').first().waitFor();
 await visualPage.evaluate(()=>document.fonts.ready);
 await visualPage.waitForTimeout(1200);
 await visualPage.screenshot({path:'serivia-desktop-visual.png',fullPage:false});
 await visualContext.close();
 const results=[];
 for(const width of [320,390,768,900,1024,1440,1672,1920]){
  const context=await browser.newContext({viewport:{width,height:width<500?812:width===1672?941:1000},isMobile:width<500,hasTouch:width<500});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // The curated app is tested offline from TMDB; poster failures must be graceful.
  const verifiedStill=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO0pD4sAAAAASUVORK5CYII=','base64');
  await page.route('https://image.tmdb.org/**',route=>{
   const url=route.request().url();
   if(url.includes('fovkdObjss9Qa5UnqdTRh0nendD.jpg')
     ||url.includes('7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg'))
     return route.fulfill({status:200,contentType:'image/png',body:verifiedStill});
   return route.abort('failed');
  });
  const response=await page.goto(origin+'/serivia/',{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200,'serivia opens');
  assert.equal(new URL(page.url()).pathname,'/serivia/','App lives at the lowercase project route');
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://awabja.github.io/serivia/','Canonical route is correct');
  await page.locator('.movie-card').first().waitFor();
  assert.equal(await page.title(),'Serivia — Discover great movies');
  assert.equal(await page.locator('.brand > span:last-child').textContent(),'serivia','Wordmark stays lowercase even when sidebar is closed on mobile');
  assert.equal(await page.locator('.brand-icon svg rect').count(),1,'Brand uses a single clapperboard body');
  assert.equal(await page.locator('.brand-icon svg path').count(),4,'Clapperboard has its hinged striped slate and play symbol');
  assert.equal(await page.locator('link[rel="icon"]').getAttribute('href'),'favicon.svg?v=1','serivia uses matching clapperboard tab icon');
  assert.equal(await page.locator('.movie-card').count(),15,'Fifteen curated film cards render');
  const assertLabels=async contextName=>{
    const layout=await page.evaluate(()=>{
      const strip=document.querySelector('#movieStrip');
      const rect=strip.getBoundingClientRect();
      const stripStyle=getComputedStyle(strip);
      const card=[...strip.querySelectorAll('.movie-card')];
      return {
        stripHeight:strip.clientHeight,stripScrollHeight:strip.scrollHeight,
        stripBottom:rect.bottom,verticalOverflow:stripStyle.overflowY,
        labels:card.map(item=>{
          const name=item.querySelector('.movie-name'),meta=item.querySelector('.movie-meta'),rating=meta.querySelector('b');
          return {name:name.textContent,shownName:name.getBoundingClientRect().height>0,
            nameBottom:name.getBoundingClientRect().bottom,metaBottom:meta.getBoundingClientRect().bottom,
            metaHeight:meta.getBoundingClientRect().height,
            rating:rating.textContent,starWidth:rating.querySelector('svg').getBoundingClientRect().width,
            nameWrap:getComputedStyle(name).whiteSpace,
            ratingWithinCard:rating.getBoundingClientRect().right<=item.getBoundingClientRect().right+1}
        })
      };
    });
    assert(layout.stripScrollHeight<=layout.stripHeight+3,
      contextName+' poster row must not vertically clip metadata ('+layout.stripScrollHeight+' / '+layout.stripHeight+')');
    assert(layout.labels.every(l=>l.shownName&&['normal','nowrap'].includes(l.nameWrap)&&l.metaHeight>=20&&l.starWidth>=14&&l.ratingWithinCard),
      contextName+' title and rating must render inside cards');
    assert(layout.labels.every(l=>l.metaBottom<=layout.stripBottom+1),
      contextName+' all movie ratings must fit inside the poster row');
  };
  await assertLabels('Demo '+width+'px');

  assert.equal(await page.locator('#slideDots button').count(),4,'Featured carousel has four slides');
  assert((await page.locator('#peekFront').evaluate(el=>el.style.backgroundImage)).includes('/w500/'),
    'Small preview covers avoid downloading full-size poster images');
  assert.equal(await page.locator('.feature-navigation,.genre-arrows').count(),0,'No useless arrow buttons appear anywhere');
  const fan=await page.evaluate(()=>{
   const get=id=>document.querySelector(id).getBoundingClientRect();
   const hero=get('#featured'),front=get('#peekFront'),back=get('#peekBack');
   const main=get('.main-area');
   return {hero:hero.toJSON(),front:front.toJSON(),back:back.toJSON(),main:main.toJSON(),
     frontVisible:getComputedStyle(document.querySelector('#peekFront')).display!=='none',
     backVisible:getComputedStyle(document.querySelector('#peekBack')).display!=='none'};
  });
  assert(fan.frontVisible&&fan.backVisible,'Both fanned preview covers are visible at '+width+'px');
  assert(fan.hero.right<fan.front.right&&fan.front.right<fan.back.right,'Preview covers are progressively fanned out at '+width+'px');
  assert(fan.back.right<=fan.main.right+3,'Fanned covers fit inside the main content at '+width+'px');
  assert(fan.hero.width>fan.front.width*2.5,'Main hero remains much larger than fanned preview cards');
  if(width>=1440){
   // The cinematic reference has a widescreen lead card and two slimmer
   // staggered cards; no image should occupy the entire content width.
   assert(fan.hero.width/fan.hero.height>2,
     'Featured hero stays cinematic instead of becoming vertically oversized');
   assert(fan.hero.width<fan.main.width*.9,
     'Featured banner preserves space for the fanned previews');
   assert(fan.hero.width/fan.front.width>5,
     'Main film remains visually dominant over its preview covers');
   assert(fan.hero.height<=510,
     'Featured banner stays within cinematic viewport scale');
  }
  if(width>=768){
   const pagers=page.locator('.genre-pagers button');
   assert.equal(await pagers.count(),2,'Desktop genre carousel has two working arrow controls');
   // The active genre row can also be moved by keyboard or mouse wheel.
   const initial=await page.locator('#genreScroll').evaluate(el=>el.scrollLeft);
   if(await page.locator('#genreForward').isEnabled()){
    await page.locator('#genreForward').click();
    await page.waitForFunction(before=>document.querySelector('#genreScroll').scrollLeft>before+10,initial);
   }
  }
  if(width>=1440){
   const fit=await page.evaluate(()=>{
    const el=document.querySelector('.main-area');
    const first=document.querySelector('#movieStrip .movie-meta').getBoundingClientRect();
    const viewport=el.getBoundingClientRect();
    return {scrollExcess:el.scrollHeight-el.clientHeight,
     metadataInView:first.bottom<=viewport.bottom-8,posterVisible:first.top>=viewport.top,
     footerInView:document.querySelector('.app-footer').getBoundingClientRect().bottom<=viewport.bottom+1};
   });
   console.log('SERIVIA_FIT '+width+' '+JSON.stringify(fit));
   assert(fit.scrollExcess<=15,'Cinematic dashboard should fit the default desktop viewport');
   assert(fit.metadataInView&&fit.posterVisible,'Movie posters and metadata are visible without scrolling');
   assert(fit.footerInView,'Footer remains visible on normal desktop monitors');
  }
  if(width===1672){
   const layout=await page.evaluate(()=>{
    const bounds=selector=>document.querySelector(selector).getBoundingClientRect();
    const shell=bounds('.app-shell'),hero=bounds('#featured');
    const posters=document.querySelectorAll('#movieStrip .poster-wrap');
    const poster=posters[0].getBoundingClientRect(),fifth=posters[4].getBoundingClientRect(),
      sixth=posters[5].getBoundingClientRect();
    const main=bounds('.main-area');
    return {frameLeft:shell.left,heroHeight:hero.height,heroRatio:hero.width/hero.height,
      posterWidth:poster.width,posterHeight:poster.height,posterRatio:poster.width/poster.height,fiveVisible:fifth.right<=main.right-2,
      sixthVisible:sixth.left<main.right-2};
   });
   assert(Math.abs(layout.frameLeft)<2,'Full-screen layout has zero desktop gutter');
   assert(layout.heroHeight>350&&layout.heroHeight<485,'Featured banner responds to screen height');
   assert(layout.heroRatio>2.1&&layout.heroRatio<3.2,'Banner retains wide cinematic proportions');
   assert(Math.abs(layout.posterRatio-2/3)<.006,'Movie covers preserve the native 2:3 film poster ratio');
   const oldWidth=Math.max(139.16,Math.min(1672*.11858,941*.196,197.96));
   assert(Math.abs(layout.posterWidth-oldWidth*((2/3)/.7448))<1,
     'Movie cover width scales down to keep the previous card height');
   assert(Math.abs(layout.posterHeight-oldWidth/.7448)<1,
     'Movie cover height stays visually unchanged');
   assert(layout.fiveVisible,'Five full rounded movie tiles fit on desktop');
   const sidebar=await page.locator('#recentList .mini-movie').first().evaluate(el=>{
    const box=el.getBoundingClientRect(),style=getComputedStyle(el);
    return {width:box.width,height:box.height,radius:parseFloat(style.borderTopLeftRadius)};
   });
   assert(sidebar.width/sidebar.height>2.1,'Recent movies display as wide landscape cards');
   assert(sidebar.radius>=18,'Recently viewed movie cards have rounded corners');
   const posterRadius=await page.locator('#movieStrip .poster-wrap').first().evaluate(el=>parseFloat(getComputedStyle(el).borderTopLeftRadius));
   assert(posterRadius>=18,'Main cover tiles have the softer rounded edges from the reference');
   assert(layout.sixthVisible,'Sixth poster is visible or partly visible in the movie strip');
  }
  await page.locator('#peekFront').click();
  assert.equal(await page.locator('#featuredTitle').innerText(),'Dune: Part Two','Clicking first fanned card changes the hero movie');
  assert.equal(await page.locator('#slideDots button[aria-pressed="true"]').count(),1,'Current dot stays synced');
  if(width>=768){
   await page.locator('#peekBack').click();
   assert.equal(await page.locator('#featuredTitle').innerText(),'Moana 2','Clicking back fanned card changes to the movie behind');
  }
  await page.locator('#slideDots button').first().click();
  assert.equal(await page.locator('#featuredTitle').innerText(),'How to Train Your Dragon','Dots select featured movie');
  await page.locator('#peekFront').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#featuredTitle').innerText(),'Dune: Part Two','Keyboard arrow changes featured movie');
  await page.locator('#slideDots button').first().click();
  assert.equal(await page.locator('#featureArt').getAttribute('alt'),'How to Train Your Dragon movie artwork');
  const artSrc=await page.locator('#featureArt').getAttribute('src');
  assert(artSrc.includes('how-to-train-your-dragon-trailer-and-poster')
    ||artSrc.includes('/w1280/8J6UlIFcU7eZfq9iCLbgc8Auklg.jpg')
    ||artSrc.includes('/w780/53dsJ3oEnBhTBVMigWJ9tkA5bzJ.jpg'),
    'Featured artwork uses a backdrop or a valid-sized poster when blocked');
  assert((await page.locator('.movie-card').first().locator('img').getAttribute('src')).includes('/w780/'),'Posters request a crisp 780px master image');
  assert.equal(await page.locator('.movie-card .poster-wrap').first().evaluate(el=>getComputedStyle(el).aspectRatio),'2 / 3','Movie frames match wide desktop and portrait mobile silhouettes');
  assert.equal(await page.locator('.movie-card img').first().evaluate(el=>getComputedStyle(el).objectFit),'contain','Source poster art fits fully into the rounded movie frames');
  const heroFit=await page.locator('#featureArt').evaluate(el=>({
   fit:getComputedStyle(el).objectFit,portrait:el.parentElement.classList.contains('portrait-art')
  }));
  assert.equal(heroFit.fit,heroFit.portrait?'contain':'cover',
   'Feature art displays landscape in cover mode and portrait fallback in contain mode');
  assert.equal(await page.locator('#genreScroll button').count(),11,'Genre chips render');
  assert.equal((await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')).includes("script-src 'self'"),true,'Scripts limited to same origin');
  const doc=await page.evaluate(()=>({
   width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
   shell:document.querySelector('.app-shell').getBoundingClientRect().width,
   filmSrc:document.querySelector('.movie-card img')?.getAttribute('src'),
   area:document.querySelector('.main-area').getBoundingClientRect().width
  }));
  assert(doc.scrollWidth<=doc.width+2,'No horizontal page overflow at '+width+'px: '+doc.scrollWidth);
  const shellGeometry=await page.locator('.app-shell').evaluate(el=>{
   const rect=el.getBoundingClientRect();
   return {left:rect.left,right:rect.right,width:rect.width,height:rect.height,viewport:innerWidth,viewportHeight:innerHeight,
    radius:getComputedStyle(el).borderTopLeftRadius};
  });
  // Serivia fills the full browser viewport at every responsive breakpoint.
  assert(Math.abs(shellGeometry.width-width)<3,'App fills browser width');
  assert(Math.abs(shellGeometry.left)<2,'App starts at left edge, no outside gutter');
  assert.equal(shellGeometry.radius,'0px','Dashboard has no outer frame');
  if(width>760){
   assert(Math.abs(shellGeometry.height-shellGeometry.viewportHeight)<3,
     'Desktop dashboard fills the entire viewport height');
  }
  assert(doc.area>180,'Content pane is usable');
  await page.waitForFunction(()=>document.querySelector('.poster-wrap')?.classList.contains('image-failed'));
  assert((await page.locator('.poster-wrap.image-failed').count())>0,'A blocked remote image shows a styled fallback instead of a broken poster');
  assert(doc.filmSrc.startsWith('https://image.tmdb.org/t/p/w780/'),'Full-resolution posters use TMDB HTTPS CDN');
  if(width<=390){
   assert.equal(await page.locator('#mobileMenu').isVisible(),true,'Mobile has navigation toggle');
   await page.locator('#mobileMenu').click();
   assert.equal(await page.locator('#mobileMenu').getAttribute('aria-expanded'),'true','Mobile navigation opens');
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('.sidebar')).visibility==='visible');
   await page.keyboard.press('Tab');
   assert.equal(await page.locator('.sidebar .brand').evaluate(el=>document.activeElement===el),true,
     'Tab from mobile toggle enters the open navigation');
   await page.keyboard.press('Shift+Tab');
   assert.equal(await page.locator('.sidebar .portfolio-link').evaluate(el=>document.activeElement===el),true,
     'Reverse Tab wraps to the final mobile navigation link');
   await page.keyboard.press('Tab');
   assert.equal(await page.locator('.sidebar .brand').evaluate(el=>document.activeElement===el),true,
     'Forward Tab remains in the mobile drawer');
   await page.keyboard.press('Escape');
   assert.equal(await page.locator('#mobileMenu').getAttribute('aria-expanded'),'false',
     'Escape closes the mobile drawer');
   assert.equal(await page.locator('#mobileMenu').evaluate(el=>document.activeElement===el),true,
     'Escape restores keyboard focus to the menu toggle');
   await page.locator('#mobileMenu').click();
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
   assert.equal(await page.locator('.sidebar').evaluate(el=>getComputedStyle(el).pointerEvents),'none','Closed sidebar cannot intercept mobile touches');
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[to]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
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
  assert.equal(await page.locator('.movie-card').count(),1,'Year and rating filters combine to show Mission: Impossible');
  await page.locator('#resetFilters').click();
  assert.equal(await page.locator('.movie-card').count(),15,'Reset restores all films');
  await page.locator('.movie-card').first().click();
  assert.equal(await page.locator('#detailDialog').evaluate(el=>el.open),true,'Movie details dialog opens');
  assert.equal(await page.locator('#detailTitle').innerText(),'Lilo & Stitch');
  assert.equal(await page.locator('#detailPoster').evaluate(el=>el.parentElement.classList.contains('portrait-art')),false,
    'Lilo and Stitch now uses verified landscape artwork instead of its vertical poster');
  assert((await page.locator('#detailPoster').getAttribute('src')).includes('/w1280/fovkdObjss9Qa5UnqdTRh0nendD.jpg'),
    'Lilo and Stitch details use the verified TMDB widescreen artwork');
  assert.equal(await page.locator('#detailPoster').evaluate(el=>getComputedStyle(el).objectFit),'cover',
    'Landscape movie artwork fills its detail frame without distortion');
  assert((await page.locator('#detailTrailer').getAttribute('href')).includes('themoviedb.org/movie/552524/videos'));
  await page.locator('#detailFavorite').click();
  assert.equal(await page.locator('#detailFavorite').innerText(),'Saved to watchlist');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#detailDialog').evaluate(el=>el.open),false,'Escape closes details');
  if(width<=390){
   // Reproduce a phone user closing movie details and navigating Home.
   // Keep landmark focus for screen readers without a blue page outline.
   await page.locator('#mobileMenu').click();
   await page.locator('.side-link[data-view="home"]').click();
   const mainFocus=await page.locator('#main').evaluate(el=>({
    focused:document.activeElement===el,
    outline:getComputedStyle(el).outlineStyle
   }));
   assert(mainFocus.focused,'Home navigation moves accessibility focus to main');
   assert.equal(mainFocus.outline,'none','Mobile home after movie details has no blue page-sized outline');
   const focusButton=await page.locator('.movie-card').first().evaluate(el=>{
    el.focus();return el.matches(':focus-visible')?getComputedStyle(el).outlineStyle:null;
   });
   if(focusButton!==null)assert.notEqual(focusButton,'none','Buttons still have visible keyboard focus');
  }
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

 // A short desktop viewport must show the fixed navigation and retain a
 // scrollable history of more than four films, without clipping main content.
 const shortCtx=await browser.newContext({viewport:{width:1440,height:620}});
 const shortPage=await shortCtx.newPage();
 await shortPage.route('https://image.tmdb.org/**',route=>route.abort('failed'));
 await shortPage.goto(origin+'/serivia/',{waitUntil:'domcontentloaded'});
 await shortPage.evaluate(()=>localStorage.setItem('serivia.recent.v1',JSON.stringify(
  [1087192,823219,762509,693134,1241982,533535,157336,27205,299534,122,550,1020414]
 )));
 await shortPage.reload({waitUntil:'domcontentloaded'});
 assert.equal(await shortPage.locator('#recentList .mini-movie').count(),3,'Only three recently explored films appear in sidebar');
 assert.equal(await shortPage.evaluate(()=>JSON.parse(localStorage.getItem('serivia.recent.v1')).length),12,
  'Older recently explored films remain in saved history');
 const shortLayout=await shortPage.evaluate(()=>{
  const area=document.querySelector('.side-activity'),main=document.querySelector('.main-area');
  area.style.scrollBehavior='auto';main.style.scrollBehavior='auto';
  area.scrollTop=area.scrollHeight;main.scrollTop=main.scrollHeight;
  const box=area.getBoundingClientRect(),last=area.querySelector('.mini-movie:last-child').getBoundingClientRect();
  const nav=document.querySelector('.side-nav-secondary').getBoundingClientRect();
  const footer=document.querySelector('.sidebar .portfolio-link').getBoundingClientRect();
  const film=main.querySelector('.movie-card .movie-meta').getBoundingClientRect();
  const mainBox=main.getBoundingClientRect();
  return {recentScroll:area.scrollHeight-area.clientHeight,mainScroll:main.scrollHeight-main.clientHeight,
   lastVisible:last.bottom<=box.bottom+6,navClear:nav.bottom<=box.top+6,
   footerVisible:footer.bottom<=innerHeight+3&&footer.top>=0,
   filmVisible:film.bottom<=mainBox.bottom+6&&film.top>=mainBox.top-6};
 });
 assert(shortLayout.recentScroll>=0&&shortLayout.lastVisible,'Three sidebar movies remain visible or scrollable');
 assert(shortLayout.navClear&&shortLayout.footerVisible,'Sidebar does not overlap navigation or portfolio link');
 assert(shortLayout.mainScroll>=0&&shortLayout.filmVisible,
  'Short screens either fit movie metadata or allow scrolling to it');
 await shortCtx.close();

 // Demo-only production mode: no visitor token input, no client API traffic,
 // and no reuse of stale TMDB session credentials after site upgrades.
 const auditCtx=await browser.newContext({viewport:{width:1280,height:800}});
 const auditPage=await auditCtx.newPage();
 const apiRequests=[],jsErrors=[];
 auditPage.on('request',request=>{if(request.url().startsWith('https://api.themoviedb.org/'))apiRequests.push(request.url())});
 auditPage.on('pageerror',error=>jsErrors.push(error.message));
 await auditPage.route('https://api.themoviedb.org/**',route=>route.abort());
 await auditPage.route('https://image.tmdb.org/**',route=>route.abort());
 await auditPage.goto(origin+'/serivia/',{waitUntil:'domcontentloaded'});
 await auditPage.evaluate(()=>sessionStorage.setItem('serivia.tmdb.session.v1','legacy_token_should_be_deleted'));
 await auditPage.reload({waitUntil:'domcontentloaded'});
 assert.equal(await auditPage.evaluate(()=>sessionStorage.getItem('serivia.tmdb.session.v1')),null,
   'Old BYO-TMDB credentials are erased on page load');
 assert.equal(await auditPage.locator('#catalogMode').innerText(),'Demo collection · 15 films');
 assert.equal(await auditPage.locator('#connectTmdb').textContent(),'About catalog',
   'Catalog button does not ask for an API token');
 assert((await auditPage.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')).includes("connect-src 'self';"),
   'Site CSP blocks outbound API requests');
 assert.equal(await auditPage.locator('.movie-card').count(),15,'All demo movies work without an API key');
 await auditPage.locator('#favoriteFeature').click();
 assert.equal(await auditPage.locator('#favoriteFeature').getAttribute('aria-pressed'),'true',
   'Featured save button responds');
 await auditPage.locator('#settingsBtn').click();
 assert.equal(await auditPage.locator('#infoTitle').innerText(),'Serivia settings');
 assert.equal(await auditPage.locator('#tmdbAccessToken,.tmdb-connect-form').count(),0,
   'Public settings contains no API credential form');
 assert((await auditPage.locator('#infoBody').innerText()).includes('without an account or API key'),
   'Settings explains self-contained demo mode');
 await auditPage.locator('#infoBody button').click();
 assert.equal(await auditPage.locator('#favoriteFeature').getAttribute('aria-pressed'),'false',
   'Clear saved movies updates the watchlist');
 await auditPage.keyboard.press('Escape');
 assert.equal(await auditPage.locator('#infoDialog').evaluate(el=>el.open),false,
   'Settings dialog dismisses with Escape');
 await auditPage.locator('#profileBtn').click();
 assert.equal(await auditPage.locator('#pageTitle').innerText(),'Your watchlist',
   'Profile button navigates to watchlist');
 await auditPage.locator('#connectTmdb').click();
 assert.equal(await auditPage.locator('#infoTitle').innerText(),'Serivia settings',
   'Catalog info click works without prompting for an API key');
 await auditPage.keyboard.press('Escape');
 await auditPage.locator('#typeBtn').click();
 assert.equal(await auditPage.locator('#typeBtn').getAttribute('aria-expanded'),'true',
   'Movies menu opens');
 await auditPage.locator('#typeMenu button[data-mode="movies"]').click();
 assert.equal(await auditPage.locator('#pageTitle').innerText(),'Discover movies',
   'Movies menu returns to home');
 await auditPage.locator('.side-link[data-view="trending"]').click();
 await auditPage.locator('#filterBtn').click();
 await auditPage.locator('#sortFilter').selectOption('az');
 const sortedNames=await auditPage.locator('.movie-card .movie-name').allTextContents();
 assert.deepEqual(sortedNames,[...sortedNames].sort((a,b)=>a.localeCompare(b)),
   'Trending respects the selected A-to-Z sort instead of overriding it by rating');
 await auditPage.locator('#sortFilter').selectOption('year');
 const sortedYears=(await auditPage.locator('.movie-card .movie-meta > span:first-child').allTextContents()).map(Number);
 assert.deepEqual(sortedYears,[...sortedYears].sort((a,b)=>b-a),
   'Trending respects the selected newest-first sort');
 await auditPage.locator('#resetFilters').click();
 await auditPage.locator('#notificationBtn').click();
 assert.equal(await auditPage.locator('#infoTitle').innerText(),'Welcome to Serivia',
   'Notification button opens helpful info');
 await auditPage.locator('#closeInfo').click();
 await auditPage.locator('#supportBtn').click();
 assert.equal(await auditPage.locator('#infoDialog').evaluate(el=>el.open),true,
   'Support opens accessible info dialog');
 await auditPage.keyboard.press('Escape');
 await auditPage.locator('.side-link[data-view="soon"]').click();
 assert.equal(await auditPage.locator('#emptyState').isVisible(),true,
   'Coming Soon displays its empty collection explanation');
 await auditPage.locator('#emptyReset').click();
 assert.equal(await auditPage.locator('#pageTitle').innerText(),'Discover movies',
   'Empty state reset restores home');
 await auditPage.locator('#filterBtn').click();
 assert.equal(await auditPage.locator('#filterBtn').getAttribute('aria-expanded'),'true',
   'Filter popover opens');
 await auditPage.keyboard.press('Escape');
 assert.equal(await auditPage.locator('#filterBtn').getAttribute('aria-expanded'),'false',
   'Escape dismisses filters without side effects');
 assert.deepEqual(apiRequests,[],'Public demo makes no TMDB API requests');
 assert.deepEqual(jsErrors,[],'No JS errors in settings/navigation/security interactions');
 await auditCtx.close();

 // A temporary CDN outage should not permanently replace a film's backdrop.
 const recoveryCtx=await browser.newContext({viewport:{width:1280,height:800}});
 const recovery=await recoveryCtx.newPage();
 await recovery.route('https://image.tmdb.org/**',route=>route.abort('failed'));
 await recovery.goto(origin+'/serivia/',{waitUntil:'domcontentloaded'});
 const duneCard=recovery.locator('.movie-card').filter({hasText:'Dune: Part Two'});
 await duneCard.click();
 await recovery.waitForFunction(()=>document.querySelector('#detailPoster').parentElement.classList.contains('portrait-art'));
 assert((await recovery.locator('#detailPoster').getAttribute('src')).includes('/w780/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg'),
   'A failed backdrop uses the original portrait poster for this image only');
 await recovery.locator('#closeDetails').click();
 await recovery.unroute('https://image.tmdb.org/**');
 const goodImage=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO0pD4sAAAAASUVORK5CYII=','base64');
 await recovery.route('https://image.tmdb.org/**',route=>route.fulfill({status:200,contentType:'image/png',body:goodImage}));
 await duneCard.click();
 await recovery.waitForFunction(()=>document.querySelector('#detailPoster').complete&&document.querySelector('#detailPoster').naturalWidth>0);
 assert((await recovery.locator('#detailPoster').getAttribute('src')).includes('/w1280/eZ239CUp1d6OryZEBPnO2n87gMG.jpg'),
   'Opening again after the network recovers retries the original backdrop');
 assert.equal(await recovery.locator('#detailPoster').evaluate(el=>el.parentElement.classList.contains('portrait-art')),false,
   'Successful retry restores landscape artwork');
 await recoveryCtx.close();

 // Historic saved records are browser-controlled input and must be bounded.
 const savedCtx=await browser.newContext({viewport:{width:1280,height:800}});
 const savedPage=await savedCtx.newPage();
 await savedPage.route('https://image.tmdb.org/**',route=>route.abort());
 await savedPage.goto(origin+'/serivia/',{waitUntil:'domcontentloaded'});
 await savedPage.evaluate(()=>{
   localStorage.setItem('serivia.savedMovieData.v1',JSON.stringify([{
     id:99881235,title:'Old locally saved movie',year:'Infinity',rating:'Infinity',
     genres:['Drama','X'.repeat(1000)],poster:'javascript:alert(1)',backdrop:'../../admin',
     overview:'Previously saved movie'
   }]));
   localStorage.setItem('serivia.watchlist.v1',JSON.stringify([99881235]));
 });
 await savedPage.reload({waitUntil:'domcontentloaded'});
 await savedPage.locator('#profileBtn').click();
 assert.equal(await savedPage.locator('.movie-card').count(),1,'Old saved movie remains available');
 assert.equal(await savedPage.locator('.movie-card .movie-meta b').innerText(),'0.0','Nonfinite saved ratings are rejected');
 assert.equal(await savedPage.locator('.movie-card img').first().getAttribute('src'),null,
   'Untrusted stored artwork path never becomes an image request');
 await savedPage.locator('.movie-card').first().click();
 assert.equal(await savedPage.locator('#detailGenres span').count(),1,'Oversized saved genres are rejected');
 await savedCtx.close();

 const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await reduced.route('https://image.tmdb.org/**',route=>route.abort());
 await reduced.goto(origin+'/serivia/');
 assert.equal(await reduced.locator('.movie-card').count(),15);
 assert.equal(await reduced.locator('.movie-card img').first().evaluate(el=>getComputedStyle(el).transitionDuration),'0s',
   'Reduced-motion preference removes poster animations');
 await reduced.locator('#peekFront').click();
 assert.equal(await reduced.locator('#featured').evaluate(el=>el.classList.contains('slide-enter')),false,
   'Reduced-motion preference skips featured carousel animation');
 await reduced.locator('#genreScroll button[data-genre="Action"]').click();
 assert.equal(await reduced.locator('#genreScroll button[data-genre="Action"]').getAttribute('aria-pressed'),'true',
   'Genre chips stay clickable with reduced motion enabled');
 await reduced.close();
 console.log('SERIVIA BROWSER CHECKS PASSED '+JSON.stringify(results));
}finally{
 await browser.close();await new Promise(done=>server.close(done));
}