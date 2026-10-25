# Serivia — cinematic movie discovery

**Preview:** https://awabja.github.io/serivia/

A standalone, responsive, no-build movie discovery prototype inspired by the supplied dashboard reference. It is featured as project 02 on the portfolio homepage, alongside Flow and Enzo.

## Implemented

- Dark charcoal layout with yellow branding, sidebar, featured movie carousel, genre chips and horizontal movie posters
- Search by film title, genre, or synopsis
- Year, rating, and sorting filters
- Featured carousel dots, detailed film dialog, trailer *links* (not embedded streaming)
- Local watchlist/favorites and recently explored titles saved in your own browser
- Responsive mobile drawer and horizontal swipeable poster strip
- Keyboard focus and accessible dialogs, reduced-motion styling

## Movie data and artwork

Without API connection the app displays **12 curated demo films** as a fallback. For a much larger, actively updated catalog, visitors can choose **Connect TMDB** and enter their own TMDB **API Read Access Token**. With an active connection, the app searches TMDB, browses popular/trending/upcoming films, supports genres, filters and pagination, and loads current film metadata and posters. It does not promise literally every film ever made: coverage depends on TMDB's database.

The token is used from that browser session and is stored only in `sessionStorage`, not committed to this repository. Its bearer header is sent directly over HTTPS to `api.themoviedb.org`; it is **not secure against someone with access to the same browser or its extensions**. The demo never asks for a TMDB password. To make live browsing work for *all visitors automatically*, host a separate authenticated API proxy or prebuilt data feed with a server-side secret, not a secret in GitHub Pages source.

Obtain an access token from [TMDB account settings](https://www.themoviedb.org/settings/api). TMDB noncommercial API terms require attribution:
https://developer.themoviedb.org/docs/faq

This product uses TMDB API content but is not endorsed or certified by TMDB. Image downloads are served directly by the TMDB HTTPS image CDN and can temporarily fail; fallback art is shown.

## Running

Serve the repository root with a local static HTTP server, then open \`/serivia/\`. Opening \`index.html\` directly as a \`file://\` URL may limit browser storage.

Changes are tested with \`tools/serivia-browser-check.mjs\` in the \`serivia browser checks\` GitHub Actions workflow. The site is a static GitHub Pages app.

## Portfolio

serivia is featured on the homepage as project 02. The retired Solar System Explorer directory and its homepage illustration have been removed from the published repository.
