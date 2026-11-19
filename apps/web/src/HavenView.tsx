import {loadLiving,livingConfig} from "./living";
import {useHeldMovement} from './useHeldMovement';
import {PlayerHUD,BagGrid,TaskTitle} from "./GameUI";
import {Mixer} from "./Mixer";
import { Dialogue } from "./Dialogue";
import React, { forwardRef, useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { bagUsed, map, type State } from "../../../packages/game-core/src/game";
import { HavenScene } from "./HavenScene";
import { nearbyPost,atBoard, atWorkshop, browserStorage, haven, havenSpawn, HAVEN_POSITION_KEY, markIntroSeen, readHavenPosition, walkHaven, type HavenPosition } from "./haven";
import { TouchJoystick } from "./TouchJoystick";
import { posts } from "./haven";

export type HavenHandle = { newGame: () => void; continueGame: () => void; replay: () => void; returnToBoard: (open?:boolean) => void };
type Direction = "N" | "S" | "E" | "W";

const trailKey="ripple.havenTrail.v1";

export const HavenView = forwardRef<HavenHandle, { onComplete:(title:string)=>void;missionDone:boolean; preview:boolean; visible: boolean; muted: boolean; player: State; onBoard: () => void; onGrove: () => void; onToggleMuted: () => void }>(function HavenView({ onComplete,missionDone,preview,visible, muted, player, onBoard, onGrove, onToggleMuted }, ref) {
  const storage = useRef(browserStorage()).current;
  const initial = useRef<HavenPosition>(readHavenPosition(storage));
  const position = useRef<HavenPosition>(initial.current);
  const scene = useRef<HavenScene | null>(null);
  const ready = useRef(false);
  const pendingContinue = useRef(false);
  const pending = useRef<"ended" | "skip" | "error" | null>(null);
  const controls = useRef(false);
  const introMode = useRef<"new" | "replay">("new");
  const overlay = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const tutorialTimer = useRef<number | null>(null);
  const [hud, setHud] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [entered, setEntered] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [tile, setTile] = useState<HavenPosition>(position.current);
  const [message, setMessage] = useState("Aurora: Welcome to Himalayan Haven. Walk east to the world board.");
  const [boardOpen, setBoardOpen] = useState(false);
  const [panel,setPanel] = useState<"pause"|"bag"|null>(null);
  const [line,setLine] = useState<number|null>(null);
  const conversation = ["The thaw woke you! How do your feet feel, Lofi?", "Steady enough for a first step.", "Two steps east. Read the board beside the workshop with me."];
  const post=nearbyPost(tile);
  const [stamps,setStamps]=useState<string[]>(()=>{
    try {
      const saved=JSON.parse(storage.getItem(trailKey) ?? "[]");
      return posts.filter(p=>Array.isArray(saved) && saved.includes(p.name)).map(p=>p.name);
    } catch {return []}
  });
  const [reading,setReading]=useState(false);
  const village=React.useMemo(()=>boardOpen ? loadLiving(storage) : null,[boardOpen,visible,storage]);
  const locked = reading || !!panel || line!==null || boardOpen;
  useEffect(()=>{
    const resize=()=>scene.current?.fitWorld(preview || (visible && hud && !playing));
    resize();window.addEventListener("resize",resize);return ()=>window.removeEventListener("resize",resize);
  },[preview,visible,hud,playing,sceneReady]);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const finishRef = useRef<(reason: "ended" | "skip" | "error") => void>(() => {});
  const resumeRef = useRef<() => void>(() => {});

  useEffect(() => {
    const hub = new HavenScene(position.current, () => {
      ready.current = true;
      setSceneReady(true);
      if (pending.current) { const reason = pending.current; pending.current = null; finishRef.current(reason); }
      else if (pendingContinue.current) { pendingContinue.current = false; resumeRef.current(); }
    });
    scene.current = hub;
    const game = new Phaser.Game({ type: Phaser.CANVAS, parent: "haven-canvas", width: haven.viewport.width, height: haven.viewport.height, backgroundColor: "#e9f5fb", pixelArt: true, roundPixels: true, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: [hub] });
    return () => { game.destroy(true); scene.current = null; if (tutorialTimer.current !== null) window.clearTimeout(tutorialTimer.current); };
  }, []);

  const finish = (reason: "ended" | "skip" | "error") => {
    if (overlay.current?.hidden) return;
    video.current?.pause();
    if (!ready.current) { pending.current = reason; return; }
    // Reveal the already rendered Phaser canvas in this callback. There is no intermediary frame or fade.
    if (overlay.current) overlay.current.hidden = true;
    controls.current = true;
    setPlaying(false);
    setEntered(true);
    if (introMode.current === "new") {
      setStamps([]);
      try {storage.setItem(trailKey,"[]")} catch { /* Local play continues. */ }
      try { storage.setItem(HAVEN_POSITION_KEY, JSON.stringify(position.current)); markIntroSeen(storage); } catch { /* Private browsing may deny storage. Gameplay continues. */ }
      setMessage(reason === "error" ? "Aurora: The film was unavailable. Welcome to camp! Walk east to the world board." : "Aurora: Welcome to Himalayan Haven. Walk east twice to the world board.");
    } else setMessage("Aurora: Your journey continues. Visit the world board when ready.");
    if (tutorialTimer.current !== null) window.clearTimeout(tutorialTimer.current);
    tutorialTimer.current = window.setTimeout(() => setHud(true), 250);
    if (!mutedRef.current) scene.current?.setAudio(true);
  };
  finishRef.current = finish;
  const resume = () => {
    controls.current = true;
    setHud(true);
    setPlaying(false);
    setEntered(true);
    setMessage("Aurora: Welcome back. Visit the world board to choose an expedition.");
    if (!mutedRef.current) scene.current?.setAudio(true);
  };
  resumeRef.current = resume;

  const play = (mode: "new" | "replay") => {
    setBoardOpen(false);
    introMode.current = mode;
    scene.current?.fitWorld(false);
    controls.current = false;
    setHud(false);
    setPlaying(true);
    setEntered(false);
    pending.current = null;
    pendingContinue.current = false;
    if (tutorialTimer.current !== null) window.clearTimeout(tutorialTimer.current);
    if (ready.current) scene.current?.setAudio(false);
    if (mode === "new") { position.current = havenSpawn(); setTile(position.current); scene.current?.setPosition(position.current, false); }
    if (overlay.current) overlay.current.hidden = false;
    const film = video.current;
    if (!film) { finishRef.current("error"); return; }
    film.muted = mutedRef.current;
    film.currentTime = 0;
    film.play().catch(() => finishRef.current("error"));
  };
  React.useImperativeHandle(ref, () => ({
    newGame: () => play("new"),
    replay: () => play("replay"),
    returnToBoard: (open=true) => {
      const approach = haven.interactions[0].approach as HavenPosition;
      position.current = atBoard(approach) ? [...approach] : havenSpawn();
      setTile(position.current);
      scene.current?.setPosition(position.current, false);
      try { storage.setItem(HAVEN_POSITION_KEY, JSON.stringify(position.current)); } catch { /* Continue without local persistence. */ }
      controls.current = true; setEntered(true); setHud(true); setBoardOpen(open);
      setMessage("Aurora: Welcome back. Choose where to go next.");
    },
    continueGame: () => {
      position.current = readHavenPosition(storage);
      setTile(position.current);
      scene.current?.setPosition(position.current, false);
      if (overlay.current) overlay.current.hidden = true;
      if (ready.current) resumeRef.current(); else pendingContinue.current = true;
    },
  }));

  useEffect(() => { if (ready.current && !playing) scene.current?.setAudio(visible && !muted); }, [muted, playing, visible, sceneReady]);
  const move = (dir: Direction) => {
    if (!visible || !controls.current || locked) return;
    if (!hud) { setHud(true); if (tutorialTimer.current !== null) window.clearTimeout(tutorialTimer.current); }
    const next = walkHaven(position.current, dir);
    if (next[0] === position.current[0] && next[1] === position.current[1]) { setMessage("The path is blocked."); return; }
    position.current = next;
    setTile(next);
    scene.current?.setPosition(next);
    try { storage.setItem(HAVEN_POSITION_KEY, JSON.stringify(next)); } catch { /* Local play remains available. */ }
    if (atBoard(next)) setMessage("Aurora: The world board is beside you. Press E or Interact.");
  };
  const interact = () => {
    if (!visible || !controls.current || locked) return;
    if (!hud) { setHud(true); if (tutorialTimer.current !== null) window.clearTimeout(tutorialTimer.current); }
    const landmark=nearbyPost(position.current);
    if (landmark) {
      if(!stamps.includes(landmark.name)){
        const next=[...stamps,landmark.name];
        setStamps(next);
        if(next.length===posts.length)onComplete("Highland mail trail");
        try {storage.setItem(trailKey,JSON.stringify(next))} catch { /* Local play continues. */ }
      }
      setReading(true);
    }
    else if (atBoard(position.current)) setBoardOpen(true);
    else if (atWorkshop(position.current)) setMessage("Aurora: This is the workshop. Crafting happens during expeditions. The world board is southeast.");
    else setLine(0);
  };
  useHeldMovement(visible && !playing && entered && !locked,move);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (!visible) return;
      if (playing && event.key === "Escape") { event.preventDefault(); finishRef.current("skip"); return; }
      if (boardOpen && event.key === "Escape") { event.preventDefault(); setBoardOpen(false); return; }
      if (!playing && entered && !boardOpen && line===null && !event.repeat) {
        if(event.key==="Escape"){setPanel(panel ? null : "pause");return}
        if(event.key.toLowerCase()==="i"){setPanel(panel ? null : "bag");return}
      }
      if (!event.repeat && event.key.toLowerCase() === "e") { event.preventDefault(); interact(); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  return <section className={`haven-shell${visible || preview ? "" : " haven-hidden"}`} aria-label="Himalayan Haven base camp">
    <div className={"haven-stage"+((preview || hud) && !playing ? " exploring" : "")}>
      <div id="haven-canvas" />
      {!sceneReady && !playing && <div className="haven-loading">Preparing Himalayan Haven…</div>}
      <div className="haven-video-overlay" ref={overlay} hidden={!playing}>
        <video ref={video} src="/assets/cinematic/ripple_opening.mp4" playsInline preload="auto" onEnded={() => finishRef.current("ended")} onError={() => finishRef.current("error")} />
        <button className="skip-intro" onClick={() => finishRef.current("skip")}>Skip Intro</button>
      </div>
    </div>
    {hud && !playing && <PlayerHUD location="Haven" energy={player.energy} xp={player.xp}/>}
    {hud && !playing && <><div className="camp-objective">{tile[0]>=20?"Himalayan Highlands":"Himalayan Haven"}<button onClick={()=>setPanel("pause")}>Pause</button></div>
    <p className="camp-hint">{atBoard(tile) ? "World Board · Interact" : post ? post.name+" · Inspect" : tile[0]>=20 ? "Highland circuit · follow the lanterns" : "World Board east · Highland trail beyond camp"}</p></>}
    {entered && !playing && !locked && <div className="haven-actions"><TouchJoystick onMove={move}/><button className="touch-action" onClick={interact}>Act</button><button onClick={()=>setPanel("bag")}>Bag</button></div>}
    {reading && post && <Dialogue muted={muted} onSound={onToggleMuted} name={post.name} portrait="/assets/icons/icon_pin.png" line={post.text} extra={<strong>Trail journal · {stamps.length} / {posts.length} stamps</strong>} last onNext={()=>setReading(false)} onClose={()=>setReading(false)}/>}
    {line!==null && <Dialogue muted={muted} onSound={onToggleMuted} key={line} name={line===1?"Lofi":"Aurora"} portrait={"/assets/sprites/"+(line===1?"yeti":"aurora")+"_portrait.png"} line={conversation[line]} last={line===2} onNext={()=>setLine(line===2?null:line+1)} onClose={()=>setLine(null)}/>}
    {panel && <div className="modal-backdrop"><section className="journal" role="dialog"><h2>{panel==="bag"?"Backpack":"Paused"}</h2>
    {panel==="bag"?<><p>{bagUsed(player)} / {map.rules.bag_capacity} spaces used</p><h3>Highland trail journal</h3><p>{stamps.length===posts.length?"Circuit complete. All four stops are in your journal.":"Inspect the four posts beyond the east gate."}</p><ul className="trail-stamps">{posts.map(p=><li key={p.name} data-stamped={stamps.includes(p.name)}><strong>{p.name}</strong><small>{stamps.includes(p.name)?"Stamped":"Unvisited"}</small></li>)}</ul></>:<><Mixer/><button onClick={()=>{setPanel(null);play("replay")}}>Replay opening</button><button onClick={onToggleMuted}>{muted?"Enable sound":"Mute sound"}</button></>}
    <button onClick={()=>setPanel(null)}>Resume</button></section></div>}
    {boardOpen && visible && hud && !playing && village && <section className="haven-board quest-board" role="dialog" aria-label="World board">
      <header><img src="/assets/props/notice_board.png" alt=""/><div><small>Himalayan Haven</small><h2>Community task board</h2></div></header>
      <button className="primary task-link" onClick={()=>{setBoardOpen(false);onBoard()}}><TaskTitle done={missionDone} title="Operation Komodo"/><small>{missionDone?"Replay expedition →":"Restore water to both homes →"}</small></button>
      <button className="primary task-link" onClick={()=>{setBoardOpen(false);onGrove()}}><TaskTitle done={village.nursery==="flowing"} title="Water for Eastbank"/><small>Visit Komodo Grove →</small></button>
      {Object.entries(livingConfig.quests).map(([id,q])=><div className="board-entry" key={id}><TaskTitle done={village.quests[id]==="claimed"} title={q.title}/><small>{q.objective}</small></div>)}
      <div className="board-entry"><TaskTitle done={stamps.length===posts.length} title="Highland mail trail"/><small>{stamps.length} of {posts.length} posts visited · East road</small></div>
      <button className="board-close" onClick={()=>setBoardOpen(false)}>Close</button>
    </section>}
  </section>;
});
