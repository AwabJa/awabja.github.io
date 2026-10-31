# Arcana Duel: Moonfall — playable anime-card vertical slice

**Live game:** https://awabja.github.io/card-game/

This replaces the retired Arcana Duel CSS/SVG prototype with a new illustrated, landscape-first game scene. It is a **single-battle vertical slice**, not a finished commercial game. It uses an original generated moonlit fantasy battlefield and five original illustrated card concepts.

## What works

- Four allied characters and three enemy characters in the same cinematic battle scene
- Live per-character HP and ally shields, individually selectable attack and healing targets
- Five unique illustrated cards: Shadow Step, Guardian Aegis, Crimson Bloom, Healing Wind, Arcane Bolt
- Tap a card to open a **large illustrated preview**; choose **Play Card** or **Keep in Hand**
- Energy, targeted damage, area damage, burn over time, healing, shield protection, deck draw, discard, turn resolution, victory/defeat, and restart
- Draw pile and discard pile view, mouse/keyboard (1–5, E, H, Esc), swipe through cards if more than fit in the hand
- A landscape view fitting the entire battle into a phone screen and a rotate-your-phone prompt in portrait
- No payment systems, account sign-in, analytics, third-party JavaScript, network API calls, or external asset requests

## Playing

1. On mobile, rotate sideways. Select **How to Play** for instructions if needed.
2. Tap an enemy to target it (or an ally to target healing).
3. Tap a card to inspect the art, energy cost, and ability. Press **Play Card** to commit or **Keep in Hand** to cancel.
4. Select **End Turn** when done. Enemies attack, shields absorb damage, and you draw fresh cards.
5. Defeat all three enemies before all four allies fall.

## Technical notes

- Vanilla JavaScript with an HTML Canvas 2D renderer and a single optimized original WebP art atlas in `assets/atlas.webp`.
- Target resolution: 1600×800; scales responsively to landscape mobile and desktop.
- The battle state is held in memory; restarting the page starts a new battle. Only the first-run tutorial dismissal is stored locally.
- For testing, `window.__moonfallTestState()` returns a read-only *snapshot* of public in-game battle information; no accounts, personal information, or secrets exist.
- CI runs a browser interaction test on landscape phone, portrait phone, and desktop, as well as source and site integrity checks.
- The underlying card game mechanics and art may be expanded later into a full deck-builder, levels, rewards, audio, animation, and online accounts. None of those larger systems are claimed as complete now.

This game is separate from Flow and Serivia and is not yet featured on the main portfolio homepage.
