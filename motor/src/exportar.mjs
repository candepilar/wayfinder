// Del diagnóstico al arreglo: con el catálogo de un sitio, Wayfinder le entrega
// al equipo que lo mantiene dos archivos listos para su propio sitio:
//   - una página «Trámites de la A a la Z» (HTML accesible, sin dependencias),
//     con todas las gestiones a un clic, sus requisitos y los accesos oficiales;
//   - datos estructurados schema.org (GovernmentService en JSON-LD), para que
//     buscadores y asistentes encuentren cada gestión.
// Todo el texto es el literal del sitio. El contenido viene de páginas ajenas:
// se escapa siempre y solo se aceptan enlaces http(s).

const escapar = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const url = u => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) && !x.username && !x.password ? x.href : null; } catch { return null; } };
const textos = v => (v || []).map(b => String(b?.texto ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean);
const orden = (a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
const nombreSitio = c => c.sitio?.titulo || (url(c.sitio?.url) ? new URL(c.sitio.url).hostname : 'el sitio');

function fichasPublicables(catalogo) {
  return (catalogo?.fichas || []).filter(f => f?.nombre && url(f.fuente)).map(f => ({
    nombre: String(f.nombre).replace(/\s+/g, ' ').trim(), fuente: url(f.fuente), tipo: f.tipo || 'tramite', fecha: f.fecha || catalogo.sitio?.crawleado_en,
    requisitos: textos(f.requisitos), pasos: textos(f.pasos), costo: textos(f.costo), donde: textos(f.donde_se_hace),
    accesos: (f.destinos || []).map(d => ({ texto: String(d.texto || 'Iniciar').replace(/\s+/g, ' ').trim(), url: url(d.url) })).filter(d => d.url),
    clics: Number.isInteger(f.clics_desde_portada) ? f.clics_desde_portada : null,
  })).sort(orden);
}

export function exportarJsonLd(catalogo) {
  const proveedor = { '@type': 'Organization', name: nombreSitio(catalogo), ...(url(catalogo?.sitio?.url) ? { url: url(catalogo.sitio.url) } : {}) };
  return {
    '@context': 'https://schema.org',
    '@graph': fichasPublicables(catalogo).map(f => ({
      '@type': 'GovernmentService', name: f.nombre, url: f.fuente, provider: proveedor,
      ...(f.requisitos.length ? { description: `Requisitos: ${f.requisitos.join(' ')}`.slice(0, 1000) } : {}),
      ...(f.accesos.length ? { availableChannel: f.accesos.map(a => ({ '@type': 'ServiceChannel', name: a.texto, serviceUrl: a.url })) } : {}),
      ...(f.fecha ? { dateModified: f.fecha } : {}),
    })),
  };
}

export function exportarHtml(catalogo) {
  const fichas = fichasPublicables(catalogo), sitio = nombreSitio(catalogo);
  const letra = n => n.normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0).toUpperCase();
  const letras = [...new Set(fichas.map(f => letra(f.nombre)))];
  const lista = (titulo, items) => items.length ? `<h3>${titulo}</h3><ul>${items.map(t => `<li>${escapar(t)}</li>`).join('')}</ul>` : '';
  // JSON-LD dentro de <script>: se neutraliza «<» para que el contenido no pueda cerrar la etiqueta.
  const jsonld = JSON.stringify(exportarJsonLd(catalogo)).replace(/</g, '\\u003c');
  const fecha = catalogo?.sitio?.crawleado_en ? new Date(catalogo.sitio.crawleado_en).toLocaleDateString('es-AR') : '';
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Trámites de la A a la Z · ${escapar(sitio)}</title>
<script type="application/ld+json">${jsonld}</script>
<style>
body{font:16px/1.55 system-ui,sans-serif;max-width:52rem;margin:0 auto;padding:1.5rem;color:#0e1726;background:#fff}
a{color:#185fa5}h1{font-size:1.8rem}h2{font-size:1.2rem;margin:0}h3{font-size:.95rem;margin:.8rem 0 .2rem}
nav{display:flex;flex-wrap:wrap;gap:.4rem;margin:1rem 0}nav a{padding:.2rem .55rem;border:1px solid #d0c8b8;border-radius:.4rem;text-decoration:none}
article{border:1px solid #e5e0d5;border-radius:.7rem;padding:1rem;margin:.8rem 0}
.accesos a{display:inline-block;margin:.4rem .4rem 0 0;padding:.45rem .8rem;background:#185fa5;color:#fff;border-radius:.45rem;text-decoration:none}
.nota{font-size:.85rem;color:#4f5d70}:focus-visible{outline:3px solid #185fa5;outline-offset:2px}
</style>
</head>
<body>
<header>
<h1>Trámites de la A a la Z</h1>
<p>${escapar(sitio)} · ${fichas.length} ${fichas.length === 1 ? 'gestión' : 'gestiones'}, cada una a un clic.</p>
<nav aria-label="Índice por letra">${letras.map(l => `<a href="#letra-${escapar(l)}">${escapar(l)}</a>`).join('')}</nav>
</header>
<main>
${letras.map(l => `<section id="letra-${escapar(l)}" aria-label="Letra ${escapar(l)}">
${fichas.filter(f => letra(f.nombre) === l).map(f => `<article>
<h2>${escapar(f.nombre)}</h2>
${lista('Qué necesitás', f.requisitos)}${lista('Cómo hacerlo', f.pasos)}${lista('Costo', f.costo)}${lista('Dónde se hace', f.donde)}
<p class="accesos">${f.accesos.map(a => `<a href="${escapar(a.url)}">${escapar(a.texto)}</a>`).join('')}</p>
<p class="nota"><a href="${escapar(f.fuente)}">Información completa en la página oficial</a>${f.clics > 1 ? ` · antes, a ${f.clics} clics de la portada` : ''}</p>
</article>`).join('\n')}
</section>`).join('\n')}
</main>
<footer class="nota"><p>Índice generado con Wayfinder${fecha ? ` a partir de las páginas del sitio leídas el ${escapar(fecha)}` : ''}. El texto es el de cada página oficial; revisá condiciones y vigencia antes de publicarlo.</p></footer>
</body>
</html>
`;
}
