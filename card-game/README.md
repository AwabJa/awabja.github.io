# Moonfall — Shattered Court

**Live game:** https://awabja.github.io/card-game/

Moonfall is a full-viewport, landscape-first gothic fantasy card battle featuring four allies, three enemies, and a completely rebuilt **procedural 2D battlefield**. As of this replacement, the original background and cutout character sprite atlases are no longer loaded.

## Playing

1. Open the game on desktop or rotate your phone to landscape.
2. Choose an enemy to attack, or an ally to heal.
3. Tap a card to inspect it, then Play Card to cast (or Keep in Hand to cancel).
4. Watch the animated action resolve at the visible impact frame.
5. End Turn to trigger enemy attacks. Defeat three enemies before all four heroes fall.

## New world and characters

- New moonlit gothic courtyard composed directly in Canvas, with cathedral towers, ruins, bridges, a wet stone ground plane, crimson foliage, torches, and a separate atmosphere.
- Seven redesigned articulated **2D illustration rigs**. Their heads, faces, capes, legs, arms, weapons, and casting hands are drawn and moved as separate geometry.
- Distinct character silhouettes, palettes, and equipment for Seraphine, Akari, Elowen, Kael, the Dusk Reaper, Blood Oracle, and Night Knight.
- The illustration style is **procedural vector art**, not 3D meshes or hand-painted high-resolution anime character artwork. It will look more graphic and flatter than a cinematic painted concept image.

## Casting and effects

- Hand-anchored casting circles and light buildup before release.
- Spells travel through the world from the animated hands toward the chosen target.
- Distinct attack, healing, shield, area, burn, and enemy hit effects.
- Damage, heals, shields, and status effects resolve at their rendered impact moments.
- Accessible reduced-motion behaviour when system preferences request it.

## Architecture

The renderer is `scene-rebuild-prototype.js`, loaded by `index.html` as the production world. It uses the layered `sceneBackground`, `sceneAtmosphere`, and `sceneWorld` canvases; `game.js` maintains the original playable card logic and HUD. The background stays fixed between resizes; only characters, atmospheric effects, spell effects, and HUD repaint.

The original `scene25d.js` and its `backdrop2.webp`, `characters.webp`, `frames-allies.webp`, and `frames-enemies.webp` assets have been retired. Only `assets/cards-hd.webp` remains necessary for the five illustrated cards.

## Current limitations

This is a functional 2D art rebuild, not a production-ready painted anime RPG. It has animated component rigs, not cinematic 3D character meshes, custom skeletal asset pipelines, or unique hand-painted attack frames. Additional high-resolution art and manual animation work would be needed for that level of finish. The card collection is not persistent and there is no online multiplayer or account system.

## Testing

`node card-game/browser.test.mjs` checks landscape and portrait mobile as well as desktop, verifies the new renderer and articulated models, and exercises selection, preview, card play, deferred impact events, turns, deck, and restart.
