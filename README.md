# A.J. Ahmed — Portfolio

Personal portfolio showcasing web development, user interfaces and interactive projects.

**Website:** https://awabja.github.io/

## Featured projects

- **[Flow](https://awabja.github.io/Flow/)** — Productivity workspace for projects, tasks and weekly planning.
- **[serivia](https://awabja.github.io/serivia/)** — Cinematic movie discovery app with genre browsing, movie details and personal watchlist; optional TMDB connection.
- **[Enzo](https://awabja.github.io/Enzo/)** — Browser-based first-person game prototype.

Each project has its own directory. The homepage links to the existing project URLs.

## Site structure

| File or directory | Purpose |
| --- | --- |
| `index.html` | Published homepage |
| `homepage.css` | Black-theme layout and general styles |
| `homepage.js` | Navigation, scroll progress, and animation |
| `assets/homepage/` | Homepage artwork, including the serivia interface illustration |
| `favicon.svg` | Shared favicon |
| `Flow/`, `Enzo/`, `serivia/` | Independent projects |
| `tools/homepage-browser-check.mjs` | Production responsive and navigation QA |
| `tools/site-integrity.mjs` | Static site and project regression audit |

## Maintaining the site

GitHub Pages publishes the static site from `main`. The hero design shares the main stylesheet to avoid a second render-blocking CSS request. The homepage is plain HTML, CSS and JavaScript with no build framework.

The homepage browser test uses `playwright-core` and requires Chrome or Chromium. GitHub Actions runs it on relevant changes.

## Links

[GitHub](https://github.com/AwabJa) · [LinkedIn](https://www.linkedin.com/in/awabjahmed/)

*The portfolio and its featured projects will continue to evolve.*
