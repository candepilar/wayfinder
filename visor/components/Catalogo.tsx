"use client";

import { useMemo, useState } from 'react';
import { WebMap } from '@/lib/tipos';
import { CatalogoSitio, Ficha, Fragmento } from '@/lib/catalogo';
import Asistente from './Asistente';
import { buscarFichas } from '@/lib/buscar';
import { API_BASE } from '@/lib/motor';
const button = 'rounded-lg border border-linea bg-superficie px-4 py-2 text-sm text-tinta hover:border-acento-borde';

export default function Catalogo({ mapa, onVolver, onMapa }: { mapa: WebMap; onVolver: () => void; onMapa: () => void }) {
  const catalog = mapa.catalogo!;
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Ficha | null>(null);
  const results = useMemo(() => {
    return buscarFichas(catalog.fichas, query);
  }, [catalog, query]);
  function descargar() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(catalog, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'wayfinder-catalogo.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const sitioNombre = mapa.sitio.titulo || new URL(mapa.sitio.url).hostname;
  const abrir = (f: Ficha | null) => { setSelected(f); if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const dudosas = catalog.fichas.filter(f => f.verificacion?.estado === 'dudosa').map(f => ({ nombre: f.nombre, fuente: f.fuente, detalle: f.verificacion?.motivo }));
  return <div className="min-h-screen bg-fondo text-tinta">
    <header className="sticky top-0 z-10 border-b border-linea bg-fondo/90 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-6 py-3">
        <button className="text-sm text-tinta-media hover:text-tinta" onClick={selected ? () => abrir(null) : onVolver}>{selected ? '← Volver a las gestiones' : '← Otro sitio'}</button>
        <p className="truncate text-sm font-medium text-tinta">{sitioNombre}</p>
      </div>
    </header>
    <main className="mx-auto max-w-4xl px-6 pb-16 pt-10">
      {selected ? <article id="ficha-gestion" className="space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-acento">Gestión</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{selected.nombre}</h1>
          {selected.verificacion?.estado === 'confirmada' && <p className="mt-2 text-sm text-tinta-media"><span className="text-acento">✓</span> Verificada por una segunda revisión de IBM Bob contra la página oficial.</p>}
          {selected.verificacion?.estado === 'dudosa' && <p className="mt-3 text-sm text-tinta-media">Confirmá los requisitos actualizados en la página del trámite.</p>}
        </div>
        <div className="rounded-2xl border border-linea bg-superficie p-6 shadow-panel">
          {selected.destinos.length > 0 ? <div className="flex flex-wrap gap-3">{selected.destinos.map(d => <a key={d.url} href={d.url} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-acento px-5 py-3 text-sm font-medium text-acento-tinta transition-opacity hover:opacity-90">{d.texto} ↗</a>)}</div>
            : <a href={selected.fuente} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-xl bg-acento px-5 py-3 text-sm font-medium text-acento-tinta transition-opacity hover:opacity-90">Ir al trámite ↗</a>}
          {!!selected.opciones?.length && <div className="mt-5"><p className="mb-3 text-sm font-medium">¿Para qué necesitás el turno?</p><div className="flex flex-wrap gap-3">{selected.opciones.map(o => <a key={`${o.url}-${o.texto}`} href={o.url} target="_blank" rel="noopener noreferrer" className={button}>{o.texto} ↗</a>)}</div></div>}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-tinta-media">
            {selected.destinos.length > 0 ? <a className="underline decoration-linea-fuerte underline-offset-4 hover:text-tinta" href={selected.fuente} target="_blank" rel="noopener noreferrer">Ver información oficial ↗</a> : <span>Abre la página de esta gestión. El sitio puede pedirte iniciar sesión.</span>}
            {selected.clics_desde_portada && selected.clics_desde_portada > 1 && <span>En el sitio está a <strong className="text-tinta">{selected.clics_desde_portada} clics</strong> de la portada. Acá, a uno.</span>}
          </div>
        </div>
        <Bloques title="Qué necesitás" bloques={selected.requisitos} checklist key={`${selected.id}-requisitos`} />
        <Bloques title="Cómo hacerlo" bloques={selected.pasos} />
        <Bloques title="Costo" bloques={selected.costo} />
        <Bloques title="Dónde se hace y contacto" bloques={selected.donde_se_hace} />
        {(() => { const faltan = ([['requisitos', selected.requisitos], ['pasos', selected.pasos], ['costo', selected.costo], ['dónde se hace', selected.donde_se_hace]] as [string, Fragmento[]][]).filter(([, b]) => !b.length).map(([n]) => n);
          return faltan.length > 0 && <p className="text-sm text-tinta-media">No identificado en la información leída: {faltan.join(', ')}. Consultá la página oficial.</p>; })()}
        <p className="text-xs leading-relaxed text-tinta-suave">Fuente consultada el {new Date(selected.fecha).toLocaleString('es-AR')}. Los enlaces abren otra pestaña; Wayfinder no envía formularios. Verificá vigencia y condiciones en el sitio de origen.</p>
      </article> : <>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-acento">Gestiones</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{sitioNombre}</h1>
        <label htmlFor="buscar-gestion" className="sr-only">¿Qué necesitás hacer?</label>
        <input id="buscar-gestion" autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="¿Qué necesitás hacer? Ej.: sacar el registro" className="mt-7 w-full rounded-2xl border border-linea bg-superficie px-5 py-4 text-base shadow-panel outline-none transition-colors placeholder:text-tinta-suave focus:border-acento-borde" />
        <p role="status" className="mt-3 text-xs text-tinta-suave">{results.length === 1 ? '1 gestión' : `${results.length} gestiones`}{query.trim() ? ' coinciden' : ' en el catálogo'}</p>
        <ul className="mt-5 divide-y divide-linea overflow-hidden rounded-2xl border border-linea bg-superficie">{results.map(f => <li key={f.id}>
          <button onClick={() => abrir(f)} className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-superficie-alta">
            <span className="min-w-0 flex-1"><span className="block font-medium text-tinta">{f.nombre}</span>
              <span className="mt-0.5 block text-xs text-tinta-suave">{[f.requisitos.length ? `${f.requisitos.length} ${f.requisitos.length === 1 ? 'requisito' : 'requisitos'}` : null, f.destinos.length ? 'acceso directo' : null, f.verificacion?.estado === 'dudosa' ? 'para revisar' : null].filter(Boolean).join(' · ') || 'ver en la página oficial'}</span></span>
            <span aria-hidden="true" className="text-tinta-suave transition-transform group-hover:translate-x-0.5 group-hover:text-acento">→</span>
          </button></li>)}</ul>
        {!results.length && <div className="mt-5 rounded-2xl border border-linea bg-superficie p-5"><h2 className="font-medium">{catalog.fichas.length ? 'No encontramos coincidencias en este catálogo' : 'Todavía no identificamos gestiones con evidencia suficiente'}</h2><p className="mt-2 text-sm text-tinta-media">Eso no significa que no existan. Preguntale a Bob abajo o consultá el sitio.</p><a className="mt-3 inline-block text-sm underline" href={mapa.sitio.url} target="_blank" rel="noopener noreferrer">Ir al sitio de origen ↗</a></div>}
      </>}
      <div className={selected ? 'hidden' : 'mt-12'}><Asistente titulo="¿No lo encontrás? Preguntale a Bob." contexto={`sitio:${mapa.sitio.url}`} buscarLocal={q => buscarFichas(catalog.fichas, q, 3).map(f => ({ id: f.id, nombre: f.nombre }))} nombre={sitioNombre} onFicha={id => abrir(catalog.fichas.find(f => f.id === id) || null)} /></div>
      <div className="mt-12 space-y-3">
        <ComoLoArmoBob catalog={catalog} leidas={mapa.paginas.length} />
        <Mantenimiento m={catalog.mantenimiento} sitio={mapa.sitio.url} fichas={catalog.fichas.length} dudosas={dudosas} onDescargar={descargar} onMapa={onMapa} />
        <details className="group rounded-2xl border border-linea px-5 py-4 text-xs text-tinta-media">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">Fuente y alcance · {mapa.paginas.length} páginas leídas · {catalog.fichas.length} fichas<span aria-hidden="true" className="text-tinta-suave transition-transform group-open:rotate-90">›</span></summary>
          <p className="mt-3">Recorrido {mapa.ejecucion?.estado || 'de alcance limitado'}; {mapa.ejecucion?.pendientes || 0} enlaces pendientes. Lectura de HTML público; páginas que necesitan sesión, JavaScript o documentos adjuntos pueden quedar fuera.</p>
          <p className="mt-2">Organización con IBM Bob: {catalog.bob.estado}. {catalog.bob.fichas_aceptadas ?? 0} fichas organizadas o completadas por Bob; las restantes se identificaron por la estructura de la página.</p>
          {(catalog.bob.estado === 'error' || Boolean(catalog.calidad.paginas_omitidas_bob) || Boolean(catalog.calidad.bloques_omitidos_bob)) && <p className="mt-2">La revisión de Bob fue incompleta. Páginas fuera del análisis: {catalog.calidad.paginas_omitidas_bob || 0}; bloques omitidos por límite: {catalog.calidad.bloques_omitidos_bob || 0}.</p>}
          <p className="mt-2">Las fuentes respaldan el texto, pero no certifican que una gestión esté vigente ni que sus enlaces funcionen. Esta guía no es un servicio oficial del sitio.</p>
        </details>
      </div>
    </main>
  </div>;
}

// Solo las secciones con contenido: lo que falta se resume en una línea en la ficha.
function Bloques({ title, bloques, checklist = false }: { title: string; bloques: Fragmento[]; checklist?: boolean }) {
  if (!bloques.length) return null;
  return <section className="rounded-2xl border border-linea bg-superficie p-6"><h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-tinta-media">{title}</h2>
    <div className="mt-4 space-y-3">{bloques.map((b, i) => checklist && b.tipo === 'item' ?
      <label key={i} className="flex items-start gap-3 leading-relaxed"><input className="mt-1.5 shrink-0 accent-[var(--acento)]" type="checkbox" /><span>{b.texto}</span></label> :
      <p key={i} className={`leading-relaxed ${b.tipo === 'titulo' || b.tipo === 'subtitulo' ? 'font-medium' : 'text-tinta-media'}`}>{b.texto}</p>)}</div>
  </section>;
}

// Hace visible el trabajo de Bob: cuántas tareas paralelas, cuánto tardó y qué
// quedó afuera por falta de evidencia. Solo muestra datos registrados.
function ComoLoArmoBob({ catalog, leidas }: { catalog: CatalogoSitio; leidas: number }) {
  const bob = catalog.bob, tareas = bob.tareas || [];
  if (!['completado', 'parcial'].includes(bob.estado)) return null;
  const segundos = (ms?: number) => ms == null ? null : ms < 10000 ? (ms / 1000).toFixed(1).replace('.', ',') : String(Math.round(ms / 1000));
  const total = segundos(bob.duracion_ms);
  const enviadas = catalog.calidad.paginas_enviadas_bob;
  const descartadas = catalog.calidad.descartadas.length;
  const datos: [string | number, string][] = [
    [leidas, 'páginas leídas'],
    ...(enviadas != null ? [[enviadas, tareas.length > 1 ? `organizadas por Bob en ${tareas.length} tareas en paralelo` : 'organizadas por Bob'] as [number, string]] : []),
    ...(total ? [[`${total} s`, 'de trabajo de Bob'] as [string, string]] : []),
    [catalog.fichas.length, 'gestiones con fuente'],
    ...(catalog.impacto ? [[`${String(catalog.impacto.clics_promedio_portada).replace('.', ',')} → 1`, 'clics promedio desde la portada → con Wayfinder'] as [string, string]] : []),
    ...(descartadas ? [[descartadas, 'descartadas por falta de evidencia'] as [number, string]] : []),
    ...(catalog.calidad.revision_bob?.tareas ? [[`${catalog.calidad.revision_bob.confirmadas}/${catalog.calidad.revision_bob.confirmadas + catalog.calidad.revision_bob.dudosas}`, 'confirmadas por una segunda revisión de Bob'] as [string, string]] : []),
  ];
  const revision = catalog.calidad.revision_bob;
  const resumen = [enviadas != null ? `${enviadas} páginas` : null, tareas.length > 1 ? `${tareas.length} tareas en paralelo` : null, total ? `${total} s` : null, revision?.tareas ? `${revision.confirmadas}/${revision.confirmadas + revision.dudosas} verificadas` : null].filter(Boolean).join(' · ');
  return <details className="group rounded-2xl border border-linea bg-superficie px-5 py-4">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm"><span><span className="font-medium text-tinta">Cómo lo armó IBM Bob</span>{resumen && <span className="text-tinta-suave"> · {resumen}</span>}</span><span aria-hidden="true" className="text-tinta-suave transition-transform group-open:rotate-90">›</span></summary>
    <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{datos.map(([valor, texto]) => <div key={texto} className="flex flex-col-reverse justify-end"><dt className="text-xs leading-snug text-tinta-media">{texto}</dt><dd className="text-xl font-semibold text-tinta">{valor}</dd></div>)}</dl>
    {tareas.length > 1 && <ul className="mt-4 space-y-1.5" aria-label="Tareas de Bob en paralelo">{tareas.map(t => <li key={t.lote} className="flex items-center gap-2 text-xs text-tinta-media">
      <span className="w-16 shrink-0">Tarea {t.lote}</span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-linea"><span className={`block h-full rounded-full ${t.estado === 'error' ? 'bg-tinta-suave' : 'bg-acento'}`} style={{ width: `${bob.duracion_ms && t.duracion_ms ? Math.max(8, Math.round(100 * t.duracion_ms / bob.duracion_ms)) : 100}%` }} /></span>
      <span className="w-44 shrink-0 text-right">{t.estado === 'error' ? 'falló · sus páginas quedan afuera' : `${t.paginas} págs · ${segundos(t.duracion_ms) ?? '?'} s · ${t.fichas_aceptadas ?? 0} ${t.fichas_aceptadas === 1 ? 'gestión' : 'gestiones'}`}</span>
    </li>)}</ul>}
    <p className="mt-3 text-[11px] leading-relaxed text-tinta-suave">Bob solo elige bloques y enlaces que existen en las páginas leídas; el texto es el del sitio. Lo que no tiene evidencia se descarta.</p>
  </details>;
}

const CAMPO: Record<string, string> = { nombre: 'nombre', requisitos: 'requisitos', pasos: 'pasos', costo: 'costo', donde_se_hace: 'dónde se hace', acceso: 'acceso' };
// Para quien mantiene el sitio: qué cambió desde la lectura anterior y qué falta.
function Mantenimiento({ m, sitio, fichas, dudosas = [], onDescargar, onMapa }: { m?: CatalogoSitio['mantenimiento']; sitio: string; fichas: number; dudosas?: { nombre: string; fuente: string; detalle?: string }[]; onDescargar: () => void; onMapa: () => void }) {
  const descarga = (formato: string) => `${API_BASE}/exportar?url=${encodeURIComponent(sitio)}&formato=${formato}`;
  const arreglo = fichas > 0 && <div className="mt-3 rounded-lg border border-acento-borde bg-acento-suave p-4">
    <p className="font-medium text-tinta">Del diagnóstico al arreglo</p>
    <p className="mt-1 text-xs leading-relaxed">Descargá una página «Trámites de la A a la Z» para publicar en tu sitio (todas las gestiones a un clic, accesible y sin dependencias) y sus datos estructurados schema.org para que buscadores y asistentes encuentren cada gestión. El texto es el de cada página oficial.</p>
    <div className="mt-3 flex flex-wrap gap-2"><a className="rounded-lg bg-acento px-3 py-2 text-sm font-medium text-acento-tinta" href={descarga('html')} download>Descargar página A–Z (HTML)</a><a className="rounded-lg border border-linea bg-superficie px-3 py-2 text-sm text-tinta hover:border-acento-borde" href={descarga('jsonld')} download>Descargar schema.org (JSON-LD)</a></div>
  </div>;
  const tecnico = <div className="mt-3 flex flex-wrap gap-2"><button className={button} onClick={onMapa}>Ver mapa del sitio</button><button className={button} onClick={onDescargar}>Descargar catálogo JSON</button></div>;
  if (!m) return <details className="group rounded-2xl border border-linea bg-superficie px-5 py-4 text-sm text-tinta-media"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-tinta">Para el equipo del sitio: qué cambió y qué falta<span aria-hidden="true" className="text-tinta-suave transition-transform group-open:rotate-90">›</span></summary>{arreglo}{tecnico}<p className="mt-3 text-xs">Volvé a recorrer el sitio para registrar qué cambia de una lectura a otra.</p></details>;
  const lista = (titulo: string, items: { nombre: string; fuente: string; detalle?: string }[]) => items.length > 0 && <div className="mt-3"><p className="font-medium text-tinta">{titulo} · {items.length}</p><ul className="mt-1 space-y-1">{items.slice(0, 12).map(x => <li key={x.fuente}><a className="underline" href={x.fuente} target="_blank" rel="noopener noreferrer">{x.nombre}</a>{x.detalle && <span> — {x.detalle}</span>}</li>)}</ul></div>;
  const cifras: [number, string][] = m.primera_lectura ? [[m.sin_acceso.length, 'sin acceso directo']] : [[m.nuevas.length, 'nuevas'], [m.quitadas.length, 'ya no aparecen'], [m.modificadas.length, 'cambiaron'], [m.sin_acceso.length, 'sin acceso directo']];
  return <details className="group rounded-2xl border border-linea bg-superficie px-5 py-4 text-sm text-tinta-media">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-tinta">Para el equipo del sitio: qué cambió y qué falta<span aria-hidden="true" className="text-tinta-suave transition-transform group-open:rotate-90">›</span></summary>
    {arreglo}{tecnico}
    <p className="mt-3 text-xs">{m.primera_lectura ? 'Primera lectura de este sitio: la próxima vez que se recorra vas a ver qué cambió.' : `Comparado con la lectura del ${new Date(m.desde!).toLocaleString('es-AR')}. ${m.sin_cambios} gestiones sin cambios.`}</p>
    <div className="mt-3 flex flex-wrap gap-2">{cifras.map(([n, t]) => <span key={t} className="rounded-full border border-linea px-3 py-1 text-xs"><strong className="text-tinta">{n}</strong> {t}</span>)}</div>
    {lista('Nuevas', m.nuevas)}
    {lista('Ya no aparecen', m.quitadas)}
    {lista('Cambiaron', m.modificadas.map(x => ({ ...x, detalle: x.cambios.map(c => CAMPO[c.campo] || c.campo).join(', ') })))}
    {lista('Sin acceso directo identificado', m.sin_acceso)}
    {lista('Bob las marcó para revisar', dudosas)}
    <p className="mt-3 text-[11px]">Se compara el texto literal de cada ficha. Una gestión «sin acceso directo» puede tenerlo en el sitio pero no con un enlace que se pueda leer.</p>
  </details>;
}

