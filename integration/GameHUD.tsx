import React from 'react';
import './game-hud.css';
const A='/assets/';
type MeterKind='energy'|'xp'|'rp'|'funding'|'health';
export function Meter({label,kind,value,max}:{label:string;kind:MeterKind;value:number;max:number}) {
  const percent=Number.isFinite(value)&&Number.isFinite(max)&&max>0?Math.max(0,Math.min(100,value/max*100)):0;
  const v=Number.isFinite(value)?value:0; const m=Number.isFinite(max)?max:0;
  return <div className="ripple-meter"><div className="ripple-meter-label"><span>{label}</span><span>{v} / {m}</span></div>
    <div className="ripple-meter-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}>
      <div className="ripple-meter-fill" style={{width:`${percent}%`,backgroundImage:`url(${A}ui/bar_fill_${kind}.png)`}}/>
    </div></div>;
}
export type HUDProps={name:string;level:number;energy:number;maxEnergy:number;xp:number;xpForLevel:number;inventory:{id:string;count:number}[];usedCapacity:number;maxCapacity:number;rp:number;rpGoal:number;funding:number;fundingGoal:number;isDemo:boolean};
export function GameHUD(p:HUDProps) {
  return <div className="ripple-hud"><section className="ripple-profile"><img className="ripple-portrait" src={A+'sprites/yeti_portrait.png'} alt="Yeti explorer"/><div><strong>{p.name}</strong><small>Level {p.level}</small><Meter label="Energy" kind="energy" value={p.energy} max={p.maxEnergy}/><Meter label="XP" kind="xp" value={p.xp} max={p.xpForLevel}/></div></section>
  <section className="ripple-campaign"><strong>Community campaign</strong><Meter label="Virtual restoration (RP)" kind="rp" value={p.rp} max={p.rpGoal}/><Meter label={p.isDemo?'Simulated funding (DEMO_CREDIT)':'Confirmed funding'} kind="funding" value={p.funding} max={p.fundingGoal}/></section>
  <div aria-label="Backpack capacity">Backpack: {p.usedCapacity} / {p.maxCapacity}</div><div className="ripple-inventory" aria-label="Backpack">{Array.from({length:8},(_,i)=>{const item=p.inventory[i];return <div className="ripple-slot" key={i}>{item&&<><img src={A+`icons/icon_${item.id}.png`} alt={item.id}/><span>{item.count}</span></>}</div>})}</div></div>;
}
