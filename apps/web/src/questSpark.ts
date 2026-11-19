import type Phaser from "phaser";

export function questSpark(source:DOMRect | {x:number;y:number},target:Element|null){
  if(!target || matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const box=target.getBoundingClientRect();
  const shell=document.querySelector(".game-shell") || document.body;
  if(!shell || !box.width)return;
  const x=source instanceof DOMRect?source.x+source.width/2:source.x;
  const y=source instanceof DOMRect?source.y+source.height/2:source.y;
  const dx=box.x+box.width/2-x,dy=box.y+box.height/2-y;
  const stars = ["/assets/fx/fx_sparkle_00.png", "/assets/fx/fx_sparkle_01.png", "/assets/fx/fx_sparkle_02.png", "/assets/fx/fx_campaign_star.png"];
  for (let i = 0; i < 4; i++) {
    const star=document.createElement("img");
    star.src=stars[i % stars.length];star.alt="";star.className="quest-spark";
    const spreadX = (i - 1.5) * 12;
    const spreadY = (i % 2 === 0 ? -1 : 1) * 8;
    star.style.left=(x + spreadX)+"px";star.style.top=(y + spreadY)+"px";
    shell.append(star);
    const delay = i * 85;
    const midX = dx * 0.45 + (i % 2 === 0 ? -22 : 22);
    const midY = dy * 0.45 - 32 - i * 8;
    star.animate([
      {transform:"translate(-50%,-50%) scale(.3) rotate(0deg)",opacity:0},
      {transform:`translate(${midX}px,${midY}px) scale(1.4) rotate(180deg)`,opacity:1,offset:.35},
      {transform:`translate(${dx}px,${dy}px) scale(.25) rotate(360deg)`,opacity:0}
    ],{duration:820,delay,easing:"cubic-bezier(.22,1,.36,1)"}).finished.finally(()=>{
      star.remove();
      if(i === 3 && target) {
        target.animate([
          {transform:"scale(1)"},
          {transform:"scale(1.1) rotate(-1deg)",filter:"brightness(1.35)",offset:0.4},
          {transform:"scale(1) rotate(0deg)"}
        ],{duration:360,easing:"ease-out"});
      }
    });
  }
}
export function actorScreenPoint(scene:Phaser.Scene,x:number,y:number){
  const canvas=scene.game.canvas.getBoundingClientRect(),cam=scene.cameras.main;
  return {x:canvas.left+(x-cam.worldView.x)*canvas.width/cam.worldView.width,y:canvas.top+(y-cam.worldView.y)*canvas.height/cam.worldView.height};
}
