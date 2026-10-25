(()=>{
'use strict';
// Curated seed content, not a live TMDB feed. No API tokens are shipped to public GitHub Pages.
const CDN='https://image.tmdb.org/t/p/';
const movie=(id,title,year,rating,minutes,genres,poster,backdrop,overview,certificate='PG-13')=>
  ({id,title,year,rating,minutes,genres,poster,backdrop:backdrop||poster,overview,certificate});
const MOVIES=[
 movie(1087192,'How to Train Your Dragon',2025,7.8,125,['Action','Adventure','Fantasy','Family'],'q5pXRYTycaeW6dEgsCrd4mYPmxM.jpg',null,'On the rugged island of Berk, a young Viking befriends a Night Fury dragon and begins to change how his world sees these mysterious creatures.','PG'),
 movie(823219,'Flow',2024,7.9,85,['Animation','Adventure','Fantasy'],'zeinX0xt78GgtpCQjx7d2S6Gh7g.jpg',null,'A solitary cat finds shelter on a boat after a great flood and learns to survive with an unlikely animal crew.','PG'),
 movie(762509,'Mufasa: The Lion King',2024,7.3,118,['Adventure','Drama','Family'],'lurEK87kukWNaHd0zYnsi3yzJrs.jpg','1w8kutrRucTd3wlYyu5Q1UDMiG1.jpg','A young, orphaned lion named Mufasa finds friendship and his destiny on an epic journey across the Pride Lands.','PG'),
 movie(693134,'Dune: Part Two',2024,8.5,166,['Action','Adventure','Drama','Sci-Fi'],'1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg','vjuvZ4n1MFJk9I86b0EaG99kK8H.jpg','Paul Atreides joins the Fremen, faces an impossible choice and confronts the fate of Arrakis.'),
 movie(1241982,'Moana 2',2024,7.1,100,['Animation','Adventure','Family'],'aLVkiINlIeCkcZIzb7XHzPYg06L.jpg','zo8CIjJ2nfN0evqNajwMR06Hwka.jpg','Moana answers an unexpected call from her ancestors and sets off across the far seas of Oceania.','PG'),
 movie(533535,'Deadpool & Wolverine',2024,7.6,128,['Action','Comedy','Sci-Fi'],'8cdWjvZQUExUUTzyp4t6EDMubfO.jpg','dvBCdCohwWbsP5qAaglOXagDMtk.jpg','A wisecracking antihero reluctantly teams up with a gruff mutant for a chaotic adventure across realities.','R'),
 movie(157336,'Interstellar',2014,8.7,169,['Adventure','Drama','Sci-Fi'],'gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',null,'A team of explorers travels beyond the known galaxy to search for humanity’s next home.'),
 movie(27205,'Inception',2010,8.4,148,['Action','Sci-Fi','Crime'],'xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg',null,'A skilled thief enters dreams to steal secrets and faces an impossible task: planting an idea instead.'),
 movie(299534,'Avengers: Endgame',2019,8.3,181,['Action','Adventure','Sci-Fi'],'ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg',null,'The remaining heroes gather for one final chance to undo an unimaginable loss.'),
 movie(122,'The Lord of the Rings: The Return of the King',2003,8.5,201,['Action','Adventure','Fantasy'],'rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg',null,'The fate of Middle-earth rests on a perilous journey to destroy a powerful ring.'),
 movie(550,'Fight Club',1999,8.4,139,['Drama','Crime'],'jSziioSwPVrOy9Yow3XhWIBDjq1.jpg',null,'An office worker encounters a charismatic outsider and becomes drawn into a secret society.','R'),
 movie(1020414,"Peter Pan's Neverland Nightmare",2025,5.1,89,['Horror','Fantasy'],'mOR1Ks0EcXocwMV4EPv4letz0F5.jpg','nhxOttmAS2w8e6hyIcKoNvgHoix.jpg','A dark reimagining of a familiar Neverland story.','R')
];
const GENRES=['Trending','Adventure','Action','Comedy','Crime','Drama','Fantasy','Horror','Sci-Fi','Animation','Family'];
const FEATURE_IDS=[1087192,693134,762509,1241982];
const byId=new Map(MOVIES.map(m=>[m.id,m]));
const $=id=>document.getElementById(id);
const state={view:'home',genre:'Trending',query:'',year:'all',rating:0,sort:'featured',slide:0,activeMovie:null};
const pic=(file,size='w500')=>CDN+size+'/'+encodeURIComponent(file||'');
const storageRead=(key,def)=>{try{const value=JSON.parse(localStorage.getItem(key));return Array.isArray(value)?value:def}catch{return def}};
const readIds=(key,def)=>storageRead(key,def).filter(id=>Number.isInteger(id)&&byId.has(id)).slice(0,20);
const storageWrite=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{/* Storage may be unavailable in private browsing. */}};
const FAV_KEY='serivia.watchlist.v1',RECENT_KEY='serivia.recent.v1';
let favorites=new Set(readIds(FAV_KEY,[]));
let recent=readIds(RECENT_KEY,[693134,762509,1087192]);
const node=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
const svg=(name)=>{const s=document.createElementNS('http://www.w3.org/2000/svg','svg'),u=document.createElementNS('http://www.w3.org/2000/svg','use');u.setAttribute('href','#ic-'+name);s.appendChild(u);s.setAttribute('aria-hidden','true');return s};
const image=(movie,size='w500')=>{
 const n=node('img');n.src=pic(movie.poster,size);n.alt=movie.title+' official poster';n.loading='lazy';n.decoding='async';
 n.addEventListener('error',()=>{n.hidden=true;n.parentElement?.classList.add('image-failed')},{once:true});
 return n;
};
const fmtTime=minutes=>Math.floor(minutes/60)+'h '+String(minutes%60).padStart(2,'0')+'min';
const titleFor=view=>({home:'Discover movies',favorites:'Your watchlist',soon:'Coming soon',trending:'Trending picks'})[view];
const togglePopover=(el,btn,force)=>{
 const opening=typeof force==='boolean'?force:el.hidden;el.hidden=!opening;btn.setAttribute('aria-expanded',String(opening));
};
function filters(){
 let out=MOVIES.filter(m=>{
  if(state.view==='favorites'&&!favorites.has(m.id))return false;
  if(state.view==='soon')return false; // This seed catalog has no unreleased films.
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
 if(state.view==='trending')out.sort((a,b)=>b.rating-a.rating);
 else if(state.sort==='rating')out.sort((a,b)=>b.rating-a.rating);
 else if(state.sort==='year')out.sort((a,b)=>b.year-a.year);
 else if(state.sort==='az')out.sort((a,b)=>a.title.localeCompare(b.title));
 return out;
}
function drawMovieCard(movie){
 const card=node('button','movie-card');card.type='button';card.setAttribute('aria-label','View details for '+movie.title);
 const poster=node('span','poster-wrap');poster.appendChild(image(movie,'w342'));const cue=node('span','card-hover-icon');cue.appendChild(svg('chevron'));poster.appendChild(cue);
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
 const results=filters();const container=$('movieStrip');container.replaceChildren();
 for(const movie of results)container.appendChild(drawMovieCard(movie));
 $('resultsCount').textContent=results.length+' movie'+(results.length===1?'':'s');
 $('emptyState').hidden=results.length!==0;
 if(state.view==='soon'){
  $('emptyState').querySelector('h2').textContent='Coming soon';
  $('emptyState').querySelector('p').textContent='This hand-picked demo catalog only includes released films. An upcoming-release feed can be connected later.';
 }else if(state.view==='favorites'&&!results.length){
  $('emptyState').querySelector('h2').textContent='Your list is empty';
  $('emptyState').querySelector('p').textContent='Tap the heart on a featured movie to save it here.';
 }else{
  $('emptyState').querySelector('h2').textContent='No movies found';
  $('emptyState').querySelector('p').textContent='Try another title or clear your filters.';
 }
}
function renderRecent(){
 const list=$('recentList');list.replaceChildren();
 for(const id of recent.slice(0,4)){
  const movie=byId.get(id);if(!movie)continue;
  const b=node('button','mini-movie');b.type='button';b.setAttribute('aria-label','Explore '+movie.title);
  const cover=image(movie,'w342');cover.alt='';b.appendChild(cover);
  const t=node('span','mini-title',movie.title),bottom=node('span','mini-bottom');
  const play=node('span','mini-play');play.appendChild(svg('play'));
  bottom.append(play,node('span','mini-year',String(movie.year)));
  b.append(t,bottom);b.addEventListener('click',()=>{closeMobileNav();openMovie(id)});
  list.appendChild(b);
 }
}
function toggleFavorite(id){
 if(favorites.has(id))favorites.delete(id);else favorites.add(id);
 storageWrite(FAV_KEY,[...favorites]);
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
 const art=$('featureArt');art.hidden=false;art.alt='Artwork for '+movie.title;art.src=pic(movie.backdrop,'w780');
 const tags=$('featureTags');tags.replaceChildren();
 for(const tag of [fmtTime(movie.minutes),movie.genres[0],'Movie',String(movie.year),movie.certificate])tags.appendChild(node('span','',tag));
 const video='https://www.themoviedb.org/movie/'+movie.id+'/videos';
 $('featureTrailer').href=video;$('featureTrailer').setAttribute('aria-label','Find trailers for '+movie.title);
 $('favoriteFeature').setAttribute('aria-pressed',String(favorites.has(movie.id)));
 $('favoriteFeature').setAttribute('aria-label',favorites.has(movie.id)?'Remove from watchlist':'Add '+movie.title+' to watchlist');
 $('featureArt').onerror=()=>{$('featureArt').hidden=true};
 $('slideDots').querySelectorAll('button').forEach((b,i)=>{b.classList.toggle('is-current',i===state.slide);b.setAttribute('aria-pressed',String(i===state.slide))});
 const peek1=byId.get(FEATURE_IDS[(state.slide+1)%FEATURE_IDS.length]);
 const peek2=byId.get(FEATURE_IDS[(state.slide+2)%FEATURE_IDS.length]);
 $('peekFront').style.backgroundImage='url("'+pic(peek1.poster,'w342')+'")';
 $('peekBack').style.backgroundImage='url("'+pic(peek2.poster,'w342')+'")';
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
 recent=[id,...recent.filter(x=>x!==id)].slice(0,4);storageWrite(RECENT_KEY,recent);renderRecent();
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
 const art=$('detailPoster');art.hidden=false;art.src=pic(movie.backdrop,'w780');art.alt='Art for '+movie.title;art.onerror=()=>{art.hidden=true};
 $('detailTitle').textContent=movie.title;
 $('detailMeta').textContent=movie.year+'  ·  '+fmtTime(movie.minutes)+'  ·  '+movie.certificate+'  ·  ★ '+movie.rating.toFixed(1);
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
  p('This is a curated demonstration catalog, not a live trending feed. Movie posters, artwork and movie information reference TMDB. Ratings are sample snapshot values, not live or Rotten Tomatoes scores.');
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
  $('infoTitle').textContent='Your preferences';
  p('Saved movies and recently explored titles stay in this browser. Nothing is sent to our server.');
  const button=node('button','primary-action','Clear saved movies');
  button.addEventListener('click',()=>{favorites.clear();storageWrite(FAV_KEY,[]);renderMovies();feature();button.textContent='Watchlist cleared'});
  body.appendChild(button);
 }else{
  $('infoTitle').textContent='Welcome to Serivia';
  p('Browse the curated catalog, search by title, narrow by genre, explore movie details and save films for later.');
  p('This portfolio concept is not a video streaming service and does not include a real-time movie API. Trailer buttons lead to movie video pages on TMDB.');
  p('Your watchlist is stored locally on this device. Search and genre filters work across the included titles.');
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
 closeMobileNav();renderMovies();
 $('main').focus({preventScroll:true});
}
function initialize(){
 drawDots();feature();renderRecent();
 // Buttons, exposed movie covers, horizontal trackpads, touch swipes and mouse dragging.
 $('featuredPrevious').addEventListener('click',()=>showSlide(state.slide-1));
 $('featuredNext').addEventListener('click',()=>showSlide(state.slide+1));
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
  b.addEventListener('click',()=>{state.genre=genre;renderMovies();b.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'})});
  $('genreScroll').appendChild(b);
 }
 renderMovies();
 document.querySelectorAll('.side-link[data-view]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
 $('searchInput').addEventListener('input',e=>{state.query=e.target.value.trim();renderMovies()});
 $('yearFilter').addEventListener('change',e=>{state.year=e.target.value;renderMovies()});
 $('ratingFilter').addEventListener('change',e=>{state.rating=Number(e.target.value);renderMovies()});
 $('sortFilter').addEventListener('change',e=>{state.sort=e.target.value;renderMovies()});
 const reset=()=>{state.genre='Trending';state.query='';state.year='all';state.rating=0;state.sort='featured';$('searchInput').value='';$('yearFilter').value='all';$('ratingFilter').value='0';$('sortFilter').value='featured';switchView('home');togglePopover($('filters'),$('filterBtn'),false)};
 $('resetFilters').addEventListener('click',reset);
 $('emptyReset').addEventListener('click',reset);
 $('genrePrevious').addEventListener('click',()=>$('genreScroll').scrollBy({left:-220,behavior:'smooth'}));
 $('genreNext').addEventListener('click',()=>$('genreScroll').scrollBy({left:220,behavior:'smooth'}));
 $('favoriteFeature').addEventListener('click',()=>toggleFavorite(getFeature().id));

 $('detailFavorite').addEventListener('click',()=>{if(state.activeMovie!==null)toggleFavorite(state.activeMovie)});
 $('closeDetails').addEventListener('click',()=>$('detailDialog').close());
 $('closeInfo').addEventListener('click',()=>$('infoDialog').close());
 $('settingsBtn').addEventListener('click',()=>{closeMobileNav();openInfo('settings')});
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