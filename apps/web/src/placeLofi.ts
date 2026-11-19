import Phaser from "phaser";

/** Presentation only. Call after the map accepts a step. */
export function placeLofi(sprite: Phaser.GameObjects.Sprite, x: number, y: number, walk: boolean) {
  const dx = x - sprite.x;
  const dy = y - sprite.y;
  if (walk && !dx && !dy) return;
  const scene = sprite.scene;
  scene.tweens.killTweensOf(sprite);
  sprite.setAngle(0).setScale(1).setOrigin(.5,40/48);
  if (!walk) {
    sprite.getData("shadow")?.setVisible(false);
    sprite.anims.stop();
    sprite.setPosition(x, y).setDepth(y).setTexture("sprites", "yeti_idle_down");
    return;
  }
  const facing = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
  sprite.setData("facing",facing);
  let shadow = sprite.getData("shadow") as Phaser.GameObjects.Ellipse | undefined;
  if (!shadow) {
    shadow = scene.add.ellipse(sprite.x,sprite.y,21,6,0x243c40,0.24);
    sprite.setData("shadow",shadow);
  }
  shadow.setVisible(true).setDepth(sprite.y-1);
  const key = "walk-" + facing;
  if (!scene.anims.exists(key)) {
    scene.anims.create({ key, frames: [1,0,3,2].map(i => ({key: "sprites", frame: "yeti_walk_" + facing + "_0" + i})), frameRate: 12, repeat: -1 });
  }
  const stride = Number(sprite.getData("stride") || 0);
  sprite.play({key, startFrame: stride}, true);
  sprite.setData("stride", (stride + 2) % 4);
  scene.tweens.add({
    targets: sprite, x, y, duration: 145,
    onUpdate: () => {sprite.setDepth(sprite.y);shadow.setPosition(sprite.x,sprite.y).setDepth(sprite.y-1)},
    onComplete: () => {
      sprite.anims.stop();
      sprite.setTexture("sprites", "yeti_idle_" + facing);
      sprite.emit("stepcomplete");
    }
  });
}
