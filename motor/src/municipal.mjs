import { load } from 'cheerio';
import { normalizeUrl } from './network.mjs';
import { pageId } from './crawler.mjs';

export const municipalities = Object.freeze({
  rosario: { nombre: 'Rosario', url: 'https://www.rosario.gob.ar/inicio/' },
  vgg: { nombre: 'Villa Gobernador Gálvez', url: 'https://vggmunicipalidad.gov.ar/' },
});
const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
export const folded = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const safe = (value, base) => { try { return normalizeUrl(value, base); } catch { return null; } };
const action = /^(comenzar|iniciar|inicia|hacer|realizar|realiza|gestionar|gestiona|solicitar|solicita|sacar|reservar|pagar|paga|ingresar|ingresa|acceder|obtener|renovar|inscribirse|continuar)\b/;
const kindOf = text => {
  const title = folded(text).replace(/[¿?¡!:]/g, '');
  if (/^(requisitos|documentacion|documentos a presentar|que necesito)(\b|$)/.test(title)) return 'requisitos';
  if (/^(paso a paso|pasos|como (realizarlo|realizar|hacerlo|hacer|tramitarlo|tramitar)|procedimiento)(\b|$)/.test(title)) return 'pasos';
  if (/^(cuanto cuesta|costo|costos|formas de pago)(\b|$)/.test(title)) return 'costos';
  if (/^(datos de contacto|contacto|donde se realiza|donde realizar|lugar de atencion)(\b|$)/.test(title)) return 'contacto';
  return null;
};

/** Ranking only. A low score NEVER excludes a page from discovery. */
export function priorityOf(link) {
  const text = folded(link.texto);
  const path = folded(new URL(link.url).pathname);
  return (/\/tramite\//.test(path) ? 10 : 0) + (action.test(text) ? 4 : 0)
    + (/tramites|licencia|registro civil|tgi|numeracion/.test(`${text} ${path}`) ? 3 : 0)
    + (/tramites|servicios/.test(folded(link.contexto)) ? 2 : 0);
}

/** Extract evidence from public HTML, never from a model or a submitted form. */
export function extractMunicipal(html, url) {
  const $ = load(html);
  const declaredBase = safe($('base[href]').attr('href') || url, url);
  const base = declaredBase && new URL(declaredBase).origin === new URL(url).origin ? declaredBase : url;
  const nofollow = /nofollow/i.test($('meta[name=robots]').attr('content') || '');
  $('script,style,noscript,template,svg,nav,header,footer,[hidden],[aria-hidden=true]').remove();
  const main = $('main,[role=main],article').first();
  const root = main.length ? main : $('body');
  const nombre = clean(root.find('h1').first().text() || $('h1').first().text());
  const sections = [];
  let current = null;
  // Source whitespace never creates an item. Preserve full DOM list items,
  // including inline markup, nested lists and their explanatory notes.
  function flush() {
    if (!current) return;
    const texto = clean(current.parts.join(''));
    if (texto) current.bloques.push({ tipo: 'parrafo', texto });
    current.parts = [];
  }
  function itemText(node) {
    if (node.type === 'text') return node.data;
    const text = (node.children || []).map(itemText).join('');
    return /^(p|li|div|br|tr|ul|ol)$/.test(node.name || '') ? ` ${text} ` : text;
  }
  function walk(node) {
    if (node.type === 'text') { if (current) current.parts.push(node.data); return; }
    if (/^h[1-6]$/.test(node.name || '')) {
      flush();
      const titulo = clean($(node).text());
      const tipo = kindOf(titulo);
      const level = Number(node.name.slice(1));
      if (tipo) {
        // CMS wrappers around just the heading must not end the section.
        const container = $(node).closest('section,article,main,[role=main]').get(0) || root.get(0);
        current = { tipo, titulo, level, container, parts: [], bloques: [] };
        sections.push(current);
      }
      else if (current && level > current.level) current.bloques.push({ tipo: 'subtitulo', texto: titulo });
      else current = null;
      return;
    }
    if (current && node.name === 'li') {
      flush();
      const texto = clean(itemText(node));
      if (texto) current.bloques.push({ tipo: 'item', texto });
      return;
    }
    const boundary = /^(p|div|br|tr|ul|ol|blockquote)$/.test(node.name || '');
    if (boundary) flush();
    for (const child of node.children || []) walk(child);
    if (boundary) flush();
    if (current?.container === node) { flush(); current = null; }
  }
  for (const node of root.toArray()) walk(node);
  flush();
  const secciones = sections.map(({ tipo, titulo, bloques }) => ({
    tipo, titulo, texto: bloques.map(b => b.texto).join(' '), bloques,
    items: bloques.filter(b => b.tipo === 'item').map(b => b.texto), fuente: url,
  })).filter(s => s.texto);
  const links = root.find('a[href]').map((_i, el) => {
    const a = $(el), href = a.attr('href');
    const destino = safe(href, base);
    if (!destino) return null;
    const texto = clean(a.text() || a.attr('aria-label') || a.attr('title'));
    const contexto = clean(a.closest('section,article').find('h2,h3').first().text());
    return { texto, url: destino, contexto, encontrado_en: url,
      seguir: !nofollow && !/nofollow/i.test(a.attr('rel') || ''),
      accion: (action.test(folded(texto)) && (a.attr('role') === 'button' || /button|btn/i.test(a.attr('class') || '') || /^(comenzar|gestionar|iniciar|hacer|realizar|ingresar|acceder|continuar)\b/.test(folded(texto))))
        || (/otra opcion de tramitar/.test(folded(a.closest('p').text())) && /codigo de gestion|tramites tributarios/.test(folded(texto))),
    };
  }).get().filter(Boolean);
  const unique = [...new Map(links.map(l => [`${l.texto}\n${l.url}`, l])).values()];
  // A section/index with many links is not an individual procedure just because
  // its navigation mentions requirements. Empty headings do not confirm anything.
  const index = /^(inicio|tramites(?: y servicios)?|servicios|denuncias|gestiones administrativas)$/i.test(folded(nombre));
  const core = secciones.some(s => ['requisitos', 'pasos'].includes(s.tipo));
  const payment = secciones.some(s => s.tipo === 'costos') && /pagar|pago|tasa|tgi/.test(folded(nombre));
  const confirmed = Boolean(nombre && !index && (core || payment));
  const destinos = confirmed ? unique.filter(l => l.accion && l.url !== url && !/\.(pdf|docx?)(\?|$)/i.test(l.url)
    && ![...new URL(l.url).searchParams.keys()].some(k => /^(state|nonce|session|token|code)$/i.test(k))
    && !/registrat|registro de usuario|crear cuenta/i.test(folded(l.texto))) : [];
  return { nombre, secciones, enlaces: unique, tramite: confirmed ? {
    id: pageId(url), nombre, requisitos: url,
    formulario: destinos.length === 1 ? destinos[0].url : null,
    encontrado_en: url, secciones, destinos: destinos.map(l => ({ ...l, estado: 'enlazado_no_verificado' })),
    confirmacion: 'heuristica_con_evidencia', validacion_humana: false,
  } : null };
}

export function buildCatalog(municipio, map) {
  const tramites = map.paginas.flatMap(p => p.municipal?.tramite ? [{ ...p.municipal.tramite, revisado_en: p.municipal.revisado_en || map.sitio.crawleado_en }] : []);
  const visited = new Set(map.paginas.map(p => p.url));
  const candidates = new Map();
  const contacts = new Map();
  for (const p of map.paginas) for (const link of p.municipal?.enlaces || []) {
    if (priorityOf(link) >= 3 && !visited.has(link.url) && new URL(link.url).origin === new URL(map.sitio.url).origin && !link.accion)
      candidates.set(link.url, { nombre: link.texto, url: link.url, encontrado_en: p.url, estado: 'sin_confirmar' });
    if (/^(contacto|contactos|telefonos utiles|ver todos los telefonos|atencion ciudadana|consultas y reclamos)$/.test(folded(link.texto)) || /necesitas ayuda/.test(folded(link.texto)))
      contacts.set(link.url, { nombre: link.texto, url: link.url, encontrado_en: p.url });
  }
  return { version: 1, municipio, nombre: municipalities[municipio]?.nombre || municipio,
    fuente: map.sitio.url, revisado_en: map.sitio.crawleado_en, cobertura: map.ejecucion,
    tramites, pendientes: [...candidates.values()], contactos: [...contacts.values()].slice(0, 8) };
}

const stop = new Set('a al como con cual de del donde el en es esta este hacer la las lo los me mi necesito para por que quiero se tengo tramite un una y yo sacar solicitar'.split(' '));
function terms(text) {
  const normalized = folded(text).replace(/\btasa (general de inmuebles|municipal)\b/g, 'tgi').replace(/\bcarnet\b/g, 'licencia conducir');
  const synonyms = { renovar: 'renovacion', renuevo: 'renovacion', pago: 'pagar', estacionaron: 'estacionamiento' };
  return [...new Set((normalized.match(/[a-z0-9]{2,}/g) || []).filter(t => !stop.has(t)).map(t => synonyms[t] || t))];
}
function rank(items, question) {
  const query = terms(question);
  return items.map(item => {
    const title = new Set(terms(item.nombre));
    const body = new Set(terms((item.secciones || []).map(s => s.texto).join(' ')));
    const titleHits = query.filter(t => title.has(t)).length;
    const hits = query.filter(t => title.has(t) || body.has(t)).length;
    const exact = title.size === query.length && titleHits === query.length;
    return { item, score: query.length ? (titleHits * 8 + hits) * hits / query.length * (exact ? 2 : 1) : 0,
      relevant: titleHits > 0 && hits / query.length >= 0.5 && (!query.includes('conducir') || title.has('conducir')) };
  }).filter(r => r.relevant).sort((a, b) => b.score - a.score || a.item.nombre.localeCompare(b.item.nombre));
}

/** Stateless dialogue: the client sends the question and an optional chosen ID.
 * No identity, credentials or free-form conversation history is stored. */
export function consultCatalog(catalog, { pregunta, opcion, destino } = {}) {
  if (typeof pregunta !== 'string' || !pregunta.trim() || pregunta.length > 1000) throw new Error('Escribí una pregunta de hasta 1000 caracteres.');
  if (opcion !== undefined && (typeof opcion !== 'string' || opcion.length > 100)) throw new Error('Opción inválida.');
  if (destino !== undefined && (typeof destino !== 'string' || destino.length > 100)) throw new Error('Destino inválido.');
  const base = { municipio: catalog.municipio, revisado_en: catalog.revisado_en,
    cobertura: { estado: catalog.cobertura.estado, pendientes: catalog.cobertura.pendientes },
    contactos: catalog.contactos.length ? catalog.contactos : [{ nombre: 'Portal oficial del municipio', url: catalog.fuente }],
  };
  const ranked = rank(catalog.tramites, pregunta);
  let chosen;
  if (opcion) {
    chosen = catalog.tramites.find(t => t.id === opcion);
    if (!chosen) throw new Error('La opción no pertenece al catálogo de este municipio.');
  } else {
    const close = ranked.filter(r => r.score >= ranked[0].score * 0.7).slice(0, 3);
    if (close.length > 1) return { ...base, estado: 'aclaracion', pregunta: '¿Cuál de estos trámites necesitás?', opciones: close.map(({ item }) => ({ id: item.id, nombre: item.nombre })) };
    chosen = ranked[0]?.item;
  }
  if (!chosen) return { ...base, estado: 'no_encontrado', mensaje: 'No encontramos ese trámite en el catálogo recorrido; eso no significa que no exista.',
    alternativas: catalog.tramites.slice(0, 3).map(t => ({ id: t.id, nombre: t.nombre, url: t.requisitos })),
    candidatos_sin_confirmar: rank(catalog.pendientes, pregunta).slice(0, 3).map(r => r.item) };
  const choices = chosen.destinos.map(d => ({ ...d, id: pageId(d.url) }));
  const selected = destino ? choices.find(d => d.id === destino) : (choices.length === 1 ? choices[0] : null);
  if (destino && !selected) throw new Error('El destino no pertenece al trámite elegido.');
  const tramite = { ...chosen, formulario: selected?.url || null };
  const guidance = { ...base, tramite,
    requisitos: chosen.secciones.filter(s => s.tipo === 'requisitos'),
    pasos: chosen.secciones.filter(s => s.tipo === 'pasos'),
    costos: chosen.secciones.filter(s => s.tipo === 'costos'),
    contacto_tramite: chosen.secciones.filter(s => s.tipo === 'contacto'),
    aviso: 'La información proviene de la ficha oficial y requiere revisión humana. Abrir un enlace no confirma que hayas completado el trámite.',
  };
  if (choices.length > 1 && !selected) return { ...guidance, estado: 'aclaracion_destino', pregunta: '¿Por cuál de estas opciones querés continuar?', opcion: chosen.id,
    opciones: choices.map(d => ({ id: d.id, nombre: d.texto, url: d.url })) };
  return { ...guidance, estado: selected ? 'listo' : 'solo_ficha', destino: selected,
    mensaje: selected ? 'Podés continuar en el portal enlazado por el municipio. Completá allí tus datos.' : 'Encontramos la ficha, pero no un acceso directo inequívoco. Consultá sus pasos o el contacto oficial.' };
}
