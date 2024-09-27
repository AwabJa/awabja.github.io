document.addEventListener("DOMContentLoaded", () => {
    const nav = document.querySelector("nav");
    const translations = [
        "Welcome", "欢迎", "स्वागत है", "Bienvenido/a", "Bienvenue", 
        "أهلاً وسهلاً", "স্বাগতম", "Добро пожаловать", "Bem-vindo/a", "خوش آمدید"
    ];

    let lastScrollTop = 0;
    let isNavVisible = true;
    let currentIndex = 0;
    const bottomThreshold = 50; // Distance from the bottom to trigger special behavior
    const scrollThreshold = 100; // Distance to hide the navbar while scrolling down
    const showNavThreshold = 150; // New: Additional threshold for scroll up before showing navbar again

    // Function to change the welcome text
    const changeWelcomeText = () => {
        const welcomeText = document.getElementById('welcome-text');
        if (welcomeText) {
            welcomeText.textContent = translations[currentIndex];
            currentIndex = (currentIndex + 1) % translations.length;
        }
    };

    // Function to handle the scroll behavior
    const handleScroll = () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = window.innerHeight || document.documentElement.clientHeight;
        const nearBottom = (scrollHeight - (scrollTop + clientHeight)) < bottomThreshold;

        // Scrolling down and not near the bottom
        if (scrollTop > lastScrollTop && scrollTop > scrollThreshold && !nearBottom) {
            if (isNavVisible) {
                nav.classList.add('hidden');
                isNavVisible = false;
            }
        }
        // Scrolling up, but ensure we scroll up by more than the showNavThreshold before showing nav
        else if (scrollTop < lastScrollTop && lastScrollTop - scrollTop > showNavThreshold) {
            if (!isNavVisible) {
                nav.classList.remove('hidden');
                isNavVisible = true;
            }
        }
        // Show nav if near the top (for edge cases)
        else if (scrollTop <= scrollThreshold) {
            nav.classList.remove('hidden');
            isNavVisible = true;
        }

        // Add or remove 'scrolled' class based on position
        if (scrollTop > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        lastScrollTop = Math.max(scrollTop, 0); // Update last scroll position
    };

    // Event listener for scroll
    window.addEventListener("scroll", () => {
        window.requestAnimationFrame(handleScroll);
    });

    // Resize listener to handle iOS address bar behavior
    window.addEventListener("resize", () => {
        lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    });

    // Function to ensure nav is visible after navigating via anchor links
    const handleAnchorNavigation = () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        nav.classList.remove('hidden');
        isNavVisible = true;
        lastScrollTop = scrollTop; // Update lastScrollTop to prevent incorrect hiding
    };

    // Ensure nav is visible after clicking anchor links (e.g., "about" or "contact")
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop,
                    behavior: "smooth" // Smooth scroll behavior
                });
            }
            link.blur();  // Remove focus from the clicked link to avoid stuck highlight
            handleAnchorNavigation();
        });
    });

    // Change welcome text every 3 seconds
    setInterval(changeWelcomeText, 3000);
});
