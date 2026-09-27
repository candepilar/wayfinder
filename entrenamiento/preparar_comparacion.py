"""Build a small data/code handoff; reuse the existing candidate tar separately."""
import hashlib
import json
from pathlib import Path
import tarfile
import zipfile

HERE = Path(__file__).resolve().parent


def main():
    target = HERE/'datos/comparacion-v2'
    target.mkdir(exist_ok=False)
    with zipfile.ZipFile(HERE/'datos/resultado-piloto-4108.zip') as archive:
        (target/'corpus.jsonl').write_bytes(archive.read('piloto-4108/datos/paquete/corpus.jsonl'))
    for source, name in [('evaluacion-v2/casos.jsonl','casos.jsonl'),('comparar_encoder.py','comparar_encoder.py'),
                         ('entrenar.py','entrenar.py'),('requirements-gpu.txt','requirements-gpu.txt')]:
        (target/name).write_bytes((HERE/source).read_bytes())
    digest = hashlib.sha256()
    with tarfile.open(HERE/'datos/piloto-suave.tar.gz','r:gz') as archive:
        with archive.extractfile('modelo-lr5e6/best/model.safetensors') as weights:
            for chunk in iter(lambda: weights.read(1024*1024),b''):
                digest.update(chunk)
    manifest = {'status':'prepared_not_executed','candidate_weights_sha256':digest.hexdigest(),
                'files_sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in target.iterdir()},
                'timeout_seconds':600,'automatic_training':False,'requires_gpu':True}
    (target/'manifest-comparacion.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    destination = HERE/'datos/comparacion-v2.zip'
    with zipfile.ZipFile(destination,'x',zipfile.ZIP_DEFLATED) as archive:
        for p in sorted(target.iterdir()):
            archive.write(p,p.name)
    with zipfile.ZipFile(destination) as archive:
        if archive.testzip() is not None:
            raise ValueError('Corrupt package')
    (HERE/'COMPARACION-PREPARADA.json').write_text(json.dumps({**manifest,'package':str(destination.relative_to(HERE)),
        'bytes':destination.stat().st_size,'sha256':hashlib.sha256(destination.read_bytes()).hexdigest()},indent=2)+'\n',encoding='utf-8')
    print(destination, destination.stat().st_size)


if __name__ == '__main__':
    main()
