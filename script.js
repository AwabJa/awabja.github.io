// Accessible navigation and lightweight welcome animation
document.addEventListener("DOMContentLoaded", () => {
  const nav = document.querySelector("nav");
  const toggle = document.querySelector(".menu-toggle");
  const menu = document.getElementById("primary-menu");
  const welcome = document.getElementById("welcome-text");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const translations = ["Welcome", "欢迎", "स्वागत है", "Bienvenido/a", "Bienvenue", "أهلاً وسهلاً", "স্বাগতম", "Добро пожаловать", "Bem-vindo/a", "خوش آمدید"];
  let index = 0, lastY = window.scrollY, scheduled = false, interval;
  const closeMenu = () => {
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation menu");
  };
  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
    nav.classList.remove("hidden");
  });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && menu.classList.contains("is-open")) { closeMenu(); toggle.focus(); } });
  document.addEventListener("click", event => { if (!nav.contains(event.target)) closeMenu(); });
  window.addEventListener("resize", () => { if (window.innerWidth > 768) closeMenu(); }, { passive: true });
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", event => {
      const target = document.getElementById(link.hash.slice(1));
      if (!target) return;
      event.preventDefault();
      closeMenu();
      target.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth" });
      history.replaceState(null, "", link.hash);
      nav.classList.remove("hidden");
    });
  });
  const updateScroll = () => {
    const y = Math.max(window.scrollY, 0);
    const nearBottom = document.documentElement.scrollHeight - (y + window.innerHeight) < 50;
    nav.classList.toggle("scrolled", y > 50);
    if (y < 100 || y < lastY || nearBottom || nav.contains(document.activeElement) || menu.classList.contains("is-open")) nav.classList.remove("hidden");
    else if (y > lastY + 3) nav.classList.add("hidden");
    lastY = y;
    scheduled = false;
  };
  window.addEventListener("scroll", () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateScroll); } }, { passive: true });
  updateScroll();
  const stopWelcome = () => { clearInterval(interval); interval = undefined; };
  const syncWelcome = () => {
    if (reducedMotion.matches || document.hidden) { stopWelcome(); welcome.textContent = "Welcome"; index = 0; }
    else if (!interval) interval = setInterval(() => { index = (index + 1) % translations.length; welcome.textContent = translations[index]; }, 3000);
  };
  document.addEventListener("visibilitychange", syncWelcome);
  reducedMotion.addEventListener("change", syncWelcome);
  syncWelcome();
});
