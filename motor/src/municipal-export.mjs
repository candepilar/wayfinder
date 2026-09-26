// Prepare public demo snapshots from already completed real crawls. No .env,
// raw HTML, cookies, session URLs or consultation history are exported.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './store.mjs';
import { siteId } from './crawler.mjs';
import { municipalities } from './municipal.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const input = new Store(path.join(process.env.WAYFINDER_DATA_DIR || path.join(root, 'data'), 'municipios'));
const output = new Store(fileURLToPath(new URL('./municipal-demo/', import.meta.url)));
const transient = value => {
  try { return [...new URL(value).searchParams.keys()].some(k => /^(state|nonce|session|token|code)$/i.test(k)); }
  catch { return true; }
};
for (const [id, m] of Object.entries(municipalities)) {
  const map = await input.get(siteId(m.url));
  if (!map) throw new Error(`Falta un recorrido real de ${id}.`);
  const s = map.auditoria?.seguridad;
  const snapshot = { preparado_para_demo: true, sitio: map.sitio, ejecucion: map.ejecucion,
    paginas: map.paginas.map(p => ({ id: p.id, titulo: p.titulo, url: p.url, enlaces: p.enlaces,
      municipal: { ...p.municipal, enlaces: p.municipal.enlaces.filter(l => !transient(l.url)) } })),
    auditoria: s ? { seguridad: { estado: s.estado, generado_en: s.generado_en, duracion_ms: s.duracion_ms,
      resumen: s.resumen, hallazgos: s.hallazgos, descartados_por_falta_de_prueba: s.descartados_por_falta_de_prueba,
      task_id: s.task_id, coste: s.coste, error: s.error } } : null,
  };
  await output.save(siteId(m.url), snapshot);
  console.log(JSON.stringify({ municipio: id, paginas: snapshot.paginas.length, bob: s?.estado, bytes: JSON.stringify(snapshot).length }));
}
