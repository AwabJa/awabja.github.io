# A.J. Ahmed — Portfolio

Personal portfolio showcasing web development, user interfaces and interactive projects.

**Website:** https://awabja.github.io/

## Featured projects

- **[Flow](https://awabja.github.io/Flow/)** — Productivity workspace for projects, tasks and weekly planning.
- **[serivia](https://awabja.github.io/serivia/)** — Cinematic movie discovery app with genre browsing, movie details and personal watchlist; optional TMDB connection.

Flow and serivia remain featured on the homepage. The card game is being developed separately before a portfolio launch.

## Site structure

| File or directory | Purpose |
| --- | --- |
| `index.html` | Published homepage |
| `homepage.css` | Black-theme layout and general styles |
| `homepage.js` | Navigation, scroll progress, and animation |
| `assets/homepage/` | Homepage artwork, including the serivia interface illustration |
| `favicon.svg` | Shared favicon |
| `Flow/`, `serivia/` | Featured portfolio projects |
| `card-game/` | In-development mobile-first collectible card battle prototype (not yet featured) |
| `tools/homepage-browser-check.mjs` | Production responsive and navigation QA |
| `tools/site-integrity.mjs` | Static site and project regression audit |

## Maintaining the site

GitHub Pages publishes the static site from `main`. The hero design shares the main stylesheet to avoid a second render-blocking CSS request. The homepage is plain HTML, CSS and JavaScript with no build framework.

The homepage browser test uses `playwright-core` and requires Chrome or Chromium. GitHub Actions runs it on relevant changes.

## Links

[GitHub](https://github.com/AwabJa) · [LinkedIn](https://www.linkedin.com/in/awabjahmed/)

*The portfolio and its featured projects will continue to evolve.*
