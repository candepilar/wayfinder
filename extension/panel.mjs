import { buscar, objetivoEn, pasoActual, sitioDe, tramiteDe } from './guia.mjs';
import { destination } from './url.mjs';

const rutas = await (await fetch(new URL('./rutas.json', import.meta.url))).json();
const $contenido = document.getElementById('contenido');
const $sitio = document.getElementById('sitio');

// El panel corre como extensión (chrome.tabs) o suelto, para mirarlo en un
// navegador común: ahí la "pestaña" es el parámetro ?url= de la página.
const enExtension = typeof chrome !== 'undefined' && !!chrome.tabs;
const pestana = {
  async actual() {
    if (!enExtension) return { id: null, url: new URLSearchParams(location.search).get('url') || '' };
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return { id: tab?.id ?? null, url: tab?.url || '' };
  },
  async ir(url) {
    if (!enExtension) { const p = new URLSearchParams(location.search); p.set('url', url); location.search = p; return; }
    const { id } = await this.actual();
    if (id != null) await chrome.tabs.update(id, { url });
  },
  resaltar(id, objetivos) {
    if (enExtension && id != null) chrome.tabs.sendMessage(id, { tipo: 'wayfinder-resaltar', objetivos }).catch(() => {});
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

function vistaSinSitio() {
  $sitio.textContent = 'Abrí el sitio de tu municipio';
  return [
    el('h1', {}, 'Te llevo paso a paso en tu trámite'),
    el('p', { class: 'vacio' }, 'Por ahora funciono en estos municipios:'),
    el('ul', { class: 'lista' }, rutas.sitios.map(s =>
      el('li', {}, el('button', { class: 'resultado', onclick: () => pestana.ir(s.portada) }, s.nombre)))),
  ];
}

function vistaBuscar(sitio, tab) {
  $sitio.textContent = `Municipalidad de ${sitio.nombre}`;
  const lista = el('ul', { class: 'lista' });
  const input = el('input', { type: 'search', placeholder: 'Ej.: pagar la TGI', 'aria-label': 'Qué trámite necesitás hacer' });
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
    el('h1', {}, '¿Qué trámite necesitás hacer?'),
    el('div', { class: 'buscador' }, input),
    el('div', {}, el('h2', {}, input.value ? 'Resultados' : 'Algunos trámites'), lista),
    mapa && el('a', { class: 'enlace', href: mapa, target: '_blank', rel: 'noopener' }, 'Ver el mapa completo del sitio en Wayfinder'),
  ];
}

async function vistaTramite(sitio, t, tab) {
  $sitio.textContent = `Municipalidad de ${sitio.nombre}`;
  const actual = pasoActual(t, tab.url);
  const marcados = (await guardado.leer(`marcados:${t.id}`)) || [];
  const objetivos = objetivoEn(t, tab.url);

  const lista = () => el('ul', { class: 'lista' }, t.antes.map((texto, i) => el('li', {}, el('label', { class: 'check' },
    el('input', { type: 'checkbox', checked: marcados.includes(i), onchange: e => {
      const set = new Set(marcados); e.target.checked ? set.add(i) : set.delete(i);
      guardado.escribir(`marcados:${t.id}`, [...set]);
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
      if (enLaPagina) cuerpo.append(el('p', { class: 'detalle' }, 'Te lo marqué en la página.'));
      for (const o of p.opciones || []) {
        cuerpo.append(el('div', { class: 'opcion' },
          el('button', { class: 'boton ancho', onclick: () => pestana.ir(o.url) }, o.texto, el('small', {}, `Te lleva a ${o.sitio}`)),
          o.necesitas ? el('p', { class: 'necesitas' }, el('strong', {}, 'Vas a necesitar: '), o.necesitas.texto, ' ',
            el('a', { href: o.necesitas.fuente, target: '_blank', rel: 'noopener', title: `Ficha «${o.necesitas.ficha}»` }, 'Fuente')) : null));
      }
    }
    return el('li', { class: `paso ${estado}` }, el('span', { class: 'numero' }, estado === 'hecho' ? '✓' : String(i + 1)), cuerpo);
  }));

  pestana.resaltar(tab.id, objetivos);

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

async function pintar() {
  const tab = await pestana.actual();
  const encontrado = tramiteDe(rutas, tab.url);
  const sitio = encontrado?.sitio || sitioDe(rutas, tab.url);
  const vista = encontrado ? await vistaTramite(encontrado.sitio, encontrado.tramite, tab)
    : sitio ? vistaBuscar(sitio, tab) : vistaSinSitio();
  $contenido.replaceChildren(...vista.filter(Boolean));
}

await pintar();
if (enExtension) {
  chrome.tabs.onActivated.addListener(pintar);
  chrome.tabs.onUpdated.addListener((_, cambio) => { if (cambio.status === 'complete' || cambio.url) pintar(); });
}
