// Phaser 3 integration example. Copy into your Phaser project, not public assets.
import Phaser from 'phaser';
const ROOT = '/assets/';
const categories = ['sprites', 'props', 'icons', 'ui', 'fx', 'puzzle'] as const;
export function preloadAssets(scene: Phaser.Scene) {
  for (const cat of categories) scene.load.atlas(cat, ROOT+`atlases/${cat}.png`, ROOT+`atlases/${cat}.json`);
  scene.load.spritesheet('terrain', ROOT+'tiles/terrain_32.png', {frameWidth:32,frameHeight:32});
  scene.load.json('asset-manifest', ROOT+'asset-manifest.json');
  scene.load.json('terrain-index', ROOT+'tiles/terrain_32.json');
  scene.load.json('animation-definitions', ROOT+'animations.json');
  // Audio v2: preserve all original keys and preload additional tracks.
  for (const name of ["music_hub", "music_expedition", "sfx_click", "sfx_invalid", "sfx_gather", "sfx_build", "sfx_craft", "sfx_water", "sfx_success", "sfx_step_grass", "sfx_step_snow", "sfx_gather_stone", "sfx_gather_metal", "sfx_quest_open", "sfx_aurora", "ambience_river", "ambience_camp"]) scene.load.audio(name, ROOT+`audio/${name}.ogg`);
  scene.load.image('ripple-logo', ROOT+'branding/ripple_logo.png');
  scene.load.image('ripple-emblem', ROOT+'branding/ripple_emblem_1024.png');
  scene.load.json('brand-config', ROOT+'brand-config.json');
  scene.load.json('audio-config', ROOT+'audio-config.json');
}
export function registerAnimations(scene: Phaser.Scene) {
  const defs = scene.cache.json.get('animation-definitions') as Record<string,{frames:string[],frameRate:number,repeat:number}>;
  for (const [key,def] of Object.entries(defs)) {
    if (scene.anims.exists(key)) continue;
    const texture = key.startsWith('fx_') ? 'fx' : 'sprites';
    scene.anims.create({key,frames:def.frames.map(frame=>({key:texture,frame})),frameRate:def.frameRate,repeat:def.repeat});
  }
}
export function worldSprite(scene: Phaser.Scene,id:string,tileX:number,tileY:number) {
  const data=scene.cache.json.get('asset-manifest').assets[id];
  if(!data?.atlas) throw new Error(`Unknown atlas sprite ${id}`);
  // Alignment: tile's lower center, matching example map.
  return scene.add.sprite(tileX*32+16,tileY*32+30,data.atlas.key,data.atlas.frame)
    .setOrigin(...(data.origin as [number,number])).setDepth(tileY*32+30);
}
// Add `pixelArt: true, roundPixels: true` to Phaser.GameConfig; keep collisions in game-core.
