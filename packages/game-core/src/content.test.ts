import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { map,sha256,validateCampaign,validateMap,validateReplay } from './content.ts';
const fixture=(name:string)=>JSON.parse(readFileSync(new URL(`../../../fixtures/${name}.json`,import.meta.url),'utf8'));
test('pinned map and both campaigns validate',()=>{
  assert.deepEqual(validateMap(map),[]);
  for(const name of ['operation-komodo','operation-first-drop']) assert.deepEqual(validateCampaign(fixture(name)),[]);
  assert.equal(sha256(map),'4d2735fa99dfb42ee856d71d3447cab5fc1fe038f59279784f1593688fa51de4');
});
test('both route envelopes validate and malformed data rejects',()=>{
  for(const name of ['replay-example','replay-detour']) assert.deepEqual(validateReplay(fixture(name)),[]);
  const bad=fixture('replay-example'); bad.actions[0]={type:'MOVE',dir:'UP'};
  assert.notEqual(validateReplay(bad).length,0);
  const campaign=fixture('operation-komodo'); campaign.map_hash='0'.repeat(64);
  assert.notEqual(validateCampaign(campaign).length,0);
  assert.notEqual(validateMap({...map,nodes:map.nodes.map(n=>({...n,stock:0}))}).length,0);
});
