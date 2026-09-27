import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../src/server.mjs';
import {crawlMunicipal} from '../src/municipal-crawler.mjs';
import {organizeCatalog} from '../src/catalogo.mjs';

test('extension can find a public catalog; CORS excludes unrelated operations and origins',async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'wf-ext-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 const {app,store}=createApp({dataDir:dir});
 const catalogo={sitio:{url:'https://library.example.org/',crawleado_en:'2026-09-27'},fichas:[]};
 await store.save('a'.repeat(20),{sitio:catalogo.sitio,catalogo});
 const server=app.listen(0,'127.0.0.1'); await new Promise(r=>server.once('listening',r));
 t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r)}));
 const base=`http://127.0.0.1:${server.address().port}/api`;
 const origin='chrome-extension://'+'a'.repeat(32),headers={Origin:origin};
 const response=await fetch(`${base}/extension/catalogo?url=https://www.library.example.org/help`,{headers});
 assert.equal(response.status,200); assert.equal(response.headers.get('access-control-allow-origin'),origin);
 assert.equal((await response.json()).mapaId,'a'.repeat(20));
 const missing=await fetch(`${base}/extension/catalogo?url=https://unknown.example.org/`,{headers});
 assert.equal((await missing.json()).mapaId,null);
 for(const route of ['/mapas','/salud','/codigo']) assert.equal((await fetch(base+route,{headers})).status,403);
 assert.equal((await fetch(`${base}/extension/catalogo?url=invalid`,{headers})).status,400);
 assert.equal((await fetch(`${base}/extension/catalogo?url=https://library.example.org/`,{headers:{Origin:'https://evil.example'}})).status,403);
 assert.equal((await fetch(`${base}/recorridos`,{method:'OPTIONS',headers:{...headers,'Access-Control-Request-Method':'POST'}})).status,204);
 const sites=await fetch(`${base}/asistente/sitios`,{headers});
 assert.equal(sites.status,200); assert.equal(sites.headers.get('access-control-allow-origin'),origin);
 assert.equal((await fetch(`${base}/asistente`,{method:'OPTIONS',headers:{...headers,'Access-Control-Request-Method':'POST'}})).status,204);
 assert.equal((await fetch(`${base}/codigo`,{method:'OPTIONS',headers:{...headers,'Access-Control-Request-Method':'POST'}})).status,403);
});

test('navigation-only discovery reaches service evidence; robots/nofollow remain enforced; JS shell is partial',async t=>{
 const requests=[];
 const pages={
 '/':'<base href="/info/"><header><nav><a href="membership">Membership</a><a href="secret">Help private</a><a rel="nofollow" href="skipped">Help skipped</a></nav></header><main><h1>Library</h1><p>Welcome to our public library.</p></main>',
 '/info/membership':'<main><h1>Library membership</h1><h2>Requisitos</h2><p>Bring your identity document.</p></main>',
 '/shell':'<title>Application</title><app-root></app-root><script src="app.js"></script>',
 };
 const server=http.createServer((req,res)=>{
  requests.push(req.url); if(req.url==='/robots.txt'){res.setHeader('Content-Type','text/plain');return res.end('User-agent: *\nDisallow: /info/secret');}
  res.setHeader('Content-Type','text/html');res.statusCode=pages[req.url]?200:404;res.end(pages[req.url]||'');
 }).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r)}));
 const base=`http://127.0.0.1:${server.address().port}`;
 const map=await crawlMunicipal(base+'/',{allowLocal:true,maxPages:4});
 assert.equal(map.paginas.length,2); assert.equal(map.paginas[1].municipal.tramite.nombre,'Library membership');
 assert.ok(!requests.includes('/info/secret'));assert.ok(!requests.includes('/info/skipped'));
 const shell=await crawlMunicipal(base+'/shell',{allowLocal:true,maxPages:2});
 assert.equal(shell.ejecucion.estado,'parcial');assert.equal(shell.ejecucion.sin_contenido_util.length,1);
 await organizeCatalog(shell,{run:()=>{throw Error('Bob must not run without evidence')}});
 assert.equal(shell.catalogo.bob.estado,'sin_documentos');assert.equal(shell.catalogo.fichas.length,0);
});
