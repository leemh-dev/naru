"""Refresh bundled icons from catalog official websites; never fetch private tab URLs."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urljoin,urlparse
from html.parser import HTMLParser
import json,requests,subprocess,tempfile
root=Path(__file__).resolve().parents[1];catalog=json.loads((root/'src/services.json').read_text());out=root/'src/assets/services';out.mkdir(parents=True,exist_ok=True)
class Links(HTMLParser):
 def __init__(self):super().__init__();self.icons=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='link' and 'icon' in a.get('rel','').lower() and a.get('href'):self.icons.append(a['href'])
def fetch(item):
 id,s=item; urls=[]
 for base in dict.fromkeys([s.get('source'),s.get('url')]):
  if not base:continue
  try:
   r=requests.get(base,timeout=12,headers={'User-Agent':'Mozilla/5.0'},stream=True);body=next(r.iter_content(350000),b'').decode('utf-8','ignore');p=Links();p.feed(body)
   urls += [urljoin(r.url,u) for u in p.icons];urls += [urljoin(base,'/favicon.ico'),urljoin(base,'/apple-touch-icon.png')]
  except Exception:pass
 for url in dict.fromkeys(urls):
  if urlparse(url).scheme!='https':continue
  try:
   r=requests.get(url,timeout=8,stream=True);r.raise_for_status();b=b''.join(r.iter_content(65536))
   if len(b)>2000000 or len(b)<50:continue
   is_svg=b'<svg' in b[:1000]
   with tempfile.TemporaryDirectory() as temp:
    source=Path(temp)/'source';target=out/(id+'.png')
    if is_svg:
     if any(x in b.lower() for x in [b'<!entity',b'href=',b'url(',b'@import']):continue
     import cairosvg
     b=cairosvg.svg2png(bytestring=b,output_width=96,output_height=96)
    if not (b.startswith(b'\x89PNG') or b.startswith(b'\x00\x00\x01\x00') or b.startswith(b'RIFF') or b.startswith(b'\xff\xd8')):continue
    source.write_bytes(b)
    subprocess.run(['convert',str(source)+'[0]','-thumbnail','64x64','-gravity','center','-background','none','-extent','64x64','-strip',str(target)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
   return id,{'source':url,'file':'assets/services/'+id+'.png'}
  except Exception:pass
 return id,{'source':None,'fallback':'monogram'}
items=[(k,v) for k,v in catalog['services'].items() if k!='web']+[('google',{'url':'https://www.google.com/','source':'https://www.google.com/favicon.ico'})]
with ThreadPoolExecutor(max_workers=8) as pool:results=dict(pool.map(fetch,items))
for id,s in catalog['services'].items():
 if results.get(id,{}).get('file'):s['favicon']=results[id]['file']
(root/'src/services.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n');(out/'sources.json').write_text(json.dumps({'reviewedOn':'2026-11-19','icons':results},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'icons':sum('file' in x for x in results.values()),'fallbacks':[k for k,v in results.items() if 'file' not in v]}))
