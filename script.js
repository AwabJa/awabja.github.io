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

    // Smooth scroll to section on nav click for internal links only
    const handleNavClick = () => {
        const navLinks = document.querySelectorAll("nav a");
        navLinks.forEach(link => {
            const href = link.getAttribute("href");
            if (href && href.startsWith("#")) {  // Only handle internal links (those with href starting with '#')
                link.addEventListener("click", (event) => {
                    event.preventDefault();
                    const targetId = href.substring(1);
                    const targetElement = document.getElementById(targetId);

                    if (targetElement) {
                        // Use scrollIntoView for better iOS support
                        targetElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                        });
                    }
                });
            }
        });
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

                // Nav visibility control
                if (scrollTop > lastScrollTop && !isAtBottom && !isAtTop) {
                    nav.style.transform = "translateY(-100%)";
                } else if (scrollTop < lastScrollTop && !isAtBottom && !isAtTop) {
                    nav.style.transform = "translateY(0)";
                }

                lastScrollTop = Math.max(scrollTop, 0);

                // Reset highlighting
                handleSectionHighlight();
            }
            isTicking = false;
        };

        return () => {
            if (!isTicking) {
                window.requestAnimationFrame(scrollHandler);
                isTicking = true;
            }
        };
    })();

    // Function to handle section highlighting
    const handleSectionHighlight = () => {
        const sections = document.querySelectorAll('section');
        const navLinks = document.querySelectorAll("nav a");

        let currentSection = null;
        let firstSectionTop = sections[0].offsetTop;

        // Find the current section
        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            if (rect.top <= 60 && rect.bottom > 60) {
                currentSection = section;
            }
        });

        // Update the nav links highlighting
        navLinks.forEach(link => {
            link.classList.remove('active'); // Remove active class from all links
            const sectionId = link.getAttribute('href').substring(1);

            // Check if the current section matches the link
            if (currentSection && sectionId === currentSection.id) {
                link.classList.add('active');
            }
        });

        // Special case: If we're at the very top of the page, highlight "Home"
        const homeLink = document.querySelector('nav a[href="#home"]');
        if (window.scrollY < firstSectionTop - 50) {
            homeLink.classList.add('active');
        } else {
            homeLink.classList.remove('active');
        }
    };

    // Change the welcome text every 3 seconds
    setInterval(changeWelcomeText, 3000);

    window.addEventListener("scroll", handleScroll);

    handleNavClick();
});
