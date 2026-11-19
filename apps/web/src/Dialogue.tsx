import { useEffect, useState, type ReactNode } from "react";

export function Dialogue({name,portrait,line,last,onNext,onClose,muted,onSound,extra}: {
  muted:boolean; onSound:()=>void; extra?:ReactNode; name:string; portrait:string; line:string; last:boolean; onNext:()=>void; onClose:()=>void;
}) {
  const [voice,setVoice] = useState(()=>{try{return localStorage.getItem("ripple.voice")==="on"}catch{return false}});
  const available = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  const [voiceError,setVoiceError] = useState(false);
  useEffect(()=>{
    if (!available || !voice) return;
    const speech=new SpeechSynthesisUtterance(line);
    speech.lang="en-US";
    speech.rate=.94;
    speech.pitch=name==="Aurora"?1.13:name==="Elder Toma"?.9:1;
    speech.onerror=event=>{if(event.error!=="interrupted" && event.error!=="canceled")setVoiceError(true)};
    window.speechSynthesis.speak(speech);
    return ()=>{speech.onerror=null;window.speechSynthesis.cancel()};
  },[available,voice,muted,name,line]);
  const toggleVoice=()=>{
    const enabled=!voice;
    setVoiceError(false);setVoice(enabled);
    
    try{localStorage.setItem("ripple.voice",enabled?"on":"off")}catch{}
  };
  const [count,setCount] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setCount(line.length); return; }
    setCount(0);
    let visible = 0;
    const timer = window.setInterval(() => {
      visible += 2; setCount(previous => Math.max(previous,visible));
      if (visible >= line.length) window.clearInterval(timer);
    },32);
    return () => window.clearInterval(timer);
  },[line]);
  const advance = () => count < line.length ? setCount(line.length) : onNext();
  useEffect(() => {
    const key = (event:KeyboardEvent) => {
      if (!["e","Enter"," ","Escape"].includes(event.key)) return;
      if ((event.key==="Enter" || event.key===" ") && (event.target as HTMLElement)?.closest("button")) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (!event.repeat) event.key === "Escape" ? onClose() : advance();
    };
    window.addEventListener("keydown",key,true);
    return () => window.removeEventListener("keydown",key,true);
  });
  return <div className="story-layer"><section className="story-box" role="dialog" aria-modal="true" aria-label={name}>
    <img src={portrait} alt="" /><div className="story-copy"><strong className="speaker-name">{name}</strong><p aria-label={line}>{line.slice(0,count)}</p>
    {count>=line.length && extra}<div className="story-buttons">{available && <button className="dialogue-voice" aria-pressed={voice} onClick={toggleVoice}>{voice ? "Voice on" : "Voice off"}</button>}<button autoFocus onClick={advance}>{count < line.length ? "Reveal" : last ? "Close" : "Continue"}</button></div>{voiceError && <small role="status">Voice unavailable on this device.</small>}</div>
  </section></div>;
}
