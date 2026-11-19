import {useEffect,useRef} from 'react';
import type {Cardinal as Direction} from './input';
const directions:Record<string,Direction> = {arrowup:"N",arrowdown:"S",arrowleft:"W",arrowright:"E",w:"N",s:"S",a:"W",d:"E"};
export function useHeldMovement(enabled:boolean,move:(dir:Direction)=>void){
  const step=useRef(move);
  step.current=move;
  useEffect(()=>{
    if(!enabled)return;
    const held=new Map<string,Direction>();
    let timer:number|undefined;
    const cancel=()=>{held.clear();window.clearInterval(timer);timer=undefined};
    const down=(event:KeyboardEvent)=>{
      const key=event.key.toLowerCase(),dir=directions[key];
      if(!dir || event.ctrlKey || event.metaKey || event.altKey)return;
      event.preventDefault();
      if(event.repeat || held.has(key))return;
      held.set(key,dir);
      step.current(dir);
      window.clearInterval(timer);
      timer=window.setInterval(()=>{
        const latest=Array.from(held.values()).pop();
        if(latest)step.current(latest);
      },150);
    };
    const up=(event:KeyboardEvent)=>{held.delete(event.key.toLowerCase());if(!held.size)cancel()};
    window.addEventListener("keydown",down);
    window.addEventListener("keyup",up);
    window.addEventListener("blur",cancel);
    document.addEventListener("visibilitychange",cancel);
    document.addEventListener("fullscreenchange",cancel);
    return ()=>{
      cancel();
      window.removeEventListener("keydown",down);
      window.removeEventListener("keyup",up);
      window.removeEventListener("blur",cancel);
      document.removeEventListener("visibilitychange",cancel);
      document.removeEventListener("fullscreenchange",cancel);
    };
  },[enabled]);
}
