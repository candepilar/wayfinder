"use client";

import { useMemo, useState } from "react";

import Arbol from "@/components/Arbol";
import Buscador from "@/components/Buscador";
import Detalle from "@/components/Detalle";
import { ancestrosDe, armarArbol, buscar, segmentosDe } from "@/lib/arbol";
import { Nodo, Pagina, WebMap } from "@/lib/tipos";

// Por ahora el mapa se importa del repo: es un archivo commiteado que hace de
// dato de prueba. Cuando el crawler exista, esto pasa a ser un fetch a la API
// y no hay que tocar nada mas de esta pantalla.
import mapaEjemplo from "@/datos/ejemplo.webmap.json";

const mapa = mapaEjemplo as WebMap;

export default function Home() {
  const [claveSeleccionada, setClaveSeleccionada] = useState<string | null>(null);
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const [consulta, setConsulta] = useState("");

  // El arbol y los indices se calculan una sola vez: el mapa no cambia.
  const { nodos, porClave, porId, home } = useMemo(() => {
    const nodos = armarArbol(mapa.paginas);

    const porClave = new Map<string, Nodo>();
    const registrar = (n: Nodo) => {
      porClave.set(n.clave, n);
      n.hijos.forEach(registrar);
    };
    nodos.forEach(registrar);

    const porId = new Map(mapa.paginas.map((p) => [p.id, p]));
    const home = mapa.paginas.find((p) => segmentosDe(p).length === 0) ?? null;

    return { nodos, porClave, porId, home };
  }, []);

  const resultados = useMemo(() => buscar(mapa.paginas, consulta), [consulta]);

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

  /** Al elegir un resultado de la busqueda hay que abrir el camino hasta el. */
  function elegirPagina(pagina: Pagina) {
    const clave = segmentosDe(pagina).join("/");
    setAbiertos((previos) => new Set([...previos, ...ancestrosDe(clave)]));
    setClaveSeleccionada(clave);
    setConsulta("");
  }

  return (
    <main className="flex h-screen flex-col">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-medium text-ink">
            {mapa.sitio.titulo ?? mapa.sitio.url}
          </h1>
          <p className="truncate font-mono text-[11px] text-muted">{mapa.sitio.url}</p>
        </div>
        <p className="text-xs text-muted">
          {mapa.paginas.length} páginas
          {mapa.sitio.crawleado_en &&
            ` · crawleado ${new Date(mapa.sitio.crawleado_en).toLocaleString("es-AR")}`}
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="w-full shrink-0 space-y-3 overflow-y-auto border-line p-3 md:w-80 md:border-r">
          <Buscador
            consulta={consulta}
            onConsulta={setConsulta}
            resultados={resultados}
            onElegir={elegirPagina}
          />

          {!consulta.trim() && (
            <>
              {home && (
                <button
                  onClick={() => setClaveSeleccionada("")}
                  className={`w-full truncate rounded px-1.5 py-1 text-left text-sm ${
                    claveSeleccionada === "" ? "bg-ember/15" : "hover:bg-surface"
                  }`}
                >
                  {home.titulo}
                </button>
              )}
              <Arbol
                nodos={nodos}
                claveSeleccionada={claveSeleccionada}
                abiertos={abiertos}
                onSeleccionar={(n) => setClaveSeleccionada(n.clave)}
                onAlternar={alternar}
              />
            </>
          )}
        </aside>

        <section className="min-h-0 flex-1 overflow-y-auto">
          <Detalle
            nodo={
              claveSeleccionada === "" && home
                ? { clave: "", segmento: "", pagina: home, hijos: [] }
                : nodoSeleccionado
            }
            paginasPorId={porId}
          />
        </section>
      </div>
    </main>
  );
}
