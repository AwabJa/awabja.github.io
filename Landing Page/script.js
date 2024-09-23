document.addEventListener("DOMContentLoaded", function() {
    // List of translations for "Welcome" in the top 10 most spoken languages
    const translations = [
        "Welcome",                // English (gender-neutral)
        "欢迎",                   // Mandarin Chinese (gender-neutral)
        "स्वागत है",              // Hindi (gender-neutral)
        "Bienvenido/a",          // Spanish (masculine/feminine)
        "Bienvenue",             // French (gender-neutral)
        "أهلاً وسهلاً",          // Arabic (gender-neutral)
        "স্বাগতম",                // Bengali (gender-neutral)
        "Добро пожаловать",      // Russian (gender-neutral)
        "Bem-vindo/a",           // Portuguese (masculine/feminine)
        "خوش آمدید"              // Urdu (gender-neutral)
    ];

    let currentIndex = 0;

    // Function to change the welcome text
    function changeWelcomeText() {
        const welcomeText = document.getElementById('welcome-text');
        welcomeText.textContent = translations[currentIndex];
        currentIndex = (currentIndex + 1) % translations.length; // Cycle through the list
    }

    // Change the welcome text every 3 seconds
    setInterval(changeWelcomeText, 3000);

    // Scroll event handler to hide and show the navigation bar
    let lastScrollTop = 0;
    window.addEventListener("scroll", function() {
        const nav = document.querySelector("nav");
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        if (scrollTop > lastScrollTop) {
            // Scrolling down, hide nav
            nav.style.transform = "translateY(-100%)"; // Slide up
        } else {
            // Scrolling up, show nav
            nav.style.transform = "translateY(0)"; // Slide back into view
        }
        lastScrollTop = scrollTop;
    });
});

