# Arcana Duel: Moonfall — 2.5D illustrated battle slice

**Live game:** https://awabja.github.io/card-game/

The earlier low-poly WebGL scene was removed and replaced with a **layered 2.5D battle renderer**: an original gothic illustrated courtyard, seven individually composited anime-style character sprites, independent idle motion, foreground drifting leaves, atmosphere, target glows and damage reactions. These are illustrated sprite layers, **not 3D polygon models**; further artwork and rigging would be needed for console-quality multi-frame animation.

## Playing

1. On mobile, rotate to **landscape**. The battle fills the viewport. Fullscreen can be enabled where supported; on iPhone use Safari's Add to Home Screen option.
2. Tap an enemy to target it, or an ally for healing.
3. Tap a card in the compact fanned hand. Read the larger preview, then choose **Play Card** or **Keep in Hand**. Inspecting never spends energy.
4. End Turn to let enemies attack, apply damage and shields, then refill your hand.
5. Defeat all three enemies before all four allies fall.

## Implemented

- Four allied illustrated character sprites and three individually targetable enemy sprites, animated independently on a separate scene canvas
- 2.5D depth effect: parallax courtyard, reflected paving, foreground fog/leaves and per-character shadows
- Five original illustrated attack, shield, heal and area cards, consistent fanned geometry and larger readable previews
- Energy, damage, burn, shield, healing, piles, enemy turns, win/lose and restart
- Fullscreen landscape web app with portrait orientation guide and Home Screen manifest
- No tracking, payment systems, accounts, CDN or third-party runtime scripts

## Limitations

This is an **art-directed playable vertical slice**, not a finished anime RPG. The scene uses separately composited character cutouts from original concept artwork; some sprite-edge cleanup and additional hand-painted animation frames are still needed. The backdrop uses repeated stone architecture to fill areas behind the characters. It is not a fully authored environment. No online multiplayer or persistent collection has been implemented.

All gameplay lives in the existing browser-side game logic; the card rules remain testable and independent of the 2.5D presentation. The game is separate from Flow and Serivia.
