import express from 'express';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { crawl, siteId } from './crawler.mjs';
import { normalizeUrl } from './network.mjs';
import { queryMap } from './search.mjs';
import { Store } from './store.mjs';
import { analyzeWithBob, bobStatus } from './bob.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export function createApp({ dataDir = path.join(root, 'data'), allowLocal = process.env.WAYFINDER_ALLOW_LOCAL === '1' } = {}) {
  const app = express();
  const store = new Store(path.join(dataDir, 'mapas'));
  const jobs = new Map();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && !/^http:\/\/(localhost|127\.0\.0\.1):(3001|3101)$/.test(origin)) return res.status(403).json({ error: 'Origen no permitido.' });
    if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/salud', (_req,res) => res.json({ estado: 'ok', bob: bobStatus(), trabajos_activos: [...jobs.values()].filter(j => j.estado === 'en_curso').length }));
  app.get('/api/mapas', async (_req,res) => res.json(await store.list()));
  app.get('/api/mapas/:id', async (req,res) => { const map = await store.get(req.params.id); return map ? res.json(map) : res.status(404).json({ error: 'Mapa no encontrado.' }); });
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
  app.post('/api/recorridos', (req,res) => {
    let url;
    try { if (typeof req.body?.url !== 'string' || req.body.url.length > 2048) throw new Error('Ingresá una dirección válida.'); url = normalizeUrl(req.body.url); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    const maxPages = req.body.maxPaginas ?? 40;
    if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 200) return res.status(400).json({ error: 'El límite debe estar entre 1 y 200 páginas.' });
    if (req.body.bob && !bobStatus().disponible) return res.status(409).json({ error: 'Bob Shell todavía no tiene una API key configurada. Podés recorrer el HTML ahora.' });
    if ([...jobs.values()].some(j => j.estado === 'en_curso')) return res.status(409).json({ error: 'Ya hay un recorrido en curso. Esperá o cancelalo.' });
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
      try {
        const map = await crawl(url, { maxPages, onEvent: emit, signal: job.controller.signal, allowLocal });
        if (req.body.bob) {
          emit({ type: 'bob_inicio', at: new Date().toISOString() });
          try { await analyzeWithBob(map, { signal: job.controller.signal, onEvent: emit, workspace: path.join(dataDir, 'bob', id) }); }
          catch (error) { map.ejecucion.bob = { estado: 'error', error: error.message }; map.ejecucion.advertencias.push(error.message); }
        }
        if (job.controller.signal.aborted) throw new Error('Recorrido cancelado.');
        job.mapaId = siteId(url);
        await store.save(job.mapaId, map);
        job.estado = 'completado';
        emit({ type: 'completado', mapaId: job.mapaId, paginas: map.paginas.length, at: new Date().toISOString() });
      } catch (error) {
        job.estado = job.controller.signal.aborted ? 'cancelado' : 'error';
        job.error = error.message;
        emit({ type: job.estado, mensaje: error.message, at: new Date().toISOString() });
      }
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
  app.use((error,_req,res,_next) => res.status(error.type === 'entity.parse.failed' ? 400 : 500).json({ error: error.type === 'entity.parse.failed' ? 'JSON inválido.' : 'El motor no pudo completar la operación.' }));
  return { app, store, jobs };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { app, jobs } = createApp();
  const port = Number(process.env.PORT || 3101);
  const server = app.listen(port, '127.0.0.1', () => console.log(`Wayfinder motor: http://127.0.0.1:${port}`));
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => { jobs.forEach(j => j.controller.abort()); server.close(() => process.exit(0)); });
}
