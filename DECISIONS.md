# Decisions

## 2026-11-19 — v1.2 viewport shell increment

The existing React/Phaser scenes remain the source of local gameplay during FS01. The player route is fixed to the viewport and New Game requests fullscreen from the user gesture. Browser denial is ignored because the CSS viewport shell remains usable. The film and Haven canvas continue to share the exact 16:9 bounds. This is an interim shell integration; a single persistent Phaser instance and unified analog input are still required by later fullscreen tickets.

The shared touch joystick quantizes drag input into the same N/S/E/W commands as the keyboards in the existing scenes. It does not send analog magnitude to the scored reducer. Existing saves are confirmed before New Game and the fresh Haven spawn is written only at cinematic handoff.

## 2026-11-19 — Preserve the pinned fixture and build offline first

The Operation Komodo map, campaign policy, and replay routes are used without balance changes. The map hash is SHA-256 of JSON with recursively sorted keys and compact UTF-8 encoding; it matches both campaign fixtures. React owns the visible HUD and accepted action log; Phaser renders the map and character from the supplied runtime assets. The shared reducer handles movement, inventory, bridge, well, and water connectivity. This keeps rendering separate from scoring and allows later server verification against the same rules.

The local environment cannot install npm dependencies because pnpm cannot write its global store lock and the registry proxy refuses connections. No dependency lockfile was fabricated. B01/CI and browser verification remain open until a real install generates the lockfile and passes the checks.

## 2026-11-19 — Opening Kit v1.0 handoff

The Himalayan Haven scene uses the kit's baked `haven_background.png` plus the existing Yeti and Aurora sprite images. This matches the final film composition without drawing duplicate props. The Phaser camera is 640×360 at scroll `(0,12)` over the 640×384 map. The video overlays the already rendered canvas; ended, skip, and playback error all reveal that same scene. `introSeen` and hub tile position use separate localStorage keys, leaving other saved progress untouched. The board at tile `(12,7)` opens the existing Operation Komodo campaign screen. The expedition reducer and fixtures are unchanged.

## 2026-11-19 — Living World social state

Komodo Grove is a separate Phaser scene and local social reducer. It uses the supplied living atlas and fixture while retaining the original expedition reducer, campaign IDs, replay routes and opening composition. Haven's board approach at `[11,7]` exposes both routes after the tutorial. Social state is validated on load and stored under `social.komodoGrove.v1:guest`; it cannot write expedition XP, RP, replay or simulated funding. NPCs and animals stay stationary until browser interaction and visual QA can validate patrol behavior. The app uses existing audio and provisional art.
## v1.3 field journal and moving villagers

Use Ripple’s existing cloud buttons, cream HUD plate, illustrated slot borders and actor portraits across menus. Keep inventory and quest reading on separate tabs to limit panel height on phones. Grove patrols are local presentation state. Actor-range checks use current feet positions for moving interactions. The scored replay reducer continues to own all expedition movement and rewards.

Use fixed-size border slices for stretchable menu frames and buttons. Set animal size uniformly by species at render time. Opening the water puzzle is a contextual interaction after construction so players see the completed well before routing water.

The opening maintains its fixed baked frame. Playing Haven and the title preview use the fixture terrain and separate prop layers so small objects can be scaled at their base. The expedition briefing shares the playable Phaser scene, and failure at zero energy ends the local attempt before rewards.

Quest turn-in through dialogue delegates to the same village reducer used by the inventory journal. Voice reading is opt-in and respects global mute. Use the device speech synthesizer to keep dialogue playable with no account or subscription.

- Extend Himalayan Haven east of the cinematic fixture as an unscored 2D trail. Use Ripple's existing snow, ice, path and prop textures. Keep the scored Komodo map pinned.
- Use the RPG dialogue surface for new-game confirmation. Keeping the current save receives keyboard focus when the modal opens.

## Village atlas, walk cycles and foley
The Grove journal draws terrain and landmark frames from the loaded scene and previews routes from the same walkability data used by the player. Following the route issues normal steps. Side walk strips preserve frame bounds and foot anchors of the supplied character art. Trade, journal and cloth sounds are short local CC0 recordings from Kenney's RPG pack and use the SFX channel.

## Complete Grove animal locomotion cycles
Added 4-frame lateral walk strips for all five remaining Grove domestic animals: Miso (cat), Mochi (goat), Cloud (sheep), Sunny (chicken), and Puddle (duck). All strips match the 192×48 layout (48×48 cells), stable foot baseline Y=46, and pass tools/validate-living.py. GroveScene loads and animates them during both horizontal and vertical locomotion, restoring idle textures on step completion.
