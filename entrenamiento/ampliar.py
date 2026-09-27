"""Official procedure sources only. Bounded downloads, raw evidence and hashes."""
import collections
import concurrent.futures
import csv
import datetime
import hashlib
from html.parser import HTMLParser
import io
import json
from pathlib import Path
import time
import urllib.parse
import urllib.request
from preparar import digest, write_json

HERE = Path(__file__).resolve().parent
DATA = HERE / 'datos'

class Text(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts=[]
        self.skip=0
    def handle_starttag(self, tag, attrs):
        if tag in ('script','style','svg'): self.skip+=1
        if tag in ('p','li','h1','h2','h3','br','tr'): self.parts.append('\n')
    def handle_endtag(self, tag):
        if tag in ('script','style','svg') and self.skip: self.skip-=1
        if tag in ('p','li','h1','h2','h3','tr'): self.parts.append('\n')
    def handle_data(self,data):
        if not self.skip: self.parts.append(data)

def plain(s):
    parser=Text();parser.feed(s or '')
    return '\n'.join(' '.join(line.split()) for line in ''.join(parser.parts).splitlines() if line.strip())

def download(url,path):
    if path.exists(): return path.read_bytes()
    request=urllib.request.Request(url,headers={'User-Agent':'WayfinderResearch/0.1','Accept':'application/json,text/csv'})
    with urllib.request.urlopen(request,timeout=45) as response:
        data=response.read(30_000_001)
    if len(data)>30_000_000: raise ValueError('Source exceeds 30MB per-file bound')
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_bytes(data)
    return data

def govuk(doc):
    path=DATA/'govuk-content'/f"{doc['id']}.json"
    api='https://www.gov.uk/api/content'+urllib.parse.urlsplit(doc['url']).path
    try:
        raw=download(api,path);page=json.loads(raw);details=page.get('details',{})
        bodies=[details.get('body',''),details.get('introductory_paragraph',''),details.get('more_information','')]
        for part in details.get('parts',[]): bodies.extend([part.get('title',''),part.get('body','')])
        body='\n'.join(plain(s) for s in bodies if isinstance(s,str) and s)
        if len(body)<100: raise ValueError('Insufficient body in Content API')
        doc.update(text=page['title']+'\n'+page.get('description','')+'\n'+body,
            description=page.get('description',''), body=body,
            title=page['title'], document_type=page.get('document_type'),
            source_api=api,source_file=str(path.relative_to(HERE)),source_sha256=hashlib.sha256(raw).hexdigest(),
            content_status='official_api_body',published_at=page.get('public_updated_at'),
            institution=[o.get('title') for o in page.get('links',{}).get('organisations',[])],
            review_status='source_collected_not_semantically_reviewed')
        time.sleep(0.4)
        return doc,None
    except Exception as exc:
        return doc,dict(url=doc['url'],error=str(exc))

def build():
    DATA.mkdir(exist_ok=True)
    docs=[json.loads(line) for line in (DATA/'corpus.jsonl').read_text(encoding='utf-8').splitlines()]
    meta_url='https://catalogodatos.gub.uy/api/3/action/package_show?id=agesic-guia-de-tramites'
    metadata_path=DATA/'uy-package-source.json'
    meta=json.loads(download(meta_url,metadata_path))['result']
    resource=next(r for r in meta['resources'] if r['format']=='CSV')
    raw=download(resource['url'],DATA/'uy-tramites.csv')
    text=raw.decode('utf-8-sig');csv.field_size_limit(2_000_000)
    rows=list(csv.DictReader(io.StringIO(text),dialect=csv.Sniffer().sniff(text[:10000])))
    stamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
    errors=[]
    sections={'requisitos_generales':'Requisitos generales','casuistica':'Casos',
        'internet_requisitos':'Requisitos en línea','internet_como_se_hace':'Cómo hacerlo en línea',
        'persona_requisitos':'Requisitos presenciales','persona_como_se_hace':'Cómo hacerlo presencialmente',
        'telefono_requisitos':'Requisitos telefónicos','telefono_como_se_hace':'Cómo hacerlo por teléfono'}
    for row in rows:
        url=row['url'].strip()
        if urllib.parse.urlsplit(url).hostname!='www.gub.uy' or not row['nombre_tramite'].strip():
            errors.append(dict(url=url,error='Invalid Uruguay title or official source URL'));continue
        description=plain(row['ques_es'])
        body='\n\n'.join(label+'\n'+plain(row[key]) for key,label in sections.items() if row.get(key))
        docs.append(dict(id=digest(url)[:20],language='es',jurisdiction='uy',
            institution=row['institucion_nombre'],title=plain(row['nombre_tramite']),description=description,
            text=plain(row['nombre_tramite'])+'\n'+description+'\n'+body,body=body,
            url=url,retrieved_at=stamp,published_at=row['actualizado'],source_kind='agesic_open_procedures',
            source_id=row['id'],source_file='datos/uy-tramites.csv',source_sha256=hashlib.sha256(raw).hexdigest(),
            source_dataset='https://catalogodatos.gub.uy/dataset/agesic-guia-de-tramites',
            reuse_status=meta['license_id'],license_url=meta['license_url'],
            attribution='AGESIC / Atención a la Ciudadanía. Catálogo de trámites y servicios del Estado. Licencia de Datos Abiertos – Uruguay. Se seleccionaron campos y se normalizó HTML y espacios.',
            content_status='official_open_dataset_fields',review_status='source_collected_not_semantically_reviewed',
            eligible_for_training=False,purpose='procedure_retrieval'))
    english=[d for d in docs if d['language']=='en']
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for number,(doc,error) in enumerate(pool.map(govuk,english),1):
            if error:errors.append(error)
            if number%25==0:print(f'GOV.UK {number}/{len(english)}',flush=True)
    unique={d['url']:d for d in docs}
    if len(unique)!=len(docs):raise ValueError('Duplicate procedure URL across sources')
    for doc in docs:
        doc['text_sha256']=digest(doc['text'])
        if '\ufffd' in doc['text']:errors.append(dict(url=doc['url'],error='Replacement character in source'))
    (DATA/'corpus-ampliado.jsonl').write_text(''.join(json.dumps(d,ensure_ascii=False)+'\n' for d in docs),encoding='utf-8')
    report=dict(created_at=stamp,documents=len(docs),by_language=dict(collections.Counter(d['language'] for d in docs)),
        by_source=dict(collections.Counter(d['source_kind'] for d in docs)),
        content_status=dict(collections.Counter(d['content_status'] for d in docs)),
        uruguay_rows=len(rows),uruguay_resource_updated=resource.get('last_modified'),
        errors=errors,trained=False,quality_status='sources_collected_examples_pending')
    write_json(HERE/'FUENTES-RECOPILADAS.json',report)
    print(json.dumps(report,ensure_ascii=True,indent=2))

if __name__=='__main__':build()
