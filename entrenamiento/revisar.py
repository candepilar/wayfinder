"""Validate candidate references and render a bilingual review sheet; stdlib only."""
import collections
import json
from pathlib import Path
from preparar import digest, write_json

HERE = Path(__file__).resolve().parent

def build():
    docs = [json.loads(line) for line in (HERE/'datos/corpus.jsonl').read_text(encoding='utf-8').splitlines()]
    by_url = {d['url']: d for d in docs}
    seeds = json.loads((HERE/'semillas.json').read_text(encoding='utf-8'))
    rows, seen = [], set()
    for seed in seeds:
        pos, neg = by_url[seed['url']], by_url[seed['negative_url']]
        assert pos['id'] != neg['id']
        assert pos['jurisdiction'] == neg['jurisdiction'], 'Use a same-jurisdiction negative'
        for lang in ('es', 'en'):
            query = seed[lang].strip()
            assert query and query.casefold() not in seen and '\ufffd' not in query
            seen.add(query.casefold())
            rows.append(dict(id=digest(pos['url']+lang+query)[:20], query=query,
                query_language=lang, document_language=pos['language'], jurisdiction=pos['jurisdiction'],
                positive_id=pos['id'], negative_id=neg['id'], group_id=pos['id'],
                source='Astra-authored synthetic query grounded in official title/metadata',
                review_status='draft_for_semantic_review', split='unassigned',
                eligible_for_training=False))
    (HERE/'datos/ejemplos-candidatos.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows),encoding='utf-8')
    by_id = {d['id']:d for d in docs}
    sheet = ['# Primeros 20 ejemplos de trámites', '',
             'Borrador sintético: fuentes reales, preguntas escritas por Astra. No son conversaciones de ciudadanos.',
             'Revisión estructural aprobada; revisión semántica y autorización de reutilización pendientes donde corresponda.',
             'Estos ejemplos son para desarrollo; no deben convertirse después en el examen final.', '']
    for r in rows:
        p,n=by_id[r['positive_id']],by_id[r['negative_id']]
        sheet.extend([f"## {r['id']} · {r['query_language']} → {r['document_language']}", '',
            f"**Contexto:** {r['jurisdiction']}",f"**La persona dice:** {r['query']}",
            f"**Destino esperado:** [{p['title']}]({p['url']})",
            f"**No confundir con:** [{n['title']}]({n['url']})", ''])
    (HERE/'EJEMPLOS.md').write_text('\n'.join(sheet),encoding='utf-8')
    report=dict(documents=len(docs), candidate_queries=len(rows),
        languages=dict(collections.Counter(r['query_language'] for r in rows)),
        cross_language=sum(r['query_language']!=r['document_language'] for r in rows),
        groups=len(seeds), structural_checks='passed', semantic_quality='not_certified',
        trained=False, model_downloaded=False)
    write_json(HERE/'INFORME.json',report)
    print(json.dumps(report,indent=2))

if __name__ == '__main__':
    build()
