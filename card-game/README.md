# Moonfall — Shattered Court: Deck Forging

**Play:** https://awabja.github.io/card-game/

Moonfall is a landscape-first illustrated fantasy card battle. This build has **18 unique card artworks and abilities**, a shuffled opening hand, three escalating encounters, and an illustrated **choose-one-of-three** reward draft after the first and second encounters. The game no longer deals its starting hand or the next five cards in a scripted order.

## The run

- Every new run shuffles a twelve-card starter deck: one copy of each starter card. The first five are dealt without replacement, and the deck only reshuffles played/discarded cards when depleted. Restarting shuffles again. A visible **Redraw Hand** action replaces your five cards once per act; this uses no energy.
- Each act contains a **different illustrated lineup of three enemies** with escalating HP, shields, enemy-intent patterns and distinct ambient colour grading across the Shattered Gate, Blood Chapel and Eclipse Throne. Six additional self-hosted enemy portraits are documented in [assets/encounters/SOURCES.md](assets/encounters/SOURCES.md).
- When you clear act 1 or 2, a **native, keyboard/touch-accessible card-forging screen** offers three randomly drawn, never-previously-acquired rewards. Choose one to permanently add it to your deck for the rest of the run. Surviving heroes regain 28% of maximum HP between acts.
- Clear the third act to win. A loss ends the run.
- Cards have different costs and effects: attack, focused protection, bleed cleansing, burn, weaken, expose, energy and card draw, and other choices. Enemies telegraph their intended actions.


## Card Atelier — four implemented phases

1. **Full-bleed fantasy art composition:** `card-polish.js` repaints each of the 18 existing, distinct, self-hosted illustrations with per-card arcane lighting, lightning, slash trails, shields, petals and healing effects. Art is composed once at 420 × 560 pixels and cached for smooth rendering. This uses the previously licensed source illustrations and does not claim eighteen newly commissioned pieces.
2. **Premium rarity frames:** card borders, metallic corner engravings, nameplates and gemstone energy costs now vary by Common, Rare, Epic and Legendary rarity. The artwork fills the whole card rather than a small central sticker.
3. **Animated selection:** on tap, the selected card rises into focus against a dimmed battlefield before the details appear. The desktop preview adds a magical ring and gentle float; the real-pixel mobile inspector shares the same composed painting, accent colour and shine transition.
4. **Responsive hand:** hovering or focusing a card straightens and raises it, parts adjacent cards, and brings the chosen card above the others without changing card hit zones or mechanics. Reduced-motion preferences disable the decorative animation.

The between-act card reward picker uses those same composited illustrated textures, and controls stay large enough for landscape touch interaction. Browser CI checks the actual selection and neighbor movement and retains desktop/mobile screenshots.

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

## Illustrated scene-card replacement (candidate artwork)

A new standalone image set in `assets/card-scenes/` assigns **18 separate painted fantasy scenes** to the 18 abilities. It is a genuine replacement of the old cropped character portraits, with a dedicated artist/source and visible CC BY 4.0 in-game credit (see `assets/card-scenes/SOURCES.md`). Selection motion, UI layout and combat mechanics are not being marketed as new art here. The paintings are sourced from Mike Koz's Soimoi Tarot, so they are stylistically coherent but not originally drawn for Moonfall's story or spell names.

The first in-game screenshot review showed that paintings need stronger spell-to-scene correspondence. The Shadow Step and Crimson Bloom scene selections were revised; this branch remains under visual review, not an assertion of completed bespoke spell illustrations.
