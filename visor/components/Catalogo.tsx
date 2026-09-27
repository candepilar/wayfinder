"use client";

import { useMemo, useState } from 'react';
import { WebMap } from '@/lib/tipos';
import { Ficha, Fragmento } from '@/lib/catalogo';
import Asistente from './Asistente';
import { buscarFichas } from '@/lib/buscar';
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
      <Asistente contexto={`sitio:${mapa.sitio.url}`} buscarLocal={q => buscarFichas(catalog.fichas, q, 3).map(f => ({ id: f.id, nombre: f.nombre }))} nombre={mapa.sitio.titulo || mapa.sitio.url} onFicha={id => { setSelected(catalog.fichas.find(f => f.id === id) || null); setTimeout(() => document.getElementById('ficha-gestion')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0); }} />
      {selected ? <>
        <button className={`${button} mt-6`} onClick={() => setSelected(null)}>← Volver a las gestiones</button>
        <article id="ficha-gestion" className="mt-6 space-y-5">
          <h2 className="text-2xl font-semibold">{selected.nombre}</h2>
          <div className="rounded-xl border border-acento-borde bg-acento-suave p-5">
            <div className="flex flex-wrap gap-3">{selected.destinos.map(d => <a key={d.url} href={d.url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-acento px-4 py-3 text-sm font-medium text-acento-tinta">{d.texto} ↗</a>)}</div>
            {!selected.destinos.length && <p className="text-sm">No identificamos un acceso directo inequívoco. Consultá la página de origen para continuar.</p>}
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
