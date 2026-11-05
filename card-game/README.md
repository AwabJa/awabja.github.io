# Moonfall — Shattered Court

**Game:** https://awabja.github.io/card-game/

Moonfall is a browser-based, landscape-first tactical fantasy card battle. Four illustrated heroes face three enemies in a tougher encounter with visible enemy intents, shielding, damage-over-time effects, and twelve distinct cards. The production scene remains hand-painted and self-hosted.

## Gameplay

The previous "See Animations" demonstration button and M shortcut have been removed from the actual game. Animations occur when a player or enemy takes an action.

**Twelve abilities:** Shadow Step, Guardian Aegis, Crimson Bloom, Healing Wind, Arcane Bolt, Seraphine’s Vow, Akari’s Mark, Elowen’s Hymn, Kael’s Tempest, Reaper’s Bargain, Oracle’s Curse and Night Knight’s Oath. The first five use the original card art atlas. The seven new cards use self-hosted illustrated character portraits; all descriptions, costs and effects are distinct. No emoji substitutes are used on card faces.

**Strategic decisions:** enemies display their intentions before each round, use different targeting logic, cause bleeding or energy disruption, gain shield, and can recover health. Players can mark enemies for +30% follow-up damage, weaken attacks, redirect enemy attacks, gain an ally counterattack, cleanse bleed, or sacrifice health for cards and energy. Shield absorbs damage before HP. Enemy HP and attack pressure are higher than in the initial prototype.

**Play:** rotate your phone to landscape, select an enemy or ally, inspect a card and choose Play or Keep, then End Turn. Keyboard: 1–5 select hand cards, E ends turn, H opens help, Escape closes overlays.

## Artwork and limitations

The seven self-hosted 384×512 illustrated characters are static images. The renderer adds windup, recoil and casting effects but **does not have separate painted attack, idle or casting poses**. True animated characters require new sprite sheets or rigged layered illustrations; code-only movement cannot convincingly articulate a single painting. Imported art source and licensing declaration are documented in [assets/illustrated/SOURCES.md](assets/illustrated/SOURCES.md).

## Architecture and testing

`game.js` maintains the twelve-card deck, the battle-state machine, distinct enemy intents and timed combat updates. `scene-rebuild-prototype.js` composites the painted gothic battlefield, illustrated characters and spell choreography. `index.html` and `style.css` provide a phone-friendly responsive inspector. `browser.test.mjs` covers desktop and mobile, card art loading, combat and new status effects.

The game remains a standalone single-player encounter, not a full campaign, multiplayer game or roguelike with persistent progression.
