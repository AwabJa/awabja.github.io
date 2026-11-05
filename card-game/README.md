# Moonfall — Shattered Court

**Play:** https://awabja.github.io/card-game/

Moonfall is a landscape-first browser fantasy card battle. Four allies fight three enemies using a five-card hand, energy, shields, healing, burn, and timed attack animations. It supports landscape phones and desktops.

## Artwork and presentation

- The game now uses **seven self-hosted illustrated 384×512 PNG character sprites** from `assets/illustrated/`, with original source and the publisher's licence declaration recorded in [SOURCES.md](assets/illustrated/SOURCES.md).
- The gothic castle uses the painted `assets/backdrop2.webp` scene, with a perspective stone-floor treatment, controlled moonlight, and atmosphere drawn over it.
- Combat sprites remain **single static character poses** with code-driven windups, dashes, afterimages, casting glow and damage recoil. These improve presentation but are **not hand-drawn attack frames or actual skeletal animations**.
- Magic now has distinct visual families for blade arcs, lightning, shield hexes, healing rings, crimson petals, burn and impacts. Health changes are synchronized with visible hit times.
- The five illustrated cards still use `assets/cards-hd.webp`. Small cards have clearer labels, and phones use an accessible CSS-based inspector with readable text and touch-friendly Play/Keep buttons.
- The battlefield canvas and the HUD maintain a uniform 2:1 aspect ratio instead of stretching character proportions across different screens.

## Controls

1. On a phone, rotate to landscape. On desktop, enter fullscreen if desired.
2. Tap an enemy or ally to select the target.
3. Tap a card to inspect its effect and energy cost. Choose Play Card or Keep in Hand.
4. End Turn to trigger enemy actions and refill the hand.
5. Keyboard: 1–5 choose cards, E ends the turn, H opens Help, M plays the animation showcase without changing combat state, Escape closes overlays.

## Code

- `index.html`: four canvas layers and the responsive card inspector.
- `game.js`: cards, combat, preview and HUD, impact resolution.
- `scene-rebuild-prototype.js`: painterly backdrop, self-hosted character art, grounded movement and spell effects.
- `style.css`: uniform stage sizing and real-pixel mobile inspector typography.
- `browser.test.mjs`: mobile portrait/landscape and desktop regression checks. CI also captures actual gameplay screenshots.

## Honest limitations

The illustrated fighters have **one still pose per character**, not separate attacking/casting frames. The rebuilt spell choreography does not change that constraint. A production-quality release would need coordinated per-character pose sheets or layered artwork with proper joint locations, additional environmental painting, and redesigned card illustration typography. This release remains a playable, locally rendered prototype, not a persistent or multiplayer game.
