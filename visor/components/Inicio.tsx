"use client";

import { useEffect, useRef, useState } from "react";
import ExtensionButton from './ExtensionButton';
import Asistente from './Asistente';

import { buscarMapaPorUrl, listarMapas } from "@/lib/mapas";
import { WebMap } from "@/lib/tipos";
import { api, Evento, MapaReal } from "@/lib/motor";

type Recorrido = { estado: string; mapaId: string | null; error: string | null; eventos: Evento[] };
const maxPaginas = Math.min(200, Math.max(1, Number(process.env.NEXT_PUBLIC_MAX_PAGES) || 40));

function validarUrl(value: string) {
  const text = value.trim();
  const parsed = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || !parsed.hostname.includes('.'))
    throw new Error('Ingresá una dirección pública http o https, sin usuario ni contraseña.');
  return parsed.href;
}

export default function Inicio({ onAbrir, onMunicipio }: { onAbrir: (mapa: WebMap) => void; onMunicipio?: (id: string) => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => { try { const raw=new URLSearchParams(window.location.search).get('sitio'); if(raw){const u=new URL(raw);if(['http:','https:'].includes(u.protocol)&&!u.username&&!u.password)setUrl(u.href);} } catch {} }, []);
  const [error, setError] = useState<string | null>(null);
  const [mapas, setMapas] = useState<WebMap[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [job, setJob] = useState<string | null>(null);
  const [events, setEvents] = useState<Evento[]>([]);
  const [cancelando, setCancelando] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const ocupado = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);

  async function seguir(id: string, signal: AbortSignal) {
    while (!signal.aborted) {
      const state = await api<Recorrido>(`/recorridos/${id}`, undefined, AbortSignal.any([signal, AbortSignal.timeout(20000)]));
      if (signal.aborted) return;
      setEvents(state.eventos);
      if (state.estado === 'completado' && state.mapaId) {
        const mapa = await api<MapaReal>(`/mapas/${state.mapaId}`, undefined, AbortSignal.any([signal, AbortSignal.timeout(20000)]));
        if (!signal.aborted) { setJob(null); onAbrir(mapa); }
        return;
      }
      if (state.estado === 'error' || state.estado === 'cancelado') {
        setJob(null);
        throw new Error(state.estado === 'cancelado' ? 'Recorrido cancelado.' : state.error || 'No se pudo recorrer el sitio.');
      }
      await new Promise<void>(resolve => {
        const done = () => { clearTimeout(timer); signal.removeEventListener('abort', done); resolve(); };
        const timer = setTimeout(done, 1200);
        signal.addEventListener('abort', done, { once: true });
      });
    }
  }

  // Los mapas los tiene el motor. Si no contesta, `listarMapas` deja el escaneo
  // commiteado, asi que la pantalla nunca queda vacia por una caida.
  useEffect(() => {
    let vivo = true;
    listarMapas().then((m) => {
      if (vivo) setMapas(m);
    });
    return () => {
      vivo = false;
    };
  }, []);

  async function analizar(e?: React.FormEvent, entrada = url) {
    e?.preventDefault();
    if (ocupado.current) return;
    ocupado.current = true;
    controller.current?.abort();
    const task = new AbortController(); controller.current = task;
    setError(null);
    setBuscando(true);
    try {
      // Resume observation after a network failure without creating a second job.
      if (job) { await seguir(job, task.signal); return; }
      let normalized;
      try { normalized = validarUrl(entrada); } catch { throw new Error('Ingresá una dirección válida, por ejemplo https://laeconomica.com.ar/'); }
      setUrl(normalized);
      setEvents([]);
      const mapa = await buscarMapaPorUrl(normalized, AbortSignal.any([task.signal, AbortSignal.timeout(20000)]));
      if (task.signal.aborted) return;
      if (mapa?.catalogo && mapa.catalogo.bob.estado !== 'error') { onAbrir(mapa); return; }
      const created = await api<{ id: string }>('/recorridos', { url: normalized, maxPaginas, catalogo: true }, task.signal);
      if (task.signal.aborted) return;
      setJob(created.id);
      await seguir(created.id, task.signal);
    } catch (e) {
      if (!task.signal.aborted) setError(e instanceof Error ? e.message : 'No se pudo iniciar el recorrido.');
    } finally {
      if (controller.current === task) { ocupado.current = false; setBuscando(false); }
    }
  }

  async function cancelar() {
    if (!job || cancelando) return;
    setCancelando(true);
    try {
      await api(`/recorridos/${job}/cancelar`, {});
      controller.current?.abort(); ocupado.current = false;
      setJob(null); setBuscando(false); setError('Recorrido cancelado.');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cancelar.'); }
    finally { setCancelando(false); }
  }
  const leidas = Math.max(0, ...events.map(e => e.leidas || 0));
  // Progreso de las tareas paralelas de Bob en el catálogo (eventos catalogo_bob_*).
  const bobInicio = [...events].reverse().find(e => e.type === 'catalogo_bob_inicio');
  const bobProgreso = bobInicio?.lotes ? { total: bobInicio.lotes, paralelo: bobInicio.paralelo ?? bobInicio.lotes, hechas: events.filter(e => e.type === 'catalogo_bob_lote' && e.secuencia > bobInicio.secuencia).length } : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="absolute right-6 top-6"><ExtensionButton /></div>
      <main className="w-full max-w-lg">
        <div className="mb-10 text-center">
          <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-linea bg-superficie shadow-panel">
            <IconoMapa />
          </div>
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-tinta">
            Entendé un sitio entero
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-tinta-media">
            Dale una dirección y te devolvemos el mapa de todo lo que hay adentro:
            secciones, páginas, formularios y cómo se llega a cada cosa.
          </p>
        </div>

        <form onSubmit={analizar}>
          <div className="flex items-center gap-2 rounded-xl border border-linea bg-superficie p-1.5 shadow-panel focus-within:border-acento-borde">
            <span className="pl-2.5 text-tinta-suave">
              <IconoGlobo />
            </span>
            <input
              aria-label="Dirección del sitio"
              disabled={buscando || Boolean(job)}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="portal-ejemplo.gob.ar"
              spellCheck={false}
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent py-2 font-mono text-sm text-tinta placeholder:font-sans placeholder:text-tinta-suave focus:outline-none"
            />
            <button
              type="submit"
              disabled={!url.trim() || buscando}
              className="shrink-0 rounded-lg bg-acento px-4 py-2 text-sm font-medium text-acento-tinta transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-25"
            >
              {buscando ? (job ? "Organizando…" : "Buscando…") : job ? "Reintentar seguimiento" : "Abrir"}
            </button>
          </div>
        </form>

        <p className="mt-3 px-1 text-xs leading-relaxed text-tinta-suave">Si todavía no hay un catálogo, recorremos hasta {maxPaginas} páginas públicas y organizamos sus gestiones con IBM Bob. Puede tardar unos minutos; la cobertura puede ser parcial.</p>
        {job && <section role="status" aria-live="polite" className="mt-4 rounded-xl border border-linea bg-superficie p-4">
          <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-tinta">{buscando ? 'Recorrido en curso' : 'Seguimiento interrumpido'} · {leidas} páginas leídas</p><button type="button" disabled={cancelando} onClick={() => void cancelar()} className="text-xs text-tinta-media underline">{cancelando ? 'Cancelando…' : 'Cancelar'}</button></div>
          {bobProgreso && <div className="mt-3"><p className="text-xs font-medium text-acento">IBM Bob · {bobProgreso.hechas} de {bobProgreso.total} tareas en paralelo ({bobProgreso.paralelo} a la vez)</p><div className="mt-2 flex gap-1" aria-hidden="true">{Array.from({ length: bobProgreso.total }, (_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < bobProgreso.hechas ? 'bg-acento' : 'bg-linea'}`} />)}</div></div>}
          <div className="mt-3 space-y-2 text-xs text-tinta-media">{events.filter(event => event.type !== 'bob_evento').slice(-4).map(event => <p className="break-words" key={event.secuencia}>{event.type === 'pagina' ? '✓ ' : ''}{event.titulo || event.mensaje || event.url || event.type.replaceAll('_', ' ')}</p>)}</div>
        </section>}

        {error && (
          <p role="alert" className="mt-3 flex items-start gap-2 px-1 text-[13px] leading-relaxed text-tinta-media">
            <span className="mt-[3px] shrink-0 text-tinta-suave">
              <IconoAviso />
            </span>
            {error}
          </p>
        )}

        {onMunicipio && <section className="mt-10 rounded-xl border border-acento-borde bg-acento-suave p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-tinta-suave">Nuevo · Orientación municipal</p>
          <h2 className="mt-2 text-xl font-semibold text-tinta">Encontrá tu trámite y avanzá</h2>
          <p className="mt-2 text-sm leading-relaxed text-tinta-media">Elegí tu municipio. Te orientamos con requisitos, pasos y acceso al sitio oficial.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button onClick={() => onMunicipio('rosario')} className="rounded-lg border border-linea bg-superficie px-4 py-3 text-sm font-medium text-tinta hover:border-acento-borde">Rosario →</button>
            <button onClick={() => onMunicipio('vgg')} className="rounded-lg border border-linea bg-superficie px-4 py-3 text-sm font-medium text-tinta hover:border-acento-borde">Villa Gobernador Gálvez →</button>
          </div>
        </section>}

        <Asistente />

        {mapas.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-tinta-suave">
            Mapas listos
          </h2>
          <ul className="space-y-2">
            {mapas.map((mapa) => (
              <li key={mapa.sitio.url}>
                <Tarjeta mapa={mapa} onAbrir={() => { if (!ocupado.current) void analizar(undefined, mapa.sitio.url); }} />
              </li>
            ))}
          </ul>
        </section>
        )}
      </main>
    </div>
  );
}

function Tarjeta({ mapa, onAbrir }: { mapa: WebMap; onAbrir: () => void }) {
  const analizadas = mapa.paginas.filter((p) => p.resumen).length;
  const formularios = mapa.paginas.reduce((n, p) => n + (p.formularios?.length ?? 0), 0);

  return (
    <button
      onClick={onAbrir}
      className="group flex w-full items-center gap-4 rounded-xl border border-linea bg-superficie px-4 py-3.5 text-left transition-colors hover:border-linea-fuerte hover:bg-superficie-alta"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-tinta">
          {mapa.sitio.titulo ?? mapa.sitio.url}
        </p>
        <p className="mt-0.5 truncate font-mono text-xs text-tinta-suave">
          {mapa.sitio.url.replace(/^https?:\/\//, "")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-tinta-media">
          <span>{mapa.paginas.length} páginas</span>
          <span className="text-tinta-suave">·</span>
          <span>{analizadas} analizadas</span>
          {formularios > 0 && (
            <>
              <span className="text-tinta-suave">·</span>
              <span>{formularios} formularios</span>
            </>
          )}
        </div>
      </div>
      <span className="shrink-0 text-tinta-suave transition-transform group-hover:translate-x-0.5 group-hover:text-tinta-media">
        <IconoFlecha />
      </span>
    </button>
  );
}

/* Iconos en SVG inline: son cuatro, y una libreria entera para eso son
   kilobytes y una dependencia mas que mantener. */

function IconoMapa() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-acento">
      <circle cx="12" cy="5" r="2.2" />
      <circle cx="5.5" cy="18" r="2.2" />
      <circle cx="18.5" cy="18" r="2.2" />
      <path d="M12 7.2v3.3M10.6 12.2 7 15.9M13.4 12.2 17 15.9" />
    </svg>
  );
}

function IconoGlobo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
    </svg>
  );
}

function IconoAviso() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 7.5v5M12 16.2v.1" />
    </svg>
  );
}

function IconoFlecha() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
