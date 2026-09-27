"""Validate optional training contrasts before importing any GPU libraries."""
import hashlib
import json
import unicodedata


def load_contrasts(folder, corpus, splits, reserved_ids):
    manifest=json.loads((folder/'manifest.json').read_text(encoding='utf-8'))
    data=folder/'train-contrastes.jsonl'
    if hashlib.sha256(data.read_bytes()).hexdigest()!=manifest['files_sha256']['train-contrastes.jsonl']:
        raise ValueError('Contrast hash mismatch')
    rows=[json.loads(x) for x in data.read_text(encoding='utf-8').splitlines() if x.strip()]
    if not rows:raise ValueError('Empty contrast set')
    train={r['document_id'] for r in splits['train']}
    held={r['document_id'] for s in ['validation','test'] for r in splits[s]} | set(reserved_ids)
    normalize=lambda s:' '.join(''.join(c for c in unicodedata.normalize('NFKD',s.casefold()) if not unicodedata.combining(c)).split())
    eval_queries={normalize(r['query']) for s in ['validation','test'] for r in splits[s]}
    seen=set()
    for r in rows:
        if r['id'] in seen:raise ValueError('Duplicate contrast ID')
        seen.add(r['id'])
        positive,negative=r['document_id'],r['negative_document_id']
        if positive==negative:raise ValueError('Positive equals negative')
        if not {positive,negative}<=train or {positive,negative}&held:
            raise ValueError('Contrast uses non-training or reserved source')
        if normalize(r['query']) in eval_queries:raise ValueError('Evaluation query leaked into contrasts')
        if r.get('split')!='train' or r.get('language') not in ['es','en'] or not r['query'].strip():
            raise ValueError('Invalid contrast query/split')
        for label,doc_id in [('positive',positive),('negative',negative)]:
            doc=corpus[doc_id]
            if not doc.get('eligible_for_training'):raise ValueError('Unapproved source')
            if doc['jurisdiction']!=r['jurisdiction']:raise ValueError('Country mismatch')
            if r[label+'_source_sha256']!=doc['source_sha256']:raise ValueError('Source changed')
            if r[label+'_evidence']!=doc['title']+'\n'+doc['description']:raise ValueError('Evidence changed')
    return rows,hashlib.sha256(data.read_bytes()).hexdigest()
