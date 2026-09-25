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
    <ul>
      {props.nodos.map((nodo) => (
        <Rama key={nodo.clave} nodo={nodo} {...props} />
      ))}
    </ul>
  );
}

function Rama({ nodo, ...props }: Props & { nodo: Nodo }) {
  const tieneHijos = nodo.hijos.length > 0;
  const abierto = props.abiertos.has(nodo.clave);
  const seleccionado = props.claveSeleccionada === nodo.clave;

  // Un nodo sin pagina es un nivel del path que el crawler nunca visito
  // (existe /tramites/dni/renovar pero no /tramites/dni). Se muestra apagado
  // para que se note que es un andamio y no una pagina real.
  const esAndamio = nodo.pagina === null;
  const tieneFormulario = Boolean(nodo.pagina?.formularios?.length);

  return (
    <li>
      <div
        className={`group relative flex items-center rounded-md pr-1.5 transition-colors ${
          seleccionado ? "bg-acento-suave" : "hover:bg-superficie-alta"
        }`}
      >
        {/* Barra de acento a la izquierda: marca la seleccion sin depender del
            color de fondo, que en oscuro queda muy sutil. */}
        {seleccionado && (
          <span className="absolute inset-y-1 left-0 w-[2px] rounded-full bg-acento" />
        )}

        {tieneHijos ? (
          <button
            onClick={() => props.onAlternar(nodo.clave)}
            aria-label={abierto ? "Cerrar" : "Abrir"}
            className="flex h-7 w-6 shrink-0 items-center justify-center text-tinta-suave hover:text-tinta"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-150 ${abierto ? "rotate-90" : ""}`}
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <span className="w-6 shrink-0" />
        )}

        <button
          onClick={() => props.onSeleccionar(nodo)}
          title={nodo.pagina?.url || `/${nodo.clave}`}
          className={`min-w-0 flex-1 truncate py-1.5 text-left text-[13px] leading-5 ${
            seleccionado
              ? "font-medium text-tinta"
              : esAndamio
                ? "text-tinta-suave"
                : "text-tinta-media group-hover:text-tinta"
          }`}
        >
          {etiqueta(nodo)}
        </button>

        <div className="flex shrink-0 items-center gap-1.5 pl-1.5">
          {tieneFormulario && (
            <span title="Tiene formulario" className="text-tinta-suave">
              <IconoFormulario />
            </span>
          )}
          {tieneHijos && (
            <span className="min-w-[18px] text-right text-[11px] text-tinta-suave">
              {contarPaginas(nodo)}
            </span>
          )}
        </div>
      </div>

      {tieneHijos && abierto && (
        // La guia vertical sale de un borde real y no de padding calculado:
        // asi se ve de donde cuelga cada rama cuando el arbol es profundo.
        <ul className="ml-3 border-l border-linea pl-1.5">
          {nodo.hijos.map((hijo) => (
            <Rama key={hijo.clave} nodo={hijo} {...props} />
          ))}
        </ul>
      )}
    </li>
  );
}

function IconoFormulario() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h4" />
    </svg>
  );
}
