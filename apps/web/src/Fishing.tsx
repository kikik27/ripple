import {useEffect,useState} from "react";

export function Fishing({catchFish}:{catchFish:()=>void}){
  const [phase,setPhase]=useState<"shore"|"cast"|"bite"|"miss">("shore");
  useEffect(()=>{
    if(phase!=="cast" && phase!=="bite")return;
    const timer=window.setTimeout(()=>setPhase(phase==="cast"?"bite":"miss"),phase==="cast"?1400:2600);
    return ()=>window.clearTimeout(timer);
  },[phase]);

  return (
    <div className="fishing-pool" data-phase={phase}>
      <div className="fishing-water-surface">
        <span className="float" aria-hidden="true"/>
        <span className="fishing-ripple r1" aria-hidden="true"/>
        <span className="fishing-ripple r2" aria-hidden="true"/>
      </div>
      <p aria-live="polite">
        {phase==="cast"?"Watch the float… waiting for a bite…":phase==="bite"?"A nibble! Reel now!":phase==="miss"?"The fish slipped away. Cast again.":"Cast your line beside the river reeds."}
      </p>
      <button
        className="primary"
        onClick={()=>{
          if(phase==="bite")catchFish();
          else if(phase==="cast")setPhase("miss");
          else setPhase("cast");
        }}
      >
        {phase==="cast" || phase==="bite"?"Reel in":"Cast line"}
      </button>
    </div>
  );
}
