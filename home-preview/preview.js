/* Standalone, progressive enhancement for the homepage design preview. */
(()=>{
  'use strict';
  const navToggle=document.querySelector('.nav-toggle');
  const navPanel=document.querySelector('.nav-panel');
  if(navToggle&&navPanel){
    const close=()=>{navPanel.classList.remove('is-open');navToggle.setAttribute('aria-expanded','false');navToggle.setAttribute('aria-label','Open navigation')};
    navToggle.addEventListener('click',()=>{
      const open=navToggle.getAttribute('aria-expanded')!=='true';
      navPanel.classList.toggle('is-open',open);
      navToggle.setAttribute('aria-expanded',String(open));
      navToggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');
    });
    navPanel.querySelectorAll('a').forEach(link=>link.addEventListener('click',close));
    document.addEventListener('keydown',event=>{if(event.key==='Escape')close()});
    document.addEventListener('click',event=>{if(!navPanel.contains(event.target)&&!navToggle.contains(event.target))close()});
    const breakpoint=window.matchMedia('(min-width:721px)');
    const change=()=>{if(breakpoint.matches)close()};
    if(breakpoint.addEventListener)breakpoint.addEventListener('change',change);
    else if(breakpoint.addListener)breakpoint.addListener(change);
  }
  const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
  const progress=document.querySelector('.read-progress');
  if(progress){
    let requested=false;
    const update=()=>{
      const total=Math.max(1,document.documentElement.scrollHeight-innerHeight);
      progress.style.transform='scaleX('+Math.max(0,Math.min(1,scrollY/total)).toFixed(4)+')';
      requested=false;
    };
    const queue=()=>{if(!requested){requested=true;requestAnimationFrame(update)}};
    addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue,{passive:true});update();
  }
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reveals=[...document.querySelectorAll('[data-reveal]')];
  if(!reduced&&'IntersectionObserver' in window){
    const observer=new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}});
    },{threshold:.08,rootMargin:'0px 0px -30px 0px'});
    reveals.forEach(el=>observer.observe(el));
    document.documentElement.classList.add('with-js');
  }
  const hero=document.querySelector('.hero');
  if(hero&&!reduced&&window.matchMedia('(hover:hover) and (pointer:fine)').matches){
    let frame=0,px=0,py=0;
    hero.addEventListener('pointermove',event=>{
      const rect=hero.getBoundingClientRect();
      px=((event.clientX-rect.left)/rect.width-.5)*17;
      py=((event.clientY-rect.top)/rect.height-.5)*12;
      if(!frame)frame=requestAnimationFrame(()=>{
        hero.style.setProperty('--pointer-x',px.toFixed(2)+'px');
        hero.style.setProperty('--pointer-y',py.toFixed(2)+'px');frame=0;
      });
    },{passive:true});
    hero.addEventListener('pointerleave',()=>{hero.style.setProperty('--pointer-x','0px');hero.style.setProperty('--pointer-y','0px')});
  }
})();
