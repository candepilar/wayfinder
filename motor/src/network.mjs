import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

export function normalizeUrl(input, base) {
  const raw = String(input).trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) && !/^https?:\/\//i.test(raw)) throw new Error('Usá una URL http o https.');
  const url = new URL(base || /^https?:\/\//i.test(raw) ? raw : `https://${raw}`, base);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Usá una URL pública http o https, sin credenciales.');
  // Some stores implement state-changing actions as GET links. They are not
  // content pages and must never be followed by a passive site scan.
  if ([...url.searchParams.keys()].some(key => /^(add[-_]to[-_](cart|wishlist)|remove[-_](item|from[-_](cart|wishlist))|undo_item|empty[-_]cart)$/i.test(key)))
    throw new Error('El recorrido omite acciones de carrito o lista de deseos.');
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
  url.searchParams.sort();
  return url.href;
}

export function isPublicIp(address) {
  try { return ipaddr.process(address).range() === 'unicast'; } catch { return false; }
}

// Resolve once and pin the request to that IP. Redirects are validated again.
export async function requestText(input, { signal, maxBytes = 2_000_000, timeout = 15000, allowLocal = false, allowedUrl, accept = 'text/html,application/xhtml+xml,text/plain,application/xml' } = {}, redirects = 0) {
  const url = new URL(normalizeUrl(input));
  if (allowedUrl && !allowedUrl(url.href)) throw new Error('El destino queda fuera del alcance permitido.');
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = await dns.lookup(hostname, { all: true });
  const localTest = allowLocal && ['localhost', '127.0.0.1', '::1'].includes(hostname);
  if (!addresses.length || (!localTest && addresses.some(a => !isPublicIp(a.address)))) throw new Error('La dirección apunta a una red privada o reservada.');
  const address = addresses[0];
  const response = await new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.get(url, {
      signal,
      headers: { 'User-Agent': 'WayfinderBot/0.1', Accept: accept, 'Accept-Encoding': 'identity' },
      lookup: (_host, options, callback) => options.all ? callback(null, [address]) : callback(null, address.address, address.family),
    }, res => {
      if ([301,302,303,307,308].includes(res.statusCode)) {
        res.resume(); resolve({ status: res.statusCode, headers: res.headers, body: '' }); return;
      }
      res.on('data', chunk => {
        total += chunk.length;
        if (total > maxBytes) req.destroy(new Error('La página supera el límite de descarga (2 MB).'));
        else chunks.push(chunk);
      });
      res.on('error', reject);
      res.on('end', () => {
        const charset = /charset\s*=\s*([^;\s]+)/i.exec(res.headers['content-type'] || '')?.[1]?.replace(/["']/g, '') || 'utf-8';
        let body;
        try { body = new TextDecoder(charset).decode(Buffer.concat(chunks)); }
        catch { body = Buffer.concat(chunks).toString('utf8'); }
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });
    const timer = setTimeout(() => req.destroy(new Error('El sitio tardó más de 15 segundos en responder.')), timeout);
    req.on('close', () => clearTimeout(timer));
    req.on('error', reject);
  });
  if (response.status >= 300 && response.status < 400 && response.headers.location) {
    if (redirects >= 5) throw new Error('Demasiadas redirecciones.');
    return requestText(normalizeUrl(response.headers.location, url.href), { signal, maxBytes, timeout, allowLocal, allowedUrl, accept }, redirects + 1);
  }
  return { ...response, url: url.href };
}
