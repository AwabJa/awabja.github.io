// Minimal, accessible navigation. No timers, text swapping, or scroll-hiding UI.
document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('.site-nav');
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('primary-menu');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function closeMenu() {
    if (!menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    nav.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
  }

  function toggleMenu() {
    const open = !menu.classList.contains('is-open');
    menu.classList.toggle('is-open', open);
    nav.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
  }

  toggle.addEventListener('click', toggleMenu);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) {
      closeMenu();
      toggle.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!nav.contains(event.target)) closeMenu();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 780) closeMenu();
  }, {passive:true});

  // Keep section links accessible and respect reduced-motion preferences.
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      closeMenu();
      target.scrollIntoView({behavior: reducedMotion.matches ? 'auto' : 'smooth', block:'start'});
      history.replaceState(null, '', '#' + id);
    });
  });

  // A subtle translucent header on scroll; it stays present for orientation.
  let scrollScheduled = false;
  const updateScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 26);
    scrollScheduled = false;
  };
  window.addEventListener('scroll', () => {
    if (scrollScheduled) return;
    scrollScheduled = true;
    requestAnimationFrame(updateScroll);
  }, {passive:true});
  updateScroll();

  // Highlight the section currently being read.
  const sectionLinks = [...document.querySelectorAll('.nav-links a[data-section]')];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const link of sectionLinks) {
          const active = link.dataset.section === entry.target.id;
          link.classList.toggle('active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        }
      }
    }, {rootMargin:'-25% 0px -55% 0px', threshold:0});
    document.querySelectorAll('#projects, #about, #contact').forEach(section => observer.observe(section));
  }

  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
});
