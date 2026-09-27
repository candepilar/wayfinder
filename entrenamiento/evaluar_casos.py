"""Score saved product predictions; does not run inference or contact services.

Predictions JSONL: id, action (retrieve/clarify/not_found), document_ids (ranked).
For clarify also provide question. Multi-positive gold labels are supported.
"""
import argparse
import hashlib
import json
from pathlib import Path


def score(cases, predictions, corpus, allow_draft=False):
    if not cases:
        raise ValueError('Empty evaluation')
    if not allow_draft and any(c.get('review_status') != 'human_approved' or not c.get('reviewer') for c in cases):
        raise ValueError('Pending human review; --allow-draft is diagnostic only')
    if len({c['id'] for c in cases}) != len(cases):
        raise ValueError('Duplicate case ID')
    if len({p['id'] for p in predictions}) != len(predictions):
        raise ValueError('Duplicate prediction ID')
    if {p['id'] for p in predictions} != {c['id'] for c in cases}:
        raise ValueError('Predictions must cover every case exactly once')
    by_id = {p['id']: p for p in predictions}
    records = []
    for case in cases:
        p = by_id[case['id']]
        ids = p.get('document_ids', [])
        if p.get('action') not in ['retrieve', 'clarify', 'not_found']:
            raise ValueError('Unknown prediction action')
        if not isinstance(ids, list) or any(not isinstance(i, str) for i in ids):
            raise ValueError('document_ids must be a string list')
        invalid = any(i not in corpus or corpus[i]['jurisdiction'] != case['jurisdiction'] for i in ids)
        # With no country selected a concrete route is never a passing answer.
        invalid |= bool(ids) and case['jurisdiction'] is None
        gold = set(case['acceptable_document_ids'])
        if case['expected_action'] == 'retrieve':
            if not gold or any(i not in corpus or corpus[i]['jurisdiction'] != case['jurisdiction'] for i in gold):
                raise ValueError('Invalid gold source or jurisdiction')
            correct = p['action'] == 'retrieve' and bool(ids) and ids[0] in gold and not invalid
            top3 = p['action'] == 'retrieve' and bool(gold.intersection(ids[:3])) and not invalid
        else:
            correct = p['action'] == case['expected_action'] and not ids
            if case['expected_action'] == 'clarify':
                correct &= bool(p.get('question', '').strip())
            top3 = None
        records.append({'id': case['id'], 'correct': bool(correct), 'top3': top3,
                        'invalid_route': bool(invalid), 'language': case['language'],
                        'direction': case['language']+'->'+case['document_language'] if case['document_language'] else None,
                        'expected_action': case['expected_action']})
    def metrics(group):
        return {'n': len(group), 'correct': sum(r['correct'] for r in group),
                'accuracy': sum(r['correct'] for r in group)/len(group)}
    return {'status': 'draft_diagnostic' if allow_draft else 'reviewed_cases_scored_not_production_certification',
            'overall': metrics(records),
            'by_action': {a: metrics([r for r in records if r['expected_action'] == a]) for a in sorted({r['expected_action'] for r in records})},
            'retrieval_by_direction': {d: metrics([r for r in records if r['direction'] == d]) for d in sorted({r['direction'] for r in records if r['direction']})},
            'invalid_routes': sum(r['invalid_route'] for r in records), 'records': records,
            'limitations': ['Clarification relevance needs human scoring; a nonempty question alone is not enough.',
                            'Does not verify live links, latency, memory, requirements or form completion.']}


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--cases', type=Path, required=True)
    p.add_argument('--predictions', type=Path, required=True)
    p.add_argument('--corpus', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--allow-draft', action='store_true')
    args = p.parse_args()
    read = lambda path: [json.loads(s) for s in path.read_text(encoding='utf-8').splitlines() if s.strip()]
    result = score(read(args.cases), read(args.predictions), {d['id']: d for d in read(args.corpus)}, args.allow_draft)
    result['input_sha256'] = {name: hashlib.sha256(getattr(args, name).read_bytes()).hexdigest() for name in ['cases','predictions','corpus']}
    with args.output.open('x', encoding='utf-8') as out:
        json.dump(result, out, ensure_ascii=False, indent=2)
    print(json.dumps({k: v for k, v in result.items() if k != 'records'}, ensure_ascii=False))


if __name__ == '__main__':
    main()
