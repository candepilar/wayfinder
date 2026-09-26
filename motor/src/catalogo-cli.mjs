import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crawlMunicipal } from './municipal-crawler.mjs';
import { organizeCatalog } from './catalogo.mjs';
import { Store } from './store.mjs';
import { siteId } from './crawler.mjs';

const [url, limit = '20'] = process.argv.slice(2);
if (!url) throw new Error('Uso: node --env-file-if-exists=.env src/catalogo-cli.mjs URL [1-200]');
const dataDir = process.env.WAYFINDER_DATA_DIR || fileURLToPath(new URL('../data/', import.meta.url));
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 600000);
try {
  const onEvent = event => { if (event.type !== 'bob_evento') console.log(JSON.stringify(event)); };
  const map = await crawlMunicipal(url, { maxPages: Number(limit), signal: controller.signal, onEvent });
  await organizeCatalog(map, { signal: controller.signal, onEvent, workspace: path.join(dataDir, 'bob', `catalogo-${Date.now()}`) });
  await new Store(path.join(dataDir, 'mapas')).save(siteId(url), map);
  console.log(JSON.stringify({ id: siteId(url), paginas: map.paginas.length, fichas: map.catalogo.fichas.map(f => ({ nombre: f.nombre, origen: f.origen, fuente: f.fuente, destinos: f.destinos })), bob: map.catalogo.bob, calidad: map.catalogo.calidad }));
} finally { clearTimeout(timer); }
