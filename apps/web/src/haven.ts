import fixture from "../../../fixtures/himalayan-haven-intro.json" with { type: "json" };

export const haven = fixture;
export type HavenPosition = [number, number];
export const INTRO_SEEN_KEY = "ripple.introSeen.v1";
export const HAVEN_POSITION_KEY = "ripple.havenPosition.v1";
export function browserStorage(): Pick<Storage, "getItem" | "setItem"> {
  try { return window.localStorage; }
  catch { return { getItem: () => null, setItem: () => {} }; }
}
export function hasSeenIntro(): boolean {
  try { return browserStorage().getItem(INTRO_SEEN_KEY) === "true"; }
  catch { return false; }
}
const blocked = new Set(fixture.blockedTiles.map(([x, y]) => `${x},${y}`));
const spawn = fixture.spawn.tile as HavenPosition;

// East gate opens onto the highland circuit after the prologue.
export const highlands = {width:56,height:24};
export const posts = [
  {x:25,y:5,asset:"signpost",name:"Pine Gate",text:"The blue flags mark the old mail trail. Follow them east to the weather station, or south toward the lake."},
  {x:36,y:5,asset:"home_snow",name:"Weather Station",text:"The wind ribbons point west today. From here you can see the smoke rising over Haven."},
  {x:49,y:10,asset:"flags",name:"Cloud Lookout",text:"Below the prayer flags, the snow breaks into terraces. The southern trail curves back around the frozen lake."},
  {x:38,y:18,asset:"camp_tent",name:"Lakeside Shelter",text:"A dry blanket and a stack of firewood wait beside the tent. Pine Gate lies northwest along the shore."}
];
export function highlandIce(x:number,y:number) {
  return ((x-38)/6)**2+((y-13)/3.5)**2<1;
}
export const trailTrees = [[23,2],[24,3],[28,2],[29,3],[31,6],[32,7],[34,2],[41,3],[42,4],[45,6],[47,5],[51,6],[52,7],[48,16],[49,17],[44,20],[43,21],[30,17],[29,18],[25,14],[24,15],[22,19],[23,20]];
export function havenWalkable(x:number,y:number) {
  if(x===19 && y===8)return true;
  if(x<20)return x>=0 && y>=0 && y<12 && !blocked.has(x+","+y);
  return x<55 && y>0 && y<23 && !highlandIce(x,y) && !posts.some(p=>p.x===x && p.y===y) && !trailTrees.some(([tx,ty])=>tx===x && ty===y);
}
export const nearbyPost=([x,y]:HavenPosition)=>posts.find(p=>Math.abs(p.x-x)+Math.abs(p.y-y)===1);
export function walkHaven([x, y]: HavenPosition, dir: "N" | "S" | "E" | "W"): HavenPosition {
  const offset = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] }[dir];
  const next: HavenPosition = [x + offset[0], y + offset[1]];
  return havenWalkable(...next) ? next : [x,y];
}
export const atBoard = ([x, y]: HavenPosition) => x === fixture.interactions[0].approach[0] && y === fixture.interactions[0].approach[1];
export const atWorkshop = ([x, y]: HavenPosition) => x === fixture.interactions[1].approach[0] && y === fixture.interactions[1].approach[1];
export const havenSpawn = (): HavenPosition => [...spawn];

export function readHavenPosition(storage: Pick<Storage, "getItem">): HavenPosition {
  try {
    const p = JSON.parse(storage.getItem(HAVEN_POSITION_KEY) ?? "null");
    if (Array.isArray(p) && p.length === 2 && p.every(Number.isInteger) && havenWalkable(p[0],p[1])) return p as HavenPosition;
  } catch { /* Corrupt local save falls back to spawn. */ }
  return havenSpawn();
}
export function markIntroSeen(storage: Pick<Storage, "setItem">) { storage.setItem(INTRO_SEEN_KEY, "true"); }
