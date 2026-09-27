import { API } from './catalogo.mjs';
import { publicPage } from './url.mjs';

// Conversations stay only in panel memory, separated by site.
const conversaciones = new Map();
export function chatBob({ el, publica, ir, buscarLocal = () => [] }) {
  const host = u => new URL(u).hostname.replace(/^www\./, '');
  const clave = host(publica);
  if (!conversaciones.has(clave)) conversaciones.set(clave, { turns: [], draft: '', sitio: null });
  const session = conversaciones.get(clave);
  let task = null, disposed = false;
  const log = el('div', { class: 'chat-log', role: 'log', 'aria-label': 'Conversación con Bob' });
  const status = el('p', { class: 'vacio', role: 'status' });
  // Mientras Bob piensa (10–15 s), lo que ya coincide en el catálogo local.
  const mientras = el('div', { class: 'chat-mientras', hidden: true });
  const input = el('textarea', { id: 'bob-pregunta', rows: 2, maxlength: 1000, placeholder: 'Contale con tus palabras qué necesitás', 'aria-label': 'Tu mensaje para Bob' });
  input.value = session.draft;
  input.addEventListener('input', () => { session.draft = input.value; });
  const send = el('button', { type: 'submit', class: 'boton' }, 'Enviar');
  const cancel = el('button', { type: 'button', class: 'enlace', hidden: true, onclick: () => task?.abort() }, 'Cancelar');
  const reset = el('button', { type: 'button', class: 'enlace', onclick: () => {
    if (task) return;
    session.turns = []; session.draft = ''; input.value = ''; status.textContent = ''; render(); input.focus();
  } }, 'Nueva consulta');
  function link(text, url) {
    try {
      publicPage(url);
      const parsed = new URL(url);
      if ([...parsed.searchParams.keys()].some(k => /token|nonce|session|password|secret|email|csrf/i.test(k) || /^(code|state)$/i.test(k))) return null;
      return el('button', { type: 'button', class: 'resultado', onclick: () => ir(parsed.href) }, text);
    } catch { return null; }
  }
  function render() {
    reset.hidden = !session.turns.length;
    log.replaceChildren(...session.turns.map(t => el('div', { class: 'chat-turno' },
      el('p', { class: 'chat-pregunta' }, t.pregunta),
      el('p', { class: 'chat-respuesta' }, t.respuesta.mensaje),
      ...(t.respuesta.fichas || []).map(f => el('div', { class: 'opcion' }, el('strong', {}, f.nombre),
        ...(f.destinos || []).map(d => link(d.texto || 'Continuar', d.url)), link('Ir al trámite', f.fuente))),
      (t.respuesta.evidencia || []).length ? el('details', {}, el('summary', {}, 'Ver fuentes'),
        ...t.respuesta.evidencia.map(e => el('p', { class: 'fuente' }, e.texto, ' ', link('Abrir fuente', e.fuente)))) : null,
    )));
    const last = session.turns.at(-1)?.respuesta;
    for (const s of last?.sugerencias || []) log.append(el('button', { type: 'button', class: 'resultado', onclick: () => { if (!task) { input.value = s; void ask(); } } }, s));
  }
  async function request(path, body, signal) {
    const response = await fetch(`${API}${path}`, { method: body ? 'POST' : 'GET', credentials: 'omit', signal,
      ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
    const data = await response.json();
    if (!response.ok) throw Error(data.error || 'No pude conectar con Bob. Probá de nuevo.');
    return data;
  }
  async function ask() {
    const pregunta = input.value.trim();
    if (!pregunta || task || disposed) return;
    session.draft = pregunta;
    const current = new AbortController(); task = current;
    const timer = setTimeout(() => current.abort(), 65000);
    send.disabled = input.disabled = reset.disabled = true; cancel.hidden = false;
    status.textContent = 'Bob está buscando cómo ayudarte…';
    const locales = (() => { try { return buscarLocal(pregunta).slice(0, 3); } catch { return []; } })();
    mientras.replaceChildren(...(locales.length ? [el('p', { class: 'fuente' }, 'Mientras Bob responde, esto coincide con lo que escribiste:'),
      ...locales.map(r => link(r.nombre, r.url)).filter(Boolean)] : []));
    mientras.hidden = !locales.length;
    try {
      // El sitio del catálogo se busca una vez por conversación, no en cada pregunta.
      if (!session.sitio) {
        const { sitios } = await request('/asistente/sitios', null, current.signal);
        const matches = sitios.filter(s => { try { return host(s.url) === clave; } catch { return false; } });
        session.sitio = matches.find(s => s.id.startsWith('municipio:')) || matches.find(s => s.url === publica) || matches[0] || null;
      }
      const site = session.sitio;
      if (!site) { status.textContent = 'Primero tocá “Buscar gestiones” para preparar la información de este sitio.'; return; }
      const historial = session.turns.slice(-4).flatMap(t => [{ rol: 'user', texto: t.pregunta }, { rol: 'assistant', texto: t.respuesta.mensaje }]);
      const respuesta = await request('/asistente', { contexto: site.id, pregunta, historial }, current.signal);
      if (disposed || current.signal.aborted) return;
      session.turns = [...session.turns, { pregunta, respuesta }].slice(-10);
      session.draft = ''; input.value = ''; status.textContent = ''; render();
      log.scrollTop = log.scrollHeight;
    } catch (error) {
      if (!disposed) status.textContent = current.signal.aborted ? 'Consulta interrumpida. Tu mensaje sigue acá para reintentar.' : error.message;
    } finally {
      clearTimeout(timer); task = null; mientras.hidden = true;
      if (!disposed) { send.disabled = input.disabled = reset.disabled = false; cancel.hidden = true; input.focus(); }
    }
  }
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); void ask(); } });
  const node = el('section', { class: 'bloque chat-bob', 'aria-label': 'Asistente Bob' },
    el('div', { class: 'chat-titulo' }, el('label', { for: 'bob-pregunta' }, '¿No lo encontrás? Preguntale a Bob'), reset),
    log, mientras, el('form', { onsubmit: e => { e.preventDefault(); void ask(); } }, input,
      el('div', { class: 'chat-acciones' }, el('span', { class: 'fuente' }, 'Bob · guía con IA'), cancel, send)), status);
  render();
  return { node, dispose() { disposed = true; task?.abort(); },
    // Desde el buscador: manda a Bob lo que la búsqueda instantánea no encontró.
    preguntar(texto) { if (task || !texto?.trim()) return; input.value = texto.trim(); session.draft = input.value; node.scrollIntoView({ block: 'nearest' }); void ask(); } };
}
