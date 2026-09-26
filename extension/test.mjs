import test from 'node:test';import assert from 'node:assert/strict';
import {publicPage,destination} from './url.mjs';
import {buscar,coincide,objetivoEn,pasoActual,sitioDe,tramiteDe} from './guia.mjs';
import {readFile} from 'node:fs/promises';
test('only public web URLs; strips query and fragment',()=>{
 assert.equal(publicPage('https://example.com/path?token=private#secret'),'https://example.com/path');
 for(const u of ['chrome://extensions','file:///secret','https://u:p@example.com','http://127.0.0.1/','http://localhost/','http://a.local/','http://[::1]/'])assert.throws(()=>publicPage(u));
});
test('handoff goes only to Wayfinder and does not start a job',()=>{
 const u=new URL(destination('https://example.com/a?x=y'));assert.equal(u.origin,'https://andromedaweb.store');assert.equal(u.pathname,'/wayfinder/');assert.equal(u.searchParams.get('sitio'),'https://example.com/a');assert.deepEqual([...u.searchParams.keys()],['sitio']);
});

// La guía, sobre las hojas de ruta reales generadas desde el catálogo del motor.
const rutas=JSON.parse(await readFile(new URL('./rutas.json',import.meta.url),'utf8'));
const FICHA='https://www.rosario.gob.ar/inicio/pagar-tgi';
const SIAT='https://siat.rosario.gob.ar/siat/seg/Login.do?id=14&method=anonimo&url=%2Fgde%2FAdministrarLiqDeuda.do%3Fmethod%3DinicializarContr';
const tgi=()=>tramiteDe(rutas,FICHA).tramite;

test('same page ignores query, trailing slash and www',()=>{
 assert.equal(coincide('https://www.rosario.gob.ar/inicio/pagar-tgi','https://rosario.gob.ar/inicio/pagar-tgi/?utm=x'),true);
 assert.equal(coincide('https://www.rosario.gob.ar/inicio/pagar-tgi','https://www.rosario.gob.ar/inicio/pagar-drei'),false);
 assert.equal(coincide('no es una url',FICHA),false);
});
test('knows the site and the trámite from the open tab',()=>{
 assert.equal(sitioDe(rutas,'https://www.rosario.gob.ar/inicio/cualquier-cosa').nombre,'Rosario');
 assert.equal(sitioDe(rutas,'https://example.com/'),null);
 assert.equal(tgi().nombre,'Pagar TGI');
 assert.equal(tramiteDe(rutas,SIAT+'&otra=cosa').tramite.nombre,'Pagar TGI');
});
test('step follows the page: outside, on the ficha, on the destination',()=>{
 assert.equal(pasoActual(tgi(),'https://www.rosario.gob.ar/inicio/'),0);
 assert.equal(pasoActual(tgi(),FICHA),1);
 assert.equal(pasoActual(tgi(),SIAT),2);
});
test('highlights on the ficha exactly the official links of the next step',()=>{
 const objetivos=objetivoEn(tgi(),FICHA);
 assert.deepEqual(objetivos.map(o=>o.texto),['con Código de gestión','desde ARCA - Trámites tributarios']);
 assert.deepEqual(objetivoEn(tgi(),'https://www.rosario.gob.ar/inicio/'),[]);
});
test('search finds trámites by everyday words, accents optional',()=>{
 const rosario=sitioDe(rutas,FICHA);
 assert.equal(buscar(rosario,'pagar la tgi')[0].nombre,'Pagar TGI');
 assert.ok(buscar(rosario,'boleto estudiantil').some(t=>/medio boleto/i.test(t.nombre)));
 assert.deepEqual(buscar(rosario,'a'),[]);
});
test('every step of every trámite has a destination or an explanation',()=>{
 for(const s of rutas.sitios)for(const t of s.tramites){
  assert.ok(t.ficha.startsWith('https://'),t.nombre);
  for(const p of t.pasos)assert.ok(p.url||p.opciones?.length||p.detalle,`${t.nombre}: ${p.titulo}`);
 }
});
