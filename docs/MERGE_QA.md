# Ripple v1.1 consolidation QA

- Asset manifest: 274 gameplay images, 6 atlases, 3 tilesets, 17 audio keys, 12 branding keys. `python tools/validate_assets.py` passed exact atlas crops, sprite frames, tiles, origins, dimensions, alpha and map bindings.
- All original fixture bytes identical; four campaign/replay documents validate against JSON Schema.
- All 17 audio files byte-identical to approved v2 pack; all embedded audio lab samples match those files; standalone asset lab embedded audio files also match.
- Rebranded title, schema titles, handbook, manifest, metadata, loader, HUD, campaign thumbnail and HTML examples. No old game title in text. Lofi the Yeti retained as character.
- HUD preview aligns with handbook 500 RP, 25 DEMO_CREDIT; no real money.
- Source board is concept art only; actual gameplay art preserved. No font binaries, secrets, or deployed game.
- Full Phaser integration, sound aesthetic, real fundraising, trademark clearance and partnership authorization remain unverified. Prior visual/audio QA reports refer to previous source versions. New Chromium test passed: empty HUD, 100/500 RP, 25/25 DEMO_CREDIT, inventory 5/8, restored map toggle, reset to zero, 390px viewport, 17 audio controls, no JS errors. Audio listening and playback mixing in the actual game were not tested.
