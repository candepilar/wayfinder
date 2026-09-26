import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { comunDelSitio, loPropio, padresDe, caminoHasta, inicioDe, responder } from '../src/rutas.mjs';

// Un sitio chato a propósito, como los reales: todo cuelga de `inicio/` y el menú
// se repite en cada página. La jerarquía solo existe en los enlaces.
const MENU = ['p_contacto', 'p_tramites'];
const BUSCADOR = { nombre: 'Buscar', destino: '/buscar', campos: ['Buscar'] };

const pagina = (id, segmento, titulo, texto, enlaces, extra = {}) => ({
  id,
  url: `https://ciudad.test/inicio/${segmento}`,
  camino: segmento ? ['inicio', segmento] : ['inicio'],
  titulo,
  texto,
  enlaces,
  formularios: [BUSCADOR, ...(extra.formularios || [])],
  acciones: ['Buscar', 'Ingresá', ...(extra.acciones || [])],
});

const SITIO = {
  sitio: { url: 'https://ciudad.test/inicio/', titulo: 'Inicio' },
  paginas: [
    pagina('p_home', '', 'Inicio', 'Portal de la ciudad.', [...MENU]),
    pagina('p_contacto', 'contacto', 'Contacto', 'Escribinos.', [...MENU]),
    pagina('p_tramites', 'tramites', 'Trámites', 'Listado de trámites.', [...MENU, 'p_licencia']),
    pagina('p_licencia', 'licencia-de-conducir', 'Licencia de conducir', 'Todo sobre la licencia.', [...MENU, 'p_renovacion']),
    pagina('p_renovacion', 'renovar-licencia', 'Renovar la licencia de conducir', 'Para renovar la licencia necesitás turno previo y libreta sanitaria vigente.', [...MENU], {
      formularios: [{ nombre: 'Solicitar turno', destino: '/turnos', campos: ['DNI', 'Fecha de nacimiento'] }],
      acciones: ['Solicitar turno'],
    }),
  ],
};

test('what repeats across the site is template, not content, and is subtracted', () => {
  const comun = comunDelSitio(SITIO.paginas);
  assert.deepEqual([...comun.enlaces].sort(), ['p_contacto', 'p_tramites']);
  assert.equal(comun.formularios.size, 1, 'el buscador del encabezado es plantilla');
  assert.deepEqual([...comun.acciones].sort(), ['Buscar', 'Ingresá']);

  const destino = SITIO.paginas.at(-1);
  const propio = loPropio(destino, SITIO.paginas, comun);
  assert.deepEqual(propio.formularios.map(f => f.nombre), ['Solicitar turno']);
  assert.deepEqual(propio.acciones, ['Solicitar turno']);
  assert.deepEqual(propio.enlaces, [], 'la última página no enlaza contenido propio');
});

test('the route follows editorial links even when every URL is a sibling', () => {
  // Por camino de URL las cinco páginas están al mismo nivel: `inicio/<algo>`.
  const niveles = new Set(SITIO.paginas.slice(1).map(p => p.camino.length));
  assert.deepEqual([...niveles], [2], 'el sitio es chato en las URLs');

  const camino = caminoHasta(SITIO.paginas, 'p_renovacion');
  assert.deepEqual(camino.map(p => p.id), ['p_home', 'p_tramites', 'p_licencia', 'p_renovacion']);
});

test('pages reached only through the menu hang from home, not from nowhere', () => {
  const padres = padresDe(SITIO.paginas);
  assert.equal(padres.get('p_contacto'), 'p_home');
  assert.deepEqual(caminoHasta(SITIO.paginas, 'p_contacto').map(p => p.id), ['p_home', 'p_contacto']);
  assert.equal(padres.has('p_home'), false, 'el inicio no tiene padre');
});

test('the answer quotes the page literally and offers only actions of that page', () => {
  const r = responder(SITIO, 'quiero renovar la licencia');
  assert.equal(r.destino.id, 'p_renovacion');
  assert.deepEqual(r.camino.map(p => p.titulo), ['Inicio', 'Trámites', 'Licencia de conducir', 'Renovar la licencia de conducir']);
  assert.ok(SITIO.paginas.at(-1).texto.includes(r.cita.replaceAll('…', '')), 'la cita es textual, no generada');
  assert.deepEqual(r.formularios, [{ nombre: 'Solicitar turno', destino: '/turnos', campos: ['DNI', 'Fecha de nacimiento'] }]);
  assert.ok(r.alternativas.length > 0 && r.alternativas.every(a => a.id !== r.destino.id));
});

test('a question with no match says so instead of pointing anywhere', () => {
  const r = responder(SITIO, 'patente de un barco');
  assert.equal(r.destino, null);
  assert.deepEqual(r.camino, []);
});

// El escaneo real de Rosario que está commiteado. Si el algoritmo solo funciona
// con el sitio de prueba, no sirve.
test('the real Rosario scan yields routes that its URLs do not contain', async (t) => {
  const archivo = path.join(import.meta.dirname, '..', '..', 'demo', 'rosario', 'mapa-rosario.json');

  // El paquete que se despliega al VPS lleva solo `motor/` y `public/`, asi que
  // alla no hay repositorio y el escaneo no esta. Sin el no se puede comprobar
  // nada, y hacer fallar la prueba frenaria la publicacion. Se saltea a la vista.
  if (!existsSync(archivo)) return t.skip('sin demo/rosario/: no es una copia del repositorio');

  const mapa = JSON.parse(await readFile(archivo, 'utf8'));
  const comun = comunDelSitio(mapa.paginas);
  assert.ok(comun.enlaces.size > 0, 'un sitio real repite su menú en todas las páginas');

  const padres = padresDe(mapa.paginas, comun);
  assert.equal(padres.size, mapa.paginas.length - 1, 'toda página menos el inicio tiene de dónde se llega');

  const inicio = inicioDe(mapa.paginas, mapa.sitio);
  for (const pagina of mapa.paginas) {
    const camino = caminoHasta(mapa.paginas, pagina.id, padres);
    assert.equal(camino.at(-1).id, pagina.id, 'el camino termina en la página pedida');
    assert.equal(camino[0].id, inicio.id, 'y empieza en el inicio');
  }
});
