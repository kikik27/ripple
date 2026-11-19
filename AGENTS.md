# AGENTS.md — Ripple

## Mission
Build a playable browser game, not a donation dashboard with a minigame. Deliver a vertical slice on Sui Testnet: discover a campaign, explore a map, gather, craft, build a well, connect water, verify the expedition, record a contribution and release an already-funded demo sponsor milestone. No real funds, no official affiliation claim.

## Read order / sources of truth
1. `docs/HANDBOOK.md` (BRD, PRD, GDD, technical spec, QA, delivery).
2. `planning/backlog.json` (dependency-ordered tickets; P0 is mandatory).
3. `schemas/campaign.schema.json` and `fixtures/operation-komodo.json` (content contract).
4. `fixtures/map-komodo.json` (deterministic playable map; coordinates are tile x,y, zero-indexed).
5. `schemas/replay.schema.json` and `fixtures/replay-example.json` (submission protocol). The handbook governs domain semantics; JSON schemas govern shape; resolve conflicts explicitly before implementation.

## Resource integration
Read `AGENTS_ASSETS.md`, `docs/BRAND_GUIDE.md`, `docs/ASSET_HANDOFF.md` and `docs/AUDIO_HANDOFF.md`. Use the bundled assets and audio v2; keep existing sprite IDs and fixture IDs. Title is Ripple; Lofi is the protagonist, not the product title. Read `brand-config.json` and use `DEMO_CREDIT` in demo HUD, never USDC. Run the asset validator before implementation.

## Non-negotiables
- Local gameplay first, then server replay, then chain, then AI. Keep a runnable demo at every milestone. Use the supplied Ripple assets by manifest ID; record provenance in root `LICENSES.md`. Never scrape/redistribute protected art without permission.
- Phaser 3.90.x + React + TypeScript + Vite; Node LTS/pnpm; pin exact compatible versions in lockfile, verify current Sui SDK methods from official docs. Use a deterministic pure TypeScript reducer shared by browser and server. Never trust client score, XP, RP, donation amounts, or campaign IDs supplied without validation.
- Sui Testnet only; demo `DEMO_CREDIT` has no monetary value, separate from SUI/USDC. Use wallet approval for every user transaction; admin/verifier secrets server-side. No mainnet, no custody, no live donation forwarding or automated sponsor transfers without human release gates. Do not fabricate transaction IDs or success.
- AI produces schema-constrained draft from allowlisted data; human approves; never provide signer access or recipient address to the model. In offline/demo mode label fixtures and mock behavior.
- Free play is complete; wallet optional until onchain action. No token rewards, pay-to-win, lootboxes, or donation-gated story. Separate gameplay progress, funding transfer, and verified physical outcomes.
- Do not add real-time multiplayer, marketplace, NFTs for every item, blockchain per movement, arbitrary generated code/maps, or paid infrastructure to P0.

## Agent workflow
At start inspect repo, read specs, check current toolchain, run baseline commands. Pick one unblocked ticket, state files/tests/acceptance criteria, implement small vertical increment, run lint/typecheck/unit/e2e or Move tests, record real results and blockers in `STATUS.md`. Do not mark complete if tests are not run; never silently skip security checks. Maintain `README.md`, `.env.example` (no secrets), `DECISIONS.md` for changes, and `DEPLOYMENTS.md` for verified testnet IDs. Preserve existing work. Ask owner before real expenditure, external publishing, changing money rules, licensing or scope. Use mocks for absent services with visible UI labels. Commit logical diffs; no destructive commands without approval.

## Definition of done
P0 ticket acceptance passes, tests are automated where practicable, error and retry paths are covered, accessibility and mobile controls checked, no secrets, documented setup, demo reproducible. Final release requires successful replay verification, no duplicate rewards, onchain event/receipt proof, separate progress displays, and an explicit testnet banner. Run final walkthrough from a clean install. See handbook sections 17–20.
