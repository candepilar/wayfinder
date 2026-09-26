import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { crawl, extractPage } from '../src/crawler.mjs';
import { normalizeUrl, isPublicIp, requestText } from '../src/network.mjs';
import { queryMap } from '../src/search.mjs';
import { Store } from '../src/store.mjs';
import { createApp } from '../src/server.mjs';
import { parseBobResult } from '../src/bob.mjs';
import { buildEvidence, verifyFindings } from '../src/seguridad.mjs';

async function fixture(t) {
  const requests = [];
  const pages = {
    '/': '<title>Biblioteca de prueba</title><main><h1>Biblioteca</h1><a href="/socios">Socios</a><a href="/horarios">Horarios</a><a href="/privado">Privado</a><a href="/error">Error</a><a href="/socios#turno">Otra vez</a></main>',
    '/socios': '<title>Asociate a la biblioteca</title><main><h1>Requisitos para asociarse</h1><p>Para asociarte necesitás DNI y comprobante de domicilio. Solicitá un turno en recepción.</p><form action="/enviar" method="post"><label for="doc">Documento</label><input id="doc" name="dni"><button>Solicitar turno</button></form><a href="/">Inicio</a></main>',
    '/horarios': '<title>Horarios</title><main>La biblioteca abre de lunes a viernes de 9 a 18. <a href="/horarios?dia=sabado">Sábado</a></main>',
    '/horarios?dia=sabado': '<title>Horario sábado</title><main>Los sábados atendemos de 10 a 13.</main>',
  };
  const server = http.createServer((req,res) => {
    requests.push(`${req.method} ${req.url}`);
    if (req.url === '/robots.txt') { res.writeHead(200, {'Content-Type':'text/plain'}); return res.end('User-agent: *\nDisallow: /privado'); }
    if (req.url === '/error') { res.writeHead(503, {'Content-Type':'text/html'}); return res.end('error'); }
    res.writeHead(pages[req.url] ? 200 : 404, {'Content-Type':'text/html; charset=utf-8'});
    res.end(pages[req.url] || 'no existe');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return { url: `http://127.0.0.1:${server.address().port}/`, requests };
}

test('normalizes URLs without allowing credentials or executable schemes', () => {
  assert.equal(normalizeUrl('example.com/a?utm_source=x&b=2#x'), 'https://example.com/a?b=2');
  assert.throws(() => normalizeUrl('javascript:alert(1)', 'https://example.com'));
  assert.throws(() => normalizeUrl('https://user:pass@example.com'));
  for (const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','::1','::ffff:127.0.0.1','192.168.1.1']) assert.equal(isPublicIp(ip), false);
  assert.equal(isPublicIp('1.1.1.1'), true);
});

test('passive scans never request shopping-cart or wishlist action links', async t => {
  const { url, requests } = await fixture(t);
  for (const query of ['add-to-cart=42', 'add_to_wishlist=42', 'remove_item=42', 'empty-cart=1']) {
    await assert.rejects(requestText(`${url}?${query}`, { allowLocal: true }), /omite acciones/);
  }
  assert.deepEqual(requests, []);
  const page = extractPage('<h1>Tienda</h1><a href="/?add-to-cart=42">Comprar</a><a href="/?add_to_wishlist=42">Favorito</a><a href="/producto/42">Ver producto</a>', url);
  assert.deepEqual(page.links, [`${url}producto/42`]);
});

test('public crawler rejects private networks', async t => {
  const f = await fixture(t);
  await assert.rejects(requestText(f.url), /privada/);
});

test('real HTTP crawl obeys robots, deduplicates fragments and extracts forms without submission', async t => {
  const f = await fixture(t);
  const events = [];
  const map = await crawl(f.url, { allowLocal: true, onEvent: e => events.push(e) });
  assert.equal(map.paginas.length, 4);
  assert.equal(map.ejecucion.estado, 'parcial');
  assert.equal(map.ejecucion.errores.length, 1);
  assert.equal(map.ejecucion.omitidas, 1);
  assert.equal(f.requests.some(r => /privado|POST|enviar/.test(r)), false);
  const members = map.paginas.find(p => p.url.endsWith('/socios'));
  assert.deepEqual(members.formularios[0].campos, ['Documento']);
  assert.equal(members.resumen, undefined);
  assert.equal(members.enlaces.length, 1);
  assert.ok(events.some(e => e.type === 'leyendo'));
  assert.ok(map.paginas.find(p => p.url.includes('?')).camino.includes('?dia=sabado'));
  const answer = queryMap(map, '¿Qué necesito para asociarme? DNI domicilio');
  assert.equal(answer.fuentes[0].id, members.id);
  assert.match(answer.respuesta, /comprobante de domicilio/);
  assert.equal(queryMap(map, 'astronauta').fuentes.length, 0);
});

test('page limit is explicit and crawl does not pretend to cover the entire site', async t => {
  const f = await fixture(t);
  const map = await crawl(f.url, { maxPages: 1, allowLocal: true });
  assert.equal(map.paginas.length, 1);
  assert.equal(map.ejecucion.estado, 'parcial');
  assert.ok(map.ejecucion.pendientes > 0);
});

test('extractor removes scripts and never labels HTML as Bob analysis', () => {
  const page = extractPage('<title>T</title><script>secreto()</script><main>Información visible</main>', 'https://example.com/');
  assert.equal(page.texto, 'Información visible');
  assert.equal(page.origen, 'html');
  assert.equal(page.resumen, undefined);
});

test('persisted map survives a new store instance', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'wayfinder-test-'));
  t.after(() => rm(directory, { recursive:true, force:true }));
  const map = { sitio: { url:'https://example.com/', crawleado_en:'2026-09-25T00:00:00Z' }, paginas:[] };
  await new Store(directory).save('0123456789abcdefabcd', map);
  assert.deepEqual(await new Store(directory).get('0123456789abcdefabcd'), map);
  assert.equal(await new Store(directory).get('../../file'), null);
});

test('API creates a real crawl, replays events, persists it and answers with sources', async t => {
  const f = await fixture(t);
  const directory = await mkdtemp(path.join(os.tmpdir(), 'wayfinder-api-'));
  t.after(() => rm(directory, { recursive:true, force:true }));
  const { app } = createApp({ dataDir:directory, allowLocal:true, allowedOrigins:['https://andromedaweb.store'], maxPagesLimit:10, maxMaps:1 });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const start = await fetch(`${base}/api/recorridos`, { method:'POST', headers:{'Content-Type':'application/json',Origin:'https://andromedaweb.store'}, body:JSON.stringify({url:f.url,maxPaginas:10}) });
  assert.equal(start.status, 202);
  const job = await start.json();
  const events = await (await fetch(`${base}/api/recorridos/${job.id}/eventos`)).text();
  assert.match(events, /"type":"completado"/);
  const result = await (await fetch(`${base}/api/recorridos/${job.id}`)).json();
  assert.equal(result.estado, 'completado');
  const maps = await (await fetch(`${base}/api/mapas`)).json();
  assert.equal(maps.length, 1);
  const exported = await fetch(`${base}/api/mapas/${result.mapaId}/archivo`);
  assert.match(exported.headers.get('content-disposition'), /attachment; filename="wayfinder-/);
  assert.equal((await exported.json()).paginas.length, 4);
  const answer = await (await fetch(`${base}/api/mapas/${result.mapaId}/consulta`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pregunta:'horarios sábado'})})).json();
  assert.ok(answer.fuentes.length > 0);
  const forbidden = await fetch(`${base}/api/recorridos`, {method:'POST',headers:{'Content-Type':'application/json',Origin:'https://example.com'},body:JSON.stringify({url:f.url})});
  assert.equal(forbidden.status, 403);
  const tooMany = await fetch(`${base}/api/recorridos`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:f.url,maxPaginas:11})});
  assert.equal(tooMany.status, 400);
  const capacity = await fetch(`${base}/api/recorridos`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:'https://example.com/',maxPaginas:1})});
  assert.equal(capacity.status, 409);
});

test('Bob parser rejects unsuccessful or malformed results', () => {
  assert.throws(() => parseBobResult({ type:'result', status:'error', last_message:'{}' }));
  assert.throws(() => parseBobResult({ type:'result', status:'success', last_message:'hello' }));
  assert.deepEqual(parseBobResult({ type:'result', status:'success', last_message:'```json\n{"paginas":[]}\n```' }), []);
  // Bob Shell 2.x: el result no trae el texto; llega en pedazos por eventos message.
  assert.deepEqual(parseBobResult({ type:'result', status:'success' }, '{"pagi' + 'nas":[{"id":"a"}]}'), [{ id:'a' }]);
});

test('search favors the page about a topic over a broad index mentioning it', () => {
  const map = {paginas:[
    {id:'index',titulo:'Educación',url:'https://example.com/educacion',headings:['Becas','Progresar'],texto:'Becas Progresar y otros programas.'},
    {id:'topic',titulo:'Progresar',url:'https://example.com/progresar',headings:['Requisitos'],texto:'Esta beca acompaña a estudiantes.'},
  ]};
  assert.equal(queryMap(map,'becas Progresar').fuentes[0].id,'topic');
});

test('technical evidence keeps security headers and cookie attributes without cookie values', () => {
  const html = '<title>x</title><script src="http://cdn.example.net/jquery-1.8.3.min.js"></script><script>var a=1</script><form action="http://example.com/login" method="post"><input type="password"></form><a target="_blank" href="/x">x</a>';
  const page = extractPage(html, 'https://example.com/', { server: 'Apache/2.4.29 (Ubuntu)', 'set-cookie': ['PHPSESSID=secreto123; path=/'], 'x-frame-options': 'DENY' });
  const t = page.tecnico;
  assert.equal(t.cabeceras.server, 'Apache/2.4.29 (Ubuntu)');
  assert.deepEqual(t.cabeceras['set-cookie'], ['PHPSESSID; path=/']);
  assert.ok(!JSON.stringify(t).includes('secreto123'));
  assert.ok(t.cabeceras_ausentes.includes('content-security-policy'));
  assert.ok(!t.cabeceras_ausentes.includes('x-frame-options'));
  assert.deepEqual(t.contenido_mixto, ['http://cdn.example.net/jquery-1.8.3.min.js']);
  assert.equal(t.scripts[0].externo, true);
  assert.equal(t.scripts[0].integrity, false);
  assert.equal(t.scripts_en_linea, 1);
  assert.equal(t.blank_sin_noopener, 1);
  assert.deepEqual(t.formularios, [{ accion: 'http://example.com/login', metodo: 'post', con_clave: true }]);
});

test('security findings without literal evidence are discarded', () => {
  const page = extractPage('<title>x</title>', 'https://example.com/', { server: 'nginx/1.18.0' });
  const evidence = buildEvidence({ sitio: { url: 'https://example.com/' }, paginas: [page] }, { http_redirige_a_https: true });
  const { aceptados, descartados } = verifyFindings([
    { titulo: 'Versión del servidor visible', severidad: 'baja', categoria: 'exposicion', paginas: ['https://example.com/', 'https://otro.com/'], evidencia: 'nginx/1.18.0', arreglo: 'server_tokens off;', codigo: 'server_tokens off;' },
    { titulo: 'Falta CSP', severidad: 'media', categoria: 'cabeceras', evidencia: 'Content-Security-Policy' },
    { titulo: 'Inyección SQL en el login', severidad: 'alta', categoria: 'otro', evidencia: "' OR 1=1" },
    { titulo: 'Sin severidad válida', severidad: 'critica', evidencia: 'nginx' },
  ], evidence, new Map([[page.url, page.id]]));
  assert.deepEqual(aceptados.map(h => h.titulo), ['Falta CSP', 'Versión del servidor visible']);
  assert.deepEqual(aceptados[1].paginas, ['https://example.com/']);
  assert.deepEqual(aceptados[1].paginas_ids, [page.id]);
  // Decisión de Franco (26/09): la revisión diagnostica, no devuelve arreglos.
  assert.ok(aceptados.every(h => !('arreglo' in h) && !('codigo' in h)));
  assert.deepEqual(descartados.map(d => d.motivo), ['la evidencia citada no aparece en lo recolectado', 'severidad inválida']);
});
