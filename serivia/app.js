(()=>{
'use strict';
// Curated seed content, not a live TMDB feed. No API tokens are shipped to public GitHub Pages.
const CDN='https://image.tmdb.org/t/p/';
const movie=(id,title,year,rating,minutes,genres,poster,backdrop,overview,certificate='PG-13')=>
  ({id,title,year,rating,minutes,genres,poster,backdrop:backdrop||null,overview,certificate});
const MOVIES=[
 movie(552524,'Lilo & Stitch',2025,7.2,112,['Adventure','Comedy','Family','Sci-Fi'],'j9yv60GA4T2b7ts5BZEWju9UEeP.jpg',null,'A young Hawaiian girl befriends a mischievous alien and discovers what it truly means to be family.','PG'),
 movie(575265,'Mission: Impossible - The Final Reckoning',2025,8.2,170,['Action','Adventure','Thriller'],'z53D72EAOxGRqdr7KXXWp9dJiDe.jpg',null,'Ethan Hunt races against time to confront a dangerous artificial intelligence and save the future.'),
 movie(670292,'The Creator',2023,7.1,133,['Action','Drama','Sci-Fi'],'vBZ0qvaRxqEhZwl6LWmruJqWE8Z.jpg',null,'A former soldier searches for a mysterious creator in a future shaped by artificial intelligence.'),
 movie(1087192,'How to Train Your Dragon',2025,7.8,125,['Action','Adventure','Fantasy','Family'],'53dsJ3oEnBhTBVMigWJ9tkA5bzJ.jpg','8J6UlIFcU7eZfq9iCLbgc8Auklg.jpg','On the rugged island of Berk, a young Viking befriends a Night Fury dragon and begins to change how his world sees these mysterious creatures.','PG'),
 movie(823219,'Flow',2024,7.9,85,['Animation','Adventure','Fantasy'],'zeinX0xt78GgtpCQjx7d2S6Gh7g.jpg',null,'A solitary cat finds shelter on a boat after a great flood and learns to survive with an unlikely animal crew.','PG'),
 movie(762509,'Mufasa: The Lion King',2024,7.3,118,['Adventure','Drama','Family'],'lurEK87kukWNaHd0zYnsi3yzJrs.jpg','1w8kutrRucTd3wlYyu5QlUDMiG1.jpg','A young, orphaned lion named Mufasa finds friendship and his destiny on an epic journey across the Pride Lands.','PG'),
 movie(693134,'Dune: Part Two',2024,8.5,166,['Action','Adventure','Drama','Sci-Fi'],'1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg','eZ239CUp1d6OryZEBPnO2n87gMG.jpg','Paul Atreides joins the Fremen, faces an impossible choice and confronts the fate of Arrakis.'),
 movie(1241982,'Moana 2',2024,7.1,100,['Animation','Adventure','Family'],'aLVkiINlIeCkcZIzb7XHzPYgO6L.jpg','vYqt6kb4lcF8wwqsMMaULkP9OEn.jpg','Moana answers an unexpected call from her ancestors and sets off across the far seas of Oceania.','PG'),
 movie(533535,'Deadpool & Wolverine',2024,7.6,128,['Action','Comedy','Sci-Fi'],'8cdWjvZQUExUUTzyp4t6EDMubfO.jpg','by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg','A wisecracking antihero reluctantly teams up with a gruff mutant for a chaotic adventure across realities.','R'),
 movie(157336,'Interstellar',2014,8.7,169,['Adventure','Drama','Sci-Fi'],'gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',null,'A team of explorers travels beyond the known galaxy to search for humanity’s next home.'),
 movie(27205,'Inception',2010,8.4,148,['Action','Sci-Fi','Crime'],'xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg',null,'A skilled thief enters dreams to steal secrets and faces an impossible task: planting an idea instead.'),
 movie(299534,'Avengers: Endgame',2019,8.3,181,['Action','Adventure','Sci-Fi'],'ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg',null,'The remaining heroes gather for one final chance to undo an unimaginable loss.'),
 movie(122,'The Lord of the Rings: The Return of the King',2003,8.5,201,['Action','Adventure','Fantasy'],'rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg',null,'The fate of Middle-earth rests on a perilous journey to destroy a powerful ring.'),
 movie(550,'Fight Club',1999,8.4,139,['Drama','Crime'],'jSziioSwPVrOy9Yow3XhWIBDjq1.jpg',null,'An office worker encounters a charismatic outsider and becomes drawn into a secret society.','R'),
 movie(1020414,"Peter Pan's Neverland Nightmare",2025,5.1,89,['Horror','Fantasy'],'mOR1Ks0EcXocwMV4EPv4letz0F5.jpg','nhxOttmAS2w8e6hyIcKoNvgHoix.jpg','A dark reimagining of a familiar Neverland story.','R')
];
const GENRES=['Trending','Adventure','Action','Comedy','Crime','Drama','Fantasy','Horror','Sci-Fi','Animation','Family'];
const FEATURE_IDS=[1087192,693134,762509,1241982];
const HOME_SHOWCASE_IDS=[552524,823219,575265,762509,693134,670292];
const byId=new Map(MOVIES.map(m=>[m.id,m]));
// TMDB does not permit unauthenticated movie search. Public GitHub Pages has no
// secure server-side secrets, so users opt into live browsing per browser session.
const API='https://api.themoviedb.org/3/';
const TOKEN_KEY='serivia.tmdb.session.v1',SAVED_DATA_KEY='serivia.savedMovieData.v1';
const GENRE_IDS={Action:28,Adventure:12,Animation:16,Comedy:35,Crime:80,Drama:18,Family:10751,Fantasy:14,Horror:27,'Sci-Fi':878};
const ID_GENRES=Object.fromEntries(Object.entries(GENRE_IDS).map(([name,id])=>[id,name]));
let token=null;
try{token=sessionStorage.getItem(TOKEN_KEY)||null}catch{}
let liveMovies=[],livePage=0,livePages=0,liveTotal=0,loading=false,liveError='',aborter=null,requestId=0,queryDelay=null;
try{
 const snapshots=JSON.parse(localStorage.getItem(SAVED_DATA_KEY)||'[]');
 if(Array.isArray(snapshots))snapshots.slice(0,20).forEach(m=>{
  if(m&&Number.isInteger(m.id)&&m.id>0&&typeof m.title==='string'&&!byId.has(m.id)){
   byId.set(m.id,{id:m.id,title:m.title.slice(0,150),year:Number(m.year)||0,rating:Number(m.rating)||0,
    minutes:0,genres:Array.isArray(m.genres)?m.genres.filter(g=>typeof g==='string').slice(0,8):[],
    poster:typeof m.poster==='string'?m.poster:null,backdrop:typeof m.backdrop==='string'?m.backdrop:null,
    overview:typeof m.overview==='string'?m.overview.slice(0,900):'',certificate:'NR'});
  }
 });
}catch{}
function normalizeRemote(m){
 const id=Number(m?.id);
 if(!Number.isInteger(id)||id<=0||!m.title)return null;
 const poster=typeof m.poster_path==='string'?m.poster_path.replace(/^\//,''):null;
 const backdrop=typeof m.backdrop_path==='string'?m.backdrop_path.replace(/^\//,''):null;
 const genres=Array.isArray(m.genre_ids)?m.genre_ids.map(id=>ID_GENRES[id]).filter(Boolean):[];
 const year=Number(String(m.release_date||'').slice(0,4))||0;
 return {id,title:String(m.title).slice(0,150),year,rating:Math.max(0,Math.min(10,Number(m.vote_average)||0)),minutes:0,
   genres,poster,backdrop,overview:String(m.overview||'').slice(0,1100),certificate:'NR'};
}
async function tmdb(endpoint,params={},credential=token,signal){
 const url=new URL(endpoint,API);
 Object.entries(params).forEach(([key,value])=>{if(value!==null&&value!==undefined&&value!=='')url.searchParams.set(key,String(value))});
 const response=await fetch(url,{headers:{Authorization:'Bearer '+credential,Accept:'application/json'},signal,cache:'no-store'});
 if(!response.ok)throw Error(response.status===401?'TMDB denied this token. Check your API Read Access Token.':response.status===429?'TMDB is rate-limiting requests. Try again shortly.':'TMDB request failed ('+response.status+').');
 return response.json();
}
function updateCatalogNotice(){
 const connected=Boolean(token);
 $('catalogNotice').classList.toggle('is-connected',connected);
 $('catalogMode').textContent=connected?'TMDB · Live movie catalog':'Demo collection · '+MOVIES.length+' films';
 $('catalogHelp').textContent=connected?(liveError||'Browse thousands of movies. Search, filter, and load more results.'):'Connect TMDB to search and browse its full movie database.';
 $('connectTmdb').textContent=connected?'Connection settings':'Connect TMDB';
}
function buildQuery(page){
 const params={page,language:'en-US',include_adult:false};
 if(state.query){
  params.query=state.query;
  if(/^20\d\d$/.test(state.year))params.year=state.year;
  return {endpoint:'search/movie',params};
 }
 if(state.view==='trending'&&state.genre==='Trending'&&state.year==='all'&&!state.rating&&state.sort==='featured'){
  return {endpoint:'trending/movie/week',params:{page,language:'en-US'}};
 }
 if(state.view==='home'&&state.genre==='Trending'&&state.year==='all'&&!state.rating&&state.sort==='featured'){
  return {endpoint:'movie/popular',params:{page,language:'en-US'}};
 }
 params.sort_by={featured:'popularity.desc',rating:'vote_average.desc',year:'primary_release_date.desc',az:'original_title.asc'}[state.sort]||'popularity.desc';
 if(state.view==='soon'){
  params['primary_release_date.gte']=new Date().toISOString().slice(0,10);
  params.sort_by='primary_release_date.asc';
 }else if(state.year==='classic'){
  params['primary_release_date.lte']='2023-12-31';
 }else if(state.year!=='all'){
  params.primary_release_year=state.year;
 }
 if(state.genre!=='Trending')params.with_genres=GENRE_IDS[state.genre]||null;
 if(state.rating)params['vote_average.gte']=state.rating;
 return {endpoint:'discover/movie',params};
}
function updatePagination(){
 const available=Boolean(token)&&state.view!=='favorites'&&livePage<livePages;
 $('pagination').hidden=!available;
 $('loadMore').disabled=loading;
 $('loadMore').textContent=loading?'Loading movies…':'Load more movies';
 $('pageStatus').textContent=livePage+' of '+livePages+' pages';
}
async function loadLive(append=false){
 if(!token||state.view==='favorites')return;
 if(loading&&append)return;
 if(aborter)aborter.abort();
 aborter=new AbortController();
 const ownRequest=++requestId,page=append?livePage+1:1;
 loading=true;liveError='';updateCatalogNotice();updatePagination();
 try{
  const {endpoint,params}=buildQuery(page);
  const data=await tmdb(endpoint,params,token,aborter.signal);
  if(ownRequest!==requestId)return;
  let movies=(Array.isArray(data.results)?data.results:[]).map(normalizeRemote).filter(Boolean);
  // TMDB search does not accept the Discover API's advanced filters.
  if(state.query){
   if(state.genre!=='Trending')movies=movies.filter(m=>m.genres.includes(state.genre));
   if(state.year==='classic')movies=movies.filter(m=>m.year<2024);
   if(state.rating)movies=movies.filter(m=>m.rating>=state.rating);
  }
  movies.forEach(m=>byId.set(m.id,m));
  liveMovies=append?[...liveMovies,...movies.filter(m=>!liveMovies.some(old=>old.id===m.id))]:movies;
  livePage=Number(data.page)||page;livePages=Math.min(500,Number(data.total_pages)||1);
  liveTotal=Number(data.total_results)||liveMovies.length;
 }catch(error){
  if(error.name==='AbortError')return;
  if(ownRequest!==requestId)return;
  liveError=error.message==='Failed to fetch'?'Could not reach TMDB. Check your network or connection.':error.message;
  if(!append){liveMovies=[];livePages=0;liveTotal=0;livePage=0}
 }finally{
  if(ownRequest===requestId){loading=false;renderMovies();updateCatalogNotice();updatePagination()}
 }
}
function refreshLive(){
 if(!token){renderMovies();updateCatalogNotice();return}
 if(state.view==='favorites'){renderMovies();updateCatalogNotice();return}
 loadLive(false);
}
function saveMovieSnapshots(){
 const saved=[...favorites].map(id=>byId.get(id)).filter(Boolean).slice(0,20);
 storageWrite(SAVED_DATA_KEY,saved);
}

const $=id=>document.getElementById(id);
const state={view:'home',genre:'Trending',query:'',year:'all',rating:0,sort:'featured',slide:0,activeMovie:null};
const pic=(file,size='w500')=>file?CDN+size+'/'+encodeURIComponent(file):'';
const widescreen=movie=>movie.backdrop||movie.poster;
const imageSizes={poster:'(max-width:480px) 145px, (max-width:1000px) 155px, 180px',recent:'195px',backdrop:'(max-width:760px) 100vw, calc(100vw - 330px)'};
// Prefer the largest practical TMDB image for each role; correct file paths and
// never stretch a portrait poster into a landscape backdrop.
function setArt(img,movie,role='poster'){
 const landscape=role!=='poster';
 const file=landscape?widescreen(movie):movie.poster;
 const sizes=landscape?['w780','w1280']:['w342','w500','w780'];
 const container=img.parentElement;
 container?.classList.remove('image-failed','portrait-art');
 if(landscape&&!movie.backdrop)container?.classList.add('portrait-art');
 if(container)container.dataset.artTitle=movie.title;
 if(!file){
  img.hidden=true;img.removeAttribute('srcset');img.removeAttribute('src');
  container?.classList.add('image-failed');
  return;
 }
 img.hidden=false;
 img.alt=role==='poster'?movie.title+' movie poster':movie.title+' movie artwork';
 img.decoding='async';
 img.sizes=imageSizes[role]||imageSizes.backdrop;
 img.srcset=sizes.map((size,i)=>pic(file,size)+' '+(landscape?[780,1280][i]:[342,500,780][i])+'w').join(', ');
 img.src=pic(file,landscape?'w1280':'w780');
 img.onerror=()=>{
  img.onerror=null;img.removeAttribute('srcset');
  // A CDN error must leave an intentional, readable movie-title tile.
  img.hidden=true;
  container?.classList.add('image-failed');
 };
}

const storageRead=(key,def)=>{try{const value=JSON.parse(localStorage.getItem(key));return Array.isArray(value)?value:def}catch{return def}};
const readIds=(key,def)=>storageRead(key,def).filter(id=>Number.isInteger(id)&&byId.has(id)).slice(0,20);
const storageWrite=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{/* Storage may be unavailable in private browsing. */}};
const FAV_KEY='serivia.watchlist.v1',RECENT_KEY='serivia.recent.v1';
 const MAX_RECENT=12;
let favorites=new Set(readIds(FAV_KEY,[]));
let recent=readIds(RECENT_KEY,[693134,762509,1087192]).slice(0,MAX_RECENT);
const node=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
const svg=(name)=>{const s=document.createElementNS('http://www.w3.org/2000/svg','svg'),u=document.createElementNS('http://www.w3.org/2000/svg','use');u.setAttribute('href','#ic-'+name);s.appendChild(u);s.setAttribute('aria-hidden','true');return s};
const image=(movie,role='poster')=>{
 const n=node('img');
 n.loading='lazy';
 n.width=role==='poster'?780:1280;n.height=role==='poster'?1170:720;
 // setArt runs after insertion so the failure state belongs to the actual box.
 n.addEventListener('load',()=>n.parentElement?.classList.remove('image-failed'));
 queueMicrotask(()=>setArt(n,movie,role));
 return n;
};
const fmtTime=minutes=>minutes?Math.floor(minutes/60)+'h '+String(minutes%60).padStart(2,'0')+'min':'Runtime TBA';
const titleFor=view=>({home:'Discover movies',favorites:'Your watchlist',soon:'Coming soon',trending:'Trending picks'})[view];
const togglePopover=(el,btn,force)=>{
 const opening=typeof force==='boolean'?force:el.hidden;el.hidden=!opening;btn.setAttribute('aria-expanded',String(opening));
};
function filters(){
 let out=(state.view==='favorites'?[...favorites].map(id=>byId.get(id)).filter(Boolean):MOVIES).filter(m=>{
  if(state.view==='favorites'&&!favorites.has(m.id))return false;
  if(state.view==='soon')return false; // Demo has no future release feed.
  if(state.genre!=='Trending'&&!m.genres.includes(state.genre))return false;
  if(state.query){
   const hay=(m.title+' '+m.genres.join(' ')+' '+m.overview).toLocaleLowerCase();
   if(!hay.includes(state.query.toLocaleLowerCase()))return false;
  }
  if(state.year==='classic'&&m.year>=2024)return false;
  if(state.year!=='classic'&&state.year!=='all'&&m.year!==Number(state.year))return false;
  if(m.rating<state.rating)return false;
  return true;
 });
 if(state.view==='home'&&state.sort==='featured'&&state.genre==='Trending'&&!state.query){
  const order=new Map(HOME_SHOWCASE_IDS.map((id,index)=>[id,index]));
  out.sort((a,b)=>(order.get(a.id)??999)-(order.get(b.id)??999));
 }else if(state.view==='trending')out.sort((a,b)=>b.rating-a.rating);
 else if(state.sort==='rating')out.sort((a,b)=>b.rating-a.rating);
 else if(state.sort==='year')out.sort((a,b)=>b.year-a.year);
 else if(state.sort==='az')out.sort((a,b)=>a.title.localeCompare(b.title));
 return out;
}
function drawMovieCard(movie){
 const card=node('button','movie-card');card.type='button';card.setAttribute('aria-label','View details for '+movie.title);
 const poster=node('span','poster-wrap');poster.dataset.artTitle=movie.title;poster.appendChild(image(movie,'poster'));const cue=node('span','card-hover-icon');cue.appendChild(svg('chevron'));poster.appendChild(cue);
 const name=node('span','movie-name',movie.title);
 const meta=node('span','movie-meta');meta.appendChild(node('span','',String(movie.year)));meta.appendChild(node('span','','·'));
 const rating=node('b');rating.append(svg('star'),document.createTextNode(movie.rating.toFixed(1)));meta.appendChild(rating);
 card.append(poster,name,meta);
 card.addEventListener('click',()=>openMovie(movie.id));
 return card;
}
function updateGenres(){
 for(const b of $('genreScroll').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.genre===state.genre));
}
function updateNav(){
 document.querySelectorAll('.side-link[data-view]').forEach(b=>{
  const active=b.dataset.view===state.view;
  b.classList.toggle('is-active',active);
  if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
 });
 $('pageTitle').textContent=titleFor(state.view);
 $('pageSubtitle').textContent=state.view==='soon'?'Unreleased titles need a live movie feed.':state.view==='favorites'?'Movies you saved for later.':state.view==='trending'?'Highlights from our curated film picks.':'A little something for your next movie night.';
 $('resultsHeading').textContent=state.view==='favorites'?'Saved movies':state.view==='soon'?'Upcoming releases':state.query?'Search results':state.view==='trending'?'Top rated in the collection':'Featured for you';
 const showFeature=(state.view==='home'||state.view==='trending')&&!state.query;
 $('featuredSection').hidden=!showFeature;
}
function renderMovies(){
 updateNav();updateGenres();
 const liveActive=Boolean(token)&&state.view!=='favorites';
 const results=liveActive?liveMovies:filters();const container=$('movieStrip');container.replaceChildren();
 container.classList.toggle('is-live',liveActive);
 for(const movie of results)container.appendChild(drawMovieCard(movie));
 $('resultsCount').textContent=liveActive?(loading?'Loading…':liveError?'Connection issue':results.length+' shown · '+liveTotal.toLocaleString()+' found'):results.length+' movie'+(results.length===1?'':'s');
 $('emptyState').hidden=results.length!==0||loading;
 if(liveActive){
  $('emptyState').querySelector('h2').textContent=liveError?'Could not load movies':'No movies found';
  $('emptyState').querySelector('p').textContent=liveError||'Try another search or loosen your filters.';
 }else if(state.view==='soon'){
  $('emptyState').querySelector('h2').textContent='Coming soon';
  $('emptyState').querySelector('p').textContent='This hand-picked demo catalog only includes released films. An upcoming-release feed can be connected later.';
 }else if(state.view==='favorites'&&!results.length){
  $('emptyState').querySelector('h2').textContent='Your list is empty';
  $('emptyState').querySelector('p').textContent='Tap the heart on a featured movie to save it here.';
 }else{
  $('emptyState').querySelector('h2').textContent='No movies found';
  $('emptyState').querySelector('p').textContent='Try another title or clear your filters.';
 }
 updatePagination();
}
function renderRecent(){
 const list=$('recentList');list.replaceChildren();
 for(const id of recent.slice(0,MAX_RECENT)){
  const movie=byId.get(id);if(!movie)continue;
  const b=node('button','mini-movie');b.type='button';b.setAttribute('aria-label','Explore '+movie.title);
  const cover=image(movie,'recent');cover.alt='';b.dataset.artTitle=movie.title;b.appendChild(cover);
  const t=node('span','mini-title',movie.title),bottom=node('span','mini-bottom');
  const play=node('span','mini-play');play.appendChild(svg('play'));
  bottom.append(play,node('span','mini-year',String(movie.year)));
  b.append(t,bottom);b.addEventListener('click',()=>{closeMobileNav();openMovie(id)});
  list.appendChild(b);
 }
}
function toggleFavorite(id){
 if(favorites.has(id))favorites.delete(id);else favorites.add(id);
 storageWrite(FAV_KEY,[...favorites]);saveMovieSnapshots();
 const featured=byId.get(FEATURE_IDS[state.slide]);
 $('favoriteFeature').setAttribute('aria-pressed',String(favorites.has(featured.id)));
 $('favoriteFeature').setAttribute('aria-label',favorites.has(featured.id)?'Remove '+featured.title+' from watchlist':'Save '+featured.title+' to watchlist');
 if(state.activeMovie===id)updateDetailFavorite();
 if(state.view==='favorites')renderMovies();
}
function getFeature(){return byId.get(FEATURE_IDS[state.slide])}
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
let carouselTimer=null,lastCarouselInput=0,lastHorizontalWheel=0;
function showSlide(index,manual=true){
 const next=(index+FEATURE_IDS.length)%FEATURE_IDS.length;
 if(manual)lastCarouselInput=Date.now();
 if(state.slide===next)return;
 state.slide=next;
 feature();
 if(!reducedMotion.matches){
  const hero=$('featured');
  hero.classList.remove('slide-enter');
  void hero.offsetWidth;
  hero.classList.add('slide-enter');
 }
}
function feature(){
 const movie=getFeature();
 $('featuredTitle').textContent=movie.title;
 $('featureDuration').textContent=fmtTime(movie.minutes);
 const art=$('featureArt');setArt(art,movie,'backdrop');
 const tags=$('featureTags');tags.replaceChildren();
 for(const tag of [fmtTime(movie.minutes),movie.genres[0],'Movie',String(movie.year),movie.certificate])tags.appendChild(node('span','',tag));
 const video='https://www.themoviedb.org/movie/'+movie.id+'/videos';
 $('featureTrailer').href=video;$('featureTrailer').setAttribute('aria-label','Find trailers for '+movie.title);
 $('favoriteFeature').setAttribute('aria-pressed',String(favorites.has(movie.id)));
 $('favoriteFeature').setAttribute('aria-label',favorites.has(movie.id)?'Remove from watchlist':'Add '+movie.title+' to watchlist');
 $('slideDots').querySelectorAll('button').forEach((b,i)=>{b.classList.toggle('is-current',i===state.slide);b.setAttribute('aria-pressed',String(i===state.slide))});
 const peek1=byId.get(FEATURE_IDS[(state.slide+1)%FEATURE_IDS.length]);
 const peek2=byId.get(FEATURE_IDS[(state.slide+2)%FEATURE_IDS.length]);
 $('peekFront').style.backgroundImage='url("'+pic(peek1.poster,'w780')+'")';
 $('peekBack').style.backgroundImage='url("'+pic(peek2.poster,'w780')+'")';
 $('peekFront').setAttribute('aria-label','Show next featured movie: '+peek1.title);
 $('peekBack').setAttribute('aria-label','Show featured movie: '+peek2.title);
}
function drawDots(){
 const dots=$('slideDots');for(let i=0;i<FEATURE_IDS.length;i++){
  const b=node('button');b.type='button';b.setAttribute('aria-label','Featured movie '+(i+1));
  b.addEventListener('click',()=>showSlide(i));dots.appendChild(b);
 }
}
function visit(id){
 recent=[id,...recent.filter(x=>x!==id)].slice(0,MAX_RECENT);storageWrite(RECENT_KEY,recent);renderRecent();
}
function updateDetailFavorite(){
 const id=state.activeMovie;if(id===null)return;
 const saved=favorites.has(id),b=$('detailFavorite');
 b.classList.toggle('is-saved',saved);
 b.textContent='';b.append(svg(saved?'check':'heart'),document.createTextNode(saved?'Saved to watchlist':'Add to watchlist'));
}
function openMovie(id){
 const movie=byId.get(id);if(!movie)return;
 state.activeMovie=id;visit(id);
 const art=$('detailPoster');setArt(art,movie,'backdrop');
 $('detailTitle').textContent=movie.title;
 $('detailMeta').textContent=(movie.year||'TBA')+'  ·  '+fmtTime(movie.minutes)+'  ·  '+(movie.certificate==='NR'?'TMDB':movie.certificate)+'  ·  ★ '+movie.rating.toFixed(1);
 $('detailSynopsis').textContent=movie.overview;
 const tags=$('detailGenres');tags.replaceChildren();
 movie.genres.forEach(g=>tags.appendChild(node('span','',g)));
 $('detailTrailer').href='https://www.themoviedb.org/movie/'+movie.id+'/videos';
 updateDetailFavorite();
 if(!$('detailDialog').open)$('detailDialog').showModal();
}
function openInfo(kind){
 const body=$('infoBody');body.replaceChildren();
 const p=text=>{body.appendChild(node('p','',text))};
 const link=(label,url)=>{const a=node('a','',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';body.appendChild(a)};
 if(kind==='credits'){
  $('infoTitle').textContent='About the movie artwork';
  p(token?'Live movie browsing is powered by the TMDB API. The featured carousel remains hand-curated; TMDB votes are not Rotten Tomatoes scores.':'The fallback is a curated '+MOVIES.length+'-film catalog. Movie artwork and information reference TMDB. Sample ratings are not live or Rotten Tomatoes scores.');
  p('This product uses the TMDB API but is not endorsed or certified by TMDB.');
  const logo=node('img','tmdb-credit-logo');
  logo.src='https://www.themoviedb.org/assets/2/v4/logos/v2/blue_long_2-9665a76b1ae401a510ec1e0ca40ddcb3b0cfe45f1d51b77a308fea0845885648.svg';
  logo.alt='The Movie Database (TMDB) official logo';
  logo.width=132;logo.height=24;
  body.appendChild(logo);
  link('Explore The Movie Database ↗','https://www.themoviedb.org/');
  const small=node('p','credit-note','Movie artwork belongs to its respective owners. No copyrighted images are included in this repository; images are displayed from TMDB CDN.');
  body.appendChild(small);
 }else if(kind==='settings'){
  $('infoTitle').textContent=token?'TMDB connection & preferences':'Connect the full TMDB catalog';
  p(token?'Live movie browsing is enabled for this browser tab. You can search TMDB films, browse genres and load more pages.':'Serivia starts with 12 sample movies. To search TMDB’s much larger film database, connect your own TMDB API Read Access Token.');
  p('The access token stays in this browser session only, and is sent directly to api.themoviedb.org using HTTPS. Do not paste passwords. This static site cannot hide a token from someone using your browser.');
  if(token){
   const disconnect=node('button','tmdb-disconnect','Disconnect TMDB');
   disconnect.type='button';
   disconnect.addEventListener('click',()=>{
    token=null;try{sessionStorage.removeItem(TOKEN_KEY)}catch{}
    if(aborter)aborter.abort();requestId++;loading=false;liveMovies=[];livePage=0;livePages=0;liveTotal=0;liveError='';
    $('infoDialog').close();renderMovies();updateCatalogNotice();
   });body.appendChild(disconnect);
  }else{
   const form=node('form','tmdb-connect-form'),label=node('label','','TMDB API Read Access Token');
   const input=node('input');input.type='password';input.required=true;input.autocomplete='off';input.spellcheck=false;
   input.placeholder='Paste your TMDB API Read Access Token';input.id='tmdbAccessToken';
   label.htmlFor=input.id;
   const note=node('small','', 'Get a noncommercial API token from your TMDB account’s Settings → API page. It is not stored in the repository.');
   const error=node('div','tmdb-connect-error');error.setAttribute('role','alert');
   const connect=node('button','primary-action','Connect and browse movies');connect.type='submit';
   form.append(label,input,note,error,connect);
   form.addEventListener('submit',async e=>{
    e.preventDefault();
    const candidate=input.value.trim();if(!candidate)return;
    connect.disabled=true;connect.textContent='Checking connection…';error.textContent='';
    try{
     const data=await tmdb('movie/popular',{page:1},candidate);
     if(!Array.isArray(data.results))throw Error('Unexpected TMDB response.');
     token=candidate;try{sessionStorage.setItem(TOKEN_KEY,token)}catch{}
     state.view='home';state.genre='Trending';state.query='';$('searchInput').value='';
     $('infoDialog').close();updateCatalogNotice();loadLive(false);
    }catch(err){error.textContent=err.message==='Failed to fetch'?'Unable to reach TMDB. Check your network.':err.message}
    finally{connect.disabled=false;connect.textContent='Connect and browse movies';input.value=''}
   });
   body.appendChild(form);
  }
  const tmdbLink=node('a','', 'Get a TMDB developer token ↗');tmdbLink.href='https://www.themoviedb.org/settings/api';tmdbLink.target='_blank';tmdbLink.rel='noopener noreferrer';body.appendChild(tmdbLink);
  const button=node('button','tmdb-disconnect','Clear saved movies');
  button.addEventListener('click',()=>{favorites.clear();storageWrite(FAV_KEY,[]);saveMovieSnapshots();renderMovies();feature();button.textContent='Watchlist cleared'});
  body.appendChild(button);
 }else{
  $('infoTitle').textContent='Welcome to Serivia';
  p('Browse the curated catalog, search by title, narrow by genre, explore movie details and save films for later.');
  p('This is not a streaming service. Connect TMDB in Settings for live movie search, broader discovery, ratings and paginated browsing. Trailer buttons link to TMDB movie video pages.');
  p('The demo has '+MOVIES.length+' titles. With a connected TMDB token, explore many more movies. Your watchlist stays in local browser storage.');
  link('TMDB developer documentation ↗','https://developer.themoviedb.org/');
 }
 $('infoDialog').showModal();
}
function closeMobileNav(){
 $('sidebar').classList.remove('is-open');
 $('overlay').hidden=true;
 $('mobileMenu').setAttribute('aria-expanded','false');
 $('mobileMenu').setAttribute('aria-label','Open navigation');
 document.body.style.overflow='';
}
function switchView(view){
 state.view=view;
 if(view==='favorites'||view==='soon')state.genre='Trending';
 state.query='';$('searchInput').value='';
 if(view==='home'||view==='trending'){state.year='all';state.rating=0;state.sort='featured';$('yearFilter').value='all';$('ratingFilter').value='0';$('sortFilter').value='featured'}
 closeMobileNav();renderMovies();refreshLive();
 $('main').focus({preventScroll:true});
}
function initialize(){
 drawDots();feature();renderRecent();
 // The exposed fanned covers, dots, keyboard and swipe gestures navigate featured films.
 $('peekFront').addEventListener('click',()=>showSlide(state.slide+1));
 $('peekBack').addEventListener('click',()=>showSlide(state.slide+2));
 let gesture=null,touchGesture=null,lastSwipeAt=-Infinity;
 const hero=$('featured');
 const endGesture=(dx,dy)=>{
  if(Math.abs(dx)<=45||Math.abs(dx)<=Math.abs(dy)*1.2)return;
  // Pointer and Touch events may both fire for one gesture. Advance exactly once.
  if(performance.now()-lastSwipeAt<450)return;
  lastSwipeAt=performance.now();
  showSlide(state.slide+(dx<0?1:-1));
 };
 hero.addEventListener('pointerdown',event=>{
  if(event.target.closest('button,a')||event.button!==0)return;
  gesture={id:event.pointerId,x:event.clientX,y:event.clientY};
 });
 hero.addEventListener('pointerup',event=>{
  if(!gesture||event.pointerId!==gesture.id)return;
  const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
  gesture=null;endGesture(dx,dy);
 });
 hero.addEventListener('pointercancel',()=>{gesture=null});
 hero.addEventListener('touchstart',event=>{
  if(event.target.closest('button,a')||event.touches.length!==1)return;
  touchGesture={x:event.touches[0].clientX,y:event.touches[0].clientY};
 },{passive:true});
 hero.addEventListener('touchend',event=>{
  if(!touchGesture||!event.changedTouches.length)return;
  const point=event.changedTouches[0];
  const dx=point.clientX-touchGesture.x,dy=point.clientY-touchGesture.y;
  touchGesture=null;endGesture(dx,dy);
 },{passive:true});
 hero.addEventListener('touchcancel',()=>{touchGesture=null},{passive:true});
 hero.addEventListener('dragstart',e=>e.preventDefault());
 $('featuredStack').addEventListener('wheel',event=>{
  if(Math.abs(event.deltaX)<20||Math.abs(event.deltaX)<Math.abs(event.deltaY)*1.2)return;
  if(Date.now()-lastHorizontalWheel<650)return;
  lastHorizontalWheel=Date.now();
  showSlide(state.slide+(event.deltaX>0?1:-1));
 },{passive:true});
 $('featuredSection').addEventListener('mouseenter',()=>{lastCarouselInput=Date.now()});
 $('featuredSection').addEventListener('focusin',()=>{lastCarouselInput=Date.now()});
 // Advance when idle, while allowing users to interact at their own pace.
 if(!reducedMotion.matches){
  carouselTimer=window.setInterval(()=>{
   if(document.hidden||$('detailDialog').open||$('infoDialog').open)return;
   if(state.view!=='home'&&state.view!=='trending')return;
   if(state.query||Date.now()-lastCarouselInput<9000)return;
   showSlide(state.slide+1,false);
  },7500);
  window.addEventListener('pagehide',()=>window.clearInterval(carouselTimer),{once:true});
 }
 hero.addEventListener('click',e=>{
  if(e.target.closest('button,a'))return;
  if(performance.now()-lastSwipeAt<450){e.preventDefault();return}
  openMovie(getFeature().id);
 });

 for(const genre of GENRES){
  const b=node('button','',genre);b.type='button';b.dataset.genre=genre;
  b.addEventListener('click',()=>{state.genre=genre;renderMovies();refreshLive();b.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'})});
  $('genreScroll').appendChild(b);
 }
 renderMovies();updateCatalogNotice();if(token)loadLive(false);
 // Genre arrows provide a mouse-friendly alternative to horizontal swiping.
 const genreTrack=$('genreScroll'),back=$('genreBack'),forward=$('genreForward');
 const updateGenrePagers=()=>{
  const max=genreTrack.scrollWidth-genreTrack.clientWidth;
  back.disabled=genreTrack.scrollLeft<2;
  forward.disabled=max<=2||genreTrack.scrollLeft>=max-2;
 };
 back.addEventListener('click',()=>genreTrack.scrollBy({left:-Math.max(140,genreTrack.clientWidth*.65),behavior:'smooth'}));
 forward.addEventListener('click',()=>genreTrack.scrollBy({left:Math.max(140,genreTrack.clientWidth*.65),behavior:'smooth'}));
 genreTrack.addEventListener('scroll',updateGenrePagers,{passive:true});
 window.addEventListener('resize',updateGenrePagers,{passive:true});
 requestAnimationFrame(updateGenrePagers);
 document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();switchView('home')});
 document.querySelectorAll('.side-link[data-view]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
 $('searchInput').addEventListener('input',e=>{
  state.query=e.target.value.trim();
  if(queryDelay)clearTimeout(queryDelay);
  if(token){
   // Cancel immediately; don't show stale results while the user types.
   if(aborter)aborter.abort();requestId++;loading=false;liveMovies=[];livePage=0;livePages=0;
   renderMovies();queryDelay=setTimeout(()=>loadLive(false),380);
  }else renderMovies();
 });
 $('yearFilter').addEventListener('change',e=>{state.year=e.target.value;renderMovies();refreshLive()});
 $('ratingFilter').addEventListener('change',e=>{state.rating=Number(e.target.value);renderMovies();refreshLive()});
 $('sortFilter').addEventListener('change',e=>{state.sort=e.target.value;renderMovies();refreshLive()});
 const reset=()=>{state.genre='Trending';state.query='';state.year='all';state.rating=0;state.sort='featured';$('searchInput').value='';$('yearFilter').value='all';$('ratingFilter').value='0';$('sortFilter').value='featured';switchView('home');togglePopover($('filters'),$('filterBtn'),false)};
 $('resetFilters').addEventListener('click',reset);
 $('loadMore').addEventListener('click',()=>loadLive(true));
 $('emptyReset').addEventListener('click',reset);
 $('favoriteFeature').addEventListener('click',()=>toggleFavorite(getFeature().id));

 $('detailFavorite').addEventListener('click',()=>{if(state.activeMovie!==null)toggleFavorite(state.activeMovie)});
 $('closeDetails').addEventListener('click',()=>$('detailDialog').close());
 $('closeInfo').addEventListener('click',()=>$('infoDialog').close());
 $('settingsBtn').addEventListener('click',()=>{closeMobileNav();openInfo('settings')});
 $('connectTmdb').addEventListener('click',()=>openInfo('settings'));
 $('supportBtn').addEventListener('click',()=>{closeMobileNav();openInfo('support')});
 $('notificationBtn').addEventListener('click',()=>openInfo('support'));
 $('creditsBtn').addEventListener('click',()=>openInfo('credits'));
 $('profileBtn').addEventListener('click',()=>switchView('favorites'));
 $('filterBtn').addEventListener('click',()=>{togglePopover($('filters'),$('filterBtn'));togglePopover($('typeMenu'),$('typeBtn'),false)});
 $('closeFilters').addEventListener('click',()=>togglePopover($('filters'),$('filterBtn'),false));
 $('typeBtn').addEventListener('click',()=>{togglePopover($('typeMenu'),$('typeBtn'));togglePopover($('filters'),$('filterBtn'),false)});
 $('typeMenu').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{togglePopover($('typeMenu'),$('typeBtn'),false);switchView(b.dataset.mode==='favorites'?'favorites':'home')}));
 $('mobileMenu').addEventListener('click',()=>{
  const open=!$('sidebar').classList.contains('is-open');
  $('sidebar').classList.toggle('is-open',open);
  $('overlay').hidden=!open;
  $('mobileMenu').setAttribute('aria-expanded',String(open));
  $('mobileMenu').setAttribute('aria-label',open?'Close navigation':'Open navigation');
  document.body.style.overflow=open?'hidden':'';
 });
 $('overlay').addEventListener('click',closeMobileNav);
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeMobileNav();togglePopover($('filters'),$('filterBtn'),false);togglePopover($('typeMenu'),$('typeBtn'),false)}
  if(e.target.closest('.featured-section')&&e.key==='ArrowRight'){e.preventDefault();showSlide(state.slide+1)}
  if(e.target.closest('.featured-section')&&e.key==='ArrowLeft'){e.preventDefault();showSlide(state.slide-1)}
 });
 document.addEventListener('click',e=>{
  if(!e.target.closest('.search-group')&&!$('filters').hidden)togglePopover($('filters'),$('filterBtn'),false);
  if(!e.target.closest('.type-dropdown-wrap')&&!$('typeMenu').hidden)togglePopover($('typeMenu'),$('typeBtn'),false);
 });
}
initialize();
})();