"""Balanced source selection; source families remain together in later splits."""
import collections
import json
from pathlib import Path
import re
import unicodedata
from preparar import digest, write_json

HERE=Path(__file__).resolve().parent
TOPICS={
 'identity':r'pasaport|passport|identidad|identity|cedula',
 'driving':r'conduc|driv|vehicul|vehicle|mot |transit|transport|licence|licencia',
 'civil':r'nacimiento|matrimonio|defuncion|birth|marriage|death|registro civil|civil partnership',
 'tax':r'tribut|impuest|tax|tasa|payment|pago|deuda|debt',
 'education':r'estudian|educa|beca|scholarship|student|school|universi|enseñanza',
 'housing':r'vivienda|housing|home|property|inmuebl|alquiler|rent|constru|building|land ',
 'business':r'empresa|business|company|comerci|habilitacion|employer|emprendi',
 'health':r'salud|health|discapacidad|disabil|medic|sanitari|blue badge|veterinar',
 'pensions':r'jubil|pension|retirement|seguridad social|social security|benefit|prestacion',
 'immigration':r'migra|residencia|citizen|visa|foreign|extranj|travel authorisation|nacionalidad',
 'employment':r'trabaj|laboral|employment|job|work|desemple',
 'legal':r'judicial|court|denuncia|complaint|antecedentes|criminal|justice|legal|electoral|vote',
 'environment':r'ambient|environment|water|agua|residu|waste|animal|fishing|pesca',
}
def norm(text):
 return ''.join(c for c in unicodedata.normalize('NFKD',text.lower()) if not unicodedata.combining(c))
def topic(doc):
 text=norm(doc['title'])
 return next((k for k,p in TOPICS.items() if re.search(p,text)),'other')

def build(per_language=160):
 docs=[json.loads(l) for l in (HERE/'datos/corpus-ampliado.jsonl').read_text(encoding='utf-8').splitlines()]
 excluded=[];selected=[]
 seed_urls={s[k] for s in json.loads((HERE/'semillas.json').read_text(encoding='utf-8')) for k in ['url','negative_url']}
 for lang in ['es','en']:
  pools=collections.defaultdict(list)
  for d in docs:
   if d['language']!=lang:continue
   if d['content_status'] not in ['official_api_body','official_open_dataset_fields'] or d['url'] in seed_urls:
    excluded.append({'id':d['id'],'reason':'not_full_open_source_or_seed_development_example'});continue
   if len(d.get('description',''))<35 or len(d['text'])<180 or '\ufffd' in d['text']:
    excluded.append({'id':d['id'],'reason':'insufficient_or_malformed_source'});continue
   area=topic(d)
   # Family split holds every country/topic bucket together. This is intentionally
   # harder than random query splitting; not a claim of unseen-site validation.
   family=d['jurisdiction']+':'+area
   d.update(topic=area,family_id=family)
   pools[area].append(d)
  for group in pools.values():
   group.sort(key=lambda d:(len(d['title'])>110,digest(d['url'])))
  count=0;seen_titles=set()
  while count<per_language and any(pools.values()):
   for area in sorted(pools):
    if count>=per_language:break
    if not pools[area]:continue
    d=pools[area].pop(0)
    key=norm(d['title'])
    if key in seen_titles:continue
    seen_titles.add(key);selected.append(d);count+=1
 batches=[]
 for lang in ['es','en']:
  language_docs=sorted([d for d in selected if d['language']==lang],key=lambda d:(d['topic'],d['title']))
  for start in range(0,len(language_docs),8):
   batch=language_docs[start:start+8]
   # Only title, description and first complete paragraphs are needed for intent
   # generation; the original full document remains in the corpus with its hash.
   evidence=[]
   for d in batch:
    lines=d['text'].splitlines();kept=[];length=0
    for line in lines:
     if length+len(line)>6000:break
     kept.append(line);length+=len(line)+1
    evidence.append({k:d[k] for k in ['id','title','language','jurisdiction','url','topic','family_id']}|{'text':'\n'.join(kept)})
   batches.append(dict(id=f'{lang}-{start//8:03}',documents=evidence))
 batches.sort(key=lambda batch:(int(batch['id'].split('-')[1]),batch['id']))
 write_json(HERE/'datos/lotes.json',batches)
 write_json(HERE/'datos/seleccion.json',selected)
 report=dict(selected=len(selected),by_language=dict(collections.Counter(d['language'] for d in selected)),
  by_topic=dict(collections.Counter(d['topic'] for d in selected)),batches=len(batches),
  intended_queries_per_document=8,intended_queries=len(selected)*8,
  excluded=len(excluded),selection='deterministic_topic_balanced_not_random_sample',
  generated=False,training=False)
 write_json(HERE/'SELECCION.json',report)
 print(json.dumps(report,indent=2))
if __name__=='__main__':build()
