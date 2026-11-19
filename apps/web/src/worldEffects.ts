import type Phaser from "phaser";

export function loadWaterEffects(scene:Phaser.Scene,withAtlas=true){
  if(withAtlas && !scene.textures.exists("fx"))scene.load.atlas("fx","/assets/atlases/fx.png","/assets/atlases/fx.json");
  if(!scene.textures.exists("river-fish"))scene.load.image("river-fish","/assets/living/sprites/lw_animal_fish.png");
}

export function registerFxAnims(scene:Phaser.Scene){
  if(!scene.anims.exists("surface-splash")){
    scene.anims.create({key:"surface-splash",frames:[0,1,2,3].map(i=>({key:"fx",frame:"fx_water_splash_0"+i})),frameRate:10});
  }
  if(!scene.anims.exists("fx-sparkle")){
    scene.anims.create({key:"fx-sparkle",frames:[0,1,2,3].map(i=>({key:"fx",frame:"fx_sparkle_0"+i})),frameRate:8});
  }
  if(!scene.anims.exists("hammer-hit")){
    scene.anims.create({key:"hammer-hit",frames:[0,1,2,3].map(i=>({key:"fx",frame:"fx_hammer_hit_0"+i})),frameRate:12});
  }
  if(!scene.anims.exists("restore-glow")){
    scene.anims.create({key:"restore-glow",frames:[0,1,2,3].map(i=>({key:"fx",frame:"fx_restore_glow_0"+i})),frameRate:8});
  }
}

export function riverLife(scene:Phaser.Scene,x:number,y:number,enabled=()=>true){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  registerFxAnims(scene);
  const key="surface-splash";
  
  // Ambient water flow ripple drifting downstream
  scene.time.addEvent({
    delay: 3600 + (x % 900),
    loop: true,
    callback: () => {
      if(!enabled() || !scene.cameras.main.worldView.contains(x,y))return;
      const ripple = scene.add.image(x + (Math.random()*24 - 12), y + (Math.random()*16 - 8), "fx", "fx_water_flow")
        .setScale(0.42).setAlpha(0).setDepth(y - 1);
      scene.tweens.add({
        targets: ripple,
        y: ripple.y + 10,
        alpha: { from: 0, to: 0.38 },
        duration: 800,
        yoyo: true,
        ease: "Sine.easeInOut",
        onComplete: () => ripple.destroy()
      });
    }
  });

  // Fish jumping with arc, splash, and landing
  scene.time.addEvent({
    delay:4800+(x%1500),
    loop:true,
    callback:()=>{
      if(!enabled() || !scene.cameras.main.worldView.contains(x,y))return;
      const jumpDir = Math.random() > 0.5 ? 1 : -1;
      
      // Emergence splash
      const enterSplash = scene.add.sprite(x, y, "fx", "fx_water_splash_00")
        .setScale(0.45).setDepth(y).play(key);
      enterSplash.once("animationcomplete", function(this:Phaser.GameObjects.Sprite){this.destroy()});

      const fish=scene.add.image(x,y,"river-fish").setScale(.36).setDepth(y + 2).setFlipX(jumpDir < 0);
      scene.tweens.add({
        targets:fish,
        x: x + jumpDir * 20,
        y: y - 16,
        angle: jumpDir * 22,
        duration: 300,
        ease:"Quad.Out",
        onComplete:()=>{
          scene.tweens.add({
            targets: fish,
            x: x + jumpDir * 36,
            y: y,
            angle: jumpDir * 45,
            duration: 260,
            ease: "Quad.In",
            onComplete: () => {
              fish.destroy();
              // Dive landing splash
              const exitSplash = scene.add.sprite(x + jumpDir * 36, y, "fx", "fx_water_splash_00")
                .setScale(0.55).setDepth(y).play(key);
              exitSplash.once("animationcomplete", function(this:Phaser.GameObjects.Sprite){this.destroy()});
            }
          });
        }
      });
    }
  });
}

export function flame(scene:Phaser.Scene,fire:Phaser.GameObjects.Image | Phaser.GameObjects.Sprite){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const f=fire.frame;
  const layer=scene.add.image(fire.x,fire.y,fire.texture.key,f.name).setOrigin(fire.originX,fire.originY)
    .setScale(fire.scaleX,fire.scaleY).setDepth(fire.depth+.1).setCrop(0,0,f.width,Math.floor(f.height*.55));
  layer.setTint(0xffd788);
  scene.tweens.add({targets:layer,scaleY:fire.scaleY*1.15,alpha:{from:0.75,to:0.98},duration:180,yoyo:true,repeat:-1,ease:"Sine.inOut"});

  // Warm fiery embers and soft translucent smoke (strictly warm fire palette, zero green/blue tint)
  const emberColors = [0xff4400, 0xff7700, 0xffaa11, 0xffcc33];
  scene.time.addEvent({
    delay: 420,
    loop: true,
    callback: () => {
      if(!fire.scene || !fire.visible || !scene.cameras.main.worldView.contains(fire.x, fire.y))return;
      const isSmoke = Math.random() > 0.65;
      if (isSmoke) {
        // Soft warm neutral smoke
        const smoke = scene.add.circle(fire.x + (Math.random()*8 - 4), fire.y - 10, 3 + Math.random()*2, 0xd0c4b0, 0.35)
          .setDepth(fire.depth + 1);
        scene.tweens.add({
          targets: smoke,
          y: fire.y - 32 - Math.random()*14,
          x: smoke.x + (Math.random()*14 - 7),
          alpha: 0,
          scale: 2.2,
          duration: 1100 + Math.random()*300,
          ease: "Sine.easeOut",
          onComplete: () => smoke.destroy()
        });
      } else {
        // Pure fiery ember spark
        const color = emberColors[Math.floor(Math.random() * emberColors.length)];
        const ember = scene.add.circle(fire.x + (Math.random()*12 - 6), fire.y - 6, 1.2 + Math.random()*1.2, color, 0.9)
          .setDepth(fire.depth + 2);
        scene.tweens.add({
          targets: ember,
          y: fire.y - 24 - Math.random()*16,
          x: ember.x + (Math.random()*10 - 5),
          alpha: 0,
          scale: 0.3,
          duration: 700 + Math.random()*350,
          ease: "Sine.easeOut",
          onComplete: () => ember.destroy()
        });
      }
    }
  });

  return layer;
}

export function splashAt(scene:Phaser.Scene, x:number, y:number){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  registerFxAnims(scene);
  const splash = scene.add.sprite(x, y, "fx", "fx_water_splash_00").setScale(0.5).setDepth(y + 1).play("surface-splash");
  splash.once("animationcomplete", function(this:Phaser.GameObjects.Sprite){this.destroy()});
}

export function craftEffectAt(scene:Phaser.Scene, x:number, y:number){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  registerFxAnims(scene);
  const hit = scene.add.sprite(x, y, "fx", "fx_hammer_hit_00").setScale(0.7).setDepth(y + 10).play("hammer-hit");
  hit.once("animationcomplete", function(this:Phaser.GameObjects.Sprite){this.destroy()});
  const dust = scene.add.image(x, y + 6, "fx", "fx_dust").setScale(0.4).setAlpha(0.7).setDepth(y + 9);
  scene.tweens.add({targets: dust, y: y - 10, alpha: 0, scale: 0.6, duration: 400, onComplete: () => dust.destroy()});
}

export function restoreGlowAt(scene:Phaser.Scene, x:number, y:number){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  registerFxAnims(scene);
  const glow = scene.add.sprite(x, y, "fx", "fx_restore_glow_00").setScale(0.85).setDepth(y + 10).play("restore-glow");
  glow.once("animationcomplete", function(this:Phaser.GameObjects.Sprite){this.destroy()});
}

export interface WeatherEffect {
  setVisible(visible: boolean): void;
  destroy(): void;
}

export function createSnowfall(scene: Phaser.Scene): WeatherEffect | null {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  if (!scene.textures.exists("fx-snow")) {
    const cvs = scene.textures.createCanvas("fx-snow", 6, 6);
    if (cvs) {
      const ctx = cvs.context;
      ctx.beginPath();
      ctx.arc(3, 3, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.fill();
      cvs.refresh();
    }
  }
  const flakes: Phaser.GameObjects.Image[] = [];
  const container = scene.add.container(0, 0).setDepth(3500);

  const count = 30;
  for (let i = 0; i < count; i++) {
    const flake = scene.add.image(
      Math.random() * (scene.cameras.main.width + 120) - 60,
      Math.random() * scene.cameras.main.height,
      "fx-snow"
    );
    flake.setScale(0.4 + Math.random() * 0.7);
    flake.setAlpha(0.25 + Math.random() * 0.55);
    flake.setScrollFactor(0);
    container.add(flake);
    flakes.push(flake);
  }

  const timer = scene.time.addEvent({
    delay: 35,
    loop: true,
    callback: () => {
      const w = scene.cameras.main.width;
      const h = scene.cameras.main.height;
      for (const flake of flakes) {
        flake.y += flake.scaleX * 0.8;
        flake.x += Math.sin(flake.y * 0.04) * 0.4 - 0.2;
        if (flake.y > h + 10) {
          flake.y = -8;
          flake.x = Math.random() * (w + 80) - 40;
        }
        if (flake.x < -20) flake.x = w + 10;
      }
    }
  });

  return {
    setVisible(visible: boolean) {
      container.setVisible(visible);
      timer.paused = !visible;
    },
    destroy() {
      timer.destroy();
      container.destroy(true);
    }
  };
}
