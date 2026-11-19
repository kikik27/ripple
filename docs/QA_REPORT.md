# Historical visual asset QA (v1.0)

See MERGE_QA.md for current Ripple v1.1 checks.


Executed `python tools/validate_assets.py`: PASS — 274 individual PNG entries, 6 atlas JSON/PNG pairs, 3 terrain tilesets, 2 fixed character sheets, animation refs, file presence and map bindings. Atlas crops match exact individual PNG pixels. Individual transparent asset backgrounds and dimensions checked.

Visual inspection: character sheet montage, structure and vegetation montage, icons, UI and rendered Komodo map; removed stray disabled-button fragment above wide panel. Source tropical sheet had a matte; isolated runtime props and created seamless floor tiles instead.

Browser QA: standalone HTML loaded in-memory in Chromium (local file/localhost navigation blocked by execution environment). Tested initially empty HUD, demo energy 65%, XP, RP 64%, funding 25%, inventory 5/8, restore toggle, energy 100%, reset back to zero, no JS exceptions, mobile 390px viewport without horizontal overflow. Screenshots are from this test. The standalone file embeds assets, and no external server is needed to open it in a normal browser. No full Phaser application was run; TypeScript examples are integration references. Audio files generated and existence validated, not listening-tested.

Open polish: artist-drawn unique walk cycles, tropical home redesign, more detailed terrain transitions, more biomes and actual game playtest. Brand usage must be cleared before public launch.
