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
      posterRatio:poster.width/poster.height,fiveVisible:fifth.right<=main.right-2,
      sixthPartiallyVisible:sixth.left<main.right-2&&sixth.right>main.right+2};
   });
   assert(Math.abs(layout.frameLeft)<2,'Full-screen layout has zero desktop gutter');
   assert(layout.heroHeight>350&&layout.heroHeight<485,'Featured banner responds to screen height');
   assert(layout.heroRatio>2.1&&layout.heroRatio<3.2,'Banner retains wide cinematic proportions');
   assert(Math.abs(layout.posterRatio-.85)<.02,'Slightly narrower movie tiles match the refined artwork proportions');
   assert(layout.fiveVisible,'Five full rounded movie tiles fit on desktop');
   const sidebar=await page.locator('#recentList .mini-movie').first().evaluate(el=>{
    const box=el.getBoundingClientRect(),style=getComputedStyle(el);
    return {width:box.width,height:box.height,radius:parseFloat(style.borderTopLeftRadius)};
   });
   assert(sidebar.width/sidebar.height>2.1,'Recent movies display as wide landscape cards');
   assert(sidebar.radius>=18,'Recently viewed movie cards have rounded corners');
   const posterRadius=await page.locator('#movieStrip .poster-wrap').first().evaluate(el=>parseFloat(getComputedStyle(el).borderTopLeftRadius));
   assert(posterRadius>=18,'Main cover tiles have the softer rounded edges from the reference');
   assert(layout.sixthPartiallyVisible,'Next movie peeks into the horizontal movie strip');
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
  assert.equal(await page.locator('.movie-card .poster-wrap').first().evaluate(el=>getComputedStyle(el).aspectRatio),width>760?'0.85 / 1':'2 / 3','Movie frames match wide desktop and portrait mobile silhouettes');
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

 // Mock the official API to exercise live data without a real credential
 // or untrusted network dependency in CI.
 const liveCtx=await browser.newContext({viewport:{width:1120,height:900}});
 const livePage=await liveCtx.newPage();
 const requests=[];
 const films=[
  {id:900001,title:'A Brand New Movie',release_date:'2026-07-12',vote_average:8.7,
   genre_ids:[28,878],poster_path:'/fictional-one.jpg',backdrop_path:'/fictional-wide.jpg',overview:'An entirely new movie.'},
  {id:900002,title:'Another Film',release_date:'2025-05-03',vote_average:7.4,
   genre_ids:[18],poster_path:'/fictional-two.jpg',backdrop_path:null,overview:'Another film in the live catalog.'}
 ];
 const mockStill=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO0pD4sAAAAASUVORK5CYII=','base64');
 await livePage.route('https://image.tmdb.org/**',route=>{
  if(route.request().url().includes('fictional-enriched.jpg')){
   route.fulfill({status:200,contentType:'image/png',body:mockStill});
  }else route.abort();
 });
 await livePage.route('https://api.themoviedb.org/3/**',route=>{
  const req=route.request(),url=new URL(req.url());
  requests.push({path:url.pathname,search:url.searchParams.toString(),auth:req.headers().authorization});
  if(url.pathname.endsWith('/movie/900002')){
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:900002,backdrop_path:'/fictional-enriched.jpg'})});
  }
  const page=Number(url.searchParams.get('page')||1);
  const item=url.pathname.endsWith('/search/movie')?[films[0]]:page===1?[films[0],films[1]]:[
   {id:900003,title:'Third Discovery',release_date:'2026-08-01',vote_average:9.1,genre_ids:[12],poster_path:'/third.jpg',backdrop_path:null,overview:'More movie results.'}
  ];
  route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({page,total_pages:2,total_results:3,results:item})});
 });
 await livePage.goto(origin+'/serivia/',{waitUntil:'domcontentloaded'});
 assert.equal(await livePage.locator('#catalogMode').innerText(),'Demo collection · 15 films','Without token, sample collection is explicit');
 assert.equal(await livePage.locator('.brand').getAttribute('href'),'#main','Brand points at a real local section');
 await livePage.locator('#settingsBtn').click();
 await livePage.locator('#tmdbAccessToken').fill('fake_test_read_access_token');
 await livePage.locator('.tmdb-connect-form button[type=submit]').click();
 await livePage.waitForFunction(()=>document.querySelector('#catalogMode').textContent.includes('Live movie catalog'));
 await livePage.waitForFunction(()=>document.querySelector('#movieStrip .movie-card')?.textContent.includes('A Brand New Movie'));
 assert.equal(await livePage.locator('.movie-card').count(),2,'Connected live catalog shows remote results');
 assert.equal(await livePage.locator('.movie-strip').evaluate(el=>getComputedStyle(el).display),'grid','Live results use a multi-row grid');
 // Opening a live result upgrades missing art from its TMDB movie details.
 await livePage.locator('.movie-card').nth(1).click();
 await livePage.waitForFunction(()=>document.querySelector('#detailPoster')?.getAttribute('src')?.includes('fictional-enriched.jpg'));
 assert(requests.some(r=>r.path.endsWith('/movie/900002')),'Details fetch missing real widescreen backdrop');
 assert.equal(await livePage.locator('#detailPoster').evaluate(el=>el.parentElement.classList.contains('portrait-art')),false,
  'Details upgrade from vertical poster to real landscape backdrop');
 assert.equal(await livePage.locator('#recentList .mini-movie').first().evaluate(el=>el.classList.contains('portrait-art')),false,
  'Recently explored upgrades to the same real backdrop');
 await livePage.keyboard.press('Escape');
 const liveLayout=await livePage.evaluate(()=>{
  const grid=document.querySelector('#movieStrip');
  const first=grid.querySelector('.movie-card');
  const name=first.querySelector('.movie-name'),rating=first.querySelector('.movie-meta b');
  return {gridHeight:grid.clientHeight,scrollHeight:grid.scrollHeight,
    nameWrap:getComputedStyle(name).whiteSpace,nameHeight:name.getBoundingClientRect().height,
    ratingVisible:rating.getBoundingClientRect().width>0,
    ratingBottom:rating.getBoundingClientRect().bottom,
    cardBottom:first.getBoundingClientRect().bottom};
 });
 assert(liveLayout.gridHeight+3>=liveLayout.scrollHeight,'Live grid cannot crop bottom labels');
 assert(liveLayout.nameWrap==='normal'&&liveLayout.nameHeight>0&&liveLayout.ratingVisible&&liveLayout.ratingBottom<=liveLayout.cardBottom+1,
   'Live TMDB grid displays titles and star ratings');

 assert.equal(await livePage.locator('#pagination').isVisible(),true,'Pagination appears for remaining pages');
 assert.equal(requests.every(r=>r.auth==='Bearer fake_test_read_access_token'),true,'TMDB requests use Authorization bearer header');
 await livePage.locator('#loadMore').click();
 await livePage.waitForFunction(()=>document.querySelectorAll('#movieStrip .movie-card').length===3);
 assert.equal(await livePage.locator('#pagination').isVisible(),false,'Pagination ends after last page');
 await livePage.locator('#searchInput').fill('Brand New');
 await livePage.waitForFunction(()=>document.querySelectorAll('#movieStrip .movie-card').length===1);
 assert(requests.some(r=>r.path.endsWith('/search/movie')&&r.search.includes('query=Brand+New')),'Search queries official endpoint');
 await livePage.locator('#searchInput').fill('');
 await livePage.locator('#genreScroll button[data-genre="Action"]').click();
 await livePage.waitForFunction(()=>[...document.querySelectorAll('#movieStrip .movie-name')].some(el=>el.textContent==='A Brand New Movie'));
 assert(requests.some(r=>r.path.endsWith('/discover/movie')&&r.search.includes('with_genres=28')),'Genre filters query TMDB Discover');
 await livePage.locator('#searchInput').fill('Brand New');
 await livePage.waitForFunction(()=>document.querySelectorAll('#movieStrip .movie-card').length===1);
 await livePage.locator('.movie-card').first().click();
 await livePage.locator('#detailFavorite').click();
 await livePage.keyboard.press('Escape');
 await livePage.locator('#profileBtn').click();
 assert.equal(await livePage.locator('.movie-card').count(),1,'Live titles can be saved');
 await livePage.reload({waitUntil:'domcontentloaded'});
 await livePage.waitForFunction(()=>document.querySelector('#catalogMode').textContent.includes('Live movie catalog'));
 await livePage.locator('#profileBtn').click();
 assert.equal(await livePage.locator('.movie-card').count(),1,'Saved live titles persist');
 assert.equal(await livePage.evaluate(()=>localStorage.getItem('serivia.tmdb.session.v1')),null,'Token is not in persistent localStorage');
 assert.equal(await livePage.evaluate(()=>sessionStorage.getItem('serivia.tmdb.session.v1')),'fake_test_read_access_token','Token remains session-only');
 await livePage.locator('#settingsBtn').click();
 await livePage.locator('.tmdb-disconnect').first().click();
 assert.equal(await livePage.locator('#catalogMode').innerText(),'Demo collection · 15 films','Disconnect restores demo');
 assert.equal(await livePage.evaluate(()=>sessionStorage.getItem('serivia.tmdb.session.v1')),null,'Disconnect removes token');
 await liveCtx.close();
 const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await reduced.route('https://image.tmdb.org/**',route=>route.abort());
 await reduced.goto(origin+'/serivia/');
 assert.equal(await reduced.locator('.movie-card').count(),15);
 await reduced.close();
 console.log('SERIVIA BROWSER CHECKS PASSED '+JSON.stringify(results));
}finally{
 await browser.close();await new Promise(done=>server.close(done));
}