"use client";

import ExtensionButton from './ExtensionButton';

// Portada editorial: qué es Wayfinder, cómo se instala y qué hace IBM Bob.
// Solo afirma lo que el producto hace hoy; la demo web queda debajo (#probar).
const PASOS = [
  ['Abrí el sitio oficial', 'Entrá al sitio de tu municipio, organismo o comercio y tocá el ícono de Wayfinder.'],
  ['Decilo con tus palabras', '«Encontré un perro abandonado», «quiero sacar el registro». Wayfinder entiende lo cotidiano.'],
  ['Seguí el próximo paso', 'Te marca en la página oficial dónde tocar, qué necesitás tener a mano y el acceso para empezar.'],
];
const PRINCIPIOS = [
  ['Solo texto oficial', 'Cada requisito y cada enlace salen de la página del sitio, con su fuente. Nada inventado.'],
  ['Organizado por IBM Bob', 'Varias tareas de Bob leen el sitio en paralelo y una segunda pasada revisa cada gestión.'],
  ['Tus datos, tuyos', 'Wayfinder no completa formularios ni pide claves. Vos hacés el trámite en el sitio oficial.'],
];
const EQUIPO = [
  ['Catálogo en minutos', 'El modo 🧭 Coordinador reparte varios sitios en tareas paralelas de Bob; 🗺️ Cartógrafo audita cada uno.'],
  ['Qué cambió, qué falta', 'Al volver a leer el sitio: gestiones nuevas, las que desaparecieron, requisitos que cambiaron y accesos que faltan.'],
  ['Del diagnóstico al arreglo', 'Una página «Trámites de la A a la Z» lista para publicar y datos schema.org para buscadores y asistentes.'],
];

export default function Portada() {
  return <div className="text-tinta">
    <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
      <p className="font-serif text-xl font-semibold tracking-tight">Wayfinder</p>
      <nav className="flex items-center gap-5 text-sm text-tinta-media">
        <a className="hidden hover:text-tinta sm:inline" href="#como-funciona">Cómo funciona</a>
        <a className="hidden hover:text-tinta sm:inline" href="#equipos">Para equipos de sitios</a>
        <a className="hover:text-tinta" href="#probar">Probar</a>
      </nav>
    </header>
    <div className="mx-auto max-w-5xl border-t border-tinta px-6" />

    <section className="mx-auto max-w-5xl px-6 pb-20 pt-16 sm:pt-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-acento">Extensión para Chrome, Brave y Edge</p>
      <h1 className="mt-5 max-w-3xl font-serif text-[44px] font-semibold leading-[1.05] tracking-tight sm:text-[64px]">Tu trámite, a un clic.</h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-tinta-media">Wayfinder te acompaña sobre el sitio oficial: entiende lo que necesitás con tus palabras, te dice qué tener a mano y te marca dónde tocar para empezar.</p>
      <div className="mt-9 flex flex-wrap items-center gap-4">
        <ExtensionButton label="Instalar Wayfinder" className="rounded-md bg-acento px-6 py-3.5 text-sm font-semibold tracking-wide text-acento-tinta transition-opacity hover:opacity-90" />
        <a href="#probar" className="rounded-md border border-tinta px-6 py-3.5 text-sm font-semibold tracking-wide text-tinta transition-colors hover:bg-tinta hover:text-fondo">Probar sin instalar</a>
      </div>
      <p className="mt-5 text-xs text-tinta-suave">Organizado con IBM Bob · Versión de prueba, se instala una sola vez.</p>
    </section>

    <section id="como-funciona" className="mx-auto max-w-5xl px-6 pb-20">
      <h2 className="border-t border-linea-fuerte pt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-tinta-suave">Cómo funciona</h2>
      <ol className="mt-8 grid gap-10 sm:grid-cols-3">{PASOS.map(([t, d], i) => <li key={t}>
        <p className="font-serif text-4xl text-acento">{String(i + 1).padStart(2, '0')}</p>
        <h3 className="mt-3 font-serif text-xl font-semibold">{t}</h3>
        <p className="mt-2 leading-relaxed text-tinta-media">{d}</p>
      </li>)}</ol>
    </section>

    <section className="mx-auto max-w-5xl px-6 pb-20">
      <div className="grid gap-px overflow-hidden rounded-md border border-linea bg-linea sm:grid-cols-3">{PRINCIPIOS.map(([t, d]) => <div key={t} className="bg-superficie p-6">
        <h3 className="font-semibold">{t}</h3><p className="mt-2 text-sm leading-relaxed text-tinta-media">{d}</p>
      </div>)}</div>
    </section>

    <section id="equipos" className="mx-auto max-w-5xl px-6 pb-24">
      <h2 className="border-t border-linea-fuerte pt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-tinta-suave">Para el equipo del sitio · IBM Bob IDE</h2>
      <p className="mt-8 max-w-2xl font-serif text-3xl font-semibold leading-snug tracking-tight">Mantener la guía de trámites de un sitio deja de ser trabajo manual.</p>
      <div className="mt-10 grid gap-10 sm:grid-cols-3">{EQUIPO.map(([t, d]) => <div key={t}>
        <h3 className="font-semibold">{t}</h3><p className="mt-2 text-sm leading-relaxed text-tinta-media">{d}</p>
      </div>)}</div>
      <p className="mt-10 text-sm text-tinta-media">Modos propios, skills y un conector MCP incluidos en el repositorio (<code className="font-mono text-xs">.bob/</code>).</p>
    </section>
  </div>;
}
