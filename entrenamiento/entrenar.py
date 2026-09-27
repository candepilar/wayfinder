"""GPU experiment: baseline -> fine-tune -> validation selection -> test once.

Uses short official procedure title/description for retrieval, never a generative
chat model. Full source bodies remain in corpus.jsonl for source verification.
Runtime requires the GPU environment; --check-data runs with Python stdlib only.
"""
import argparse
import collections
import importlib.metadata
import json
from pathlib import Path
import random
import time
import hashlib

MODEL='ibm-granite/granite-embedding-97m-multilingual-r2'
REVISION='835ad14087e140460703cf0fae09f97d469d65c2'

def rows(path):
    return [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines() if line.strip()]

def load_data(folder):
    manifest=json.loads((folder/'manifest.json').read_text(encoding='utf-8'))
    if not manifest['complete']:raise ValueError('Generation/review batches are incomplete')
    for name,expected in manifest['files_sha256'].items():
        if hashlib.sha256((folder/name).read_bytes()).hexdigest()!=expected:raise ValueError('Hash mismatch: '+name)
    corpus={d['id']:d for d in rows(folder/'corpus.jsonl')}
    splits={s:rows(folder/f'{s}.jsonl') for s in ['train','validation','test']}
    if any(not split for split in splits.values()):raise ValueError('An evaluation/training split is empty')
    family_sets=[]
    for name,split in splits.items():
        families={r['family_id'] for r in split}
        if any(families & previous for previous in family_sets):raise ValueError('Family leakage')
        family_sets.append(families)
        for row in split:
            if row['document_id'] not in corpus:raise ValueError('Missing positive source')
            if corpus[row['document_id']]['jurisdiction']!=row['jurisdiction']:raise ValueError('Jurisdiction mismatch')
            if name=='train' and not corpus[row['document_id']].get('eligible_for_training'):raise ValueError('Unapproved training source')
    return corpus,splits,manifest

def document_text(doc):
    return f"Jurisdiction: {doc['jurisdiction']}\n{doc['title']}\n{doc.get('description','')}"

def batches(examples,size,rng):
    groups=collections.defaultdict(list)
    for row in examples:groups[row['document_id']].append(row)
    for group in groups.values():rng.shuffle(group)
    while groups:
        ids=list(groups);rng.shuffle(ids)
        for start in range(0,len(ids),size):
            batch=[groups[i].pop() for i in ids[start:start+size]]
            for i in ids[start:start+size]:
                if not groups[i]:del groups[i]
            if len(batch)>1:yield batch

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--data',type=Path,default=Path('datos/paquete'))
    parser.add_argument('--output',type=Path,default=Path('modelos/experimento-01'))
    parser.add_argument('--epochs',type=int,default=3,choices=[1,2,3])
    parser.add_argument('--batch-size',type=int,default=16)
    parser.add_argument('--check-data',action='store_true')
    args=parser.parse_args()
    corpus,splits,manifest=load_data(args.data)
    if args.check_data:
        print(json.dumps({'checks':'passed','corpus':len(corpus),'splits':{s:len(v) for s,v in splits.items()},'synthetic':True}));return
    if args.output.exists():raise ValueError('Use a fresh output directory to preserve prior experiments')
    import torch
    from sentence_transformers import SentenceTransformer,losses
    if not torch.cuda.is_available():raise RuntimeError('Run training on the GPU machine, not the production VPS')
    args.output.mkdir(parents=True)
    random.seed(42);torch.manual_seed(42);torch.cuda.manual_seed_all(42)
    model=SentenceTransformer(MODEL,revision=REVISION,device='cuda',trust_remote_code=False)
    model.max_seq_length=512
    ids=list(corpus);texts=[document_text(corpus[i]) for i in ids]
    id_index={i:n for n,i in enumerate(ids)}
    truncations=sum(len(model.tokenizer(t,add_special_tokens=True)['input_ids'])>512 for t in texts)
    def evaluate(examples,name):
        model.eval();start=time.perf_counter()
        with torch.no_grad():
            embeddings=model.encode_document(texts,batch_size=32,normalize_embeddings=True,convert_to_tensor=True,show_progress_bar=True)
            queries=model.encode_query([r['query'] for r in examples],batch_size=32,normalize_embeddings=True,convert_to_tensor=True)
            records=[]
            for n,row in enumerate(examples):
                valid=[idx for idx,i in enumerate(ids) if corpus[i]['jurisdiction']==row['jurisdiction']]
                scores=queries[n] @ embeddings[valid].T
                top=torch.topk(scores,k=min(3,len(valid))).indices.tolist()
                predicted=[ids[valid[k]] for k in top]
                direction=row['language']+'->'+row['document_language']
                records.append({'id':row['id'],'direction':direction,'hit1':predicted[0]==row['document_id'],
                    'hit3':row['document_id'] in predicted,'predicted':predicted,'expected':row['document_id']})
            del embeddings,queries
        groups={k:[r for r in records if r['direction']==k] for k in sorted({r['direction'] for r in records})}
        metric=lambda rs:{'n':len(rs),'top1':sum(r['hit1'] for r in rs)/len(rs),'top3':sum(r['hit3'] for r in rs)/len(rs)}
        result={'name':name,'all':metric(records),'directions':{k:metric(v) for k,v in groups.items()},
                'seconds':time.perf_counter()-start,'records':records,
                'limitation':'Synthetic single-positive labels, country-filtered corpus, held-out topics on known source sites.'}
        (args.output/f'{name}.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps({k:v for k,v in result.items() if k!='records'}),flush=True)
        return result
    baseline_validation=evaluate(splits['validation'],'baseline-validation')
    baseline_test=evaluate(splits['test'],'baseline-test')
    best_macro=sum(v['top1'] for v in baseline_validation['directions'].values())/len(baseline_validation['directions'])
    best_epoch=0;best_validation=baseline_validation
    loss=losses.MultipleNegativesRankingLoss(model)
    optimizer=torch.optim.AdamW(model.parameters(),lr=2e-5,weight_decay=0.01)
    best_path=args.output/'best'
    for epoch in range(1,args.epochs+1):
        model.train();losses_seen=[]
        for batch in batches(splits['train'],args.batch_size,random.Random(42+epoch)):
            optimizer.zero_grad(set_to_none=True)
            features=[]
            for values in [[r['query'] for r in batch],[document_text(corpus[r['document_id']]) for r in batch]]:
                features.append({k:v.to('cuda') for k,v in model.tokenize(values).items()})
            value=loss(features,None);value.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(),1.0);optimizer.step()
            losses_seen.append(float(value.detach().cpu()))
        validation=evaluate(splits['validation'],f'epoch-{epoch}-validation')
        macro=sum(v['top1'] for v in validation['directions'].values())/len(validation['directions'])
        # Select only with validation. No direction can drop >2 percentage points
        # relative to baseline; this is an engineering gate, not statistical proof.
        no_regression=all(v['top1']>=baseline_validation['directions'][k]['top1']-0.02 for k,v in validation['directions'].items())
        if macro>best_macro and no_regression:
            best_macro=macro;best_epoch=epoch;best_validation=validation;model.save_pretrained(str(best_path))
        print(json.dumps({'epoch':epoch,'mean_training_loss':sum(losses_seen)/len(losses_seen),'selected':best_epoch}),flush=True)
    final_test=None
    if best_epoch:
        # Release training allocations before loading the selected model.
        del optimizer,loss,model;torch.cuda.empty_cache()
        model=SentenceTransformer(str(best_path),device='cuda');model.max_seq_length=512
        final_test=evaluate(splits['test'],'selected-test')
    test_gate=False
    if final_test:
        original_macro=sum(v['top1'] for v in baseline_test['directions'].values())/len(baseline_test['directions'])
        candidate_macro=sum(v['top1'] for v in final_test['directions'].values())/len(final_test['directions'])
        test_gate=candidate_macro>original_macro and all(v['top1']>=baseline_test['directions'][k]['top1']-0.02 for k,v in final_test['directions'].items())
    report={'model':MODEL,'revision':REVISION,'gpu':torch.cuda.get_device_name(0),'seed':42,
        'peak_vram_allocated_gib':torch.cuda.max_memory_allocated()/1024**3,
        'peak_vram_reserved_gib':torch.cuda.max_memory_reserved()/1024**3,
        'epochs':args.epochs,'batch_size':args.batch_size,'learning_rate':2e-5,'max_seq_length':512,
        'documents_truncated':truncations,'model_input':'official title and description; body used for query review only',
        'selected_epoch':best_epoch,'candidate_saved':bool(best_epoch),'deployed':False,
        'passes_synthetic_test_gate':test_gate,
        'baseline_test':baseline_test['all'],'selected_test':final_test['all'] if final_test else None,
        'dataset_sha256':manifest['files_sha256'],'labels':'synthetic, automatically reviewed, not human gold',
        'versions':{p:importlib.metadata.version(p) for p in ['torch','sentence-transformers','transformers']},
        'next':'Independent citizen queries and VPS latency/memory benchmark required before claiming production quality.'}
    (args.output/'RESULTADO.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,indent=2))

if __name__=='__main__':main()
