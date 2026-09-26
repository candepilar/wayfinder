import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { extractMunicipal, buildCatalog, consultCatalog, municipalities, priorityOf } from '../src/municipal.mjs';
import { crawlMunicipal } from '../src/municipal-crawler.mjs';
import { createApp } from '../src/server.mjs';
import { Store } from '../src/store.mjs';
import { siteId } from '../src/crawler.mjs';
import { fileURLToPath } from 'node:url';

const ficha = (name, extra = '') => `<main><h1>${name}</h1><h2>Requisitos</h2><div><p>DNI vigente.</p><ul><li>Constancia de domicilio.</li></ul></div><h2>Paso a paso</h2><p>Reservá un turno en el portal.</p>${extra}</main>`;
function mapOf(names = ['Primera licencia de conducir', 'Renovación de licencia de conducir']) {
  return { sitio: { url: municipalities.vgg.url, crawleado_en: '2026-09-26T00:00:00Z' },
    ejecucion: { estado: 'parcial', pendientes: 4 },
    paginas: names.map((n, i) => ({ url: `${municipalities.vgg.url}tramite/${i}`, municipal: extractMunicipal(ficha(n, '<a class="btn" href="/gestionar">Iniciar trámite</a>'), `${municipalities.vgg.url}tramite/${i}`) })) };
}

test('municipal extractor confirms evidence without an initial verb; ignores layout and unsafe links', () => {
  const result = extractMunicipal(`<nav><h2>Requisitos</h2>Falso</nav>${ficha('Licencia de conducir', '<a href="javascript:alert(1)">Iniciar</a><a class="btn" href="https://turnos.example.org/">Iniciar trámite</a>')}`, 'https://example.org/ficha');
  assert.equal(result.tramite.nombre, 'Licencia de conducir');
  assert.equal(result.tramite.formulario, 'https://turnos.example.org/');
  assert.equal(result.secciones[0].texto, 'DNI vigente. Constancia de domicilio.');
  assert.ok(!result.secciones.some(s => s.texto.includes('Falso')));
  assert.equal(result.tramite.destinos[0].estado, 'enlazado_no_verificado');
  assert.equal(extractMunicipal('<h1>Denuncias</h1><h2>Requisitos</h2><p>Leé las fichas.</p>', 'https://example.org/').tramite, null);
  assert.equal(extractMunicipal('<h1>Licencia</h1><h2>Requisitos</h2>', 'https://example.org/').tramite, null);
  assert.equal(extractMunicipal('<h1>Inicio</h1><a href="/tramite/1">Licencia</a>', 'https://example.org/').tramite, null);
});

test('pistas only rank; consultation disambiguates then returns the selected official destination', () => {
  assert.ok(priorityOf({ texto: 'Licencia de conducir', url: 'https://example.org/tramite/21/' }) > priorityOf({ texto: 'Inicio', url: 'https://example.org/' }));
  const c = buildCatalog('vgg', mapOf());
  const answer = consultCatalog(c, { pregunta: 'necesito el carnet' });
  assert.equal(answer.estado, 'aclaracion');
  assert.equal(answer.opciones.length, 2);
  const chosen = consultCatalog(c, { pregunta: 'necesito el carnet', opcion: answer.opciones[0].id });
  assert.equal(chosen.estado, 'listo');
  assert.equal(chosen.tramite.formulario, 'https://vggmunicipalidad.gov.ar/gestionar');
  assert.match(chosen.requisitos[0].texto, /DNI/);
  assert.equal(chosen.cobertura.estado, 'parcial');
  assert.throws(() => consultCatalog(c, { pregunta: 'licencia', opcion: 'otra-ciudad' }));
  assert.throws(() => consultCatalog(c, { pregunta: 'licencia', opcion: c.tramites[0].id, destino: 'inventado' }));
});

test('base URLs, nested steps and stable begin links survive without persisting OAuth destinations', () => {
  const r = extractMunicipal('<base href="https://example.org/"><main><h1>Numeración</h1><h2>Paso a paso</h2><h3>Paso 1</h3><p>Reuní documentos.</p><h3>Paso 2</h3><p>Pedí turno.</p><a class="govuk-button" href="inicio/node/1">Comenzar</a><a class="btn" href="/auth?state=temporary">Gestionar</a></main>', 'https://example.org/tramite/5/');
  assert.equal(r.tramite.formulario, 'https://example.org/inicio/node/1');
  assert.match(r.secciones[0].texto, /Paso 2 Pedí turno/);
  assert.equal(r.tramite.destinos.length, 1);
  const separate = extractMunicipal('<h1>Pagar TGI</h1><h2>Documentos a presentar</h2><p>DNI.</p><h3>Cómo realizarlo</h3><p>Acercate a la oficina.</p><h3>Abogados</h3><p>No es un requisito.</p>', 'https://example.org/tgi');
  assert.equal(separate.secciones[0].texto, 'DNI.');
  assert.equal(separate.secciones[1].texto, 'Acercate a la oficina.');
});

test('carnet does not send a driver to an unrelated licence and municipal tax finds TGI', () => {
  const c = buildCatalog('vgg', mapOf(['Solicitar licencia de uso y libre afectación', 'Pagar TGI']));
  assert.equal(consultCatalog(c, { pregunta: 'necesito el carnet' }).estado, 'no_encontrado');
  assert.equal(consultCatalog(c, { pregunta: 'quiero pagar la tasa municipal' }).tramite.nombre, 'Pagar TGI');
});

test('multiple destinations require a choice, absent destination never fabricates a form', () => {
  const map = mapOf(['Pagar TGI']);
  map.paginas[0].municipal = extractMunicipal(ficha('Pagar TGI', '<a class="btn" href="/cuenta">Gestionar con perfil</a><a class="btn" href="/codigo">Gestionar con código</a>'), map.paginas[0].url);
  const c = buildCatalog('vgg', map), answer = consultCatalog(c, { pregunta: 'pagar tgi' });
  assert.equal(answer.estado, 'aclaracion_destino');
  assert.equal(answer.tramite.formulario, null);
  const done = consultCatalog(c, { pregunta: 'pagar tgi', opcion: answer.opcion, destino: answer.opciones[1].id });
  assert.equal(done.estado, 'listo');
  map.paginas[0].municipal = extractMunicipal(ficha('Pagar TGI'), map.paginas[0].url);
  assert.equal(consultCatalog(buildCatalog('vgg', map), { pregunta: 'pagar tgi' }).estado, 'solo_ficha');
});

test('unknown requests return alternatives/contact and unvisited candidates are never confirmed', () => {
  const map = mapOf();
  map.paginas[0].municipal.enlaces.push({ texto: 'Numeración oficial', url: 'https://vggmunicipalidad.gov.ar/tramite/99', encontrado_en: map.paginas[0].url });
  const c = buildCatalog('vgg', map);
  const result = consultCatalog(c, { pregunta: 'numeracion oficial' });
  assert.equal(result.estado, 'no_encontrado');
  assert.equal(result.candidatos_sin_confirmar[0].estado, 'sin_confirmar');
  assert.ok(result.alternativas.length && result.contactos.length);
  assert.equal(result.tramite, undefined);
  assert.throws(() => consultCatalog(c, { pregunta: ' ' }));
});

test('real crawl prioritizes evidence pages, obeys robots and avoids registration loops/actions', async t => {
  const requests = [];
  const pages = {
    '/': '<h1>Inicio</h1><a href="/noticia">Noticias</a><a href="/tramite/1">Licencia</a><a href="/privado">Pagar</a>',
    '/tramite/1': ficha('Licencia', '<a class="btn" href="/enviar">Iniciar trámite</a><a href="registrate/">Registrate</a>'),
    '/noticia': '<h1>Noticia</h1><p>Otro contenido</p>',
  };
  const server = http.createServer((req, res) => {
    requests.push(req.url);
    if (req.url === '/robots.txt') { res.setHeader('Content-Type', 'text/plain'); return res.end('User-agent: *\nDisallow: /privado'); }
    res.setHeader('Content-Type', 'text/html'); res.statusCode = pages[req.url] ? 200 : 404; res.end(pages[req.url] || '');
  }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const url = `http://127.0.0.1:${server.address().port}/`;
  await assert.rejects(crawlMunicipal(url), /privada/);
  const map = await crawlMunicipal(url, { allowLocal: true, maxPages: 2 });
  assert.equal(map.paginas[1].municipal.tramite.nombre, 'Licencia');
  assert.ok(map.ejecucion.pendientes > 0);
  assert.ok(!requests.some(url => /privado|enviar|registrate/.test(url)));
});

test('municipal API isolates municipalities and citizen responses exclude technical findings', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'municipal-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const map = mapOf(); map.auditoria = { seguridad: { estado: 'completado', hallazgos: [{ titulo: 'Technical-only' }] } };
  await new Store(path.join(dir, 'municipios')).save(siteId(municipalities.vgg.url), map);
  const { app } = createApp({ dataDir: dir, municipalDemoDir: null });
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}/api/municipios`;
  assert.equal((await fetch(`${base}/rosario/catalogo`)).status, 503);
  assert.equal((await fetch(`${base}/constructor/catalogo`)).status, 404);
  const answer = await fetch(`${base}/vgg/consulta`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pregunta: 'carnet' }) });
  assert.equal(answer.status, 200); assert.ok(!(await answer.text()).includes('Technical-only'));
  const bad = await fetch(`${base}/vgg/consulta`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(bad.status, 400);
  assert.ok((await (await fetch(`${base}/vgg/diagnostico`)).json()).auditoria);
});

test('packaged real demo works without developer data and keeps task evidence for Bob', async () => {
  const demo = new Store(fileURLToPath(new URL('../src/municipal-demo/', import.meta.url)));
  const rosario = await demo.get(siteId(municipalities.rosario.url));
  const vgg = await demo.get(siteId(municipalities.vgg.url));
  for (const map of [rosario, vgg]) {
    assert.equal(map.preparado_para_demo, true);
    assert.equal(map.auditoria.seguridad.estado, 'completado');
    assert.ok(map.auditoria.seguridad.task_id);
    assert.ok(!JSON.stringify(map).includes('state='));
  }
  const r = buildCatalog('rosario', rosario);
  assert.equal(consultCatalog(r, { pregunta: 'medio boleto' }).estado, 'aclaracion');
  assert.equal(consultCatalog(r, { pregunta: 'solicitar numeracion oficial' }).estado, 'listo');
  assert.equal(consultCatalog(buildCatalog('vgg', vgg), { pregunta: 'carnet' }).tramite.nombre, 'Licencia de conducir');
});
