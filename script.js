// ================================
// script.js
// Optimized for performance, security, and maintainability
// ================================

document.addEventListener("DOMContentLoaded", () => {

    // ----- Elements & State -----
    const nav = document.querySelector("nav");
    const welcomeText = document.getElementById('welcome-text');

    const translations = [
        "Welcome", "欢迎", "स्वागत है", "Bienvenido/a", "Bienvenue", 
        "أهلاً وسهلاً", "স্বাগতম", "Добро пожаловать", "Bem-vindo/a", "خوش آمدید"
    ];

    let lastScrollTop = 0;
    let isNavVisible = true;
    let currentIndex = 0;

    const bottomThreshold = 50;     // Trigger special behavior near bottom
    const scrollThreshold = 100;    // Hide nav after scrolling down this far
    const showNavThreshold = 150;   // Scroll up distance to show nav again

    // ----- Functions -----

    // Change the welcome text
    const changeWelcomeText = () => {
        if (!welcomeText) return;
        welcomeText.textContent = translations[currentIndex];
        currentIndex = (currentIndex + 1) % translations.length;
    };

    // Handle nav visibility and scroll behavior
    const handleScroll = () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = window.innerHeight || document.documentElement.clientHeight;
        const nearBottom = (scrollHeight - (scrollTop + clientHeight)) < bottomThreshold;

        // Scroll down
        if (scrollTop > lastScrollTop && scrollTop > scrollThreshold && !nearBottom) {
            if (isNavVisible) {
                nav.classList.add('hidden');
                isNavVisible = false;
            }
        }
        // Scroll up
        else if (scrollTop < lastScrollTop && (lastScrollTop - scrollTop) > showNavThreshold) {
            if (!isNavVisible) {
                nav.classList.remove('hidden');
                isNavVisible = true;
            }
        }
        // Edge case: near top
        else if (scrollTop <= scrollThreshold) {
            nav.classList.remove('hidden');
            isNavVisible = true;
        }

        // Add/remove 'scrolled' class for styling
        if (scrollTop > 50) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');

        lastScrollTop = Math.max(scrollTop, 0);
    };

    // Smooth scroll to anchors and show nav
    const handleAnchorClick = (link) => {
        const targetId = link.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop,
                behavior: "smooth"
            });
        }

        // Remove focus to prevent stuck highlight on iOS
        setTimeout(() => {
            link.blur();
            link.classList.remove('active');
        }, 300);

        // Ensure nav is visible after clicking
        nav.classList.remove('hidden');
        isNavVisible = true;
        lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    };

    // ----- Event Listeners -----

    // Scroll events (optimized with requestAnimationFrame)
    window.addEventListener("scroll", () => {
        window.requestAnimationFrame(handleScroll);
    });

    // Touch events on mobile (passive improves scroll performance)
    window.addEventListener('touchstart', handleScroll, { passive: true });

    // Resize (e.g., iOS address bar)
    window.addEventListener("resize", () => {
        lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    });

    // Anchor links smooth scroll
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            handleAnchorClick(link);
        });
    });

    // ----- Intervals -----
    // Change welcome text every 3 seconds, stored in variable for future control
    const welcomeInterval = setInterval(changeWelcomeText, 3000);
    // To stop later: clearInterval(welcomeInterval);

});
