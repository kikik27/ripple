# Ripple — Fullscreen RPG development kit v1.2

## Implementation in progress (2026-11-19)

The offline Operation Komodo source is in `apps/web` and the deterministic rules are in `packages/game-core`. New Game plays the Opening Kit cinematic over a preloaded Phaser Himalayan Haven scene. After Aurora's tutorial, the world board offers Operation Komodo and the new Komodo Grove social hub. Grove spans 64×28 tiles including Eastbank Nursery. Visit the water lab and follow Market Lane east to restore its irrigation. The optional activity persists in the local social save. See `STATUS.md` for browser walkthroughs and test coverage. No onchain action, live funding, or AI publication is connected. Demo credit has no monetary value.

The v1.2 player route now uses a fixed viewport game shell and requests fullscreen when New Game is clicked. This is an FS01 increment, not a completed v1.2 release; see `STATUS.md` for the current tests and remaining browser and input work. The bundled kit is in `Ripple_Complete_Development_Kit_v1.2/`.

For a Node 22 environment, run `pnpm install --frozen-lockfile` and `python -m pip install -r requirements-dev.txt`, then `pnpm validate:content`, `python tools/validate_assets.py`, `python tools/validate-living.py`, `pnpm typecheck`, `pnpm test`, and `pnpm build`. Start the local game with `pnpm dev:offline`. The Opening and Living World handoffs are in `docs/OPENING_HANDOFF.md` and `docs/LIVING_WORLD_HANDOFF.md`. The original expedition fixtures and rules remain in their supplied locations. Production use requires the permissions and checks in `LICENSES.md`.

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

After Operation Komodo, Lofi returns to the Himalayan Haven board. Press E or Act to see completed and available tasks. To explore the Highlands, step south from the starting spot and follow the wide road east past the sign. Local task history is tied to this browser.
