// Arma extension/rutas.json a partir del catálogo municipal del motor.
// Uso: node extension/generar-rutas.mjs
// No inventa nada: cada dato sale de una ficha oficial recorrida y guarda su fuente.
import { readFile, readdir, writeFile } from 'node:fs/promises';

const DEMO = new URL('../motor/src/municipal-demo/', import.meta.url);
const NOMBRES = { 'rosario.gob.ar': 'Rosario', 'vggmunicipalidad.gov.ar': 'Villa Gobernador Gálvez' };

const hostDe = url => new URL(url).hostname.replace(/^www\./, '');
const items = (secciones, tipo) => secciones.filter(s => s.tipo === tipo).flatMap(s => s.items?.length ? s.items : [s.texto]).filter(Boolean);
const norm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// ARCA es el nombre nuevo de AFIP: los sitios usan los dos.
const SINONIMOS = { arca: ['arca', 'afip'], afip: ['arca', 'afip'] };
// Palabras que no nombran una forma de hacer el trámite: un botón «Comenzar» no
// dice qué hace falta, así que no se cruza con otras fichas.
const VACIAS = new Set(['con', 'desde', 'para', 'por', 'del', 'las', 'los', 'una', 'tramites', 'tramite',
  'iniciar', 'comenzar', 'solicitar', 'renovar', 'transferir', 'acceder', 'gestionar', 'ingresar', 'aqui', 'online']);

// Qué pide una opción (ej. «con Código de gestión»), según lo que dice el mismo
// sitio en cualquiera de sus fichas. Devuelve la frase más corta que nombra la
// opción y su fuente, o null si ninguna ficha lo explica.
const palabras = t => norm(t).split(/[^a-z0-9]+/).filter(p => p.length > 2 && !VACIAS.has(p));

function queNecesita(opcion, frases, tramite) {
  const claves = palabras(opcion.texto);
  if (!claves.length) return null;
  const tema = new Set(palabras(tramite));
  const candidatas = frases.filter(f => {
    const n = norm(f.texto);
    if (n.trim().endsWith(':')) return false; // «Los siguientes documentos…:» es solo una introducción
    return claves.every(c => (SINONIMOS[c] || [c]).some(s => n.includes(s)));
  });
  // Primero las fichas del mismo tema (ej. otra ficha de TGI), después la frase más corta.
  const afinidad = f => palabras(`${f.ficha} ${f.texto}`).filter(p => tema.has(p)).length;
  candidatas.sort((a, b) => afinidad(b) - afinidad(a) || a.texto.length - b.texto.length);
  return candidatas[0] || null;
}

function hojaDeRuta(pagina, frases) {
  const m = pagina.municipal, t = m.tramite;
  const secciones = t.secciones || m.secciones || [];
  const destinos = (t.destinos || []).filter(d => d.accion && d.url);
  const pasos = [{ titulo: 'Abrí la ficha oficial', detalle: 'Ahí está la información vigente del trámite.', url: t.encontrado_en }];
  if (destinos.length) {
    pasos.push({
      titulo: destinos.length > 1 ? 'Elegí cómo hacerlo' : 'Entrá al sistema del trámite',
      detalle: destinos.length > 1 ? 'Hay más de una forma; con una alcanza.' : 'Es el botón de la ficha que inicia el trámite.',
      opciones: destinos.map(d => {
        const texto = d.texto.trim() || 'Iniciar el trámite';
        return { texto, url: d.url, sitio: hostDe(d.url), desde: d.encontrado_en, necesitas: queNecesita({ texto }, frases, t.nombre || m.nombre) };
      }),
    });
    pasos.push({ titulo: 'Completalo en el sitio oficial', detalle: 'Wayfinder no ve ni completa tus datos. Si algo no coincide, manda la ficha oficial.' });
  } else {
    const indicaciones = items(secciones, 'pasos');
    pasos.push({ titulo: 'Seguí las indicaciones de la ficha', detalle: indicaciones[0] || 'La ficha no tiene un botón para hacerlo online: indica cómo resolverlo.' });
  }
  return {
    id: t.id,
    nombre: t.nombre || m.nombre,
    ficha: t.encontrado_en,
    antes: items(secciones, 'requisitos'),
    antesTitulo: secciones.find(s => s.tipo === 'requisitos')?.titulo || 'Requisitos',
    costos: items(secciones, 'costos'),
    pasos,
    fuente: t.encontrado_en,
  };
}

const sitios = [];
for (const archivo of (await readdir(DEMO)).filter(f => f.endsWith('.json')).sort()) {
  const mapa = JSON.parse(await readFile(new URL(archivo, DEMO), 'utf8'));
  const host = hostDe(mapa.sitio.url);
  // Todas las frases de requisitos del sitio, para cruzar fichas entre sí.
  const frases = mapa.paginas.filter(p => p.municipal?.tramite).flatMap(p => {
    const secciones = p.municipal.tramite.secciones || p.municipal.secciones || [];
    const fuente = p.municipal.tramite.encontrado_en;
    return secciones.filter(s => s.tipo === 'requisitos').flatMap(s => (s.items?.length ? s.items : [s.texto]).map(texto => ({ texto, fuente, ficha: p.municipal.nombre })));
  });
  // Cuántas páginas del sitio enlazan a cada una: lo que el propio sitio destaca
  // (ej. su portada) va primero en las sugerencias.
  const entrantes = new Map();
  for (const p of mapa.paginas) for (const id of new Set(p.enlaces || [])) entrantes.set(id, (entrantes.get(id) || 0) + 1);
  const tramites = mapa.paginas.filter(p => p.municipal?.tramite)
    .map(p => ({ ...hojaDeRuta(p, frases), enlazado: entrantes.get(p.id) || 0 }))
    .sort((a, b) => b.enlazado - a.enlazado || a.nombre.localeCompare(b.nombre, 'es'));
  sitios.push({ id: host.split('.')[0], nombre: NOMBRES[host] || host, hosts: [host, `www.${host}`], portada: mapa.sitio.url, tramites });
}
await writeFile(new URL('./rutas.json', import.meta.url), JSON.stringify({ generado: new Date().toISOString(), sitios }, null, 1) + '\n');
console.log(sitios.map(s => `${s.nombre}: ${s.tramites.length} trámites`).join('\n'));
