import grove from "../../../fixtures/living/komodo-grove.json" with { type: "json" };
import config from "../public/assets/living/data/interaction-config.json" with { type: "json" };

export { grove, config as livingConfig };
export type Tile = [number, number];
export type LivingObject = (typeof grove.objects)[number];
export type LivingAction = "talk" | "observe" | "feed" | "play" | "water" | "harvest" | "trade" | "refill" | "fish" | "rest" | "return_haven" | "board" | "sit" | "workshop" | "inspect";
export type LivingStateV1 = {
  version: 1;
  nursery: "dry" | "surveyed" | "flowing";
  day: number;
  position: Tile;
  inventory: Record<"hay" | "kibble" | "seed" | "produce" | "fish" | "water", number>;
  animals: Record<string, { friendship: number; fedDay: number; playedDay: number }>;
  crops: Record<string, { stage: number; wateredDay: number }>;
  harvestDay: Record<string, number>;
  talked: string[];
  quests: Record<string, "active" | "claimed">;
  fishDay: number;
  harvestCount: number;
};
export type LivingResult = { ok: boolean; message: string; state: LivingStateV1 };
export const SOCIAL_SAVE_KEY = "social.komodoGrove.v1:guest";
const blocked = new Set(grove.blocked.map(([x, y]) => `${x},${y}`));
const objectById = new Map(grove.objects.map(o => [o.id, o]));
const animals = config.animals as Record<string, { name: string; food: string | null; actions: string[]; feedGain: number; playGain: number }>;
const npcs = config.npcs as Record<string, { name: string; role: string; dialogue: string[]; quest?: string }>;
const quests = config.quests as Record<string, { title: string; objective: string; reward: Record<string, number> }>;
const itemCap = config.rules.inventoryCapPerItem;
const itemKeys = Object.keys(config.initialInventory) as (keyof LivingStateV1["inventory"])[];
const same = (a: readonly number[], b: readonly number[]) => a[0] === b[0] && a[1] === b[1];
export const isWalkable = ([x, y]: Tile) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < grove.width && y < grove.height && !blocked.has(`${x},${y}`);
export const objectFor = (id: string) => objectById.get(id);
export const nearby = (o: LivingObject, p: Tile) => o.approaches?.some(a => same(a, p)) ?? false;

export function createLiving(): LivingStateV1 {
  return {
      version: 1, nursery:"dry", day: 1, position: [...grove.spawn] as Tile,
    inventory: { ...config.initialInventory },
    animals: Object.fromEntries(Object.keys(config.animals).map(id => [id, { friendship: 0, fedDay: 0, playedDay: 0 }])),
    crops: Object.fromEntries(grove.objects.filter(o => o.kind === "crop").map(o => [o.id, { stage: o.initialStage ?? 0, wateredDay: 0 }])),
    harvestDay: {}, talked: [], quests: {}, fishDay: 0, harvestCount: 0,
  };
}
const no = (state: LivingStateV1, message: string): LivingResult => ({ ok: false, message, state });
const yes = (state: LivingStateV1, message: string): LivingResult => ({ ok: true, message, state });

export function moveLiving(state: LivingStateV1, dx: number, dy: number): LivingResult {
  if (!Number.isInteger(dx) || !Number.isInteger(dy) || Math.abs(dx) + Math.abs(dy) !== 1) return no(state, "Choose a cardinal step.");
  const next: Tile = [state.position[0] + dx, state.position[1] + dy];
  if (!isWalkable(next)) return no(state, "The path is blocked.");
  return yes({ ...state, position: next }, "Moved.");
}

export function applyLiving(state: LivingStateV1, id: string, action: LivingAction, arg?: string, actorTile?: Tile): LivingResult {
  const o = objectFor(id);
  const inRange = o && actorTile && (o.kind==="animal" || o.kind==="npc") && isWalkable(actorTile) ? Math.abs(actorTile[0]-state.position[0])+Math.abs(actorTile[1]-state.position[1])<=1 : o && nearby(o,state.position);
  if (!o || !(o.actions as string[]).includes(action) || !inRange) return no(state, "Move closer to interact.");
  const s = structuredClone(state);
  if(id==="water_lab" && action==="inspect"){
    if(s.nursery==="flowing")return yes(s,"Piko's gauge is steady. Water is reaching every nursery bed.");
    s.nursery="surveyed";
    return yes(s,"Piko pencils three marks on your chart. At Eastbank Nursery, send one measure to each seed tray. The young trees need twice that, and the reeds need three.");
  }
  if(id==="nursery_gate" && action==="inspect"){
    if(s.nursery==="dry")return no(state,"The gate has three unmarked channels. Read Piko's calibration notes at the village water lab.");
    if(s.nursery==="flowing")return no(state,"The irrigation channels are already flowing.");
    if(arg!=="1,2,3")return no(state,"The float marks do not line up. Check the three outlet levels.");
    s.nursery="flowing";
    return yes(s,"Water reaches the last bed. The Eastbank nursery is irrigated!");
  }
  if(action==="inspect"){
    const notes:Record<string,string>={
      storage:"Seed sacks hang above the damp floor. The pump beside the barn fills your watering can.",
      home_1:"A pencilled map on the door marks a walk from Market Lane across two orchard bridges.",
      home_2:"Ari left a basket by the step. A note reads: Ripe produce can be traded for hay at the market.",
      recycling:"Rumi has sorted the worn pipe fittings by size. The repaired valves went to Eastbank Nursery.",
      barn:"A feed chart hangs on the gate. Hay for the sheep and goat, seed for the birds, kibble for the cat and dog.",
      well:"Cool water beads on the stone. A small pipe carries a sample west to Piko's water lab."
    };
    if(notes[id])return yes(s,notes[id]);
  }
  const inv = s.inventory;
  const add = (key: keyof typeof inv, n: number) => { inv[key] = Math.min(itemCap, inv[key] + n); };
  const take = (key: keyof typeof inv) => { if (inv[key] <= 0) return false; inv[key]--; return true; };
  if (o.kind === "animal") {
    const id = o.animalId!;
    const animal = animals[id], progress = s.animals[id];
    if (action === "observe") return yes(s, `${animal.name} — friendship ${progress.friendship}/100`);
    if (!animal.actions.includes(action)) return no(state, "Observe this animal from a distance.");
    if (action === "feed") {
      if (progress.fedDay === s.day) return no(state, "Already fed today.");
      const food = animal.food as keyof typeof inv;
      if (!take(food)) return no(state, `You need ${food}.`);
      progress.fedDay = s.day;
      progress.friendship = Math.min(config.rules.friendshipCap, progress.friendship + animal.feedGain);
      return yes(s, `${animal.name} enjoyed the ${food}! +${animal.feedGain} friendship.`);
    }
    if (action === "play") {
      if (progress.playedDay === s.day) return no(state, "Already played today.");
      progress.playedDay = s.day;
      progress.friendship = Math.min(config.rules.friendshipCap, progress.friendship + animal.playGain);
      return yes(s, `${animal.name} is happy! +${animal.playGain} friendship.`);
    }
  }
  if (action === "talk") {
    const id = o.npcId!;
    const npc = npcs[id];
    if (!s.talked.includes(id)) s.talked.push(id);
    if (npc.quest && !s.quests[npc.quest]) s.quests[npc.quest] = "active";
    return yes(s, npc.dialogue.join(" "));
  }
  if (action === "trade") {
    if (arg !== "hay" && arg !== "seed" && arg !== "kibble") return no(state, "Choose hay, seed or kibble.");
    if (inv[arg] > itemCap - config.rules.tradeGain) return no(state, "Inventory full.");
    if (!take("produce")) return no(state, "You need one produce.");
    add(arg, config.rules.tradeGain);
    return yes(s, `Traded 1 produce for 2 ${arg}.`);
  }
  if (o.kind === "crop") {
    const crop = s.crops[id];
    if (action === "water") {
      if (crop.stage === 4) return no(state, "Ready to harvest!");
      if (crop.wateredDay === s.day) return no(state, "Already watered today.");
      if (!take("water")) return no(state, "Refill at the pump.");
      crop.wateredDay = s.day;
      return yes(s, "Watered. It will grow after rest.");
    }
    if (action === "harvest") {
      if (crop.stage !== 4) return no(state, "Not ripe yet.");
      if (inv.produce >= itemCap) return no(state, "Inventory full.");
      add("produce", 1); crop.stage = 0; crop.wateredDay = 0; s.harvestCount++;
      return yes(s, "Harvested 1 produce.");
    }
  }
  if (action === "harvest") {
    if (s.harvestDay[id] === s.day) return no(state, "Already harvested today.");
    if (inv.produce >= itemCap) return no(state, "Inventory full.");
    s.harvestDay[id] = s.day; add("produce", 1); s.harvestCount++;
    return yes(s, "Collected 1 produce.");
  }
  if (action === "refill") { inv.water = config.rules.waterCapacity; return yes(s, "Watering can refilled."); }
  if (action === "fish") {
    if (s.fishDay === s.day) return no(state, "Come back tomorrow.");
    if (inv.fish >= itemCap) return no(state, "Inventory full.");
    s.fishDay = s.day; add("fish", 1); return yes(s, "Caught 1 fish.");
  }
  if (action === "rest") {
    if (arg !== "confirm") return no(state, "Confirm to advance the day.");
    for (const crop of Object.values(s.crops)) if (crop.wateredDay === s.day) crop.stage = Math.min(4, crop.stage + 1);
    s.day++; return yes(s, `Welcome to day ${s.day}!`);
  }
  return yes(s, action === "return_haven" ? "Return to Himalayan Haven via the original world board." : action === "board" ? "Visit Operation Komodo through the original world board." : action === "sit" ? "You take a moment to enjoy the garden." : action === "workshop" ? "Social workshop: no scored expedition crafting here." : "You take a closer look.");
}

export function claimLiving(state: LivingStateV1, id: string): LivingResult {
  const quest = quests[id];
  if (!quest || state.quests[id] !== "active") return no(state, "Quest not active.");
  if ((id === "greet_three" && state.talked.length < 3) || (id === "first_harvest" && state.harvestCount < 1)) return no(state, "Objective incomplete.");
  if (Object.entries(quest.reward).some(([key, n]) => state.inventory[key as keyof LivingStateV1["inventory"]] + n > itemCap)) return no(state, "Inventory full.");
  const s = structuredClone(state);
  for (const [key, n] of Object.entries(quest.reward)) s.inventory[key as keyof LivingStateV1["inventory"]] += n;
  s.quests[id] = "claimed";
  return yes(s, "Quest complete!");
}

export function pathToApproach(start: Tile, target: Pick<LivingObject, "approaches">, occupied?:ReadonlySet<string>): Tile[] {
  const approaches = new Set((target.approaches ?? []).map(([x, y]) => `${x},${y}`));
  const queue: Tile[] = [start], seen = new Set([`${start[0]},${start[1]}`]);
  const parent = new Map<string, string>();
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i], key = `${p[0]},${p[1]}`;
    if (approaches.has(key)) {
      const path: Tile[] = []; let at = key;
      while (at !== `${start[0]},${start[1]}`) { const [x, y] = at.split(",").map(Number); path.unshift([x, y]); at = parent.get(at)!; }
      return path;
    }
    for (const next of [[p[0]+1,p[1]],[p[0]-1,p[1]],[p[0],p[1]+1],[p[0],p[1]-1]] as Tile[]) {
      const k = `${next[0]},${next[1]}`;
      if (isWalkable(next) && !seen.has(k) && !occupied?.has(k)) { seen.add(k); parent.set(k, key); queue.push(next); }
    }
  }
  return [];
}
export const pathToTile = (start: Tile, target: Tile) => pathToApproach(start, { approaches: [target] });

const clamp = (value: unknown, min: number, max: number, fallback: number) => Number.isInteger(value) ? Math.max(min, Math.min(max, value as number)) : fallback;
export function restoreLiving(raw: unknown): LivingStateV1 {
  const base = createLiving();
  if (!raw || typeof raw !== "object" || (raw as { version?: unknown }).version !== 1) return base;
  const input = raw as Record<string, unknown>;
  if(input.nursery==="surveyed" || input.nursery==="flowing")base.nursery=input.nursery;
  base.day = clamp(input.day, 1, 1000000, 1);
  if (Array.isArray(input.position) && input.position.length === 2 && isWalkable(input.position as Tile)) base.position = [...input.position] as Tile;
  const inventory = input.inventory as Record<string, unknown> | undefined;
  for (const key of itemKeys) base.inventory[key] = clamp(inventory?.[key], 0, key === "water" ? config.rules.waterCapacity : itemCap, base.inventory[key]);
  const animalInput = input.animals as Record<string, Record<string, unknown>> | undefined;
  for (const [id, progress] of Object.entries(base.animals)) {
    const from = animalInput?.[id];
    progress.friendship = clamp(from?.friendship, 0, config.rules.friendshipCap, 0);
    progress.fedDay = clamp(from?.fedDay, 0, base.day, 0);
    progress.playedDay = clamp(from?.playedDay, 0, base.day, 0);
  }
  const cropInput = input.crops as Record<string, Record<string, unknown>> | undefined;
  for (const [id, crop] of Object.entries(base.crops)) {
    const from = cropInput?.[id];
    crop.stage = clamp(from?.stage, 0, 4, crop.stage);
    crop.wateredDay = clamp(from?.wateredDay, 0, base.day, 0);
  }
  const harvestInput = input.harvestDay as Record<string, unknown> | undefined;
  for (const o of grove.objects.filter(o => o.kind === "plant")) if (harvestInput?.[o.id] !== undefined) base.harvestDay[o.id] = clamp(harvestInput[o.id], 0, base.day, 0);
  base.talked = Array.isArray(input.talked) ? [...new Set(input.talked.filter((id): id is string => typeof id === "string" && id in npcs))] : [];
  base.harvestCount = clamp(input.harvestCount, 0, 1000000, 0);
  base.fishDay = clamp(input.fishDay, 0, base.day, 0);
  const questInput = input.quests as Record<string, unknown> | undefined;
  for (const id of Object.keys(quests)) {
    const issuer = id === "greet_three" ? "elder" : "farmer";
    const status = questInput?.[id];
    if (base.talked.includes(issuer) && (status === "active" || (status === "claimed" && (id === "greet_three" ? base.talked.length >= 3 : base.harvestCount >= 1)))) base.quests[id] = status;
  }
  return base;
}
export function loadLiving(storage: Pick<Storage, "getItem">): LivingStateV1 {
  try { return restoreLiving(JSON.parse(storage.getItem(SOCIAL_SAVE_KEY) ?? "null")); }
  catch { return createLiving(); }
}
export function saveLiving(storage: Pick<Storage, "setItem">, state: LivingStateV1) {
  storage.setItem(SOCIAL_SAVE_KEY, JSON.stringify(restoreLiving(state)));
}
