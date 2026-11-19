import {bindMix,volume} from "./Mixer";
import { placeLofi } from "./placeLofi";
import Phaser from "phaser";
import { highlands,trailTrees,posts,haven, type HavenPosition } from "./haven";

export class HavenScene extends Phaser.Scene {
  private playLayers: Phaser.GameObjects.Image[] = [];
  private trailBirds: Phaser.GameObjects.Image[] = [];
  private yeti?: Phaser.GameObjects.Sprite;
  private aurora?: Phaser.GameObjects.Sprite;
  private ready: () => void;
  private position: HavenPosition;
  constructor(position: HavenPosition, ready: () => void) {
    super("HimalayanHaven");
    this.position = position;
    this.ready = ready;
  }
  preload() {
    this.load.image("trail-bird","/assets/living/sprites/lw_animal_bird.png");
    for(const tile of ["snow_0","snow_1","snow_2","snow_rock_0","ice_0","camp_path_0"])this.load.image("trail-"+tile,"/assets/tiles/tile_"+tile+".png");
    this.load.image("terrain", "/assets/cinematic/haven_terrain.png");
    this.load.atlas("props","/assets/atlases/props.png","/assets/atlases/props.json");
    this.load.image("haven-background", "/assets/cinematic/haven_background.png");
    this.load.atlas("sprites", "/assets/atlases/sprites.png", "/assets/atlases/sprites.json");
    this.load.image("haven-aurora", "/assets/sprites/aurora_idle.png");
    this.load.audio("haven-music", "/assets/audio/music_hub.ogg");
    this.load.audio("haven-ambience", "/assets/audio/ambience_camp.ogg");
  }
  create() {
    bindMix(this,"haven-music","haven-ambience");
    // The background already includes every prop in the fixture. Drawing them again changes the handoff frame.
    this.add.image(0, 0, "haven-background").setOrigin(0).setDepth(0);
    this.playLayers.push(this.add.image(0,0,"terrain").setOrigin(0).setDepth(0).setVisible(false));
    const sizes: Record<string,number> = {campfire:.52,crate:.55,barrel:.58,snow_bush:.7,signpost:.6,lamp:.8};
    const eastRoadProps:Record<string,[number,number]>={"496,272":[493,218],"336,304":[606,252],"624,304":[703,144]};
    for(const prop of haven.props){
      // After handoff, move the barrel beside the shed and the sign to the road shoulder.
      const [px,py]=eastRoadProps[prop.position.join(",")] ?? prop.position;
      this.playLayers.push(this.add.image(px,py,"props",prop.asset)
        .setOrigin(prop.origin[0],prop.origin[1]).setScale(sizes[prop.asset] ?? 1)
        .setDepth(py).setVisible(false));
    }
    const sheet=this.textures.createCanvas("highland-ground",highlands.width*32,highlands.height*32)!;
    for(let y=0;y<highlands.height;y++)for(let x=0;x<highlands.width;x++){
      if(x<18 && y<12)continue;
      const key="snow_"+((x*7+y*3+x*y)%3);
      sheet.context.drawImage(this.textures.get("trail-"+key).getSourceImage() as HTMLImageElement,x*32,y*32);
    }
    const ground=sheet.context;
    const pattern=(tile:string)=>ground.createPattern(this.textures.get("trail-"+tile).getSourceImage() as HTMLImageElement,"repeat")!;
    ground.save();
    ground.scale(32,32);
    ground.translate(.5,.5);
    ground.beginPath();
    ground.ellipse(38,13,6,3.5,0,0,Math.PI*2);
    ground.restore();
    ground.fillStyle=pattern("ice_0");
    ground.fill();
    ground.strokeStyle="#c9e2ec";
    ground.lineWidth=3;
    ground.stroke();
    ground.save();
    ground.scale(32,32);
    ground.translate(.5,.5);
    ground.beginPath();
    ground.moveTo(9,7.7);
    ground.bezierCurveTo(10,9.1,11.5,8.55,13,8.55);
    ground.bezierCurveTo(16,8.55,18,8.55,20,8.4);
    ground.bezierCurveTo(24,8,24,8.5,26,7.5);
    ground.bezierCurveTo(32,4,40,5.8,44,8);
    ground.bezierCurveTo(52,12,51,16,45,18.5);
    ground.bezierCurveTo(38,21,30,19,27,16);
    ground.bezierCurveTo(24,13,25,10,26,7.5);
    ground.restore();
    ground.lineWidth=25;
    ground.strokeStyle="#ddcfba";
    ground.stroke();
    ground.lineWidth=20;
    ground.strokeStyle=pattern("camp_path_0");
    ground.stroke();
    ground.beginPath();ground.moveTo(308,267);ground.bezierCurveTo(359,294,550,296,652,283);
    ground.lineCap="round";ground.lineWidth=42;ground.strokeStyle=pattern("camp_path_0");ground.stroke();
    sheet.refresh();
    this.playLayers.push(this.add.image(0,0,"highland-ground").setOrigin(0).setDepth(.1).setVisible(false));
    const propAt=(x:number,y:number,asset:string,scale:number)=>{
      const foot=y*32+28;
      this.playLayers.push(this.add.image(x*32+16,foot,"props",asset).setOrigin(.5,.97).setScale(scale).setDepth(foot).setVisible(false));
    };
    for(const [x,y] of trailTrees)propAt(x,y,"pine",1);
    for(const [x,y] of [[11,13],[13,12],[14,14],[16,13],[18,14],[19,13],[18,3]])propAt(x,y,"pine",.9);
    propAt(19,10,"flags",.72);
    propAt(21,10,"snow_bush",.68);
    propAt(22,10,"snow_boulder",.42);
    for(const post of posts)propAt(post.x,post.y,post.asset,1);
    for(const [x,y] of [[21,7],[28,5],[42,6],[48,12],[34,18]])propAt(x,y,"lamp",.55);
    for(const [x,y] of [[21,8],[35,6],[39,18]]){
      const bird=this.add.image(x*32+16,y*32+20,"trail-bird").setOrigin(.5,1).setScale(.5).setDepth(y*32+20).setVisible(false);
      this.trailBirds.push(bird);
      this.playLayers.push(bird);
    }
    this.yeti = this.add.sprite(haven.spawn.position[0], haven.spawn.position[1], "sprites", "yeti_idle_down")
      .setOrigin(haven.spawn.origin[0], haven.spawn.origin[1]).setDepth(haven.spawn.position[1]);
    this.aurora = this.add.sprite(haven.aurora.position[0], haven.aurora.position[1], "haven-aurora")
      .setOrigin(haven.aurora.origin[0], haven.aurora.origin[1]).setDepth(haven.aurora.position[1] + 1);
    this.cameras.main.setBounds(0, 0, haven.width * haven.tileSize, haven.height * haven.tileSize);
    this.cameras.main.setScroll(haven.viewport.cameraX, haven.viewport.cameraY);
    this.setPosition(this.position, false);
    this.game.events.once("postrender", this.ready);
  }
  setPosition(position: HavenPosition, animate = true) {
    this.position = position;
    if (!this.yeti) return;
    const x = position[0] * haven.tileSize + 16;
    const y = position[1] * haven.tileSize + 16;
    // Tile centres and fixture origins place Lofi at (304, 240) for the handoff.
    placeLofi(this.yeti, x, y, animate);
    if(animate && !matchMedia("(prefers-reduced-motion: reduce)").matches){
      for(const bird of this.trailBirds){
        if(!bird.visible || this.tweens.isTweening(bird) || Math.hypot(x-bird.x,y-bird.y)>60)continue;
        const perch=bird.x;
        const away=bird.x>=x?1:-1;
        bird.setFlipX(away<0);
        this.tweens.add({targets:bird,x:perch+away*26,y:bird.y-12,duration:260,ease:"Sine.Out",hold:650,yoyo:true});
      }
    }
    if(animate || position[0]>=20)this.followTrail();
    if (this.aurora) {
      this.tweens.killTweensOf(this.aurora);
      const ax = x + 32, ay = y - 12;
      if (animate) this.tweens.add({ targets: this.aurora, x: ax, y: ay, duration: 140, ease: "Linear" });
      else this.aurora.setPosition(ax, ay);
      this.aurora.setDepth(ay + 1);
    }
  }
  private followTrail(){
    if(!this.yeti)return;
    this.cameras.main.setBounds(0,0,highlands.width*32,highlands.height*32).startFollow(this.yeti,true,.18,.18);
  }
  fitWorld(playing: boolean) {
    if (!this.yeti) return;
    this.playLayers.forEach(layer=>layer.setVisible(playing));
    if(this.aurora){
      if(playing && !matchMedia("(prefers-reduced-motion: reduce)").matches){
        if(!this.anims.exists("aurora-glow")) this.anims.create({key:"aurora-glow",frames:[0,1,2,3].map(i=>({key:"sprites",frame:"aurora_pulse_0"+i})),frameRate:4,yoyo:true,repeat:-1});
        this.aurora.play("aurora-glow",true);
      } else {this.aurora.anims.stop();this.aurora.setTexture("haven-aurora");}
    }
    const adaptive = playing && innerWidth / innerHeight < 1.65;
    const height = adaptive ? 384 : 360;
    const width = adaptive ? Math.min(640, Math.round(height * innerWidth / innerHeight)) : 640;
    this.scale.setGameSize(width,height);
    this.cameras.main.setBounds(0,0,haven.width*32,haven.height*32);
    if(playing && (adaptive || this.position[0]>=20)) this.followTrail();
    else this.cameras.main.stopFollow().setScroll(0,12);
  }
  setAudio(enabled: boolean) {
    this.sound.mute = !enabled;
    if (enabled) {
      if (!this.sound.get("haven-music")) this.sound.play("haven-music", { loop: true, volume: volume("music") });
      if (!this.sound.get("haven-ambience")) this.sound.play("haven-ambience", { loop: true, volume: volume("ambience") });
    } else {
      this.sound.stopByKey("haven-music");
      this.sound.stopByKey("haven-ambience");
    }
  }
}
