import { readFileSync } from 'node:fs';
import { validateCampaign,validateMap,validateReplay,map } from './content.ts';
const json=(path:string)=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const results=[...validateMap(map),...['operation-komodo','operation-first-drop'].flatMap(n=>validateCampaign(json(`../../../fixtures/${n}.json`)).map(e=>`${n}: ${e}`)),...['replay-example','replay-detour'].flatMap(n=>validateReplay(json(`../../../fixtures/${n}.json`)).map(e=>`${n}: ${e}`))];
if(results.length){console.error(results.join('\n'));process.exitCode=1;}else console.log('PASS: map, two campaigns, two replay schemas, pinned hash');
