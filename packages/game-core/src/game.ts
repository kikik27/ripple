import map from '../../../fixtures/map-komodo.json' with { type: 'json' };

export { map };
export type Point = [number,number];
export type Direction = 'N'|'S'|'E'|'W';
export type Action = {type:'MOVE';dir:Direction}|{type:'GATHER';node_id:string}|{type:'PLACE_PIPE'|'REMOVE_PIPE';cell:Point}|{type:'REPAIR_BRIDGE'|'CRAFT_WELL'|'BUILD_WELL'|'CONNECT_WATER'|'FINISH'};
export type State = {position:Point;energy:number;inventory:{wood:number;stone:number;metal:number;kit:number};stocks:Record<string,number>;bridgeRepaired:boolean;wellBuilt:boolean;waterConnected:boolean;pipes:Point[];finished:boolean;actions:number;xp:number;rp:number};
export class InvalidAction extends Error { constructor(message:string){super(message);this.name='InvalidAction';} }
const same=(a:Point,b:Point)=>a[0]===b[0]&&a[1]===b[1];
const near=(a:Point,b:Point)=>Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])<=1;
const id=(p:Point)=>`${p[0]},${p[1]}`;
export function walkable(p:Point,repaired:boolean):boolean {
  const [x,y]=p;
  return Number.isInteger(x)&&Number.isInteger(y)&&x>0&&y>0&&x<map.width-1&&y<map.height-1&&(x!==map.river_x||same(p,map.ford as Point)||(repaired&&same(p,map.bridge as Point)));
}
export function initialState():State {return {position:map.spawn as Point,energy:map.rules.starting_energy,inventory:{wood:0,stone:0,metal:0,kit:0},stocks:Object.fromEntries(map.nodes.map(n=>[n.id,n.stock])),bridgeRepaired:false,wellBuilt:false,waterConnected:false,pipes:[],finished:false,actions:0,xp:0,rp:0};}
export const bagUsed=(s:State)=>s.inventory.wood+s.inventory.stone+s.inventory.metal+s.inventory.kit*map.rules.kit_slots;
export function pipeReachable(pipes:Point[]):Set<string> {
  const allowed=new Set([id(map.puzzle.source as Point),...map.puzzle.homes.map(p=>id(p as Point)),...pipes.map(id)]);
  const queue:Point[]=[map.puzzle.source as Point], seen=new Set([id(queue[0])]);
  for(let i=0;i<queue.length;i++) {const [x,y]=queue[i];for(const p of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]] as Point[]) {const k=id(p);if(allowed.has(k)&&!seen.has(k)){seen.add(k);queue.push(p);}}}
  return seen;
}
export const pipesConnected=(pipes:Point[])=>map.puzzle.homes.every(p=>pipeReachable(pipes).has(id(p as Point)));
export function reduce(s:State,a:Action):State {
  if(s.finished) throw new InvalidAction('Expedition already finished');
  if(s.actions>=map.rules.max_actions) throw new InvalidAction('Action limit reached');
  const next:State={...s,position:[...s.position] as Point,inventory:{...s.inventory},stocks:{...s.stocks},pipes:[...s.pipes],actions:s.actions+1};
  const energy=(cost:number)=>{if(s.energy<cost)throw new InvalidAction('Not enough energy');next.energy-=cost;};
  const at=(p:Point)=>{if(!near(s.position,p))throw new InvalidAction('Move closer to interact');};
  switch(a.type){
    case 'MOVE': {const d:Record<Direction,Point>={N:[0,-1],S:[0,1],E:[1,0],W:[-1,0]};if(!Object.hasOwn(d,a.dir))throw new InvalidAction('Invalid direction');const [dx,dy]=d[a.dir];const p:Point=[s.position[0]+dx,s.position[1]+dy];if(!walkable(p,s.bridgeRepaired))throw new InvalidAction('Path blocked');energy(map.rules.move_cost);next.position=p;break;}
    case 'GATHER': {const node=map.nodes.find(n=>n.id===a.node_id);if(!node)throw new InvalidAction('Unknown node');at(node.position as Point);if(!s.stocks[node.id])throw new InvalidAction('Node depleted');if(bagUsed(s)>=map.rules.bag_capacity)throw new InvalidAction('Backpack full');energy(map.rules.gather_cost);next.stocks[node.id]--;next.inventory[node.material as 'wood'|'stone'|'metal']++;break;}
    case 'REPAIR_BRIDGE': at(map.bridge as Point);if(s.bridgeRepaired)throw new InvalidAction('Bridge already repaired');if(s.inventory.wood<2)throw new InvalidAction('Need 2 wood');energy(map.rules.repair_cost.energy);next.inventory.wood-=2;next.bridgeRepaired=true;break;
    case 'CRAFT_WELL': at(map.workshop as Point);if(s.inventory.kit)throw new InvalidAction('Kit already crafted');if(s.inventory.wood<2||s.inventory.stone<2||s.inventory.metal<1)throw new InvalidAction('Need 2 wood, 2 stone, 1 metal');energy(map.rules.craft_cost.energy);next.inventory.wood-=2;next.inventory.stone-=2;next.inventory.metal--;next.inventory.kit++;break;
    case 'BUILD_WELL': at(map.well_site as Point);if(s.wellBuilt)throw new InvalidAction('Well already built');if(!s.inventory.kit)throw new InvalidAction('Need a well kit');energy(map.rules.build_cost);next.inventory.kit--;next.wellBuilt=true;break;
    case 'PLACE_PIPE': case 'REMOVE_PIPE': {at(map.well_site as Point);if(!s.wellBuilt||s.waterConnected)throw new InvalidAction('Puzzle unavailable');const p=a.cell;if(!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isInteger(n))||p[0]<0||p[1]<0||p[0]>=map.puzzle.width||p[1]>=map.puzzle.height)throw new InvalidAction('Pipe outside grid');if([...map.puzzle.homes,map.puzzle.source,...map.puzzle.blocked].some(q=>same(p,q as Point)))throw new InvalidAction('Cell unavailable');const exists=s.pipes.some(q=>same(q,p));if(a.type==='PLACE_PIPE'){if(exists)throw new InvalidAction('Pipe already placed');if(s.pipes.length>=map.puzzle.pipe_budget)throw new InvalidAction('Pipe budget reached');next.pipes.push(p);}else{if(!exists)throw new InvalidAction('No pipe here');next.pipes=next.pipes.filter(q=>!same(q,p));}break;}
    case 'CONNECT_WATER': at(map.well_site as Point);if(!s.wellBuilt||s.waterConnected||!pipesConnected(s.pipes))throw new InvalidAction('Both homes need water');energy(map.rules.connect_cost);next.waterConnected=true;break;
    case 'FINISH': if(!same(s.position,map.extraction as Point)||!s.waterConnected)throw new InvalidAction('Return to extraction after connecting water');next.finished=true;next.xp=map.rules.completion_xp;next.rp=map.rules.completion_rp;break;
    default: throw new InvalidAction('Unknown action');
  }
  return next;
}
export function replay(actions:Action[]):State {if(actions.length>map.rules.max_actions)throw new InvalidAction('Action limit reached');return actions.reduce(reduce,initialState());}
