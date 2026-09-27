"""GPU-only diagnostic of original versus saved candidate. No training/API calls.

This scores retrieval on the 48 positive v2 cases. Clarification/rejection belong
to the product policy and are explicitly NOT scored by an embedding model.
"""
import argparse
import gc
import hashlib
import json
from pathlib import Path
import time

from entrenar import MODEL, REVISION, document_text


def rows(path):
    return [json.loads(x) for x in path.read_text(encoding='utf-8').splitlines() if x.strip()]


def check_inputs(root):
    manifest = json.loads((root/'manifest-comparacion.json').read_text(encoding='utf-8'))
    for name, digest in manifest['files_sha256'].items():
        if hashlib.sha256((root/name).read_bytes()).hexdigest() != digest:
            raise ValueError('Input hash mismatch: '+name)
    corpus = rows(root/'corpus.jsonl')
    cases = rows(root/'casos.jsonl')
    docs = {d['id']: d for d in corpus}
    if len(docs) != len(corpus) or len({c['id'] for c in cases}) != len(cases):
        raise ValueError('Duplicate IDs')
    for c in cases:
        if c['expected_action'] != 'retrieve':
            continue
        if not c['acceptable_document_ids'] or any(i not in docs or docs[i]['jurisdiction'] != c['jurisdiction'] for i in c['acceptable_document_ids']):
            raise ValueError('Invalid positive label or jurisdiction')
    return corpus, cases, manifest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', type=Path, required=True)
    parser.add_argument('--candidate', type=Path)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--check-data', action='store_true')
    args = parser.parse_args()
    corpus, cases, manifest = check_inputs(args.data)
    positives = [c for c in cases if c['expected_action'] == 'retrieve']
    if args.check_data:
        print(json.dumps({'corpus':len(corpus),'positive_cases':len(positives),'policy_cases_not_scored':len(cases)-len(positives),'hashes':'verified'}))
        return
    if not args.candidate or not args.candidate.is_dir() or not args.output:
        parser.error('Provide the saved candidate directory and a fresh output directory')
    if args.output.exists():
        raise ValueError('Use a fresh output directory; never overwrite evidence')
    import torch
    from sentence_transformers import SentenceTransformer
    if not torch.cuda.is_available():
        raise RuntimeError('GPU required by this launcher; do not run heavy inference on Franco PC/VPS')
    # Verify exact trained weights rather than trusting the folder name.
    weights = args.candidate/'model.safetensors'
    if hashlib.sha256(weights.read_bytes()).hexdigest() != manifest['candidate_weights_sha256']:
        raise ValueError('Candidate weights do not match the verified backup')
    args.output.mkdir(parents=True)
    torch.manual_seed(42)
    reports = {}
    for name, location, kwargs in [('original',MODEL,{'revision':REVISION}), ('candidate',str(args.candidate),{})]:
        started = time.perf_counter()
        torch.cuda.reset_peak_memory_stats()
        model = SentenceTransformer(location, device='cuda', trust_remote_code=False, **kwargs)
        model.max_seq_length = 512
        model.eval()
        with torch.inference_mode():
            embeddings = model.encode_document([document_text(d) for d in corpus],batch_size=16,normalize_embeddings=True,convert_to_tensor=True)
            queries = model.encode_query([c['query'] for c in positives],batch_size=16,normalize_embeddings=True,convert_to_tensor=True)
            records = []
            for c, q in zip(positives, queries):
                allowed = [i for i,d in enumerate(corpus) if d['jurisdiction'] == c['jurisdiction']]
                scores = q @ embeddings[allowed].T
                values, positions = scores.topk(min(3,len(allowed)))
                ranked = [corpus[allowed[i]]['id'] for i in positions.tolist()]
                records.append({'id':c['id'],'query':c['query'],'direction':c['language']+'->'+c['document_language'],
                                'expected':c['acceptable_document_ids'],'predicted':ranked,
                                'scores':values.tolist(),'top1':ranked[0] in c['acceptable_document_ids'],
                                'top3':bool(set(ranked)&set(c['acceptable_document_ids']))})
        def metric(group):
            return {'n':len(group),'top1':sum(r['top1'] for r in group)/len(group),
                    'top3':sum(r['top3'] for r in group)/len(group)}
        report = {'all':metric(records),'directions':{d:metric([r for r in records if r['direction']==d]) for d in sorted({r['direction'] for r in records})},
                  'seconds_including_load':time.perf_counter()-started,'peak_vram_gib':torch.cuda.max_memory_allocated()/1024**3,'records':records}
        (args.output/(name+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        reports[name] = {k:v for k,v in report.items() if k != 'records'}
        del model, embeddings, queries, q, scores, values, positions
        gc.collect();torch.cuda.empty_cache()
    result = {'status':'diagnostic_on_assistant_authored_draft_not_human_gold', 'trained':False,'deployed':False,
              'model':MODEL,'revision':REVISION,'gpu':torch.cuda.get_device_name(0),
              'reports':reports,'input_manifest':manifest,
              'policy_cases_not_scored':len(cases)-len(positives),
              'next':'Review errors; do not select training parameters on these reserved cases. No automatic retraining or deployment.'}
    (args.output/'RESULTADO.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(reports,ensure_ascii=False,indent=2))


if __name__ == '__main__':
    main()
