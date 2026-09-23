# Contexto del concurso (relevado 23/09/2026 por el Claude de Franco)

Fuente: https://lablab.ai/ai-hackathons/ibm-bob-2-hackathon (y su página /live)

## La consigna (la trajo Cande el 23/09)

Texto original:

> Create a solution that improves a specific developer workflow, such as onboarding,
> debugging, code review, testing, application maintenance, or release and deployment
> processes.
>
> Start by clearly defining a problem where time, effort, or errors are too high today.
> Then, using IBM Bob 2.0, build a working prototype on a real or sample project that
> demonstrates a full solution to improve the specified workflow.
>
> Leverage features like Agent mode, parallel tasks, subagents, and document understanding
> to manage and improve multiple steps, not just assist with coding. Clearly demonstrate
> impact by showing how your solution increases productivity, reduces manual effort,
> errors, and rework, or significantly shortens the time required to complete tasks.

En criollo, hay que presentar:
1. **Un problema concreto** en una tarea de todos los días de un equipo que programa
   (sumar gente nueva, buscar errores, revisar cambios, probar, mantener, publicar
   versiones) donde hoy se pierde mucho tiempo o hay muchos errores.
2. **Un prototipo que funcione, hecho con IBM Bob 2.0**, sobre un proyecto real o de ejemplo.
3. Que Bob **maneje varios pasos del proceso** (modo agente, tareas en paralelo,
   subagentes, lectura de documentos), no solo que ayude a escribir código.
4. **Mostrar el impacto con números**: cuánto tiempo, trabajo manual o errores se ahorran,
   comparando el antes y el después.

**IBM Bob es obligatorio**: la consigna lo dice textual ("using IBM Bob 2.0").

## Datos duros
- **Arranca:** viernes 25/09, 15:00 UTC = **12:00 hora Argentina**. A esa hora se CIERRA la inscripción.
- **Entrega:** domingo 27/09, 15:00 UTC = **12:00 hora Argentina**. 48 horas de trabajo.
- **Premios:** USD 12.000 en total (el reparto todavía no está publicado).
- **Categorías o desafíos:** "a anunciar". Se sabrán en la transmisión de apertura del viernes.
- **Anotados:** más de 14.000 personas y 2.600 equipos. Hay mucha competencia.
- Hay que **inscribirse antes de la apertura** para recibir el acceso a IBM Bob.
  ⚠️ Cande y Franco: verificar que los DOS estén inscriptos y en el mismo equipo en lablab.

## ¿Es obligatorio usar IBM Bob?
La página no lo dice textual, pero el concurso entero gira alrededor de Bob. El que
ganó la edición anterior lo usó "a fondo" y lo explicó en su presentación.
**Conclusión: usarlo sí o sí y que se note.**

## Qué es IBM Bob
Es un asistente de programación de IBM, parecido a Claude Code (https://bob.ibm.com/docs/ide).
- Tiene 5 modos: preguntar, planificar, programar, avanzado y coordinador (reparte la tarea entre los otros).
- Se le pueden crear **modos propios** y **habilidades propias** (Skills).
- Trae un armador de conectores (MCP Builder).
- Por dentro combina varios modelos, entre ellos Granite, que es de IBM.

## La edición anterior (mayo 2026): 503 proyectos
Tema: "herramientas que mejoren cómo se hace software".
- 🥇 **Pedigree**: deja un sello firmado en cada cambio escrito por una IA (qué modelo
  lo hizo, quién lo aprobó), porque desde agosto de 2026 la ley europea multa a quien no
  pueda probarlo. Arma un "pasaporte del código" que se verifica en 10 segundos.
  Usó Bob con un modo propio ("oficial de procedencia"), una habilidad propia, el MCP Builder
  y el modelo Granite en watsonx.ai.
- 🥈 Atlas. 🥉 Sandbox ("Castles Crumble. Fix Them First.").
- Los más votados por la gente: LegacyLink AI (modernizar código viejo), RepoMind
  (ayuda a entender un proyecto nuevo), CodeAtlas, PRISM (revisión de cambios).

**Lo que se valoró:** un problema real y concreto, un motivo de por qué es urgente,
usar lo propio de Bob (modos, habilidades, conectores) y sumar productos de IBM
(Granite, watsonx).

## Qué se entrega (lo habitual en lablab; confirmar el viernes)
Título, descripción corta y larga, imagen de portada, **video de presentación**,
**diapositivas**, enlace a una demo funcionando y el proyecto de GitHub
(este tiene que quedar **público** antes de entregar; hoy es privado).
