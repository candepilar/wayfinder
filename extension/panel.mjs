import { buscar, objetivoEn, pasoActual, sitioDe, tramiteDe } from './guia.mjs';
import { destination, publicPage, enteredPage, tabMessage } from './url.mjs';
import { guiaDeCatalogo, motor } from './catalogo.mjs';
import { accesosVisibles } from './pagina.mjs';

const rutas = await (await fetch(new URL('./rutas.json', import.meta.url))).json();
const $contenido = document.getElementById('contenido');
const $sitio = document.getElementById('sitio');

// El panel corre como extensión (chrome.tabs) o suelto, para mirarlo en un
// navegador común: ahí la "pestaña" es el parámetro ?url= de la página.
const enExtension = typeof chrome !== 'undefined' && !!chrome.tabs;
const pestana = {
  async actual() {
    if (!enExtension) return { id: null, url: new URLSearchParams(location.search).get('url') || '' };
    let query = { active: true, currentWindow: true };
    // Anchor the side panel to its own browser window, not another last-focused
    // window. Reading tab identity still respects activeTab/host permissions.
    if (chrome.windows?.getCurrent) {
      try { query = { active: true, windowId: (await chrome.windows.getCurrent()).id }; } catch {}
    }
    const [tab] = await chrome.tabs.query(query);
    return { id: tab?.id ?? null, url: tab?.url || '' };
  },
  async ir(url) {
    if (!enExtension) { const p = new URLSearchParams(location.search); p.set('url', url); location.search = p; return; }
    const { id } = await this.actual();
    if (id != null) await chrome.tabs.update(id, { url });
  },
  async resaltar(id, objetivos) {
    if (!enExtension || id == null) return { marcados: 0 };
    try {
      await chrome.scripting.executeScript({ target: { tabId: id }, files: ['resaltar.js'] });
      return await chrome.tabs.sendMessage(id, { tipo: 'wayfinder-resaltar', objetivos });
    } catch { return { marcados: 0 }; }
  },
};
const guardado = {
  async leer(clave) { try { return enExtension ? (await chrome.storage.local.get(clave))[clave] : JSON.parse(localStorage.getItem(clave)); } catch { return null; } },
  async escribir(clave, valor) { try { enExtension ? await chrome.storage.local.set({ [clave]: valor }) : localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin guardado: el panel sigue andando */ } },
};

function el(tag, props = {}, ...hijos) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) n.setAttribute(k, v === true ? '' : v);
  }
  for (const h of hijos.flat()) if (h !== null && h !== undefined && h !== false) n.append(h);
  return n;
}

function vistaSinSitio(tab) {
  $sitio.textContent = 'Tu guía en la web';
  return [
    el('h1', {}, 'Te llevo paso a paso en tu trámite'),
    el('p', { class: 'vacio' }, tabMessage(tab.url)),
    el('h2', {}, 'Guías municipales disponibles'),
    el('ul', { class: 'lista' }, rutas.sitios.map(s =>
      el('li', {}, el('button', { class: 'resultado', onclick: () => pestana.ir(s.portada) }, s.nombre)))),
  ];
}

function vistaBuscar(sitio, tab) {
  $sitio.textContent = sitio.dinamico ? sitio.nombre : `Municipalidad de ${sitio.nombre}`;
  const lista = el('ul', { class: 'lista' });
  const input = el('input', { type: 'search', placeholder: sitio.dinamico ? 'Ej.: envíos, turnos, devoluciones' : 'Ej.: pagar la TGI', 'aria-label': 'Qué gestión necesitás hacer' });
  const pintar = () => {
    const encontrados = input.value.trim() ? buscar(sitio, input.value) : sitio.tramites.slice(0, 5);
    lista.replaceChildren(...(encontrados.length
      ? encontrados.map(t => el('li', {}, el('button', { class: 'resultado', onclick: () => pestana.ir(t.ficha) }, t.nombre)))
      : [el('li', { class: 'vacio' }, 'No lo encontré entre los trámites recorridos. Probá con otras palabras.')]));
  };
  input.addEventListener('input', pintar);
  pintar();
  let mapa = null;
  try { mapa = destination(tab.url); } catch { /* página no pública: sin enlace al mapa */ }
  return [
    el('h1', {}, '¿Qué necesitás hacer?'),
    el('div', { class: 'buscador' }, input),
    el('div', {}, el('h2', {}, 'Gestiones del catálogo'), lista),
    sitio.dinamico && el('p', { class: 'vacio' }, `${sitio.tramites.length} gestiones encontradas · cobertura parcial. ${sitio.tramites.length ? 'Revisá las condiciones en su fuente.' : 'El HTML leído no permitió identificar gestiones. Podés buscar los accesos de la página abierta abajo.'}`),
    mapa && el('a', { class: 'enlace', href: mapa, target: '_blank', rel: 'noopener' }, 'Abrir catálogo y mapa en Wayfinder'),
  ];
}

async function vistaTramite(sitio, t, tab) {
  $sitio.textContent = sitio.dinamico ? sitio.nombre : `Municipalidad de ${sitio.nombre}`;
  const actual = pasoActual(t, tab.url);
  let marcados = (await guardado.leer(`marcados:${t.id}`)) || [];
  const objetivos = objetivoEn(t, tab.url);

  const lista = () => el('ul', { class: 'lista' }, t.antes.map((texto, i) => el('li', {}, el('label', { class: 'check' },
    el('input', { type: 'checkbox', checked: marcados.includes(i), onchange: e => {
      const set = new Set(marcados); e.target.checked ? set.add(i) : set.delete(i);
      marcados = [...set];
      guardado.escribir(`marcados:${t.id}`, marcados);
    } }), el('span', {}, texto)))));
  // Si cada camino ya dice qué pide, los requisitos generales de la ficha pasan
  // a segundo plano: suelen ser de casos particulares (ej. convenios de deuda).
  const porCamino = t.pasos.some(p => p.opciones?.some(o => o.necesitas));
  const antes = !t.antes.length ? null
    : porCamino ? el('details', { class: 'bloque' }, el('summary', {}, `${t.antesTitulo} · según la ficha`), lista())
    : el('section', { class: 'bloque' }, el('h2', {}, 'Antes de empezar, tené a mano'), lista());

  const costos = t.costos.length
    ? el('details', { class: 'bloque' }, el('summary', {}, 'Costo y formas de pago'), el('ul', {}, t.costos.map(c => el('li', {}, c))))
    : null;

  const pasos = el('ol', { class: 'pasos' }, t.pasos.map((p, i) => {
    const estado = i < actual ? 'hecho' : i === actual ? 'actual' : '';
    const cuerpo = el('div', { class: 'cuerpo' },
      estado === 'actual' ? el('span', { class: 'aqui' }, 'Ahora') : null,
      el('p', { class: 'titulo' }, p.titulo),
      el('p', { class: 'detalle' }, p.detalle));
    if (estado === 'actual') {
      if (p.url) cuerpo.append(el('button', { class: 'boton ancho', onclick: () => pestana.ir(p.url) }, 'Llevame a la ficha'));
      const enLaPagina = p.opciones?.some(o => objetivos.some(x => x.url === o.url));
      if (enLaPagina) {
        const marca = el('p', { class: 'detalle' }, 'Buscando el enlace en la página…');
        cuerpo.append(marca);
        pestana.resaltar(tab.id, objetivos).then(r => { marca.textContent = r?.marcados ? 'Te lo marqué en la página.' : 'Podés usar el acceso de abajo. Si querés marcarlo, tocá el ícono de Wayfinder en esta pestaña.'; });
      }
      for (const o of p.opciones || []) {
        cuerpo.append(el('div', { class: 'opcion' },
          el('button', { class: 'boton ancho', onclick: () => pestana.ir(o.url) }, o.texto, el('small', {}, `Te lleva a ${o.sitio}`)),
          o.necesitas ? el('p', { class: 'necesitas' }, el('strong', {}, 'Referencia de otra ficha; confirmá si aplica a tu caso: '), o.necesitas.texto, ' ',
            el('a', { href: o.necesitas.fuente, target: '_blank', rel: 'noopener', title: `Ficha «${o.necesitas.ficha}»` }, 'Fuente')) : null));
      }
    }
    return el('li', { class: `paso ${estado}` }, el('span', { class: 'numero' }, estado === 'hecho' ? '✓' : String(i + 1)), cuerpo);
  }));

  return [
    el('div', {}, el('h1', {}, t.nombre),
      el('p', { class: 'fuente' }, 'Según la ', el('a', { href: t.fuente, target: '_blank', rel: 'noopener' }, 'ficha oficial'))),
    porCamino ? null : antes,
    el('section', {}, el('h2', {}, `Pasos · ${t.pasos.length}`), pasos),
    porCamino ? antes : null,
    costos,
    el('button', { class: 'enlace', onclick: () => pestana.ir(sitio.portada) }, 'Buscar otro trámite'),
  ];
}

let revision = 0;
let sondeo;
let elegida = null;
try { const previa = await guardado.leer('url-elegida'); if (previa) elegida = publicPage(previa); } catch {}
const entrada = el('input', { id: 'url-sitio', type: 'text', inputmode: 'url', autocomplete: 'url', spellcheck: 'false', placeholder: 'Ej.: novogar.com.ar', 'aria-describedby': 'url-ayuda url-error' });
entrada.value = elegida || '';
const errorUrl = el('p', { id: 'url-error', class: 'vacio', role: 'alert' });
const enviarUrl = el('button', { type: 'submit', class: 'boton' }, 'Analizar URL');
const formularioUrl = el('form', { class: 'entrada-url', onsubmit: async e => {
  e.preventDefault(); errorUrl.textContent = '';
  let url;
  try { url = enteredPage(entrada.value); }
  catch (error) { errorUrl.textContent = error.message; entrada.focus(); return; }
  enviarUrl.disabled = true;
  try {
    elegida = url; entrada.value = url;
    await guardado.escribir('url-elegida', url);
    await pintar();
    if (elegida === url) document.getElementById('motor-iniciar')?.click();
  } catch { errorUrl.textContent = 'No pude preparar la consulta. Reintentá.'; }
  finally { enviarUrl.disabled = false; }
} }, el('label', { for: 'url-sitio' }, 'Dirección del sitio'),
  el('div', { class: 'buscador' }, entrada, enviarUrl),
  el('p', { id: 'url-ayuda', class: 'fuente' }, 'Pegá una URL para consultar el catálogo sin permiso sobre la pestaña. Solo se envía al tocar Analizar URL, sin parámetros ni fragmentos.'),
  errorUrl,
  el('button', { type: 'button', class: 'enlace', onclick: usarPestana }, 'Usar pestaña actual'));
$contenido.before(formularioUrl);
async function usarPestana() {
  elegida = null; errorUrl.textContent = '';
  await guardado.escribir('url-elegida', null);
  const actual = await pestana.actual();
  try { entrada.value = publicPage(actual.url); } catch { entrada.value = ''; }
  await pintar();
}
async function pintar() {
  const estaRevision = ++revision;
  clearTimeout(sondeo);
  const tab = await pestana.actual();
  const contexto = elegida ? { id: null, url: elegida } : tab;
  const cache = (await guardado.leer('catalogos')) || [];
  const todas = { sitios: [...rutas.sitios, ...cache] };
  const encontrado = tramiteDe(todas, contexto.url);
  const sitio = encontrado?.sitio || sitioDe(todas, contexto.url);
  const vista = encontrado ? await vistaTramite(encontrado.sitio, encontrado.tramite, contexto)
    : sitio ? vistaBuscar(sitio, contexto) : vistaSinSitio(tab);
  let publica = null;
  try { publica = publicPage(contexto.url); } catch { /* restricted or not granted */ }
  if (publica && !sitio) {
    $sitio.textContent = new URL(publica).hostname;
    vista.splice(0, vista.length, el('h1', {}, '¿Qué necesitás hacer en este sitio?'),
      el('p', { class: 'vacio' }, 'Encontrá un acceso de la página abierta o pedile al motor que organice la información pública con Bob.'));
  }
  if (publica) {
    if (elegida) vista.unshift(el('p', { class: 'fuente' }, `Consultando la dirección ingresada: ${publica}`));
    let mismaPagina = false;
    try { mismaPagina = publicPage(tab.url) === publica; } catch {}
    vista.push(herramientas(tab, publica, sitio?.dinamico, mismaPagina));
  }
  if (estaRevision !== revision) return;
  $contenido.replaceChildren(...vista.filter(Boolean));
  if (publica) {
    const pendiente = await guardado.leer(`recorrido:${new URL(publica).origin}`);
    if (pendiente && estaRevision === revision) seguir(pendiente, publica, estaRevision);
  }
}

function herramientas(tab, publica, actualizar = false, mismaPagina = true) {
  const caja = el('section', { class: 'bloque' });
  const estado = el('p', { class: 'vacio', id: 'motor-estado', role: 'status' });
  const visibles = el('div', {});
  const leer = el('button', { class: 'boton ancho', onclick: async () => {
    leer.disabled = true;
    try {
      if (!enExtension) throw Error('Esta función necesita la extensión instalada.');
      const actual = await pestana.actual();
      if (actual.id !== tab.id || actual.url !== tab.url) throw Error('Cambió la página. Volvé a abrir la guía.');
      const [resultado] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: accesosVisibles });
      const enlaces = resultado?.result?.enlaces || [];
      const lista = el('ul', { class: 'lista' });
      const input = el('input', { type: 'search', placeholder: 'Ej.: ayuda, envíos, sucursales', 'aria-label': 'Buscar acceso en la página' });
      const mostrar = () => {
        const consulta = input.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const items = enlaces.filter(e => e.texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(consulta)).slice(0, 20);
        lista.replaceChildren(...items.map(o => el('li', {}, el('div', { class: 'opcion' },
          el('button', { class: 'resultado', onclick: () => pestana.ir(o.url) }, o.texto, el('small', {}, ` · ${o.sitio}`)),
          el('button', { class: 'enlace', onclick: async e => {
            const r = await pestana.resaltar(tab.id, [o]);
            e.target.textContent = r?.marcados ? 'Marcado en la página' : 'El enlace cambió; volvé a leer la página';
          } }, 'Mostrar dónde está')))));
        if (!items.length) lista.append(el('li', { class: 'vacio' }, 'No encontré ese acceso visible. Podés abrir un menú del sitio y volver a buscar.'));
      };
      input.addEventListener('input', mostrar); mostrar();
      visibles.replaceChildren(el('p', { class: 'vacio' }, `${enlaces.length} accesos detectados en esta página (máximo 120). No son requisitos ni gestiones verificadas.`), el('div', { class: 'buscador' }, input), lista);
    } catch (error) {
      visibles.replaceChildren(el('p', { class: 'vacio' }, `${error.message} Tocá el ícono de Wayfinder en la pestaña que querés usar y reintentá.`));
    } finally { leer.disabled = false; }
  } }, 'Buscar accesos de esta página');
  const analizar = el('button', { class: 'boton secundario ancho', id: 'motor-iniciar', onclick: async () => {
    analizar.disabled = true;
    const estaRevision = revision;
    estado.textContent = 'Buscando un catálogo disponible…';
    try {
      const previo = await motor(`/extension/catalogo?url=${encodeURIComponent(publica)}`);
      if (previo.catalogo && !actualizar) { await guardarCatalogo(previo); if (revision === estaRevision) await pintar(); return; }
      const job = await motor('/recorridos', { url: publica, catalogo: true, maxPaginas: 20 });
      await guardado.escribir(`recorrido:${new URL(publica).origin}`, job.id);
      if (revision === estaRevision) seguir(job.id, publica, estaRevision);
    } catch (error) { if (revision === estaRevision) { estado.textContent = error.message; analizar.disabled = false; } }
  } }, actualizar ? 'Volver a recorrer con Bob' : 'Consultar catálogo con Bob');
  caja.append(el('h2', {}, 'Tu próximo paso'), ...(mismaPagina ? [leer,
    el('p', { class: 'fuente' }, 'Los nombres y enlaces visibles se procesan solo en tu navegador. No se envían a Bob ni se guardan. No completamos formularios.'), visibles] : [
    el('p', { class: 'vacio' }, 'Podés consultar este catálogo sin abrir el sitio. Para buscar o marcar enlaces en su página, abrilo y tocá allí el ícono de Wayfinder.'),
    el('button', { class: 'boton secundario ancho', onclick: async () => {
      elegida = null; await guardado.escribir('url-elegida', null); await pestana.ir(publica); await pintar();
    } }, 'Abrir sitio en esta pestaña')]),
    analizar, el('p', { class: 'fuente' }, `Al consultar, enviamos esta dirección al motor: ${publica}. Lee contenido público sin tu sesión y respeta robots.txt. Algunos sitios necesitan JavaScript o acceso privado y no pueden organizarse.`), estado,
    el('a', { class: 'enlace', href: destination(publica), target: '_blank', rel: 'noopener' }, 'Hablar con Bob / abrir Wayfinder'));
  return caja;
}

async function guardarCatalogo({ catalogo, mapaId }) {
  const sitio = guiaDeCatalogo(catalogo, mapaId);
  const cache = (await guardado.leer('catalogos')) || [];
  await guardado.escribir('catalogos', [sitio, ...cache.filter(s => s.nombre !== sitio.nombre)].slice(0, 8));
}
async function seguir(id, publica, estaRevision) {
  if (revision !== estaRevision) return;
  const estado = document.getElementById('motor-estado');
  const iniciar = document.getElementById('motor-iniciar');
  if (!estado || !iniciar) return;
  iniciar.disabled = true;
  try {
    const job = await motor(`/recorridos/${encodeURIComponent(id)}`);
    if (revision !== estaRevision) return;
    if (job.estado === 'completado') {
      const catalogo = await motor(`/mapas/${job.mapaId}/catalogo`);
      await guardarCatalogo({ catalogo, mapaId: job.mapaId });
      await guardado.escribir(`recorrido:${new URL(publica).origin}`, null);
      if (revision === estaRevision) await pintar();
    } else if (job.estado === 'en_curso') {
      const ultimo = job.eventos?.at(-1);
      estado.replaceChildren(el('span', {}, ultimo?.mensaje || `Leyendo información pública${ultimo?.leidas ? ` · ${ultimo.leidas} páginas` : '…'}`),
        el('button', { class: 'enlace', onclick: async e => {
          e.target.disabled = true;
          try { await motor(`/recorridos/${id}/cancelar`, {}); estado.textContent = 'Cancelando…'; }
          catch (error) { estado.textContent = error.message; }
        } }, 'Cancelar recorrido'));
      sondeo = setTimeout(() => seguir(id, publica, estaRevision), 1800);
    } else {
      await guardado.escribir(`recorrido:${new URL(publica).origin}`, null);
      estado.textContent = job.error || 'Recorrido cancelado.'; iniciar.disabled = false;
    }
  } catch (error) {
    if (revision !== estaRevision) return;
    estado.replaceChildren(el('span', {}, error.message), el('button', { class: 'enlace', onclick: () => seguir(id, publica, estaRevision) }, 'Reintentar estado'),
      el('button', { class: 'enlace', onclick: async () => { await guardado.escribir(`recorrido:${new URL(publica).origin}`, null); pintar(); } }, 'Cerrar seguimiento'));
  }
}

await pintar();
if (enExtension) {
  chrome.tabs.onActivated.addListener(pintar);
  chrome.tabs.onUpdated.addListener(async (id, cambio) => { if ((cambio.status === 'complete' || cambio.url) && (await pestana.actual()).id === id) pintar(); });
  chrome.runtime.onMessage.addListener(m => {
    if (m?.tipo === 'wayfinder-activado') {
      void usarPestana();
    }
  });
}
