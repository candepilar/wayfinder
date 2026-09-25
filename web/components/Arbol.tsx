"use client";

import { Nodo } from "@/lib/tipos";
import { contarPaginas, etiqueta } from "@/lib/arbol";

type Props = {
  nodos: Nodo[];
  claveSeleccionada: string | null;
  abiertos: Set<string>;
  onSeleccionar: (nodo: Nodo) => void;
  onAlternar: (clave: string) => void;
};

export default function Arbol(props: Props) {
  return (
    <ul className="space-y-0.5">
      {props.nodos.map((nodo) => (
        <Rama key={nodo.clave} nodo={nodo} nivel={0} {...props} />
      ))}
    </ul>
  );
}

function Rama({ nodo, nivel, ...props }: Props & { nodo: Nodo; nivel: number }) {
  const tieneHijos = nodo.hijos.length > 0;
  const abierto = props.abiertos.has(nodo.clave);
  const seleccionado = props.claveSeleccionada === nodo.clave;

  // Un nodo sin pagina es un nivel del path que el crawler nunca visito
  // (existe /tramites/dni/renovar pero no /tramites/dni). Se muestra apagado
  // para que se note que es un andamio y no una pagina real.
  const esAndamio = nodo.pagina === null;

  return (
    <li>
      <div
        className={`group flex items-center gap-1 rounded px-1.5 py-1 text-sm ${
          seleccionado ? "bg-ember/15 text-ink" : "hover:bg-surface"
        }`}
        style={{ paddingLeft: `${nivel * 14 + 6}px` }}
      >
        {tieneHijos ? (
          <button
            onClick={() => props.onAlternar(nodo.clave)}
            aria-label={abierto ? "Cerrar" : "Abrir"}
            className="w-4 shrink-0 text-muted hover:text-ink"
          >
            {abierto ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <button
          onClick={() => props.onSeleccionar(nodo)}
          className={`flex-1 truncate text-left ${
            esAndamio ? "italic text-muted" : "text-ink"
          }`}
          title={nodo.pagina?.url || nodo.clave}
        >
          {etiqueta(nodo)}
        </button>

        {tieneHijos && (
          <span className="shrink-0 text-[11px] tabular-nums text-muted">
            {contarPaginas(nodo)}
          </span>
        )}
      </div>

      {tieneHijos && abierto && (
        <ul className="space-y-0.5">
          {nodo.hijos.map((hijo) => (
            <Rama key={hijo.clave} nodo={hijo} nivel={nivel + 1} {...props} />
          ))}
        </ul>
      )}
    </li>
  );
}
