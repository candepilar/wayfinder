"""Build a credential-free, verified GPU handoff from an explicit allowlist."""
import hashlib
import json
from pathlib import Path
import zipfile
from entrenar import load_data, check_reserved

HERE = Path(__file__).resolve().parent

def main():
    _, splits, manifest = load_data(HERE / 'datos/paquete')
    reserved = HERE / 'evaluacion-v2/manifest.json'
    check_reserved(splits, set(json.loads(reserved.read_text(encoding='utf-8'))['reserved_document_ids']))
    files = [HERE / 'datos/paquete' / name for name in
             ['corpus.jsonl', 'train.jsonl', 'validation.jsonl', 'test.jsonl', 'manifest.json']]
    files += [HERE / name for name in ['entrenar.py', 'requirements-gpu.txt', 'RUNPOD.md',
              'README.md', 'FUENTES-RECOPILADAS.json', 'DATOS-PREPARADOS.json', 'SELECCION.json',
              'EXCLUSIONES-REVISION.json']]
    files.append(reserved)
    files.append(HERE/'contrastes.py')
    # Only final generation/review records, never Bob workdirs or credentials.
    files += [HERE / 'datos/bob' / (task['id'] + '.json') for task in manifest['tasks']]
    files += [HERE / name for name in ['COBERTURA-AMPLIADA.json', 'BOB-IDE-ENTRENAMIENTO.md'] if (HERE / name).exists()]
    target = HERE / 'paquete-entrenamiento.zip'
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in files:
            archive.write(path, path.relative_to(HERE).as_posix())
    with zipfile.ZipFile(target) as archive:
        assert archive.testzip() is None
        for name, expected in manifest['files_sha256'].items():
            assert hashlib.sha256(archive.read('datos/paquete/' + name)).hexdigest() == expected
    report = {'file': target.name, 'bytes': target.stat().st_size,
              'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
              'files': len(files), 'examples': manifest['examples'], 'model_weights_included': False}
    (HERE / 'PAQUETE.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    main()
