# QA — Living World v1.0

Verified in this package:
- 94 normalized transparent individual frames exactly match atlas rectangles. Standalone plaza tile 32×32. All texture IDs resolve against add-on manifest or base kit dependency mapping.
- Map fixture/runtime JSON identical. 225 unique object IDs, authoritative blocked footprint positions, 829 spawn-reachable tiles, all 47 interactables have reachable approach tiles. No file paths collide with either original kit or opening kit.
- After applying add-on to a temporary copy of Complete Development Kit v1.1, validator confirmed the referenced base asset files exist.
- Node reference tests passed for proximity, correct feed consumption, repeat rejection, play, observe-only animals, quest claim, harvest, trade, watering, rest progression, fishing limit, no score/funding state, map reachability.
- Chromium standalone embedded HTML tested with real UI interactions: route to dog, feed/play, duplicate feed rejected, route to farmer, talk, route to plot, harvest, quest claim. Mobile viewport 390 px: no horizontal overflow and touch move. No page errors during desktop run. Python browser test requires Playwright + Chromium installed (adjust executable path if needed).
- Source crop preview reviewed; chicken/duck alpha and crop edges corrected. Some sprite art is starter quality, mirrored directions, no full walk cycles.

Not verified: actual Phaser integration (not present), save persistence, dynamic patrols, species-specific play minigames, production transition from Haven to Grove, audio in the lab (not included), and full-game performance. The add-on preserves original intro/expedition files by never overwriting them, but actual runtime regression must be tested by agent after integration. No on-chain or live donation features added.
