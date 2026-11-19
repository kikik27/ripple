import {useEffect,useState,type ReactNode} from "react";
import pack from "virtual:ripple-assets";

export function LoadScreen({place,percent,error}:{place:string;percent?:number;error?:boolean}){
  return (
    <section className="load-screen" role="status" aria-live="polite">
      <div className="load-backdrop-overlay" aria-hidden="true" />
      <div className="load-card rpg-plate">
        <header className="load-header">
          <img className="load-logo" src="/assets/branding/ripple_logo_768.png" alt="Ripple" />
          <span className="load-tagline">Small Actions. Big Impact.</span>
        </header>

        <div className="load-destination">
          <img className="load-emblem" src="/assets/branding/ripple_emblem_1024.png" alt="" aria-hidden="true"/>
          <h2>{error ? "Trail supplies unavailable" : place}</h2>
        </div>

        {error ? (
          <div className="load-error-box">
            <p>Check your connection and try again.</p>
            <button className="primary" onClick={()=>location.reload()}>Retry</button>
          </div>
        ) : (
          <div className="rpg-loading-bar-wrap" role="progressbar" aria-valuenow={percent ?? 100} aria-valuemin={0} aria-valuemax={100} aria-label="Loading game assets">
            <div className="rpg-bar-track">
              <div className="rpg-bar-fill" style={{ width: `${percent !== undefined ? Math.max(8, percent) : 100}%` }} />
            </div>
            <div className="rpg-bar-info">
              <span className="rpg-bar-status">{percent !== undefined ? "Downloading local supplies…" : "Entering area…"}</span>
              <span className="rpg-bar-percent">{percent !== undefined ? `${percent}%` : "Ready"}</span>
            </div>
            {/* Hidden native progress for full accessibility and automated test validation */}
            <progress className="sr-only" aria-label="Loading game assets" max={100} value={percent ?? 100}/>
          </div>
        )}

        <footer className="load-footer">
          <small>Sui Testnet · Offline Demo · Play-to-Impact</small>
        </footer>
      </div>
    </section>
  );
}

async function prepare(progress:(percent:number)=>void){
  let cache:Cache|undefined;
  const present=new Set<string>();
  try{
    if("serviceWorker" in navigator && "caches" in window){
      await navigator.serviceWorker.register("/art-worker.js?pack="+pack.version);
      await navigator.serviceWorker.ready;
      cache=await caches.open("ripple-art-"+pack.version);
      for(const request of await cache.keys())present.add(new URL(request.url).pathname);
    }
  }catch{ cache=undefined; /* Private browsing can use the normal HTTP cache. */ }
  let done=0,index=0;
  const total=pack.assets.reduce((sum,a)=>sum+a.size,0);
  async function load(){
    while(index<pack.assets.length){
      const {url,size}=pack.assets[index++];
      if(!present.has(url)){
        const res=await fetch(url,{cache:cache?"reload":"default"});
        if(!res.ok || res.headers.get("content-type")?.includes("text/html"))throw Error(url);
        const data=await res.blob();
        if(data.size!==size)throw Error(url);
        if(cache){try{await cache.put(url,new Response(data,{headers:{"Content-Type":data.type}}))}catch{cache=undefined}}
      }
      done+=size;progress(Math.floor(done*100/total));
    }
  }
  await Promise.all(Array.from({length:6},load));
}

export function AssetBoot({children}:{children:ReactNode}){
  const [ready,setReady]=useState(false),[percent,setPercent]=useState(0),[error,setError]=useState(false);
  useEffect(()=>{prepare(setPercent).then(()=>setReady(true)).catch(()=>setError(true))},[]);
  return ready?children:<LoadScreen place="Packing for the journey" percent={percent} error={error}/>;
}
