"""Finish the already-running Bob batch job, retry failures once, and verify export.

No model training, purchases, deployment or Git operations. Run in the repo root
while generar-bob.mjs is running. Status stays explicit if review remains incomplete.
"""
import argparse
import datetime
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time

ROOT=Path(__file__).resolve().parent.parent
HERE=ROOT/'entrenamiento'

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--end',type=int,required=True)
    parser.add_argument('--start',type=int,default=40)
    args=parser.parse_args()
    report=HERE/f'datos/bob/run-report-{args.start}-{args.end}.json'
    status=HERE/'ESTADO-AMPLIACION.json'
    def save(stage,**more):
        value={'stage':stage,'updated_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
               'model_trained':False,'deployed':False,**more}
        status.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    save('waiting_for_generation_and_review',batches_expected=args.end)
    deadline=time.monotonic()+8*3600
    while not report.exists():
        if time.monotonic()>deadline:
            save('timeout_incomplete_no_export');return 1
        time.sleep(20)
    results=json.loads(report.read_text(encoding='utf-8'))
    if any(r.get('error') for r in results):
        save('retrying_failed_batches_once')
        retry=subprocess.run(['node','--env-file=motor/.env','entrenamiento/generar-bob.mjs',
                              str(args.end),'4',str(args.start)],cwd=ROOT)
        if retry.returncode:
            save('review_failures_remain_no_export',report=str(report.relative_to(ROOT)));return 1
    original=HERE/'paquete-entrenamiento.zip'
    backup=HERE/'datos/paquete-entrenamiento-inicial.zip'
    if original.exists() and not backup.exists():shutil.copy2(original,backup)
    save('exporting_and_verifying')
    commands=[['exportar.py'],['entrenar.py','--data','entrenamiento/datos/paquete','--check-data'],
              ['diagnostico_bm25.py'],['empaquetar.py']]
    for command in commands:
        process=subprocess.run([sys.executable,'entrenamiento/'+command[0],*command[1:]],cwd=ROOT)
        if process.returncode:
            save('verification_failed',command=command);return 1
    manifest=json.loads((HERE/'DATOS-PREPARADOS.json').read_text(encoding='utf-8'))
    save('expanded_package_verified_not_trained',examples=manifest['examples'],
         documents_with_queries=manifest['documents_with_queries'],splits=manifest['splits'],
         note='Synthetic automatic review only; GPU execution, human evaluation and Bob IDE evidence remain pending.')
    return 0

if __name__=='__main__':sys.exit(main())
