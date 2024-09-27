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
    let isTicking = false;

    window.addEventListener("scroll", function() {
        const nav = document.querySelector("nav");
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        let windowHeight = window.innerHeight;
        let documentHeight = document.documentElement.scrollHeight;

        // Check if we're at the bottom or top of the page
        const isAtBottom = scrollTop + windowHeight >= documentHeight - 10; // Buffer to avoid bounce
        const isAtTop = scrollTop <= 0;

        if (!isTicking) {
            window.requestAnimationFrame(() => {
                // Hide nav when scrolling down, except at the bottom or top
                if (scrollTop > lastScrollTop && !isAtBottom && !isAtTop) {
                    nav.style.transform = "translateY(-100%)"; // Slide up
                } 
                // Show nav when scrolling up, except at the bottom or top
                else if (scrollTop < lastScrollTop && !isAtBottom && !isAtTop) {
                    nav.style.transform = "translateY(0)"; // Slide back into view
                }

                // Update lastScrollTop and prevent negative values
                lastScrollTop = Math.max(scrollTop, 0);
                isTicking = false;
            });
            isTicking = true;
        }
    });
});
