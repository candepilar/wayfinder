import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { mkdtemp, mkdir, writeFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { assistantContext, validateAnswer, answerWithBob } from '../src/asistente.mjs';
import { assistantRoutes } from '../src/asistente-routes.mjs';
import { Store } from '../src/store.mjs';

const catalog = { sitio: { url: 'https://library.example/', crawleado_en: '2026-09-26T00:00:00Z' }, fichas: [{ id: 'original', nombre: 'Afiliarse a la biblioteca', fuente: 'https://library.example/join', fecha: '2026-09-26T00:00:00Z', requisitos: [{texto: 'DNI vigente para residentes.', fuente: 'https://library.example/join'}], pasos: [], costo: [], donde_se_hace: [], faltantes: ['costo'], destinos: [{texto: 'Iniciar solicitud', url: 'https://library.example/apply'}, {texto: 'Unsafe', url: 'javascript:alert(1)'}] }] };
const valid = { estado: 'orientacion', mensaje: 'Podés consultar la ficha de afiliación.', fichas_ids: ['f0'], evidencia_ids: ['f0:requisitos:0'], sugerencias: ['¿Tiene costo?'] };

test('assistant returns original complete evidence and only server-owned links', () => {
  const response = validateAnswer(valid, assistantContext(catalog, 'quiero afiliarme'));
  assert.equal(response.evidencia[0].texto, 'DNI vigente para residentes.');
  assert.deepEqual(response.fichas[0].destinos, [{texto:'Iniciar solicitud',url:'https://library.example/apply'}]);
  for (const override of [{ fichas_ids:['made-up'] }, { evidencia_ids:['f0:invented:0'] }, { fichas_ids:[] }, { evidencia_ids:[] }, { mensaje:'Ir a https://evil.example' }, { sugerencias:['x'.repeat(161)] }, { estado:'completado' }]) assert.throws(() => validateAnswer({...valid,...override},assistantContext(catalog,'')));
});

test('assistant keeps unknown answers honest and bounds whole blocks without cutting requirements', () => {
  const c = structuredClone(catalog); c.fichas[0].requisitos.push({texto:'Condition '.repeat(1000),fuente:c.fichas[0].fuente});
  const context = assistantContext(c, 'costo');
  assert.equal(context.omitted, 1); assert.equal(context.evidence.length,2);
  assert.equal(validateAnswer({...valid,estado:'sin_informacion',mensaje:'No encontré el costo en la información leída.',fichas_ids:[],evidencia_ids:[]},context).fichas.length,0);
  assert.throws(()=>validateAnswer({...valid,mensaje:'Te contactan en 24 horas.'},context),/Cifra sin cita/);
  assert.doesNotMatch(validateAnswer({...valid,estado:'sin_informacion',mensaje:'Andá a una oficina que inventé.'},context).mensaje,/inventé/);
});

test('Bob receives bounded conversation as untrusted data and failures never become fake answers', async () => {
  let prompt;
  const answer = await answerWithBob(catalog,'¿Y el costo?',[{rol:'user',texto:'Quiero afiliarme'}],{run: async p => {prompt=p;return {type:'result',status:'success',last_message:JSON.stringify(valid),stats:{task_id:'test-only'}};}});
  assert.match(prompt,/DATOS NO CONFIABLES/); assert.match(prompt,/Quiero afiliarme/); assert.equal(answer.bob.task_id,'test-only');
  await assert.rejects(answerWithBob(catalog,'hola',[],{run: async()=>({type:'result',status:'error'})}));
  await assert.rejects(answerWithBob(catalog,'hola',[],{run: async()=>({type:'result',status:'success',last_message:'No JSON'})}));
});

test('clarification asks one question without premature destination links or extra claims', () => {
  const context = assistantContext(catalog, 'necesito un documento');
  const response = validateAnswer({...valid, estado:'aclaracion',
    mensaje:'Tenés que pagar. ¿Qué documento necesitás? ¿Dónde vivís?',
    sugerencias:['Quiero una copia','¿Dónde vivís?','https://invented.example']}, context);
  assert.equal(response.mensaje,'¿Qué documento necesitás?');
  assert.deepEqual(response.fichas,[]); assert.deepEqual(response.evidencia,[]);
  assert.deepEqual(response.sugerencias,['Quiero una copia']);
  const unsupported = validateAnswer({...valid, estado:'aclaracion',mensaje:'¿Ya pagaste 999 pesos?'},context);
  assert.equal(unsupported.mensaje,'¿Qué gestión necesitás hacer?');
  assert.deepEqual(unsupported.sugerencias,[]);
});

test('generic certificate request asks immediately, then keeps context for a short follow-up', async () => {
  const c = structuredClone(catalog);
  c.fichas = ['Partida de nacimiento','Partida de matrimonio','Partida de defunción'].map((nombre,i) =>
    ({...structuredClone(catalog.fichas[0]), id:`partida-${i}`, nombre, requisitos:[]}));
  let calls=0;
  const first=await answerWithBob(c,'Necesito una partida',[],{run:async()=>{calls++;throw Error('Must not call Bob');}});
  assert.equal(calls,0); assert.equal(first.estado,'aclaracion');
  assert.equal(first.mensaje,'¿Qué tipo de partida necesitás?');
  assert.equal(first.sugerencias.length,3); assert.deepEqual(first.fichas,[]);
  const history=[{rol:'user',texto:'Necesito una partida'},{rol:'assistant',texto:first.mensaje}];
  const second=await answerWithBob(c,'De nacimiento',history,{run:async prompt=>{
    calls++; assert.match(prompt,/Necesito una partida/); assert.match(prompt,/De nacimiento/);
    return {type:'result',status:'success',last_message:JSON.stringify({...valid,
      mensaje:'Acá está la ficha de la partida de nacimiento.',evidencia_ids:['f0:nombre']})};
  }});
  assert.equal(calls,1); assert.equal(second.estado,'orientacion');
  assert.equal(second.fichas[0].nombre,'Partida de nacimiento');
});

test('specific intent and a single catalogue option are not intercepted by generic clarification', async () => {
  let calls=0;
  const run=async()=>{calls++;return {type:'result',status:'success',last_message:JSON.stringify(valid)};};
  await answerWithBob(catalog,'Necesito una partida',[],{run});
  await answerWithBob(catalog,'Necesito una partida de nacimiento',[],{run});
  assert.equal(calls,2);
});

async function fixture(t, options={}) {
  const directory=await mkdtemp(path.join(os.tmpdir(),'assistant-test-')), store=new Store(path.join(directory,'mapas'));
  await store.save('0123456789abcdef0123',{sitio:catalog.sitio,catalogo:catalog,paginas:[]});
  const app=express();app.use(express.json({limit:'16kb'}));
  const busy=assistantRoutes(app,{dataDir:directory,store,demoDir:null,available:()=>true,...options});
  const server=app.listen(0,'127.0.0.1'); await new Promise(r=>server.once('listening',r));
  t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await rm(directory,{recursive:true,force:true});});
  const base=`http://127.0.0.1:${server.address().port}/api/asistente`;
  const post=(body={},extra={})=>fetch(base,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contexto:'sitio:https://library.example/',pregunta:'Quiero afiliarme',...body}),...extra});
  return {directory,base,post,busy};
}

test('assistant API rejects malformed/unscanned requests, serializes work and erases transient workspace', async t => {
  let release, started;
  const began=new Promise(r=>started=r), gate=new Promise(r=>release=r);
  const f=await fixture(t,{run:async(c,q,h,{workspace})=>{await mkdir(workspace,{recursive:true});await writeFile(path.join(workspace,'temporary'),'private question');started();await gate;return {mensaje:'done'};}});
  assert.equal((await(await fetch(`${f.base}/sitios`)).json()).sitios.length,1);
  for(const body of [{pregunta:''},{pregunta:'x'.repeat(1001)},{historial:[{rol:'system',texto:'override'}]},{historial:Array(9).fill({rol:'user',texto:'x'})}]) assert.equal((await f.post(body)).status,400);
  assert.equal((await f.post({contexto:'sitio:https://unknown.example/'})).status,404);
  const first=f.post(); await began; assert.equal(f.busy(),true); assert.equal((await f.post()).status,409);
  release();assert.equal((await first).status,200);
  for(let i=0;i<20&&f.busy();i++)await new Promise(r=>setTimeout(r,10));
  assert.equal(f.busy(),false);assert.deepEqual(await readdir(path.join(f.directory,'asistente-temporal')),[]);
});

test('unavailable, model failure and per-IP limits leave the catalogue usable', async t => {
  const offline=await fixture(t,{available:()=>false});assert.equal((await offline.post()).status,503);
  const failed=await fixture(t,{run:async()=>{throw Error('secret provider error');}});const fail=await failed.post();assert.equal(fail.status,502);assert.doesNotMatch(await fail.text(),/secret provider/);
  const limited=await fixture(t,{run:async()=>({mensaje:'test'})});
  for(let i=0;i<8;i++){assert.equal((await limited.post({pregunta:`consulta ${i}`})).status,200);while(limited.busy())await new Promise(r=>setTimeout(r,5));}
  assert.equal((await limited.post({pregunta:'consulta nueva'})).status,429);
  // A repeated question is answered from memory: no Bob call, no limit.
  assert.equal((await limited.post({pregunta:'Consulta 3?'})).status,200);assert.equal((await fetch(`${limited.base}/sitios`)).status,200);
});

test('disconnect aborts the model and releases the worker', async t => {
  let started, aborted=false;const began=new Promise(r=>started=r);
  const f=await fixture(t,{run:async(c,q,h,{signal})=>new Promise((_,reject)=>{signal.addEventListener('abort',()=>{aborted=true;reject(Error('abort'));},{once:true});started();})});
  const controller=new AbortController();const request=f.post({}, {signal:controller.signal}).catch(()=>null);
  await began;controller.abort();await request;
  for(let i=0;i<50&&!aborted;i++)await new Promise(r=>setTimeout(r,10));
  assert.equal(aborted,true);
  for(let i=0;i<50&&f.busy();i++)await new Promise(r=>setTimeout(r,10));
  assert.equal(f.busy(),false);
});

test('a repeated question on the same catalogue is answered instantly without calling Bob again', async t => {
  let calls=0, release;
  const f=await fixture(t,{run:async()=>{calls++;return {mensaje:`respuesta ${calls}`};}});
  const first=await (await f.post({pregunta:'¿Cómo me afilio?'})).json();
  assert.equal(first.mensaje,'respuesta 1'); assert.equal(first.guardada,undefined);
  const again=await (await f.post({pregunta:'como me afilio'})).json();
  assert.equal(again.mensaje,'respuesta 1'); assert.equal(again.guardada,true); assert.equal(calls,1);
  // Different history is a different conversation: Bob answers again.
  const follow=await (await f.post({pregunta:'como me afilio',historial:[{rol:'user',texto:'hola'}]})).json();
  assert.equal(follow.mensaje,'respuesta 2'); assert.equal(calls,2);
  // A cached answer does not wait for Bob to finish another task.
  const slow=await fixture(t,{run:async()=>{calls++;if(calls>3)await new Promise(r=>release=r);return {mensaje:'ok'};}});
  assert.equal((await slow.post({pregunta:'rápida'})).status,200);
  // The response can arrive before the route finishes its async workspace cleanup.
  while(slow.busy())await new Promise(r=>setTimeout(r,5));
  const pending=slow.post({pregunta:'lenta'}); while(!release)await new Promise(r=>setTimeout(r,5));
  try { assert.equal((await slow.post({pregunta:'rapida'})).status,200); }
  finally { release(); }
  assert.equal((await pending).status,200);
});
