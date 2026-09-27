"""Build a provenance-preserving procedure corpus; never starts paid compute."""
import argparse
import collections
import datetime
import hashlib
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]

def digest(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def collect(out):
    out.mkdir(parents=True, exist_ok=True)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    routes = json.loads((ROOT / 'extension/rutas.json').read_text(encoding='utf-8-sig'))
    snapshots = {}
    for path in (ROOT / 'motor/src/municipal-demo').glob('*.json'):
        raw = path.read_text(encoding='utf-8-sig')
        snap = json.loads(raw)
        for page in snap['paginas']:
            snapshots[page['url']] = (page, snap['sitio']['crawleado_en'], str(path.relative_to(ROOT)), digest(raw))
    docs = []
    for site in routes['sitios']:
        for task in site['tramites']:
            page, date, source_file, sha = snapshots[task['ficha']]
            # Use only the task's own source, never requirements borrowed from another page.
            sections = [s['texto'] for s in page.get('municipal', {}).get('secciones', [])
                        if s.get('fuente') == task['ficha'] and s.get('texto')]
            docs.append(dict(id=digest(task['ficha'])[:20], language='es', jurisdiction=site['id'],
                title=task['nombre'], text=task['nombre'] + '\n' + '\n'.join(sections),
                url=task['ficha'], retrieved_at=date, source_file=source_file, source_sha256=sha,
                source_kind='municipal_snapshot', reuse_status='review_required',
                content_status='snapshot_not_revalidated', review_status='pending',
                purpose='procedure_retrieval', eligible_for_training=False))
    api = 'https://www.gov.uk/api/search.json?filter_format=transaction&count=1000&fields=title,link,description'
    request = urllib.request.Request(api, headers={'User-Agent': 'WayfinderResearch/0.1'})
    raw = urllib.request.urlopen(request, timeout=45).read()
    payload = json.loads(raw)
    (out / 'govuk-transactions-source.json').write_bytes(raw)
    for item in payload['results']:
        if not item['link'].startswith('/') or item['link'].startswith('//'):
            raise ValueError('Unexpected GOV.UK path')
        url = 'https://www.gov.uk' + item['link']
        docs.append(dict(id=digest(url)[:20], language='en', jurisdiction='gb',
            title=item['title'], text=item['title'] + '\n' + (item.get('description') or ''),
            url=url, retrieved_at=now, source_file='govuk-transactions-source.json',
            source_sha256=hashlib.sha256(raw).hexdigest(), source_kind='govuk_transaction_metadata',
            reuse_status='OGL-3.0-except-otherwise-stated',
            attribution='Contains public sector information licensed under the Open Government Licence v3.0.',
            content_status='metadata_only_not_full_procedure', review_status='pending',
            purpose='procedure_retrieval', eligible_for_training=False))
    if len({d['url'] for d in docs}) != len(docs):
        raise ValueError('Duplicate URLs')
    for d in docs:
        if '\ufffd' in d['text'] or not d['title'].strip():
            raise ValueError('Invalid source text: ' + d['url'])
    (out / 'corpus.jsonl').write_text(''.join(json.dumps(d, ensure_ascii=False) + '\n' for d in docs), encoding='utf-8')
    report = dict(created_at=now, documents=len(docs), by_language=dict(collections.Counter(d['language'] for d in docs)),
        govuk_total_reported=payload['total'], govuk_downloaded=len(payload['results']),
        full_govuk_transaction_index=len(payload['results']) == payload['total'],
        source_api=api, status='candidate_corpus_not_training_dataset',
        eligible_for_training=sum(d['eligible_for_training'] for d in docs),
        warnings=['GOV.UK transaction filter is not all UK procedures.',
                  'Municipal snapshots may contain stale or incomplete source sections.',
                  'No general web/Wikipedia/commercial FAQ data included.',
                  'Granite has not been downloaded, trained or evaluated.'])
    write_json(out / 'informe.json', report)
    return report

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--salida', type=Path, default=Path(__file__).parent / 'datos')
    args = parser.parse_args()
    print(json.dumps(collect(args.salida), ensure_ascii=True, indent=2))
