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
  return (
    <div className="space-y-2">
      <input
        value={consulta}
        onChange={(e) => onConsulta(e.target.value)}
        placeholder="Buscar en el sitio..."
        className="w-full rounded border border-line bg-fondo px-2.5 py-1.5 text-sm text-ink placeholder:text-muted focus:border-ember focus:outline-none"
      />

      {consulta.trim() && (
        <div>
          <p className="px-1 text-[11px] text-muted">
            {resultados.length === 0
              ? "Sin resultados"
              : `${resultados.length} ${resultados.length === 1 ? "página" : "páginas"}`}
          </p>
          <ul className="mt-1 space-y-0.5">
            {resultados.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => onElegir(p)}
                  className="w-full rounded px-1.5 py-1 text-left hover:bg-surface"
                >
                  <span className="block truncate text-sm text-ink">{p.titulo}</span>
                  <span className="block truncate font-mono text-[11px] text-muted">
                    {p.url}
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
