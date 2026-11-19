import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { type Action,initialState,reduce,replay,InvalidAction,pipesConnected } from './game.ts';
const fixture=(n:string)=>JSON.parse(readFileSync(new URL(`../../../fixtures/${n}.json`,import.meta.url),'utf8'));
test('bridge and detour fixture results',()=>{
  const expected=fixture('expected-results');
  for(const [name,route] of [['replay-example','bridge'],['replay-detour','detour']] as const){const s=replay(fixture(name).actions as Action[]);const e=expected[route];assert.equal(s.actions,e.actions);assert.equal(s.energy,e.energy_remaining);assert.equal(s.xp,e.xp);assert.equal(s.rp,e.rp);assert.equal(s.bridgeRepaired,e.bridge_repaired);assert.equal(s.finished,true);}
});
test('invalid actions preserve original state and cannot skip water',()=>{
  const s=initialState();const before=JSON.stringify(s);
  for(const a of [{type:'BUILD_WELL'},{type:'FINISH'},{type:'GATHER',node_id:'bogus'}] as Action[]) assert.throws(()=>reduce(s,a),InvalidAction);
  assert.throws(()=>reduce({...s,position:[1,10]},{type:'MOVE',dir:'W'}),InvalidAction);
  assert.equal(JSON.stringify(s),before);
  assert.equal(pipesConnected([[1,2],[2,2],[3,2],[4,2],[5,2],[5,1]]),false);
});
