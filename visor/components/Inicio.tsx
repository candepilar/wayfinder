"use client";

import { useEffect, useState } from "react";
import ExtensionButton from './ExtensionButton';

import { buscarMapaPorUrl, listarMapas } from "@/lib/mapas";
import { WebMap } from "@/lib/tipos";

export default function Inicio({ onAbrir }: { onAbrir: (mapa: WebMap) => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => { try { const raw=new URLSearchParams(window.location.search).get('sitio'); if(raw){const u=new URL(raw);if(['http:','https:'].includes(u.protocol)&&!u.username&&!u.password)setUrl(u.href);} } catch {} }, []);
  const [error, setError] = useState<string | null>(null);

  const mapas = listarMapas();

  function analizar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const mapa = buscarMapaPorUrl(url);
    if (mapa) {
      onAbrir(mapa);
      return;
    }

    // Mientras no exista el crawler, decirlo es mejor que mostrar el ejemplo
    // como si fuera el sitio pedido: un dato falso disfrazado de real hace
    // perder mas tiempo del que ahorra.
    setError("Todavía no hay un mapa de este sitio. El crawler está en construcción.");
  }

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
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="portal-ejemplo.gob.ar"
              spellCheck={false}
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent py-2 font-mono text-sm text-tinta placeholder:font-sans placeholder:text-tinta-suave focus:outline-none"
            />
            <button
              type="submit"
              disabled={!url.trim()}
              className="shrink-0 rounded-lg bg-acento px-4 py-2 text-sm font-medium text-acento-tinta transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-25"
            >
              Abrir
            </button>
          </div>
        </form>

        {error && (
          <p className="mt-3 flex items-start gap-2 px-1 text-[13px] leading-relaxed text-tinta-media">
            <span className="mt-[3px] shrink-0 text-tinta-suave">
              <IconoAviso />
            </span>
            {error}
          </p>
        )}

        <section className="mt-12">
          <h2 className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-tinta-suave">
            Mapas listos
          </h2>
          <ul className="space-y-2">
            {mapas.map((mapa) => (
              <li key={mapa.sitio.url}>
                <Tarjeta mapa={mapa} onAbrir={() => onAbrir(mapa)} />
              </li>
            ))}
          </ul>
        </section>
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
