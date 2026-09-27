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
  return <div className="min-h-screen bg-fondo text-tinta">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-linea bg-superficie px-6 py-4">
      <button className={button} onClick={onVolver}>← Otro sitio</button>
      <div className="flex flex-wrap gap-2"><button className={button} onClick={onMapa}>Ver mapa del sitio</button><button className={button} onClick={descargar}>Descargar catálogo JSON</button></div>
    </header>
    <main className="mx-auto max-w-5xl px-6 py-10">
      <p className="text-xs uppercase tracking-widest text-acento">Gestiones del sitio</p>
      <h1 className="mt-2 text-3xl font-semibold">{mapa.sitio.titulo || new URL(mapa.sitio.url).hostname}</h1>
      <p className="mt-3 max-w-2xl text-tinta-media">Encontrá lo que necesitás hacer, revisá las indicaciones y continuá en el sitio de origen.</p>
      <ComoLoArmoBob catalog={catalog} leidas={mapa.paginas.length} />
      <Asistente contexto={`sitio:${mapa.sitio.url}`} buscarLocal={q => buscarFichas(catalog.fichas, q, 3).map(f => ({ id: f.id, nombre: f.nombre }))} nombre={mapa.sitio.titulo || mapa.sitio.url} onFicha={id => { setSelected(catalog.fichas.find(f => f.id === id) || null); setTimeout(() => document.getElementById('ficha-gestion')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0); }} />
      {selected ? <>
        <button className={`${button} mt-6`} onClick={() => setSelected(null)}>← Volver a las gestiones</button>
        <article id="ficha-gestion" className="mt-6 space-y-5">
          <h2 className="text-2xl font-semibold">{selected.nombre}</h2>
          <div className="rounded-xl border border-acento-borde bg-acento-suave p-5">
            <div className="flex flex-wrap gap-3">{selected.destinos.map(d => <a key={d.url} href={d.url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-acento px-4 py-3 text-sm font-medium text-acento-tinta">{d.texto} ↗</a>)}</div>
            {!selected.destinos.length && <p className="text-sm">No identificamos un acceso directo inequívoco. Consultá la página de origen para continuar.</p>}
            {selected.clics_desde_portada && selected.clics_desde_portada > 1 && <p className="mt-3 text-sm text-tinta">En el sitio, esta gestión está a <strong>{selected.clics_desde_portada} clics</strong> de la portada. Acá, a uno.</p>}
            <a className="mt-3 inline-block text-sm underline" href={selected.fuente} target="_blank" rel="noopener noreferrer">Ver información en el sitio de origen ↗</a>
            <p className="mt-3 text-xs leading-relaxed text-tinta-media">El enlace se abre en otra pestaña y esta guía queda disponible. Wayfinder no envía formularios. Abrir el acceso no significa completar la gestión.</p>
          </div>
          <Bloques title="Qué necesitás" bloques={selected.requisitos} checklist key={`${selected.id}-requisitos`} />
          <Bloques title="Cómo hacerlo" bloques={selected.pasos} />
          <Bloques title="Costo" bloques={selected.costo} />
          <Bloques title="Dónde se hace y contacto" bloques={selected.donde_se_hace} />
          <p className="text-xs text-tinta-suave">Fuente consultada el {new Date(selected.fecha).toLocaleString('es-AR')}. Información organizada automáticamente; verificá vigencia y condiciones en el sitio de origen.</p>
        </article>
      </> : <>
        <label htmlFor="buscar-gestion" className="mt-7 block text-sm font-medium">¿Qué necesitás hacer?</label>
        <input id="buscar-gestion" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscá una gestión o servicio" className="mt-2 w-full rounded-xl border border-linea bg-superficie px-4 py-3 text-sm outline-none focus:border-acento-borde" />
        <p role="status" className="mt-3 text-xs text-tinta-suave">{results.length} gestiones encontradas en el catálogo</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">{results.map(f => <button key={f.id} onClick={() => setSelected(f)} className="rounded-xl border border-linea bg-superficie p-5 text-left shadow-panel hover:border-acento-borde"><h2 className="font-semibold">{f.nombre}</h2><p className="mt-3 text-sm text-tinta-media">Ver indicaciones y cómo continuar →</p></button>)}</div>
        {!results.length && <div className="mt-5 rounded-xl border border-linea bg-superficie p-5"><h2 className="font-medium">{catalog.fichas.length ? 'No encontramos coincidencias en este catálogo' : 'Todavía no identificamos gestiones con evidencia suficiente'}</h2><p className="mt-2 text-sm text-tinta-media">Eso no significa que no existan. Podés consultar el sitio o explorar el mapa de las páginas leídas.</p><a className="mt-3 inline-block text-sm underline" href={mapa.sitio.url} target="_blank" rel="noopener noreferrer">Ir al sitio de origen ↗</a></div>}
      </>}
      <Mantenimiento m={catalog.mantenimiento} sitio={mapa.sitio.url} fichas={catalog.fichas.length} />
      <details className="mt-10 rounded-xl border border-linea p-4 text-xs text-tinta-media">
        <summary className="cursor-pointer">Fuente y alcance · {mapa.paginas.length} páginas leídas · {catalog.fichas.length} fichas</summary>
        <p className="mt-3">Recorrido {mapa.ejecucion?.estado || 'de alcance limitado'}; {mapa.ejecucion?.pendientes || 0} enlaces pendientes. Lectura de HTML público; páginas que necesitan sesión, JavaScript o documentos adjuntos pueden quedar fuera.</p>
        <p className="mt-2">Organización con IBM Bob: {catalog.bob.estado}. {catalog.bob.fichas_aceptadas ?? 0} fichas organizadas o completadas por Bob; las restantes se identificaron por la estructura de la página.</p>
        {(catalog.bob.estado === 'error' || Boolean(catalog.calidad.paginas_omitidas_bob) || Boolean(catalog.calidad.bloques_omitidos_bob)) && <p className="mt-2">La revisión de Bob fue incompleta. Páginas fuera del análisis: {catalog.calidad.paginas_omitidas_bob || 0}; bloques omitidos por límite: {catalog.calidad.bloques_omitidos_bob || 0}.</p>}
        <p className="mt-2">Las fuentes respaldan el texto, pero no certifican que una gestión esté vigente ni que sus enlaces funcionen. Esta guía no es un servicio oficial del sitio.</p>
      </details>
    </main>
  </div>;
}

function Bloques({ title, bloques, checklist = false }: { title: string; bloques: Fragmento[]; checklist?: boolean }) {
  return <section className="rounded-xl border border-linea bg-superficie p-5"><h3 className="font-semibold">{title}</h3>
    {!bloques.length ? <p className="mt-3 text-sm text-tinta-media">No identificado en la información leída. Consultá la fuente.</p> :
      <div className="mt-3 space-y-3">{bloques.map((b, i) => checklist && b.tipo === 'item' ?
        <label key={i} className="flex items-start gap-3 text-sm leading-relaxed"><input className="mt-1 shrink-0 accent-[var(--acento)]" type="checkbox" /><span>{b.texto}</span></label> :
        <p key={i} className={`text-sm leading-relaxed ${b.tipo === 'titulo' || b.tipo === 'subtitulo' ? 'font-medium' : 'text-tinta-media'}`}>{b.texto}</p>)}</div>}
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
  ];
  return <details className="mt-5 rounded-xl border border-linea bg-superficie p-4" open={tareas.length > 1}>
    <summary className="cursor-pointer text-sm font-medium text-tinta">Cómo lo armó IBM Bob</summary>
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
function Mantenimiento({ m, sitio, fichas }: { m?: CatalogoSitio['mantenimiento']; sitio: string; fichas: number }) {
  const descarga = (formato: string) => `${API_BASE}/exportar?url=${encodeURIComponent(sitio)}&formato=${formato}`;
  const arreglo = fichas > 0 && <div className="mt-3 rounded-lg border border-acento-borde bg-acento-suave p-4">
    <p className="font-medium text-tinta">Del diagnóstico al arreglo</p>
    <p className="mt-1 text-xs leading-relaxed">Descargá una página «Trámites de la A a la Z» para publicar en tu sitio (todas las gestiones a un clic, accesible y sin dependencias) y sus datos estructurados schema.org para que buscadores y asistentes encuentren cada gestión. El texto es el de cada página oficial.</p>
    <div className="mt-3 flex flex-wrap gap-2"><a className="rounded-lg bg-acento px-3 py-2 text-sm font-medium text-acento-tinta" href={descarga('html')} download>Descargar página A–Z (HTML)</a><a className="rounded-lg border border-linea bg-superficie px-3 py-2 text-sm text-tinta hover:border-acento-borde" href={descarga('jsonld')} download>Descargar schema.org (JSON-LD)</a></div>
  </div>;
  if (!m) return <details className="mt-10 rounded-xl border border-linea bg-superficie p-4 text-sm text-tinta-media"><summary className="cursor-pointer font-medium text-tinta">Para el equipo del sitio: qué cambió y qué falta</summary>{arreglo}<p className="mt-3 text-xs">Volvé a recorrer el sitio para registrar qué cambia de una lectura a otra.</p></details>;
  const lista = (titulo: string, items: { nombre: string; fuente: string; detalle?: string }[]) => items.length > 0 && <div className="mt-3"><p className="font-medium text-tinta">{titulo} · {items.length}</p><ul className="mt-1 space-y-1">{items.slice(0, 12).map(x => <li key={x.fuente}><a className="underline" href={x.fuente} target="_blank" rel="noopener noreferrer">{x.nombre}</a>{x.detalle && <span> — {x.detalle}</span>}</li>)}</ul></div>;
  const cifras: [number, string][] = m.primera_lectura ? [[m.sin_acceso.length, 'sin acceso directo']] : [[m.nuevas.length, 'nuevas'], [m.quitadas.length, 'ya no aparecen'], [m.modificadas.length, 'cambiaron'], [m.sin_acceso.length, 'sin acceso directo']];
  return <details className="mt-10 rounded-xl border border-linea bg-superficie p-4 text-sm text-tinta-media">
    <summary className="cursor-pointer font-medium text-tinta">Para el equipo del sitio: qué cambió y qué falta</summary>
    {arreglo}
    <p className="mt-3 text-xs">{m.primera_lectura ? 'Primera lectura de este sitio: la próxima vez que se recorra vas a ver qué cambió.' : `Comparado con la lectura del ${new Date(m.desde!).toLocaleString('es-AR')}. ${m.sin_cambios} gestiones sin cambios.`}</p>
    <div className="mt-3 flex flex-wrap gap-2">{cifras.map(([n, t]) => <span key={t} className="rounded-full border border-linea px-3 py-1 text-xs"><strong className="text-tinta">{n}</strong> {t}</span>)}</div>
    {lista('Nuevas', m.nuevas)}
    {lista('Ya no aparecen', m.quitadas)}
    {lista('Cambiaron', m.modificadas.map(x => ({ ...x, detalle: x.cambios.map(c => CAMPO[c.campo] || c.campo).join(', ') })))}
    {lista('Sin acceso directo identificado', m.sin_acceso)}
    <p className="mt-3 text-[11px]">Se compara el texto literal de cada ficha. Una gestión «sin acceso directo» puede tenerlo en el sitio pero no con un enlace que se pueda leer.</p>
  </details>;
}

