import test from "node:test";
import assert from "node:assert/strict";
import { atBoard, haven, havenSpawn, HAVEN_POSITION_KEY, INTRO_SEEN_KEY, markIntroSeen, readHavenPosition, walkHaven } from "./haven.ts";

test("hub spawn, collision, and world board route use the opening fixture", () => {
  assert.deepEqual(havenSpawn(), [9, 7]);
  assert.deepEqual(haven.spawn.position, [304, 240]);
  assert.deepEqual(haven.aurora.position, [336, 228]);
  assert.deepEqual(haven.spawn.origin, [0.5, 40 / 48]);
  assert.deepEqual(walkHaven([9, 5], "N"), [9, 5]); // workshop is blocked
  const east = walkHaven(havenSpawn(), "E");
  assert.deepEqual(east, [10, 7]);
  assert.equal(atBoard(walkHaven(east, "E")), true);
});

test("introSeen uses its own key and saved hub position is restored", () => {
  const data = new Map([["ripple.playerProgress.v1", "important-save"], [HAVEN_POSITION_KEY, "[11,7]"]]);
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  markIntroSeen(storage);
  assert.equal(data.get(INTRO_SEEN_KEY), "true");
  assert.equal(data.get("ripple.playerProgress.v1"), "important-save");
  assert.deepEqual(readHavenPosition(storage), [11, 7]);
  data.set(HAVEN_POSITION_KEY, "[12,7]"); // blocked world-board tile
  assert.deepEqual(readHavenPosition(storage), havenSpawn());
});
test("the four highland posts are reachable from camp with a restorable position", async()=>{
  const {posts,nearbyPost,highlandIce}=await import("./haven.ts");
  const queue=[havenSpawn()],seen=new Set<string>(),visited=new Set<string>();
  for(let i=0;i<queue.length;i++){
    const p=queue[i],key=p.join(",");
    if(seen.has(key))continue;
    seen.add(key);
    const post=nearbyPost(p);
    if(post){visited.add(post.name);assert.deepEqual(readHavenPosition({getItem:()=>JSON.stringify(p)}),p)}
    for(const d of ["N","E","S","W"] as const){
      const next=walkHaven(p,d);
      assert(!highlandIce(...next));
      if(!seen.has(next.join(",")))queue.push(next);
    }
  }
  assert.equal(visited.size,posts.length);
  assert(seen.size>700);
});
