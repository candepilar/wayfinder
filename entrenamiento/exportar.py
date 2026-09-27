"""Export reviewed synthetic examples, explicit source groups and auditable counts."""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import re
import unicodedata
from preparar import digest, write_json

HERE=Path(__file__).resolve().parent

def normalized(text):
    text=''.join(c for c in unicodedata.normalize('NFKD',text.casefold()) if not unicodedata.combining(c))
    return ' '.join(re.findall(r'\w+',text))

def partition(doc):
    # Every variant, translation and document in this country/topic family stays together.
    # Explicit held-out topics prevent accidental split changes as examples accumulate.
    if doc['topic'] in ('identity','civil'):return 'test'
    if doc['topic'] in ('housing','environment'):return 'validation'
    return 'train'

def build(allow_partial=False):
    selected=json.loads((HERE/'datos/seleccion.json').read_text(encoding='utf-8'))
    docs={d['id']:d for d in selected}
    batches=json.loads((HERE/'datos/lotes.json').read_text(encoding='utf-8'))
    accepted=[];tasks=[];missing=[];rejected=0
    for batch in batches:
        path=HERE/'datos/bob'/f"{batch['id']}.json"
        # JS JSON.stringify has no spaces and keeps Unicode; match its input hash.
        expected=digest('procedure-query-v2|'+json.dumps(batch,ensure_ascii=False,separators=(',',':')))
        if not path.exists():missing.append(batch['id']);continue
        result=json.loads(path.read_text(encoding='utf-8'))
        if result.get('input_sha256')!=expected or not result.get('review_completed'):
            missing.append(batch['id']);continue
        accepted.extend(result['accepted']);rejected+=len(result['rejected'])
        tasks.append({k:result.get(k) for k in ['id','generation_task','review_task','generation_cost','review_cost']})
    if missing and not allow_partial:raise ValueError(f'Missing or stale batches: {missing}')
    counts=collections.Counter((r['jurisdiction'],normalized(r['query'])) for r in accepted)
    sets=collections.defaultdict(list);discarded=[]
    for row in accepted:
        d=docs[row['document_id']]
        if counts[(row['jurisdiction'],normalized(row['query']))]>1:
            discarded.append({'id':row['id'],'reason':'duplicate_or_ambiguous_query'});continue
        if row['evidence'] not in d['text']:
            discarded.append({'id':row['id'],'reason':'evidence_not_in_full_source'});continue
        if any(marker in row['query'] for marker in ['\ufffd','Ã','Â¿','Â¡']):
            discarded.append({'id':row['id'],'reason':'suspected_encoding_error'});continue
        row={**row,'url':d['url'],'source_sha256':d['source_sha256'],'family_id':d['family_id'],
             'topic':d['topic'],'split':partition(d),'label_quality':'synthetic_auto_reviewed_not_human_gold'}
        sets[row['split']].append(row)
    split_families={k:{r['family_id'] for r in v} for k,v in sets.items()}
    split_docs={k:{r['document_id'] for r in v} for k,v in sets.items()}
    keys=list(sets)
    for i,k in enumerate(keys):
        for other in keys[i+1:]:
            assert not split_families[k]&split_families[other], 'Family leakage'
            assert not split_docs[k]&split_docs[other], 'Document leakage'
    output=HERE/'datos/paquete';output.mkdir(exist_ok=True)
    for split in ['train','validation','test']:
        (output/f'{split}.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in sets[split]),encoding='utf-8')
    # Include all open source candidate pages as distractors. Exclude unlicensed
    # municipal snapshots and sources with missing bodies from this training package.
    corpus=[json.loads(l) for l in (HERE/'datos/corpus-ampliado.jsonl').read_text(encoding='utf-8').splitlines()]
    corpus=[d for d in corpus if d['content_status'] in ['official_api_body','official_open_dataset_fields']]
    training_ids={r['document_id'] for r in sets['train']}
    evaluation_ids={r['document_id'] for split in ['validation','test'] for r in sets[split]}
    for doc in corpus:
        doc['eligible_for_training']=doc['id'] in training_ids
        doc['dataset_role']='training_source' if doc['id'] in training_ids else 'evaluation_source' if doc['id'] in evaluation_ids else 'retrieval_distractor'
    (output/'corpus.jsonl').write_text(''.join(json.dumps(d,ensure_ascii=False)+'\n' for d in corpus),encoding='utf-8')
    report={'complete':not missing,'sources_in_retrieval_corpus':len(corpus),'batches_expected':len(batches),
        'batches_reviewed':len(tasks),'missing_batches':missing,'rejected_in_bob_pipeline':rejected,
        'discarded_in_export':len(discarded),'examples':sum(map(len,sets.values())),
        'documents_with_queries':len({r['document_id'] for v in sets.values() for r in v}),
        'splits':{k:len(v) for k,v in sets.items()},
        'query_languages':dict(collections.Counter(r['query_language'] if 'query_language' in r else r['language'] for v in sets.values() for r in v)),
        'language_directions':dict(collections.Counter(r['language']+'->'+r['document_language'] for v in sets.values() for r in v)),
        'families':{k:sorted(v) for k,v in split_families.items()},
        'tasks':tasks,'quality_status':'synthetic_auto_reviewed_not_human_gold',
        'evaluation_limit':'Heuristic topic-family split on the same source sites; not independent human or unseen-site validation. Semantic overlap between distinct topic labels may remain.',
        'model_trained':False,'discarded':discarded}
    report['files_sha256']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in output.glob('*.jsonl')}
    write_json(output/'manifest.json',report)
    write_json(HERE/'DATOS-PREPARADOS.json',report)
    print(json.dumps({k:v for k,v in report.items() if k not in ['tasks','discarded','files_sha256','families']},indent=2))
    return report

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--parcial',action='store_true');args=p.parse_args()
    build(args.parcial)
