# Serivia — cinematic movie discovery

**Preview:** https://awabja.github.io/Cinema/

A standalone, responsive, no-build movie discovery prototype inspired by the supplied dashboard reference. It is deliberately isolated from the portfolio homepage and the existing Solar System, Enzo, and Flow projects.

## Implemented

- Dark charcoal layout with yellow branding, sidebar, featured movie carousel, genre chips and horizontal movie posters
- Search by film title, genre, or synopsis
- Year, rating, and sorting filters
- Featured carousel dots, detailed film dialog, trailer *links* (not embedded streaming)
- Local watchlist/favorites and recently explored titles saved in your own browser
- Responsive mobile drawer and horizontal swipeable poster strip
- Keyboard focus and accessible dialogs, reduced-motion styling

## Data and artwork

The app currently ships with a **small curated demonstration catalog**. It is **not** connected to a live movie API, so ratings and trending labels are illustrative snapshot values, not live ratings or Rotten Tomatoes scores. This is not a streaming service and does not invent playback progress.

Poster and backdrop filenames are drawn from published TMDB data and displayed via TMDB's HTTPS image CDN. The repository contains *no copies* of movie posters and no API keys. Some media may be unavailable if TMDB changes or blocks a remote asset; image failures leave a neutral placeholder.

This product uses TMDB API content but is not endorsed or certified by TMDB. For use beyond a portfolio demo, review the TMDB API/image license and attribution requirements:
https://developer.themoviedb.org/docs/faq

Adding genuinely live discovery/search requires a TMDB developer key and a protected backend/proxy (such as a serverless function); **do not publish a personal TMDB secret or bearer token inside client JavaScript or GitHub**.

## Running

Serve the repository root with a local static HTTP server, then open \`/Cinema/\`. Opening \`index.html\` directly as a \`file://\` URL may limit browser storage.

Changes are tested with \`tools/cinema-browser-check.mjs\` in the \`Cinema preview checks\` GitHub Actions workflow. The site is a static GitHub Pages app.

## Portfolio

The existing Solar System Explorer card stays on the homepage until this prototype is approved. After that, replace the card's title, description, image, and URL in root \`index.html\`, while leaving other project pages intact.
