import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './store.mjs';
import { siteId } from './crawler.mjs';
import { municipalities, buildCatalog, consultCatalog } from './municipal.mjs';

export function municipalRoutes(app, { dataDir, demoDir = fileURLToPath(new URL('./municipal-demo/', import.meta.url)) }) {
  const store = new Store(path.join(dataDir, 'municipios'));
  const demo = demoDir ? new Store(demoDir) : null;
  const read = async id => (await store.get(id)) || (demo ? await demo.get(id) : null);
  app.get('/api/municipios', async (_req, res) => {
    const result = await Promise.all(Object.entries(municipalities).map(async ([id, m]) => {
      const map = await read(siteId(m.url));
      return { id, ...m, disponible: Boolean(map), revisado_en: map?.sitio.crawleado_en || null };
    }));
    res.json(result);
  });
  app.use('/api/municipios/:municipio', async (req, res, next) => {
    const m = municipalities[req.params.municipio];
    if (!m || !Object.hasOwn(municipalities, req.params.municipio)) return res.status(404).json({ error: 'Municipio no configurado.' });
    const map = await read(siteId(m.url));
    if (!map) return res.status(503).json({ error: 'Todavía no hay un recorrido municipal publicado.', municipio: req.params.municipio });
    res.locals.map = map;
    res.locals.catalog = buildCatalog(req.params.municipio, map);
    next();
  });
  app.get('/api/municipios/:municipio/catalogo', (_req, res) => {
    const c = res.locals.catalog;
    res.json({ municipio: c.municipio, nombre: c.nombre, revisado_en: c.revisado_en,
      cobertura: { estado: c.cobertura.estado, pendientes: c.cobertura.pendientes }, contactos: c.contactos,
      tramites: c.tramites.map(t => ({ id: t.id, nombre: t.nombre, requisitos: t.requisitos })) });
  });
  app.post('/api/municipios/:municipio/consulta', (req, res) => {
    try { res.json(consultCatalog(res.locals.catalog, req.body || {})); }
    catch (error) { res.status(400).json({ error: error.message }); }
  });
  // Technical demo data is public, like the existing map endpoints. This is NOT
  // an authenticated municipal administration area.
  app.get('/api/municipios/:municipio/diagnostico', (_req, res) => res.json({
    municipio: res.locals.catalog.municipio, cobertura: res.locals.map.ejecucion,
    auditoria: res.locals.map.auditoria || null,
    paginas: res.locals.map.paginas.map(p => ({ id: p.id, titulo: p.titulo, url: p.url, enlaces: p.enlaces })),
  }));
  return store;
}
