import test from "node:test";
import assert from "node:assert/strict";
import { applyLiving, claimLiving, createLiving, grove, isWalkable, loadLiving, moveLiving, objectFor, pathToApproach, restoreLiving, saveLiving, SOCIAL_SAVE_KEY, type LivingStateV1 } from "./living.ts";
import { atBoard, haven } from "./haven.ts";

const at = (state: LivingStateV1, id: string) => ({ ...state, position: [...objectFor(id)!.approaches![0]] as [number, number] });
const act = (state: LivingStateV1, id: string, action: Parameters<typeof applyLiving>[2], arg?: string) => applyLiving(at(state, id), id, action, arg);

test("living rules match the reference route and never produce scored rewards", () => {
  let s = createLiving();
  assert.equal(applyLiving(s, "animal_dog", "feed").ok, false);
  let r = act(s, "animal_dog", "feed"); assert.equal(r.ok, true); s = r.state;
  assert.equal(s.inventory.kibble, 2); assert.equal(s.animals.dog.friendship, 8);
  assert.equal(act(s, "animal_dog", "feed").ok, false);
  r = act(s, "animal_dog", "play"); assert.equal(r.ok, true); s = r.state;
  assert.equal(s.animals.dog.friendship, 13); assert.equal(act(s, "animal_dog", "play").ok, false);
  assert.equal(act(s, "animal_fish", "feed").ok, false);
  assert.equal(act(s, "animal_fish", "observe").ok, true);
  for (const id of ["npc_elder", "npc_farmer"]) s = act(s, id, "talk","accept").state;
  assert.equal(claimLiving(s, "greet_three").ok, false);
  s = act(s, "npc_child", "talk").state;
  s = claimLiving(s, "greet_three").state;
  assert.equal(s.inventory.seed, 5); assert.equal(claimLiving(s, "greet_three").ok, false);
  s = act(s, "plot_0_0", "harvest").state;
  s = claimLiving(s, "first_harvest").state;
  assert.equal(s.inventory.hay, 5);
  s = act(s, "market", "trade", "hay").state;
  assert.equal(s.inventory.hay, 7); assert.equal(s.inventory.produce, 0);
  assert.equal(act(s, "market", "trade", "hay").ok, false);
  s = act(s, "plot_1_0", "water").state;
  assert.equal(act(s, "plot_1_0", "water").ok, false);
  assert.equal(act(s, "campfire", "rest").ok, false);
  s = act(s, "campfire", "rest", "confirm").state;
  assert.equal(s.day, 2); assert.equal(s.crops.plot_1_0.stage, 1);
  s = act(s, "animal_dog", "feed").state;
  s = act(s, "pump", "refill").state;
  s = act(s, "fishing_dock", "fish").state;
  assert.equal(act(s, "fishing_dock", "fish").ok, false);
  assert.equal("rp" in s || "xp" in s || "funding" in s, false);
});

test("invalid actions are atomic, collision and approach path use the map", () => {
  const s = createLiving();
  const before = JSON.stringify(s);
  assert.equal(applyLiving(s, "animal_dog", "feed").state, s);
  assert.equal(moveLiving(s, 2, 0).ok, false);
  assert.equal(JSON.stringify(s), before);
  assert.equal(isWalkable([19, 0]), false);
  const target = objectFor("animal_dog")!;
  const path = pathToApproach(s.position, target);
  assert.ok(path.length > 0);
  assert.deepEqual(path[0], [5, 13]);
  assert.ok(path.every(isWalkable));
  assert.ok(target.approaches!.some(p => p[0] === path.at(-1)![0] && p[1] === path.at(-1)![1]));
  assert.equal(grove.width, 64); assert.equal(grove.height, 28);
});

test("save validation clamps data and ignores scored or unknown fields", () => {
  const raw = { ...createLiving(), day: 3, position: [19, 0], inventory: { hay: 500, kibble: -4, seed: 2, produce: 1, fish: 0, water: 99 }, animals: { dog: { friendship: 999, fedDay: 7, playedDay: -1 } }, talked: ["elder", "elder", "unknown"], quests: { greet_three: "claimed" }, xp: 9999, rp: 9999, funding: 9999 };
  const s = restoreLiving(raw);
  assert.deepEqual(s.position, grove.spawn);
  assert.equal(s.inventory.hay, 99); assert.equal(s.inventory.kibble, 0); assert.equal(s.inventory.water, 3);
  assert.equal(s.animals.dog.friendship, 100); assert.equal(s.animals.dog.fedDay, 3);
  assert.deepEqual(s.talked, ["elder"]); assert.equal(s.quests.greet_three, undefined);
  assert.equal("xp" in s || "rp" in s || "funding" in s, false);
});

test("social save and Haven board return leave expedition progress alone", () => {
  const entries = new Map<string, string>([["ripple.expedition.v1", "{\"rp\":100,\"xp\":100}"], ["ripple.introSeen.v1", "true"]]);
  const storage = { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); } };
  const s = act(createLiving(), "animal_dog", "feed").state;
  saveLiving(storage, s);
  assert.equal(entries.get("ripple.expedition.v1"), '{"rp":100,"xp":100}');
  assert.equal(entries.get("ripple.introSeen.v1"), "true");
  assert.ok(entries.has(SOCIAL_SAVE_KEY));
  assert.equal(loadLiving(storage).animals.dog.friendship, 8);
  entries.set(SOCIAL_SAVE_KEY, "{invalid");
  assert.deepEqual(loadLiving(storage), createLiving());
  assert.equal(atBoard(haven.interactions[0].approach as [number, number]), true);
});

test("Eastbank requires a survey, correct valve levels and physical access",()=>{
  const fresh=createLiving();
  assert.equal(restoreLiving({version:1}).nursery,"dry");
  assert(!act(fresh,"nursery_gate","inspect","1,2,3").ok);
  const survey=act(fresh,"water_lab","inspect").state;
  assert.equal(restoreLiving(survey).nursery,"surveyed");
  assert(!applyLiving(survey,"nursery_gate","inspect","1,2,3").ok);
  const onsite=at(survey,"nursery_gate");
  assert.equal(applyLiving(onsite,"nursery_gate","inspect","2,2,2").state,onsite);
  const result=applyLiving(onsite,"nursery_gate","inspect","1,2,3");
  assert(result.ok);
  assert.deepEqual(result.state,{...onsite,nursery:"flowing"});
  assert.equal(restoreLiving(result.state).nursery,"flowing");
  assert(!act(result.state,"nursery_gate","inspect","1,2,3").ok);
  for(const building of grove.objects.filter(o=>o.kind==="building")){
    assert(building.actions.length && pathToApproach(fresh.position,building).length,building.id);
  }
});
