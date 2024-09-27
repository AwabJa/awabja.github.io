document.addEventListener("DOMContentLoaded", function() {
    const translations = [
        "Welcome", "欢迎", "स्वागत है", "Bienvenido/a", "Bienvenue", 
        "أهلاً وسهلاً", "স্বাগতম", "Добро пожаловать", "Bem-vindo/a", "خوش آمدید"
    ];

    let currentIndex = 0;

    // Function to change the welcome text
    function changeWelcomeText() {
        const welcomeText = document.getElementById('welcome-text');
        if (welcomeText) {
            welcomeText.textContent = translations[currentIndex];
            currentIndex = (currentIndex + 1) % translations.length;
        }
    }

    // Function to handle scrolling and show/hide the nav
    function handleScroll() {
        const nav = document.querySelector("nav");
        if (nav) {
            let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            let windowHeight = window.innerHeight;
            let documentHeight = document.documentElement.scrollHeight;
            
            const isAtBottom = scrollTop + windowHeight >= documentHeight - 10;
            const isAtTop = scrollTop <= 0;

            if (scrollTop > lastScrollTop && !isAtBottom && !isAtTop) {
                nav.style.transform = "translateY(-100%)"; 
            } else if (scrollTop < lastScrollTop && !isAtBottom && !isAtTop) {
                nav.style.transform = "translateY(0)";
            }

            lastScrollTop = Math.max(scrollTop, 0);
            isTicking = false;
        }
    }

    // Change the welcome text every 3 seconds
    setInterval(changeWelcomeText, 3000);

    let lastScrollTop = 0;
    let isTicking = false;

    window.addEventListener("scroll", function() {
        if (!isTicking) {
            window.requestAnimationFrame(handleScroll);
            isTicking = true;
        }
    });
});
