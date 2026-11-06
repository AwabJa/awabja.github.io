# Moonfall — Shattered Court: Deck Forging

**Play:** https://awabja.github.io/card-game/

Moonfall is a landscape-first illustrated fantasy card battle. This build has **18 unique card artworks and abilities**, a shuffled opening hand, three escalating encounters, and an illustrated **choose-one-of-three** reward draft after the first and second encounters. The game no longer deals its starting hand or the next five cards in a scripted order.

## The run

- Every new run shuffles a twelve-card starter deck: one copy of each starter card. The first five are dealt without replacement, and the deck only reshuffles played/discarded cards when depleted. Restarting shuffles again. A visible **Redraw Hand** action replaces your five cards once per act; this uses no energy.
- Each act contains a **different illustrated lineup of three enemies** with escalating HP, shields, enemy-intent patterns and distinct ambient colour grading across the Shattered Gate, Blood Chapel and Eclipse Throne. Six additional self-hosted enemy portraits are documented in [assets/encounters/SOURCES.md](assets/encounters/SOURCES.md).
- When you clear act 1 or 2, a **native, keyboard/touch-accessible card-forging screen** offers three randomly drawn, never-previously-acquired rewards. Choose one to permanently add it to your deck for the rest of the run. Surviving heroes regain 28% of maximum HP between acts.
- Clear the third act to win. A loss ends the run.
- Cards have different costs and effects: attack, focused protection, bleed cleansing, burn, weaken, expose, energy and card draw, and other choices. Enemies telegraph their intended actions.

## Real artwork

- The first five card illustrations are stored in the self-hosted `assets/cards-hd.webp` atlas.
- Seven additional card illustrations are the seven self-hosted painted anime-style character PNGs under `assets/illustrated/`.
- Six newly imported illustrated reward cards under `assets/rewards/` use **six different 384×512 PNGs** from the same CC0-labeled source pack; original filenames and source links are documented in [assets/rewards/SOURCES.md](assets/rewards/SOURCES.md).
- There are no emoji art placeholders on the card faces.

The characters on the actual battlefield **remain still illustrations** with code-driven motion and spell VFX; they do not have real articulated walk, idle, cast or attack sprite sequences. That is a separate asset-creation limitation, not fixed by improving the deck.

## Controls & implementation

On desktop or phone in landscape, select a foe or ally, tap a card to inspect it, then tap Play or Keep. End Turn resolves enemy intent attacks and draws five cards. Tap Deck to inspect your owned deck and use page controls when it expands. Rewards use native responsive buttons to maintain readable typography on phones. Keyboard: 1–5 cards, E End Turn, R Redraw Hand, H Help, Escape close dialogs.

- `game.js` implements deck shuffling, card combat, the three-act state machine and reward choices.
- `scene-rebuild-prototype.js` renders the illustrated combat.
- `browser.test.mjs` verifies real desktop/mobile gameplay and simulated encounter wins **only through test-instrumented page scripts** (not a production developer/cheat control). The workflow records real screenshots of the reward choice and act transition.
