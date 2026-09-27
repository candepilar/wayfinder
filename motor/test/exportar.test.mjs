import test from 'node:test';
import assert from 'node:assert/strict';
import { exportarHtml, exportarJsonLd } from '../src/exportar.mjs';

const catalogo = { sitio: { url: 'https://muni.example.org/', titulo: 'Municipalidad de Prueba', crawleado_en: '2026-09-27T10:00:00Z' }, fichas: [
  { nombre: 'Poda de árboles', fuente: 'https://muni.example.org/poda', requisitos: [{ texto: 'DNI del titular.' }], pasos: [], costo: [], donde_se_hace: [], destinos: [{ texto: 'Pedir poda', url: 'https://muni.example.org/poda/iniciar' }], clics_desde_portada: 4 },
  { nombre: 'Árbol <script>alert(1)</script>', fuente: 'https://muni.example.org/x', requisitos: [{ texto: '</script><img src=x onerror=alert(2)>' }], destinos: [{ texto: 'Mal', url: 'javascript:alert(3)' }, { texto: 'Bien', url: 'https://muni.example.org/ok' }] },
  { nombre: 'Sin fuente', fuente: 'javascript:alert(4)', requisitos: [] },
] };

test('the A-Z page lists every sourced fiche one click away, alphabetically, with literal text', () => {
  const html = exportarHtml(catalogo);
  assert.match(html, /<html lang="es">/);
  assert.match(html, /2 gestiones, cada una a un clic/);
  assert.ok(html.indexOf('Árbol') < html.indexOf('Poda de árboles'), 'orden alfabético sin tildes');
  assert.match(html, /<li>DNI del titular\.<\/li>/);
  assert.match(html, /href="https:\/\/muni\.example\.org\/poda\/iniciar">Pedir poda</);
  assert.match(html, /antes, a 4 clics de la portada/);
  assert.doesNotMatch(html, /Sin fuente/);
});

test('content from the site cannot inject markup, scripts or unsafe links', () => {
  const html = exportarHtml(catalogo);
  assert.doesNotMatch(html, /<script>alert/); assert.doesNotMatch(html, /<img/); assert.doesNotMatch(html, /javascript:/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  // Solo hay un <script>: el JSON-LD, y su contenido no puede cerrarlo.
  assert.equal(html.match(/<script/g).length, 1);
  const bloque = html.slice(html.indexOf('<script type="application/ld+json">') + 35, html.indexOf('</script>'));
  assert.doesNotMatch(bloque, /</);
  assert.equal(JSON.parse(bloque)['@graph'].length, 2);
});

test('schema.org GovernmentService data with provider, channels and requirements', () => {
  const ld = exportarJsonLd(catalogo);
  assert.equal(ld['@context'], 'https://schema.org');
  const poda = ld['@graph'].find(x => x.name === 'Poda de árboles');
  assert.equal(poda['@type'], 'GovernmentService');
  assert.deepEqual(poda.provider, { '@type': 'Organization', name: 'Municipalidad de Prueba', url: 'https://muni.example.org/' });
  assert.deepEqual(poda.availableChannel, [{ '@type': 'ServiceChannel', name: 'Pedir poda', serviceUrl: 'https://muni.example.org/poda/iniciar' }]);
  assert.equal(poda.description, 'Requisitos: DNI del titular.');
  assert.deepEqual(ld['@graph'].find(x => x.name.startsWith('Árbol')).availableChannel.map(c => c.serviceUrl), ['https://muni.example.org/ok']);
});

test('the export endpoint finds the catalogue by address and serves a sandboxed download', async t => {
  const { mkdtemp, rm } = await import('node:fs/promises');
  const os = await import('node:os'); const path = await import('node:path');
  const { createApp } = await import('../src/server.mjs'); const { Store } = await import('../src/store.mjs');
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'exportar-')); t.after(() => rm(dataDir, { recursive: true, force: true }));
  await new Store(path.join(dataDir, 'mapas')).save('0123456789abcdef0123', { sitio: catalogo.sitio, paginas: [], catalogo });
  const { app } = createApp({ dataDir });
  const server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r));
  t.after(() => new Promise(r => { server.closeAllConnections(); server.close(r); }));
  const base = `http://127.0.0.1:${server.address().port}/api/exportar`;
  const html = await fetch(`${base}?url=${encodeURIComponent('www.muni.example.org/cualquier')}`);
  assert.equal(html.status, 200);
  assert.match(html.headers.get('content-type'), /text\/html/);
  assert.match(html.headers.get('content-disposition'), /attachment; filename="tramites-muni\.example\.org\.html"/);
  assert.match(html.headers.get('content-security-policy'), /default-src 'none'/);
  assert.match(await html.text(), /Trámites de la A a la Z/);
  const ld = await fetch(`${base}?url=https://muni.example.org/&formato=jsonld`);
  assert.equal((await ld.json())['@graph'].length, 2);
  assert.equal((await fetch(`${base}?url=https://otro.example.org/`)).status, 404);
  assert.equal((await fetch(base)).status, 400);
});
