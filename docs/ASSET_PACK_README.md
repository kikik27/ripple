# Ripple — MVP Asset Pack v1.1

Bagian dari Ripple Complete Development & Resource Kit. Semua runtime asset lokal, no external CDN. Target: Phaser 3, 32 px tile grid, original cozy pixel-inspired visuals. Ini asset pack, bukan game lengkap.

## Mulai dalam 3 langkah
1. Ekstrak ZIP. Salin `apps/web/public/assets/` ke folder yang sama pada repo game (merge, jangan overwrite kode game). Salin `integration/` sesuai kebutuhan. `art/source/` adalah master referensi, bukan runtime.
2. Buka `examples/asset-lab-standalone.html` (semua aset ter-embed) atau `examples/hud-demo.html` di browser setelah ekstraksi: preview HUD interaktif, slider, inventory, arah animasi, audio dan map before/restored. Tidak memerlukan server atau wallet. `examples/komodo_before.png` dan `komodo_restored.png` adalah contoh layout, bukan map collision.
3. Coding agent baca `docs/ASSET_HANDOFF.md`, `asset-manifest.json`, `animations.json` dan `examples/map-asset-bindings.json`. Gunakan `integration/asset-loader.ts` dan `GameHUD.tsx` sebagai contoh; integrasikan dengan reducer/state yang sesungguhnya.

## Isi
- 274 PNG individual runtime dengan ukuran dan anchor baku; 6 atlas Phaser (sprites, props, icons, ui, fx, puzzle), 3 tileset 32 px, 2 spritesheet animasi, logo, app icon dan thumbnail, 13 SFX, 2 music loops dan 2 ambience loops (audio v2).
- UI tidak menggunakan status bar yang terisi permanen. `bar_track_empty.png` + `bar_fill_*.png` + text runtime. Profile plate dan minimap frame kosong.
- `art/source`: 8 sheet original, untuk revisi/cropping di masa depan.
- `tools/validate_assets.py`: audit ukuran, alpha, manifest, atlas crop, animasi, tile indices, audio existence dan fixture mapping.

## Catatan desain
Animasi 4-frame starter memakai 2 pose sumber (idle/step) dengan mirror/bob; belum full hand-drawn walk cycle. Rumah tropis merupakan recolor rumah sumber. Terrain dasar dibuat procedural supaya tidak ada border kotak yang terlihat saat tiling. Efek, atlas, dan interface adalah starter art, bukan hasil playtest lengkap. Preview map menggunakan fixture resmi handbook; dekorasi tidak mengubah collision. Audio v2 adalah aransemen synth dan Foley-style baru; perlu audition dalam game. Lihat LICENSES.md untuk batas penggunaan brand.
