# Living World — Design and Engineering Handoff

Version 1.0 | Target: Ripple v1.1 + Opening v1.0 | Add-on scope

## Product intent
Ripple needs an inviting place to spend time between scored expeditions. Komodo Grove is a fictional tropical community hub inspired by the restoration theme, not a claim of a real completed Foundation project. A player can explore without a wallet, meet villagers, care for animals, farm, fish, and exchange social resources. No new chain calls, donations, RP, real-world impact claims, or competitive power rewards originate here.

## Scene contract
- Existing opening remains byte-for-byte untouched. Preserve `himalayan_haven_intro_v1` (20×12, spawn tile 9,7, camera/position as Opening Handoff). Do not replace its background or cinematic last frame.
- After introSeen and Aurora tutorial, the original world board exposes Visit Komodo Grove alongside the original Operation Komodo campaign. Open `komodo_grove_v1` at [4,13]; return to the original board approach [11,7] if walkable. If existing save has a better validated return point, use it. Never reset existing progress.
- `fixtures/living/komodo-grove.json` and runtime `assets/living/maps/komodo-grove.json` are identical. Original village 40×28, extended east to 64×28 tiles at 32 px (2048×896) for the nursery. Use camera follow and map-derived bounds, nearest filtering, tile-based collision. Show whole-map preview only for overview; gameplay camera follows player, preferably 640×360 logical viewport, responsive letterbox.
- `terrain` holds texture IDs; base terrain index uses existing atlas frame mapping, `lw_tile_plaza` is standalone. Draw terrain first; sprites by world feet Y. `tile` is logical anchor; origin is manifest-specific. Art scale is not collision size. `blocked` is authoritative; `footprint` records object solid tiles. Decoration (grass/flowers) may be passable. Do not derive colliders from PNG alpha.
- Interaction requires current player tile in `approaches`, then an allowed action. Paths must remain open. Display contextual E/mobile interact; click/tap object can walk toward nearest reachable approach. Make world board, workshop, rest, pump, market, and animal groups discoverable by signs/minimap. Do not hardcode display names to asset IDs.
- Zones: Workshop & Water Lab (NW); Residential Grove (NE); Ripple Plaza (center); Market Lane (E); Camp & Garden (SW); Farm & Animal Sanctuary (SE). River x19–20, bridges y5–6, y12–14, y22–23. Natural foliage around zone edges, paths and gates kept clear.

## Visual assets
94 atlas frames: 22 animal facing sprites, 15 NPC poses (3 characters × front/right/left/back/happy), 3 NPC portraits, 38 environment props, 10 crop stages, 6 food/item icons. One standalone plaza tile. Base NPC elders/engineer/child/recycler and terrain/props are reused from original kit, no duplicated runtime files. `living-manifest.json` is separate from original manifest; register atlas key `living` and base keys unchanged. Use prefix `lw_` to avoid collisions. Source art includes the concept illustration (not a map texture), generated sheet, and NPC turnaround sheet. Some icon outlines/crop edges may require polish at larger resolutions. Animal left sprites are mirrored; no unique back/walk animation frames supplied. Runtime icon sizes 32px, NPCs 48px, portraits 128px, props vary; actual dimensions/origin in manifest. Existing license restrictions apply; not official Lofi IP or approved commercial art.

## NPCs
| ID | Name | Role | Interaction |
|---|---|---|---|
| elder | Elder Toma | Guide | Dialogue, New Neighbors quest |
| engineer | Piko | Engineer | Dialogue, water pump hint |
| child | Nia | Animal friend | Dialogue, animal-care tutorial |
| recycler | Rumi | Recycler | Dialogue, recycling education |
| farmer | Ari | Farmer | Dialogue, Garden Helper quest |
| fisher | Banyu | Fisher | Dialogue, fishing instructions |
| merchant | Mira | Merchant | Dialogue, market directions |

Dialogue text and quest IDs in interaction-config.json. Use dialogue panels with name, portrait (new portrait or existing front sprite), Next/Close, optional quest choice. No blocking overlay after close. Track unique NPC IDs; quests activate from correct NPC and claim once. Greet 3 unique NPCs => 2 seeds; harvest once => 2 hay. Merchant stall (market or fish_market) trades one produce for two selected hay/seed/kibble. No prices in real tokens. Core supports quest claim in quest panel; optional production UI can require returning to issuer, but change spec/tests if so.

## Animal care
| Species | Name | Food | Play style |
|---|---|---|---|
| dog | Biscuit | kibble | fetch |
| cat | Miso | kibble | chase toy |
| goat | Mochi | hay | gentle pet |
| sheep | Cloud | hay | gentle pet |
| chicken | Sunny | seed | follow |
| duck | Puddle | seed | waddle |
| bird/chick/duckling/fish/butterfly | Sky/Pip/Dew/Silverfin/Flutter | none | observe only |

This is a fictional game mechanic, not real animal-care instructions. Feed consumes one matching social food and adds 8 friendship; play adds 5 friendship, no food cost. Each once per animal per in-game day, friendship capped 100; no negative decay or penalty for absence. Observe displays name/friendship. Failed action (too far, no food, repeat, wrong action) changes nothing. On success animate small bounce, floating heart, short cue and (play) toy/ball. In lab animation is generic, production may use species-specific actions. Never hurt, chase wild animals, or punish player. Future optional companionship cosmetic at 40/80 friendship; not shipped and no gameplay buff. Avoid pay-to-win.

## Plants and other activities
- Six farm plots, two crops initially ripe; other plots begin seed. Water costs 1 water from separate watering-can counter (capacity 3); one water per plot per day; cannot water ripe plants. On confirmed rest, watered crops advance exactly one of five stages: seed/sprout/growing/flower/ripe. Harvest ripe gives 1 produce and resets plot to seed. No elapsed-time requirement or realtime farm timers.
- Fruit tree and berry bush each provide 1 produce/day. Water pump refills to 3. Fishing dock gives one fish/day (social collectible, not food for current animals). Bench sit, landmarks inspect, workshop/board informational. No wood/stone/metal from this hub.
- Rest at camp or campfire: explicit confirmation before advancing local day; no negative side effects; day increments once and daily actions become eligible again. No forced waiting.
- Starter local inventory hay=3, kibble=3, seed=3, water=3, produce=0, fish=0. Item caps 99 (water cap 3). Inventory increments only after validation; trade refuses when full. The reference is client-local; this is intentionally noncompetitive.

## Architecture and state
- `integration/living-core.js` reference oracle (UMD/CommonJS/browser); exports create, move, nearby, apply, claim. Mutates social state only on successful action; callers must serialize action handling to avoid double-press. Reject invalid/too-distant actions before mutation. Use a typed `LivingStateV1` module and reducer/service in production; preserve exact rules with tests. No dependency on expedition engine or Sui signer.
- `LivingStateV1`: version, day, position, inventory, animals {friendship,fedDay,playedDay}, crops {stage,wateredDay}, harvestDay, talked IDs, quests, fishDay, harvestCount. Namespaced save `social.komodoGrove.v1` keyed to profile/save ID; validate data and migrate defensively; clamp numeric values and validate map positions on load. Persist after successful interaction and scene exit. No state overwrite when cinematic replayed. Lab does NOT persist on refresh.
- Existing scored expedition state (energy, backpack, RP, replay, contribution proof, reward, DEMO_CREDIT) is separate. Never pass social inventory or friendship to validation/contracts. A social event is not a donation or evidence of project completion. If future achievements require chain, design separately with explicit review.
- MVP actors stationary, no dynamic collisions. Art-only idle bob (small amplitude) may be applied without changing logical tile. Production expansion: finite-state idle/patrol/interact/reaction; add curated waypoints per actor on reachable tiles, pause while player dialogue open, avoid blocked/occupied points, recompute approaches when logical tile changes, cancel stale interaction if target moved. Do not introduce patrol until static reference acceptance passes. NPC directional frames supplied for 3 new actors; old NPC use existing poses. Animal movement uses left/right mirrored frame and tween; full animation cycles would be later art work.
- Audio reuse existing `sfx_click`, `sfx_success`, `sfx_invalid`, `sfx_water`, `music_expedition`, `ambience_river`, obey audio settings. No new audio files; avoid duplicate preload. Crossfade on scene change.

## Backlog / acceptance
| ID | Task | Acceptance |
|---|---|---|
| LW01 | Merge add-on; preload manifest & atlas | all images load, no base key overwritten |
| LW02 | New scene + collision/camera | map fixture render, 3 crossings, every interaction reachable, touch/keyboard |
| LW03 | NPC dialogue/quest UI | 7 NPCs, unique talk counting, one-time rewards |
| LW04 | Animal care | 6 care types, 5 observe-only; consume food; cap & daily lock; reaction |
| LW05 | Garden/rest/trade/fish | plant stages, day, item caps, no repeated harvest/fish |
| LW06 | Save & travel | board route gated by tutorial; return preserves save; refresh restores social state |
| LW07 | Polish | idle reactions, contextual prompts, minimap/zone labels, audio, responsive UI |
| LW08 | Regression | original opening matches frame; original expedition/replay fixtures unchanged; no social-to-score leakage |

Run reference Node tests and asset validator; actual Phaser integration must also run unit tests, browser E2E and screenshot regressions. Add production tests for invalid save, duplicate tap, return/replay, camera, mobile, and pause/menu. Do not mark production complete based on lab only.
