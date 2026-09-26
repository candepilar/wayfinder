"use client";

import { useState } from "react";

import { Descartado, Hallazgo, Seguridad, Severidad } from "@/lib/tipos";

const ORDEN: Severidad[] = ["alta", "media", "baja"];

const GRAVEDAD: Record<Severidad, { palabra: string; color: string }> = {
  alta: { palabra: "Alta", color: "var(--alta)" },
  media: { palabra: "Media", color: "var(--media)" },
  baja: { palabra: "Baja", color: "var(--baja)" },
};

export default function Revision({ seguridad }: { seguridad?: Seguridad }) {
  if (!seguridad || seguridad.hallazgos.length === 0) return <SinRevision />;

  const descartados = seguridad.descartados_por_falta_de_prueba ?? [];
  const porGravedad = ORDEN.map((s) => ({
    severidad: s,
    hallazgos: seguridad.hallazgos.filter((h) => h.severidad === s),
  })).filter((g) => g.hallazgos.length > 0);

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <Encabezado seguridad={seguridad} descartados={descartados.length} />

      <div className="mt-8 space-y-8">
        {porGravedad.map(({ severidad, hallazgos }) => (
          <section key={severidad}>
            <h3 className="mb-3 flex items-center gap-2">
              <Forma severidad={severidad} />
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: GRAVEDAD[severidad].color }}
              >
                {GRAVEDAD[severidad].palabra}
              </span>
              <span className="text-[11px] text-tinta-suave">· {hallazgos.length}</span>
            </h3>

            <div className="space-y-2.5">
              {hallazgos.map((h) => (
                <Tarjeta key={h.titulo} hallazgo={h} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {descartados.length > 0 && <Descartes descartados={descartados} />}
    </div>
  );
}

function Encabezado({
  seguridad,
  descartados,
}: {
  seguridad: Seguridad;
  descartados: number;
}) {
  const segundos = seguridad.duracion_ms
    ? Math.round(seguridad.duracion_ms / 1000)
    : null;

  return (
    <header className="border-b border-linea pb-5">
      <h2 className="text-[22px] font-semibold tracking-tight text-tinta">
        Revisión técnica
      </h2>

      <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-tinta-media">
        {seguridad.evidencia?.alcance ??
          "Revisión pasiva: solo lo que recibe un visitante común."}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-tinta-media">
        <span>
          <strong className="font-medium text-tinta">
            {seguridad.hallazgos.length}
          </strong>{" "}
          hallazgos probados
        </span>
        <span className="text-linea-fuerte">·</span>
        <span>
          <strong className="font-medium text-tinta">{descartados}</strong> descartados
        </span>
        {seguridad.evidencia?.paginas_revisadas && (
          <>
            <span className="text-linea-fuerte">·</span>
            <span>{seguridad.evidencia.paginas_revisadas} páginas revisadas</span>
          </>
        )}
        {segundos !== null && (
          <>
            <span className="text-linea-fuerte">·</span>
            <span>{segundos} s</span>
          </>
        )}
      </div>
    </header>
  );
}

function Tarjeta({ hallazgo }: { hallazgo: Hallazgo }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <article className="rounded-xl border border-linea bg-superficie p-4 shadow-panel">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-sm font-medium leading-snug text-tinta">
          {hallazgo.titulo}
        </h4>
        <span className="shrink-0 rounded border border-linea bg-superficie-alta px-1.5 py-0.5 text-[10px] text-tinta-media">
          {hallazgo.categoria}
        </span>
      </div>

      <p className="mt-2 text-[13px] leading-relaxed text-tinta-media">
        {hallazgo.riesgo}
      </p>

      {/* La prueba textual es lo que separa esto de una lista de sospechas: si
          este fragmento no aparecía en lo recolectado, el motor lo descartaba. */}
      <div className="mt-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-tinta-suave">
          Prueba
        </p>
        <pre className="overflow-x-auto rounded-md border border-linea bg-superficie-alta px-2.5 py-2 font-mono text-[11px] leading-relaxed text-tinta-media">
          {hallazgo.evidencia}
        </pre>
      </div>

      {hallazgo.paginas.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setAbierto((v) => !v)}
            className="text-[11px] text-tinta-media hover:text-tinta"
          >
            {hallazgo.paginas.length}{" "}
            {hallazgo.paginas.length === 1 ? "página afectada" : "páginas afectadas"}
            <span className="ml-1 text-tinta-suave">{abierto ? "▾" : "▸"}</span>
          </button>

          {abierto && (
            <ul className="mt-1.5 space-y-0.5">
              {hallazgo.paginas.map((u) => (
                <li key={u} className="truncate font-mono text-[11px] text-tinta-suave">
                  {ruta(u)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * Lo que Bob afirmó y no pudo probar.
 *
 * Se muestra a propósito. Cualquiera puede mostrar lo que su IA produjo;
 * mostrar lo que se negó a sostener por falta de evidencia es lo que hace
 * creíble el resto de la lista.
 */
function Descartes({ descartados }: { descartados: Descartado[] }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <section className="mt-10 border-t border-linea pt-5">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-baseline justify-between gap-3 text-left"
      >
        <span className="text-[13px] font-medium text-tinta">
          Lo que Bob no pudo probar
        </span>
        <span className="shrink-0 text-[11px] text-tinta-suave">
          {descartados.length} descartados {abierto ? "▾" : "▸"}
        </span>
      </button>

      <p className="mt-1.5 max-w-xl text-[12px] leading-relaxed text-tinta-media">
        Cada hallazgo tiene que citar textualmente algo de la evidencia recolectada.
        Estos no lo hicieron, así que no entraron a la lista.
      </p>

      {abierto && (
        <ul className="mt-3 space-y-2">
          {descartados.map((d) => (
            <li
              key={d.titulo}
              className="rounded-lg border border-dashed border-linea-fuerte px-3.5 py-3"
            >
              <p className="text-[13px] text-tinta-media line-through decoration-tinta-suave">
                {d.titulo}
              </p>
              <p className="mt-1.5 font-mono text-[11px] text-tinta-suave">
                &ldquo;{d.cita}&rdquo;
              </p>
              <p className="mt-1.5 text-[11px] text-tinta-suave">↳ {d.motivo}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SinRevision() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <span className="text-linea-fuerte">
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3l7.5 3.2v5.1c0 4.3-3 8.2-7.5 9.4-4.5-1.2-7.5-5.1-7.5-9.4V6.2L12 3z" />
          <path d="M9.5 12l1.8 1.8L15 10" />
        </svg>
      </span>
      <p className="mt-4 max-w-[19rem] text-sm leading-relaxed text-tinta-suave">
        Este mapa todavía no tiene revisión técnica. La corre el motor cuando se pide
        el análisis con Bob.
      </p>
    </div>
  );
}

/**
 * Forma distinta por gravedad, no solo color: un triángulo, un cuadrado y un
 * círculo se distinguen en blanco y negro y sin depender de ver bien los tonos.
 */
function Forma({ severidad }: { severidad: Severidad }) {
  const color = GRAVEDAD[severidad].color;

  if (severidad === "alta") {
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
        <path d="M6 1l5 9.5H1z" fill={color} />
      </svg>
    );
  }
  if (severidad === "media") {
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
        <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" fill={color} />
      </svg>
    );
  }
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
      <circle cx="6" cy="6" r="4.5" fill={color} />
    </svg>
  );
}

/** Solo el camino: el dominio se repite en cada línea y no aporta nada. */
function ruta(url: string) {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
}
