import Phaser from 'phaser';
// Add to existing preload; do not replace existing asset-loader.ts.
export function preloadLiving(scene: Phaser.Scene) {
  const root = '/assets/living/';
  scene.load.atlas('living', root+'atlases/living.png', root+'atlases/living.json');
  scene.load.image('lw_tile_plaza', root+'props/lw_tile_plaza.png');
  scene.load.json('living-manifest', root+'living-manifest.json');
  scene.load.json('komodo-grove', root+'maps/komodo-grove.json');
  scene.load.json('living-config', root+'data/interaction-config.json');
}
export function createLivingObject(scene: Phaser.Scene, o: {asset:string;tile:number[];scale:number}) {
  const living=scene.cache.json.get('living-manifest').assets;
  const base=scene.cache.json.get('asset-manifest').assets;
  const a=living[o.asset] ?? base[o.asset];
  if(!a?.atlas) throw new Error('Missing texture '+o.asset);
  return scene.add.sprite(o.tile[0]*32+16,o.tile[1]*32+30,a.atlas.key,a.atlas.frame)
    .setOrigin(a.origin[0],a.origin[1]).setScale(o.scale).setDepth(o.tile[1]*32+30);
}
// Map terrain: base terrain-index frames; lw_tile_plaza is a standalone image.
// Use authoritative map.blocked and map.objects[].approaches, never inferred art bounds.
// Port living-core.js into typed module or use it as the reference oracle; do not alter replay-core.
