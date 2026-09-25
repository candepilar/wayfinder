"use client";

import { Nodo, Pagina } from "@/lib/tipos";

/**
 * Panel derecho: todo lo que sabemos de la pagina elegida.
 *
 * Muestra a proposito lo que FALTA, no solo lo que hay. Mientras se desarrolla
 * el crawler, ver "todavia sin analizar" es mas util que ver un hueco vacio:
 * dice de un vistazo hasta donde llego el pipeline.
 */
export default function Detalle({
  nodo,
  paginasPorId,
}: {
  nodo: Nodo | null;
  paginasPorId: Map<string, Pagina>;
}) {
  if (!nodo) return <Vacio />;
  if (!nodo.pagina) return <Andamio nodo={nodo} />;

  const p = nodo.pagina;
  const analizada = Boolean(p.resumen);
  const segmentos = nodo.clave ? nodo.clave.split("/") : [];

  return (
    <article className="mx-auto max-w-2xl px-8 py-8">
      <header className="border-b border-linea pb-6">
        {segmentos.length > 0 && (
          <nav className="mb-2 flex flex-wrap items-center gap-1 font-mono text-[11px] text-tinta-suave">
            {segmentos.map((s, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-linea-fuerte">/</span>}
                <span className={i === segmentos.length - 1 ? "text-tinta-media" : ""}>
                  {s}
                </span>
              </span>
            ))}
          </nav>
        )}

        <h2 className="text-[22px] font-semibold leading-snug tracking-tight text-tinta">
          {p.titulo}
        </h2>

        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex max-w-full items-center gap-1.5 font-mono text-xs text-tinta-suave hover:text-acento"
        >
          <span className="truncate">{p.url.replace(/^https?:\/\//, "")}</span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M14 4h6v6M20 4l-8 8M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
          </svg>
        </a>
      </header>

      <div className="space-y-7 pt-6">
        {!analizada && (
          <p className="flex items-start gap-2.5 rounded-lg border border-dashed border-linea-fuerte px-3.5 py-3 text-[13px] leading-relaxed text-tinta-media">
            <span className="mt-0.5 shrink-0 text-tinta-suave">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                <circle cx="12" cy="12" r="9.5" />
                <path d="M12 7.5v5l3 2" />
              </svg>
            </span>
            Todavía sin analizar por Bob: de esta página solo tenemos la dirección y el
            título.
          </p>
        )}

        {p.resumen && (
          <Seccion titulo="Resumen">
            <p className="text-[15px] leading-relaxed text-tinta">{p.resumen}</p>
          </Seccion>
        )}

        {p.headings?.length ? (
          <Seccion titulo="Secciones de la página">
            <ul className="space-y-1.5">
              {p.headings.map((h) => (
                <li key={h} className="flex gap-2.5 text-sm text-tinta-media">
                  <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-linea-fuerte" />
                  {h}
                </li>
              ))}
            </ul>
          </Seccion>
        ) : null}

        {p.entidades?.length ? (
          <Seccion titulo="Entidades">
            <Fichas valores={p.entidades} />
          </Seccion>
        ) : null}

        {p.acciones?.length ? (
          <Seccion titulo="Acciones">
            <Fichas valores={p.acciones} acento />
          </Seccion>
        ) : null}

        {p.formularios?.length ? (
          <Seccion titulo={`Formularios · ${p.formularios.length}`}>
            <div className="space-y-2.5">
              {p.formularios.map((f) => (
                <div
                  key={f.nombre}
                  className="rounded-xl border border-linea bg-superficie p-4 shadow-panel"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium text-tinta">{f.nombre}</p>
                    {f.destino && (
                      <p className="shrink-0 font-mono text-[11px] text-tinta-suave">
                        {f.destino}
                      </p>
                    )}
                  </div>
                  <p className="mt-3 mb-2 text-[11px] uppercase tracking-[0.06em] text-tinta-suave">
                    {f.campos.length} campos
                  </p>
                  <Fichas valores={f.campos} />
                </div>
              ))}
            </div>
          </Seccion>
        ) : null}

        {p.enlaces?.length ? (
          <Seccion titulo={`Enlaza a · ${p.enlaces.length}`}>
            <ul className="divide-y divide-linea border-y border-linea">
              {p.enlaces.map((id) => (
                <li
                  key={id}
                  className="truncate py-2 text-[13px] text-tinta-media"
                >
                  {paginasPorId.get(id)?.titulo ?? id}
                </li>
              ))}
            </ul>
          </Seccion>
        ) : null}
      </div>
    </article>
  );
}

function Vacio() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <span className="text-linea-fuerte">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="2.2" />
          <circle cx="5.5" cy="18" r="2.2" />
          <circle cx="18.5" cy="18" r="2.2" />
          <path d="M12 7.2v3.3M10.6 12.2 7 15.9M13.4 12.2 17 15.9" />
        </svg>
      </span>
      <p className="mt-4 max-w-[18rem] text-sm leading-relaxed text-tinta-suave">
        Elegí una página del árbol para ver qué contiene.
      </p>
    </div>
  );
}

function Andamio({ nodo }: { nodo: Nodo }) {
  return (
    <article className="mx-auto max-w-2xl px-8 py-8">
      <p className="font-mono text-[11px] text-tinta-suave">/{nodo.clave}</p>
      <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-tinta">
        {nodo.segmento}
      </h2>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-tinta-media">
        Este nivel existe en las direcciones del sitio, pero el crawler no encontró una
        página propia acá. Es un nodo intermedio: sostiene el árbol y nada más.
      </p>
    </article>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-tinta-suave">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

/** `acento` para lo que el usuario puede HACER: se distingue de lo que solo es. */
function Fichas({ valores, acento = false }: { valores: string[]; acento?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {valores.map((v) => (
        <span
          key={v}
          className={`rounded-md px-2 py-1 text-xs ${
            acento
              ? "border border-acento-borde bg-acento-suave text-tinta"
              : "border border-linea bg-superficie-alta text-tinta-media"
          }`}
        >
          {v}
        </span>
      ))}
    </div>
  );
}
