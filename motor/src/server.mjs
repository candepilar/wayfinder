import express from 'express';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { crawl, siteId } from './crawler.mjs';
import { normalizeUrl } from './network.mjs';
import { queryMap } from './search.mjs';
import { Store } from './store.mjs';
import { analyzeWithBob, bobStatus } from './bob.mjs';
import { auditSecurity } from './seguridad.mjs';
import { codeRoutes } from './codigo-routes.mjs';
import { municipalRoutes } from './municipal-routes.mjs';
import { crawlMunicipal } from './municipal-crawler.mjs';
import { compararCatalogos, organizeCatalog } from './catalogo.mjs';
import { assistantRoutes } from './asistente-routes.mjs';
import { extensionRequest, extensionRoutes } from './extension-routes.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export function createApp({ dataDir = process.env.WAYFINDER_DATA_DIR || path.join(root, 'data'), allowLocal = process.env.WAYFINDER_ALLOW_LOCAL === '1', allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean), maxPagesLimit = Number(process.env.MAX_PAGES || 200), maxMaps = Number(process.env.MAX_MAPS || 100), municipalDemoDir, organize = organizeCatalog } = {}) {
  const app = express();
  const store = new Store(path.join(dataDir, 'mapas'));
  const jobs = new Map();
  const starts = new Map();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin) && !/^http:\/\/(localhost|127\.0\.0\.1):(3001|3101)$/.test(origin) && !extensionRequest(req)) return res.status(403).json({ error: 'Origen no permitido.' });
    if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  let assistantBusy = () => false;
  const codeBusy = codeRoutes(app, { dataDir, busy: () => assistantBusy() || [...jobs.values()].some(j => j.estado === 'en_curso') });
  app.use(express.json({ limit: '16kb' }));
  // The assistant (one short Bob call) may run while a catalogue is being built:
  // otherwise every visitor gets «Bob está ocupado» for minutes. Code review,
  // the heaviest task, stays exclusive; crawls stay one at a time.
  assistantBusy = assistantRoutes(app, { dataDir, store, demoDir: municipalDemoDir, busy: () => codeBusy() });
  municipalRoutes(app, { dataDir, demoDir: municipalDemoDir });
  extensionRoutes(app, store);
  app.get('/api/salud', (_req,res) => res.json({ estado: 'ok', bob: bobStatus(), trabajos_activos: [...jobs.values()].filter(j => j.estado === 'en_curso').length }));
  app.get('/api/mapas', async (_req,res) => res.json(await store.list()));
  app.get('/api/mapas/:id', async (req,res) => { const map = await store.get(req.params.id); return map ? res.json(map) : res.status(404).json({ error: 'Mapa no encontrado.' }); });
  app.get('/api/mapas/:id/catalogo', async (req,res) => {
    const map = await store.get(req.params.id);
    if (!map) return res.status(404).json({ error: 'Mapa no encontrado.' });
    if (!map.catalogo) return res.status(404).json({ error: 'Este mapa todavía no tiene un catálogo organizado.' });
    if (req.query.descargar === '1') res.setHeader('Content-Disposition', `attachment; filename="wayfinder-catalogo-${req.params.id}.json"`);
    res.json(map.catalogo);
  });
  app.get('/api/mapas/:id/archivo', async (req,res) => {
    const map = await store.get(req.params.id);
    if (!map) return res.status(404).json({ error: 'Mapa no encontrado.' });
    res.setHeader('Content-Disposition', `attachment; filename="wayfinder-${req.params.id}.json"`);
    res.type('application/json').send(JSON.stringify(map, null, 2));
  });
  app.post('/api/mapas/:id/consulta', async (req,res) => {
    if (typeof req.body?.pregunta !== 'string' || !req.body.pregunta.trim() || req.body.pregunta.length > 1000) return res.status(400).json({ error: 'Escribí una pregunta de hasta 1000 caracteres.' });
    const map = await store.get(req.params.id);
    return map ? res.json(queryMap(map, req.body.pregunta)) : res.status(404).json({ error: 'Mapa no encontrado.' });
  });
  app.post('/api/recorridos', async (req,res) => {
    if (codeBusy()) return res.status(409).json({ error: 'Bob está atendiendo otra tarea. Probá en un momento.' });
    let url;
    try { if (typeof req.body?.url !== 'string' || req.body.url.length > 2048) throw new Error('Ingresá una dirección válida.'); url = normalizeUrl(req.body.url); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    const maxPages = req.body.maxPaginas ?? 40;
    if (req.body.catalogo !== undefined && typeof req.body.catalogo !== 'boolean') return res.status(400).json({ error: 'catalogo debe ser verdadero o falso.' });
    if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > maxPagesLimit) return res.status(400).json({ error: `El límite debe estar entre 1 y ${maxPagesLimit} páginas.` });
    if ((req.body.bob || req.body.seguridad) && !bobStatus().disponible) return res.status(409).json({ error: 'Bob Shell todavía no tiene una API key configurada. Podés recorrer el HTML ahora.' });
    if ([...jobs.values()].some(j => j.estado === 'en_curso')) return res.status(409).json({ error: 'Ya hay un recorrido en curso. Esperá o cancelalo.' });
    const now = Date.now();
    for (const [ip,history] of starts) if (!history.some(time => now-time < 600000)) starts.delete(ip);
    const recent = (starts.get(req.ip) || []).filter(time => now-time < 600000);
    if (recent.length >= 3) return res.status(429).json({ error: 'Alcanzaste tres recorridos en diez minutos. Esperá un momento para iniciar otro.' });
    if (!(await store.get(siteId(url))) && (await store.count()) >= maxMaps) return res.status(409).json({ error: 'El catálogo alcanzó su capacidad. Podés consultar los mapas existentes.' });
    // Recheck after filesystem awaits, so simultaneous POSTs cannot reserve two workers.
    if (codeBusy() || [...jobs.values()].some(j => j.estado === 'en_curso')) return res.status(409).json({ error: 'Ya hay un análisis en curso.' });
    starts.set(req.ip,[...recent,now]);
    // Keep bounded in-memory event history; completed maps are persisted separately.
    while (jobs.size >= 30) jobs.delete(jobs.keys().next().value);
    const id = randomUUID();
    const job = { id, url, estado: 'en_curso', eventos: [], listeners: new Set(), controller: new AbortController(), mapaId: null, error: null };
    jobs.set(id, job);
    const emit = event => {
      const data = { secuencia: job.eventos.length + 1, ...event };
      job.eventos.push(data); job.listeners.forEach(listener => listener(data));
    };
    res.status(202).json({ id, estado: job.estado });
    void (async () => {
      const deadline = setTimeout(() => job.controller.abort(), 600000);
      try {
        const map = await (req.body.catalogo ? crawlMunicipal : crawl)(url, { maxPages, onEvent: emit, signal: job.controller.signal, allowLocal });
        if (req.body.catalogo) await organize(map, { signal: job.controller.signal, onEvent: emit, workspace: path.join(dataDir, 'bob', `${id}-catalogo`) });
        if (req.body.bob) {
          emit({ type: 'bob_inicio', at: new Date().toISOString() });
          try { await analyzeWithBob(map, { signal: job.controller.signal, onEvent: emit, workspace: path.join(dataDir, 'bob', id) }); }
          catch (error) { map.ejecucion.bob = { estado: 'error', error: error.message }; map.ejecucion.advertencias.push(error.message); }
        }
        if (req.body.seguridad) {
          try { await auditSecurity(map, { signal: job.controller.signal, onEvent: emit, workspace: path.join(dataDir, 'bob', id), allowLocal }); }
          catch (error) { map.auditoria = { ...(map.auditoria || {}), seguridad: { estado: 'error', error: error.message } }; map.ejecucion.advertencias.push(`Seguridad: ${error.message}`); }
        }
        if (job.controller.signal.aborted) throw new Error('Recorrido cancelado.');
        job.mapaId = siteId(url);
        // Antes de pisar la lectura anterior, se registra qué cambió en el sitio.
        if (map.catalogo) map.catalogo.mantenimiento = compararCatalogos((await store.get(job.mapaId))?.catalogo, map.catalogo);
        await store.save(job.mapaId, map);
        job.estado = 'completado';
        emit({ type: 'completado', mapaId: job.mapaId, paginas: map.paginas.length, at: new Date().toISOString() });
      } catch (error) {
        job.estado = job.controller.signal.aborted ? 'cancelado' : 'error';
        job.error = error.message;
        emit({ type: job.estado, mensaje: error.message, at: new Date().toISOString() });
      } finally { clearTimeout(deadline); }
    })();
  });
  app.get('/api/recorridos/:id', (req,res) => {
    const j = jobs.get(req.params.id);
    return j ? res.json({ id: j.id, url: j.url, estado: j.estado, mapaId: j.mapaId, error: j.error, eventos: j.eventos }) : res.status(404).json({ error: 'Recorrido no encontrado; puede que el motor se haya reiniciado.' });
  });
  app.post('/api/recorridos/:id/cancelar', (req,res) => {
    const j = jobs.get(req.params.id);
    if (!j) return res.status(404).json({ error: 'Recorrido no encontrado.' });
    if (j.estado === 'en_curso') j.controller.abort();
    res.json({ estado: j.estado === 'en_curso' ? 'cancelando' : j.estado });
  });
  app.get('/api/recorridos/:id/eventos', (req,res) => {
    const j = jobs.get(req.params.id);
    if (!j) return res.status(404).json({ error: 'Recorrido no encontrado.' });
    res.set({ 'Content-Type': 'text/event-stream', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    const after = Number(req.headers['last-event-id'] || 0);
    const send = event => res.write(`id: ${event.secuencia}\ndata: ${JSON.stringify(event)}\n\n`);
    j.eventos.filter(e => e.secuencia > after).forEach(send);
    if (j.estado !== 'en_curso') return res.end();
    const listener = event => { send(event); if (['completado','error','cancelado'].includes(event.type)) res.end(); };
    j.listeners.add(listener);
    const timer = setInterval(() => res.write(': heartbeat\n\n'), 15000);
    req.on('close', () => { clearInterval(timer); j.listeners.delete(listener); });
  });
  app.use((error,_req,res,_next) => res.status(error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 500).json({ error: error.type === 'entity.too.large' ? 'La consulta es demasiado larga. Empezá una conversación nueva.' : error.type === 'entity.parse.failed' ? 'JSON inválido.' : 'El motor no pudo completar la operación.' }));
  return { app, store, jobs };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { app, jobs } = createApp();
  const port = Number(process.env.PORT || 3101);
  const server = app.listen(port, '127.0.0.1', () => console.log(`Wayfinder motor: http://127.0.0.1:${port}`));
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => { jobs.forEach(j => j.controller.abort()); server.close(() => process.exit(0)); });
}
