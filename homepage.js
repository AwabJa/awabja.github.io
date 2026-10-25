(()=>{
  'use strict';
  const toggle=document.querySelector('.menu-button');
  const panel=document.querySelector('.menu-panel');
  const close=()=>{
    if(!toggle||!panel)return;
    panel.classList.remove('is-open');panel.inert=true;
    document.body.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open menu');
  };
  if(toggle&&panel){
    toggle.addEventListener('click',()=>{
      const opening=toggle.getAttribute('aria-expanded')!=='true';
      if(!opening){close();return}
      panel.inert=false;panel.classList.add('is-open');
      document.body.classList.add('menu-open');
      toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Close menu');
      panel.querySelector('a')?.focus();
    });
    panel.querySelectorAll('a').forEach(link=>link.addEventListener('click',close));
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){close();toggle.focus()}});
    document.addEventListener('click',event=>{if(!panel.contains(event.target)&&!toggle.contains(event.target))close()});
  }
  // Touchscreens need a brief pressed state rather than sticky simulated hover.
  // Do not preventDefault or delay navigation: cards remain ordinary single-tap links.
  document.querySelectorAll('.project-image').forEach(card=>{
    const release=()=>card.classList.remove('is-touching');
    card.addEventListener('pointerdown',event=>{
      if(event.pointerType==='touch'||event.pointerType==='pen')card.classList.add('is-touching');
    });
    card.addEventListener('pointerup',release);
    card.addEventListener('pointercancel',release);
    card.addEventListener('pointerleave',release);
    card.addEventListener('touchmove',release,{passive:true});
    card.addEventListener('blur',release);
  });
  const year=document.getElementById('year');if(year)year.textContent=String(new Date().getFullYear());
  const progress=document.querySelector('.reading-line');
  if(progress){
    let requested=false;
    const update=()=>{const max=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);progress.style.transform='scaleX('+Math.max(0,Math.min(1,scrollY/max)).toFixed(4)+')';requested=false};
    const queue=()=>{if(!requested){requested=true;requestAnimationFrame(update)}};
    window.addEventListener('scroll',queue,{passive:true});window.addEventListener('resize',queue,{passive:true});update();
  }
  const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduceMotion&&'IntersectionObserver'in window){
    const elements=[...document.querySelectorAll('[data-reveal]')];
    const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}})},{rootMargin:'0px 0px -20px 0px',threshold:.06});
    elements.forEach(node=>observer.observe(node));
    document.documentElement.classList.add('reveal-ready');
  }
})();