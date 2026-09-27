import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Store } from './store.mjs';
import { municipalities, buildCatalog } from './municipal.mjs';
import { normalizeUrl } from './network.mjs';
import { siteId } from './crawler.mjs';
import { catalogFromHtml } from './catalogo.mjs';
import { bobStatus } from './bob.mjs';
import { answerWithBob } from './asistente.mjs';

export function assistantRoutes(app, { dataDir, store, busy = () => false, run = answerWithBob, available = () => bobStatus().disponible, demoDir = fileURLToPath(new URL('./municipal-demo/', import.meta.url)), now = Date.now }) {
  const municipalitiesStore = new Store(path.join(dataDir, 'municipios'));
  const demo = demoDir ? new Store(demoDir) : null;
  const starts = new Map();
  let running = false, globalStarts = [];
  // Same question on the same catalogue reading → same validated answer, instantly,
  // without spending Bob, rate limit or waiting for another task. Memory only.
  const answers = new Map();
  const answerKey = (contexto, leido, pregunta, historial) => JSON.stringify([contexto, leido,
    pregunta.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[¿?¡!.,;:]+/g, ' ').replace(/\s+/g, ' ').trim(),
    historial.map(m => [m.rol, m.texto])]);
  async function sites() {
    const maps = (await store.list()).filter(x => x.mapa.catalogo);
    const municipal = await Promise.all(Object.entries(municipalities).map(async ([key, m]) => {
      const map = await municipalitiesStore.get(siteId(m.url)) || (demo && await demo.get(siteId(m.url)));
      return map ? { id: `municipio:${key}`, nombre: m.nombre, mapa: map } : null;
    }));
    return [...municipal.filter(Boolean), ...maps.map(x => ({ id: `sitio:${x.mapa.sitio.url}`, nombre: x.mapa.sitio.titulo || x.mapa.sitio.url, mapa: x.mapa }))];
  }
  app.get('/api/asistente/sitios', async (_req,res) => res.json({ disponible: available(), sitios: (await sites()).map(s => ({ id: s.id, nombre: s.nombre, url: s.mapa.sitio.url })) }));
  app.post('/api/asistente', async (req,res) => {
    const { contexto, pregunta, historial = [] } = req.body || {};
    if (typeof contexto !== 'string' || contexto.length > 2100 || typeof pregunta !== 'string' || !pregunta.trim() || pregunta.length > 1000 ||
      !Array.isArray(historial) || historial.length > 8 || historial.some(m => !m || !['user','assistant'].includes(m.rol) || typeof m.texto !== 'string' || m.texto.length > 1600)) return res.status(400).json({ error: 'Elegí un sitio y escribí una consulta de hasta 1000 caracteres.' });
    if (!available()) return res.status(503).json({ error: 'Bob no está disponible ahora. Podés seguir usando las fichas y sus accesos.' });
    const site = (await sites()).find(s => s.id === contexto);
    if (!site) return res.status(404).json({ error: 'Todavía no hay información de ese sitio. Abrí su dirección para crear el catálogo.' });
    const key = answerKey(contexto, site.mapa.sitio.crawleado_en, pregunta, historial);
    const saved = answers.get(key);
    if (saved && now() - saved.at < 3600000) return res.json({ ...saved.body, guardada: true });
    // Recheck after disk reads, then reserve synchronously.
    if (running || busy()) return res.status(409).json({ error: 'Bob está atendiendo otra tarea. Probá en un momento.' });
    const at = now();
    for (const [ip, times] of starts) if (!times.some(t => at - t < 600000)) starts.delete(ip);
    const recent = (starts.get(req.ip) || []).filter(t => at - t < 600000);
    globalStarts = globalStarts.filter(t => at - t < 3600000);
    if (recent.length >= 8 || globalStarts.length >= 60) return res.status(429).set('Retry-After', '600').json({ error: 'Llegamos al límite de consultas por ahora. Podés seguir con las fichas; probá con Bob más tarde.' });
    running = true; starts.set(req.ip, [...recent, at]); globalStarts.push(at);
    const controller = new AbortController(), workspace = path.join(dataDir, 'asistente-temporal', randomUUID());
    const timer = setTimeout(() => controller.abort(), 58000);
    const disconnected = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', disconnected);
    try {
      const result = await run(site.mapa.catalogo || catalogFromHtml(site.mapa), pregunta.trim(), historial, { workspace, signal: controller.signal });
      const candidates = site.id.startsWith('municipio:') ? buildCatalog(site.id.slice(10), site.mapa).contactos : site.mapa.paginas.flatMap(p => (p.municipal?.enlaces || []).filter(l => /^(contacto|contactos|contact|contact us|atenci[oó]n al cliente)$/i.test(l.texto)).map(l => ({ nombre: l.texto, url: l.url })));
      const contacts = [...new Map(candidates.filter(c => { try { normalizeUrl(c.url); return new URL(c.url).origin === new URL(site.mapa.sitio.url).origin; } catch { return false; } }).map(c => [c.url, { nombre: c.nombre, url: c.url }])).values()].slice(0, 3);
      const body = { ...result, contactos: contacts.length ? contacts : [{ nombre: 'Consultar el sitio de origen', url: site.mapa.sitio.url }] };
      answers.delete(key); answers.set(key, { at: now(), body });
      if (answers.size > 300) answers.delete(answers.keys().next().value);
      if (!controller.signal.aborted && !res.destroyed) res.json(body);
      else if (!res.destroyed) res.status(504).json({ error: 'La respuesta tardó demasiado. Volvé a intentarlo.' });
    } catch {
      if (!res.destroyed) res.status(502).json({ error: 'Bob no pudo completar esta respuesta. Tu consulta sigue disponible para reintentar; también podés explorar las fichas.' });
    } finally { clearTimeout(timer); res.off('close', disconnected); await rm(workspace, { recursive: true, force: true }).catch(() => {}); running = false; }
  });
  return () => running;
}
