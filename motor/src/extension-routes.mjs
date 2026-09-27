import { normalizeUrl } from './network.mjs';

// Only these existing public operations may be called by an unpacked extension.
// An extension Origin is not authentication; public rate and network limits apply.
export function extensionRequest(req) {
  if (!/^chrome-extension:\/\/[a-p]{32}$/.test(req.headers.origin || '')) return false;
  const method = req.method === 'OPTIONS' ? req.headers['access-control-request-method'] : req.method;
  return method === 'GET' && (/^\/api\/asistente\/sitios$/.test(req.path) || /^\/api\/extension\/catalogo$/.test(req.path) || /^\/api\/recorridos\/[a-f0-9-]+$/.test(req.path) || /^\/api\/recorridos\/[a-f0-9-]+\/catalogo$/.test(req.path) || /^\/api\/mapas\/[a-f0-9]{20}\/catalogo$/.test(req.path))
    || method === 'POST' && (/^\/api\/asistente$/.test(req.path) || /^\/api\/recorridos$/.test(req.path) || /^\/api\/recorridos\/[a-f0-9-]+\/cancelar$/.test(req.path));
}

export function extensionRoutes(app, store) {
  app.get('/api/extension/catalogo', async (req, res) => {
    let url;
    try {
      if (typeof req.query.url !== 'string' || req.query.url.length > 2048) throw Error();
      url = new URL(normalizeUrl(req.query.url));
      if (!url.hostname.includes('.') || url.hostname.endsWith('.local') || url.hostname.endsWith('.localhost')) throw Error();
    } catch { return res.status(400).json({ error: 'Ingresá una dirección pública válida.' }); }
    // Read existing maps only; lookup never initiates a crawl or opens the URL.
    const host = u => new URL(u).hostname.replace(/^www\./, '');
    const matches = (await store.list()).filter(({ mapa }) => mapa.catalogo && host(mapa.sitio.url) === host(url.href));
    matches.sort((a,b) => Number(b.mapa.sitio.url === url.href) - Number(a.mapa.sitio.url === url.href)
      || String(b.mapa.sitio.crawleado_en).localeCompare(String(a.mapa.sitio.crawleado_en)));
    const match = matches[0];
    return res.json(match ? { mapaId: match.id, catalogo: match.mapa.catalogo } : { mapaId: null });
  });
}
