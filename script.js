document.addEventListener("DOMContentLoaded", () => {
    const nav = document.querySelector("nav");
    const translations = [
        "Welcome", "欢迎", "स्वागत है", "Bienvenido/a", "Bienvenue", 
        "أهلاً وسهلاً", "স্বাগতম", "Добро пожаловать", "Bem-vindo/a", "خوش آمدید"
    ];

    let lastScrollTop = 0;
    let isNavVisible = true;
    let currentIndex = 0;
    let isScrolling = false;

    // Function to change the welcome text
    const changeWelcomeText = () => {
        const welcomeText = document.getElementById('welcome-text');
        if (welcomeText) {
            welcomeText.textContent = translations[currentIndex];
            currentIndex = (currentIndex + 1) % translations.length;
        }
    };

    const handleScroll = () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Add a slight delay to prevent fast toggle flicker
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            // Scrolling down
            if (isNavVisible) {
                nav.classList.add('hidden');
                isNavVisible = false;
            }
        } else if (scrollTop < lastScrollTop || scrollTop <= 100) {
            // Scrolling up or near top
            if (!isNavVisible) {
                nav.classList.remove('hidden');
                isNavVisible = true;
            }
        }

        // Add or remove the 'scrolled' class based on scroll position
        if (scrollTop > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        lastScrollTop = Math.max(scrollTop, 0);
        isScrolling = false;
    };

    const onScroll = () => {
        if (!isScrolling) {
            window.requestAnimationFrame(handleScroll);
            isScrolling = true;
        }
    };

    // Add event listener for scroll
    window.addEventListener("scroll", onScroll);

    // Resize event listener to handle iOS address bar resizing issue
    window.addEventListener("resize", () => {
        lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    });

    // Change the welcome text every 3 seconds
    setInterval(changeWelcomeText, 3000);
});
