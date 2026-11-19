# RIPPLE — Opening cinematic handoff v1.0

## Creative direction
An original 40-second, 16:9 sprite-based motion cinematic (not live-action, 3D or a fully hand-drawn animation). It uses existing Ripple mascot, Aurora, terrain, structures, music and SFX. Opening captions are English, matching the handbook. Komodo is a vision of possible virtual restoration, not proof of a completed real-world project or an active fundraiser.

| Time | Chapter | Action |
|---|---|---|
| 00–07 | The Himalayas | Mountain panorama, snow, Ripple logo |
| 07–14 | The awakening | Lofi emerges from melting ice |
| 14–21 | Aurora | The companion appears and invites Lofi to explore |
| 21–28 | A world in need | Stylized Komodo before/after vision |
| 28–35 | Himalayan Haven | Lofi walks into base camp and settles at spawn |
| 35–40 | Handoff | Camera settles, captions vanish, the game scene holds |

## Integration contract (normative for this opening)
- Apply this overlay to Ripple Complete Development Kit v1.1. Keep all existing expedition, replay, reward and contract fixtures unchanged.
- `fixtures/himalayan-haven-intro.json` is the new hub layout fixture; identical runtime copy at `/assets/cinematic/haven-scene.json`. No need to modify Operation Komodo's own spawn or collision rules.
- The video is `/assets/cinematic/ripple_opening.mp4` (H.264, AAC, 1280×720, 24 fps, 40 s). Render it in a 16:9 stage. Do not crop the video to fill portrait displays. Letterbox the game and video identically.
- Preload the background, player and Aurora textures, and render the scene behind the video before playing. Scene viewport: 640×360 logical pixels, camera scroll `(0,12)`, map bounds 640×384, no zoom except display scaling. Use nearest-neighbor pixel filtering.
- The background is `haven_background.png`, baked from the actual 32px terrain and prop placements. `haven_terrain.png` and the JSON allow a future layered renderer. When using the baked background, do not draw the same props again. Use JSON blocked tile positions for collision; improve occlusion/depth sorting later without changing the handoff shot.
- Set player sprite `yeti_idle_down` at world (304,240), origin (0.5, 40/48); Aurora at (336,228), origin (0.5,0.5). Do not spawn at the map center or Komodo spawn. Game state is energy 100, XP 0, empty inventory, guest, no wallet needed. On the first visible frame, keep the HUD and tutorial bubble hidden; reveal them after ~250 ms or the first input. Do not fade to black between film and gameplay.
- Keep background, camera, positions, facing, and texture unchanged on video `ended`; reveal the already rendered Phaser scene and enable input in the same callback. A skipped/failed video must enter the same scene with identical state, not a different map. The sample adapter expects synchronous reveal of a preloaded scene.
- On new game only: play the opening after a user gesture (browser audio policies). Save `introSeen` after successful handoff, including deliberate skip. Returning player loads save state instead of resetting to this spawn. Provide Replay Cinematic in settings; replaying from a saved game must not overwrite player progress. Prototype demo intentionally resets its temporary local state.
- First tutorial: Aurora welcomes Lofi, then directs to notice board (tile 12,7; interact from 11,7). Workshop is at tile 9,4. Board opens the published Operation Komodo campaign in the real implementation. Demo only shows textual placeholders. Avoid wallet prompts during cinematic or initial tutorial.
- Audio: opening mix uses music_hub and ambience_camp with cue SFX. Fade/transition to hub loop without silence; prototype restarts hub music at handoff. Production can resume music at offset ~40 s (modulo duration) or perform a short crossfade. Honor mute/volume settings.
- The scene has no real-money donation or AI execution; those remain as defined by the main handbook.

## QA and acceptance
- Film ends with the exact composition generated from the runtime scene (no caption or title on the final four seconds). Lossless PNG reference `opening_last_frame.png` is provided. Final decoded MP4 vs PNG mean absolute RGB error is 1.281/255 due to H.264 chroma/lossy compression.
- Chromium Canvas reference vs lossless PNG (at 640×360) RGB MAE 0.000463/255; tiny alpha compositing rounding. No positional mismatch.
- Standalone browser demo tested via embedded HTML: real video playback seek to 39.5s and `ended`, canvas reveal, move east twice and interact with board, replay then skip, same spawn on skip, mobile 390px touch control and no horizontal overflow. No production Phaser runtime integration tested. Local file/localhost navigation was blocked in the QA environment; embedded HTML was tested using set_content.
- Full 40 s media file inspected with ffprobe; video and audio streams present. Visual frame samples checked, no claim of human listening test.
- Production acceptance: check new game, skip, error fallback, return-to-save, replay without state reset, muted mode, keyboard/touch, letterboxing, mobile load. Confirm actual Phaser rendered screenshot matches reference at handoff. Run tests before marking production-ready.

## Agent task
Implement after the base web shell and hub are available; do not block the offline expedition milestone. Read AGENTS.md and HANDBOOK.md, then this document. Add Intro/Hub transition state machine. Reuse existing textures and the new fixture; integrate the adapter or equivalent. Preserve original IP/licensing caveats and DEMO_CREDIT semantics. Record work in STATUS.md.
