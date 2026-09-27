// Runs only after the person chooses to inspect the current tab. No HTML,
// cookies, form values or link text are transmitted to the server or persisted.
// Self-contained so it can be passed to chrome.scripting.executeScript.
export function accesosVisibles() {
  const enlaces = [], vistos = new Set();
  for (const a of [...document.querySelectorAll('a[href]')].slice(0, 2000)) {
    if (a.closest('form,[contenteditable],[hidden],[aria-hidden="true"]')) continue;
    const style = getComputedStyle(a);
    if (style.visibility === 'hidden' || style.display === 'none' || !a.getClientRects().length) continue;
    const texto = (a.innerText || a.getAttribute('aria-label') || a.querySelector('img')?.alt || '').replace(/\s+/g, ' ').trim();
    if (!texto || texto.length > 160) continue;
    let u;
    try { u = new URL(a.href); } catch { continue; }
    if (!/^https?:$/.test(u.protocol) || u.username || u.password) continue;
    if (!u.hostname.includes('.') || u.hostname.endsWith('.local') || u.hostname.endsWith('.localhost') || u.hostname.includes(':') || /^\d+\.\d+\.\d+\.\d+$/.test(u.hostname)) continue;
    // Keep the full URL locally (routing parameters can be meaningful); omit
    // transactional/session links instead of stripping them and changing intent.
    if ([...u.searchParams.keys()].some(k => /token|nonce|session|password|secret|email|csrf|cart|wishlist|action/i.test(k) || /^(code|state)$/i.test(k))) continue;
    if (/\b(logout|signout|checkout|addtocart)\b|cerrar.?sesion|eliminar|borrar|comprar.?ahora/i.test(u.pathname + ' ' + texto)) continue;
    if (vistos.has(u.href)) continue;
    vistos.add(u.href);
    enlaces.push({ texto, url: u.href, sitio: u.hostname });
  }
  const prioridad = e => /ayuda|contact|env[ií]o|entrega|devolu|sucursal|turno|tr[aá]mite|servicio|reclamo|pregunta|help|shipping|return|support/i.test(e.texto) ? 1 : 0;
  enlaces.sort((a,b) => prioridad(b) - prioridad(a));
  return { url: location.href, enlaces: enlaces.slice(0, 120), limite: 120 };
}
