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
- Clear one-on-one cathedral battle with the hero and actual enemy, obvious health/energy bars, visible next enemy move, swipeable hand, and End Turn button

## How to play

1. Open the game in a browser. The first battle shows a 3-step tutorial; the “How to play” button reopens it at any time.
2. Tap a highlighted card in your hand. Its number is the energy cost. Attack cards hurt the enemy, guard cards add a shield, and heal cards restore health.
3. Read the enemy's upcoming move above your cards. End your turn when you run out of energy or have played enough cards. The enemy attacks, then you draw a new hand.
4. Reduce the enemy's HP to zero before your HP reaches zero. Survive three consecutive encounters, unlock more cards and customize your deck.

## Status and limitations

Card artwork now uses **original SVG anime-inspired character illustrations**, with character lineups and a painted-vector cathedral battlefield. These are early vector placeholders, **not** the fully illustrated anime character art shown in the visual mockup. The prototype is PvE only; there is no matchmaking or account sync. LocalStorage progress belongs to each browser/device and is not backed up online. Card rarity has no monetization attached.

## Run and test

Serve the repository root through a static HTTP server and open `/card-game/`. Node.js can execute unit tests via `node --test card-game/game.test.mjs`.

## Design direction

Build an original anime-inspired universe with collectible character portraits, tactical combos, meaningful decisions and short mobile-friendly battles. Only add the game as a new portfolio card after artwork, balance, accessibility and mobile QA meet a release bar. Flow and Serivia are unrelated and unchanged by this game.
