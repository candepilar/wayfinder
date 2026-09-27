// Lógica de la guía, sin nada del navegador: se prueba con node --test.
// Recibe las hojas de ruta generadas desde el catálogo del motor (rutas.json).

export function normalizar(texto) {
  return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function partes(url) {
  try {
    const u = new URL(url);
    return { host: u.hostname.replace(/^www\./, ''), path: u.pathname.replace(/\/+$/, '') || '/' };
  } catch {
    return null;
  }
}

// Una página "es" la de un paso si coinciden sitio y camino (sin mirar la query:
// ahí suelen viajar datos de sesión).
export function coincide(urlPaso, urlPestana) {
  const a = partes(urlPaso), b = partes(urlPestana);
  return !!a && !!b && a.host === b.host && a.path === b.path;
}

export function sitioDe(rutas, url) {
  const p = partes(url);
  if (!p) return null;
  return rutas.sitios.find(s => s.hosts.some(h => h.replace(/^www\./, '') === p.host)) || null;
}

// El trámite que corresponde a la pestaña: su ficha o alguno de sus destinos.
export function tramiteDe(rutas, url) {
  for (const sitio of rutas.sitios) {
    for (const t of sitio.tramites) {
      if (coincide(t.ficha, url)) return { sitio, tramite: t };
    }
  }
  for (const sitio of rutas.sitios) {
    for (const t of sitio.tramites) {
      if (t.pasos.some(p => (p.opciones || []).some(o => coincide(o.url, url)))) return { sitio, tramite: t };
    }
  }
  return null;
}

// Índice del paso que la persona tiene que hacer ahora, según la página abierta.
// Llegar a la página de un paso (la ficha, o el sitio de una opción) lo da por
// hecho y pasa al siguiente. Fuera del trámite, el primero.
export function pasoActual(tramite, url) {
  let actual = 0;
  tramite.pasos.forEach((paso, i) => {
    const llego = (paso.url && coincide(paso.url, url)) || (paso.opciones || []).some(o => coincide(o.url, url));
    if (llego) actual = Math.min(i + 1, tramite.pasos.length - 1);
  });
  return actual;
}

// Lo que hay que resaltar en la página abierta: los enlaces del paso actual
// que están en esta página.
export function objetivoEn(tramite, url) {
  const paso = tramite.pasos[pasoActual(tramite, url)];
  return (paso?.opciones || []).filter(o => coincide(o.desde, url)).map(o => ({ url: o.url, texto: o.texto }));
}

// Búsqueda en lenguaje natural, sin modelo: se quitan palabras vacías y se
// compara por raíz (primeras 5 letras), así «quiero devolver un producto»
// encuentra «Devoluciones» y «envíos» encuentra «Envío a domicilio».
const VACIAS = new Set('a al algo alguna alguno como con cual cuando de del donde el en es esa ese esta este hacer hago la las le lo los me mi mis necesito o para por puedo que quiero se si sin su sus te tengo tu un una uno y ya yo quisiera'.split(' '));
export function raices(texto) {
  return [...new Set(normalizar(texto).split(/[^a-z0-9ñ]+/).filter(p => p.length > 2 && !VACIAS.has(p)).map(p => p.slice(0, 5)))];
}
const puntaje = (consulta, texto) => { const r = new Set(raices(texto)); return consulta.filter(p => r.has(p)).length; };

export function buscar(sitio, consulta, limite = 6) {
  const palabras = raices(consulta);
  if (!palabras.length) return [];
  return sitio.tramites
    .map(t => {
      // consultas: cómo lo pediría un vecino (las anota Bob al armar el catálogo).
      const puntos = 3 * puntaje(palabras, t.nombre) + 2 * puntaje(palabras, (t.consultas || []).join(' ')) + puntaje(palabras, [...t.antes, ...t.costos].join(' '));
      return { t, puntos };
    })
    .filter(x => x.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos || a.t.nombre.length - b.t.nombre.length)
    .slice(0, limite)
    .map(x => x.t);
}

// Enlaces visibles de la página: sin consulta, los primeros (ya vienen
// priorizados); con consulta, los que comparten más raíces con lo pedido.
export function buscarEnlaces(enlaces, consulta, limite = 8) {
  const palabras = raices(consulta);
  if (!palabras.length) return enlaces.slice(0, limite);
  return enlaces.map((e, i) => ({ e, i, puntos: puntaje(palabras, e.texto) }))
    .filter(x => x.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos || a.i - b.i)
    .slice(0, limite).map(x => x.e);
}
