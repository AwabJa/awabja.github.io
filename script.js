document.addEventListener("DOMContentLoaded", () => {
    const nav = document.querySelector("nav");
    const translations = [
        "Welcome", "欢迎", "स्वागत है", "Bienvenido/a", "Bienvenue", 
        "أهلاً وسهلاً", "স্বাগতম", "Добро пожаловать", "Bem-vindo/a", "خوش آمدید"
    ];

    let lastScrollTop = 0;
    let isNavVisible = true;
    let currentIndex = 0;

    // Function to change the welcome text
    const changeWelcomeText = () => {
        const welcomeText = document.getElementById('welcome-text');
        if (welcomeText) {
            welcomeText.textContent = translations[currentIndex];
            currentIndex = (currentIndex + 1) % translations.length;
        }
    };

    let isScrolling = false;

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

        lastScrollTop = Math.max(scrollTop, 0);
        isScrolling = false;
    };

    // Throttling the scroll event using requestAnimationFrame for smoother performance
    const onScroll = () => {
        if (!isScrolling) {
            window.requestAnimationFrame(handleScroll);
            isScrolling = true;
        }
    };

    // Add event listener for the scroll event
    window.addEventListener("scroll", onScroll);

    // Resize event listener for iOS address bar handling
    window.addEventListener("resize", () => {
        lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    });

    // Change the welcome text every 3 seconds
    setInterval(changeWelcomeText, 3000);
});
