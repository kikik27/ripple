"""Validate package integrity. Requires Python + Pillow. Does not run Phaser."""
import json, pathlib, hashlib
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1]; A=ROOT/'apps/web/public/assets'
m=json.loads((A/'asset-manifest.json').read_text()); assets=m['assets']; errors=[]
def check(ok,msg):
 if not ok: errors.append(msg)
for id,meta in assets.items():
 p=A/meta['path'];check(p.is_file(),f'missing {id}');
 if not p.is_file(): continue
 with Image.open(p) as im:
  check(im.mode=='RGBA',f'RGBA {id}');check(im.size==(meta['width'],meta['height']),f'size {id}');check(im.getbbox() is not None,f'empty {id}');check(all(0<=v<=1 for v in meta['origin']),f'origin {id}')
  if meta['category'] in ('sprites','props','icons','fx','ui') and not id.startswith('bar_') and id!='hud_profile_frame_empty':check(im.getchannel('A').getextrema()[0]==0,f'no transparency {id}')
for name,paths in m['atlases'].items():
 a=Image.open(A/paths['texture']);d=json.loads((A/paths['data']).read_text()); check(a.size==(d['meta']['size']['w'],d['meta']['size']['h']),name+' size')
 for id,f in d['frames'].items():
  r=f['frame'];x,y,w,h=[r[k] for k in ('x','y','w','h')];check(0<=x and 0<=y and x+w<=a.width and y+h<=a.height,'bounds '+id)
  im=Image.open(A/assets[id]['path']);check(im.tobytes()==a.crop((x,y,x+w,y+h)).tobytes(),'atlas bytes '+id)
for id,info in json.loads((A/m['animations']).read_text()).items():
 for frame in info['frames']:check(frame in assets,'animation '+id+' '+frame)
for name,p in m['tilesets'].items():
 d=json.loads((A/p).read_text()); im=Image.open((A/p).parent/d['image']);check(im.width%32==0 and im.height%32==0,'tile dims '+name)
 for id,info in d['tiles'].items():
  frame=info['frame'];check(info['gid']==frame+1,'gid '+id);x=(frame%d['columns'])*32;y=(frame//d['columns'])*32;check(im.crop((x,y,x+32,y+32)).tobytes()==Image.open(A/assets[id]['path']).tobytes(),'tile crop '+id)
for path in [*m['audio'].values(),*m['branding'].values()]: check((A/path).is_file(),'missing '+path)
for name in ('yeti_walk','aurora_pulse'):
 d=json.loads((A/'sprites'/f'{name}.json').read_text()); im=Image.open(A/'sprites'/f'{name}.png');w,h=d['frameWidth'],d['frameHeight'];cols=im.width//w
 for id,i in d['frames'].items():x=(i%cols)*w;y=(i//cols)*h;check(im.crop((x,y,x+w,y+h)).tobytes()==Image.open(A/assets[id]['path']).tobytes(),'sheet '+id)
fixture=json.loads((ROOT/'examples/map-asset-bindings.json').read_text())
def verify_ids(v):
 if isinstance(v,dict):
  for x in v.values():verify_ids(x)
 elif isinstance(v,str):check(v in assets,'binding '+v)
for k in ('floor','props','player'):verify_ids(fixture[k])
print(f'{len(assets)} assets | {len(m["atlases"])} atlases | {len(m["tilesets"])} tilesets | {len(m["audio"])} audio files')
if errors: print('\n'.join(errors));raise SystemExit(1)
print('PASS: manifest, dimensions, transparency, atlas and spritesheet exact pixels, tile IDs, animation references, branding/audio presence, map bindings.')
