export type Fragmento = { texto: string; fuente: string; tipo?: string };
export type Ficha = {
  id: string; nombre: string; tipo: string; fuente: string; fecha: string; origen: string;
  requisitos: Fragmento[]; pasos: Fragmento[]; costo: Fragmento[]; donde_se_hace: Fragmento[];
  destinos: { texto: string; url: string; fuente: string; estado: string }[];
  formulario: string | null; faltantes: string[]; validacion_humana: boolean;
};
export type CatalogoSitio = {
  version: number; estado: string; sitio: { url: string; titulo?: string; crawleado_en: string };
  fichas: Ficha[];
  bob: { estado: string; task_id?: string; fichas_aceptadas?: number; error?: string };
  calidad: { paginas_enviadas_bob?: number; paginas_omitidas_bob?: number; bloques_omitidos_bob?: number; descartadas: unknown[]; advertencias: string[] };
};
