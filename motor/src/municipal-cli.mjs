import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crawlMunicipal } from './municipal-crawler.mjs';
import { municipalities, buildCatalog } from './municipal.mjs';
import { siteId } from './crawler.mjs';
import { Store } from './store.mjs';
import { auditSecurity } from './seguridad.mjs';
import { bobStatus } from './bob.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const [slug, limit = '40', ...flags] = process.argv.slice(2);
if (!Object.hasOwn(municipalities, slug)) throw new Error('Uso: node --env-file-if-exists=.env src/municipal-cli.mjs rosario|vgg [1-200] [--bob]');
if (flags.includes('--bob') && !bobStatus().disponible) throw new Error('Bob no está configurado. No se inicia una revisión ficticia.');
const dataDir = process.env.WAYFINDER_DATA_DIR || path.join(root, 'data');
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 600000);
try {
  const map = await crawlMunicipal(municipalities[slug].url, { maxPages: Number(limit), signal: controller.signal,
    onEvent: e => { if (e.type === 'pagina') console.log(JSON.stringify(e)); } });
  if (flags.includes('--bob')) {
    console.log(JSON.stringify({ type: 'bob_inicio', municipio: slug }));
    try { await auditSecurity(map, { signal: controller.signal, workspace: path.join(dataDir, 'bob', `municipal-${slug}-${Date.now()}`) }); }
    catch (error) { map.auditoria = { seguridad: { estado: 'error', error: error.message } }; }
  }
  await new Store(path.join(dataDir, 'municipios')).save(siteId(municipalities[slug].url), map);
  const c = buildCatalog(slug, map);
  const bob = map.auditoria?.seguridad;
  console.log(JSON.stringify({ municipio: slug, paginas: map.paginas.length, tramites: c.tramites.map(t => t.nombre), pendientes: c.pendientes.length, bob: bob ? { estado: bob.estado, hallazgos: bob.hallazgos?.length, task_id: bob.task_id, coste: bob.coste, error: bob.error } : null }));
} finally { clearTimeout(timer); }
