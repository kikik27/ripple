# Asset integration contract for coding agents

## Source of truth and naming
- Game mechanics, costs, state and collision: Agent Handbook + fixtures, not visual art. The asset manifest is source of truth for image path, dimensions, origin and atlas frame. No asset IDs or coordinates supplied by AI directly without validation.
- Do not use raw art sheets in the runtime; use the prepared atlas or individual PNG. Do not re-slice atlas using uniform grid: only fixed sheets `yeti_walk.png`, `aurora_pulse.png` and `terrain_32.png` support grid slicing.
- Set `pixelArt: true` and `roundPixels: true`; prefer integer world zoom. Character 48×48 with origin (0.5, 40/48); props 64×64 bottom-origin (0.5,62/64); item icons 32×32; puzzle cells 48×48. Foot world anchor is at tile center x and y+30. Use depth from world foot Y; do not derive collision from visual silhouette. Never stretch character sprites non-uniformly.
- Texture atlas JSON is Phaser JSON Hash; load `atlases/<category>.png` + `.json`. Explicitly set origin from manifest; do not assume Phaser reads pivot. Render fallback rectangles if asset missing during dev, log once. Missing P0 asset is a release blocker.

## A01–A12 coverage
| ID | Delivered runtime assets | Notes |
|---|---|---|
| A01 | yeti_idle_{dir}, yeti_walk_{dir}_{00..03}, carry/build/celebrate/portrait | Starter gait, two source poses per direction |
| A02 | aurora_idle, side, happy, portrait, pulse_00..03 | 32px companion; 128px portrait |
| A03 | terrain_32, tropical_v1, tile_grass/dry_grass/dirt/river/ford/border/banks, tropical props | Procedural seamless terrain, not raw source tile grid |
| A04 | snow_v1, tile_snow/ice/snow_rock/camp_path/planks, camp props | Reusable snow environment |
| A05 | node_wood/stone/metal_full + depleted | State toggles after stock reaches 0 |
| A06 | bridge_broken/repaired + 3 intermediate props, workshop, well_empty/built/flowing + 2 intermediate | `tile_bridge_*` overlay for 1-tile fixture; large bridge props for cinematics |
| A07 | home_dry/restored, greenery, 4 animated effects | House variants same geometry |
| A08 | icon_wood, stone, metal, kit, energy, bag, xp, rp + extras | 32px PNG |
| A09 | puzzle_empty/source/home/blocked and 15 dry/wet pipe masks | N=1 E=2 S=4 W=8; tile 48px |
| A10 | modular panels, buttons, empty slot, HUD track/fills, minimap frame, dpad | UI values drawn separately |
| A11 | Ripple logo (wide/square), app icons, emblem, campaign thumbnail | Provisional artwork |
| A12 | 13 OGG SFX, 2 music loops, 2 ambience loops (v2) | Starter audio; user gesture starts sound |

## Runtime UI implementation
- Profile: `hud_profile_frame_empty`/CSS plate + `yeti_portrait` + username/level text + two dynamic meters. Never draw the original composite pre-filled status graphic.
- Energy and XP: read values from game reducer (100 max energy by fixture; XP max from current level). Health asset is optional and not an extra P0 gameplay mechanic.
- `bar_track_empty` 240×24; interior starts (4,4), 232×16; use bar fill with clipped width `clamp(current/max,0,1) * 232`. If max <=0 show zero; don't render NaN. Label and numeric text separate. Use CSS for responsive sizing and accessible progressbar semantics. Button hover/pressed/disabled asset variants have no text. Frame backgrounds do not store values or state. Use `minimap_frame_empty` over a generated map texture; don't use raw minimap screenshot.
- Inventory: 8 units from reducer, not 8 distinct stacks necessarily. Render stack count dynamically; the example shows up to eight visual slots. Well kit consumes 4 capacity. Do not infer capacity by number of occupied cells; use rules and show weighted capacity.
- Virtual RP and confirmed fundraising MUST remain separate bars. For testnet label `Demo funding` and never present as real money or a physical outcome. No donation-to-XP multiplier.
- Puzzle: paint empty tile, select a pipe mask by N/E/S/W adjacency; choose wet variant only when validated reachable from source. Do not use asset connectivity as validation; reducer owns graph.
- Main map: visual fixture positions from `examples/map-komodo.json`; render grid separately from collision layer. Bridge tile overlay aligned to (11,10), ford tile at (11,17). Swap `well_empty` -> `well_built` -> `well_flowing` on confirmed reducer state. Home state changes only after puzzle completion. Resource sprites from node stock.
- FX: non-blocking visual tween; do not trigger game state updates from animation end event. Respect reduced motion settings; optional sound and music toggle.

## Agent tasks / acceptance
1. Copy only runtime assets to public directory; leave source in art folder.
2. Load atlases and tiles, verify dimensions and no 404. Validate asset pack using Python script. Integrate `asset-loader.ts`, apply explicit anchors and integer zoom.
3. Bind visuals to deterministic state; do not rewrite replay rules or map grid.
4. Render UI with dynamic values; test zero/max/over-max/zero max; verify empty fill at 0, full at max; update both text and width. Confirm RP and funding distinct.
5. Run before/restored states with both fixture replays. Ensure decorative assets do not block movement, and sprites align at feet. Test mobile viewport, keyboard and touch. Confirm alpha edges and readable icons at 1x/2x.
6. Preserve source files and manifest. For future art add ID + provenance and regenerate atlas without renaming existing frames. Run project CI and playtest; this pack validation does not certify Phaser integration or final art quality.

## Next polish (P1)
- Artist-authored four unique walk frames per direction; true tropical homes, richer grass-to-dirt transitions and riverbanks; additional campaign biomes; NPC back/left directions; dedicated world-map art. Current runtime is a consistent MVP baseline, not final production art.
