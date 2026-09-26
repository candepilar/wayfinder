"use client";

import { useEffect, useId, useRef, useState } from 'react';
import { api } from '@/lib/motor';

type Ficha = { id: string; nombre: string; fuente: string | null; fecha: string; destinos: { texto: string; url: string }[] };
type Answer = { estado: string; mensaje: string; fichas: Ficha[]; evidencia: { texto: string; fuente: string | null; campo: string }[]; sugerencias: string[]; contactos?: { nombre: string; url: string }[]; bob: { task_id?: string }; alcance: { lectura: string; bloques_omitidos: number; fichas_omitidas: number } };
type Turn = { pregunta: string; respuesta: Answer };
type Site = { id: string; nombre: string; url: string };
const button = 'rounded-lg border border-linea bg-superficie px-3 py-2 text-sm text-tinta hover:border-acento-borde disabled:opacity-50';

export default function Asistente({ contexto, nombre, onFicha }: { contexto?: string; nombre?: string; onFicha?: (id: string) => void }) {
  const id = useId();
  const [sites, setSites] = useState<Site[]>([]);
  const [selected, setSelected] = useState(contexto || '');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const [loadingSites, setLoadingSites] = useState(!contexto);
  const [reload, setReload] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (contexto) return;
    const task = new AbortController(); setLoadingSites(true);
    api<{ sitios: Site[] }>('/asistente/sitios', undefined, task.signal).then(data => { setSites(data.sitios); setError(''); }).catch(() => { if (!task.signal.aborted) setError('No pudimos cargar los sitios. Reintentá en un momento.'); }).finally(() => { if (!task.signal.aborted) setLoadingSites(false); });
    return () => task.abort();
  }, [contexto, reload]);
  useEffect(() => {
    if (!pending) return;
    setElapsed(0); const timer = setInterval(() => setElapsed(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, [pending]);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [turns, pending, error]);
  function reset(next = selected) {
    controller.current?.abort(); controller.current = null;
    setPending(''); setTurns([]); setError(''); setQuestion(''); setSelected(next);
  }
  function cancel() {
    controller.current?.abort(); controller.current = null;
    setQuestion(pending); setPending(''); setError('La consulta se interrumpió. Podés volver a enviarla.');
    setTimeout(() => input.current?.focus(), 0);
  }
  async function ask(text = question) {
    if (controller.current || !selected || !text.trim()) return;
    const task = new AbortController(); controller.current = task;
    setPending(text.trim()); setError('');
    const timer = setTimeout(() => task.abort(), 65000);
    try {
      const history = turns.slice(-4).flatMap(t => [{ rol: 'user', texto: t.pregunta }, { rol: 'assistant', texto: t.respuesta.mensaje }]);
      const response = await api<Answer>('/asistente', { contexto: selected, pregunta: text.trim(), historial: history }, task.signal);
      if (task.signal.aborted || controller.current !== task) return;
      setTurns(t => [...t, { pregunta: text.trim(), respuesta: response }].slice(-10)); setQuestion('');
    } catch (e) {
      if (controller.current === task) { setQuestion(text); setError(task.signal.aborted ? 'La consulta se interrumpió. Podés volver a enviarla.' : e instanceof Error ? e.message : 'No pudimos conectar con Bob.'); }
    } finally {
      clearTimeout(timer);
      if (controller.current === task) { controller.current = null; setPending(''); input.current?.focus(); }
    }
  }
  const suggestions = turns.length ? turns.at(-1)!.respuesta.sugerencias : ['¿Qué puedo hacer en este sitio?', 'Necesito encontrar una gestión'];
  return <section aria-label="Asistente Bob" className="mt-7 overflow-hidden rounded-2xl border border-acento-borde bg-superficie shadow-panel">
    <div className="flex flex-wrap items-start justify-between gap-3 bg-acento-suave p-5">
      <div className="flex min-w-0 flex-1 basis-64 items-start gap-3"><span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-acento-borde text-lg text-acento">✳</span><div><p className="text-xs font-medium uppercase tracking-wider text-tinta-media">Bob · guía con IA</p><h2 className="mt-1 text-lg font-semibold text-tinta">Contame qué necesitás hacer.</h2><p className="mt-2 text-sm leading-relaxed text-tinta-media">Conversá, encontrá tu gestión y abrí el acceso desde acá.</p></div></div>
      {turns.length > 0 && <button className="shrink-0 text-xs text-tinta-media underline" onClick={() => reset()}>Empezar de nuevo</button>}
    </div>
    <div className="p-5">
      {!contexto ? <div className="mb-4"><label htmlFor={`${id}-site`} className="text-xs font-medium text-tinta-media">Primero, elegí dónde querés hacer la gestión</label><select id={`${id}-site`} value={selected} disabled={Boolean(pending) || loadingSites} onChange={e => reset(e.target.value)} className="mt-2 w-full min-w-0 rounded-lg border border-linea bg-fondo p-3 text-sm text-tinta"><option value="">{loadingSites ? 'Cargando sitios…' : 'Elegí un sitio o municipio'}</option>{sites.map(s => <option key={s.id} value={s.id}>{s.nombre || new URL(s.url).hostname}</option>)}</select>{!loadingSites && !sites.length && <p className="mt-2 text-xs text-tinta-media">Abrí una dirección arriba para crear su catálogo, o <button className="underline" onClick={() => setReload(n => n + 1)}>volvé a cargar los sitios</button>.</p>}</div> : <p className="mb-4 break-words text-xs text-tinta-media">Consultando: {nombre || contexto.replace(/^sitio:/, '')}</p>}
      <div ref={log} role="log" aria-label="Conversación con Bob" aria-live="polite" className="max-h-[32rem] space-y-5 overflow-y-auto overscroll-contain [overflow-wrap:anywhere]">
        {turns.map((turn, i) => <div key={i} className="space-y-3">
          <p className="ml-6 rounded-xl bg-acento-suave px-4 py-3 text-sm text-tinta"><span className="mb-1 block text-xs text-tinta-media">Vos</span>{turn.pregunta}</p>
          <div className="rounded-xl border border-linea p-4"><p className="mb-2 text-xs font-medium text-acento">Bob</p><p className="whitespace-pre-wrap text-sm leading-relaxed text-tinta">{turn.respuesta.mensaje}</p>
            <div className="mt-4 space-y-3">{turn.respuesta.fichas.map(f => <div key={f.id} className="rounded-lg border border-linea bg-fondo p-3"><p className="text-sm font-semibold text-tinta">{f.nombre}</p><div className="mt-3 flex flex-wrap gap-2">{f.destinos.map(d => <a key={d.url} href={d.url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-acento px-3 py-2 text-sm font-medium text-acento-tinta">{d.texto || 'Continuar en el sitio'} ↗</a>)}{onFicha ? <button className={button} onClick={() => onFicha(f.id)}>Ver ficha completa</button> : f.fuente && <a className={button} href={f.fuente} target="_blank" rel="noopener noreferrer">Ver ficha de origen ↗</a>}</div>{!f.destinos.length && <p className="mt-2 text-xs text-tinta-media">Acceso directo no identificado: continuá desde la ficha.</p>}</div>)}</div>
            {turn.respuesta.evidencia.length > 0 && <details className="mt-4 text-xs text-tinta-media"><summary className="cursor-pointer">De dónde sale esta respuesta</summary><div className="mt-3 space-y-3">{turn.respuesta.evidencia.map((e, j) => <blockquote key={j} className="border-l-2 border-acento-borde pl-3"><p className="whitespace-pre-wrap leading-relaxed">{e.texto}</p>{e.fuente && <a className="mt-1 inline-block underline" href={e.fuente} target="_blank" rel="noopener noreferrer">Ver fuente ↗</a>}</blockquote>)}</div></details>}
            {turn.respuesta.estado === 'sin_informacion' && <div className="mt-3 flex flex-wrap gap-2">{turn.respuesta.contactos?.map(c => <a key={c.url} href={c.url} target="_blank" rel="noopener noreferrer" className={button}>{c.nombre} ↗</a>)}</div>}
            <p className="mt-3 text-[11px] leading-relaxed text-tinta-suave">Respuesta generada con IBM Bob. Lectura del sitio: {new Date(turn.respuesta.alcance.lectura).toLocaleDateString('es-AR')}. Verificá condiciones y vigencia en la fuente.{Boolean(turn.respuesta.alcance.bloques_omitidos || turn.respuesta.alcance.fichas_omitidas) && ' Parte del catálogo quedó fuera de esta consulta.'}</p>
          </div>
        </div>)}
        {pending && <div><p className="ml-6 rounded-xl bg-acento-suave p-3 text-sm text-tinta">{pending}</p><p role="status" className="mt-3 text-sm text-tinta-media">{elapsed < 12 ? 'Bob está consultando el catálogo…' : 'Bob sigue preparando la orientación. Puede tardar hasta un minuto…'}</p></div>}
        {error && <p role="alert" className="rounded-lg border border-linea p-3 text-sm text-tinta">{error}</p>}
      </div>
      {selected && !pending && <div className="my-4 flex flex-wrap gap-2">{suggestions.map(s => <button key={s} className={`${button} text-left`} onClick={() => void ask(s)}>{s} →</button>)}</div>}
      <form className="mt-4 rounded-xl border border-linea bg-fondo p-3 focus-within:border-acento-borde" onSubmit={e => { e.preventDefault(); void ask(); }}>
        <label htmlFor={`${id}-question`} className="sr-only">Tu mensaje para Bob</label>
        <textarea ref={input} id={`${id}-question`} rows={2} value={question} maxLength={1000} disabled={Boolean(pending)} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void ask(); } }} placeholder={selected ? 'Contame qué querés hacer en este sitio…' : 'Elegí un sitio para empezar a conversar'} className="w-full resize-y bg-transparent text-sm leading-relaxed text-tinta outline-none placeholder:text-tinta-suave disabled:opacity-60" />
        <div className="mt-2 flex items-center justify-between gap-3"><span className="text-[11px] text-tinta-suave">{question.length}/1000</span>{pending ? <button type="button" className={button} onClick={e => { e.preventDefault(); cancel(); }}>Cancelar consulta</button> : <button disabled={!selected || !question.trim()} className="rounded-lg bg-acento px-4 py-2 text-sm font-medium text-acento-tinta disabled:opacity-40">Consultar a Bob →</button>}</div>
      </form>
      <p className="mt-3 text-[11px] leading-relaxed text-tinta-suave">Tu mensaje y el contexto se envían a IBM Bob para responder. No compartas claves ni datos personales. El historial de esta pantalla se borra al salir. Los enlaces abren otra pestaña; vos realizás la gestión en el sitio de origen.</p>
    </div>
  </section>;
}
