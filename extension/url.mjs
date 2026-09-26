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
