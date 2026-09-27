// Shared contract: the extension keeps literal evidence from the public motor.
import { publicPage } from './url.mjs';
export function guiaDeCatalogo(catalogo, mapaId) {
  const urlPublica = value => {
    try {
      publicPage(value);
      const u = new URL(value);
      if ([...u.searchParams.keys()].some(k => /token|nonce|session|password|secret|email|csrf/i.test(k) || /^(code|state)$/i.test(k))) return null;
      return u.href;
    } catch { return null; }
  };
  const portada = urlPublica(catalogo?.sitio?.url);
  if (!portada) throw new Error('El catálogo no tiene un sitio válido.');
  const textos = values => (values || []).map(x => x.texto).filter(x => typeof x === 'string' && x.trim());
  return {
    id: `motor:${mapaId}`, mapaId, nombre: new URL(portada).hostname, portada,
    hosts: [new URL(portada).hostname], dinamico: true, fecha: catalogo.sitio.crawleado_en,
    cobertura: catalogo.cobertura, bob: catalogo.bob, impacto: catalogo.impacto || null,
    tramites: (catalogo.fichas || []).filter(f => urlPublica(f.fuente)).map(f => {
      const opciones = [...(f.destinos || []), ...(f.opciones || [])].filter(d => urlPublica(d.url)).map(d => ({
        texto: d.texto || 'Abrir acceso', url: d.url, sitio: new URL(d.url).hostname, desde: f.fuente,
      }));
      return { id: `${mapaId}:${f.id}`, nombre: f.nombre, ficha: f.fuente, fuente: f.fuente,
        consultas: (f.consultas || []).filter(c => typeof c === 'string' && c.length <= 80).slice(0, 6),
        clics: Number.isInteger(f.clics_desde_portada) ? f.clics_desde_portada : null,
        antes: textos(f.requisitos), antesTitulo: 'Requisitos publicados', costos: textos(f.costo),
        pasos: f.lectura === 'solo_enlace' ? [
          { titulo: 'Abrí la página del trámite', detalle: 'La encontramos en la guía de trámites del sitio. Ahí vas a ver los requisitos y cómo iniciarlo.', url: f.fuente },
        ] : [
          { titulo: 'Consultá la información del sitio', detalle: 'Revisá las condiciones que correspondan a tu caso.', url: f.fuente },
          { titulo: opciones.length ? 'Elegí el acceso' : 'Seguí las indicaciones de la página',
            detalle: textos(f.pasos).join('\n') || 'Continuá en la página del trámite. El sitio puede pedirte iniciar sesión.', opciones },
          ...(opciones.length ? [{ titulo: 'Continuá en el sitio', detalle: 'Llegaste al acceso. Wayfinder no verifica ni realiza el envío del trámite.' }] : []),
        ] };
    }),
  };
}

export const API = 'https://andromedaweb.store/wayfinder/api/motor';
export async function motor(path, body) {
  const response = await fetch(`${API}${path}`, {
    method: body === undefined ? 'GET' : 'POST', credentials: 'omit',
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(25000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `El motor respondió HTTP ${response.status}.`);
  return data;
}
