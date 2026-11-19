const cacheName="ripple-art-"+new URL(self.location.href).searchParams.get("pack");
self.addEventListener("install",event=>event.waitUntil(self.skipWaiting()));
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));
self.addEventListener("fetch",event=>{
  const req=event.request,url=new URL(req.url);
  if(req.cache==="reload" || req.method!=="GET" || url.origin!==location.origin || !url.pathname.startsWith("/assets/") || /\.(js|css)$/.test(url.pathname))return;
  event.respondWith((async()=>{
    const hit=await caches.match(req.url,{cacheName});
    if(!hit)return fetch(req);
    const range=req.headers.get("Range");
    if(!range)return hit;
    const parts=/^bytes=(\d+)-(\d*)$/.exec(range);
    if(!parts)return fetch(req);
    const blob=await hit.blob(),start=Number(parts[1]),end=parts[2]?Math.min(Number(parts[2]),blob.size-1):blob.size-1;
    if(start>end)return new Response(null,{status:416,headers:{"Content-Range":"bytes */"+blob.size}});
    return new Response(blob.slice(start,end+1),{status:206,headers:{"Content-Type":blob.type,"Content-Length":String(end-start+1),"Accept-Ranges":"bytes","Content-Range":"bytes "+start+"-"+end+"/"+blob.size}});
  })());
});
