"""Remote-only resumable generation, verified export, then Granite training."""
import datetime
import json
from pathlib import Path
import subprocess
import sys

HERE=Path(__file__).resolve().parent
def status(stage,**details):
    (HERE/'ESTADO-GPU.json').write_text(json.dumps({'stage':stage,'updated_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),**details},indent=2)+'\n',encoding='utf-8')
def run(name,*args):
    return subprocess.run([sys.executable,str(HERE/name),*args],cwd=HERE).returncode
def main():
    status('generating_and_reviewing_locally_on_gpu',model_trained=False)
    if run('generar_gpu.py','--batch-size','32'):
        status('generation_process_failed',model_trained=False);return 1
    status('checking_complete_export',model_trained=False)
    if run('exportar.py'):
        status('retrying_incomplete_batches',model_trained=False)
        if run('generar_gpu.py','--batch-size','8') or run('exportar.py'):
            status('incomplete_review_needs_attention',model_trained=False);return 1
    if run('entrenar.py','--data','datos/paquete','--check-data'):
        status('data_integrity_failed',model_trained=False);return 1
    if run('empaquetar.py'):
        status('packaging_failed',model_trained=False);return 1
    status('training_and_comparing_embedding',model_trained=False)
    target=HERE/'modelos/experimento-gpu-01'
    if target.exists():
        status('existing_experiment_requires_review',model_trained=False);return 1
    if run('entrenar.py','--data','datos/paquete','--output',str(target)):
        status('training_failed',model_trained=False);return 1
    result=json.loads((target/'RESULTADO.json').read_text(encoding='utf-8'))
    status('experiment_complete_not_deployed',model_trained=True,selected_epoch=result['selected_epoch'],
        passes_synthetic_test_gate=result['passes_synthetic_test_gate'],deployed=False)
    return 0
if __name__=='__main__':sys.exit(main())
