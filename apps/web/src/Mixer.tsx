import {useState} from "react";
import type Phaser from "phaser";

type Channel = "music" | "ambience" | "sfx";
const levels = {music:0, ambience:0, sfx:0.25};
try {
  const stored=JSON.parse(localStorage.getItem("ripple.audio.v1") || "{}");
  for(const key of Object.keys(levels) as Channel[]) if(Number.isFinite(stored[key])) levels[key]=Math.max(0,Math.min(1,stored[key]));
} catch { /* Guest settings are optional. */ }
export const volume = (channel:Channel) => levels[channel];
export function bindMix(scene:Phaser.Scene,music:string,ambience:string) {
  const update=()=>{
    for(const [key,channel] of [[music,"music"],[ambience,"ambience"]] as const){
      const sound=scene.sound.get(key);
      if(sound && "setVolume" in sound) (sound as Phaser.Sound.WebAudioSound).setVolume(levels[channel]);
    }
  };
  window.addEventListener("ripple-mix",update);
  scene.events.once("shutdown",()=>window.removeEventListener("ripple-mix",update));
}
export function Mixer() {
  const [values,setValues]=useState({...levels});
  return <fieldset className="mix"><legend>Sound levels</legend>{(Object.keys(levels) as Channel[]).map(key=>
    <label key={key}>{key}<input aria-label={key} type="range" min="0" max="1" step="0.01" value={values[key]} onChange={e=>{
      levels[key]=Number(e.target.value);setValues({...levels});
      try{localStorage.setItem("ripple.audio.v1",JSON.stringify(levels))}catch{}
      window.dispatchEvent(new Event("ripple-mix"));
    }}/></label>)}</fieldset>;
}
