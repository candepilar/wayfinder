"use client";

import { Pagina } from "@/lib/tipos";

export default function Buscador({
  consulta,
  onConsulta,
  resultados,
  onElegir,
}: {
  consulta: string;
  onConsulta: (valor: string) => void;
  resultados: Pagina[];
  onElegir: (pagina: Pagina) => void;
}) {
  const buscando = consulta.trim().length > 0;

  return (
    <div>
      <div className="flex items-center gap-2 rounded-lg border border-linea bg-superficie px-2.5 focus-within:border-acento-borde">
        <span className="shrink-0 text-tinta-suave">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.9-3.9" />
          </svg>
        </span>
        <input
          value={consulta}
          onChange={(e) => onConsulta(e.target.value)}
          placeholder="Buscar en el sitio"
          className="min-w-0 flex-1 bg-transparent py-2 text-[13px] text-tinta placeholder:text-tinta-suave focus:outline-none"
        />
        {buscando && (
          <button
            onClick={() => onConsulta("")}
            aria-label="Limpiar"
            className="shrink-0 text-tinta-suave hover:text-tinta"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>

      {buscando && (
        <div className="mt-3">
          <p className="mb-1.5 px-1 text-[11px] text-tinta-suave">
            {resultados.length === 0
              ? "Sin resultados"
              : `${resultados.length} ${resultados.length === 1 ? "página" : "páginas"}`}
          </p>
          <ul className="space-y-0.5">
            {resultados.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => onElegir(p)}
                  className="w-full rounded-md px-2 py-1.5 text-left transition-colors hover:bg-superficie-alta"
                >
                  <span className="block truncate text-[13px] text-tinta">{p.titulo}</span>
                  <span className="block truncate font-mono text-[11px] text-tinta-suave">
                    {p.url.replace(/^https?:\/\//, "")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
