/* Accessible fixed-rail navigation and nonessential editorial motion. */
(()=>{'use strict';
const toggle=document.querySelector('.rail-toggle'),panel=document.querySelector('.rail-menu'),shade=document.querySelector('.rail-shade');
const close=()=>{panel.classList.remove('is-open');shade.classList.remove('is-open');panel.inert=true;toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open navigation menu')};
toggle.addEventListener('click',()=>{if(toggle.getAttribute('aria-expanded')==='true'){close();return}panel.inert=false;panel.classList.add('is-open');shade.classList.add('is-open');toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Close navigation menu');panel.querySelector('a')?.focus()});
shade.addEventListener('click',close);panel.querySelectorAll('a').forEach(el=>el.addEventListener('click',close));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){close();toggle.focus()}});
const y=String(new Date().getFullYear());document.querySelectorAll('#year,#rail-year').forEach(el=>el.textContent=y);
const progress=document.querySelector('.read-progress');let requested=false;
const render=()=>{const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);progress.style.transform='scaleX('+Math.max(0,Math.min(1,scrollY/max)).toFixed(4)+')';requested=false};
const queue=()=>{if(!requested){requested=true;requestAnimationFrame(render)}};
addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue,{passive:true});render();
if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&'IntersectionObserver'in window){
const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');observer.unobserve(e.target)}})},{rootMargin:'0px 0px -20px 0px',threshold:.05});
document.querySelectorAll('[data-reveal]').forEach(el=>observer.observe(el));document.documentElement.classList.add('enhanced')
}
})();