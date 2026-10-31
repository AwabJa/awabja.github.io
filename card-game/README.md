# Arcana Duel: Moonfall — playable anime-card vertical slice

**Live game:** https://awabja.github.io/card-game/

This is the **Zoomed-Out Stage & Card Fan Edition**, a landscape-first single-battle vertical slice. It replaces the low-resolution prototype artwork with a larger illustrated battlefield and five updated original card paintings. It remains an early game demo, not a finished commercial title.

## What works

- Four independent allied 3D models and three independent enemy 3D models, each animated with idle movement and individual status
- Live per-character HP and ally shields, individually selectable attack and healing targets
- Five unique illustrated cards: Shadow Step, Guardian Aegis, Crimson Bloom, Healing Wind, Arcane Bolt
- A curved, overlapping **fanned hand of cards**, with touch selection and swipe-to-browse; tap a card for a **large preview**, then choose **Play Card** or **Keep in Hand**
- Energy, targeted damage, area damage, burn over time, healing, shield protection, deck draw, discard, turn resolution, victory/defeat, and restart
- Draw pile and discard pile view, mouse/keyboard (1–5, E, H, Esc), swipe through cards if more than fit in the hand
- **Edge-to-edge landscape battle** filling the available screen rather than a bordered, inset webpage; a rotate prompt in portrait
- **Fullscreen** button on browsers supporting the Fullscreen API; PWA manifest and iPhone Home Screen app metadata for a browser-chrome-free installed experience
- Higher-resolution battlefield and card-art assets, plus device-pixel-ratio-aware canvas rendering for sharper graphics
- No payment systems, account sign-in, analytics, third-party JavaScript, network API calls, or external asset requests

## Playing

1. On mobile, rotate sideways. Select **How to Play** for instructions if needed. The game already fills the available viewport; use **Fullscreen** where supported. On iPhone Safari, **Share → Add to Home Screen**, then launch the icon for the fullest display.
2. Tap an enemy to target it (or an ally to target healing).
3. Tap a card to inspect the art, energy cost, and ability. Press **Play Card** to commit or **Keep in Hand** to cancel.
4. Select **End Turn** when done. Enemies attack, shields absorb damage, and you draw fresh cards.
5. Defeat all three enemies before all four allies fall.

## Technical notes

- Vanilla JavaScript with an HTML Canvas 2D renderer and two original WebP artwork sources: `assets/battle-hd.webp` (1672 × 470) and `assets/cards-hd.webp` (1380 × 272).
- Logical game coordinates: 1600×800. The CSS canvas stretches edge-to-edge while the internal bitmap scales up for high-density screens (capped to limit mobile GPU work). On displays with different aspect ratios, the canvas artwork may stretch slightly rather than cropping off cards or buttons.
- The battle state is held in memory; restarting the page starts a new battle. Only the first-run tutorial dismissal is stored locally.
- For testing, `window.__moonfallTestState()` returns a read-only *snapshot* of public in-game battle information; no accounts, personal information, or secrets exist.
- CI runs a browser interaction test on landscape phone, portrait phone, and desktop, as well as source and site integrity checks.
- The underlying card game mechanics and art may be expanded later into a full deck-builder, levels, rewards, audio, animation, and online accounts. None of those larger systems are claimed as complete now.

This game is separate from Flow and Serivia and is not yet featured on the main portfolio homepage.

## Graphics limitations

The updated artwork retains detail significantly better than the tiny previous atlas, but these are still **single-scene illustrated crops**, not independently rigged HD sprites. A truly professional production release will need separately illustrated hero and enemy layers, custom card paintings, and a dedicated animations pipeline.

## Model quality and limitations

These characters are **procedural low-poly, toon-shaded 3D models**, not imported hand-authored anime-quality GLB assets. They are real independently animated meshes and are not painted into the background, but a production-grade anime look will require professionally created, rigged models and animation clips. The renderer falls back to a plain gradient on devices with WebGL disabled; battle controls continue to work. No third-party assets or JavaScript runtime dependencies are fetched.

## Stage-composition revision (Moonfall 5)

Zoomed-out camera, tighter seven-character stage spacing, individual health plates immediately underneath each model, and a physically proportionate 2:3 compact card fan along the bottom. Cards still open in a large, separate preview; a tap does not spend energy. The 3D scene is procedural low-poly, not professional anime meshes.
