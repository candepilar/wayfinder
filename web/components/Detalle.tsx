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
  if (!nodo) {
    return (
      <p className="p-6 text-sm text-muted">
        Elegí una página del árbol para ver su contenido.
      </p>
    );
  }

  if (!nodo.pagina) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-medium text-ink">{nodo.segmento}</h2>
        <p className="mt-2 text-sm text-muted">
          Este nivel existe en las URLs del sitio, pero el crawler no encontró una
          página propia acá. Es un nodo intermedio: sirve para sostener el árbol.
        </p>
        <p className="mt-4 font-mono text-xs text-muted">/{nodo.clave}</p>
      </div>
    );
  }

  const p = nodo.pagina;
  const analizada = Boolean(p.resumen);

  return (
    <div className="space-y-6 p-6">
      <header>
        <h2 className="text-lg font-medium text-ink">{p.titulo}</h2>
        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block truncate font-mono text-xs text-muted hover:text-ember"
        >
          {p.url}
        </a>
      </header>

      {!analizada && (
        <p className="rounded border border-dashed border-line px-3 py-2 text-xs text-muted">
          Todavía sin analizar por Bob: solo tenemos la URL y el título.
        </p>
      )}

      {p.resumen && (
        <Seccion titulo="Resumen">
          <p className="text-sm leading-relaxed text-ink">{p.resumen}</p>
        </Seccion>
      )}

      {p.headings?.length ? (
        <Seccion titulo="Secciones de la página">
          <ul className="space-y-1 text-sm text-ink">
            {p.headings.map((h) => (
              <li key={h}>· {h}</li>
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
          <Fichas valores={p.acciones} />
        </Seccion>
      ) : null}

      {p.formularios?.length ? (
        <Seccion titulo={`Formularios (${p.formularios.length})`}>
          <div className="space-y-3">
            {p.formularios.map((f) => (
              <div key={f.nombre} className="rounded border border-line p-3">
                <p className="text-sm font-medium text-ink">{f.nombre}</p>
                {f.destino && (
                  <p className="mt-0.5 font-mono text-[11px] text-muted">→ {f.destino}</p>
                )}
                <div className="mt-2">
                  <Fichas valores={f.campos} />
                </div>
              </div>
            ))}
          </div>
        </Seccion>
      ) : null}

      {p.enlaces?.length ? (
        <Seccion titulo={`Enlaza a (${p.enlaces.length})`}>
          <ul className="space-y-1 text-sm">
            {p.enlaces.map((id) => (
              <li key={id} className="truncate text-muted">
                {paginasPorId.get(id)?.titulo ?? id}
              </li>
            ))}
          </ul>
        </Seccion>
      ) : null}
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function Fichas({ valores }: { valores: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {valores.map((v) => (
        <span
          key={v}
          className="rounded border border-line bg-surface px-2 py-0.5 text-xs text-ink"
        >
          {v}
        </span>
      ))}
    </div>
  );
}
