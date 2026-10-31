# Arcana Duel — Moonfall vertical slice

**Play:** https://awabja.github.io/card-game/

This is a clean-slate, one-battle playable proof of concept, built in a single HTML5 Canvas game surface for landscape phones and desktop. The former DOM/CSS prototype and its original 16-card engine remain in the repository as reference material, but they are not loaded by this screen.

## Why the rebuild is different

- A cohesive original anime-fantasy art atlas generated for this project (one compact local WebP; no external URLs) powers the battlefield and real card illustrations, replacing procedural SVG portraits.
- The actual game plays at a 1600 × 800 logical design size, scaled uniformly to fit short landscape phones without page scrolling.
- Four illustrated allies and three enemy units each have **real HP**, selectable targeting, ally shields and enemy damage. The battlefield is not a decorative fake team.
- Five illustrated card types have distinct abilities: Shadow Step, Guardian Aegis, Crimson Bloom, Healing Wind, Arcane Bolt.
- Tapping a card **previews** its full illustration, rarity, cost, description and target effect. An explicit **Play Card** button is required to spend energy; **Keep in Hand** cancels safely.
- A draw pile, a discard pile and End Turn control are always beside the hand.
- Enemies attack when you end the turn. Burn effects persist for two turns. Discards reshuffle into the draw pile. Victory requires defeating all three enemies; defeat requires all allies to fall.
- You can tap the help button anytime, and portrait phones display a rotation hint (they are not forcibly rotated).
- No accounts, purchases, third-party JavaScript, trackers or remote assets.

## Limitations

This is **one battle**, not the full RPG. There is no story progression, long-term collection save, multiplayer, audio pipeline or skeletal character animation yet. The ensemble artwork is a **single painted scene**, not seven independent animated character sprites. The cards are illustrated crops from an original composite art concept; dedicated final card illustrations will improve fidelity further.

## How to play

1. Open the link on a phone turned sideways (landscape), or use a desktop browser.
2. In the battlefield, tap one of the three enemies to target it. For healing, tap one of your four allies.
3. Tap a card in your hand to read its effect; then choose **Play Card** or **Keep in Hand**.
4. Use shields and healing to protect allies. End your turn to let enemies attack and to refill your hand.
5. Win by defeating all three enemies before all four allies lose their health.

Keyboard: **1–5** to preview a hand card; **Enter** to play its preview, **Esc** to close it, **E** to end your turn, **H** for help.

## Development and quality checks

The new battle uses only `index.html`, `slice.css`, `slice.js` and `assets/atlas.webp` in the runtime. CI checks the JavaScript syntax, old card-engine regression tests, and browser interactions on a 844 × 390 mobile landscape viewport, 390 × 844 portrait, and 1440 × 800 desktop.

Flow and Serivia remain unrelated and untouched. The game is intentionally not yet shown as a finished portfolio project.