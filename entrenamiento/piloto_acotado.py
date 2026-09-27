"""Freeze only completed batches and cap a one-epoch GPU experiment at 15 min."""
import datetime
import json
from pathlib import Path
import shutil
import subprocess
import sys
import hashlib
import exportar

HERE=Path(__file__).resolve().parent

def main():
    pilot=HERE/'piloto-4108'
    if pilot.exists():raise RuntimeError('Pilot directory already exists; inspect before retrying')
    (pilot/'datos/bob').mkdir(parents=True)
    for name in ['corpus-ampliado.jsonl','seleccion.json']:
        shutil.copy2(HERE/'datos'/name,pilot/'datos'/name)
    shutil.copy2(HERE/'EXCLUSIONES-REVISION.json',pilot/'EXCLUSIONES-REVISION.json')
    all_batches=json.loads((HERE/'datos/lotes.json').read_text(encoding='utf-8'))
    selected=[]
    for batch in all_batches:
        path=HERE/'datos/bob'/(batch['id']+'.json')
        if not path.exists():continue
        result=json.loads(path.read_text(encoding='utf-8'))
        expected=hashlib.sha256(('procedure-query-v2|'+json.dumps(batch,ensure_ascii=False,separators=(',',':'))).encode()).hexdigest()
        if result.get('review_completed') and result.get('input_sha256')==expected:
            selected.append(batch);shutil.copy2(path,pilot/'datos/bob'/path.name)
    (pilot/'datos/lotes.json').write_text(json.dumps(selected,ensure_ascii=False),encoding='utf-8')
    exportar.HERE=pilot
    report=exportar.build()
    report.update(scope='completed_batches_only_cost_limited_pilot',full_collection_complete=False,
                  full_collection_batches=len(all_batches),pilot_batches=len(selected))
    for path in [pilot/'DATOS-PREPARADOS.json',pilot/'datos/paquete/manifest.json']:
        path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    state=HERE/'ESTADO-GPU.json'
    def status(stage,**extra):
        state.write_text(json.dumps({'stage':stage,'updated_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'pilot_examples':report['examples'],'timeout_seconds':900,'deployed':False,**extra},indent=2)+'\n',encoding='utf-8')
    status('cost_limited_one_epoch_training',model_trained=False)
    command=[sys.executable,str(HERE/'entrenar.py'),'--data',str(pilot/'datos/paquete'),
             '--output',str(pilot/'modelo'),'--epochs','1']
    try:
        result=subprocess.run(command,cwd=HERE,timeout=900)
        if result.returncode:
            status('pilot_failed_no_automatic_retry',model_trained=False);return 1
    except subprocess.TimeoutExpired:
        status('pilot_time_limit_reached_no_automatic_retry',model_trained=False);return 1
    measured=json.loads((pilot/'modelo/RESULTADO.json').read_text(encoding='utf-8'))
    status('pilot_complete_not_deployed',model_trained=True,selected_epoch=measured['selected_epoch'],
           passes_synthetic_test_gate=measured['passes_synthetic_test_gate'])
    return 0

if __name__=='__main__':sys.exit(main())
