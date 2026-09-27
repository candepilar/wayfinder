"""Append every usable source without changing existing batches or held-out families."""
import collections
import json
from pathlib import Path
from seleccionar import topic
from preparar import write_json

HERE=Path(__file__).resolve().parent

def main():
    data=HERE/'datos'
    docs=[json.loads(l) for l in (data/'corpus-ampliado.jsonl').read_text(encoding='utf-8').splitlines()]
    selected=json.loads((data/'seleccion.json').read_text(encoding='utf-8'))
    batches=json.loads((data/'lotes.json').read_text(encoding='utf-8'))
    existing={d['id'] for d in selected}
    seeds={s[k] for s in json.loads((HERE/'semillas.json').read_text(encoding='utf-8')) for k in ['url','negative_url']}
    additions=[];excluded=[]
    for d in docs:
        if d['id'] in existing:continue
        reason=None
        if d['content_status'] not in ['official_api_body','official_open_dataset_fields']:reason='incomplete_or_reuse_not_verified'
        elif d['url'] in seeds:reason='seed_development_example'
        elif len(d.get('description',''))<35 or len(d['text'])<180 or '\ufffd' in d['text']:reason='insufficient_or_malformed_source'
        if reason:excluded.append({'id':d['id'],'url':d['url'],'reason':reason});continue
        d.update(topic=topic(d),family_id=d['jurisdiction']+':'+topic(d))
        additions.append(d)
    additions.sort(key=lambda d:(d['language'],d['topic'],d['id']))
    first_new=len(batches)
    for start in range(0,len(additions),8):
        evidence=[]
        for d in additions[start:start+8]:
            kept=[];length=0
            for line in d['text'].splitlines():
                if length+len(line)>6000:break
                kept.append(line);length+=len(line)+1
            evidence.append({k:d[k] for k in ['id','title','language','jurisdiction','url','topic','family_id']}|{'text':'\n'.join(kept)})
        batches.append({'id':f'full-{len(batches):04}','documents':evidence})
    selected.extend(additions)
    write_json(data/'seleccion.json',selected);write_json(data/'lotes.json',batches)
    report={'selected':len(selected),'new_documents':len(additions),'first_new_batch_index':first_new,
        'batches':len(batches),'intended_queries':len(selected)*8,
        'by_language':dict(collections.Counter(d['language'] for d in selected)),
        'by_topic':dict(collections.Counter(d['topic'] for d in selected)),
        'excluded':excluded,'status':'expanded_queue_not_reviewed_yet',
        'previous_prepared_package':'2482 queries remains intact until full export succeeds',
        'evaluation_note':'Original topic partitions preserved. Expanded held-out topics are synthetic evaluation, not human or unseen-site evidence.'}
    write_json(HERE/'COBERTURA-AMPLIADA.json',report)
    print(json.dumps({k:v for k,v in report.items() if k!='excluded'},indent=2))

if __name__=='__main__':main()
