import {Fishing} from "./Fishing";
import {actorScreenPoint,questSpark} from "./questSpark";
import {LoadScreen} from "./AssetBoot";
import {BuildingPill,type BuildingInfo} from "./BuildingPill";
import {AchievementsList} from "./AchievementsList";
import {unlockAchievement} from "./achievements";
import {useHeldMovement} from './useHeldMovement';
import {PlayerHUD,BagGrid,TaskTitle} from "./GameUI";
import {Mixer} from "./Mixer";
import { Dialogue } from "./Dialogue";
import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { GroveScene } from "./GroveScene";
import { applyLiving, claimLiving, createLiving, grove, livingConfig, loadLiving, moveLiving, nearby, objectFor, pathToApproach, pathToTile, saveLiving, type LivingAction, type LivingObject, type LivingStateV1, type Tile } from "./living";
import { browserStorage } from "./haven";
import { TouchJoystick } from "./TouchJoystick";
import {NurseryGate} from "./NurseryGate";

const names = livingConfig.npcs as Record<string, { name: string; role: string; dialogue: string[]; quest?: string }>;
const animals = livingConfig.animals as Record<string, { name: string; food: string | null }>;
const quests = livingConfig.quests as Record<string, { title: string; objective: string; reward:Record<string,number> }>;
const directions = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] } as Record<string, Tile>;

const getCompassArrow = (from: Tile, to: Tile) => {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) return "Arrived";
  if (Math.abs(dx) > 2 * Math.abs(dy)) return dx > 0 ? "→ E" : "← W";
  if (Math.abs(dy) > 2 * Math.abs(dx)) return dy > 0 ? "↓ S" : "↑ N";
  if (dx > 0) return dy > 0 ? "↘ SE" : "↗ NE";
  return dy > 0 ? "↙ SW" : "↖ NW";
};

const places = {market:"Market Lane",fishing_dock:"Fishing Dock",plot_0_0:"Farm plots",pump:"Water pump",camp:"Camp",world_board:"World Board",water_lab:"Piko’s water lab",nursery_gate:"Eastbank Nursery",orchard_rest:"Orchard overlook",home_1:"West cottage",home_2:"East cottage",workshop:"Workshop",recycling:"Recycling station",storage:"Seed store",barn:"Sanctuary barn",well:"Village well",fish_market:"Fish market",npc_elder:names.elder.name,npc_farmer:names.farmer.name,npc_engineer:names.engineer.name,npc_child:names.child.name,npc_recycler:names.recycler.name,npc_fisher:names.fisher.name,npc_merchant:names.merchant.name};

const buildingMeta: Record<string, { name: string; func: string }> = {
  well: { name: "Village Well", func: "Draw Clean Water · Refill canister" },
  pump: { name: "Water Pump", func: "Irrigation Pump · Fill watering can" },
  water_lab: { name: "Piko’s Water Lab", func: "Research Station · Survey Eastbank" },
  nursery_gate: { name: "Eastbank Nursery Gate", func: "Sluice Control · Balance water gates" },
  fishing_dock: { name: "Fishing Dock", func: "Village Shore · Cast line & reel" },
  market: { name: "Market Lane", func: "Village Bazaar · Trade produce for seed & feed" },
  workshop: { name: "Crafting Workshop", func: "Tool Bench · Tools & repairs" },
  recycling: { name: "Recycling Station", func: "Compost & Sort · Clean the environment" },
  storage: { name: "Seed Store", func: "Grain Depot · Stored seeds & hay" },
  barn: { name: "Sanctuary Barn", func: "Animal Barn · Care for domestic animals" },
  campfire: { name: "Campfire Rest", func: "Warm Hearth · Rest until tomorrow & save" },
  world_board: { name: "Wayfarer Waygate", func: "Signpost Portal · Fast travel to Haven" },
  camp: { name: "Base Camp", func: "Wayfarer Camp · Rest and return to Haven" },
  fish_market: { name: "Fish Market", func: "Harbor Vendor · Display village catch" },
  orchard_rest: { name: "Orchard Overlook", func: "Scenic Overlook · View the Eastbank grove" },
  home_1: { name: "West Cottage", func: "Neighbor Home · Village residence" },
  home_2: { name: "East Cottage", func: "East Cottage · Neighbor residence" },
};
export function GroveView({ onComplete,muted, onMute, onReturn, onBoard }: { onComplete:(title:string)=>void; muted: boolean; onMute: () => void; onReturn: () => void; onBoard: () => void }) {
  const storage = useRef(browserStorage()).current;
  const initial = useRef<LivingStateV1 | null>(null);
  if (!initial.current) initial.current = loadLiving(storage);
  const current = useRef(initial.current);
  const [state, setState] = useState(initial.current);
  const scene = useRef<GroveScene | null>(null);
  const route = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [dialogue, setDialogue] = useState<{ npc: string; page: number; lines:string[] } | null>(null);
  const [confirmRest, setConfirmRest] = useState(false);
  const [message, setMessage] = useState("Aurora: Welcome to Komodo Grove. Visit the neighbors, animals, and garden.");
  const [saveWarning, setSaveWarning] = useState(false);
  const [journalPage,setJournalPage] = useState<"items"|"quests"|"map"|"achievements">("items");
  const [bag,setBag] = useState(false);
  const mapCanvas=useRef<HTMLCanvasElement>(null);
  const [destination,setDestination]=useState<keyof typeof places>("market");
  const marker=objectFor(destination)!;
  const landmark=scene.current?.location(marker) ?? marker;
  const path=()=>pathToApproach(current.current.position,landmark);
  useEffect(()=>{
    if(bag && journalPage==="map" && mapCanvas.current)scene.current?.drawTrailMap(mapCanvas.current,path(),landmark);
  },[bag,journalPage,destination,state.position,ready]);
  useEffect(()=>{if(bag)scene.current?.cue(true,"journal")},[bag]);
  const [paused,setPaused] = useState(false);
  const [choices,setChoices]=useState<LivingObject[]>([]);
  const [loadError,setLoadError]=useState(false);
  const locked = !ready || loadError || choices.length>0 || !!dialogue || confirmRest || bag || paused || !!selected;
  const lockRef = useRef(locked);
  lockRef.current = locked;
  const location = (o:LivingObject) => scene.current?.location(o) ?? o;
  const selectedObject = selected ? location(objectFor(selected)!) : undefined;
  useEffect(()=>{scene.current?.freeze(locked)},[locked]);
  const zone = grove.zones.find(z => state.position[0] >= z.bounds[0] && state.position[0] <= z.bounds[2] && state.position[1] >= z.bounds[1] && state.position[1] <= z.bounds[3]);

  const commit = (next: LivingStateV1) => {
    current.current = next; setState(next); scene.current?.renderLiving(next);
    try { saveLiving(storage, next); setSaveWarning(false); } catch { setSaveWarning(true); }
  };
  const stopRoute = () => { if (route.current !== null) window.clearInterval(route.current); route.current = null; };
  useEffect(()=>{
    window.addEventListener("blur",stopRoute);
    document.addEventListener("visibilitychange",stopRoute);
    return ()=>{window.removeEventListener("blur",stopRoute);document.removeEventListener("visibilitychange",stopRoute)};
  },[]);
  const move = (dx: number, dy: number) => {
    stopRoute();
    const result = moveLiving(current.current, dx, dy);
    if (result.ok) { commit(result.state); }
    else { setMessage(result.message); }
  };
  useHeldMovement(ready && !locked,dir=>move(...directions[{N:"w",S:"s",E:"d",W:"a"}[dir]]));
  const openTarget=(id:string)=>{setMessage("");setSelected(id)};
  const travel = (path: Tile[], id?: string) => {
    stopRoute();
    if (!path.length) { if (id && nearby(location(objectFor(id)!),current.current.position)) openTarget(id); else setMessage("There is no path to that tile."); return; }
    let index = 0;
    route.current = window.setInterval(() => {
      if(lockRef.current){stopRoute();return}
      const next = path[index++];
      const [x, y] = current.current.position;
      const result = moveLiving(current.current, next[0] - x, next[1] - y);
      if (!result.ok) { stopRoute(); setMessage(result.message); return; }
      commit(result.state);
      if (index >= path.length) {
        stopRoute();
        if(id){
          const target=location(objectFor(id)!);
          if(nearby(target,result.state.position))openTarget(id);
          else travel(pathToApproach(result.state.position,target),id);
        }
      }
    }, 155);
  };
  const addToJournal=(object:LivingObject)=>{
    if(scene.current)questSpark(actorScreenPoint(scene.current,object.tile[0]*32+16,object.tile[1]*32),document.querySelector(".grove-quest-hud"));
  };
  const interact = (o: LivingObject, action: LivingAction, arg?: string) => {
    stopRoute();
    if (!nearby(o, current.current.position)) { travel(pathToApproach(current.current.position, o), o.id); setMessage(`Walking to ${label(o)}…`); return; }
    if (action === "rest" && arg !== "confirm") { setConfirmRest(true); return; }
    const before=current.current;
    const result = applyLiving(current.current, o.id, action, arg, o.tile as Tile);
    setMessage(result.message);
    if (!result.ok) { scene.current?.cue(false); return; }
    commit(result.state); scene.current?.cue(true, o.id==="nursery_gate" ? "water" : action);
    if (["feed", "play", "talk", "harvest", "water", "fish"].includes(action)) scene.current?.react(o, action as "feed" | "play" | "talk" | "harvest" | "water" | "fish");
    if(before.nursery==="dry" && result.state.nursery==="surveyed")addToJournal(o);
    if (action === "talk") {
      if(arg==="accept"){addToJournal(o);setDialogue(null);setSelected(null);return}
      scene.current?.face(o.id,current.current.position[0]-o.tile[0],current.current.position[1]-o.tile[1]);
      const npc=o.npcId!;
      const giver=names[npc].quest;
      const first=!before.talked.includes(npc);
      const lines=first?[...names[npc].dialogue]:[names[npc].dialogue.at(-1)!];
      if(giver){
        const complete=before.quests[giver]==="claimed";
        const ready=before.quests[giver]==="active" && questProgress(giver,result.state).ready;
        const text=npc==="elder"
          ? complete?"I hear people greeting you by name now. That makes this old plaza feel like home.":ready?"Three introductions already? Take these seeds. You'll know who to ask about planting them.":"Would you say hello to three neighbors? Count me as your first. I've saved two seeds for you."
          : complete?"That harvest made a fine bundle for the market. Thank you, Lofi.":ready?"Look at that harvest! Here's the hay I put aside for your animal friends.":"Look for a ripe plot in the garden. Bring in a harvest and I'll set aside two bundles of hay.";
        if(!first)lines.length=0;
        lines.push(text);
      }
      setDialogue({npc,page:0,lines});
    }
    if(before.nursery!=="flowing" && result.state.nursery==="flowing"){
      onComplete("Water for Eastbank");
      unlockAchievement("eastbank_flow");
    }
    if (action === "fish") unlockAchievement("master_angler");
    if (action === "feed" || action === "play") unlockAchievement("animal_friend");
    if (action === "fish" || action === "feed" || action === "play") setSelected(null);
    if (action === "rest") setConfirmRest(false);
    if (action === "return_haven") onReturn();
    if (action === "board") onBoard();
  };
  const questProgress=(id:string,s:LivingStateV1)=>{
    const goal=id==="greet_three"?3:1;
    const count=Math.min(goal,id==="greet_three"?s.talked.length:s.harvestCount);
    return {count,goal,ready:count===goal};
  };
  const claim = (id: string) => {
    const result = claimLiving(current.current, id); setMessage(result.message);
    if (result.ok) {
      commit(result.state);
      onComplete(quests[id].title);
      if (id === "greet_three") unlockAchievement("greet_neighbors");
      if (id === "first_harvest") unlockAchievement("first_harvest");
      scene.current?.cue(true,"play");
    } else scene.current?.cue(false);
    if(dialogue)setDialogue({...dialogue,page:0,lines:[result.ok?"Here you go. "+Object.entries(quests[id].reward).map(([item,n])=>n+" "+item).join(", ")+" for your village bag.":result.message]});
  };
  const label = (o: LivingObject) => o.kind === "npc" ? names[o.npcId!]?.name : o.kind === "animal" ? animals[o.animalId!]?.name : places[o.id as keyof typeof places] ?? o.id.replaceAll("_", " ");
  const nearest = grove.objects.filter(o => o.actions.length && nearby(o, state.position)).sort((a, b) => (a.kind === "npc" ? -1 : 0) - (b.kind === "npc" ? -1 : 0))[0];
  useEffect(()=>{
    const o=grove.objects.find(o=>(o.kind==="building" || o.kind==="activity") && nearby(o,state.position));
    const verbs:Record<string,string>={rest:"Rest",fish:"Cast line",trade:"Trade",inspect:"Inspect",board:"Travel",refill:"Refill",workshop:"Visit workshop"};
    scene.current?.showBuildingHint(locked?undefined:o,o?label(o):"",o?verbs[o.actions[0]] ?? "Inspect":"");
  },[state.position,locked,ready]);
  const meet = (object:LivingObject) => {
    setChoices([]);openTarget(object.id);
    if(object.kind==="npc")interact(object,"talk");
    else if(object.kind==="animal")interact(object,"observe");
    else setMessage("Choose an activity.");
  };
  const useNearby = () => {
    stopRoute();
    const targets=grove.objects.map(location).filter(o=>o.actions.length && nearby(o,current.current.position));
    if(targets.length===1)meet(targets[0]);
    else if(targets.length>1)setChoices(targets);
    else setMessage("Walk beside a neighbor or an activity.");
  };

  useEffect(() => {
    const hub = new GroveScene(current.current, () => setReady(true), (id, tile) => {
      if (lockRef.current) return;
      if (id) { const o=location(objectFor(id)!); if(nearby(o,current.current.position))openTarget(id);else travel(pathToApproach(current.current.position,o),id); }
      else if (tile[0] >= 0 && tile[1] >= 0 && tile[0] < grove.width && tile[1] < grove.height) travel(pathToTile(current.current.position, tile));
    });
    hub.fail=()=>setLoadError(true);scene.current = hub;
    const game = new Phaser.Game({ type: Phaser.AUTO, parent: "grove-canvas", width: 640, height: 360, backgroundColor: "#8acb9b", pixelArt: true, roundPixels: true, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: [hub] });
    return () => { stopRoute(); game.destroy(true); scene.current = null; };
  }, []);
  useEffect(() => { if (ready) scene.current?.setMuted(muted); }, [muted, ready]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if(!ready || loadError)return;
      if(e.key.toLowerCase()==="q" && !e.repeat && (!locked || bag)){stopRoute();setJournalPage("quests");setBag(!bag || journalPage!=="quests");return}
      if (dialogue || confirmRest) { if (e.key === "Escape") { setDialogue(null); if(dialogue)setSelected(null); setConfirmRest(false); } return; }
      if (e.key === "Escape" && !e.repeat) { stopRoute(); if(choices.length)setChoices([]); else if (selected) setSelected(null); else if (bag) setBag(false); else setPaused(!paused); return; }
      if (e.key.toLowerCase() === "i" && !e.repeat && !paused && !selected) { stopRoute(); setBag(!bag); return; }
      if (locked) return;


      if (!e.repeat && (e.key.toLowerCase() === "e" || e.key === " ")) { e.preventDefault(); useNearby(); }
    };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  });

  const closeDialogue=()=>{setDialogue(null);setSelected(null)};
  const activeQuests=Object.entries(quests).filter(([id])=>state.quests[id]==="active");
  const giverQuest=dialogue ? names[dialogue.npc].quest : undefined;
  const nearestObj = grove.objects.find(o => o.actions.length && nearby(o, state.position));
  const pillInfo: BuildingInfo | null = nearestObj && scene.current && !locked ? (() => {
    const pt = scene.current.screenPointOf(nearestObj.id);
    if (!pt) return null;
    const meta = buildingMeta[nearestObj.id] ?? (
      nearestObj.kind === "npc" ? { name: names[nearestObj.npcId!]?.name ?? "Neighbor", func: names[nearestObj.npcId!]?.role ?? "Talk & Interact" }
      : nearestObj.kind === "animal" ? { name: animals[nearestObj.animalId!]?.name ?? "Animal", func: animals[nearestObj.animalId!]?.food ? `Care · Favorite: ${animals[nearestObj.animalId!].food}` : "Observe from a distance" }
      : nearestObj.kind === "crop" ? { name: "Garden Plot", func: state.crops[nearestObj.id]?.stage === 4 ? "Harvest Ripe Crops" : state.crops[nearestObj.id]?.wateredDay === state.day ? "Watered · Growing after rest" : "Water Plot with Canister" }
      : { name: label(nearestObj), func: "Interact with " + label(nearestObj) }
    );
    return { name: meta.name, func: meta.func, x: pt.x, y: pt.y };
  })() : null;

  return <section className="grove-shell" aria-label="Komodo Grove social hub">
    {(!ready || loadError) && <LoadScreen place="Entering Komodo Grove" error={loadError}/>}
    {ready && <aside className="grove-quest-hud rpg-quest-hud" role="region" aria-label="Neighbor quests">
      <div className="quest-board-header">
        <img className="quest-board-icon" src="/assets/props/notice_board.png" alt="" aria-hidden="true" />
        <div className="quest-board-titles">
          <small>COMMUNITY LOG</small>
          <strong className="quest-board-name">Neighbor Quests</strong>
        </div>
      </div>
      <button className="quest-hud-expand sr-only" disabled={locked} onClick={()=>{stopRoute();setJournalPage("quests");setBag(true)}}>Quests</button>
      <ul className="quest-board-list">
        {!locked && activeQuests.map(([id,q])=>{
          const prog = questProgress(id,state);
          return (
            <li key={id} className={`quest-board-item ${prog.ready?"is-ready":""}`} onClick={()=>{stopRoute();setJournalPage("quests");setBag(true)}}>
              <TaskTitle done={prog.ready} title={q.title} />
              <small className="quest-task-detail">{q.objective} · {prog.count}/{prog.goal}</small>
              {prog.ready && <span className="quest-ready-badge"><img className="quest-star-icon" src="/assets/fx/fx_campaign_star.png" alt="" aria-hidden="true" /> Ready to claim!</span>}
            </li>
          );
        })}
        {!locked && state.nursery==="surveyed" && (
          <li className="quest-board-item" onClick={()=>{stopRoute();setJournalPage("quests");setBag(true)}}>
            <TaskTitle done={false} title="Water for Eastbank" />
            <small className="quest-task-detail">Balance the Eastbank gates</small>
          </li>
        )}
      </ul>
    </aside>}
    <BuildingPill info={pillInfo}/>
    <PlayerHUD location="Grove" day={state.day}/><div className="grove-title"><div><p className="eyebrow">Living World · social hub</p><h1>{zone?.id==="nursery"?"Eastbank Nursery":"Komodo Grove"}</h1><p>Day {state.day} · {zone?.name ?? "Wilderness"} · Tile {state.position.join(",")} · <span className="rpg-compass-badge" title={"Waypoint: " + places[destination]}><img className="compass-icon-img" src="/assets/icons/icon_pin.png" alt="" aria-hidden="true" /> {places[destination]} {Math.round(Math.hypot((landmark.tile as Tile)[0] - state.position[0], (landmark.tile as Tile)[1] - state.position[1])) > 1 ? `${Math.round(Math.hypot((landmark.tile as Tile)[0] - state.position[0], (landmark.tile as Tile)[1] - state.position[1]))}t ${getCompassArrow(state.position, landmark.tile as Tile)}` : "Arrived"}</span></p></div><button onClick={()=>{stopRoute();setPaused(true)}}>Pause</button></div>
    <div className="grove-layout"><div className="grove-world"><div id="grove-canvas" />{!ready && <div className="grove-loading">Preparing Komodo Grove…</div>}{!locked && <div className="grove-controls"><TouchJoystick onMove={dir => { const step = directions[{N:"w",S:"s",E:"d",W:"a"}[dir]]; move(...step); }} disabled={locked} /><button className="touch-action" onClick={useNearby} disabled={locked}>Act</button></div>}</div>
    {!locked && <button className="grove-bag" onClick={()=>{stopRoute();setBag(true)}}>Bag</button>}
    {!!choices.length && <div className="modal-backdrop"><section className="journal" role="dialog" aria-label="Nearby"><h2>Within reach</h2>{choices.map(o=><button key={o.id} onClick={()=>meet(location(o))}>{label(o)}</button>)}<button onClick={()=>setChoices([])}>Close</button></section></div>}
    {paused && <div className="modal-backdrop"><section className="journal" role="dialog" aria-label="Paused"><h2>Paused</h2><Mixer/><button onClick={()=>setPaused(false)}>Resume</button><button onClick={onMute}>{muted ? "Enable sound" : "Mute sound"}</button><button onClick={onReturn}>Return to Haven</button></section></div>}
    {(bag || selectedObject) && !dialogue && !confirmRest && <div className="modal-backdrop"><section className="journal" role="dialog" aria-label={bag ? "Village bag" : "Interaction"}>{!bag && <button onClick={()=>setSelected(null)}>Close</button>}{!bag && message && <p className="grove-message" role="status">{message}</p>}{saveWarning && <p role="alert">Your browser blocked saving. This session remains playable.</p>}
      {bag && <><div className="book-tabs"><button aria-pressed={journalPage==="items"} onClick={()=>setJournalPage("items")}>Items</button><button aria-pressed={journalPage==="quests"} onClick={()=>setJournalPage("quests")}>Quests</button><button aria-pressed={journalPage==="map"} onClick={()=>setJournalPage("map")}>Map</button><button aria-pressed={journalPage==="achievements"} onClick={()=>setJournalPage("achievements")}>Feats</button></div>{journalPage==="items" ? <div className="grove-inventory"><h2>Village bag</h2><BagGrid items={Object.entries(state.inventory).map(([id,quantity])=>({name:id,quantity,icon:id==="water"?"/assets/icons/icon_water_canister.png":"/assets/living/icons/lw_icon_"+id+".png",info:({hay:"For Mochi and Cloud.",seed:"For Sunny and Puddle.",kibble:"For Biscuit and Miso.",water:"Refill the watering can at the pump.",produce:"Trade at the market for seeds or animal food.",fish:"Caught at the village dock."} as Record<string,string>)[id]}))}/></div>
      : journalPage==="map" ? <div className="village-atlas"><h2>Komodo Grove</h2>
        <canvas ref={mapCanvas} aria-label={"Walking route from Lofi to "+places[destination]}/>
        <label>Destination <select value={destination} onChange={e=>setDestination(e.target.value as keyof typeof places)}>{Object.entries(places).map(([id,name])=><option value={id} key={id}>{name}</option>)}</select></label>
        <button onClick={()=>{setBag(false);travel(path(),destination)}}>Walk to {places[destination]}</button></div>
      : journalPage==="achievements" ? <AchievementsList />
      : <div className="grove-quests"><h2>Neighbor quests</h2><div><TaskTitle done={state.nursery==="flowing"} title="Water for Eastbank"/><small>{state.nursery==="dry"?"Read the survey at the water lab.":state.nursery==="surveyed"?"Cross the orchard bridge and balance the nursery gate.":"Complete · Water reaches all three beds."}</small></div>{Object.entries(quests).map(([id, q]) => <div key={id}><TaskTitle done={state.quests[id]==="claimed"} title={q.title}/><small>{q.objective} · {state.quests[id]==="claimed"?"Completed":state.quests[id]==="active"?questProgress(id,state).count+"/"+questProgress(id,state).goal:"Meet "+(id==="greet_three"?"Elder Toma in the plaza":"Ari near the garden")}</small>{state.quests[id] === "active" && <button disabled={!questProgress(id,state).ready} onClick={() => claim(id)}>Claim reward</button>}</div>)}</div>
      }</>}{selectedObject && <div className="grove-target"><h2>{selectedObject ? label(selectedObject) : "Nearby"}</h2>{selectedObject?.kind === "npc" && <p>{names[selectedObject.npcId!]?.role}</p>}{selectedObject?.kind === "animal" && <><p>Friendship {state.animals[selectedObject.animalId!]?.friendship ?? 0}/100 · {animals[selectedObject.animalId!]?.food ? `Favorite food: ${animals[selectedObject.animalId!]?.food}` : "Observe from a distance"}</p><div className="track" role="progressbar" aria-label={`${label(selectedObject)} friendship`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.animals[selectedObject.animalId!]?.friendship ?? 0}><span style={{ width: `${state.animals[selectedObject.animalId!]?.friendship ?? 0}%`, background: "#c65d43" }} /></div></>}{selectedObject?.kind === "crop" && <p>Growth: {livingConfig.rules.cropStages[state.crops[selectedObject.id]?.stage ?? 0]}</p>}{!selectedObject && <p>{nearest ? `${label(nearest)} is within reach.` : "Tap a character or place to walk there."}</p>}
      {selectedObject?.id==="nursery_gate" && state.nursery==="surveyed" ? <NurseryGate onRelease={levels=>interact(selectedObject,"inspect",levels)}/> : selectedObject?.id==="nursery_gate" && state.nursery==="flowing" ? <p>All three beds have water.</p> : selectedObject && <div className="grove-actions">{selectedObject.actions.map(action => action==="fish" && state.fishDay!==state.day ? <Fishing key={action} catchFish={()=>interact(selectedObject,"fish")}/> : action === "trade" ? <div key={action}>Trade 1 produce for {(["hay", "seed", "kibble"] as const).map(item => <button key={item} onClick={() => interact(selectedObject, "trade", item)}>{item} ×2</button>)}</div> : <button key={action} onClick={() => interact(selectedObject, action as LivingAction)}>{selectedObject.id==="water_lab"?"Read the survey":selectedObject.id==="nursery_gate"?"Examine the gate":action.replaceAll("_", " ")}</button>)}</div>}</div>
      }
    {bag && <button onClick={()=>setBag(false)}>Close</button>}</section></div>}</div>
    {dialogue && <Dialogue muted={muted} onSound={onMute} extra={giverQuest && dialogue.page===dialogue.lines.length-1 && state.quests[giverQuest]!=="claimed" && <div className="quest-slip"><strong>{quests[giverQuest].title}</strong><small>{quests[giverQuest].objective} · {questProgress(giverQuest,state).count}/{questProgress(giverQuest,state).goal}</small>{!state.quests[giverQuest]?<><button onClick={()=>selectedObject && interact(selectedObject,"talk","accept")}>Accept quest</button><button onClick={closeDialogue}>Decline</button></>:questProgress(giverQuest,state).ready && <><button onClick={()=>claim(giverQuest)}>Collect reward</button><button onClick={closeDialogue}>Later</button></>}</div>} key={dialogue.npc + dialogue.page} name={names[dialogue.npc].name}
      portrait={objectFor("npc_"+dialogue.npc)?.asset.startsWith("lw_") ? "/assets/living/portraits/lw_portrait_"+dialogue.npc+".png" : "/assets/sprites/npc_"+dialogue.npc+"_front.png"}
      line={dialogue.lines[dialogue.page]} last={dialogue.page+1 >= dialogue.lines.length}
      onClose={() => {setDialogue(null);setSelected(null)}} onNext={() => {if(dialogue.page+1 < dialogue.lines.length)setDialogue({...dialogue,page:dialogue.page+1});else {setDialogue(null);setSelected(null)}}} />}
    {confirmRest && <div className="modal-backdrop"><section className="grove-dialogue" role="dialog" aria-modal="true" aria-label="Confirm rest"><div><h2>Rest until tomorrow?</h2><p>Watered crops grow one stage. Animal care and daily activities reset.</p><button className="primary" onClick={() => selectedObject && interact(selectedObject, "rest", "confirm")}>Rest</button><button onClick={() => setConfirmRest(false)}>Stay awake</button></div></section></div>}
  </section>;
}
