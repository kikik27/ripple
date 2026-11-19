# Ripple implementation status

## v1.2 fullscreen shell increment — 2026-11-19

- Inspected the bundled v1.2 specification, backlog, reference, current source, and existing uncommitted work. The first game-facing unblocked ticket is FS01; B01 remains open for clean-install and CI verification. This increment changes `apps/web/src/main.tsx`, `apps/web/src/shell.css`, and `apps/web/index.html`.
- The player route now owns a fixed 100dvh shell. Its title, Haven, Grove, expedition, campaign, result, cinematic, and existing dialogs stay within that shell. Removed the website header and footer. New Game requests fullscreen on its click; denied or unsupported requests leave the fixed viewport playable. The Haven film and canvas retain the same centered 16:9 stage. Safe-area offsets and viewport-fit are enabled.
- Baseline `python Ripple_Complete_Development_Kit_v1.2/tools/validate_assets.py`: PASS (274 assets, 6 atlases, 3 tilesets, 17 audio). `pnpm typecheck`: PASS. `pnpm test`: PASS (core, content, Haven, Living, reference Living, opening composition). `node Ripple_Complete_Development_Kit_v1.2/tools/test-input.cjs`: PASS. `python Ripple_Complete_Development_Kit_v1.2/tools/validate-living.py`: PASS (94 frames, 225 placements). `pnpm build`: PASS outside sandbox after the sandboxed Vite/esbuild launch failed with `spawn EPERM`.
- A headless Chrome screenshot of the built title was captured outside the sandbox. Chrome's `--window-size=390,844` command produced a 390px screenshot with a wider CSS viewport, so it is not evidence of the specified mobile layout. Actual click-through, Phaser screenshots, fullscreen fallback, and physical-device checks remain open. FS01 is in progress, not accepted.
- Remaining v1.2 blockers include a single persistent Phaser instance, browser verification of touch and modal input, compact overlay menus, adaptive cameras, cinematic handoff regression in Phaser, and full browser/physical-device acceptance. Existing scored replay and social rule tests passed; no chain or funding action was performed.
- Follow-on FS03 input increment: replaced the three visible four-button pads with one shared draggable joystick. It uses pointer capture, a 0.23 radial deadzone, horizontal tie breaking, 150 ms repeat, and clears input on pointer release/cancel, capture loss, focus loss, visibility change, fullscreen change, and modal disable. All three maps receive cardinal commands through their existing movement rules. `pnpm typecheck` and `pnpm test` passed after this change; the added analog quantization test passed. Touch drag and multi-touch still need browser and physical-device tests, so FS03 remains open.
- New Game now asks for overwrite confirmation inside the shell when an intro save exists. The Haven spawn is committed on the new cinematic handoff, avoiding restoration of the previous tile if the player reloads before moving. `pnpm typecheck` and `pnpm test` passed after this change. The new-save flow still needs a real browser test.

## Current milestone: M1 offline vertical slice

### B01 Workspace, CI and docs — in progress

- Added pnpm workspace manifests, React/Vite/Phaser app source, shared core package, CI workflow, `.env.example`, and setup documentation.
- Node v22.13.1 and pnpm v12.11.2 found.
- The initial `pnpm install` failed with `ERR_PNPM_STORE_DIR_OPEN_OPERATION_LOCK` on `C:\Users\Asus\AppData\Local\pnpm-store-operation-locks\all-stores.lock` (access denied). `npm view phaser@3.90.0 --offline=false` failed because the configured proxy at `127.0.0.1:9` refused connection. Dependencies and a complete lockfile later became available in this workspace; a clean frozen install and CI remain unverified.
- `git add` failed because `.git/index.lock` could not be created (permission denied); the working tree contains the source changes but no commit.

### B02 Content schemas and map validator — implemented, tests passed

- Added strict JSON Schema validation for both campaigns and route envelopes, map bounds/collision/stock checks, and canonical SHA-256 map hash verification.
- `python tools/validate_assets.py`: PASS, 274 assets, 6 atlases, 3 tilesets, 17 audio files.
- `node --experimental-strip-types packages/game-core/src/content.test.ts`: 2 passed, 0 failed. Uses a temporary local junction to already installed Ajv packages because pnpm install is blocked.
- A later rerun temporarily could not resolve Ajv because the linked external dependency tree changed. With workspace dependencies now present, the full `pnpm test` suite passes repeatably.
- `node --experimental-strip-types packages/game-core/src/validate-cli.ts`: PASS, map, two campaigns, two replay schemas, pinned hash.
- `tsc -p packages/game-core/tsconfig.json`: passed using an existing local TypeScript install.

### B03/B04 Pure reducer and pipe connectivity — implemented, tests passed

- `node --experimental-strip-types packages/game-core/src/game.test.ts`: 2 passed, 0 failed. Bridge route: 67 actions, 35 energy, 100 XP/RP. Detour: 92 actions, 11 energy, 100 XP/RP. Invalid actions preserve state.
- The supplied fixture routes are replayed through the pure reducer; no client score is accepted.

### B05/B06 Phaser expedition and guest loop — implemented, browser verification pending

- Added Base Camp and campaign screens, asset-backed map, Lofi/Aurora sprites, world state changes, movement controls, dynamic HUD, context actions, pipe modal using supplied puzzle art, and local result recap with action log.
- Web typecheck now passes with workspace dependencies present. Actual browser load, 360px layout, touch controls, asset 404 check, and clean Vite build remain untested. B05/B06 acceptance is not marked complete.

## Blockers and next work

1. Run a clean `pnpm install --frozen-lockfile` where pnpm store writes work; commit the complete `pnpm-lock.yaml` and source changes when `.git` is writable.
2. Run `pnpm build` and a browser walkthrough of both routes at desktop and 360px. Fix any integration issues found; `pnpm typecheck` and `pnpm test` now pass.
3. Add B07 sessions/API, then B08 server replay verification, then the Sui/ImpactFi/Aurora milestones in backlog order. No chain integration or transaction proof exists yet.

## Opening Kit v1.0 integration — 2026-11-19

- Extracted only the opening handoff, Haven fixture, cinematic background/terrain/reference, and MP4 from `Ripple_Opening_Kit_v1.zip`. Existing sprite, audio, map, replay, and reducer files were not replaced.
- Added `HavenScene` and `HavenView` to the real React/Phaser app. New Game plays the video over the preloaded scene; Skip Intro and video error reveal it through the same path. Controls activate on reveal; touch controls appear immediately, while HUD/tutorial appear after 250 ms or first input. Continue restores the saved hub tile, and Replay Cinematic preserves it. The world board at `(12,7)` opens Operation Komodo.
- `pnpm typecheck`: passed.
- `pnpm test`: 6 unit tests passed (4 existing core, 2 Haven); opening visual composition test passed at RGB MAE 0.000/255 versus `opening_last_frame.png`.
- `ffmpeg -sseof -0.05 ...` decoded the final MP4 frame. `python tools/test_opening_visual.py apps/web/public/qa/decoded-last.png`: passed at RGB MAE 1.281/255 versus reference. The QA artifact was removed after the test.
- `python tools/validate_assets.py`: passed (274 original assets, 6 atlases, 3 tilesets, 17 audio files). The Opening Kit files are checked by the new visual test.
- `pnpm build` was attempted before and after integration; Vite cannot launch its esbuild child process in this sandbox (`spawn EPERM`). Direct `esbuild.exe` bundled the app successfully for a local browser attempt.
- Headless Chrome and Edge were attempted against that bundle. Both failed to start due access denied in browser crashpad/Mojo and produced no screenshot. A rendered Phaser screenshot comparison, playback/skip interaction walkthrough, and mobile viewport check remain open. Do not mark production visual QA complete.
- `git add` was retried for the opening files and again failed to create `.git/index.lock` (permission denied), so this increment is uncommitted.

## Living World Expansion v1.0 — 2026-11-19

- LW01: Merged the add-on atlas, 94-frame manifest, standalone plaza tile, terrain extension, runtime map, configuration, source art and reference tests without replacing original assets. `python tools/validate-living.py` passed: 94 frames, 225 placements and map/texture consistency. `python tools/validate_assets.py` passed all 274 original assets.
- LW02: Added `GroveScene` with the fixture's 40×28 terrain, authoritative blocked tiles/approaches, 640×360 following camera, Y-depth object placement, keyboard, touch pad and tap-to-walk BFS. The reference Node test passed 829 reachable tiles and 47 reachable interactions. Phaser has been bundled, but a rendered browser walkthrough remains unverified.
- LW03–LW05: Added typed social state rules and UI for all seven NPC dialogues, one-time quests, eleven animals (six care, five observe only), friendship/daily locks, crop stages, watering, harvesting, pump, fishing, produce trade and confirmed rest. Successful care/actions trigger visual feedback and existing audio. `apps/web/src/living.test.ts` passed four rule, anti-repeat, atomicity and save tests.
- LW06: Haven's post-tutorial board now offers the expedition and Grove. Returning validates the original board approach `[11,7]`; local social state is stored at `social.komodoGrove.v1:guest`, independent of Haven intro/position and scored expedition state. Corrupt saves fall back to a fresh social state. No RP, XP, funding or chain rewards are created in Grove.
- LW07: Added zone label, minimap position, contextual panel, dynamic village inventory/quests/friendship/crops, responsive layout and reused Audio Pack v2. Actors remain stationary as required for initial acceptance. Browser visual/mobile checks remain open.
- LW08: Final `pnpm typecheck`, `pnpm test`, `pnpm validate:content`, `python tools/validate-living.py`, and `python tools/validate_assets.py` all passed. The suite includes four core tests, two Haven tests, four living tests, supplied living reference test, and opening composition regression (RGB MAE 0). The decoded MP4 final frame passed at RGB MAE 1.281/255. Direct esbuild CLI bundling passed. `pnpm build` remains blocked by sandbox `spawn EPERM` when Vite launches esbuild. Headless Chrome was retried and failed to start with `Access is denied` in Crashpad/Mojo, so actual Phaser/browser/screenshot tests cannot be claimed complete here.
- No Sui transaction, funding transfer or AI publication was attempted. This increment is uncommitted because `.git/index.lock` is not writable in this environment.
## v1.3 art and gameplay polish

- RP01. Captured the actual built title, Haven and Grove before editing at 1280×720, 1920×1080, 390×844 and 844×390. The title reused a campaign image containing baked text. Each scene tweened an idle texture. Grove forced the full landscape canvas into its portrait parent. Frame hashes and missing authored cycles are in docs/animation-coverage.json.
- RP02. All three scenes share a directional walker with 10 fps frame changes, last-facing idle, depth from feet and a step shadow. The cinematic starts on the original down-facing frame. Dedicated authored action cycles remain incomplete.
- RP03. Authored patrol destinations for seven villagers and land animals use the existing bounded pathfinder. Conversations use live positions and face the speaker toward Lofi. Animal care adds food or toy choreography. More species-specific work and rest sequences remain.
- RP04. Shared portrait plates, energy track, slot art, primary and secondary buttons, inventory selection, pause mixer and bottom portrait dialogue. The village journal has Items and Quests tabs. Dialogue supports reveal, advance and dismissal. Branching quest dialogue and a single persistent Phaser instance remain open.
- RP05. Aurora and Lofi introduce the world board through dialogue. Existing objectives, accepted actions, inventory and replay reducers drive the expedition. Expanded quest-specific dialogue remains open.
- RP06. Adaptive portrait cameras, Aurora pulse, swimming fish, directional NPC poses, material-specific gather cues and separate mix controls. Further authored environmental transitions and ambient art remain open.
- RP07. Production Chrome walkthrough covers denied fullscreen, cinematic skip, dialogue, keyboard movement, mobile joystick release, board travel, village inventory and no body overflow at four viewport sizes. See docs/qa/rpg. Physical device testing, measured frame timing, browser walkthroughs of every animal and farm action, and exact first-frame Phaser pixel comparison remain open.
- pnpm build and the repository lint/typecheck passed. pnpm test passed both scored golden routes, social-state tests, input quantization and the offline opening composition comparison. Content validation passed the pinned map hash. Asset validators passed 274 base assets, 94 Grove frames and 225 placements.

## Expedition and sprite correction

The production browser harness now plays the complete Operation Komodo expedition with normal controls. It checks the accepted action log against the supplied route at extraction. Run node tools/qa-rpg.mjs mission against the served build. Both 1280×720 and 390×844 completed the bridge route with 67 actions and 35 energy left. Both 1920×1080 and 844×390 completed the ford route with 92 actions and 11 energy left. The mobile expedition used Chromium touch events on the joystick and Act button. The puzzle used DOM button activation. Physical phone checks remain open. Separate title, tutorial, board, village and inventory walkthroughs passed at all four sizes.

Fixed sprite pose resets during stationary actions, added pickup travel and eased tool motion, and enabled held movement in the expedition. The bridge prompt shows its additional wood requirement and the southern ford alternative. Construction now leaves the well visible until the player opens the puzzle. Waterworks shows remaining pipe stock, connected homes and the reclaim operation. Reworked panel and button border scaling and reduced the visual size of Grove animals by species. Original replay, asset, social, composition and content tests passed. The production build passed.

## Camp scale, expedition briefing and exhaustion

QA inspection index: docs/qa/rpg/README.md. The title uses the Haven scene with drifting snow. After the cinematic handoff, Haven draws terrain and scale-adjusted props as individual sprites. Grove uses smaller campfire, berry bush and planters. Expedition action poses align their visible height to the standing pose (36 pixels). The board now opens Aurora’s briefing on the actual expedition map. Building a well prompts Waterworks; connecting both houses directs the player west to extraction. Spending the last energy displays expedition failure with retry and return controls. Core replay tests, asset and content validators passed. Browser evidence covers both successful routes and exhaustion followed by retry.

## Grove conversations and quest hand-in

The rounded dialogue surface now shares the same silhouette for the border and parchment. Toma and Ari respond to first meetings, active objectives, ready rewards and prior claims. Both the journal and their dialogue use the existing claim reducer. Nearby interactions offer a choice when more than one target is reachable. Optional English speech uses the browser speech synthesizer and stops on dialogue dismissal or a change of line. Audible voice quality has not been assessed on physical devices.

The production build and existing unit suite passed. Browser QA uses a prepared eligible social save, opens the actual NPC conversation and checks the saved reward and claim status. Reproduce with node tools/qa-rpg.mjs quest. Evidence is in docs/qa/rpg/current/quest-*-reward.png.

## Haven highlands, sound and returning-player confirmation

Haven now has an eastern circuit with four inspectable landmarks, a frozen lake and persisted exploration positions. Foot movement and blocked directional input no longer trigger expedition and Grove UI sounds. Music and ambience start at zero for fresh audio settings. Dialogue speech is opt-in. The returning-player prompt uses Aurora's portrait, the dialogue frame and Ripple button artwork, with initial focus on keeping the save.

Verified with pnpm build, pnpm test, pnpm validate:content and the highlands Chromium walkthrough at 1280×720, 1920×1080, 390×844 and 844×390. The walkthrough cancels and confirms the restart prompt, walks to each landmark with keyboard input and verifies saved positions. Touch on physical devices and subjective sound quality were not tested in this pass.

## Haven controls and trail journal

Haven previously ignored repeated keydown events without scheduling subsequent steps. Holding WASD or arrows now repeats cardinal steps at the joystick cadence (150 ms). Key release, focus loss, fullscreen changes and leaving gameplay cancel held input. Browser QA verifies that a single keydown crosses multiple tiles, keyup stops movement, and a dialogue cancels a held key even after closing. It also collects the four persistent stamps and opens the completed backpack journal at all four reference viewport sizes. Production build, unit suite, opening composition and asset validator passed. Mobile viewport checks for this route use keyboard emulation.

Three small birds react to passing hikers on the highland circuit. Trail stamps are local exploration records, reset at the new-game handoff. The stamp uses the locally bundled ISC-licensed Lucide artwork.

## Grove village atlas and character motion

The backpack map renders canonical terrain, landmark footprints and an actual walking route to each selected destination. Grove uses the same held-key input as Haven. Patrols avoid reserved destination tiles. Tapping a moving character checks their live position again before opening the interaction.

Seven villagers and Biscuit have new four-frame lateral strides. Stable foot anchors, unique frames and sheet dimensions pass tools/validate-living.py. The downloaded book, cloth and coin sounds all have valid Ogg durations. Audio quality on physical speakers has not been evaluated. North/south stride art and species-specific care cycles remain outstanding.

Production build, core replay tests, content/asset validators, living state and opening image comparison passed. Chromium walkthrough of the map and market approach passed at 1280×720, 1920×1080, 390×844 and 844×390.

## Grove animal walk cycles increment

- Added 4-frame lateral walk strips for all five remaining Grove domestic animals: Miso (`cat-walk.png`), Mochi (`goat-walk.png`), Cloud (`sheep-walk.png`), Sunny (`chicken-walk.png`), and Puddle (`duck-walk.png`). All 13 walk sheets (7 villagers + 6 animals) use 48×48 px frame cells with unified foot anchors passing `tools/validate-living.py`.
- Updated `GroveScene.ts` to preload, generate animations, and animate animal movement across cardinal directions, returning cleanly to idle poses.
- `pnpm test`, `python tools/validate-living.py`, and `pnpm build` passed without warnings or errors.
- Production Chromium QA walkthrough (`node tools/qa-rpg.mjs atlas`) verified route pathing, animal locomotion, and destination interactions across 1280×720, 1920×1080, 390×844, and 844×390 viewports.

## Eastbank exploration and domestic animal review
Reviewed c8fda3a and replaced five seamed domestic walk strips with four distinct connected poses per species. Grove now spans 64×28 tiles, with 1,355 reachable tiles and 49 reachable interaction objects. The east exit from Market Lane leads to a new orchard circuit. The journal offers routes to all village buildings. Water for Eastbank starts by reading the survey at the water lab and finishes at the nursery valves. Completion persists and changes the nursery beds. Houses, seed store, barn, recycling station and well have individual inspection text.

pnpm test, build, the repository lint/typecheck script, content validation and both asset validators passed. The social tests cover old save defaults, range checks, incorrect water distribution, correct completion, repeat prevention and reachable building approaches. The Chromium atlas walkthrough visits the lab, travels to the nursery, solves the gate and verifies persisted completion at the four reference viewport sizes. Evidence is generated in docs/qa/rpg/current. Mobile viewport runs use browser emulation.
