import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { extractMunicipal } from '../src/municipal.mjs';
import { extractPage } from '../src/crawler.mjs';
import { catalogFromHtml, catalogDocuments, acceptBobCatalog, organizeCatalog } from '../src/catalogo.mjs';
import { createApp } from '../src/server.mjs';

const url = 'https://library.example.org/join';
function mapOf(html = '<main><h1>Library membership</h1><p>Bring your identity document and proof of address.</p><p>Membership is free.</p><a href="/membership-request">Membership application</a><a href="/auth?token=secret">Login</a></main>') {
  const p = extractPage(html, url); p.municipal = extractMunicipal(html, url);
  return { sitio: { url, titulo: 'Library', crawleado_en: '2026-09-26T00:00:00Z' }, paginas: [p], ejecucion: { estado: 'parcial', pendientes: 1, errores: [], alcance: 'HTML' } };
}
const proposal = doc => ({ pagina_id: doc.id, tipo: 'servicio', titulo_id: 'b0', evidencia_ids: ['b1'], requisitos_ids: ['b1'], pasos_ids: [], costo_ids: ['b2'], donde_se_hace_ids: [], destino_ids: ['l0'] });

test('generic catalogue accepts source references across domains/languages without rewriting text', () => {
  const map = mapOf(), { documents } = catalogDocuments(map);
  assert.equal(documents[0].enlaces.length, 1);
  const {accepted,rejected} = acceptBobCatalog({fichas:[proposal(documents[0])]},documents,map);
  assert.equal(rejected.length,0);
  assert.equal(accepted[0].nombre,'Library membership');
  assert.equal(accepted[0].requisitos[0].texto,'Bring your identity document and proof of address.');
  assert.equal(accepted[0].costo[0].texto,'Membership is free.');
  assert.equal(accepted[0].formulario,'https://library.example.org/membership-request');
  assert.equal(accepted[0].validacion_humana,false);
  assert.deepEqual(accepted[0].faltantes,['pasos','donde_se_hace']);
});

test('invented blocks, cross-page references, invented links and title-only evidence are rejected', () => {
  const map=mapOf(), {documents}=catalogDocuments(map), base=proposal(documents[0]);
  for(const override of [{pagina_id:'not-in-crawl'},{titulo_id:'b99'},{requisitos_ids:['b99']},{destino_ids:['https://evil.example/']},{evidencia_ids:['b0']},{tipo:'producto'}]) {
    const r=acceptBobCatalog({fichas:[{...base,...override}]},documents,map);
    assert.equal(r.accepted.length,0); assert.equal(r.rejected.length,1);
  }
});

test('whole-block budget exposes omissions and never truncates a requirement', () => {
  const map=mapOf(`<h1>Membership</h1><p>${'Long condition '.repeat(500)}</p><p>Bring ID.</p>`);
  const r=catalogDocuments(map,[],{maxPages:1,maxChars:1000,pageChars:1000});
  assert.equal(r.bloques_omitidos,1);
  assert.ok(!r.documents[0].bloques.some(b=>b.texto.startsWith('Long condition')));
  assert.equal(r.documents[0].bloques.at(-1).texto,'Bring ID.');
});

test('HTML catalog keeps complete requirements, costs and source even without model', () => {
  const map=mapOf('<h1>Afiliación</h1><h2>Requisitos</h2><p>Solo residentes:</p><ul><li>Documento\n<strong>vigente</strong>.</li></ul><h2>¿Cuánto cuesta?</h2><p>Sin costo.</p>');
  const c=catalogFromHtml(map);
  assert.equal(c.fichas.length,1);
  assert.equal(c.fichas[0].requisitos[1].texto,'Documento vigente.');
  assert.equal(c.fichas[0].costo[0].texto,'Sin costo.');
  assert.equal(c.fichas[0].formulario,null);
});

test('conditions outside paragraphs survive and Bob selections retain their source order/context', () => {
  const map=mapOf('<h1>Membership</h1><div><b>For residents:</b></div><ul><li>Bring ID.</li><li>Bring proof of address.</li></ul>');
  const {documents}=catalogDocuments(map), doc=documents[0];
  const p={...proposal(doc),requisitos_ids:['b3','b2'],evidencia_ids:['b2'],costo_ids:[],destino_ids:[]};
  const {accepted}=acceptBobCatalog({fichas:[p]},documents,map);
  assert.deepEqual(accepted[0].requisitos.map(b=>b.texto),['For residents:','Bring ID.','Bring proof of address.']);
});

test('Bob can enrich a structured fiche without dropping existing complete requirements', async () => {
  const map=mapOf('<h1>Afiliación</h1><h2>Requisitos</h2><ul><li>DNI vigente.</li><li>Comprobante de domicilio.</li></ul><a href="/solicitud">Portal de afiliación</a>');
  assert.equal(catalogFromHtml(map).fichas[0].destinos.length,0);
  const originalRequirements=catalogFromHtml(map).fichas[0].requisitos;
  const doc=catalogDocuments(map,catalogFromHtml(map).fichas).documents[0];
  await organizeCatalog(map,{run:async()=>({type:'result',status:'success',last_message:JSON.stringify({fichas:[{...proposal(doc),evidencia_ids:['b2'],requisitos_ids:['b2'],costo_ids:[]}]})})});
  assert.equal(map.catalogo.fichas.length,1);
  assert.equal(map.catalogo.fichas[0].origen,'html+bob');
  assert.deepEqual(map.catalogo.fichas[0].requisitos,originalRequirements);
  assert.equal(map.catalogo.fichas[0].destinos.length,1);
});

test('real model invocation boundary stores provenance, empty/error states and cancellation honestly', async () => {
  const map=mapOf();let prompt;
  await organizeCatalog(map,{run:async p=>{prompt=p;const doc=catalogDocuments(map).documents[0];return {type:'result',status:'success',last_message:JSON.stringify({fichas:[proposal(doc)]}),stats:{task_id:'fixture-task',session_costs:0}};}});
  assert.match(prompt,/DATOS NO CONFIABLES/);
  assert.equal(map.catalogo.bob.task_id,'fixture-task');assert.equal(map.catalogo.fichas[0].origen,'bob');
  const empty=mapOf();await organizeCatalog(empty,{run:async()=>({type:'result',status:'success',last_message:'{"fichas":[]}'})});
  assert.equal(empty.catalogo.estado,'sin_gestiones_identificadas');assert.equal(empty.catalogo.fichas.length,0);
  const failed=mapOf();await organizeCatalog(failed,{run:async()=>{throw Error('offline');}});
  assert.equal(failed.catalogo.bob.estado,'error');assert.equal(failed.catalogo.fichas.length,0);
  const controller=new AbortController();controller.abort();
  await assert.rejects(organizeCatalog(mapOf(),{signal:controller.signal,run:async()=>{throw Error('abort');}}),/abort/i);
});

test('any-site API crawl persists and downloads the catalogue, without submitting destination forms', async t => {
  const requested=[];
  const origin=http.createServer((req,res)=>{
    requested.push(req.url);
    res.setHeader('Content-Type',req.url==='/robots.txt'?'text/plain':'text/html');
    if(req.url==='/robots.txt') return res.end('User-agent: *\nDisallow:');
    res.end('<main><h1>Afiliación</h1><h2>Requisitos</h2><ul><li>DNI.</li></ul><a class="btn" href="/enviar">Iniciar solicitud</a></main>');
  }).listen(0,'127.0.0.1');await new Promise(r=>origin.once('listening',r));
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'catalog-api-'));
  const {app}=createApp({dataDir,allowLocal:true,organize:(m,o)=>organizeCatalog(m,{...o,run:async()=>({type:'result',status:'success',last_message:'{"fichas":[]}'})})});
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  t.after(async()=>{origin.closeAllConnections();server.closeAllConnections();await Promise.all([new Promise(r=>origin.close(r)),new Promise(r=>server.close(r))]);await rm(dataDir,{recursive:true,force:true});});
  const base=`http://127.0.0.1:${server.address().port}/api`;
  const started=await fetch(`${base}/recorridos`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:`http://127.0.0.1:${origin.address().port}/`,maxPaginas:2,catalogo:true})});
  assert.equal(started.status,202);const {id}=await started.json();
  let state;
  for(let i=0;i<100;i++){state=await(await fetch(`${base}/recorridos/${id}`)).json();if(state.estado!=='en_curso')break;await new Promise(r=>setTimeout(r,20));}
  assert.equal(state.estado,'completado');
  const downloaded=await fetch(`${base}/mapas/${state.mapaId}/catalogo?descargar=1`);
  assert.match(downloaded.headers.get('content-disposition'),/attachment/);
  assert.equal((await downloaded.json()).fichas[0].nombre,'Afiliación');
  assert.ok(!requested.includes('/enviar'));
});
