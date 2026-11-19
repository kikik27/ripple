import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import campaignSchema from '../../../schemas/campaign.schema.json' with { type: 'json' };
import replaySchema from '../../../schemas/replay.schema.json' with { type: 'json' };
import mapFixture from '../../../fixtures/map-komodo.json' with { type: 'json' };

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const campaignCheck = ajv.compile(campaignSchema);
const replayCheck = ajv.compile(replaySchema);

export type MapConfig = typeof mapFixture;
export const map = mapFixture;
export type Point = [number, number];
const key = ([x,y]: Point) => `${x},${y}`;
export const equal = (a: Point,b: Point) => a[0]===b[0] && a[1]===b[1];
export const adjacent = (a: Point,b: Point) => Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])<=1;
export const inBounds = ([x,y]: Point, w=map.width,h=map.height) => Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<w&&y<h;
export const walkable = (p: Point, repaired=false) => inBounds(p) && (!map.blocked_border || (p[0]>0&&p[1]>0&&p[0]<map.width-1&&p[1]<map.height-1)) && (p[0]!==map.river_x || equal(p,map.ford as Point) || (repaired&&equal(p,map.bridge as Point)));

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value==='object') return `{${Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
export const sha256 = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
export function validateCampaign(value: unknown): string[] {
  if (!campaignCheck(value)) return (campaignCheck.errors??[]).map(e=>`${e.instancePath} ${e.message}`);
  const campaign=value as {map_hash:string};
  return campaign.map_hash===sha256(map)?[]:['map_hash does not match pinned fixture'];
}
export function validateReplay(value: unknown): string[] {
  return replayCheck(value)?[]:(replayCheck.errors??[]).map(e=>`${e.instancePath} ${e.message}`);
}
function reaches(start: Point, target: Point, repaired: boolean): boolean {
  const queue: Point[]=[start], seen=new Set([key(start)]);
  for (let i=0;i<queue.length;i++) {
    const [x,y]=queue[i]; if (equal(queue[i],target)) return true;
    for (const p of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]] as Point[]) if(walkable(p,repaired)&&!seen.has(key(p))){seen.add(key(p));queue.push(p);}
  }
  return false;
}
export function validateMap(m: MapConfig): string[] {
  const errors: string[]=[];
  if (sha256(m)!==sha256(map)) errors.push('map differs from pinned komodo_v1 fixture');
  if (m.map_id!=='komodo_v1'||m.width!==24||m.height!==20||m.tile_size!==32||m.river_x!==11) errors.push('unsupported map dimensions or ID');
  const positions: Point[]=[m.spawn,m.extraction,m.workshop,m.well_site,m.bridge,m.ford,...m.homes,...m.nodes.map(n=>n.position)] as Point[];
  if (positions.some(p=>!inBounds(p,m.width,m.height))) errors.push('position out of bounds');
  if (!equal(m.spawn as Point,m.extraction as Point)||!walkable(m.spawn as Point)||!walkable(m.ford as Point)||walkable(m.bridge as Point)) errors.push('invalid spawn, ford or bridge collision');
  if (!reaches(m.spawn as Point,m.well_site as Point,true)||!reaches(m.spawn as Point,m.well_site as Point,false)) errors.push('site unreachable');
  const ids=m.nodes.map(n=>n.id);
  if(new Set(ids).size!==ids.length||ids.join(',')!=='wood_1,stone_1,metal_1') errors.push('invalid node IDs');
  if (m.nodes.some(n=>n.stock<0||!Number.isInteger(n.stock))) errors.push('invalid stock');
  if ((m.nodes.find(n=>n.id==='wood_1')?.stock??0)<4||(m.nodes.find(n=>n.id==='stone_1')?.stock??0)<2||(m.nodes.find(n=>n.id==='metal_1')?.stock??0)<1) errors.push('insufficient stock');
  if (m.puzzle.width!==6||m.puzzle.height!==5||m.puzzle.pipe_budget!==9) errors.push('unsupported puzzle');
  const puzzlePoints=[m.puzzle.source,...m.puzzle.homes,...m.puzzle.blocked] as Point[];
  if(puzzlePoints.some(p=>!inBounds(p,m.puzzle.width,m.puzzle.height))||new Set(puzzlePoints.map(key)).size!==puzzlePoints.length) errors.push('invalid puzzle coordinates');
  return errors;
}
