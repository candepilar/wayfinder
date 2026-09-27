"""Lightweight lexical retrieval diagnostic; NOT the existing extension's baseline."""
import collections
import heapq
import json
import math
from pathlib import Path
import re
import time
import unicodedata

HERE=Path(__file__).resolve().parent
STOP=set('the a an of to for in on is are i my how do can what and with me el la los las de del al en por para un una como que mi mis y con puedo quiero necesito'.split())
def tokens(text):
    text=''.join(c for c in unicodedata.normalize('NFKD',text.casefold()) if not unicodedata.combining(c))
    return [w for w in re.findall(r'\w+',text) if len(w)>1 and w not in STOP]

def run():
    folder=HERE/'datos/paquete'
    docs=[json.loads(l) for l in (folder/'corpus.jsonl').read_text(encoding='utf-8').splitlines()]
    index=collections.defaultdict(list);lengths=[]
    for n,doc in enumerate(docs):
        counter=collections.Counter(tokens(doc['title']+' '+doc.get('description','')))
        lengths.append(sum(counter.values()))
        for word,tf in counter.items():index[word].append((n,tf))
    avg=sum(lengths)/len(lengths);report={}
    for split in ['train','validation','test']:
        queries=[json.loads(l) for l in (folder/f'{split}.jsonl').read_text(encoding='utf-8').splitlines()]
        if not queries:continue
        start=time.perf_counter();groups=collections.defaultdict(list);details=[]
        for row in queries:
            scores=collections.defaultdict(float)
            for word in set(tokens(row['query'])):
                postings=index.get(word,[]);idf=math.log(1+(len(docs)-len(postings)+0.5)/(len(postings)+0.5))
                for n,tf in postings:
                    if docs[n]['jurisdiction']!=row['jurisdiction']:continue
                    scores[n]+=idf*tf*2.2/(tf+1.2*(0.25+0.75*lengths[n]/avg))
            best=heapq.nlargest(3,scores,key=scores.get)
            ids=[docs[i]['id'] for i in best]
            result={'id':row['id'],'hit1':bool(ids) and ids[0]==row['document_id'],'hit3':row['document_id'] in ids}
            groups[row['language']+'->'+row['document_language']].append(result);details.append(result)
        metrics=lambda rs:{'n':len(rs),'top1':sum(r['hit1'] for r in rs)/len(rs),'top3':sum(r['hit3'] for r in rs)/len(rs)}
        report[split]={'overall':metrics(details),'directions':{k:metrics(v) for k,v in groups.items()},'seconds':time.perf_counter()-start}
    result={'method':'BM25 k1=1.2 b=0.75, title+description, jurisdiction filter','source_documents':len(docs),
        'not_extension_baseline':True,'not_granite':True,'synthetic_labels':True,'results':report,
        'limits':'No human-gold validation, unseen-site proof or measured citizen task completion. One labeled positive per query.'}
    (HERE/'BM25-DIAGNOSTICO.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps(result,indent=2))
if __name__=='__main__':run()
