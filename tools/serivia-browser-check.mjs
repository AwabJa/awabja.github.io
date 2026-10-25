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
 assert(budgets[0]<20000&&budgets[1]<42000&&budgets[2]<42000,'Static app files remain compact');
 const results=[];
 for(const width of [320,390,768,1440,1920]){
  const context=await browser.newContext({viewport:{width,height:width<500?812:1000},isMobile:width<500,hasTouch:width<500});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // The curated app is tested offline from TMDB; poster failures must be graceful.
  await page.route('https://image.tmdb.org/**',route=>route.abort('failed'));
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
  assert.equal(await page.locator('.movie-card').count(),12,'Twelve curated film cards render');
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
    assert(layout.labels.every(l=>l.shownName&&l.nameWrap==='normal'&&l.metaHeight>=20&&l.starWidth>=14&&l.ratingWithinCard),
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
   // Preserve the original 750px featured card instead of scaling it
   // with large monitors.
   assert(Math.abs(fan.hero.width-750)<6,
     'Featured movie remains 750px at desktop sizes');
   assert(fan.hero.width/fan.front.width>5.7,
     'Fanned preview covers remain smaller than the main movie');
   assert(fan.hero.width<fan.main.width*.85,
     'Main banner leaves room for its fanned previews');
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
  assert(artSrc.includes('/w1280/8J6UlIFcU7eZfq9iCLbgc8Auklg.jpg'),'Hero uses genuine HD landscape image, not a stretched poster');
  assert((await page.locator('.movie-card').first().locator('img').getAttribute('src')).includes('/w780/'),'Posters request a crisp 780px master image');
  assert.equal(await page.locator('.movie-card .poster-wrap').first().evaluate(el=>getComputedStyle(el).aspectRatio),'2 / 3','All poster boxes match 2:3 movie art');
  assert.equal(await page.locator('.movie-card img').first().evaluate(el=>getComputedStyle(el).objectFit),'contain','Poster art does not crop');
  assert.equal(await page.locator('#featureArt').evaluate(el=>getComputedStyle(el).objectFit),'cover','Wide banner uses cinematic landscape art');
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
  if(width<=760){
   assert(Math.abs(shellGeometry.width-width)<3,'Phone layout spans browser width');
   assert(Math.abs(shellGeometry.left)<2,'Phone layout begins at screen edge');
   assert.equal(shellGeometry.radius,'0px','Phone has no outer frame');
  }else{
   assert(shellGeometry.width<=1232+2,'Desktop frame is reference sized');
   assert(shellGeometry.width<=width-30,'Desktop has visible outside margins');
   assert(Math.abs(shellGeometry.left-(width-shellGeometry.width)/2)<3,'Dashboard centered in viewport');
   assert.equal(shellGeometry.radius,'23px','Desktop dashboard has rounded corners');
   assert(shellGeometry.height<=883,'Desktop frame stays within the reference height');
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
 await livePage.route('https://image.tmdb.org/**',route=>route.abort());
 await livePage.route('https://api.themoviedb.org/3/**',route=>{
  const req=route.request(),url=new URL(req.url());
  requests.push({path:url.pathname,search:url.searchParams.toString(),auth:req.headers().authorization});
  const page=Number(url.searchParams.get('page')||1);
  const item=url.pathname.endsWith('/search/movie')?[films[0]]:page===1?[films[0],films[1]]:[
   {id:900003,title:'Third Discovery',release_date:'2026-08-01',vote_average:9.1,genre_ids:[12],poster_path:'/third.jpg',backdrop_path:null,overview:'More movie results.'}
  ];
  route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({page,total_pages:2,total_results:3,results:item})});
 });
 await livePage.goto(origin+'/serivia/',{waitUntil:'domcontentloaded'});
 assert.equal(await livePage.locator('#catalogMode').innerText(),'Demo collection · 12 films','Without token, sample collection is explicit');
 assert.equal(await livePage.locator('.brand').getAttribute('href'),'#main','Brand points at a real local section');
 await livePage.locator('#connectTmdb').click();
 await livePage.locator('#tmdbAccessToken').fill('fake_test_read_access_token');
 await livePage.locator('.tmdb-connect-form button[type=submit]').click();
 await livePage.waitForFunction(()=>document.querySelector('#catalogMode').textContent.includes('Live movie catalog'));
 await livePage.waitForFunction(()=>document.querySelector('#movieStrip .movie-card')?.textContent.includes('A Brand New Movie'));
 assert.equal(await livePage.locator('.movie-card').count(),2,'Connected live catalog shows remote results');
 assert.equal(await livePage.locator('.movie-strip').evaluate(el=>getComputedStyle(el).display),'grid','Live results use a multi-row grid');
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
 await livePage.locator('#connectTmdb').click();
 await livePage.locator('.tmdb-disconnect').first().click();
 assert.equal(await livePage.locator('#catalogMode').innerText(),'Demo collection · 12 films','Disconnect restores demo');
 assert.equal(await livePage.evaluate(()=>sessionStorage.getItem('serivia.tmdb.session.v1')),null,'Disconnect removes token');
 await liveCtx.close();
 const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await reduced.route('https://image.tmdb.org/**',route=>route.abort());
 await reduced.goto(origin+'/serivia/');
 assert.equal(await reduced.locator('.movie-card').count(),12);
 await reduced.close();
 console.log('SERIVIA BROWSER CHECKS PASSED '+JSON.stringify(results));
}finally{
 await browser.close();await new Promise(done=>server.close(done));
}