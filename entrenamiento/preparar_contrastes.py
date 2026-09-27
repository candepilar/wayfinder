"""Source-grounded bilingual training contrasts. Stdlib only; never uses eval errors."""
import hashlib
import json
from pathlib import Path
import zipfile
from exportar import normalized

HERE = Path(__file__).resolve().parent
# A and B are both already TRAIN documents. Query pairs isolate one distinction.
# Author/reviewer: assistant. Never label these as citizen data or human gold.
PAIRS = [
('practical_booking','73a40e76c84eda2bfff1','480cad64c4c511c8c4c0',
 'No tengo reserva y quiero sacar turno para el examen práctico de conducir en Reino Unido.',
 'I have no booking and want to book my practical driving test in the UK.',
 'Ya reservé el examen práctico de conducir británico y quiero cambiarlo de fecha.',
 'I already booked my practical driving test in the UK and want to move it to another date.',
 'Nueva reserva / modificar una reserva existente',
 'Necesito hacer algo con el turno del examen práctico británico.',
 'I need to do something about a UK practical driving test appointment.',
 '¿Querés reservar un turno o cambiar uno que ya tenés?',
 'Do you want to book a test or change an existing booking?'),
('theory_booking','a9b554ea0bdb85c681ac','36c25017f1670e65e045',
 'Quiero reservar mi examen teórico de conducir en Reino Unido.',
 'I want to book my UK driving theory test.',
 'Ya tengo turno para el examen teórico británico y quiero cancelarlo porque no voy a rendir.',
 'I have a UK theory test booking and want to cancel it because I will not take the test.',
 'Reservar / cancelar',
 'Necesito ayuda con el turno del examen teórico británico.',
 'I need help with a UK theory test appointment.',
 '¿Querés reservar, cambiar o cancelar el turno?',
 'Do you want to book, change or cancel the appointment?'),
('vehicle_tax','7ba39163bea61fa77640','b17cd95e84b05e777909',
 'Quiero pagar el impuesto de circulación de mi vehículo en Reino Unido.',
 'I want to pay my vehicle tax in the UK.',
 'Solo quiero comprobar si un vehículo británico tiene el impuesto al día.',
 'I only want to check whether a UK vehicle has up-to-date vehicle tax.',
 'Pagar / consultar estado',
 'Necesito ver lo del impuesto de mi auto británico.',
 'I need help with my UK vehicle tax.',
 '¿Querés pagarlo o consultar si está al día?',
 'Do you want to pay it or check whether it is up to date?'),
('student_finance','6d88c5b8b4cff0c0b9f3','b91549a55502ff5d00a4',
 'Quiero presentar una solicitud de financiación estudiantil en Reino Unido.',
 'I want to submit a student finance application in the UK.',
 'Ya solicité financiación estudiantil británica y quiero entrar a mi cuenta para ver las fechas de pago.',
 'I already applied for UK student finance and want to sign in to check my payment dates.',
 'Presentar solicitud / consultar cuenta y seguimiento',
 'Necesito ayuda con mi financiación estudiantil británica.',
 'I need help with my UK student finance.',
 '¿Querés solicitarla o consultar una solicitud que ya hiciste?',
 'Do you want to apply or check an application you already made?'),
('company_filing','56aecd72300ef6a8b61b','11fa81bd61543b3cb36a',
 'Tengo que presentar las cuentas anuales de mi empresa en Companies House.',
 'I need to file my company annual accounts with Companies House.',
 'Necesito presentar el confirmation statement con los datos de directores y accionistas en Companies House.',
 'I need to file the confirmation statement with director and shareholder information at Companies House.',
 'Cuentas anuales / declaración de datos societarios',
 'Tengo que hacer la presentación anual de mi empresa en Companies House.',
 'I need to do my annual company filing at Companies House.',
 '¿Necesitás presentar las cuentas anuales o el confirmation statement?',
 'Do you need to file annual accounts or a confirmation statement?'),
('income_tax_period','50f095dc7df20b21711d','ade5c831e84c0ac2079e',
 'Quiero estimar mi Income Tax británico para el ejercicio fiscal actual.',
 'I want to estimate my UK Income Tax for the current tax year.',
 'Quiero estimar cuánto Income Tax británico debía pagar por un ejercicio fiscal anterior.',
 'I want to estimate how much UK Income Tax I should have paid for a previous tax year.',
 'Ejercicio actual / ejercicio anterior',
 'Quiero calcular mi Income Tax británico.',
 'I want to estimate my UK Income Tax.',
 '¿Es para el ejercicio fiscal actual o para uno anterior?',
 'Is this for the current tax year or a previous one?'),
('sas_conversion','35db3ce57a8e0c55833a','3f026efad2cab289b0e9',
 'Quiero transferir solo algunas actividades de mi unipersonal uruguaya a una SAS y conservar las restantes.',
 'I want to transfer only some activities of my Uruguayan sole proprietorship to an SAS and keep the others.',
 'Quiero transferir todas las actividades de mi unipersonal uruguaya a una SAS.',
 'I want to transfer all activities of my Uruguayan sole proprietorship to an SAS.',
 'Transferencia parcial / total',
 'Quiero convertir mi unipersonal uruguaya en una SAS.',
 'I want to convert my Uruguayan sole proprietorship into an SAS.',
 '¿Querés transferir todas las actividades o solo algunas?',
 'Do you want to transfer all activities or only some?'),
('packaging_register','024410b51f2331b5cf4f','3de091f50dbb4d74bbb3',
 'Mi empresa está alcanzada por el régimen uruguayo de envases y debe registrarse por primera vez.',
 'My business is covered by Uruguay’s packaging regime and needs to register for the first time.',
 'Mi empresa ya está registrada en el régimen uruguayo de envases y debe renovar su información anual.',
 'My business is already registered under Uruguay’s packaging regime and needs to renew its annual information.',
 'Primer registro / actualización anual; distinción explícita en títulos',
 'Tengo que hacer el trámite de envases de mi empresa en Uruguay.',
 'I need to complete my business packaging procedure in Uruguay.',
 '¿Es el primer registro o la renovación de la información anual?',
 'Is this the first registration or renewal of annual information?'),
('runaev_local','06b4ba109fd7bfdb1a81','47466361158324654895',
 'Mi empresa ya existe en RUNAEV y quiero solicitar la primera habilitación de un local.',
 'My business already exists in RUNAEV and I want to obtain the initial authorisation for a premises.',
 'Mi local de RUNAEV ya estaba habilitado y necesito extender la habilitación que está por vencer.',
 'My RUNAEV premises was already authorised and I need to extend the authorisation that is about to expire.',
 'Habilitación inicial / extensión de habilitación existente',
 'Necesito la habilitación de mi local en RUNAEV.',
 'I need authorisation for my RUNAEV premises.',
 '¿Es la primera habilitación del local o querés extender una existente?',
 'Is this the first authorisation for the premises or an extension of an existing one?'),
('san_jose_permit','2f984c9c473e55247859','76fffeb8bf0490142a6a',
 'En San José, Uruguay, necesito renovar la viabilidad urbanística de mi local comercial.',
 'In San José, Uruguay, I need to renew the urban planning feasibility approval for my commercial premises.',
 'En San José, Uruguay, necesito renovar la habilitación comercial de mi local.',
 'In San José, Uruguay, I need to renew the commercial operating authorisation for my premises.',
 'Viabilidad urbanística / habilitación comercial',
 'En San José, Uruguay, necesito renovar un permiso de mi comercio.',
 'In San José, Uruguay, I need to renew a permit for my business.',
 '¿Querés renovar la viabilidad urbanística o la habilitación comercial?',
 'Do you want to renew the urban planning approval or the commercial authorisation?'),
]


def validate_contrasts(records, corpus, train_ids, heldout_ids):
    seen = set()
    for r in records:
        if r['id'] in seen: raise ValueError('Duplicate contrast ID')
        seen.add(r['id'])
        positive, negative = r['document_id'], r['negative_document_id']
        if positive == negative: raise ValueError('Positive equals negative')
        if {positive, negative} & heldout_ids or not {positive, negative} <= train_ids:
            raise ValueError('Contrast uses non-training or reserved source')
        for label, doc_id in [('positive',positive),('negative',negative)]:
            doc = corpus[doc_id]
            if doc['jurisdiction'] != r['jurisdiction']: raise ValueError('Country mismatch')
            if r[label+'_source_sha256'] != doc['source_sha256']: raise ValueError('Source changed')
            if r[label+'_evidence'] != doc['title']+'\n'+doc['description']: raise ValueError('Evidence changed')
        if r['language'] not in ['es','en'] or not r['query'].strip(): raise ValueError('Invalid query')


def build():
    with zipfile.ZipFile(HERE/'datos/resultado-piloto-4108.zip') as z:
        prefix='piloto-4108/datos/paquete/'
        raw={n:z.read(prefix+n+'.jsonl') for n in ['corpus','train','validation','test']}
    rows={n:[json.loads(x) for x in b.decode().splitlines()] for n,b in raw.items()}
    corpus={d['id']:d for d in rows['corpus']}
    train_ids={r['document_id'] for r in rows['train']}
    reserved=json.loads((HERE/'evaluacion-v2/manifest.json').read_text(encoding='utf-8'))
    heldout_ids={r['document_id'] for split in ['validation','test'] for r in rows[split]} | set(reserved['reserved_document_ids'])
    old_queries={normalized(r['query']) for split in ['train','validation','test'] for r in rows[split]}
    records, policy = [], []
    for group,a,b,a_es,a_en,b_es,b_en,reason,amb_es,amb_en,ask_es,ask_en in PAIRS:
        for positive,negative,es,en in [(a,b,a_es,a_en),(b,a,b_es,b_en)]:
            for language,query in [('es',es),('en',en)]:
                if normalized(query) in old_queries: raise ValueError('Query already in pilot')
                doc,other=corpus[positive],corpus[negative]
                records.append({'id':f'contrast-{group}-{positive}-{language}','group_id':group,
                    'query':query,'language':language,'document_language':doc['language'],
                    'document_id':positive,'negative_document_id':negative,'jurisdiction':doc['jurisdiction'],
                    'distinction':reason,'split':'train','label_quality':'assistant_authored_source_checked_not_human_gold',
                    'positive_evidence':doc['title']+'\n'+doc['description'],
                    'negative_evidence':other['title']+'\n'+other['description'],
                    'positive_url':doc['url'],'negative_url':other['url'],
                    'positive_source_sha256':doc['source_sha256'],'negative_source_sha256':other['source_sha256']})
        for language,query,question in [('es',amb_es,ask_es),('en',amb_en,ask_en)]:
            policy.append({'id':f'clarify-{group}-{language}','query':query,'language':language,
                'jurisdiction':corpus[a]['jurisdiction'],'expected_action':'clarify','question':question,
                'reason':reason,'usage':'conversation_development_only_not_encoder_training',
                'possible_document_ids':[a,b],'alternatives_exhaustive':False,
                'label_quality':'assistant_authored_source_checked_not_human_gold'})
    validate_contrasts(records,corpus,train_ids,heldout_ids)
    out=HERE/'contrastes-v1';out.mkdir(exist_ok=False)
    for filename,items in [('train-contrastes.jsonl',records),('aclaraciones.jsonl',policy)]:
        (out/filename).write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in items),encoding='utf-8')
    report={'status':'prepared_not_trained','pairs':len(PAIRS),'contrast_queries':len(records),
        'languages':{'es':20,'en':20},'source_documents':len({r['document_id'] for r in records}),
        'clarification_cases_separate':len(policy),'heldout_overlap':0,
        'training_input_hashes':{n:hashlib.sha256(b).hexdigest() for n,b in raw.items()},
        'files_sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in out.iterdir()},
        'quarantined_pairs':[
            {'documents':['792df83fc8a11ce70842','65c2adea04c99a204940'],'reason':'Fishery modification description also describes obtaining authorisation; insufficient distinct context.'},
            {'documents':['24c6cff4b5909fd0ddb9','0feb39e64bbf15e49f3b'],'reason':'Retired and disabled categories can overlap; avoid claiming mutual exclusion without eligibility review.'}],
        'limits':['Assistant-authored; not human-reviewed or citizen traffic.',
                  'Negative is less suitable for this explicit query, not globally irrelevant.',
                  'No inference, new training, live legal verification or improvement claim.']}
    (out/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    lines=['# Contrastes de entrenamiento — revisión de fuentes','40 consultas ES/EN, 10 pares, solo fichas del entrenamiento. No son examen ni datos humanos.']
    for r in records:
        lines += [f"## {r['id']}",r['query'],f"Preferir: [{corpus[r['document_id']]['title']}]({r['positive_url']})",
                  f"Distinguir de: [{corpus[r['negative_document_id']]['title']}]({r['negative_url']})",r['distinction']]
    (out/'REVISION.md').write_text('\n\n'.join(lines)+'\n',encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))


if __name__=='__main__':build()
