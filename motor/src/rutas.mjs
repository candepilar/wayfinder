import { queryMap } from './search.mjs';

// Un sitio real no guarda su jerarquía en las URLs. rosario.gob.ar deja 111 de sus
// 119 páginas en `inicio/<algo>`: por camino de URL el árbol es una estrella y no
// hay nada que recorrer. La jerarquía existe, pero está en los enlaces, tapada por
// la plantilla del sitio: de 3285 enlaces internos, 3084 son los 27 del menú, y los
// dos formularios y las ocho acciones son los mismos en las 119 páginas.
//
// La información está en lo que NO se repite. Este módulo resta lo común y, con lo
// que queda, arma el camino desde el inicio hasta la página que responde. Todo es
// determinista y citado: no hay modelo de lenguaje en el recorrido.

const UMBRAL = 0.8;

const nombreCampo = campo => (typeof campo === 'string' ? campo : campo?.nombre || '');

/**
 * Dos formularios son el mismo si coinciden el nombre y los campos. El destino
 * queda afuera a propósito: el buscador del encabezado de rosario.gob.ar envía a
 * la página donde está, así que por destino ningún formulario del sitio parecería
 * repetido y la plantilla se colaría como si fuera contenido.
 */
const firmaFormulario = formulario =>
  [formulario?.nombre || '', (formulario?.campos || []).map(nombreCampo).join(',')].join('|');

/**
 * Lo que aparece en al menos `umbral` de las páginas: el menú, el buscador del
 * encabezado, el pie. Es la plantilla del sitio, no su contenido.
 */
export function comunDelSitio(paginas, umbral = UMBRAL) {
  const minimo = umbral * paginas.length;
  const ids = new Set(paginas.map(p => p.id));
  const repetidos = obtener => {
    const veces = new Map();
    for (const pagina of paginas)
      for (const clave of new Set(obtener(pagina))) veces.set(clave, (veces.get(clave) || 0) + 1);
    return new Set([...veces].filter(([, cuantas]) => cuantas >= minimo).map(([clave]) => clave));
  };
  return {
    enlaces: repetidos(p => (p.enlaces || []).filter(destino => ids.has(destino) && destino !== p.id)),
    formularios: repetidos(p => (p.formularios || []).map(firmaFormulario)),
    acciones: repetidos(p => p.acciones || []),
  };
}

/** Lo que esta página tiene y el resto del sitio no: su contenido propio. */
export function loPropio(pagina, paginas, comun = comunDelSitio(paginas)) {
  const ids = new Set(paginas.map(p => p.id));
  return {
    enlaces: [...new Set(pagina.enlaces || [])].filter(
      destino => ids.has(destino) && destino !== pagina.id && !comun.enlaces.has(destino)
    ),
    formularios: (pagina.formularios || []).filter(f => !comun.formularios.has(firmaFormulario(f))),
    acciones: (pagina.acciones || []).filter(a => !comun.acciones.has(a)),
  };
}

/** El inicio es la página con el camino más corto; ante empate, la del sitio. */
export function inicioDe(paginas, sitio) {
  if (!paginas.length) return null;
  const semilla = sitio?.url && paginas.find(p => p.url === sitio.url);
  const minimo = Math.min(...paginas.map(p => (p.camino || []).length));
  const candidatas = paginas.filter(p => (p.camino || []).length === minimo);
  return candidatas.includes(semilla) ? semilla : candidatas[0];
}

/**
 * De qué página se llega a cada una, según los enlaces y no según la URL.
 *
 * El menú no es ruido que se tire: es el índice del sitio, o sea su primer nivel.
 * Lo que está en el menú cuelga del inicio; de ahí para abajo manda el enlace
 * propio. Sin esto el recorrido se corta en seco, porque las páginas que son a la
 * vez menú y sección —«Trámites», «Impuestos y Tasas»— quedarían sin hijos.
 *
 * Recorrido en anchura: el camino que sale es el más corto y no puede tener ciclos.
 * A lo que no se alcanza por ningún lado le queda el inicio como padre.
 */
export function padresDe(paginas, comun = comunDelSitio(paginas)) {
  const inicio = inicioDe(paginas);
  const padres = new Map();
  if (!inicio) return padres;

  const propios = new Map(paginas.map(p => [p.id, loPropio(p, paginas, comun).enlaces]));
  const primerNivel = [...comun.enlaces].filter(id => id !== inicio.id);
  const hijosDe = id =>
    id === inicio.id ? [...new Set([...(propios.get(id) || []), ...primerNivel])] : propios.get(id) || [];

  const cola = [inicio.id];
  const vistos = new Set([inicio.id]);
  while (cola.length) {
    const actual = cola.shift();
    for (const hijo of hijosDe(actual)) {
      if (vistos.has(hijo)) continue;
      vistos.add(hijo);
      padres.set(hijo, actual);
      cola.push(hijo);
    }
  }
  for (const pagina of paginas) if (!vistos.has(pagina.id)) padres.set(pagina.id, inicio.id);
  return padres;
}

/** Los pasos desde el inicio hasta la página, ella incluida. */
export function caminoHasta(paginas, id, padres = padresDe(paginas)) {
  const porId = new Map(paginas.map(p => [p.id, p]));
  if (!porId.has(id)) return [];
  const pasos = [];
  const vistos = new Set();
  let actual = id;
  while (actual && porId.has(actual) && !vistos.has(actual)) {
    vistos.add(actual);
    const pagina = porId.get(actual);
    pasos.unshift({ id: pagina.id, titulo: pagina.titulo, url: pagina.url });
    actual = padres.get(actual);
  }
  return pasos;
}

/**
 * La respuesta a una pregunta sobre el sitio: adónde hay que ir, cómo se llega,
 * la cita textual que lo justifica y qué se puede hacer al llegar.
 *
 * El orden y la cita salen de `queryMap`, que no inventa: el extracto es un
 * fragmento literal de la página. Acá se agrega el recorrido.
 */
export function responder(mapa, pregunta, { limite = 5 } = {}) {
  const paginas = mapa?.paginas || [];
  const base = queryMap(mapa, pregunta, limite);
  if (!base.fuentes.length) return { tipo: 'camino', pregunta, destino: null, camino: [], cita: base.respuesta, acciones: [], formularios: [], alternativas: [] };

  const [mejor, ...resto] = base.fuentes;
  const destino = paginas.find(p => p.id === mejor.id);
  const comun = comunDelSitio(paginas);
  const propio = destino ? loPropio(destino, paginas, comun) : { formularios: [], acciones: [] };

  return {
    tipo: 'camino',
    pregunta,
    destino: destino ? { id: destino.id, titulo: destino.titulo, url: destino.url } : null,
    camino: caminoHasta(paginas, mejor.id, padresDe(paginas, comun)),
    cita: mejor.extracto,
    // Solo lo propio de la página: el buscador del encabezado está en todas y no
    // es una cosa que se pueda hacer *acá*.
    formularios: propio.formularios.map(f => ({ nombre: f.nombre, destino: f.destino, campos: (f.campos || []).map(nombreCampo) })),
    acciones: propio.acciones,
    alternativas: resto.map(f => ({ id: f.id, titulo: f.titulo, url: f.url, puntaje: f.puntaje })),
  };
}
