import { load } from 'cheerio';
import { normalizeUrl } from './network.mjs';

// Navigation discovers pages but never becomes a requirement in a fiche.
export function navigationLinks(html, url) {
  const $ = load(html);
  let base = url;
  try { const candidate = normalizeUrl($('base[href]').attr('href') || url, url); if (new URL(candidate).origin === new URL(url).origin) base = candidate; } catch {}
  const nofollow = /nofollow/i.test($('meta[name=robots]').attr('content') || '');
  $('script,style,template,[hidden],[aria-hidden=true]').remove();
  return $('nav a[href],header a[href],footer a[href],[role=navigation] a[href]').map((_, a) => {
    try {
      const link = $(a), target = normalizeUrl(link.attr('href'), base);
      return { url: target, texto: link.text().replace(/\s+/g, ' ').trim(), contexto: 'navegación',
        seguir: !nofollow && !/nofollow/i.test(link.attr('rel') || ''),
        accion: /^(ingresar|acceder|pagar|comprar|gestionar|login|sign in|checkout)\b/i.test(link.text().trim()) };
    } catch { return null; }
  }).get().filter(Boolean);
}

export function missingContent(pages) {
  return pages.filter(p => !(p.municipal?.fragmentos || []).some(b => b.tipo !== 'titulo' && b.texto.trim().length > 30)
    && !(p.municipal?.enlaces || []).length).map(p => p.url);
}
