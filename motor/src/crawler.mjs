import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import robotsParser from 'robots-parser';
import { normalizeUrl, requestText } from './network.mjs';

const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
const unique = values => [...new Set(values.filter(Boolean))];
export const pageId = url => `p_${createHash('sha256').update(url).digest('hex').slice(0, 16)}`;
export const siteId = url => createHash('sha256').update(normalizeUrl(url)).digest('hex').slice(0, 20);
const downloadable = /\.(pdf|zip|gz|jpe?g|png|gif|webp|svg|ico|mp[34]|webm|docx?|xlsx?|pptx?|woff2?|css|js|xml|json)(?:\?|$)/i;

// Cabeceras que importan para la revisión técnica. Las cookies se guardan sin su
// valor: alcanza con el nombre y los atributos para evaluarlas.
const TECH_HEADERS = ['strict-transport-security', 'content-security-policy', 'content-security-policy-report-only', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy', 'cross-origin-opener-policy', 'access-control-allow-origin', 'server', 'x-powered-by', 'x-aspnet-version', 'x-aspnetmvc-version', 'x-generator', 'set-cookie'];
const cookieShape = raw => { const [pair, ...attrs] = String(raw).split(';'); return [pair.split('=')[0].trim(), ...attrs.map(a => a.trim()).filter(Boolean)].join('; ').slice(0, 300); };

export function extractTechnical($, url, headers = {}) {
  const cabeceras = {};
  for (const name of TECH_HEADERS) if (headers[name] !== undefined) cabeceras[name] = name === 'set-cookie' ? [].concat(headers[name]).slice(0, 20).map(cookieShape) : String(headers[name]).slice(0, 800);
  const origin = new URL(url).origin;
  const abs = value => { try { return new URL(value, url).href; } catch { return null; } };
  const scripts = $('script[src]').map((_i, el) => {
    const src = abs($(el).attr('src'));
    return src && { src: src.slice(0, 300), externo: new URL(src).origin !== origin, integrity: $(el).attr('integrity') !== undefined };
  }).get().filter(Boolean).slice(0, 40);
  const https = url.startsWith('https:');
  const mixto = https ? unique($('script[src],link[href][rel~=stylesheet],img[src],iframe[src],audio[src],video[src],source[src]').map((_i, el) => $(el).attr('src') || $(el).attr('href')).get().filter(v => /^http:\/\//i.test(v))).slice(0, 20) : [];
  const formularios = $('form').map((_i, form) => ({
    accion: abs($(form).attr('action') || url)?.slice(0, 300) || '',
    metodo: ($(form).attr('method') || 'get').toLowerCase(),
    con_clave: $(form).find('input[type=password]').length > 0,
  })).get().slice(0, 20);
  const iframes = $('iframe[src]').map((_i, el) => ({ src: abs($(el).attr('src'))?.slice(0, 300), sandbox: $(el).attr('sandbox') !== undefined })).get().filter(f => f.src).slice(0, 20);
  return {
    cabeceras,
    cabeceras_ausentes: TECH_HEADERS.slice(0, 8).filter(name => headers[name] === undefined),
    generador: clean($('meta[name=generator]').attr('content')).slice(0, 200) || null,
    scripts,
    scripts_en_linea: $('script:not([src])').length,
    manejadores_en_linea: $('[onclick],[onload],[onerror],[onmouseover],[onsubmit],[onchange]').length,
    blank_sin_noopener: $('a[target=_blank]').filter((_i, a) => !/noopener|noreferrer/i.test($(a).attr('rel') || '')).length,
    contenido_mixto: mixto,
    formularios,
    iframes,
  };
}

export function extractPage(html, url, headers) {
  const $ = load(html);
  const tecnico = extractTechnical($, url, headers);
  const forms = $('form').map((_i, form) => ({
    nombre: clean($(form).attr('aria-label') || $(form).find('legend,h2,h3').first().text() || 'Formulario'),
    campos: unique($(form).find('input:not([type=hidden]):not([type=submit]),select,textarea').map((_j, field) => {
      const id = $(field).attr('id');
      const label = id ? $('label').filter((_k, item) => $(item).attr('for') === id).first().text() : '';
      return clean(label || $(field).attr('aria-label') || $(field).closest('label').text() || $(field).attr('placeholder') || $(field).attr('name'));
    }).get()),
    destino: safeUrl($(form).attr('action') || url, url),
  })).get();
  const links = unique($('a[href]').map((_i, link) => safeUrl($(link).attr('href'), url)).get());
  const actions = unique($('button,input[type=submit],a[role=button]').map((_i, el) => clean($(el).text() || $(el).attr('value') || $(el).attr('aria-label'))).get()).slice(0, 40);
  const title = clean($('title').first().text() || $('h1').first().text() || new URL(url).pathname);
  const description = clean($('meta[name=description]').attr('content') || $('meta[property="og:description"]').attr('content'));
  const headings = unique($('h1,h2,h3').map((_i, el) => clean($(el).text())).get()).slice(0, 100);
  const nofollow = /nofollow/i.test($('meta[name=robots]').attr('content') || '');
  $('script,style,noscript,svg,template,nav,footer,header,[hidden],[aria-hidden=true]').remove();
  const main = $('main,[role=main],article').first();
  const text = clean((main.length ? main : $('body')).text()).slice(0, 70000);
  return {
    id: pageId(url), url, titulo: title, headings, acciones: actions, formularios: forms,
    texto: text, descripcion: description, origen: 'html', enlaces: [], tecnico,
    camino: [...new URL(url).pathname.split('/').filter(Boolean), ...(new URL(url).search ? [new URL(url).search] : [])],
    links: nofollow ? [] : links,
  };
}

function safeUrl(value, base) { try { return normalizeUrl(value, base); } catch { return null; } }

export async function crawl(input, { maxPages = 40, concurrency = 3, signal, onEvent = () => {}, allowLocal = false } = {}) {
  const started = Date.now();
  const seed = normalizeUrl(input);
  const max = Math.max(1, Math.min(200, Number(maxPages) || 40));
  const workers = Math.max(1, Math.min(4, Number(concurrency) || 3));
  const options = { signal, allowLocal };
  const errors = [];
  const warnings = [];
  const emit = (type, data) => onEvent({ type, at: new Date().toISOString(), ...data });
  emit('inicio', { url: seed, limite: max, trabajadores: workers });
  const robotsUrl = `${new URL(seed).origin}/robots.txt`;
  let robots;
  try {
    const response = await requestText(robotsUrl, options);
    if (response.status === 200) robots = robotsParser(robotsUrl, response.body);
    else if (response.status === 401 || response.status === 403 || response.status >= 500) throw new Error(`robots.txt respondió HTTP ${response.status}`);
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(`No se pudo verificar robots.txt: ${error.message}`);
  }
  if (robots?.isAllowed(seed, 'WayfinderBot') === false) throw new Error('El sitio no permite recorrer esta dirección según robots.txt.');
  const initial = await requestText(seed, options);
  if (initial.status !== 200) throw new Error(`La página inicial respondió HTTP ${initial.status}.`);
  if (!/text\/html|application\/xhtml\+xml/i.test(initial.headers['content-type'] || '')) throw new Error('La dirección inicial no devuelve una página HTML.');
  const origin = new URL(initial.url).origin;
  // If the homepage changes origin, obtain the destination robots policy too.
  if (origin !== new URL(seed).origin) {
    const r = await requestText(`${origin}/robots.txt`, options);
    if (r.status === 401 || r.status === 403 || r.status >= 500) throw new Error('No se pudo verificar robots.txt del destino.');
    robots = r.status === 200 ? robotsParser(`${origin}/robots.txt`, r.body) : undefined;
    if (robots?.isAllowed(initial.url, 'WayfinderBot') === false) throw new Error('robots.txt no permite la página de destino.');
  }
  const pages = [];
  const queue = [];
  const seen = new Set([seed, initial.url]);
  const aliases = new Map([[seed, initial.url]]);
  let omitted = 0;
  let attempted = 1;
  function add(response) {
    if (pages.some(p => p.url === response.url)) return;
    const page = extractPage(response.body, response.url, response.headers);
    pages.push(page);
    for (const link of page.links) {
      if (new URL(link).origin !== origin || downloadable.test(link) || seen.has(link)) continue;
      seen.add(link);
      if (robots?.isAllowed(link, 'WayfinderBot') === false) { omitted++; continue; }
      if (queue.length < 5000) queue.push(link); else omitted++;
    }
    emit('pagina', { id: page.id, url: page.url, titulo: page.titulo, leidas: pages.length, pendientes: queue.length });
  }
  add(initial);
  const requiredDelay = (robots?.getCrawlDelay('WayfinderBot') || 0) * 1000;
  if (requiredDelay > 60000) throw new Error('El sitio exige más de 60 segundos entre páginas; este recorrido requiere una configuración especial.');
  const delay = Math.max(150, requiredDelay);
  const allowedUrl = destination => new URL(destination).origin === origin && robots?.isAllowed(destination, 'WayfinderBot') !== false;
  while (queue.length && attempted < max && !signal?.aborted) {
    if (requiredDelay) await new Promise(resolve => {
      const timer = setTimeout(finish, delay);
      function finish() { clearTimeout(timer); signal?.removeEventListener('abort', finish); resolve(); }
      signal?.addEventListener('abort', finish, { once: true });
    });
    if (signal?.aborted) break;
    const batch = queue.splice(0, Math.min(requiredDelay ? 1 : workers, max - attempted));
    attempted += batch.length;
    await Promise.all(batch.map(async url => {
      emit('leyendo', { url });
      try {
        const response = await requestText(url, { ...options, allowedUrl });
        if (new URL(response.url).origin !== origin) throw new Error('La redirección sale del sitio.');
        if (robots?.isAllowed(response.url, 'WayfinderBot') === false) throw new Error('El destino está excluido por robots.txt.');
        if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
        if (!/text\/html|application\/xhtml\+xml/i.test(response.headers['content-type'] || '')) { omitted++; return; }
        aliases.set(url, response.url);
        seen.add(response.url);
        add(response);
      } catch (error) {
        if (!signal?.aborted) { errors.push({ url, error: error.message }); emit('error_pagina', { url, mensaje: error.message }); }
      }
    }));
    if (!requiredDelay && queue.length && attempted < max) await new Promise(resolve => setTimeout(resolve, delay));
  }
  if (signal?.aborted) throw new Error('Recorrido cancelado.');
  const ids = new Map(pages.map(p => [p.url, p.id]));
  for (const page of pages) {
    page.enlaces = unique(page.links.map(link => ids.get(aliases.get(link) || link)));
    delete page.links;
    if (page.texto.length < 80) warnings.push(`Poco texto en ${page.url}: puede requerir JavaScript.`);
  }
  pages.sort((a,b) => a.url === initial.url ? -1 : b.url === initial.url ? 1 : a.url.localeCompare(b.url));
  const map = {
    sitio: { url: initial.url, titulo: pages[0].titulo, crawleado_en: new Date().toISOString(), paginas_totales: pages.length },
    paginas: pages,
    ejecucion: { origen: 'html', estado: queue.length || errors.length ? 'parcial' : 'completado', limite: max, intentadas: attempted, pendientes: queue.length, omitidas: omitted, errores: errors, advertencias: warnings, duracion_ms: Date.now() - started, alcance: 'HTML público enlazado del mismo origen; sin ejecutar JavaScript ni enviar formularios.' },
  };
  emit('crawl_completado', { paginas: pages.length, duracion_ms: map.ejecucion.duracion_ms, estado: map.ejecucion.estado });
  return map;
}
