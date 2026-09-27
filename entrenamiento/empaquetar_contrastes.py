"""Create a credential-free handoff with frozen pilot data and contrast code."""
import hashlib
import json
from pathlib import Path
import zipfile
from contrastes import load_contrasts

HERE=Path(__file__).resolve().parent


def main():
    with zipfile.ZipFile(HERE/'datos/resultado-piloto-4108.zip') as source:
        frozen={name:source.read('piloto-4108/datos/paquete/'+name) for name in
                ['corpus.jsonl','train.jsonl','validation.jsonl','test.jsonl','manifest.json']}
    read=lambda name:[json.loads(s) for s in frozen[name+'.jsonl'].decode().splitlines()]
    corpus={d['id']:d for d in read('corpus')}
    reserved=json.loads((HERE/'evaluacion-v2/manifest.json').read_text(encoding='utf-8'))
    rows,_=load_contrasts(HERE/'contrastes-v1',corpus,{s:read(s) for s in ['train','validation','test']},set(reserved['reserved_document_ids']))
    files={f'datos/paquete/{name}':data for name,data in frozen.items()}
    for name in ['entrenar.py','contrastes.py','requirements-gpu.txt','evaluacion-v2/manifest.json',
                 'contrastes-v1/train-contrastes.jsonl','contrastes-v1/aclaraciones.jsonl',
                 'contrastes-v1/manifest.json','contrastes-v1/README.md']:
        files[name]=(HERE/name).read_bytes()
    target=HERE/'datos/experimento-contrastes-v1.zip'
    with zipfile.ZipFile(target,'x',zipfile.ZIP_DEFLATED) as archive:
        for name,data in files.items():archive.writestr(name,data)
    with zipfile.ZipFile(target) as archive:
        if archive.testzip() is not None:raise ValueError('Corrupt handoff')
    report={'status':'prepared_not_trained','package':str(target.relative_to(HERE)),
            'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),
            'files_sha256':{name:hashlib.sha256(data).hexdigest() for name,data in files.items()},
            'contrast_queries':len(rows),'gpu_integration_tested':False,'model_weights_included':False}
    (HERE/'CONTRASTES-PREPARADOS.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='files_sha256'},indent=2))


if __name__=='__main__':main()
