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

## Eastbank Nursery
The social map extends eastward from Market Lane with an orchard, a stream, two crossings and a nursery. Original village placements and spawn coordinates are retained. Physical interaction approaches and existing cardinal pathfinding govern access to all buildings. Piko’s optional irrigation survey and gate puzzle persist in the local social save, and only change the nursery’s visual state. New and older saves start with a dry nursery.

## Quest completion and crossing presentation

Successful expedition extraction returns Lofi to the World Board approach and shows a dismissible badge for 6.5 seconds. Store the accepted actions from the last successful Operation Komodo run locally and validate them through the reducer when restoring its board checkmark. This marker is local gameplay history. Social checkmarks read the Grove save and the highland journal. Optional village activities keep the player at their current location.

The broken and repaired bridge props span the river above its water layer. Draw the riverbank edges narrowly enough that the walkable approach tiles have dry ground. Use the deck as the visual anchor. The cinematic fixture still controls the opening frame. After handoff the east road uses two adjacent walkable rows with its props moved to the shoulders.

## 2026-11-19 — RPG Interactive Systems, Asset Preload Cache, Living World FX, and Hover Indicators

1. **Asset Preload and Unified Loading Transitions**:
   - `AssetBoot.tsx` indexes and downloads all pack assets to CacheStorage via ServiceWorker (`ripple-art-<packHash>`) on startup, preventing missing textures during gameplay.
   - Dedicated `LoadScreen` overlay displays destination title, emblem, and animated spinner on all map/scene handoffs (Himalayan Haven, Komodo Grove, Operation Komodo), ensuring maps are never displayed until fully preloaded and postrendered.

2. **Interactive Building Hover Indicators (`BuildingPill`)**:
   - Implemented a unified floating badge component (`BuildingPill.tsx`) calculating screen coordinates from active Phaser cameras.
   - Triggers when Lofi approaches interactable buildings, structures, NPCs, crops, or resource nodes across Komodo Grove, Himalayan Haven, and Operation Komodo. Shows key prompt `[E]`, entity title, and primary function.

3. **RPG Quest Tracker and Dialogue Accept/Decline**:
   - Replaced hidden inventory quest navigation with an on-screen RPG Quest HUD tracker displaying active quests, objectives, progress, and ready-to-claim highlights.
   - NPC quest encounters (Elder Toma, Ari) require explicit player decision to `Accept Quest` or `Decline`.
   - Accepting a quest triggers a parabolic multi-star sparkle trail (`questSpark.ts`) from the NPC/source to the on-screen Quest HUD, pulsing upon arrival.

4. **Living World Ambient FX**:
   - Expanded river life in Komodo Grove and Operation Komodo with leaping fish, emergence and splashdown particle animations (`fx_water_splash`), and ambient current ripples.
   - Enhanced campfires in Haven and Grove with animated flame scale/alpha tweens, rising smoke puffs (`fx_smoke`), and floating ember sparks (`fx_sparkle`).
   - Integrated hammer strike dust and restoration aura FX on building, repairing, and water connectivity.

5. **Waygate / Portal Fast Travel**:
   - Connected Himalayan Haven East Waygate and Komodo Grove Wayfarer Waygate with glowing portal rings (`fx_interaction_ring`) and journey charting, avoiding immediate unexplained teleportation.

6. **Campfire Particle Color Tuning**:
   - Diagnosed greenish/cyan particles in campfire animations to un-tinted `fx_sparkle_01` (which defaults to a blue-slate `rgb(41, 56, 97)`) and ground `aurora_pulse_01` particles in `HavenScene`.
   - Tuned `worldEffects.ts` campfire embers to a warm fire palette (`0xff4400`, `0xff7700`, `0xffaa11`, `0xffcc33`), fire-tinted flame base (`0xffd788`), and soft neutral ash smoke (`0xd0c4b0`).

7. **RPG UI Theme Alignment & Loading Screen Overhaul**:
   - Replaced generic web progress elements with an authentic pixel-art RPG gauge utilizing `bar_track_empty.png` and `bar_fill_energy.png`.
   - Upgraded loading presentation with the master panoramic landscape `campaign_komodo_1280x720.png` radial vignette and `ripple_logo_768.png` lockup.
   - Redesigned `BuildingPill.tsx` into a cozy RPG wooden/parchment signpost badge (`#fbf1dd` parchment, `#57432e` dark timber, `#203651` ink, and `#41655b` teal) with a carved `[E]` button and pointing arrow.
   - Styled `QuestHUD.tsx` with `/assets/props/notice_board.png`, `COMMUNITY LOG` badge, `TaskTitle` checkmarks, and pulsing ready-to-turn-in gold highlights.

8. **RPG Achievements / Feats System**:
   - Implemented an offline-first 8-feat progression registry (`achievements.ts`) spanning Haven exploration, Grove community life, and Operation Komodo expeditions.
   - Created `AchievementsList.tsx` rendered under a new "Feats" tab in the bag journal.
   - Connected unlock triggers across `HavenView.tsx`, `GroveView.tsx`, and `main.tsx` with instant global `ripple:achievement` event dispatch that displays the RPG mission-ribbon toast banner.

9. **Dynamic Footsteps & Audio Polish**:
   - Integrated terrain-aware footstep audio across all scenes (`HavenScene`, `GroveScene`, `ExpeditionScene`).
   - Lofi's movement in Haven triggers `sfx_step_snow.ogg`, while ground/grass movement in Grove and Expedition triggers `sfx_step_grass.ogg`.
   - Wired `sfx_success.ogg` to sound whenever an achievement/feat is unlocked.

10. **Himalayan Haven Snowfall Atmosphere**:
    - Created `createSnowfall` in `worldEffects.ts`, generating 30 gentle drifting snowflakes with diagonal wind and sinusoidal sway fixed to the camera viewport.
    - Weather effects respect `prefers-reduced-motion` and are active only during exploration (`fitWorld(true)`), preserving the opening frame regression check at MAE 0.000000/255.

11. **Contextual Signposts, Waypoint Compass, and Bag Item Cards**:
    - Added contextual emoji badges to `BuildingPill.tsx` (`💧`, `🔥`, `🎣`, `🌱`, `💬`, `🐾`, `🌀`, `🔨`) distinguishing interaction types.
    - Introduced a dynamic waypoint compass indicator in `GroveView.tsx` (`🧭 {landmark} {distance}t {arrow}`) pointing towards marked village landmarks.
    - Refactored `BagGrid` in `GameUI.tsx` to render a detailed RPG item card with category tags, quantities, and expanded usage notes.
