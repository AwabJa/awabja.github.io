document.addEventListener("DOMContentLoaded", () => {
    const nav = document.querySelector("nav");
    const translations = [
        "Welcome", "欢迎", "स्वागत है", "Bienvenido/a", "Bienvenue", 
        "أهلاً وسهلاً", "স্বাগতম", "Добро пожаловать", "Bem-vindo/a", "خوش آمدید"
    ];

    let lastScrollTop = 0;
    let isNavVisible = true; // Track if the navbar is currently visible
    let currentIndex = 0; // For cycling through translations

    // Function to change the welcome text
    const changeWelcomeText = () => {
        const welcomeText = document.getElementById('welcome-text');
        if (welcomeText) {
            welcomeText.textContent = translations[currentIndex];
            currentIndex = (currentIndex + 1) % translations.length;
        }
    };

    // Throttle scroll handling for better performance
    let scrollTimeout;
    
    const handleScroll = () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Determine if we're scrolling down or up
        if (scrollTop > lastScrollTop) {
            // Scrolling down
            if (isNavVisible) {
                nav.classList.add('hidden');
                isNavVisible = false;
            }
        } else {
            // Scrolling up
            if (!isNavVisible) {
                nav.classList.remove('hidden');
                isNavVisible = true;
            }
        }

        // Add background color when scrolled down past 50px
        if (scrollTop > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        lastScrollTop = Math.max(scrollTop, 0); // Avoid negative scroll values
    };

    // Debounce the scroll event
    const debounceScroll = () => {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(handleScroll, 50); // Delay the scroll event handling for better performance
    };

    // Add event listener for the scroll event
    window.addEventListener("scroll", debounceScroll);

    // Resize event listener for iOS address bar handling
    window.addEventListener("resize", () => {
        lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    });

    // Change the welcome text every 3 seconds
    setInterval(changeWelcomeText, 3000);
});
