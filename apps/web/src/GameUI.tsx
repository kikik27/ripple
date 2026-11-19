import {useState} from "react";

export function PlayerHUD({energy,xp,location,day}:{energy?:number;xp?:number;location:string;day?:number}) {
  return <div className="rpg-profile" aria-label="Player status">
    <img className="rpg-portrait" src="/assets/sprites/yeti_portrait.png" alt="Lofi"/>
    <div><strong>Lofi</strong><small>{day ? "Day "+day : location}</small>
      {energy!==undefined && <div className="energy-track" role="meter" aria-label="Energy" aria-valuenow={energy} aria-valuemin={0} aria-valuemax={100}><i style={{width:energy+"%"}}/><span>{energy} / 100</span></div>}
      {xp!==undefined && <small>{xp} XP</small>}
    </div>
  </div>;
}

export function BagGrid({items}:{items: {name:string;icon:string;quantity:number;info:string}[]}) {
  const [index,select]=useState(0);
  const item=items[index];
  return <><div className="rpg-slots">{items.map((it,i)=><button key={it.name} aria-label={it.name+" × "+it.quantity} aria-pressed={i===index} onClick={()=>select(i)}>
    <img src={it.icon} alt=""/><b>{it.quantity}</b></button>)}</div>
    {item && <div className="item-caption"><strong>{item.name}</strong><p>{item.info}</p></div>}</>;
}
