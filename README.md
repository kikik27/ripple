# Ripple — Complete Development & Resource Kit v1.1

**Small Actions. Big Impact.**

Cozy top-down adventure featuring Lofi the Yeti and Aurora; Sui Testnet / Play-to-Impact demo. This is an implementation-ready specification and resource bundle, not a compiled or deployed game.

## Start here
1. Extract this archive into an empty repository (or merge into an existing one carefully).
2. Read `AGENTS.md`, `docs/HANDBOOK.md`, `planning/backlog.json`, schemas and fixtures.
3. Read `AGENTS_ASSETS.md`, `docs/BRAND_GUIDE.md`, `docs/ASSET_HANDOFF.md`, `docs/AUDIO_HANDOFF.md` and `LICENSES.md`.
4. Open `examples/asset-lab-standalone.html` and `examples/audio-lab.html` in a browser. Run `python tools/validate_assets.py` (Pillow).
5. Start B01/B02, then build offline expedition, verifier, Sui, AI in that order. Actual integration and testing are required.

## What's included
- BRD, PRD, GDD, architecture, contract and security specs, 20 backlog tickets, schemas, deterministic map and replay fixtures.
- 274 original visual assets, 6 Phaser atlases, 3 tile sets, 2 fixed character sheets; Ripple logo and app icons, PWA metadata and brand config.
- 17 audio v2 files (2 music, 2 ambience, 13 SFX), audio settings and metadata.
- Phaser/React integration references, dynamic HUD, preview labs and asset QA.

## Important boundaries
Game mechanics and fixture IDs unchanged. No real donation, mainnet, production auth, deploy or runtime game provided. The current art and audio are MVP baseline; final playtesting and IP approvals remain necessary. For demo funding use DEMO_CREDIT (25 target; 100 RP threshold; 500 RP community goal).

## Prompt for coding agent
Read AGENTS.md and the entire handbook. Implement P0 in backlog dependency order using the bundled assets/manifest and brand-config. Preserve fixtures, separate virtual RP and demo funding, no fabricated transaction IDs. First deliver an offline playable Operation Komodo; run real tests after each milestone.
# ripple
