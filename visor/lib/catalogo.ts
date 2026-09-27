export type Fragmento = { texto: string; fuente: string; tipo?: string };
export type Ficha = {
  id: string; nombre: string; tipo: string; fuente: string; fecha: string; origen: string;
  requisitos: Fragmento[]; pasos: Fragmento[]; costo: Fragmento[]; donde_se_hace: Fragmento[];
  destinos: { texto: string; url: string; fuente: string; estado: string }[];
  formulario: string | null; faltantes: string[]; validacion_humana: boolean;
  consultas?: string[]; clics_desde_portada?: number;
  verificacion?: { estado: 'confirmada' | 'dudosa'; motivo?: string };
};
export type RefFicha = { nombre: string; fuente: string };
export type CatalogoSitio = {
  version: number; estado: string; sitio: { url: string; titulo?: string; crawleado_en: string };
  fichas: Ficha[];
  mantenimiento?: { primera_lectura: boolean; desde: string | null; nuevas: RefFicha[]; quitadas: RefFicha[]; sin_acceso: RefFicha[]; sin_cambios: number;
    modificadas: (RefFicha & { cambios: { campo: string; agregados: string[]; quitados: string[] }[] })[] };
  impacto?: { fichas_medidas: number; clics_promedio_portada: number; clics_maximo_portada: number; clics_con_wayfinder: number; gestiones_a_mas_de_2_clics: number; nota: string } | null;
  bob: { estado: string; task_id?: string; fichas_aceptadas?: number; error?: string; tareas_paralelas?: number; duracion_ms?: number;
    tareas?: { lote: number; paginas: number; estado: string; task_id?: string; duracion_ms?: number; fichas_aceptadas?: number }[] };
  calidad: { revision_bob?: { confirmadas: number; dudosas: number; sin_revision: number; tareas: number } | null; paginas_revisadas_html?: number; paginas_enviadas_bob?: number; paginas_omitidas_bob?: number; bloques_omitidos_bob?: number; descartadas: unknown[]; advertencias: string[] };
};
