export function publicPage(raw) {
  const u = new URL(raw);
  if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password) throw Error('Abrí una página web pública para usar Wayfinder.');
  const host=u.hostname.toLowerCase();
  if (!host.includes('.') || host.endsWith('.local') || host.endsWith('.localhost') || host.includes(':') || /^\d+\.\d+\.\d+\.\d+$/.test(host)) throw Error('Elegí un sitio público con nombre de dominio.');
  // No copiar parámetros ni fragmentos, que pueden contener información privada.
  u.search='';u.hash='';return u.href;
}
export function destination(raw) {
  const target=new URL('https://andromedaweb.store/wayfinder/');
  target.searchParams.set('sitio',publicPage(raw));return target.href;
}

export function enteredPage(value) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 2048 || /\s/.test(raw)) throw Error('Pegá una dirección web válida, por ejemplo novogar.com.ar.');
  try { return publicPage(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`); }
  catch { throw Error('Usá una dirección pública http o https, sin usuario ni contraseña. No se admiten archivos ni direcciones locales.'); }
}

export function tabMessage(url) {
  if (!url) return 'Todavía no tengo permiso para identificar esta pestaña. Podés pegar una dirección arriba o tocar el ícono de Wayfinder sobre la página que querés usar.';
  try { publicPage(url); return null; }
  catch {
    return /^(chrome|brave|edge|about|chrome-extension):/i.test(url)
      ? 'Esta es una página interna del navegador. Pegá arriba la dirección del sitio que querés consultar.'
      : 'Esta dirección no admite lectura como web pública. Podés pegar otra dirección arriba.';
  }
}
