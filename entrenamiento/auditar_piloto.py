"""Reproduce the pilot error/data audit from backups, with stdlib only.

Never loads model weights, calls an API, or changes the frozen training set.
"""
import collections
import hashlib
import json
from pathlib import Path
import tarfile
import unicodedata
import zipfile

HERE = Path(__file__).resolve().parent


def normalized(text):
    return ' '.join(''.join(c for c in unicodedata.normalize('NFKD', text.casefold())
                            if not unicodedata.combining(c)).split())


def read_pilot():
    with zipfile.ZipFile(HERE/'datos/resultado-piloto-4108.zip') as archive:
        prefix = 'piloto-4108/datos/paquete/'
        raw = {name: archive.read(prefix+name+'.jsonl')
               for name in ['corpus', 'train', 'validation', 'test']}
    rows = {name: [json.loads(line) for line in data.decode().splitlines() if line.strip()]
            for name, data in raw.items()}
    with tarfile.open(HERE/'datos/piloto-suave.tar.gz', 'r:gz') as archive:
        metrics = {name: json.load(archive.extractfile('modelo-lr5e6/'+name+'.json'))
                   for name in ['baseline-test', 'selected-test']}
        report = json.load(archive.extractfile('modelo-lr5e6/RESULTADO.json'))
    hashes = {name: hashlib.sha256(data).hexdigest() for name, data in raw.items()}
    if any(report['dataset_sha256'][name+'.jsonl'] != value for name, value in hashes.items()):
        raise ValueError('Backup data differs from the evaluated experiment')
    return rows, metrics, hashes


def main():
    rows, metrics, hashes = read_pilot()
    corpus = {r['id']: r for r in rows['corpus']}
    queries = {r['id']: r for r in rows['test']}
    baseline = {r['id']: r for r in metrics['baseline-test']['records']}
    candidate = {r['id']: r for r in metrics['selected-test']['records']}
    assert baseline.keys() == candidate.keys() == queries.keys()
    duplicate_queries = collections.defaultdict(list)
    for split in ['train', 'validation', 'test']:
        for r in rows[split]:
            duplicate_queries[(r['jurisdiction'], normalized(r['query']))].append(
                {'split': split, 'id': r['id'], 'document_id': r['document_id']})
    duplicates = [v for v in duplicate_queries.values() if len(v) > 1]
    conflicts = [v for v in duplicates if len({x['document_id'] for x in v}) > 1]
    cross_split = [v for v in duplicates if len({x['split'] for x in v}) > 1]
    titles = collections.defaultdict(list)
    for d in corpus.values():
        titles[(d['jurisdiction'], normalized(d['title']))].append(d['id'])
    title_duplicates = [v for v in titles.values() if len(v) > 1]
    descriptions = collections.defaultdict(list)
    for d in corpus.values():
        descriptions[(d['jurisdiction'], normalized(d.get('description', '')))].append(d['id'])
    description_duplicates = [v for (country, text), v in descriptions.items() if len(v) > 1 and len(text) > 80]
    changes = collections.Counter()
    errors = []
    for key, after in candidate.items():
        before = baseline[key]
        change = ('kept_correct' if after['hit1'] else 'kept_wrong') if before['hit1'] == after['hit1'] else ('improved' if after['hit1'] else 'regressed')
        changes[change] += 1
        if change == 'kept_correct':
            continue
        query = queries[key]
        expected = corpus[after['expected']]
        predicted = corpus[after['predicted'][0]]
        errors.append({'id': key, 'change': change, 'direction': after['direction'],
                       'query': query['query'], 'evidence': query.get('evidence'),
                       'expected': {'id': expected['id'], 'title': expected['title'], 'url': expected['url']},
                       'baseline_top1': corpus[before['predicted'][0]]['title'],
                       'candidate_top1': {'id': predicted['id'], 'title': predicted['title'], 'url': predicted['url']},
                       'expected_in_candidate_top3': after['hit3'],
                       'review_status': 'pending_semantic_review_not_automatically_bad_label'})
    stats = {}
    for split in ['train', 'validation', 'test']:
        group = rows[split]
        stats[split] = {'queries': len(group), 'documents': len({r['document_id'] for r in group}),
                        'directions': dict(collections.Counter(r['language']+'->'+r['document_language'] for r in group)),
                        'topics': dict(collections.Counter(r['topic'] for r in group)),
                        'families': len({r['family_id'] for r in group})}
    report = {'dataset_sha256': hashes, 'splits': stats, 'paired_top1_changes': dict(changes),
              'corpus_by_jurisdiction': dict(collections.Counter(d['jurisdiction'] for d in corpus.values())),
              'duplicate_query_groups': len(duplicates), 'conflicting_query_groups': conflicts,
              'cross_split_query_groups': cross_split,
              'duplicate_title_groups': title_duplicates,
              'shared_description_groups': description_duplicates,
              'missing_descriptions': sum(not d.get('description', '').strip() for d in corpus.values()),
              'baseline_directions': metrics['baseline-test']['directions'],
              'candidate_directions': metrics['selected-test']['directions'],
              'limitations': ['Synthetic single-positive labels; alternative valid procedures need manual adjudication.',
                              'Country restriction was supplied, not inferred; no wrong-country rejection evaluated.',
                              'Test has already been inspected: use for diagnosis, not a fresh final gate.',
                              'No claim of current official requirements or live link verification.']}
    (HERE/'AUDITORIA-PILOTO.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    (HERE/'ERRORES-PILOTO.jsonl').write_text(''.join(json.dumps(r, ensure_ascii=False)+'\n' for r in errors), encoding='utf-8')
    print(json.dumps({k: v for k, v in report.items() if k not in ['duplicate_title_groups', 'conflicting_query_groups', 'cross_split_query_groups']}, ensure_ascii=False, indent=2))
    print('Conflicting query groups:', len(conflicts), 'cross-split:', len(cross_split), 'duplicate titles:', len(title_duplicates))


if __name__ == '__main__':
    main()
