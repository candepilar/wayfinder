"use client";

import { useMemo, useState } from "react";

import Arbol from "./Arbol";
import Buscador from "./Buscador";
import Detalle from "./Detalle";
import { ancestrosDe, armarArbol, buscar, segmentosDe } from "@/lib/arbol";
import { Nodo, Pagina, WebMap } from "@/lib/tipos";

export default function Visor({
  mapa,
  onVolver,
}: {
  mapa: WebMap;
  onVolver: () => void;
}) {
  const [claveSeleccionada, setClaveSeleccionada] = useState<string | null>(null);
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const [consulta, setConsulta] = useState("");

  // Se recalcula solo si cambia el mapa, que en la practica es una vez.
  const { nodos, porClave, porId, home, analizadas } = useMemo(() => {
    const nodos = armarArbol(mapa.paginas);

    const porClave = new Map<string, Nodo>();
    const registrar = (n: Nodo) => {
      porClave.set(n.clave, n);
      n.hijos.forEach(registrar);
    };
    nodos.forEach(registrar);

    const porId = new Map(mapa.paginas.map((p) => [p.id, p]));
    const home = mapa.paginas.find((p) => segmentosDe(p).length === 0) ?? null;
    const analizadas = mapa.paginas.filter((p) => p.resumen).length;

    return { nodos, porClave, porId, home, analizadas };
  }, [mapa]);

  const resultados = useMemo(() => buscar(mapa.paginas, consulta), [mapa, consulta]);

  const nodoSeleccionado = claveSeleccionada
    ? porClave.get(claveSeleccionada) ?? null
    : null;

  function alternar(clave: string) {
    setAbiertos((previos) => {
      const copia = new Set(previos);
      if (copia.has(clave)) copia.delete(clave);
      else copia.add(clave);
      return copia;
    });
  }

  /** Al elegir un resultado hay que abrir el camino hasta el en el arbol. */
  function elegirPagina(pagina: Pagina) {
    const clave = segmentosDe(pagina).join("/");
    setAbiertos((previos) => new Set([...previos, ...ancestrosDe(clave)]));
    setClaveSeleccionada(clave);
    setConsulta("");
  }

  const homeElegida = claveSeleccionada === "" && home;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-linea bg-superficie px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onVolver}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-linea px-2.5 py-1.5 text-xs text-tinta-media transition-colors hover:border-linea-fuerte hover:text-tinta"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
            Otro sitio
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-[13px] font-medium leading-tight text-tinta">
              {mapa.sitio.titulo ?? mapa.sitio.url}
            </h1>
            <p className="truncate font-mono text-[11px] leading-tight text-tinta-suave">
              {mapa.sitio.url.replace(/^https?:\/\//, "")}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 text-[11px] text-tinta-media">
          <Dato valor={mapa.paginas.length} etiqueta="páginas" />
          <span className="text-linea-fuerte">·</span>
          <Dato valor={analizadas} etiqueta="analizadas" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="w-full shrink-0 overflow-y-auto border-linea bg-superficie p-2.5 md:w-[19rem] md:border-r">
          <Buscador
            consulta={consulta}
            onConsulta={setConsulta}
            resultados={resultados}
            onElegir={elegirPagina}
          />

          {!consulta.trim() && (
            <nav className="mt-3">
              {home && (
                <button
                  onClick={() => setClaveSeleccionada("")}
                  className={`relative flex w-full items-center rounded-md py-1.5 pl-6 pr-1.5 text-left text-[13px] transition-colors ${
                    homeElegida
                      ? "bg-acento-suave font-medium text-tinta"
                      : "text-tinta-media hover:bg-superficie-alta hover:text-tinta"
                  }`}
                >
                  {homeElegida && (
                    <span className="absolute inset-y-1 left-0 w-[2px] rounded-full bg-acento" />
                  )}
                  <span className="truncate">{home.titulo}</span>
                </button>
              )}
              <Arbol
                nodos={nodos}
                claveSeleccionada={claveSeleccionada}
                abiertos={abiertos}
                onSeleccionar={(n) => setClaveSeleccionada(n.clave)}
                onAlternar={alternar}
              />
            </nav>
          )}
        </aside>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <Detalle
            nodo={
              homeElegida
                ? { clave: "", segmento: "", pagina: home, hijos: [] }
                : nodoSeleccionado
            }
            paginasPorId={porId}
          />
        </main>
      </div>
    </div>
  );
}

function Dato({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <span>
      <span className="font-medium text-tinta">{valor}</span> {etiqueta}
    </span>
  );
}
