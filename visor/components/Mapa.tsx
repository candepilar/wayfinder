"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { CAJA, NodoUbicado, Vinculo, calcularMapa } from "@/lib/grafo";
import { etiqueta } from "@/lib/arbol";
import { Nodo, Pagina } from "@/lib/tipos";

type Vista = { x: number; y: number; k: number };

export default function Mapa({
  raices,
  home,
  paginas,
  claveSeleccionada,
  onSeleccionar,
}: {
  raices: Nodo[];
  home: Pagina | null;
  paginas: Pagina[];
  claveSeleccionada: string | null;
  onSeleccionar: (nodo: Nodo) => void;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [vista, setVista] = useState<Vista>({ x: 0, y: 0, k: 1 });
  const [encima, setEncima] = useState<{
    ubicado: NodoUbicado;
    x: number;
    y: number;
  } | null>(null);

  const mapa = useMemo(
    () => calcularMapa(raices, home, paginas),
    [raices, home, paginas]
  );

  /** Al abrir, encuadra el mapa entero. Sin esto arrancás mirando una esquina. */
  useEffect(() => {
    const caja = contenedor.current?.getBoundingClientRect();
    if (!caja) return;
    encuadrar(caja.width, caja.height);
    // Solo al montar o si cambia el mapa: si se recalculara en cada render,
    // perderías el zoom cada vez que seleccionás algo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapa]);

  function encuadrar(ancho: number, alto: number) {
    // El 0.95 deja un respiro en los bordes; el tope de 1 evita que un sitio
    // chico se dibuje gigante.
    const k = Math.min(ancho / mapa.ancho, alto / mapa.alto, 1) * 0.95;
    setVista({
      x: (ancho - mapa.ancho * k) / 2,
      y: (alto - mapa.alto * k) / 2,
      k,
    });
  }

  /** Zoom hacia el puntero: el punto que está bajo el mouse no se mueve. */
  function alRodar(e: React.WheelEvent) {
    e.preventDefault();
    const caja = contenedor.current?.getBoundingClientRect();
    if (!caja) return;
    const px = e.clientX - caja.left;
    const py = e.clientY - caja.top;

    setVista((v) => {
      const k = Math.min(Math.max(v.k * Math.exp(-e.deltaY * 0.0015), 0.15), 3);
      const factor = k / v.k;
      return { k, x: px - (px - v.x) * factor, y: py - (py - v.y) * factor };
    });
  }

  const arrastre = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  function alApretar(e: React.PointerEvent) {
    // Solo el fondo arrastra: si no, no se podría hacer clic en un nodo.
    if ((e.target as Element).closest("[data-nodo]")) return;
    arrastre.current = { x: e.clientX, y: e.clientY, vx: vista.x, vy: vista.y };
  }

  function alMover(e: React.PointerEvent) {
    const a = arrastre.current;
    if (!a) return;
    setVista((v) => ({
      ...v,
      x: a.vx + (e.clientX - a.x),
      y: a.vy + (e.clientY - a.y),
    }));
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        ref={contenedor}
        onWheel={alRodar}
        onPointerDown={alApretar}
        onPointerMove={alMover}
        onPointerUp={() => (arrastre.current = null)}
        onPointerLeave={() => {
          arrastre.current = null;
          setEncima(null);
        }}
        className="h-full w-full cursor-grab active:cursor-grabbing"
      >
        <svg width="100%" height="100%" className="block touch-none select-none">
          <g transform={`translate(${vista.x},${vista.y}) scale(${vista.k})`}>
            {/* Los cruces van primero, por debajo de todo: son contexto, no la
                estructura principal. */}
            <g stroke="var(--acento)" strokeWidth={1.4} fill="none" opacity={0.55}>
              {mapa.cruces.map((v) => (
                <path key={v.clave} d={curvaCruce(v)} strokeDasharray="4 4" />
              ))}
            </g>

            <g stroke="var(--linea-fuerte)" strokeWidth={1.5} fill="none">
              {mapa.jerarquia.map((v) => (
                <path key={v.clave} d={curvaJerarquia(v)} />
              ))}
            </g>

            {/* Los nodos se dibujan al final: su relleno tapa las líneas que
                pasan por detrás, que es lo que las deja legibles. */}
            {mapa.nodos.map((u) => (
              <Caja
                key={u.nodo.clave}
                ubicado={u}
                seleccionado={claveSeleccionada === u.nodo.clave}
                onSeleccionar={() => onSeleccionar(u.nodo)}
                onEncima={(x, y) => setEncima({ ubicado: u, x, y })}
                onAfuera={() => setEncima(null)}
              />
            ))}
          </g>
        </svg>
      </div>

      {encima && <Globo dato={encima} />}

      <Referencias />

      <button
        onClick={() => {
          const caja = contenedor.current?.getBoundingClientRect();
          if (caja) encuadrar(caja.width, caja.height);
        }}
        className="absolute right-3 top-3 rounded-md border border-linea bg-superficie px-2.5 py-1.5 text-[11px] text-tinta-media shadow-panel hover:text-tinta"
      >
        Encuadrar
      </button>
    </div>
  );
}

function Caja({
  ubicado,
  seleccionado,
  onSeleccionar,
  onEncima,
  onAfuera,
}: {
  ubicado: NodoUbicado;
  seleccionado: boolean;
  onSeleccionar: () => void;
  onEncima: (x: number, y: number) => void;
  onAfuera: () => void;
}) {
  const { nodo, x, y } = ubicado;
  const analizada = Boolean(nodo.pagina?.resumen);
  const esAndamio = nodo.pagina === null;

  return (
    <g
      data-nodo
      transform={`translate(${x - CAJA.ancho / 2},${y - CAJA.alto / 2})`}
      onClick={onSeleccionar}
      onMouseEnter={(e) => onEncima(e.clientX, e.clientY)}
      onMouseLeave={onAfuera}
      className="cursor-pointer"
    >
      <rect
        width={CAJA.ancho}
        height={CAJA.alto}
        rx={7}
        fill={seleccionado ? "var(--acento-suave)" : "var(--superficie)"}
        stroke={seleccionado ? "var(--acento)" : "var(--linea-fuerte)"}
        strokeWidth={seleccionado ? 1.8 : 1.2}
        /* Punteado = sin analizar. Es forma, no color: se distingue igual en
           blanco y negro y sin depender de ver bien los tonos. */
        strokeDasharray={analizada || esAndamio ? undefined : "3 3"}
      />
      <text
        x={CAJA.ancho / 2}
        y={CAJA.alto / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11.5}
        fontWeight={seleccionado ? 600 : 400}
        fill={esAndamio ? "var(--tinta-suave)" : "var(--tinta)"}
        fontStyle={esAndamio ? "italic" : undefined}
      >
        {recortar(etiqueta(nodo), 21)}
      </text>
      <title>{nodo.pagina?.url ?? `/${nodo.clave}`}</title>
    </g>
  );
}

function Globo({
  dato,
}: {
  dato: { ubicado: NodoUbicado; x: number; y: number };
}) {
  const nodo = dato.ubicado.nodo;
  const p = nodo.pagina;

  return (
    <div
      style={{ left: dato.x + 14, top: dato.y + 14 }}
      className="pointer-events-none fixed z-10 max-w-[17rem] rounded-lg border border-linea bg-superficie px-3 py-2 shadow-panel"
    >
      <p className="text-xs font-medium text-tinta">{etiqueta(nodo)}</p>
      <p className="mt-0.5 truncate font-mono text-[10px] text-tinta-suave">
        /{nodo.clave}
      </p>

      {p?.resumen ? (
        <p className="mt-1.5 text-[11px] leading-snug text-tinta-media">{p.resumen}</p>
      ) : (
        <p className="mt-1.5 text-[11px] text-tinta-suave">
          {p ? "Sin analizar todavía" : "Nivel intermedio, sin página propia"}
        </p>
      )}

      {p?.formularios?.length ? (
        <p className="mt-1.5 text-[10px] text-tinta-media">
          {p.formularios.length} formulario
          {p.formularios.length > 1 ? "s" : ""}
        </p>
      ) : null}
    </div>
  );
}

/** Con dos codificaciones en pantalla, la referencia no es opcional. */
function Referencias() {
  return (
    <div className="absolute bottom-3 left-3 space-y-1.5 rounded-lg border border-linea bg-superficie/90 px-3 py-2 text-[10px] text-tinta-media backdrop-blur">
      <p className="flex items-center gap-2">
        <svg width="22" height="6" aria-hidden>
          <line
            x1="0"
            y1="3"
            x2="22"
            y2="3"
            stroke="var(--linea-fuerte)"
            strokeWidth="1.5"
          />
        </svg>
        estructura del sitio
      </p>
      <p className="flex items-center gap-2">
        <svg width="22" height="6" aria-hidden>
          <line
            x1="0"
            y1="3"
            x2="22"
            y2="3"
            stroke="var(--acento)"
            strokeWidth="1.4"
            strokeDasharray="4 4"
          />
        </svg>
        se mencionan entre sí
      </p>
      <p className="flex items-center gap-2">
        <svg width="22" height="10" aria-hidden>
          <rect
            x="0.6"
            y="0.6"
            width="20.8"
            height="8.8"
            rx="2"
            fill="none"
            stroke="var(--linea-fuerte)"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />
        </svg>
        sin analizar
      </p>
    </div>
  );
}

/** Curva vertical suave: sale del borde de abajo y entra por el de arriba. */
function curvaJerarquia(v: Vinculo) {
  const medio = (v.desde.y + v.hasta.y) / 2;
  return `M${v.desde.x},${v.desde.y} C${v.desde.x},${medio} ${v.hasta.x},${medio} ${v.hasta.x},${v.hasta.y}`;
}

/** Los cruces se arquean para no confundirse con las líneas de estructura. */
function curvaCruce(v: Vinculo) {
  const dx = v.hasta.x - v.desde.x;
  const dy = v.hasta.y - v.desde.y;
  const largo = Math.hypot(dx, dy) || 1;
  const combado = Math.min(largo * 0.28, 150);
  const mx = (v.desde.x + v.hasta.x) / 2 + (dy / largo) * combado;
  const my = (v.desde.y + v.hasta.y) / 2 - (dx / largo) * combado;
  return `M${v.desde.x},${v.desde.y} Q${mx},${my} ${v.hasta.x},${v.hasta.y}`;
}

function recortar(texto: string, largo: number) {
  return texto.length <= largo ? texto : texto.slice(0, largo - 1) + "…";
}
