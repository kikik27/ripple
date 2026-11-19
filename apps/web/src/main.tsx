import {AssetBoot,LoadScreen} from "./AssetBoot";
import {BuildingPill,type BuildingInfo} from "./BuildingPill";
import {PlayerHUD,BagGrid} from "./GameUI";
import {Mixer} from "./Mixer";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Phaser from "phaser";
import {
  map,
  initialState,
  reduce,
  bagUsed,
  pipeReachable,
  pipesConnected,
  InvalidAction,
  type State,
  type Action,
  type Direction,
} from "../../../packages/game-core/src/game";
import { ExpeditionScene } from "./ExpeditionScene";
import { HavenView, type HavenHandle } from "./HavenView";
import { GroveView } from "./GroveView";
import { hasSeenIntro } from "./haven";
import { TouchJoystick } from "./TouchJoystick";
import { unlockAchievement } from "./achievements";
import operation from "../../../fixtures/operation-komodo.json";
import "./style.css";
import "./shell.css";

type Screen = "title" | "camp" | "campaign" | "game" | "exhausted" | "grove";
const A = "/assets/";
const campaign = {title:operation.title,notice:operation.fiction_notice,target:operation.target_rp,credit:operation.sponsor_policy.amount};
function App() {
  const [menu,setMenu] = useState<"bag"|"pause"|null>(null);
  const [havenReady,setHavenReady]=useState(false),[expReady,setExpReady]=useState(false),[loadError,setLoadError]=useState(false);
  const shellRef = useRef<HTMLElement>(null);
  const newGameDialog = useRef<HTMLDialogElement>(null);
  const requestGameFullscreen = () => {
    try { void shellRef.current?.requestFullscreen?.().catch(() => { /* Full viewport remains playable. */ }); }
    catch { /* Fullscreen is optional on this browser. */ }
  };
  const [screen, setScreen] = useState<Screen>("title"),
    [state, setState] = useState<State>(initialState),

    [message, setMessage] = useState(
      "Aurora: The village needs water. Gather materials at the depot.",
    ),
    [puzzle, setPuzzle] = useState(false),
    [confirmNewGame, setConfirmNewGame] = useState(false),
    [muted, setMuted] = useState(true),
    [funding] = useState({ released: 0, goal: campaign.credit });
  const [missionDone,setMissionDone]=useState(()=>{
    try {
      const saved:Action[]=JSON.parse(localStorage.getItem("ripple.komodo.completedReplay.v1") ?? "[]");
      return Array.isArray(saved) && saved.length<=map.rules.max_actions && saved.reduce((s,a)=>reduce(s,a),initialState()).finished;
    }catch{return false}
  });
  const [badge,setBadge]=useState<{title:string;detail:string}|null>(null);
  useEffect(()=>{
    if(!badge)return;
    const timer=window.setTimeout(()=>setBadge(null),6500);
    return ()=>window.clearTimeout(timer);
  },[badge]);
  useEffect(() => {
    const onAch = (e: Event) => {
      const ach = (e as CustomEvent).detail;
      if (ach?.title) {
        setBadge({ title: `Feat: ${ach.title}`, detail: ach.desc });
        try {
          const audio = new Audio("/assets/audio/sfx_success.ogg");
          audio.volume = 0.35;
          audio.play().catch(() => {});
        } catch {}
      }
    };
    window.addEventListener("ripple:achievement", onAch);
    return () => window.removeEventListener("ripple:achievement", onAch);
  }, []);
  const sceneRef = useRef<ExpeditionScene | null>(null),
    havenRef = useRef<HavenHandle | null>(null),
    stateRef = useRef(state),
    logRef = useRef<Action[]>([]);
  const movement = useRef<{key:string; timer:number} | null>(null);
  const step = useRef<(dir:Direction)=>void>(()=>{});
  const stopMoving = () => {
    if (movement.current) window.clearInterval(movement.current.timer);
    movement.current=null;
  };
  useEffect(()=>{
    const released=(event:KeyboardEvent)=>{if(event.key===movement.current?.key)stopMoving()};
    window.addEventListener("keyup",released);
    window.addEventListener("blur",stopMoving);
    document.addEventListener("fullscreenchange",stopMoving);
    document.addEventListener("visibilitychange",stopMoving);
    return ()=>{stopMoving();window.removeEventListener("keyup",released);window.removeEventListener("blur",stopMoving);document.removeEventListener("fullscreenchange",stopMoving);document.removeEventListener("visibilitychange",stopMoving)};
  },[]);
  useEffect(()=>{stopMoving()},[screen,puzzle,menu]);
  useEffect(() => {
    if (confirmNewGame) newGameDialog.current?.showModal();
  }, [confirmNewGame]);
  const near = (p: readonly number[]) =>
    Math.abs(state.position[0] - p[0]) + Math.abs(state.position[1] - p[1]) <=
    1;
  const dispatch = (action: Action) => {
    try {
      const next = reduce(stateRef.current, action);
      stateRef.current = next;
      setState(next);
      const actions = [...logRef.current, action];
      logRef.current = actions;

      sceneRef.current?.renderState(next, action.type === "MOVE");
      if (action.type !== "MOVE") sceneRef.current?.showAction(action);
      const cue: Record<string, string> = {
        GATHER: action.type==="GATHER" ? ({stone:"sfx_gather_stone",metal:"sfx_gather_metal",wood:"sfx_gather"}[map.nodes.find(n=>n.id===action.node_id)!.material] ?? "sfx_gather") : "sfx_gather",
        REPAIR_BRIDGE: "sfx_build",
        CRAFT_WELL: "sfx_craft",
        BUILD_WELL: "sfx_build",
        CONNECT_WATER: "sfx_water",
        FINISH: "sfx_success",

      };
      if (cue[action.type]) sceneRef.current?.cue(cue[action.type]);
      
      if (action.type === "CONNECT_WATER") setPuzzle(false);
      if (action.type === "FINISH") {
        try {localStorage.setItem("ripple.komodo.completedReplay.v1",JSON.stringify(actions))}catch{ /* Keep completion for the session. */ }
        stopMoving();setPuzzle(false);setMenu(null);setMissionDone(true);setBadge({title:"Water reaches both homes",detail:`Operation Komodo · ${next.xp} XP · ${next.rp} virtual RP`});
        unlockAchievement("water_to_homes");
        havenRef.current?.returnToBoard(false);setScreen("camp");
      }
      else if (next.energy === 0) {
        stopMoving(); setMenu(null); setPuzzle(false); setScreen("exhausted");
      }
      setMessage(
        action.type === "CONNECT_WATER"
          ? "Aurora: Both homes have water! Return to the starting point."
          : action.type === "FINISH"
            ? "Expedition complete. Local demo progress recorded."
            : action.type === "GATHER"
              ? "Material gathered. Check your backpack."
              : action.type === "REPAIR_BRIDGE"
                ? "Bridge repaired. The short route is open."
                : action.type === "CRAFT_WELL"
                  ? "Well kit ready. Carry it across the river."
                  : action.type === "BUILD_WELL"
                    ? "The well is built. Stay beside it and interact again to lay pipes."
                    : "",
      );
    } catch (e) {
      setMessage(e instanceof InvalidAction ? e.message : "Action failed");
      if(action.type!=="MOVE") sceneRef.current?.cue("sfx_invalid");
    }
  };
  useEffect(() => {
    if (screen !== "game" && screen !== "campaign") return;
    const scene = new ExpeditionScene(screen==="campaign" ? initialState() : stateRef.current,muted,()=>setExpReady(true),()=>setLoadError(true));
    sceneRef.current = scene;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: "game-canvas",
      width: 768,
      height: 640,
      backgroundColor: "#70c9ea",
      pixelArt: true,
      roundPixels: true,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [scene],
    });
    return () => {
      setExpReady(false);sceneRef.current = null;
      game.destroy(true);
    };
  }, [screen === "game" || screen === "campaign"]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (confirmNewGame && e.key === "Escape") { e.preventDefault(); setConfirmNewGame(false); return; }
      if (screen !== "game" || !expReady) return;
      if(e.key==="Escape" && !e.repeat){if(puzzle)setPuzzle(false);else setMenu(menu?null:"pause");return}
      if(!puzzle && e.key.toLowerCase()==="i" && !e.repeat){setMenu(menu?null:"bag");return}
      if(puzzle || menu) return;
      const directions: Record<string, Direction> = {
        ArrowUp: "N",
        ArrowDown: "S",
        ArrowLeft: "W",
        ArrowRight: "E",
        w: "N",
        s: "S",
        a: "W",
        d: "E",
      };
      const dir = directions[e.key];
      if (dir) {
        e.preventDefault();
        if (!e.repeat) {
          stopMoving();step.current(dir);
          movement.current={key:e.key,timer:window.setInterval(()=>step.current(dir),155)};
        }
      } else if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        if (!e.repeat) interact();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  step.current=(dir)=>{if(screen==="game" && !menu && !puzzle)dispatch({type:"MOVE",dir})};
  const interact = () => {
    const n = map.nodes.find(
      (n) => near(n.position) && stateRef.current.stocks[n.id] > 0,
    );
    if (n) dispatch({ type: "GATHER", node_id: n.id });
    else if (
      near(map.workshop) &&
      !stateRef.current.inventory.kit &&
      !stateRef.current.wellBuilt
    )
      dispatch({ type: "CRAFT_WELL" });
    else if (near(map.bridge) && !stateRef.current.bridgeRepaired)
      dispatch({ type: "REPAIR_BRIDGE" });
    else if (near(map.well_site) && !stateRef.current.wellBuilt)
      dispatch({ type: "BUILD_WELL" });
    else if (
      near(map.well_site) &&
      stateRef.current.wellBuilt &&
      !stateRef.current.waterConnected
    )
      setPuzzle(true);
    else if (stateRef.current.waterConnected && state.position.join()===map.extraction.join()) dispatch({ type: "FINISH" });
    else setMessage("Move next to a resource, workshop, bridge or well site.");
  };
  const restart = () => {
    const s = initialState();
    stateRef.current = s;
    logRef.current = [];
    setState(s);

    setPuzzle(false);
    setMessage("Aurora: A fresh expedition begins.");
    setScreen("game");
    if(sceneRef.current?.sys.isActive()) sceneRef.current.renderState(s, false);
  };
  const start = () => {
    restart();
  };
  const beginNewGame = () => {
    requestGameFullscreen();
    havenRef.current?.newGame();
    setConfirmNewGame(false);
    setScreen("camp");
  };
  const objective = state.finished
    ? "Expedition complete"
    : state.waterConnected
      ? "Follow the path west to the starting tile. Interact to finish."
      : state.wellBuilt
        ? "At the well, open Waterworks and supply both homes."
        : state.inventory.kit
          ? "Cross east to the well · bridge costs 2 wood, ford is south"
          : state.inventory.wood >= 2 &&
              state.inventory.stone >= 2 &&
              state.inventory.metal >= 1
            ? "Craft the well kit"
            : "Gather 2 wood, 2 stone, 1 metal";
  const node=map.nodes.find(n=>near(n.position) && state.stocks[n.id]>0);
  const hint=node ? "Gather "+node.material+" · "+state.stocks[node.id]+" left"
    : near(map.workshop) && !state.inventory.kit && !state.wellBuilt ? "Craft kit · 2 wood, 2 stone, 1 metal"
    : near(map.bridge) && !state.bridgeRepaired ? "Repair bridge · 2 extra wood, or take the southern ford"
    : near(map.well_site) && !state.waterConnected ? (state.wellBuilt?"Open waterworks":"Build well · 1 kit")
    : state.waterConnected && state.position.join()===map.extraction.join() ? "Finish expedition" : "";
  const reachable = pipeReachable(state.pipes);
  const expPillInfo: BuildingInfo | null = (() => {
    if (screen !== "game" || !sceneRef.current || puzzle || menu) return null;
    const n = map.nodes.find(n => near(n.position) && state.stocks[n.id] > 0);
    if (n) {
      const pt = sceneRef.current.screenPointOf(n.position);
      if (!pt) return null;
      return {
        name: n.material.toUpperCase() + " Cache",
        func: `Gather ${n.material} · ${state.stocks[n.id]} remaining`,
        x: pt.x,
        y: pt.y - 12
      };
    }
    if (near(map.workshop)) {
      const pt = sceneRef.current.screenPointOf(map.workshop);
      if (!pt) return null;
      return {
        name: "Depot Workshop",
        func: state.inventory.kit || state.wellBuilt ? "Well kit crafted" : "Craft Well Kit · 2 Wood, 2 Stone, 1 Metal",
        x: pt.x,
        y: pt.y - 12
      };
    }
    if (near(map.bridge)) {
      const pt = sceneRef.current.screenPointOf(map.bridge);
      if (!pt) return null;
      return {
        name: "Broken River Bridge",
        func: state.bridgeRepaired ? "River Crossing Repaired" : "Repair Bridge · 2 Extra Wood",
        x: pt.x,
        y: pt.y - 12
      };
    }
    if (near(map.well_site)) {
      const pt = sceneRef.current.screenPointOf(map.well_site);
      if (!pt) return null;
      return {
        name: "Community Well Site",
        func: state.waterConnected ? "Water Restored & Flowing" : state.wellBuilt ? "Waterworks · Lay pipes to both homes" : "Build Well · 1 Well Kit",
        x: pt.x,
        y: pt.y - 12
      };
    }
    const home = map.homes.find(h => near(h));
    if (home) {
      const pt = sceneRef.current.screenPointOf(home);
      if (!pt) return null;
      return {
        name: "Village Home",
        func: state.waterConnected ? "Clean water supplied" : "Drought Cottage · Connect water pipeline",
        x: pt.x,
        y: pt.y - 12
      };
    }
    if (state.waterConnected && state.position.join() === map.extraction.join()) {
      const pt = sceneRef.current.screenPointOf(map.extraction);
      if (!pt) return null;
      return {
        name: "Village Trailhead",
        func: "Finish Expedition · Record demo outcome",
        x: pt.x,
        y: pt.y - 12
      };
    }
    return null;
  })();
  return (
    <main className={`game-shell screen-${screen}`} ref={shellRef}>
      {screen === "title" && (
        <section className="hero">
          <span className="title-weather" aria-hidden="true"/>

          <div>
            <h1><img className="title-logo" src={A + "branding/ripple_logo.png"} alt="Ripple" /></h1>
            <div className="title-actions"><button className="primary" onClick={() => hasSeenIntro() ? setConfirmNewGame(true) : beginNewGame()}>New Game</button>
            {hasSeenIntro() && <button onClick={() => { havenRef.current?.continueGame(); setScreen("camp"); }}>Continue</button>}<button onClick={() => setMuted(!muted)}>{muted ? "Sound off" : "Sound on"}</button></div>
          </div>
        </section>
      )}
      <HavenView onReady={()=>setHavenReady(true)} onError={()=>setLoadError(true)} onComplete={title=>setBadge({title,detail:"Himalayan Haven"})} missionDone={missionDone} preview={screen==="title"} ref={havenRef} visible={screen === "camp"} muted={muted} player={state} onBoard={() => setScreen("campaign")} onGrove={() => setScreen("grove")} onToggleMuted={() => setMuted(!muted)} />
      {badge && (screen==="camp" || screen==="grove") && <aside className="mission-ribbon" role="status"><img src="/assets/branding/ripple_emblem_1024.png" alt=""/><div><small>Mission complete</small><strong>{badge.title}</strong><span>{badge.detail}</span></div><button onClick={()=>setBadge(null)} aria-label="Dismiss mission badge">×</button></aside>}
      {screen === "grove" && <GroveView onComplete={title=>setBadge({title,detail:"Komodo Grove"})} muted={muted} onMute={() => setMuted(!muted)} onReturn={() => { havenRef.current?.returnToBoard(); setScreen("camp"); }} onBoard={() => { havenRef.current?.returnToBoard(); setScreen("camp"); }} />}
      {(screen==="campaign" || screen==="game") && <div className="exp-map" id="game-canvas" aria-label="Operation Komodo map"/>}
      {screen==="campaign" && <section className="campaign-card embark" aria-label="Expedition briefing">
        <div className="embark-note"><img src="/assets/sprites/aurora_portrait.png" alt="Aurora"/><div>
          <small>Aurora · Expedition briefing</small><h1>{campaign.title}</h1>
          <p>Two homes across the river need water. Meet me at the depot. Our well kit needs two wood, two stone, and one metal.</p>
          <details><summary>Campaign record</summary><p>{campaign.notice}</p><p>{state.rp} / {campaign.target} virtual RP · {funding.released} / {funding.goal} DEMO_CREDIT · Physical outcome unverified.</p></details>
          <button className="primary" onClick={start}>Enter the village</button><button onClick={()=>setScreen("camp")}>Back to Haven</button>
        </div></div></section>}
      {screen==="exhausted" && <div className="modal-backdrop"><section className="journal" role="alertdialog" aria-label="Expedition failed">
        <h2>Expedition failed</h2><p>Lofi ran out of energy before finishing the mission.</p><button onClick={restart}>Try again</button><button onClick={()=>setScreen("camp")}>Return to Haven</button>
      </section></div>}
      {screen === "game" && (
        <div className="game-layout">
          <BuildingPill info={expPillInfo}/>
          <section className="world">
            <div className="touch-controls" aria-label="Touch controls">
              <TouchJoystick onMove={dir => dispatch({ type: "MOVE", dir })} disabled={puzzle || !!menu} />
              <button className="interact" onClick={interact} disabled={puzzle || !!menu}>Act</button>
            </div>
          </section>
          <PlayerHUD location="Komodo" energy={state.energy} xp={state.xp}/>
          <div className="exp-objective"><strong>{objective}</strong><button onClick={()=>setMenu("pause")}>Pause</button><button onClick={()=>setMenu("bag")}>Bag</button></div>
          <p className="camp-hint">{hint && <strong>{hint} · E / Act<br/></strong>}{message || (!hint && objective)}</p>
          {menu && <div className="modal-backdrop"><section className="journal" role="dialog" aria-label={menu==="bag"?"Backpack":"Paused"}>
          {menu==="bag"?<><h2>Backpack</h2><p>{bagUsed(state)} / {map.rules.bag_capacity} spaces used</p><BagGrid items={(["wood","stone","metal","kit"] as const).map(id=>({name:id,icon:"/assets/icons/icon_"+id+".png",quantity:state.inventory[id],info:{wood:"Repair the bridge or craft a well kit.",stone:"Forms the foundation of the well.",metal:"Bring to the workshop.",kit:"Build at the well site."}[id]}))}/></>:<><h2>Paused</h2><Mixer/><button onClick={()=>{setMuted(!muted);sceneRef.current?.setMuted(!muted)}}>{muted?"Enable sound":"Mute sound"}</button><button onClick={()=>{restart();setMenu(null)}}>Restart expedition</button></>}
          <button onClick={()=>setMenu(null)}>Resume</button></section></div>}

        </div>
      )}
      {puzzle && screen === "game" && (
        <div className="modal-backdrop">
          <section
            className="puzzle"
            role="dialog"
            aria-modal="true"
            aria-label="Water pipe puzzle"
          >
            <button
              className="close"
              onClick={() => setPuzzle(false)}
              aria-label="Close puzzle"
            >
              ×
            </button>
            <p className="eyebrow">
              Waterworks · {map.puzzle.pipe_budget-state.pipes.length} pipes left · {map.puzzle.homes.filter(p=>reachable.has(p.join(","))).length}/2 homes supplied
            </p>
            <h2>Connect the well to both homes</h2>
            <p>
              Start at the well on the left. Lay a shared pipe across the grid, then branch up and down to the houses. Pipes join along edges. Tap a pipe again to reclaim it.
            </p>
            <div className="puzzle-grid">
              {Array.from({ length: map.puzzle.height }, (_, y) =>
                Array.from({ length: map.puzzle.width }, (_, x) => {
                  const p: [number, number] = [x, y],
                    k = `${x},${y}`,
                    source =
                      x === map.puzzle.source[0] && y === map.puzzle.source[1],
                    home = map.puzzle.homes.some(
                      (q) => q[0] === x && q[1] === y,
                    ),
                    blocked = map.puzzle.blocked.some(
                      (q) => q[0] === x && q[1] === y,
                    ),
                    placed = state.pipes.some((q) => q[0] === x && q[1] === y);
                  const active=(xx:number,yy:number)=>state.pipes.some(q=>q[0]===xx&&q[1]===yy)||[map.puzzle.source,...map.puzzle.homes].some(q=>q[0]===xx&&q[1]===yy);
                  const mask=(active(x,y-1)?1:0)+(active(x+1,y)?2:0)+(active(x,y+1)?4:0)+(active(x-1,y)?8:0);
                  const art=source?'puzzle_source':home?'puzzle_home':blocked?'puzzle_blocked':placed&&mask?`puzzle_pipe_${String(mask).padStart(2,'0')}_${reachable.has(k)?'wet':'dry'}`:'puzzle_empty';
                  return (
                    <button
                      key={k}
                      style={{backgroundImage:`url(${A}puzzle/${art}.png)`}}
                      className={`${source ? "source" : home ? "home" : blocked ? "blocked" : placed ? "pipe" : ""} ${reachable.has(k) ? "wet" : ""}`}
                      disabled={source || home || blocked || (!placed && state.pipes.length >= map.puzzle.pipe_budget)}
                      aria-label={`${source ? "Source" : home ? "Home" : blocked ? "Blocked" : placed ? "Remove pipe" : "Place pipe"} ${x},${y}`}
                      onClick={() =>
                        dispatch({
                          type: placed ? "REMOVE_PIPE" : "PLACE_PIPE",
                          cell: p,
                        })
                      }
                    >{source ? "Well" : home ? "Home" : placed&&mask===0?'•':null}</button>
                  );
                }),
              )}
            </div>
            <p>
              {pipesConnected(state.pipes)
                ? "Both homes connected. Activate water!"
                : "Both homes must connect to the blue source."}
            </p>
            <button
              className="primary"
              disabled={!pipesConnected(state.pipes)}
              onClick={() => dispatch({ type: "CONNECT_WATER" })}
            >
              Connect water
            </button>
          </section>
        </div>
      )}
      {confirmNewGame && screen === "title" && <dialog className="story-box new-journey" ref={newGameDialog}
        aria-label="Start a new game" aria-describedby="new-journey-warning" onCancel={() => setConfirmNewGame(false)}>
        <img src="/assets/sprites/aurora_portrait.png" alt="Aurora"/>
        <div className="story-copy">
          <strong className="speaker-name">Aurora</strong>
          <h2>Return to the beginning?</h2>
          <p id="new-journey-warning">When the opening ends, your saved place in Haven will be replaced.</p>
          <div className="journey-choices">
            <button autoFocus onClick={() => setConfirmNewGame(false)}>Keep my save</button>
            <button className="primary" onClick={beginNewGame}>Start new game</button>
          </div>
        </div>
      </dialog>}
      {(!havenReady || loadError || ((screen==="game" || screen==="campaign") && !expReady)) && <LoadScreen place={screen==="game" || screen==="campaign"?"Entering Operation Komodo":"Arriving at Himalayan Haven"} error={loadError}/>}
      <span className="shell-testnet">Sui Testnet · offline fixture · no official affiliation</span>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<AssetBoot><App /></AssetBoot>);
