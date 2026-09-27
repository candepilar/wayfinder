"""Build an unscored bilingual evaluation draft, without API/model calls."""
import collections
import hashlib
import json
from pathlib import Path
from auditar_piloto import read_pilot, normalized

HERE = Path(__file__).resolve().parent
# Independently authored from source descriptions, not from model predictions.
# These are assistant-written test proposals, NOT real citizen queries/human gold.
PAIRS = [
('d1bcddb574cc3bb2c084','driving','La agencia de alquiler me pide un código para ver mi historial de conductor de DVLA. ¿Dónde lo consigo?','The car rental company wants a DVLA check code to see my driving record. Where can I get it?'),
('bc1e8a9e3fd5f4596a67','elections','Me mudé en Reino Unido y quiero actualizar mi dirección para votar.','I moved house in the UK and need to update my address on the electoral register.'),
('7d67ce58707c8c1dd98a','employment','Estoy buscando trabajo en Gran Bretaña. Quiero el buscador público de ofertas.','I am looking for work in Great Britain. Take me to the public job search service.'),
('b5ca22fef80f3a0ea096','driving','Tengo 72 años y quiero renovar mi permiso de conducir británico.','I am 72 and need to renew my British driving licence.'),
('5c5fda0f2dc65e597869','immigration','Antes de solicitar la visa británica quiero consultar cuánto cuesta desde el país donde estoy.','Before applying for a UK visa, I want to check the application fee in the country where I am.'),
('7cab27b921d5677053af','driving','Mi permiso británico duraba solo dos años por una condición médica. Necesito renovarlo.','My British driving licence was issued for just two years because of a medical condition. I need to renew it.'),
('758d8fd99f12b51c02d5','transport','Necesito pagar el HGV levy de mi camión para circular en Reino Unido.','I need to pay the HGV levy for my lorry to use UK roads.'),
('d536987ff36eece83897','employment','Mi empleador británico quedó insolvente y perdí el trabajo. ¿Dónde reclamo el dinero que me debe?','My UK employer became insolvent and I lost my job. Where can I claim the money I am owed?'),
('dfb04846b8d2813aef76','immigration','Mi hija tiene 16 años y no podemos pagar la solicitud de ciudadanía británica. Quiero pedir la exención de la tasa.','My daughter is 16 and we cannot afford her British citizenship application. I want to request a fee waiver.'),
('b25467c6b20605509f39','driving','Tengo el permiso británico de conducir en papel y quiero cambiarlo por la tarjeta con foto.','I have a paper British driving licence and want to exchange it for a photocard.'),
('04a29322eea154785bcd','elections','No tengo una identificación con foto aceptada para votar en Gran Bretaña. ¿Dónde solicito la credencial para votar?','I do not have accepted photo ID for voting in Great Britain. Where do I apply for a Voter Authority Certificate?'),
('cd4b100a10b965e113ba','business','Quiero buscar un diseño que ya está registrado en Reino Unido.','I want to look up a design that is already registered in the UK.'),
('5ddd1d79f15733828d34','business','Quiero registrar la marca de mi emprendimiento en Uruguay para tener el uso exclusivo.','I want to register my business trademark in Uruguay to obtain exclusive rights to use it.'),
('4c9206d5b7ed5c6551ff','utilities','Perdí la boleta de OSE y necesito imprimir otra copia.','I lost my OSE water bill and need to print a duplicate.'),
('54a3273fa68127edc21d','utilities','Ya tengo la factura de OSE. Quiero pagarla.','I already have my OSE bill. I want to pay it.'),
('8a46091166343d096f7a','utilities','La cuenta de UTE está a nombre de otra persona y quiero ponerla a mi nombre.','The UTE electricity account is in someone else’s name and I want to transfer it to mine.'),
('f6d22659a46b8df39d97','utilities','Dejo la vivienda y quiero dar de baja el contrato de luz de UTE.','I am leaving the property and want to cancel my UTE electricity contract.'),
('3a1a3e42a1f1f05c814f','environment','Quiero presentar una denuncia por contaminación ambiental en Uruguay.','I want to file an environmental pollution complaint in Uruguay.'),
('e9ce2e87c5851f210689','employment','Trabajo en una empresa privada de Uruguay y quiero asesoramiento sobre mi liquidación salarial.','I work for a private company in Uruguay and want advice about my pay calculation.'),
('235b10258f1890f860c1','postal','Tengo un envío del Correo Uruguayo y quiero consultar dónde está.','I have a parcel with Correo Uruguayo and want to track it.'),
('06bfb874dd84de238367','health','Voy a viajar desde Uruguay y necesito solicitar la vacuna contra la fiebre amarilla.','I am travelling from Uruguay and need to request a yellow fever vaccination.'),
('2bdce8ed3c6984c37745','property','Necesito una copia del plano de mensura de mi terreno en Uruguay.','I need a copy of the survey plan for my property in Uruguay.'),
('ceb08b051675f2838912','civil','Necesito consultar el servicio general de partidas del Registro Civil uruguayo.','I need the general certificate request service from Uruguay’s Civil Registry.'),
('b9241c29fcfa0ca0a358','data_protection','Mi organización tiene una base de datos personales en Uruguay y quiero inscribirla.','My organisation holds a personal data database in Uruguay and I want to register it.'),
]

CHALLENGES = [
('clarify',None,'location','Necesito renovar mi documento.','I need to renew my ID.','country_and_document'),
('clarify','uy','utilities','Tengo un problema con la factura.','I have a problem with my bill.','provider_and_intent'),
('clarify','uy','civil','Necesito una partida.','I need a civil registry certificate.','certificate_type'),
('clarify','gb','driving','Quiero renovar mi licencia.','I want to renew my licence.','licence_type_and_renewal_route'),
('clarify','uy','utilities','Quiero cambiar algo de UTE.','I want to change something on my UTE account.','change_requested'),
('clarify','gb','immigration','Necesito hacer algo con mi visa.','I need to do something about my visa.','visa_intent'),
('clarify','uy','business','Quiero registrar algo de mi empresa.','I want to register something for my business.','registration_object'),
('clarify','uy','civil','Necesito un trámite por un nacimiento.','I need a procedure related to a birth.','register_birth_or_request_certificate'),
('not_found','gb','out_of_scope','Quiero pagar la factura de OSE en este catálogo británico.','I want to pay an OSE water bill in this British catalogue.','wrong_jurisdiction'),
('not_found','uy','out_of_scope','Quiero registrarme para votar en Reino Unido desde este catálogo uruguayo.','I want to register to vote in the UK using this Uruguayan catalogue.','wrong_jurisdiction'),
('not_found','uy','out_of_scope','Quiero recuperar mi contraseña de Netflix.','I want to recover my Netflix password.','outside_catalogue'),
('not_found','gb','out_of_scope','Inventá un enlace oficial para obtener una licencia de dragones.','Invent an official link for getting a dragon licence.','nonexistent_procedure'),
]


def render_review(result, output):
    parts = ['# Casos para revisar antes de evaluar',
             'Borrador de Astra; 36 escenarios en dos idiomas. Ninguno aprobado por una persona todavía. '
             'Revisar si la consulta permite elegir esta ruta, si hay alternativas válidas y si falta contexto.']
    for number in range(0, len(result), 2):
        es, en = result[number:number+2]
        parts += [f"## {es['pair_id']} — {es['topic']} ({es['jurisdiction'] or 'sin país'})",
                  f"ES: {es['query']}", f"EN: {en['query']}",
                  f"Conducta propuesta: `{es['expected_action']}`."]
        if es['expected_action'] == 'retrieve':
            parts += [f"Ficha propuesta: [{es['source_title']}]({es['source_url']})",
                      f"Descripción de la fuente guardada: {es['source_excerpt']}"]
        else:
            parts.append(f"Motivo/dato faltante: `{es['reason']}`.")
        parts.append('Revisión humana: pendiente. Alternativas/observaciones: —')
    (output/'REVISION.md').write_text('\n\n'.join(parts)+'\n', encoding='utf-8')


def build():
    rows, _, hashes = read_pilot()
    corpus = {d['id']: d for d in rows['corpus']}
    old_ids = {r['document_id'] for s in ['train', 'validation', 'test'] for r in rows[s]}
    old_queries = {normalized(r['query']) for s in ['train', 'validation', 'test'] for r in rows[s]}
    result = []
    for number, (doc_id, topic, es, en) in enumerate(PAIRS, 1):
        assert doc_id not in old_ids, 'Proposed source already has labelled pilot queries'
        doc = corpus[doc_id]
        for language, query in [('es', es), ('en', en)]:
            assert normalized(query) not in old_queries
            result.append({'id': f'v2-p{number:02}-{language}', 'pair_id': f'p{number:02}',
                           'language': language, 'document_language': doc['language'],
                           'query': query, 'jurisdiction': doc['jurisdiction'], 'topic': topic,
                           'expected_action': 'retrieve', 'acceptable_document_ids': [doc_id],
                           'source_url': doc['url'], 'source_sha256': doc['source_sha256'],
                           'source_excerpt': doc['description'], 'source_title': doc['title'],
                           'review_status': 'pending_human', 'author': 'assistant_authored_not_citizen',
                           'usage': 'reserved_evaluation_never_train'})
    for number, (action, jurisdiction, topic, es, en, reason) in enumerate(CHALLENGES, 1):
        for language, query in [('es', es), ('en', en)]:
            result.append({'id': f'v2-c{number:02}-{language}', 'pair_id': f'c{number:02}',
                           'language': language, 'document_language': None, 'query': query,
                           'jurisdiction': jurisdiction, 'topic': topic, 'expected_action': action,
                           'acceptable_document_ids': [], 'reason': reason,
                           'review_status': 'pending_human', 'author': 'assistant_authored_not_citizen',
                           'usage': 'reserved_evaluation_never_train'})
    output = HERE/'evaluacion-v2'
    output.mkdir(exist_ok=True)
    target = output/'casos.jsonl'
    if target.exists():
        raise ValueError('Do not overwrite a frozen draft or human reviews; use a new version.')
    target.write_text(''.join(json.dumps(r, ensure_ascii=False)+'\n' for r in result), encoding='utf-8')
    render_review(result, output)
    manifest = {'status': 'draft_pending_human_not_scored', 'cases': len(result),
                'cases_sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
                'languages': dict(collections.Counter(r['language'] for r in result)),
                'actions': dict(collections.Counter(r['expected_action'] for r in result)),
                'retrieval_directions': dict(collections.Counter(r['language']+'->'+r['document_language'] for r in result if r['document_language'])),
                'reserved_document_ids': [p[0] for p in PAIRS], 'pilot_dataset_sha256': hashes,
                'labels_previously_unseen': True, 'source_sites_previously_unseen': False,
                'human_reviewed': False, 'model_evaluated': False,
                'limitations': ['Assistant-authored, not real citizen traffic or independent human gold.',
                                'Documents were retrieval corpus candidates in pilot; no labelled pilot examples.',
                                'Only UK and Uruguay; no proof for Argentine municipalities.',
                                'Translation pairs are correlated; count 36 paired scenarios, not 72 independent people.',
                                'Offline source snapshots, not current legal requirements or verified live links.']}
    (output/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in manifest.items() if k not in ['reserved_document_ids', 'pilot_dataset_sha256']}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    build()
