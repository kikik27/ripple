import {useState} from "react";

const beds = ["Seed trays","Young trees","Reed bed"];

export function NurseryGate({onRelease}:{onRelease:(levels:string)=>void}){
  const [levels,setLevels]=useState([0,0,0]);
  const remaining=6-levels.reduce((sum,value)=>sum+value,0);
  const turn=(index:number,direction:number)=>setLevels(levels.map((value,i)=>i===index?value+direction:value));
  return <fieldset className="nursery-gate">
    <legend>Balance the irrigation gate</legend>
    <p>Six measures in the tank. Give the trees twice the seedlings’ share, and the reeds three times their share.</p>
    {beds.map((bed,i)=><div className="valve-row" key={bed}><span>{bed}<meter aria-label={bed+" flow"} min={0} max={6} value={levels[i]}/></span>
      <button aria-label={"Decrease "+bed} disabled={!levels[i]} onClick={()=>turn(i,-1)}>−</button>
      <output aria-label={bed+" level"}>{levels[i]}</output>
      <button aria-label={"Increase "+bed} disabled={!remaining || levels[i]===6} onClick={()=>turn(i,1)}>+</button></div>)}
    <p aria-live="polite">Tank · {remaining} / 6</p>
    <button disabled={remaining!==0} onClick={()=>onRelease(levels.join(","))}>Release water</button>
  </fieldset>;
}
