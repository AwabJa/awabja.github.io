document.addEventListener("DOMContentLoaded", () => {
    const nav = document.querySelector("nav");
    let lastScrollTop = 0;
    let isNavVisible = true; // Track if the navbar is currently visible

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

        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; // Avoid negative scroll values
    };

    // Debounce the scroll event
    const debounceScroll = () => {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(handleScroll, 50); // Delay the scroll event handling for better performance
    };

    // Add event listener for the scroll event
    window.addEventListener("scroll", debounceScroll);
});
