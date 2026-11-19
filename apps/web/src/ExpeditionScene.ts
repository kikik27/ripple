import {loadWaterEffects,riverLife,craftEffectAt,restoreGlowAt} from "./worldEffects";
import {bindMix,volume} from "./Mixer";
import { placeLofi } from "./placeLofi";
import Phaser from "phaser";
import { map, type Action, type State } from "../../../packages/game-core/src/game";

const root = "/assets/";
type Asset = {
  atlas?: { key: string; frame: string };
  origin?: [number, number];
};
export class ExpeditionScene extends Phaser.Scene {
  private avatar?: Phaser.GameObjects.Sprite;
  private props = new Map<string, Phaser.GameObjects.Sprite>();
  private assets: Record<string, Asset> = {};
  private state: State;
  private muted = true;
  constructor(state: State, muted=true,private ready:()=>void,private fail:()=>void) {

    super("Expedition");
    this.muted=muted;
    this.state = state;
  }
  preload() {
    loadWaterEffects(this,false);
    this.load.once("loaderror",this.fail);
    for (const cat of ["sprites", "props", "icons", "ui", "fx", "puzzle"])
      this.load.atlas(
        cat,
        `${root}atlases/${cat}.png`,
        `${root}atlases/${cat}.json`,
      );
    this.load.json("manifest", `${root}asset-manifest.json`);
    for (const id of [
      "tile_grass_0",
      "tile_grass_1",
      "tile_dry_grass_0",
      "tile_dirt_0",
      "tile_river_0",
      "tile_river_1",
      "tile_river_2",
      "tile_river_bank_left",
      "tile_river_bank_right",
      "tile_ford_0",
      "tile_border_0",
    ])
      this.load.image(id, `${root}tiles/${id}.png`);
    for (const id of [
      "music_expedition",
      "ambience_river",
      "sfx_step_grass",
      "sfx_gather","sfx_gather_stone","sfx_gather_metal",
      "sfx_build",
      "sfx_craft",
      "sfx_water",
      "sfx_success",
      "sfx_invalid",
    ])
      this.load.audio(id, `${root}audio/${id}.ogg`);
  }
  create() {
    bindMix(this,"music_expedition","ambience_river");
    riverLife(this,map.river_x*32+16,4*32);
    riverLife(this,map.river_x*32+16,(map.bridge[1]+2)*32);
    riverLife(this,map.river_x*32+16,15*32);
    this.assets = this.cache.json.get("manifest").assets;
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++) {
        const border =
          x === 0 || y === 0 || x === map.width - 1 || y === map.height - 1;
        let tile = border
          ? "tile_border_0"
          : x === map.river_x
            ? y === map.ford[1]
              ? "tile_ford_0"
              : `tile_river_${y % 3}`
            : (y===map.bridge[1] && x>=map.spawn[0] && x<=map.well_site[0]) ||
              (Math.abs(x-map.river_x)===1 && y>map.bridge[1] && y<=map.ford[1])
              ? "tile_dirt_0"
              : x > 13 && (x * 3 + y) % 6 === 0
                ? "tile_dry_grass_0"
                : `tile_grass_${(x + y) % 2}`;
        this.add
          .image(x * 32, y * 32, tile)
          .setOrigin(0)
          .setDepth(-10);
        if (x === map.river_x - 1 && !border)
          this.add
            .image(x * 32 + 22, y * 32, "tile_river_bank_left").setDisplaySize(10,32)
            .setOrigin(0)
            .setDepth(-9);
        if (x === map.river_x + 1 && !border)
          this.add
            .image(x * 32, y * 32, "tile_river_bank_right").setDisplaySize(10,32)
            .setOrigin(0)
            .setDepth(-9);
      }
    const crossing=this.sprite("bridge_broken",map.bridge).setScale(1.24).setDepth(-5);
    this.props.set("crossing",crossing);
    this.prop("workshop", "workshop", map.workshop);
    this.prop("well", "well_empty", map.well_site);
    map.nodes.forEach((n) =>
      this.prop(n.id, `node_${n.material}_full`, n.position),
    );
    map.homes.forEach((p, i) => this.prop(`home${i}`, "home_dry", p));
    this.avatar = this.sprite("yeti_idle_down", map.spawn).setDepth(1000);
    this.sprite("aurora_idle", [map.spawn[0] + 1, map.spawn[1] - 1]).setDepth(
      800,
    );
    this.add
      .text(82, 295, "DEPOT  •  gather & craft", {
        fontFamily: "system-ui",
        fontSize: "11px",
        color: "#142c40",
        backgroundColor: "#f3eadc",
        padding: { x: 5, y: 3 },
      })
      .setDepth(1001);
    this.add
      .text(520, 294, "WELL SITE", {
        fontFamily: "system-ui",
        fontSize: "11px",
        color: "#142c40",
        backgroundColor: "#f3eadc",
        padding: { x: 5, y: 3 },
      })
      .setDepth(1001);
    this.cameras.main.setBounds(0, 0, 768, 640);
    const fit=()=>{const h=innerWidth<innerHeight?448:360;this.scale.setGameSize(Math.min(768,Math.round(h*innerWidth/innerHeight)),h)};
    fit();window.addEventListener("resize",fit);
    const removeResize=()=>window.removeEventListener("resize",fit);
    this.events.once("shutdown",removeResize);this.events.once("destroy",removeResize);
    this.cameras.main.startFollow(this.avatar,true,0.16,0.16);
    this.renderState(this.state, false);
    this.setMuted(this.muted);
    this.game.events.once("postrender",this.ready);
  }
  private sprite(id: string, p: readonly number[]) {
    const a = this.assets[id];
    return this.add
      .sprite(p[0] * 32 + 16, p[1] * 32 + 30, a.atlas!.key, a.atlas!.frame)
      .setOrigin(...(a.origin ?? [0.5, 1]));
  }
  private prop(key: string, id: string, p: readonly number[]) {
    const object = this.sprite(id, p).setDepth(p[1] * 32 + 30);
    this.props.set(key, object);
  }
  renderState(state: State, animate = true) {
    const moved = state.position.join() !== this.state.position.join();
    this.state = state;
    if (!this.avatar || !this.textures.exists("sprites")) return;
    const ax = state.position[0] * 32 + 16,
      ay = state.position[1] * 32 + 30;
    if (moved || !this.avatar.getData("placed")) {
      placeLofi(this.avatar, ax, ay, animate);
      this.avatar.setData("placed",true);
    }
    const frame = (key: string, id: string) => {
      const obj = this.props.get(key),
        a = this.assets[id];
      if (obj && a?.atlas) obj.setTexture(a.atlas.key, a.atlas.frame);
    };
    map.nodes.forEach((n) =>
      frame(
        n.id,
        `node_${n.material}_${state.stocks[n.id] > 0 ? "full" : "depleted"}`,
      ),
    );
    frame(
      "well",
      state.waterConnected
        ? "well_flowing"
        : state.wellBuilt
          ? "well_built"
          : "well_empty",
    );
    map.homes.forEach((_, i) =>
      frame(`home${i}`, state.waterConnected ? "home_restored" : "home_dry"),
    );
    frame("crossing",state.bridgeRepaired ? "bridge_repaired" : "bridge_broken");
    // The atlas pivot marks the stone base. Anchor the deck to the travel row.
    this.props.get("crossing")?.setOrigin(.5,.60);
  }
  showAction(command:Action) {
    const action=command.type;
    if (!this.avatar) return;
    const pose:Record<string,string>={GATHER:"yeti_carry",CRAFT_WELL:"yeti_build",BUILD_WELL:"yeti_build",REPAIR_BRIDGE:"yeti_build",CONNECT_WATER:"yeti_celebrate",FINISH:"yeti_celebrate"};
    if (!pose[action]) return;
    const avatar=this.avatar;
    if(command.type==="GATHER"){
      const node=map.nodes.find(n=>n.id===command.node_id)!;
      const icon=this.add.image(node.position[0]*32+16,node.position[1]*32+8,"icons","icon_"+node.material).setDepth(1500).setScale(.65);
      this.tweens.add({targets:icon,x:avatar.x,y:avatar.y-20,alpha:.2,duration:280,ease:"Sine.inOut",onComplete:()=>icon.destroy()});
    }
    if (command.type === "REPAIR_BRIDGE") craftEffectAt(this, map.bridge[0]*32+16, map.bridge[1]*32+16);
    if (command.type === "CRAFT_WELL") craftEffectAt(this, map.workshop[0]*32+16, map.workshop[1]*32+16);
    if (command.type === "BUILD_WELL") craftEffectAt(this, map.well_site[0]*32+16, map.well_site[1]*32+16);
    if (command.type === "CONNECT_WATER") {
      restoreGlowAt(this, map.well_site[0]*32+16, map.well_site[1]*32+16);
      map.homes.forEach(p => restoreGlowAt(this, p[0]*32+16, p[1]*32+16));
    }
    avatar.anims.stop();
    // Authored action frames have 55–60 opaque rows. Idle has 36.
    const poseHeight=action==="BUILD_WELL" || action==="CRAFT_WELL" || action==="REPAIR_BRIDGE" ? 55 : 60;
    avatar.setTexture("sprites",pose[action]).setScale(36/poseHeight).setOrigin(.5,61/64);
    this.tweens.killTweensOf(avatar);
    avatar.setPosition(this.state.position[0]*32+16,this.state.position[1]*32+30);
    avatar.setAngle(0);
    const facing=avatar.getData("facing") || "down";
    this.tweens.add({targets:avatar,angle:facing==="left"?-6:6,duration:120,yoyo:true,
      repeat:action==="BUILD_WELL" || action==="REPAIR_BRIDGE"?1:0,ease:"Sine.inOut",
      onComplete:()=>{
        if(this.state.inventory.kit) avatar.setTexture("sprites","yeti_carry").setScale(.6).setOrigin(.5,61/64);
        else avatar.setTexture("sprites","yeti_idle_"+facing).setScale(1).setOrigin(.5,40/48);
        avatar.emit("actioncomplete",action);
      }
    });
  }
  setMuted(muted: boolean) {
    this.muted = muted;
    this.sound.mute = muted;
    if (!muted && !this.sound.get("music_expedition"))
      this.sound.play("music_expedition", { loop: true, volume: volume("music") });
  }
  cue(id: string) {
    if (!this.muted && this.cache.audio.exists(id))
      this.sound.play(id, { volume: volume("sfx") });
  }
  screenPointOf(p: readonly number[]): { x: number; y: number } | null {
    if (!this.game?.canvas) return null;
    const canvas = this.game.canvas.getBoundingClientRect();
    const cam = this.cameras.main;
    const sx = canvas.left + (p[0] * 32 + 16 - cam.worldView.x) * canvas.width / cam.worldView.width;
    const sy = canvas.top + (p[1] * 32 - cam.worldView.y) * canvas.height / cam.worldView.height;
    return { x: sx, y: sy };
  }
}
