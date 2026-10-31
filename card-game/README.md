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
- Landscape-first card table with visible draw and discard piles, horizontal swipe through your hand, and tap-to-inspect card dialog with an explicit Play Card confirmation
- Clear one-on-one cathedral battle with the hero and actual enemy, health/energy bars, visible next enemy move, and End Turn button

## How to play

1. Open the game in a browser. The first battle shows a 3-step tutorial; the “How to play” button reopens it at any time.
2. Turn your phone to **landscape** for the full-width table. Swipe sideways through your hand. **Tap a card to inspect it**; nothing happens to your energy or enemy HP until you press **Play Card**. Close the preview to keep the card.
3. Choose **Play Card** to spend its shown energy cost and activate it. Open **Draw** to view your 12-card deck or **Discard** to review previously played cards. Read the enemy's upcoming move and end your turn when ready.
4. Reduce the enemy's HP to zero before your HP reaches zero. Survive three consecutive encounters, unlock more cards and customize your deck.

## Mobile orientation

Rotate your phone sideways to use the compact landscape game table. Mobile web browsers generally cannot force the device to rotate; the portrait view remains usable with an orientation hint. Tapping a card first previews it; using the Play Card button is the only way to spend energy.

## Status and limitations

Card artwork now uses **original SVG anime-inspired character illustrations**, with character lineups and a painted-vector cathedral battlefield. These are early vector placeholders, **not** the fully illustrated anime character art shown in the visual mockup. The prototype is PvE only; there is no matchmaking or account sync. LocalStorage progress belongs to each browser/device and is not backed up online. Card rarity has no monetization attached.

## Run and test

Serve the repository root through a static HTTP server and open `/card-game/`. Node.js can execute unit tests via `node --test card-game/game.test.mjs`.

## Design direction

Build an original anime-inspired universe with collectible character portraits, tactical combos, meaningful decisions and short mobile-friendly battles. Only add the game as a new portfolio card after artwork, balance, accessibility and mobile QA meet a release bar. Flow and Serivia are unrelated and unchanged by this game.
