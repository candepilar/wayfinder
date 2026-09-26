import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import os from 'node:os';
import { prepareFiles, validateFindings, auditCode } from '../src/codigo.mjs';
import { codeRoutes } from '../src/codigo-routes.mjs';
const files = [{ ruta:'src/demo.js', contenido:'const name = request.query.name;\neval(name);' }];
const finding = { archivo:'src/demo.js', linea:2, fin:2, evidencia:'eval(name);', severidad:'alta', categoria:'seguridad', titulo:'Ejecución de entrada no confiable', riesgo:'Una entrada controlada por el usuario puede ejecutarse.' };
test('source input excludes traversal, secrets, dependencies, duplicates and oversized input', () => {
 for(const ruta of ['../x.js','/x.js','x\\y.js','.env','node_modules/x.js','secret.json']) assert.throws(()=>prepareFiles([{ruta,contenido:'a'}]));
 assert.throws(()=>prepareFiles([...files,...files]));
 assert.throws(()=>prepareFiles([{ruta:'x.js',contenido:'a'.repeat(60001)}]));
 assert.throws(()=>prepareFiles([{ruta:'x.js',contenido:'const password = "'+'a'.repeat(20)+'";'}]));
 assert.equal(prepareFiles(files)[0].sha256.length,64);
});
test('invented citations and wrong file/line are discarded; fixes never returned',()=>{
 const result=validateFindings([finding,{...finding,archivo:'other.js'},{...finding,linea:1,fin:1},{...finding,evidencia:'invented();'},{...finding,arreglo:'patch',codigo:'execute'}],prepareFiles(files));
 assert.equal(result.hallazgos.length,2);assert.equal(result.descartados.length,3);assert.equal(result.hallazgos[1].arreglo,undefined);assert.equal(result.hallazgos[1].codigo,undefined);
});
test('linea_fin alias still requires exact source lines and citation',()=>{
 const {fin,...other}=finding;
 assert.equal(validateFindings([{...other,linea_fin:fin}],prepareFiles(files)).hallazgos.length,1);
 assert.equal(validateFindings([{...other,linea_fin:1}],prepareFiles(files)).hallazgos.length,0);
});
test('Bob receives source, not page summaries; model result is evidence checked',async()=>{
 const result=await auditCode(files,{workspace:os.tmpdir(),runner:async prompt=>{
  assert.ok(prompt.includes('eval(name)'));assert.ok(prompt.includes('CÓDIGO FUENTE'));
  return {type:'result',status:'success',streamed:JSON.stringify({hallazgos:[finding]})};
 }});assert.equal(result.hallazgos.length,1);assert.equal(result.archivos[0].ruta,'src/demo.js');
});
test('API rejects malformed input, serializes jobs and returns private result',async t=>{
 const app=express();let release;let entered;const started=new Promise(r=>entered=r);
 const isBusy=codeRoutes(app,{dataDir:os.tmpdir(),busy:()=>false,available:()=>true,run:async()=>{entered();await new Promise(r=>release=r);return {hallazgos:[]};}});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>{server.closeAllConnections();server.close();});
 const url=`http://127.0.0.1:${server.address().port}/api/codigo`;
 const post=archivos=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({archivos})});
 assert.equal((await post([])).status,400);
 const first=post(files);await started;assert.equal(isBusy(),true);assert.equal((await post(files)).status,409);release();assert.equal((await first).status,200);
 for(let i=0;i<100 && isBusy();i++)await new Promise(r=>setTimeout(r,10));
 assert.equal(isBusy(),false);assert.equal((await post(files)).status,429);
});
