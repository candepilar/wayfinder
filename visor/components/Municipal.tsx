"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/motor";

type Section = { tipo: string; titulo: string; texto: string; items: string[]; fuente: string };
type Choice = { id: string; nombre: string; url?: string };
type Contact = { nombre: string; url: string };
type Catalog = { municipio: string; nombre: string; revisado_en: string; cobertura: { estado: string; pendientes: number }; tramites: (Choice & { requisitos: string })[] };
type Answer = {
  estado: string; pregunta?: string; opciones?: Choice[]; opcion?: string; mensaje?: string; aviso?: string;
  tramite?: { id: string; nombre: string; requisitos: string; formulario: string | null; revisado_en: string };
  requisitos?: Section[]; pasos?: Section[]; costos?: Section[]; contacto_tramite?: Section[];
  contactos: Contact[]; alternativas?: Choice[]; candidatos_sin_confirmar?: { nombre: string; url: string }[];
};
type Diagnostic = {
  cobertura: { estado: string; intentadas: number; pendientes: number; errores: {url: string; error: string}[] };
  paginas: { id: string; titulo: string; url: string; enlaces: string[] }[];
  auditoria: { seguridad?: { estado: string; error?: string; generado_en?: string; coste?: unknown;
    hallazgos?: { titulo: string; severidad: string; riesgo: string; evidencia: string; paginas: string[] }[];
    descartados_por_falta_de_prueba?: { titulo: string; motivo: string }[] } } | null;
};
const button = "rounded-lg border border-linea bg-superficie px-4 py-2.5 text-sm text-tinta transition-colors hover:border-acento-borde disabled:opacity-50";

export default function Municipal({ municipio, onVolver }: { municipio: string; onVolver: () => void }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [question, setQuestion] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"vecino" | "municipio">("vecino");
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const revision = useRef(0);
  useEffect(() => {
    let live = true;
    api<Catalog>(`/municipios/${municipio}/catalogo`).then(c => { if (live) setCatalog(c); }).catch(e => { if (live) setError(e.message); });
    return () => { live = false; revision.current++; };
  }, [municipio]);
  useEffect(() => {
    if (mode !== "municipio" || diagnostic) return;
    let live = true;
    api<Diagnostic>(`/municipios/${municipio}/diagnostico`).then(d => { if (live) setDiagnostic(d); }).catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [mode, municipio, diagnostic]);

  async function ask(text: string, option?: string, destination?: string) {
    const rev = ++revision.current;
    setLoading(true); setError(null); setSubmitted(text); setQuestion(text);
    if (!option) setAnswer(null);
    try {
      const result = await api<Answer>(`/municipios/${municipio}/consulta`, { pregunta: text, ...(option ? { opcion: option } : {}), ...(destination ? { destino: destination } : {}) });
      if (rev === revision.current) setAnswer(result);
    } catch (e) { if (rev === revision.current) setError(e instanceof Error ? e.message : "No pudimos consultar el trámite."); }
    finally { if (rev === revision.current) setLoading(false); }
  }
  const examples = catalog?.tramites.filter(t => /pagar tgi|licencia de conducir|numeracion oficial|renovar.*licencia/i.test(t.nombre)).slice(0, 3) || [];
  return <div className="min-h-screen bg-fondo text-tinta">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-linea bg-superficie px-6 py-4">
      <div className="flex items-center gap-4"><button className={button} onClick={onVolver}>← Wayfinder</button><div><p className="text-xs text-tinta-suave">Orientación municipal · demostración</p><h1 className="font-semibold">{catalog?.nombre || (municipio === "vgg" ? "Villa Gobernador Gálvez" : "Rosario")}</h1></div></div>
      <div className="flex rounded-lg border border-linea p-1" aria-label="Vista de la demostración">
        {(["vecino", "municipio"] as const).map(m => <button key={m} onClick={() => { setMode(m); setError(null); }} aria-pressed={mode === m} className={`rounded-md px-4 py-2 text-sm ${mode === m ? "bg-acento-suave font-medium" : "text-tinta-media"}`}>{m === "vecino" ? "Soy vecino" : "Vista del municipio"}</button>)}
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-6 py-10">
      {error && <p role="alert" className="mb-5 rounded-xl border border-linea p-4 text-sm">{error} <button className="ml-2 underline" onClick={() => window.location.reload()}>Reintentar</button></p>}
      {mode === "vecino" ? <>
        <div className="max-w-2xl"><p className="mb-2 text-xs font-medium uppercase tracking-widest text-acento">Del “¿dónde voy?” al próximo paso</p><h2 className="text-3xl font-semibold tracking-tight">¿Qué necesitás hacer?</h2><p className="mt-3 text-tinta-media">Encontrá el trámite, revisá lo que necesitás y continuá en el portal oficial con esta guía a mano.</p></div>
        <form className="mt-7 flex max-w-3xl gap-2 rounded-xl border border-linea bg-superficie p-2 shadow-panel" onSubmit={e => { e.preventDefault(); void ask(question); }}>
          <label className="sr-only" htmlFor="consulta-municipal">Qué trámite necesitás</label>
          <input id="consulta-municipal" value={question} maxLength={1000} onChange={e => setQuestion(e.target.value)} placeholder="Por ejemplo: necesito el carnet de conducir" className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none" />
          <button disabled={loading || !catalog || !question.trim()} className="rounded-lg bg-acento px-5 py-3 text-sm font-medium text-acento-tinta disabled:opacity-40">{loading ? "Buscando…" : "Buscar trámite"}</button>
        </form>
        {!answer && <div className="mt-4 flex flex-wrap gap-2">{examples.map(t => <button disabled={loading} className={button} key={t.id} onClick={() => void ask(t.nombre)}>{t.nombre} ↗</button>)}</div>}
        <div aria-live="polite" aria-busy={loading}>
          {answer && <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
            <section className="min-w-0 space-y-5">
              <p className="text-sm text-tinta-suave">Tu consulta: {submitted}</p>
              {answer.pregunta && <div className="rounded-xl border border-acento-borde bg-acento-suave p-5"><h3 className="mb-4 text-lg font-medium">{answer.pregunta}</h3><div className="flex flex-col gap-2">{answer.opciones?.map(o => <button disabled={loading} key={o.id} className={`${button} text-left`} onClick={() => void ask(submitted, answer.estado === "aclaracion_destino" ? answer.opcion : o.id, answer.estado === "aclaracion_destino" ? o.id : undefined)}>{o.nombre} →</button>)}</div></div>}
              {answer.tramite && <><h3 className="text-2xl font-semibold">{answer.tramite.nombre}</h3><SectionList title="Lo que necesitás" sections={answer.requisitos} checklist key={`${answer.tramite.id}-requisitos`} /><SectionList title="Pasos del trámite" sections={answer.pasos} /><SectionList title="Costos y formas de pago" sections={answer.costos} /></>}
              {answer.mensaje && <p className="rounded-xl border border-linea bg-superficie p-5 text-sm leading-relaxed">{answer.mensaje}</p>}
              {answer.alternativas && <div><h3 className="mb-3 font-medium">Otros trámites del catálogo</h3><div className="flex flex-wrap gap-2">{answer.alternativas.map(o => <button disabled={loading} className={button} key={o.id} onClick={() => void ask(o.nombre, o.id)}>{o.nombre}</button>)}</div></div>}
              {!!answer.candidatos_sin_confirmar?.length && <div className="rounded-xl border border-linea p-5"><h3 className="font-medium">Encontramos estas referencias, pero falta revisar sus fichas</h3>{answer.candidatos_sin_confirmar.map(c => <a key={c.url} href={c.url} target="_blank" rel="noopener noreferrer" className="mt-3 block text-sm underline">{c.nombre || c.url} ↗</a>)}</div>}
            </section>
            <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              {answer.tramite && <div className="rounded-xl border border-linea bg-superficie p-5 shadow-panel"><p className="mb-4 text-xs font-semibold uppercase tracking-wider text-tinta-suave">Continuá en el sitio oficial</p>{answer.tramite.formulario && <a className="mb-3 block rounded-lg bg-acento px-4 py-3 text-center text-sm font-medium text-acento-tinta" href={answer.tramite.formulario} target="_blank" rel="noopener noreferrer">Hacer el trámite ↗</a>}<a href={answer.tramite.requisitos} target="_blank" rel="noopener noreferrer" className="block text-sm underline">Ver ficha y requisitos oficiales ↗</a><p className="mt-4 text-xs leading-relaxed text-tinta-media">Se abre otra pestaña. Esta guía queda disponible. Wayfinder no ingresa ni envía datos en el formulario.</p>{answer.tramite.formulario && <p className="mt-2 text-xs text-tinta-suave">Destino enlazado por la ficha; no se probó su funcionamiento después del acceso.</p>}</div>}
              <div className="rounded-xl border border-linea p-5"><h3 className="mb-3 font-medium">¿Necesitás ayuda?</h3>{answer.contactos.map(c => <a key={c.url} href={c.url} target="_blank" rel="noopener noreferrer" className="mb-2 block text-sm underline">{c.nombre} ↗</a>)}<SectionList title="Contacto del trámite" sections={answer.contacto_tramite} /></div>
            </aside>
          </div>}
        </div>
        {catalog && <p className="mt-10 max-w-3xl text-xs leading-relaxed text-tinta-suave">{catalog.tramites.length} fichas detectadas · Cobertura {catalog.cobertura.estado} · Consultado {new Date(catalog.revisado_en).toLocaleString("es-AR")}. Información extraída de fuentes oficiales; verificá vigencia y condiciones en la ficha. Esta demostración no es un servicio municipal oficial. No guardamos tu consulta.</p>}
      </> : <Technical diagnostic={diagnostic} total={catalog?.tramites.length || 0} />}
    </main>
  </div>;
}

function SectionList({ title, sections, checklist = false }: { title: string; sections?: Section[]; checklist?: boolean }) {
  if (!sections?.length) return <p className="text-sm text-tinta-suave">{title}: no se extrajo una sección específica; revisá la ficha oficial.</p>;
  return <div className="space-y-4 rounded-xl border border-linea bg-superficie p-5"><h4 className="font-semibold">{title}</h4>{sections.map((s, i) => <div key={i}><p className="mb-3 text-xs text-tinta-suave">{s.titulo}</p>{checklist ? <div className="space-y-3">{(s.items.length ? s.items : [s.texto]).map((text, j) => <label key={j} className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" className="mt-1 shrink-0 accent-[var(--acento)]" /><span>{text}</span></label>)}</div> : <p className="whitespace-pre-line text-sm leading-relaxed text-tinta-media">{s.texto}</p>}<a className="mt-3 inline-block text-xs underline text-tinta-suave" href={s.fuente} target="_blank" rel="noopener noreferrer">Fuente oficial ↗</a></div>)}</div>;
}

function Technical({ diagnostic, total }: { diagnostic: Diagnostic | null; total: number }) {
  if (!diagnostic) return <p role="status">Cargando revisión técnica…</p>;
  const bob = diagnostic.auditoria?.seguridad;
  return <div className="space-y-7"><div><p className="text-xs uppercase tracking-widest text-acento">Herramientas para el equipo municipal</p><h2 className="mt-2 text-3xl font-semibold">Qué funciona y qué falta revisar</h2><p className="mt-3 text-sm text-tinta-media">Demostración pública con información técnica del sitio. No es un panel privado ni una certificación de seguridad.</p></div>
    <div className="grid gap-4 sm:grid-cols-3">{[[diagnostic.paginas.length, "páginas leídas"], [total, "fichas detectadas"], [diagnostic.cobertura.pendientes, "enlaces pendientes"]].map(([value, label]) => <div key={String(label)} className="rounded-xl border border-linea bg-superficie p-5"><p className="text-3xl font-semibold">{value}</p><p className="mt-1 text-sm text-tinta-media">{label}</p></div>)}</div>
    <section className="rounded-xl border border-linea bg-superficie p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-semibold">Revisión técnica con IBM Bob</h3><span className="rounded-full bg-acento-suave px-3 py-1 text-xs">{bob?.estado === "completado" ? "Análisis real completado" : bob?.estado === "error" ? "El análisis falló" : "Sin análisis de Bob"}</span></div><p className="mt-3 text-sm text-tinta-media">Bob revisa evidencia pasiva. Cada cita se contrasta con los datos recogidos; el diagnóstico todavía requiere revisión humana.</p>{bob?.generado_en && <p className="mt-2 text-xs text-tinta-suave">Ejecutado {new Date(bob.generado_en).toLocaleString("es-AR")}</p>}{bob?.error && <p role="alert" className="mt-3 text-sm">{bob.error}</p>}
      <div className="mt-5 space-y-3">{bob?.hallazgos?.map((h, i) => <details key={i} className="rounded-lg border border-linea p-4"><summary className="cursor-pointer text-sm font-medium"><span className="mr-3 rounded border border-linea px-2 py-0.5 text-xs">{h.severidad}</span>{h.titulo}</summary><p className="mt-3 text-sm leading-relaxed text-tinta-media">{h.riesgo}</p><p className="mt-3 text-xs text-tinta-suave">Evidencia citada</p><pre className="mt-1 whitespace-pre-wrap break-words rounded bg-fondo p-3 text-xs">{h.evidencia}</pre>{h.paginas.slice(0, 3).map(url => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="mt-2 block break-all text-xs underline">{url}</a>)}</details>)}</div>
      {!!bob?.descartados_por_falta_de_prueba?.length && <details className="mt-4"><summary className="cursor-pointer text-sm">Lo que Bob no pudo respaldar ({bob.descartados_por_falta_de_prueba.length})</summary>{bob.descartados_por_falta_de_prueba.map((d, i) => <p className="mt-3 text-sm" key={i}>{d.titulo}: {d.motivo}</p>)}</details>}
    </section>
    <details className="rounded-xl border border-linea p-5"><summary className="cursor-pointer font-medium">Mapa de páginas y conexiones ({diagnostic.paginas.length})</summary><div className="mt-4 grid gap-3 md:grid-cols-2">{diagnostic.paginas.map(p => <div key={p.id} className="rounded-lg border border-linea p-3"><a className="text-sm underline" href={p.url} target="_blank" rel="noopener noreferrer">{p.titulo} ↗</a><p className="mt-1 text-xs text-tinta-suave">{p.enlaces.length} conexiones entre páginas leídas</p></div>)}</div></details>
  </div>;
}
