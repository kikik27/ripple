import {spawn} from "node:child_process";
import {mkdtempSync,writeFileSync,readFileSync,mkdirSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import assert from "node:assert/strict";
const label=process.argv[2] || "after";
const browser=spawn(process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",["--headless","--disable-gpu","--remote-debugging-pipe","--user-data-dir="+mkdtempSync(join(tmpdir(),"ripple-qa-"))],{stdio:["ignore","ignore","ignore","pipe","pipe"]});
let id=0, buffer="",session;
const pending=new Map();
browser.stdio[4].on("data",chunk=>{
 buffer+=chunk;
 while(buffer.includes("\0")){
  const end=buffer.indexOf("\0"), event=JSON.parse(buffer.slice(0,end));buffer=buffer.slice(end+1);
  if(pending.has(event.id)){pending.get(event.id)(event);pending.delete(event.id);}
 }
});
function call(method,params={},sessionId=session){
 return new Promise((ok,fail)=>{
 const seq=++id;const timeout=setTimeout(()=>fail(Error(method+" timed out")),20000);
 pending.set(seq,event=>{clearTimeout(timeout);event.error?fail(Error(event.error.message)):ok(event.result)});
 browser.stdio[3].write(JSON.stringify({id:seq,method,params,sessionId})+"\0");
 });
}
const delay=ms=>new Promise(ok=>setTimeout(ok,ms));
const evaluate=async expression=>(await call("Runtime.evaluate",{expression,returnByValue:true})).result.value;
async function until(expr){for(let n=0;n<100;n++){if(await evaluate("Boolean("+expr+")"))return;await delay(100)}throw Error(expr)}
const evidence="docs/qa/rpg/current";mkdirSync(evidence,{recursive:true});
async function shot(name){const {data}=await call("Page.captureScreenshot");writeFileSync(evidence+"/"+label+"-"+name+".png",Buffer.from(data,"base64"))}
try{
 const {targetId}=await call("Target.createTarget",{url:"about:blank"});
 session=(await call("Target.attachToTarget",{targetId,flatten:true})).sessionId;
 for(const [width,height] of [[1280,720],[1920,1080],[390,844],[844,390]]){
 await call("Emulation.setDeviceMetricsOverride",{width,height,mobile:width<900,deviceScaleFactor:1});
 await call("Emulation.setTouchEmulationEnabled",{enabled:width<900});
 await call("Page.navigate",{url:process.env.RIPPLE_URL||"http://127.0.0.1:4186"});
 await until("document.querySelector('.hero .primary') && document.querySelector('canvas')");
 await evaluate("localStorage.clear(); document.querySelector('main').requestFullscreen=()=>Promise.reject()");
 await until("!document.querySelector('.haven-loading')"); await delay(200);await shot(width+"-title");
 if(label==="highlands"){
   await evaluate("localStorage.setItem('ripple.introSeen.v1','true'); localStorage.setItem('ripple.havenPosition.v1','[25,6]'); document.querySelector('.hero .primary').click()");
   await until("document.querySelector('.new-journey:modal')");
   assert.equal(await evaluate("document.activeElement.textContent"),"Keep my save");
   await shot(width+"-new-game");
   await evaluate("document.activeElement.click()");
   assert.equal(await evaluate("localStorage.getItem('ripple.havenPosition.v1')"),"[25,6]");
   assert.equal(await evaluate("!!document.querySelector('.new-journey')"),false);
 }
 await evaluate("document.querySelector('.hero .primary').click()");
 if(label==="highlands"){
   await until("document.querySelector('.new-journey:modal')");
   await evaluate("document.querySelector('.new-journey .primary').click()");
 }
 await until("document.querySelector('.screen-camp')");
 await evaluate("document.querySelector('.skip-intro').click()");
 await until("document.querySelector('.haven-hud,.screen-camp .rpg-profile')");
 assert(await evaluate("document.documentElement.scrollWidth===innerWidth && document.documentElement.scrollHeight===innerHeight"));
 await shot(width+"-haven");
 if(label==="after"){
   await call("Input.dispatchKeyEvent",{type:"keyDown",key:"e"});await call("Input.dispatchKeyEvent",{type:"keyUp",key:"e"});
   await until("document.querySelector('.story-box')");await shot(width+"-dialogue");
   await call("Input.dispatchKeyEvent",{type:"keyDown",key:"Escape"});await call("Input.dispatchKeyEvent",{type:"keyUp",key:"Escape"});
 }
 if(label==="highlands"){
   const {walkHaven,posts,nearbyPost}=await import("../apps/web/src/haven.ts");
   let pos=[9,7];
   const press=async key=>{await call("Input.dispatchKeyEvent",{type:"keyDown",key});await call("Input.dispatchKeyEvent",{type:"keyUp",key})};
   const position=()=>evaluate("localStorage.getItem('ripple.havenPosition.v1')");
   await call("Input.dispatchKeyEvent",{type:"keyDown",key:"w"});
   await until("localStorage.getItem('ripple.havenPosition.v1')==='[9,5]'");
   await call("Input.dispatchKeyEvent",{type:"keyUp",key:"w"});
   await call("Input.dispatchKeyEvent",{type:"keyDown",key:"ArrowDown"});
   await until("localStorage.getItem('ripple.havenPosition.v1')==='[9,7]'");
   await call("Input.dispatchKeyEvent",{type:"keyUp",key:"ArrowDown"});
   await delay(350);assert.equal(await position(),"[9,7]");
   await call("Input.dispatchKeyEvent",{type:"keyDown",key:"w"});await press("e");
   await until("document.querySelector('.story-box')");await delay(350);
   assert.equal(await position(),"[9,6]");await press("Escape");await delay(350);
   assert.equal(await position(),"[9,6]");
   await call("Input.dispatchKeyEvent",{type:"keyUp",key:"w"});await press("s");
   for(const post of posts){
     const queue=[[pos,[]]],seen=new Set();let route;
     for(let i=0;i<queue.length;i++){
       const [p,steps]=queue[i];if(seen.has(p.join()))continue;seen.add(p.join());
       if(nearbyPost(p)?.name===post.name){route=steps;pos=p;break}
       for(const [dir,key] of [["N","w"],["S","s"],["E","d"],["W","a"]]){
         const n=walkHaven(p,dir);if(!seen.has(n.join()))queue.push([n,[...steps,key]]);
       }
     }
     assert(route);for(const key of route){await press(key);await delay(45)}
     assert.equal(await evaluate("localStorage.getItem('ripple.havenPosition.v1')"),JSON.stringify(pos));
     await press("e");await until("document.querySelector('.story-box')");await delay(450);
     assert.equal(await evaluate("document.querySelector('.speaker-name').textContent"),post.name);
     assert.equal(JSON.parse(await evaluate("localStorage.getItem('ripple.havenTrail.v1')")).length,posts.indexOf(post)+1);
     if(post.name==="Cloud Lookout")await shot(width+"-lookout");
     await press("Escape");
   }
   await press("i");await until("document.querySelector('.journal')?.textContent.includes('Circuit complete')");
   await shot(width+"-trail-journal");
   console.log("PASS held movement, dialogue cancellation and four trail stamps",width,height);continue;
 }
 const touch = width<900 && label==="after";
 if(touch){
   await until("document.querySelector('.haven-actions .touch-joystick:not([hidden])')?.getBoundingClientRect().width > 80"); await delay(200); const point=await evaluate("(()=>{let r=document.querySelector('.haven-actions .touch-joystick').getBoundingClientRect();return {x:r.x+r.width*.85,y:r.y+r.height/2}})()");
   for(let i=0;i<2;i++){
     await call("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[point]});
     await call("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});await delay(190);
   }
 }
 for(const key of (touch?["e"]:["d","d","e"])){await call("Input.dispatchKeyEvent",{type:"keyDown",key});await call("Input.dispatchKeyEvent",{type:"keyUp",key});await delay(165)}
 await until("document.querySelector('.haven-board')");
 if(label==="mission"){
   const bridge=width===1280 || width===390;
   const route=JSON.parse(readFileSync("fixtures/"+(bridge?"replay-example":"replay-detour")+".json","utf8")).actions;
   await evaluate("document.querySelector('.haven-board .primary').click()");
   await until("document.querySelector('.campaign-card .primary')");
   await until("document.querySelector('#game-canvas canvas')");
   await delay(650);await shot(width+"-briefing");
   await evaluate("document.querySelector('.campaign-card .primary').click()");
   await until("document.querySelector('#game-canvas canvas')");
   const press=async key=>{
     if(width<900){
       const selector=key==="e"?".screen-game .interact":".screen-game .touch-joystick";
       const [dx,dy]=({w:[0,-1],s:[0,1],a:[-1,0],d:[1,0],e:[0,0]})[key];
       const point=await evaluate("(()=>{const r=document.querySelector("+JSON.stringify(selector)+").getBoundingClientRect();return {x:r.x+r.width*"+(.5+.34*dx)+",y:r.y+r.height*"+(.5+.34*dy)+"}})()");
       await call("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[point]});
       await call("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});await delay(160);return;
     }
     await call("Input.dispatchKeyEvent",{type:"keyDown",key});await call("Input.dispatchKeyEvent",{type:"keyUp",key});await delay(155)};
   if(width===1280){
     for(let n=0;n<100;n++) await press(n%2?"s":"w");
     await until("document.querySelector('[role=alertdialog]')?.textContent.includes('ran out of energy')");
     await shot(width+"-exhausted");
     await evaluate("document.querySelector('[role=alertdialog] button').click()");
     await until("document.querySelector('.screen-game')");
     await delay(650);
   }
   for(const action of route){
     if(action.type==="MOVE") await press({N:"w",S:"s",E:"d",W:"a"}[action.dir]);
     else if(action.type==="PLACE_PIPE"){
       if(!await evaluate("!!document.querySelector('.puzzle-grid')")) await press("e");
       const selector='[aria-label="Place pipe '+action.cell.join(",")+'"]';
       assert(await evaluate("!!document.querySelector("+JSON.stringify(selector)+")"));
       await evaluate("document.querySelector("+JSON.stringify(selector)+").click()");
     } else if(action.type==="CONNECT_WATER"){
       await shot(width+"-waterworks");
       assert(await evaluate("!document.querySelector('.puzzle .primary').disabled"));
       await evaluate("document.querySelector('.puzzle .primary').click()");
     } else {
       await press("e");
       if(width===1280 && ["REPAIR_BRIDGE","BUILD_WELL"].includes(action.type)) await shot(width+"-"+action.type.toLowerCase());
     }
   }
   await until("document.querySelector('.result pre')");
   assert.deepEqual(JSON.parse(await evaluate("document.querySelector('.result pre').textContent")),route);
   const summary=await evaluate("document.querySelector('.result-stats').innerText");
   assert(summary.includes((bridge?35:11)+" energy left"));await shot(width+"-result");console.log("PASS",width,height,route.length,"accepted actions");continue;
 }
 const issuer=width<900?"farmer":"elder";
 const socialKey="social.komodoGrove.v1:guest";
 if(label==="quest"){
   const save={version:1,position:issuer==="elder"?[17,15]:[32,16],talked:[issuer,"engineer","child"],harvestCount:1,quests:{[issuer==="elder"?"greet_three":"first_harvest"]:"active"}};
   await evaluate("localStorage.setItem("+JSON.stringify(socialKey)+","+JSON.stringify(JSON.stringify(save))+")");
 }
 await evaluate("document.querySelector('.haven-board .primary:nth-of-type(2)').click()");
 await until("document.querySelector('#grove-canvas canvas') && !document.querySelector('.grove-loading')");
 if(label==="quest"){
   await call("Input.dispatchKeyEvent",{type:"keyDown",key:"e"});await call("Input.dispatchKeyEvent",{type:"keyUp",key:"e"});
   await delay(100);
   await evaluate("Array.from(document.querySelectorAll('[aria-label=Nearby] button')).find(b=>b.textContent==="+JSON.stringify(issuer==="elder"?"Elder Toma":"Ari")+")?.click()");
   await until("document.querySelector('.story-box')");
   await until("document.querySelector('.quest-slip button')");
   await shot(width+"-reward");
   await evaluate("document.querySelector('.quest-slip button').click()");
   const saved=JSON.parse(await evaluate("localStorage.getItem("+JSON.stringify(socialKey)+")"));
   assert.equal(saved.quests[issuer==="elder"?"greet_three":"first_harvest"],"claimed");
   assert.equal(saved.inventory[issuer==="elder"?"seed":"hay"],5);
   console.log("PASS dialogue reward",issuer,width,height);continue;
 }
 await shot(width+"-grove");
 if(label==="atlas"){
   await evaluate("document.querySelector('.grove-bag').click()");
   await evaluate("Array.from(document.querySelectorAll('.book-tabs button')).find(b=>b.textContent==='Map').click()");
   await until("document.querySelector('.village-atlas canvas')?.width>0");
   await shot(width+"-village-map");
   await evaluate("document.querySelector('.village-atlas button').click()");
   await until("document.querySelector('.grove-target h2')?.textContent==='Market Lane'");
   assert(await evaluate("!!document.querySelector('.grove-actions button')"));
   const stops=width===1280?["fishing_dock","plot_0_0","pump","camp","world_board","water_lab","nursery_gate"]:["water_lab","nursery_gate"];
     for(const destination of stops){
       await evaluate("document.querySelector('.journal>button').click()");
       await evaluate("document.querySelector('.grove-bag').click()");
       await until("document.querySelector('.village-atlas select')");
       await evaluate("(()=>{const select=document.querySelector('.village-atlas select');select.value="+JSON.stringify(destination)+";select.dispatchEvent(new Event('change',{bubbles:true}))})()");
       const destinationName=await evaluate("document.querySelector('.village-atlas select').selectedOptions[0].textContent");
       await evaluate("document.querySelector('.village-atlas button').click()");
       await until("document.querySelector('.grove-target h2')?.textContent==="+JSON.stringify(destinationName));
       if(destination==="water_lab")await evaluate("document.querySelector('.grove-actions button').click()");
     }
   await until("document.querySelector('.nursery-gate')");
   for(const bed of ["Seed trays","Young trees","Young trees","Reed bed","Reed bed","Reed bed"]){
     const selector='[aria-label="Increase '+bed+'"]';
     await evaluate("document.querySelector("+JSON.stringify(selector)+").click()");
   }
   await shot(width+"-nursery-valves");
   await evaluate("document.querySelector('.nursery-gate>button').click()");
   await until("document.querySelector('.grove-target')?.textContent.includes('All three beds have water')");
   assert.equal(JSON.parse(await evaluate("localStorage.getItem("+JSON.stringify(socialKey)+")")).nursery,"flowing");
   await evaluate("document.querySelector('.journal>button').click()");
   await shot(width+"-eastbank");
   console.log("PASS water lab, nursery puzzle and persisted restoration",width,height);
   console.log("PASS mapped route to market",width,height);continue;
 }
 if(label==="after"){
   await evaluate("document.querySelector('.grove-bag').click()");await until("document.querySelector('.journal')");
   await shot(width+"-bag");await call("Input.dispatchKeyEvent",{type:"keyDown",key:"Escape"});await call("Input.dispatchKeyEvent",{type:"keyUp",key:"Escape"});
 }console.log("PASS",width,height);
 }
}finally{browser.kill()}




