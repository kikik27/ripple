from pathlib import Path
import json
from PIL import Image
root=Path(__file__).resolve().parents[1]; assets=root/'apps/web/public/assets'; living=assets/'living'
manifest=json.loads((living/'living-manifest.json').read_text())['assets']; frames=json.loads((living/'atlases/living.json').read_text())['frames']; atlas=Image.open(living/'atlases/living.png').convert('RGBA')
assert set(manifest)==set(frames)
for key,entry in manifest.items():
 im=Image.open(assets/entry['path']).convert('RGBA'); assert im.size==(entry['width'],entry['height']); assert im.getbbox(); assert im.getchannel('A').getextrema()[0]==0,key
 a=frames[key]['frame']; assert a['x']+a['w']<=atlas.width and a['y']+a['h']<=atlas.height
 assert im.tobytes()==atlas.crop((a['x'],a['y'],a['x']+a['w'],a['y']+a['h'])).tobytes(),key
m=json.loads((living/'maps/komodo-grove.json').read_text()); assert m==json.loads((root/'fixtures/living/komodo-grove.json').read_text()); assert len(m['terrain'])==m['height'] and all(len(row)==m['width'] for row in m['terrain']); assert len({o['id'] for o in m['objects']})==len(m['objects']); blocked={tuple(a) for a in m['blocked']}; assert tuple(m['spawn']) not in blocked; assert all(tuple(a) in blocked for o in m['objects'] for a in o['footprint']); assert all(tuple(a) not in blocked for o in m['objects'] for a in o.get('approaches',[]));
base=json.loads((living/'data/base-dependencies.json').read_text())['assets']; known=set(manifest)|set(base)|{'lw_tile_plaza'}; assert all(o['asset'] in known for o in m['objects']); assert all(t in known for row in m['terrain'] for t in row)
if (assets/'asset-manifest.json').exists():
 for key,rel in base.items():assert (assets/rel).is_file(),key
else:print('Base dependency files not present in add-on only; verify after overlay.')
assert Image.open(living/'props/lw_tile_plaza.png').size==(32,32)
print(f'PASS: {len(manifest)} atlas frames + standalone tile; {len(m["objects"])} placements; map consistency and texture references')
coverage=json.loads((root/'docs/animation-coverage.json').read_text())['groveSideWalk']
for actor in coverage['actors']:
 strip=Image.open(living/'sprites'/f'{actor}-walk.png').convert('RGBA')
 width,height=coverage['cell']
 assert strip.size==(width*coverage['frames'],height),actor
 poses=[strip.crop((i*width,0,(i+1)*width,height)) for i in range(coverage['frames'])]
 assert all(p.getbbox() for p in poses) and len({p.tobytes() for p in poses})==len(poses),actor
 assert len({p.getbbox()[3] for p in poses})==1,actor
print(f'PASS: {len(coverage["actors"])} distinct side walk cycles and stable foot anchors')
