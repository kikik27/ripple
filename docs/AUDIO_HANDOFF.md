# Ripple — Audio Pack v2

Replacement for the original asset pack audio. Original 9 filenames remain unchanged. 8 optional new tracks are included. No external samples or soundfonts used. Music is original composed procedural instrument synthesis; effects are synthesized Foley-style textures. No licensed third-party recordings are bundled.

## Install
Audio v2 is already integrated into this kit. All 17 audio files and their keys are in the runtime manifest. No additional merge is required. The consolidated Ripple asset lab embeds v2 audio; see examples/audio-lab.html for the full mixer.

## Mix defaults
- Music: 0.32, loop enabled; crossfade ~0.8 s on scene transition.
- Ambience: 0.16, loop enabled; independent of music.
- SFX: 0.32 (build/success 0.48), no loop. Rate-limit footsteps and gather sounds, stop previous instance when appropriate. Respect browser autoplay rules: start after user gesture. Use user volume/mute settings.
- `sfx_success` is mission completion, not donation confirmation. No money/slot-machine effects.

## Phaser example
```ts
// Existing audio ID/path bindings remain compatible.
this.load.audio('music_hub', '/assets/audio/music_hub.ogg');
this.load.audio('ambience_camp', '/assets/audio/ambience_camp.ogg');
this.load.audio('sfx_build', '/assets/audio/sfx_build.ogg');
// In create(), after user gesture:
this.sound.play('music_hub', { loop: true, volume: 0.32 });
this.sound.play('ambience_camp', { loop: true, volume: 0.16 });
// On successful build action:
this.sound.play('sfx_build', { volume: 0.48 });
```

See QA.md and audio-metadata.json. The supplied audio is a new MVP baseline, not live-recorded orchestral or field audio. Listen in context before release.
