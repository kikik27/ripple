import {bindMix,volume} from "./Mixer";
import { placeLofi } from "./placeLofi";
import Phaser from "phaser";
import { grove, livingConfig, pathToApproach, isWalkable, type LivingObject, type LivingStateV1, type Tile } from "./living";

type Asset = { atlas: { key: string; frame: string }; origin: [number, number] };
const walkSheets:Record<string,string>={
  npc_elder:"elder",npc_child:"child",npc_engineer:"engineer",npc_recycler:"recycler",npc_farmer:"ari",npc_fisher:"fisher",npc_merchant:"merchant",
  animal_dog:"biscuit",animal_cat:"cat",animal_goat:"goat",animal_sheep:"sheep",animal_chicken:"chicken",animal_duck:"duck"
};
export class GroveScene extends Phaser.Scene {
  private player?: Phaser.GameObjects.Sprite;
  private placed = new Map<string, Phaser.GameObjects.Sprite>();
  private livingAssets: Record<string, Asset> = {};
  private baseAssets: Record<string, Asset> = {};
  private state: LivingStateV1;
  private ready: () => void;
  private select: (objectId: string | null, tile: Tile) => void;
  constructor(state: LivingStateV1, ready: () => void, select: (objectId: string | null, tile: Tile) => void) {
    super("KomodoGrove"); this.state = state; this.ready = ready; this.select = select;
  }
  preload() {
    const root = "/assets/living/";
    for(const actor of Object.values(walkSheets))this.load.spritesheet(actor+"-walk",root+"sprites/"+actor+"-walk.png",{frameWidth:48,frameHeight:48});
    this.load.atlas("living", root + "atlases/living.png", root + "atlases/living.json");
    this.load.image("lw_tile_plaza", root + "props/lw_tile_plaza.png");
    this.load.json("living-manifest", root + "living-manifest.json");
    this.load.json("living-terrain-extension", root + "terrain-extension.json");
    this.load.json("grove-map", root + "maps/komodo-grove.json");
    this.load.json("living-config", root + "data/interaction-config.json");
    this.load.json("base-manifest", "/assets/asset-manifest.json");
    this.load.atlas("props", "/assets/atlases/props.png", "/assets/atlases/props.json");
    this.load.atlas("sprites", "/assets/atlases/sprites.png", "/assets/atlases/sprites.json");
    for (const id of new Set(grove.terrain.flat())) if (id !== "lw_tile_plaza") this.load.image(id, `/assets/tiles/${id}.png`);
    for (const id of ["music_expedition", "ambience_river", "sfx_click", "sfx_success", "sfx_invalid", "sfx_water","handleCoins","cloth1","bookOpen"])
      this.load.audio(id, `/assets/audio/${id}.ogg`);
  }
  create() {
    for(const actor of Object.values(walkSheets)){
      const key=actor+"-walk";
      this.anims.create({key,frames:this.anims.generateFrameNumbers(key,{start:0,end:3}),frameRate:8,repeat:-1});
    }
    bindMix(this,"music_expedition","ambience_river");
    const runtime = this.cache.json.get("grove-map") as typeof grove;
    if (runtime.id !== grove.id || runtime.width !== grove.width || runtime.height !== grove.height) throw new Error("Grove map version mismatch");
    this.livingAssets = this.cache.json.get("living-manifest").assets;
    this.baseAssets = this.cache.json.get("base-manifest").assets;
    const terrainExtension = this.cache.json.get("living-terrain-extension");
    if (!terrainExtension.lw_tile_plaza || !this.cache.json.get("living-config")) throw new Error("Living content unavailable");
    for (let y = 0; y < runtime.height; y++) for (let x = 0; x < 40; x++)
      this.add.image(x * 32, y * 32, runtime.terrain[y][x]).setOrigin(0).setDepth(-100);
    this.drawEastbank();
    const animalScale:Record<string,number> = {dog:.76,cat:.65,goat:.9,sheep:.88,chicken:.6,duck:.63,chick:.46,duckling:.46,bird:.5,butterfly:.42,fish:.63};
    const propScale:Record<string,number> = {campfire:.52,lw_prop_berry_bush:.6,lw_prop_flower_box:.7,lw_prop_stone_planter:.75};
    for (const o of runtime.objects) {
      const asset = this.livingAssets[o.asset] ?? this.baseAssets[o.asset];
      if (!asset?.atlas) throw new Error(`Missing Grove texture ${o.asset}`);
      const footY = o.tile[1] * 32 + 30;
      const sprite = this.add.sprite(o.tile[0] * 32 + 16, footY, asset.atlas.key, asset.atlas.frame)
        .setOrigin(asset.origin[0], asset.origin[1]).setScale(o.scale * (animalScale[o.animalId ?? ""] ?? propScale[o.asset] ?? 1)).setDepth(footY);
      this.placed.set(o.id, sprite);
      if (o.actions.length) sprite.setInteractive().setData("livingId", o.id);
    }
    const fish=this.placed.get("animal_fish");
    if(fish && !matchMedia("(prefers-reduced-motion: reduce)").matches){
      this.tweens.add({targets:fish,x:fish.x+9,y:fish.y-3,duration:1600,yoyo:true,repeat:-1,ease:"Sine.inOut",onYoyo:()=>fish.setFlipX(true),onRepeat:()=>fish.setFlipX(false)});
    }
    const points:Record<string,Tile>={npc_elder:[16,12],npc_engineer:[12,8],npc_child:[30,16],npc_farmer:[28,13],npc_fisher:[15,22],npc_recycler:[8,10],npc_merchant:[28,12],animal_dog:[27,14],animal_cat:[25,15],animal_goat:[34,18],animal_sheep:[35,19],animal_chicken:[33,17],animal_duck:[15,20],animal_bird:[14,7],animal_butterfly:[14,18],animal_chick:[34,16],animal_duckling:[16,20]};
    for (const [id,[x,y]] of Object.entries(points)) {
      const tile=runtime.objects.find(o=>o.id===id)!.tile as Tile;
      const goal=([[x,y],[x-1,y],[x+1,y],[x,y+1]] as Tile[]).find(isWalkable);
      if(goal) this.routes.set(id,{tile,goal,returning:false,next:this.time.now+1500+190*this.routes.size});
    }
    const resize=()=>{const ratio=innerWidth/innerHeight,h=ratio<1?448:360;this.scale.setGameSize(Math.min(1280,Math.round(h*ratio)),h)};
    resize();window.addEventListener("resize",resize);
    const removeResize=()=>window.removeEventListener("resize",resize);
    this.events.once("shutdown",removeResize);this.events.once("destroy",removeResize);
    const yeti = this.baseAssets.yeti_idle_down;
    this.player = this.add.sprite(0, 0, yeti.atlas.key, yeti.atlas.frame).setOrigin(yeti.origin[0], yeti.origin[1]);
    this.setPosition(this.state.position, false);
    this.renderLiving(this.state, false);
    this.cameras.main.setBounds(0, 0, grove.width * 32, grove.height * 32);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      const object = over.find(o => o.getData("livingId"));
      const tile: Tile = [Math.floor(pointer.worldX / 32), Math.floor(pointer.worldY / 32)];
      this.select(object?.getData("livingId") ?? null, tile);
    });
    this.game.events.once("postrender", this.ready);
  }
  private routes = new Map<string,{tile:Tile; goal:Tile; returning:boolean; next:number}>();
  private drawEastbank(){
    const start=40,tile=grove.tileSize;
    const sheet=this.textures.createCanvas("eastbank-ground",(grove.width-start)*tile,grove.height*tile)!;
    const ctx=sheet.context;
    const pattern=(id:string)=>ctx.createPattern(this.textures.get(id).getSourceImage() as HTMLImageElement,"repeat")!;
    for(let y=0;y<grove.height;y++)for(let x=start;x<grove.width;x++){
      const id=grove.terrain[y][x];
      const ground=id==="tile_border_0"?id:"tile_grass_"+((x*y+y)%3);
      ctx.drawImage(this.textures.get(ground).getSourceImage() as HTMLImageElement,(x-start)*tile,y*tile);
    }
    ctx.save();ctx.scale(tile,tile);ctx.beginPath();ctx.moveTo(9,0);
    for(let y=.25;y<=grove.height;y+=.25)ctx.lineTo(9+2*Math.sin((y-.5)/4),y);
    ctx.restore();ctx.lineWidth=2*tile+6;ctx.strokeStyle="#c8cf9f";ctx.stroke();
    ctx.lineWidth=2*tile;ctx.strokeStyle=pattern("tile_river_1");ctx.stroke();
    ctx.save();ctx.scale(tile,tile);ctx.beginPath();ctx.moveTo(0,13);
    ctx.bezierCurveTo(4,13,5,12.7,9,13);ctx.bezierCurveTo(13,13.4,17,13,20,13);
    ctx.bezierCurveTo(22,13,22,19.8,19,20.4);ctx.bezierCurveTo(13,21,9,20.3,6,20.3);
    ctx.bezierCurveTo(3.6,20.3,5,15,5,13);ctx.moveTo(13.5,13);
    ctx.bezierCurveTo(13,8.5,14.5,8,17.4,10.6);ctx.restore();
    ctx.lineCap="round";ctx.lineWidth=31;ctx.strokeStyle="#cabe94";ctx.stroke();
    ctx.lineWidth=27;ctx.strokeStyle=pattern("tile_dirt_0");ctx.stroke();
    for(const [y,h] of [[12,2],[20,1]]){
      const bank=8+Math.round(2*Math.sin(y/4));
      const left=(bank-.35)*tile,top=y*tile,w=2.75*tile;
      ctx.fillStyle=pattern("tile_planks_0");ctx.fillRect(left,top,w,h*tile);
      ctx.fillStyle="#84654b";for(const edge of [top,top+h*tile-2])ctx.fillRect(left,edge,w,2);
    }
    sheet.refresh();this.add.image(start*tile,0,"eastbank-ground").setOrigin(0).setDepth(-100);
  }
  locked = false;
  location(o: LivingObject): LivingObject {
    const sprite = this.placed.get(o.id);
    if (!sprite || !this.routes.has(o.id)) return o;
    const x=Math.round((sprite.x-16)/32), y=Math.round((sprite.y-30)/32);
    return {...o,tile:[x,y],approaches:[[x,y],[x-1,y],[x+1,y],[x,y-1],[x,y+1]].filter(p=>isWalkable(p as Tile))};
  }
  update(time:number) {
    if (this.locked) return;
    for (const [id,route] of this.routes) {
      if (time < route.next) continue;
      const sprite=this.placed.get(id)!;
      const home=grove.objects.find(o=>o.id===id)!.tile as Tile;
      const goal=route.returning ? home : route.goal;
      const occupied=new Set([...this.routes.values()].filter(other=>other!==route).map(other=>other.tile.join()));
      occupied.add(this.state.position.join());
      const [step]=pathToApproach(route.tile,{approaches:[goal]},occupied);
      route.next=time+800;
      if (!step) {if(route.tile.join()===goal.join()){route.returning=!route.returning;route.next+=2200}continue}
      const dx=step[0]-route.tile[0],dy=step[1]-route.tile[1];
      this.face(id,dx,dy);
      const animal=id.startsWith("animal_"), flutter=id.endsWith("butterfly") || id.endsWith("bird");
      const stride=(dx || (animal && dy)) && walkSheets[id] && walkSheets[id]+"-walk";
      if(stride){
        if(dx) sprite.setFlipX(dx<0);
        sprite.play(stride);
      }else if (flutter && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        this.tweens.add({targets:sprite,angle:5,duration:140,yoyo:true,repeat:1,onComplete:()=>sprite.setAngle(0)});
      }
      route.tile=step;
      this.tweens.add({targets:sprite,x:step[0]*32+16,y:step[1]*32+30,duration:560,onUpdate:()=>sprite.setDepth(sprite.y),
        onComplete:()=>{if(stride)this.face(id,dx,dy)}});
    }
  }
  face(id:string,dx:number,dy:number) {
    const sprite=this.placed.get(id);
    if (!sprite) return;
    sprite.anims.stop();
    if (id.startsWith("animal_")) {
      const living="lw_"+id;
      if(this.textures.get("living").has(living)) sprite.setTexture("living",living);
      if(dx)sprite.setFlipX(dx<0);return;
    }
    const side=Math.abs(dx)>Math.abs(dy);
    const facing=side ? dx<0?"left":"right" : dy<0?"back":"front";
    const living="lw_"+id+"_"+facing,base=id+"_"+(side?"side":"front");
    if(this.textures.get("living").has(living)) sprite.setTexture("living",living).setFlipX(false);
    else if(this.textures.get("sprites").has(base)) sprite.setTexture("sprites",base).setFlipX(side && dx<0);
  }
  freeze(lock:boolean) {
    this.locked=lock;
    for(const id of this.routes.keys()){
      const sprite=this.placed.get(id)!;
      if(lock)sprite.anims.pause();else sprite.anims.resume();
      for(const tween of this.tweens.getTweensOf(sprite)) lock ? tween.pause() : tween.resume();
    }
  }
  private texture(id: string) {
    const a = this.livingAssets[id] ?? this.baseAssets[id];
    if (!a?.atlas) throw new Error(`Missing Grove texture ${id}`);
    return a;
  }
  drawTrailMap(canvas:HTMLCanvasElement,path:Tile[],destination:LivingObject) {
    const ctx=canvas.getContext("2d");
    if(!ctx)return;
    const size=8,ratio=size/grove.tileSize;
    canvas.width=grove.width*size;canvas.height=grove.height*size;
    ctx.imageSmoothingEnabled=false;
    grove.terrain.forEach((row,y)=>row.forEach((tile,x)=>{
      ctx.drawImage(this.textures.get(tile).getSourceImage() as HTMLImageElement,x*size,y*size,size,size);
    }));
    for(const o of [...grove.objects].sort((a,b)=>a.tile[1]-b.tile[1])){
      if(o.kind==="npc" || o.kind==="animal")continue;
      const s=this.placed.get(o.id)!, f=s.frame;
      const w=s.displayWidth*ratio,h=s.displayHeight*ratio;
      ctx.drawImage(f.source.image as HTMLImageElement,f.cutX,f.cutY,f.cutWidth,f.cutHeight,s.x*ratio-w*s.originX,s.y*ratio-h*s.originY,w,h);
    }
    const point=([x,y]:number[])=>[(x+.5)*size,(y+.5)*size];
    ctx.beginPath();
    [this.state.position,...path].forEach((tile,i)=>{const [x,y]=point(tile);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)});
    ctx.lineWidth=3;ctx.strokeStyle="#fff3ce";ctx.stroke();ctx.lineWidth=1.5;ctx.strokeStyle="#29536b";ctx.setLineDash([3,2]);ctx.stroke();ctx.setLineDash([]);
    for(const [tile,color] of [[destination.tile,"#ad593c"],[this.state.position,"#195d88"]] as const){
      const [x,y]=point(tile);ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle="#fff3ce";ctx.stroke();
    }
  }
  setPosition(position: Tile, animate = true) {
    if (!this.player) { this.state = { ...this.state, position }; return; }
    const x = position[0] * 32 + 16, y = position[1] * 32 + 30;
    placeLofi(this.player, x, y, animate);
  }
  renderLiving(state: LivingStateV1, animate = true) {
    this.state = state;
    this.setPosition(state.position, animate);
    for(const o of grove.objects.filter(o=>o.id.startsWith("nursery_bed_"))){
      const frame=state.nursery==="flowing" ? "lw_crop_tomato_growing" : o.asset;
      this.placed.get(o.id)?.setTexture("living",frame);
    }
    for (const o of grove.objects.filter(o => o.kind === "crop")) {
      const crop = state.crops[o.id];
      const prefix = o.asset.split("_").slice(0, 3).join("_");
      const id = `${prefix}_${livingConfig.rules.cropStages[crop.stage]}`;
      const a = this.texture(id);
      this.placed.get(o.id)?.setTexture(a.atlas.key, a.atlas.frame).setOrigin(a.origin[0], a.origin[1]);
    }
  }
  react(object: LivingObject, kind: "feed" | "play" | "talk" | "harvest" | "water" | "fish") {
    const sprite = this.placed.get(object.id);
    if (!sprite) return;
    const text = kind === "feed" || kind === "play" ? "♥" : kind === "harvest" ? "+1" : kind === "water" ? "Watered" : kind === "fish" ? "+1 fish" : "✦";
    const fx = this.add.text(sprite.x, sprite.y - 52, text, { fontFamily: "system-ui", fontSize: "24px", color: kind === "feed" || kind === "play" ? "#c65d43" : "#259d8c", stroke: "#f1f8fa", strokeThickness: 4 }).setOrigin(0.5).setDepth(2000);
    this.tweens.add({ targets: fx, y: fx.y - 30, alpha: 0, duration: 900, onComplete: () => fx.destroy() });
    this.tweens.add({ targets: sprite, angle: 4, yoyo: true, duration: 170 });
    const pet=object.animalId;
    if(kind==="feed" && pet) {
      const food=(livingConfig.animals as Record<string,{food:string|null}>)[pet].food;
      const frame="lw_icon_"+food;
      if (food && this.textures.get("living").has(frame)) {
        const snack=this.add.image(sprite.x+9,sprite.y-7,"living",frame).setScale(.5).setDepth(sprite.depth+1);
        this.tweens.add({targets:snack,scale:0,duration:650,onComplete:()=>snack.destroy()});
      }
      this.tweens.add({targets:sprite,angle:6,yoyo:true,repeat:2,duration:95});
    }
    if (kind === "play") {
      if(pet==="dog" || pet==="cat"){
        const toy=this.add.circle(sprite.x+7,sprite.y-8,4,0xd89050).setDepth(sprite.depth+2);
        this.tweens.add({targets:toy,x:sprite.x+(pet==="dog"?32:12),y:sprite.y-18,yoyo:true,duration:280,onComplete:()=>toy.destroy()});
        this.tweens.add({targets:sprite,x:sprite.x+(pet==="dog"?22:8),yoyo:true,duration:270});
      } else this.tweens.add({targets:sprite,angle:pet==="goat"||pet==="sheep"?5:10,yoyo:true,repeat:1,duration:150});
    }
  }
  setMuted(muted: boolean) {
    this.sound.mute = muted;
    if (muted) { this.sound.stopByKey("music_expedition"); this.sound.stopByKey("ambience_river"); }
    else {
      if (!this.sound.get("music_expedition")) this.sound.play("music_expedition", { loop: true, volume: volume("music") });
      if (!this.sound.get("ambience_river")) this.sound.play("ambience_river", { loop: true, volume: volume("ambience") });
    }
  }
  cue(success: boolean, action?: string) {
    if (this.sound.mute) return;
    const sounds:Record<string,string>={water:"sfx_water",refill:"sfx_water",feed:"cloth1",harvest:"cloth1",trade:"handleCoins",journal:"bookOpen",play:"sfx_success"};
    this.sound.play(success ? sounds[action ?? ""] ?? "sfx_click" : "sfx_invalid", { volume: volume("sfx") });
  }
}
