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

The public site operates in **curated demo mode** with 15 movies. It never requires visitors to log in, supply an API key, or connect a TMDB account. Search, genres, filters, trailers and local watchlist history work without API access.

The former optional browser-based API token form is disabled. The app clears any old Serivia TMDB session credential upon loading. The public site's Content Security Policy prevents outgoing API requests. **Never add a private TMDB token directly to this repository, GitHub Pages HTML or client-side JavaScript.** For a shared live catalog, use a server-side credential behind an appropriately rate-limited proxy or publish a generated static film feed. Configure that integration separately when it is ready.

This product uses TMDB-sourced image references but is not endorsed or certified by TMDB. Images are fetched over HTTPS from the TMDB image CDN; artwork may temporarily fail, in which case the app shows a fallback title card. Movie ratings in the curated catalog are sample values, not a live rating feed.

## Running

Serve the repository root with a local static HTTP server, then open \`/serivia/\`. Opening \`index.html\` directly as a \`file://\` URL may limit browser storage.

Changes are tested with \`tools/serivia-browser-check.mjs\` in the \`serivia browser checks\` GitHub Actions workflow. The site is a static GitHub Pages app.

## Portfolio

serivia is featured on the homepage as project 02. The retired Solar System Explorer directory and its homepage illustration have been removed from the published repository.
