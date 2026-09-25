import { crawl, siteId } from './crawler.mjs';
import { Store } from './store.mjs';
import { fileURLToPath } from 'node:url';
const url = process.argv[2];
if (!url) { console.error('Uso: npm run crawl -- https://sitio.com 40'); process.exit(1); }
try {
  const map = await crawl(url, { maxPages: Number(process.argv[3] || 40), onEvent: event => console.error(JSON.stringify(event)) });
  await new Store(fileURLToPath(new URL('../data/mapas/', import.meta.url))).save(siteId(url), map);
  console.log(JSON.stringify(map, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
