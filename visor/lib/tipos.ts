/**
 * El contrato del Web Map: lo unico que viaja entre el crawler y el visor.
 *
 * Esta es una BASE, no una decision cerrada. Por eso casi todo es opcional:
 * el visor tiene que poder dibujar un mapa incompleto. Durante el hackaton el
 * crawler va a ir llenando campos de a poco, y no queremos que agregar uno
 * rompa la pantalla ni obligue a tocar el visor.
 */

export type Formulario = {
  nombre: string;
  /** Los nombres de los campos, como los ve una persona ("DNI", "fecha"). */
  campos: string[];
  /** A donde manda el formulario, si se pudo averiguar. */
  destino?: string;
};

export type Pagina = {
  id: string;
  url: string;
  titulo: string;

  /**
   * Los segmentos del path, que es de donde sale la jerarquia del arbol.
   * Ej: "/tramites/dni/renovar" -> ["tramites", "dni", "renovar"]
   *
   * Es OPCIONAL a proposito: si el crawler no lo manda, el visor lo deduce de
   * la URL. Asi el arbol funciona igual mientras se discute como armar la
   * jerarquia (ver la propuesta 2.3 en el buzon, que todavia no esta decidida).
   */
  camino?: string[];

  /** Lo que Bob entendio de la pagina. Vacio hasta que Bob la haya leido. */
  resumen?: string;
  headings?: string[];
  entidades?: string[];
  acciones?: string[];
  formularios?: Formulario[];

  /** Ids de otras paginas a las que esta enlaza. Relaciones, no jerarquia. */
  enlaces?: string[];

  /** Texto plano, para la busqueda. Puede ser largo: no se muestra entero. */
  texto?: string;
};

export type Sitio = {
  url: string;
  titulo?: string;
  crawleado_en?: string;
  /** Cuantas paginas encontro el crawler, aunque no todas esten analizadas. */
  paginas_totales?: number;
};

export type WebMap = {
  sitio: Sitio;
  paginas: Pagina[];
  ejecucion?: { estado: string; pendientes: number; errores: { url: string; error: string }[]; alcance: string };
  /** La auditoria tecnica, cuando el motor ya la corrio. */
  auditoria?: Auditoria;
};

/**
 * Un nodo del arbol que dibuja el visor.
 *
 * Ojo: no todo nodo tiene pagina. Si existe "/tramites/dni/renovar" pero no
 * existe "/tramites/dni", igual hace falta un nodo intermedio para poder
 * dibujar el arbol. Esos nodos tienen `pagina` en null y se muestran distinto.
 */
export type Nodo = {
  /** El camino completo desde la raiz, unido con "/". Sirve de clave. */
  clave: string;
  /** El ultimo segmento: lo que se lee en pantalla si no hay titulo. */
  segmento: string;
  pagina: Pagina | null;
  hijos: Nodo[];
};

/* ───────────── Auditoría técnica ─────────────
 *
 * Esto lo produce el motor de Franco (`motor/src/seguridad.mjs`) y viaja dentro
 * del mismo WebMap. Los nombres son EXACTAMENTE los que él devuelve: si acá
 * cambiara alguno, el visor mostraría huecos en silencio.
 */

export type Severidad = "alta" | "media" | "baja";

export type Categoria =
  | "cabeceras"
  | "cookies"
  | "https"
  | "scripts"
  | "formularios"
  | "exposicion"
  | "otro";

export type Hallazgo = {
  titulo: string;
  severidad: Severidad;
  categoria: Categoria;
  /** URLs de las páginas afectadas. */
  paginas: string[];
  /** Los ids estables de esas mismas páginas. Los agregó el motor para que el
   *  visor pueda cruzar un hallazgo con su nodo sin re-normalizar la URL. */
  paginas_ids?: string[];
  /** Fragmento textual de la evidencia. Si no aparece tal cual, el motor lo descarta. */
  evidencia: string;
  riesgo: string;
};

/**
 * Lo que Bob afirmó pero no pudo probar. Se guarda a propósito: mostrar lo que
 * el modelo NO se animó a sostener es más creíble que la lista de hallazgos.
 */
export type Descartado = {
  titulo: string;
  cita: string;
  motivo: string;
};

export type Seguridad = {
  estado: string;
  generado_en?: string;
  duracion_ms?: number;
  resumen?: Record<Severidad, number>;
  hallazgos: Hallazgo[];
  descartados_por_falta_de_prueba?: Descartado[];
  evidencia?: { alcance?: string; paginas_revisadas?: number };
  task_id?: string;
  coste?: unknown;
};

export type Auditoria = { seguridad?: Seguridad };
