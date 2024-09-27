document.addEventListener("DOMContentLoaded", () => {
    const translations = [
        "Welcome", "欢迎", "स्वागत है", "Bienvenido/a", "Bienvenue", 
        "أهلاً وسهلاً", "স্বাগতম", "Добро пожаловать", "Bem-vindo/a", "خوش آمدید"
    ];

    let currentIndex = 0;

    // Function to change the welcome text
    const changeWelcomeText = () => {
        const welcomeText = document.getElementById('welcome-text');
        if (welcomeText) {
            welcomeText.textContent = translations[currentIndex];
            currentIndex = (currentIndex + 1) % translations.length;
        }
    };

    // Function to handle scrolling and show/hide the nav
    const handleScroll = (() => {
        let lastScrollTop = 0;
        let isTicking = false;

        const scrollHandler = () => {
            const nav = document.querySelector("nav");
            if (nav) {
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const windowHeight = window.innerHeight;
                const documentHeight = document.documentElement.scrollHeight;

                const isAtBottom = scrollTop + windowHeight >= documentHeight - 10;
                const isAtTop = scrollTop <= 0;

                if (scrollTop > lastScrollTop && !isAtBottom && !isAtTop) {
                    nav.style.transform = "translateY(-100%)";
                } else if (scrollTop < lastScrollTop && !isAtBottom && !isAtTop) {
                    nav.style.transform = "translateY(0)";
                }

                lastScrollTop = Math.max(scrollTop, 0);
            }
            isTicking = false; // Properly reset isTicking after scroll handling
        };

        return () => {
            if (!isTicking) {
                window.requestAnimationFrame(scrollHandler);
                isTicking = true; // Set isTicking inside the event
            }
        };
    })();

    // Change the welcome text every 3 seconds
    setInterval(changeWelcomeText, 3000);

    window.addEventListener("scroll", handleScroll);
});
