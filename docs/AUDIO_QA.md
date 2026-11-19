# Audio QA

All 17 OGG files decoded successfully using FFmpeg, stereo 44.1 kHz, finite samples, no clipping. Seam is the maximum channel difference between the first and last decoded samples (not a substitute for listening to browser loops).

| File | Seconds | Peak dBFS | RMS dBFS | Seam |
|---|---:|---:|---:|---:|
| music_hub.ogg | 50.526 | -3.8 | -17.4 | 0.00117 |
| music_expedition.ogg | 41.739 | -3.8 | -17.9 | 0.00353 |
| sfx_click.ogg | 0.197 | -7.0 | -22.4 | 0.00007 |
| sfx_invalid.ogg | 0.417 | -6.5 | -22.9 | 0.00052 |
| sfx_gather.ogg | 0.617 | -4.7 | -22.1 | 0.00028 |
| sfx_build.ogg | 0.837 | -3.0 | -20.6 | 0.00019 |
| sfx_craft.ogg | 0.962 | -4.0 | -21.7 | 0.00003 |
| sfx_water.ogg | 1.180 | -4.3 | -22.7 | 0.00009 |
| sfx_success.ogg | 2.100 | -4.1 | -18.7 | 0.00010 |
| sfx_step_grass.ogg | 0.237 | -8.1 | -24.0 | 0.00052 |
| sfx_step_snow.ogg | 0.317 | -8.0 | -22.6 | 0.00009 |
| sfx_gather_stone.ogg | 0.547 | -4.2 | -21.7 | 0.00075 |
| sfx_gather_metal.ogg | 0.657 | -4.3 | -23.0 | 0.00011 |
| sfx_quest_open.ogg | 1.060 | -5.7 | -19.6 | 0.00020 |
| sfx_aurora.ogg | 1.260 | -6.8 | -16.8 | 0.00009 |
| ambience_river.ogg | 20.000 | -9.4 | -25.5 | 0.00041 |
| ambience_camp.ogg | 20.000 | -9.1 | -25.4 | 0.00096 |

Not verified by listening or within the Phaser runtime. Final aesthetic fit and gapless looping depend on browser/audio backend; audition and adjust mix. All sounds are original procedural synthesis, not field recordings.
