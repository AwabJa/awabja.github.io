/*
 * Visual details for the portfolio. Progressive enhancement only:
 * the website remains fully functional without this file.
 */
document.addEventListener('DOMContentLoaded', () => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const progress = document.querySelector('.scroll-progress');

  // Hairline scroll indicator without forcing an extra layout per frame.
  if (progress) {
    let pendingProgress = false;
    const updateProgress = () => {
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const fraction = Math.max(0, Math.min(1, window.scrollY / maxScroll));
      progress.style.setProperty('--page-progress', fraction.toFixed(4));
      pendingProgress = false;
    };
    const queueProgress = () => {
      if (pendingProgress) return;
      pendingProgress = true;
      requestAnimationFrame(updateProgress);
    };
    window.addEventListener('scroll', queueProgress, {passive: true});
    window.addEventListener('resize', queueProgress, {passive: true});
    updateProgress();
  }

  // Sections enter naturally when scrolled into view. Never hide content
  // when motion is reduced or IntersectionObserver is unavailable.
  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    const targets = [...document.querySelectorAll(
      '.section-header, .project-card, .about-grid, .contact-shell'
    )];
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }, {rootMargin: '0px 0px -6% 0px', threshold: 0.08});

    for (const element of targets) {
      element.classList.add('soft-reveal');
      if (element.getBoundingClientRect().top < window.innerHeight * .94) {
        element.classList.add('is-visible');
      } else {
        observer.observe(element);
      }
    }
    document.documentElement.classList.add('has-visual-js');
    reducedMotion.addEventListener('change', event => {
      if (!event.matches) return;
      observer.disconnect();
      targets.forEach(element => element.classList.add('is-visible'));
    });
  }

  // Interactive polish is reserved for devices that actually support
  // hovering. Touch interaction and low-motion mode remain stable.
  if (!finePointer.matches || reducedMotion.matches) return;

  const hero = document.querySelector('.hero');
  const art = document.querySelector('.hero-visual');
  if (hero && art) {
    let heroRaf = 0;
    let latestX = 0, latestY = 0;
    const moveHero = event => {
      const bounds = art.getBoundingClientRect();
      latestX = Math.max(-1, Math.min(1,
        (event.clientX - bounds.left - bounds.width / 2) / (bounds.width / 2)
      ));
      latestY = Math.max(-1, Math.min(1,
        (event.clientY - bounds.top - bounds.height / 2) / (bounds.height / 2)
      ));
      if (heroRaf) return;
      heroRaf = requestAnimationFrame(() => {
        art.style.setProperty('--hero-tilt-x', (latestX * 5).toFixed(2) + 'deg');
        art.style.setProperty('--hero-tilt-y', (-latestY * 5).toFixed(2) + 'deg');
        heroRaf = 0;
      });
    };
    hero.addEventListener('pointermove', moveHero, {passive: true});
    hero.addEventListener('pointerleave', () => {
      cancelAnimationFrame(heroRaf);
      heroRaf = 0;
      art.style.setProperty('--hero-tilt-x', '0deg');
      art.style.setProperty('--hero-tilt-y', '0deg');
    });
  }

  for (const card of document.querySelectorAll('.project-card')) {
    const preview = card.querySelector('.project-preview');
    if (!preview) continue;

    let pointerRaf = 0;
    let pointX = 0, pointY = 0;
    const updateHighlight = () => {
      const cardRect = card.getBoundingClientRect();
      const previewRect = preview.getBoundingClientRect();
      card.style.setProperty('--spot-x', Math.round(pointX - cardRect.left) + 'px');
      card.style.setProperty('--spot-y', Math.round(pointY - cardRect.top) + 'px');
      preview.style.setProperty('--preview-x', Math.round(pointX - previewRect.left) + 'px');
      preview.style.setProperty('--preview-y', Math.round(pointY - previewRect.top) + 'px');
      pointerRaf = 0;
    };
    card.addEventListener('pointermove', event => {
      pointX = event.clientX;
      pointY = event.clientY;
      if (!pointerRaf) pointerRaf = requestAnimationFrame(updateHighlight);
    }, {passive: true});
    card.addEventListener('pointerleave', () => {
      cancelAnimationFrame(pointerRaf);
      pointerRaf = 0;
      card.style.removeProperty('--spot-x');
      card.style.removeProperty('--spot-y');
      preview.style.removeProperty('--preview-x');
      preview.style.removeProperty('--preview-y');
    });
  }
});
