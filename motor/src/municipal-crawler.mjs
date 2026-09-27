import robotsParser from 'robots-parser';
import { requestText, normalizeUrl } from './network.mjs';
import { extractPage } from './crawler.mjs';
import { extractMunicipal, priorityOf } from './municipal.mjs';
import { navigationLinks, missingContent } from './discovery.mjs';

const asset = /\.(pdf|zip|gz|jpe?g|png|gif|svg|webp|mp[34]|docx?|xlsx?|css|js|xml|json)(\?|$)/i;
const transactional = /\/(login|logout|registrar|registrate|registro-usuario|ingreso|auth|form|formularios)(\/|$)/i;

// Separate scheduler while crawler.mjs is reserved by Cande. Reuses its extractor
// and network protection; does not submit forms or visit action destinations.
export async function crawlMunicipal(input, { maxPages = 40, allowLocal = false, signal, onEvent = () => {} } = {}) {
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 200) throw new Error('El límite debe estar entre 1 y 200.');
  const seed = normalizeUrl(input);
  let origin = new URL(seed).origin;
  const options = { allowLocal, signal, allowedUrl: url => new URL(url).origin === origin };
  const response = await requestText(`${origin}/robots.txt`, { allowLocal, signal });
  if ([401, 403].includes(response.status) || response.status >= 500) throw new Error('No se pudo comprobar robots.txt.');
  let robots = response.status === 200 ? robotsParser(`${origin}/robots.txt`, response.body) : null;
  const allowed = url => new URL(url).origin === origin && robots?.isAllowed(url, 'WayfinderBot') !== false;
  if (!allowed(seed)) throw new Error('robots.txt no permite la página inicial.');
  let delay = Math.max(150, (robots?.getCrawlDelay('WayfinderBot') || 0) * 1000);
  if (delay > 60000) throw new Error('Crawl-delay requiere una configuración especial.');
  const queue = [{ url: seed, priority: 100 }], seen = new Set([seed]), pages = [], errors = [], omitted = [];
  let attempted = 0;
  const started = Date.now();
  while (queue.length && attempted < maxPages) {
    signal?.throwIfAborted();
    queue.sort((a, b) => b.priority - a.priority);
    const { url } = queue.shift();
    attempted++;
    onEvent({ type: 'leyendo', url, intentadas: attempted });
    try {
      const first = attempted === 1;
      // The initial address can redirect to its canonical host. Public-network
      // checks still apply on every redirect; subsequent discovery is same-origin.
      const r = await requestText(url, { ...options, allowedUrl: first ? undefined : allowed });
      if (first && new URL(r.url).origin !== origin) {
        origin = new URL(r.url).origin;
        const canonicalRobots = await requestText(`${origin}/robots.txt`, options);
        if ([401,403].includes(canonicalRobots.status) || canonicalRobots.status >= 500) throw new Error('No se pudo verificar robots.txt del destino.');
        robots = canonicalRobots.status === 200 ? robotsParser(`${origin}/robots.txt`, canonicalRobots.body) : null;
        if (!allowed(r.url)) throw new Error('robots.txt no permite la página de destino.');
        delay = Math.max(150, (robots?.getCrawlDelay('WayfinderBot') || 0) * 1000);
        if (delay > 60000) throw new Error('Crawl-delay requiere una configuración especial.');
      }
      if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
      if (!/text\/html|application\/xhtml\+xml/i.test(r.headers['content-type'] || '')) throw new Error('No es HTML público.');
      if (pages.some(p => p.url === r.url)) continue;
      seen.add(r.url);
      const p = extractPage(r.body, r.url, r.headers);
      p.municipal = extractMunicipal(r.body, r.url);
      pages.push(p);
      // Rich links first; remaining ordinary links still enter the queue.
      const rich = [...p.municipal.enlaces, ...navigationLinks(r.body, r.url)];
      const indexed = new Map(rich.map(l => [l.url, l]));
      // extractPage does not honor <base>; the municipal extractor does. Avoid
      // reintroducing incorrectly resolved relative links via the old extractor.
      for (const target of [...new Set(rich.map(l => l.url))]) {
        const link = indexed.get(target) || { url: target, texto: '', seguir: true };
        if (seen.has(target) || new URL(target).origin !== origin || asset.test(target)) continue;
        seen.add(target);
        if (!link.seguir || link.accion || transactional.test(new URL(target).pathname) || !allowed(target)) {
          omitted.push({ url: target, motivo: 'robots, nofollow o destino de gestión' }); continue;
        }
        if (queue.length < 3000) queue.push({ url: target, priority: priorityOf(link) });
        else omitted.push({ url: target, motivo: 'límite de cola' });
      }
      onEvent({ type: 'pagina', url: p.url, tramite: p.municipal.tramite?.nombre || null, leidas: pages.length });
    } catch (error) {
      signal?.throwIfAborted();
      errors.push({ url, error: error.message });
      if (!pages.length) throw error;
    }
    if (queue.length && attempted < maxPages) await new Promise((resolve, reject) => {
      const done = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); resolve(); };
      const abort = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(new Error('Recorrido cancelado.')); };
      const timer = setTimeout(done, delay);
      signal?.addEventListener('abort', abort, { once: true });
    });
  }
  const ids = new Map(pages.map(p => [p.url, p.id]));
  const unavailable = missingContent(pages);
  for (const page of pages) { page.enlaces = [...new Set(page.links.map(l => ids.get(l)).filter(Boolean))]; delete page.links; }
  return { sitio: { url: pages[0]?.url || seed, titulo: pages[0]?.titulo || seed, crawleado_en: new Date().toISOString(), paginas_totales: pages.length }, paginas: pages,
    ejecucion: { estado: queue.length || errors.length || omitted.length || unavailable.length ? 'parcial' : 'completado', limite: maxPages, intentadas: attempted,
      pendientes: queue.length, omitidas: omitted.length, exclusiones: omitted, errores: errors,
      sin_contenido_util: unavailable,
      advertencias: unavailable.length ? ['Hay páginas sin contenido útil en el HTML público. Pueden depender de JavaScript o restringir la lectura; el recorrido no equivale a cobertura completa. Usá los accesos visibles de la extensión en la página abierta.'] : [], duracion_ms: Date.now() - started,
      alcance: 'HTML público del mismo origen. Sin sesiones, JavaScript ni acceso a destinos de gestión detectados. Clasificación heurística; requiere revisión humana.' } };
}
