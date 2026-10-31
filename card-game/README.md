# Arcana Duel — playable prototype

**Preview:** https://awabja.github.io/card-game/

A zero-dependency, mobile-first, single-player strategic collectible card game prototype. This is a **working title**, not the final brand. It is in development and intentionally not featured on the homepage yet.

## Implemented

- 16 original fantasy card concepts across four elemental visual themes and three rarity tiers
- 12-card deck building, up to three copies of each unlocked card
- Turn-based energy, shields, attack, heal, draw, burn, weaken, and mixed effects
- Three sequential opponents with visible attack/defense intentions and increasing difficulty
- Deck shuffle/discard cycle, persistent collection, shards and card unlock packs
- No payment system, server, analytics, third-party scripts, or external assets
- Responsive touch-friendly cards, mouse and keyboard controls, reduced-motion mode

## Status and limitations

Card art is currently **CSS-based concept placeholder art** (sigils, gradients, silhouettes), not completed illustrated anime characters. The prototype is PvE only; there is no matchmaking or account sync. LocalStorage progress belongs to each browser/device and is not backed up online. Card rarity has no monetization attached.

## Run and test

Serve the repository root through a static HTTP server and open `/card-game/`. Node.js can execute unit tests via `node --test card-game/game.test.mjs`.

## Design direction

Build an original anime-inspired universe with collectible character portraits, tactical combos, meaningful decisions and short mobile-friendly battles. Only add the game as a new portfolio card after artwork, balance, accessibility and mobile QA meet a release bar. Flow and Serivia are unrelated and unchanged by this game.
