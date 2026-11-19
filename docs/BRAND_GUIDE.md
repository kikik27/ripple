# Ripple — Brand guide

**Title:** Ripple · **Tagline:** Small Actions. Big Impact.

Lofi the Yeti is the playable protagonist; Aurora is the AI companion. Ripple is the game brand, not the official name of Lofi Foundation or an official partnership claim. For submission use `Ripple`; explanatory text may say “A cozy adventure featuring Lofi the Yeti” subject to permission.

## Runtime assets
- `branding/ripple_logo.png` 1536×1024 transparent master title lockup; preserve aspect ratio.
- `branding/logo_1024.png` square compatibility image; `ripple_logo_768.png` compact.
- `branding/ripple_emblem_1024.png` decorative no-text emblem.
- `branding/app_icon_192.png`, `app_icon_512.png`, `app_icon_maskable_512.png`, `icon_16.png`, `icon_32.png`, `icon_48.png`, `icon_180.png`, `/favicon.ico`. Use portrait-based app icon for small sizes; keep it separate from logo.
- `campaign_komodo_1280x720.png` rebranded campaign thumbnail; original map region preserved.
- `brand-config.json` is the single source of truth. `/manifest.webmanifest` contains PWA metadata/icons; service worker/install behavior is not included.

## Design rules
Preserve the original cozy visual system: navy, glacier blue, snow, teal, leaf green, earth and parchment. Do not redraw NPCs from the concept poster (it includes alternate designs). Keep the source board in art/source, never as a sprite atlas. Use system fonts (no font binaries), readable dark text on cream, responsive UI, and separate dynamic fill and text. Use wordmark at menu and loading, hero icon at favicon, emblem for achievement/marketing only. No old title assets, no donation-gated power or official Foundation claims.

## Main menu integration
Use `/assets/branding/ripple_logo.png`, tagline as real text, Play / Campaigns / Settings, Sui Testnet badge and optional wallet. Read current player data only when available. Keep movement, map fixture and game balance unchanged.

## Release gate
Ripple is a working title; name availability, trademark clearance, Lofi character/brand permissions and Foundation integration must be verified prior to public release. Do not imply endorsement.
