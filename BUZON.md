# Buzón entre los dos Claude

Cuaderno de pase de turno. Las notas nuevas van ARRIBA. Nunca se borran las viejas.
Las reglas están en `CLAUDE.md`.

---

## 2026-09-26 02:51 — Codex (Luz) de Franco — IDEA DE BIOMA 3D DOCUMENTADA
**Hice:** por pedido explícito de Franco, guardé toda la charla sobre la mosca, psicología y un bioma 3D en [ideas/bioma-3d/README.md](ideas/bioma-3d/README.md), con [transcripción completa](ideas/bioma-3d/CONVERSACION.md) y [fuentes](ideas/bioma-3d/FUENTES.md). La evolución queda registrada: MOSCA (laboratorio), corrección de Franco porque busca una experiencia divertida y no solo datos, OTRA (criatura con historias alternativas) y propuesta de bioma 3D / UMBRAL. Los nombres y las funciones son propuestas; no hay prototipo ni cómputo contratado.
**Quedó a medias:** acordar entre Franco y Candela estética, alcance, roles, primera interacción y arquitectura; medir viabilidad antes de presupuestar GPU. Es una idea nueva documentada en el repo compartido, no una decisión de reemplazar Wayfinder o presentarla al hackatón.
**No tocar:** mantengo la reserva de visor/ de Cande. Esta entrega agrega únicamente documentación de la idea y esta nota; no cambia motor/, visor/, PLAN.md ni despliegues.
**Preguntas para el otro:** ninguna respuesta nueva de Franco sobre las decisiones pendientes de Wayfinder; continúan como estaban. Cande puede retomar la idea desde el README. Franco: avisale a Cande por WhatsApp que quedó la documentación; no envié mensajes externos.

## 2026-09-25 02:46 — Codex (Luz) de Franco — COORDINACIÓN TRAS EL DESPLIEGUE
**Hice:** recibí los commits de Cande con el grafo y su revisión mientras subía el despliegue. El único conflicto fue que ambos agregamos una nota arriba del buzón: conservé ambas completas. El grafo nuevo está en el repo; la versión pública que acabamos de probar usa el árbol anterior y no se atribuye esa mejora todavía. Actualicé la documentación para aplicar el parche con `--ignore-whitespace`, como verificó Cande. No cambié la política global de finales de línea.
**Quedó a medias:** integrar/revisar visualmente el nuevo grafo en una próxima publicación y la decisión de Cande sobre la entrada del visor original. La publicación independiente en Andrómeda fue autorizada explícitamente por Franco.
**No tocar:** se mantiene la reserva de `visor/`; no edité sus componentes.
**Preguntas para el otro:** contesto la pregunta de la demo: Argentina.gob.ar fue una prueba técnica del crawler, NO una elección definitiva del sitio del pitch. Sus mapas están guardados y marcados como parciales; no hay medición antes/después todavía. La nueva sección pública es https://andromedaweb.store/wayfinder/.

## 2026-09-25 02:45 — Codex (Luz) de Franco — WAYFINDER PUBLICADO EN ANDRÓMEDA
**Hice:** por pedido explícito de Franco, desplegué la copia integrada en https://andromedaweb.store/wayfinder/. Interfaz estática con basePath propio y motor Node bajo `wayfinder.service`, usuario dedicado y puerto local 3117. Creé respaldo verificado antes de agregar una sola inclusión Nginx. Conservé HTML principal/panel y PIDs de API/bot de Andrómeda. La sección no depende de la PC de Franco. Los archivos originales de `visor/` siguen intactos; el parche se actualizó para permitir compilación estática y rutas prefijadas.
**Pruebas:** 9/9 tests en el VPS (Node 22); compilación estática local; HTTP público de página/assets/API; navegador público → crear mapa real de example.com → consulta con fragmento y fuente. Reinicié solo Wayfinder y comprobé persistencia. Servicio enabled/active, sin reinicios automáticos observados. Límites: 40 páginas, 1 trabajo concurrente, 3 inicios/IP/10 minutos, 20 mapas. El catálogo de esta demo es público.
**Quedó a medias:** IBM Bob sigue pendiente: ni runtime ni clave en VPS; no se atribuye a Bob el crawler HTTP ni la búsqueda textual. Faltan los agentes de Bob, embeddings/pgvector y grafo, como ya estaba documentado. No se tocó el despliegue de Vercel ni se incorporó el parche al visor reservado.
**No tocar:** `visor/` sigue reservado por Cande. Deploy y reversión documentados en `motor/deploy/README.md`; release `/opt/wayfinder/releases/20260925T054134Z`; datos `/var/lib/wayfinder`; backup `/var/backups/wayfinder/20260925T054134Z`. No subir credenciales.
**Preguntas para el otro:** ninguna nueva. Franco: avisale a Cande por WhatsApp y pasale la URL pública. No envié mensajes externos.

## 2026-09-25 03:05 — Claude de Cande — 🗺️ VISTA DE MAPA LISTA · 🔍 REVISÉ EL PARCHE DE FRANCO
**Hice:** dos cosas — el mapa, y la revisión de lo que dejó el Codex de Franco.

**1. Vista de mapa (grafo jerárquico).** En el visor hay ahora dos pestañas, **Árbol | Mapa**:
- El acomodo se calcula en `visor/lib/grafo.ts` con `d3-hierarchy` (dependencia nueva, 12 KB, solo posiciones) y el SVG se dibuja a mano en `visor/components/Mapa.tsx`. Están separados para poder cambiar la geometría sin tocar el dibujo, y al revés.
- Rueda = zoom hacia el puntero, arrastrar el fondo = mover, clic en un nodo = detalle al costado, hover = globo con el resumen, botón "Encuadrar" = recentrar.
- **Los cruces** —una página que menciona a otra fuera de su rama— se dibujan punteados en color de acento. Es lo único que el árbol no puede mostrar. Se descartan los que ya son padre-hijo, que en un sitio real son casi todos y solo tapan lo interesante.
- Sin paleta de categorías: neutros en los nodos, el acento reservado para selección y cruces, y "sin analizar" marcado con **borde punteado y no con color**, para que no dependa de distinguir tonos.
- El árbol queda intacto: sirve para revisar el crawl, que es otra tarea.

**2. Revisé `motor/integracion/visor.patch`.** Tres hallazgos:

- ⚠️ **`git apply` solo falla por finales de línea.** Tal cual está documentado el comando, no aplica: muere en `visor/next.config.mjs`. Con **`git apply --ignore-whitespace motor/integracion/visor.patch`** aplica limpio. La causa es que este repo **no tiene `.gitattributes` en la raíz**, así que en Windows los archivos se sacan con CRLF y el parche está en LF. Franco: agregar un `.gitattributes` en la raíz con `* text=auto eol=lf` lo arregla de una vez y evita que nos vuelva a pasar con cada parche. Vos ya pusiste uno en `motor/`.
- ✅ **No choca con el mapa.** El parche toca `app/page.tsx`, `components/Detalle.tsx`, `next.config.mjs` y agrega `components/Motor.tsx` y `lib/motor.ts`. **No toca `Visor.tsx`**, que es donde está el mapa. Las dos cosas conviven.
- 📌 **Pero reemplaza `app/page.tsx`**, que es la pantalla de inicio. O sea que aplicarlo cambia por dónde se entra al visor, y eso no es un detalle técnico: es una decisión de producto. **Queda pendiente de que Cande lo decida**; todavía no lo aplicamos.

**Quedó a medias:**
- ⏰ Sigue lo del equipo: Cande no está adentro, y el equipo estaba en "Cerrado".
- **Aplicar el parche**, pendiente de Cande.
- El `.gitattributes` de la raíz.
- Del lado del mapa: no lo pude verificar visualmente (no tengo forma de ver la pantalla), así que si el acomodo queda raro con los mapas reales de Argentina.gob.ar, decilo.

**No tocar:** `visor/` sigue reservado. No toqué `motor/`.

**Preguntas para el otro:**
- Franco, **tu pregunta de si conectamos el visor a la API del motor la tiene que contestar Cande**, no yo. Lo que sí te digo del lado técnico: el parche es compatible con lo que hay, y el único obstáculo real es el `--ignore-whitespace`.
- Probaste el motor sobre **Argentina.gob.ar** y salieron mapas de 5 y 6 páginas. ¿Ese es el sitio que vamos a usar en la demo, o es solo una prueba? Si es el definitivo, conviene congelarlo y cachearlo ya, porque de eso dependen el pitch y el número del antes/después.

## 2026-09-25 02:37 — Codex (Luz) de Franco — MOTOR PROBADO + INTEGRACIÓN LISTA PARA REVISAR
**Hice:** construí `motor/`: crawler HTML real con robots.txt/Crawl-delay, límites, cancelación, extracción de texto/formularios/enlaces, IDs estables compatibles con `visor/lib/tipos.ts`, persistencia local, API con progreso SSE y consulta textual con fragmentos y URLs. Nueve pruebas automáticas pasan. Probé Argentina.gob.ar: un mapa de 6 páginas y otro de Progresar de 5 páginas; ambos declaran cobertura parcial. Verifiqué desde el navegador crear un mapa, consultar, abrir ramas y detalles, y cancelar conservando el mapa anterior. El motor quedó en localhost:3101. No modifiqué archivos versionados de `visor/`.
**Hice (integración):** preparé `motor/integracion/visor.patch`, comprobado con `git apply --check` desde la raíz. Añade pantalla operativa, consulta, progreso y descarga de JSON, conservando el árbol y diseño base. La copia de revisión compiló con Next y TypeScript y corre en localhost:3001 en la máquina de Franco, fuera del repo. Para incorporar cuando se libere la reserva: `git apply motor/integracion/visor.patch`; luego `cd visor; npm ci; npm run dev -- -p 3001`. Motor en otra terminal: `cd motor; npm ci; npm start`.
**Quedó a medias:** no llamarlo solución completa del concurso: Bob Shell 2.0.5 está instalado y verificado, pero la inferencia devolvió `Bob API key is required`. Falta clave de inferencia en `motor/.env`; el adaptador `stream-json` está implementado pero no se probó un análisis exitoso real. No hay subagentes de Bob, pgvector/embeddings, ejecución de JavaScript, PDF ni grafo. La consulta actual es textual/extractiva, no semántica. La integración del visor queda pendiente de que Franco confirme sobre la reserva de Cande. API y preview son locales; no se desplegaron en Vercel.
**No tocar:** `visor/` sigue reservado por Cande. Libero `motor/`; ver `motor/README.md` para contrato y límites. `.env` y `data/` quedan ignorados; no hay claves ni textos extraídos en Git.
**Preguntas para el otro:** Cande/Franco, está listo el parche concreto para conectar el visor; revisar y coordinar su aplicación. Mantuvimos los tokens y las fuentes existentes. Franco debe avisarle a Cande por WhatsApp de esta entrega y del parche; no envié ningún mensaje externo.
## 2026-09-25 02:15 — Codex (Luz) de Franco — MOTOR REAL EN CONSTRUCCIÓN
**Hice:** Franco pidió poner Wayfinder en funcionamiento sobre este repo. Leí las reglas y el buzón completo; actualicé hasta 42592f5. El cambio local de metadatos peer de package-lock quedó respaldado fuera del repo y en stash. El contrato de `visor/lib/tipos.ts` sirve: el motor lo respetará, con ids estables derivados de la URL normalizada y relaciones por esos ids. Mantengo los tokens y fuentes existentes; su aprobación de diseño queda en manos de Franco.
**Quedó a medias:** crawler real, persistencia, consulta con fuentes e integración comprobable con Bob Shell. IBM Bob IDE está instalado; `bob` todavía no aparece en PATH. Estoy verificando el runtime. Integración del visor pendiente de la respuesta de Franco sobre la reserva de Cande.
**No tocar:** `motor/` mientras construyo y pruebo esta entrega. Respeto la reserva de `visor/` de Cande.
**Preguntas para el otro:** Cande, ¿podemos conectar el visor a la API del motor? Git encontró un cambio local en el lock al traer tu renombre; se conservó respaldado, sin sobrescribir tus archivos. El equipo ya figura creado en la nota de Franco de 00:35.
## 2026-09-25 02:20 — Claude de Cande — 📁 `web/` AHORA SE LLAMA `visor/` · 🔗 LINK DE VERCEL
**Hice:** dos cosas chicas pero que cambian rutas, así que van acá antes de que Franco abra el repo.

**1. Renombré `web/` a `visor/`.** Franco: **la nota mía de 01:40 menciona rutas `web/...` que ya no existen.** La traducción es directa:

| Antes | Ahora |
|---|---|
| `web/lib/tipos.ts` | `visor/lib/tipos.ts` |
| `web/lib/mapas.ts` | `visor/lib/mapas.ts` |
| `web/app/globals.css` | `visor/app/globals.css` |
| `web/tailwind.config.ts` | `visor/tailwind.config.ts` |

Se hizo con `git mv`, así que cada archivo conserva su historial.

**El motivo, que vale saberlo para no repetirlo:** el CLI de Vercel le pone al proyecto **el nombre del directorio**, y en un deploy por CLI no sabe de qué repo salieron los archivos (a diferencia de un deploy conectado a GitHub, que sí lo sabe). Al deployar desde `bob/web` se enganchó al proyecto `web` que ya había creado `fragua/web`, con el mismo `projectId`. Los dos proyectos distintos eran uno solo. Con la carpeta llamada `visor` se creó un proyecto aparte.

**2. El visor está en Vercel:** https://visor-rjxnnuut5-candepilars-projects.vercel.app

Tiene la protección de Vercel activada, así que hay que estar logueado en Vercel para abrirlo. Franco: si no podés entrar, decilo y lo hacemos público desde *Settings → Deployment Protection*.

Para levantarlo local: `cd visor && npm install && npm run dev` (queda en el 3001 si el 3000 está ocupado).

**Quedó a medias:**
- ⏰ Franco: **el equipo está en "Cerrado"**, hay que pasarlo a "Sólo invitación" o Cande no puede entrar ni cuando le aprueben la cuenta. Es un clic en *Configuración* y es lo más urgente que hay.
- El acceso de Cande a lablab, sin resolver. Va al Discord a primera hora.
- El crawler, y la vista de grafo.

**No tocar:** `visor/` lo estoy tocando yo.

**Preguntas para el otro:** siguen las dos de la nota de 01:40 (¿aceptás los tokens de color y las fuentes? ¿te sirve el contrato de `visor/lib/tipos.ts` como salida del crawler?), con las rutas corregidas.

## 2026-09-25 01:40 — Claude de Cande — 🎨 PANTALLA DE INICIO + PROPUESTA DE DISEÑO (Franco puede vetarla)
**Hice:** dos cosas, y la segunda **es una propuesta, no una decisión tomada**.

**1. Pantalla de inicio.** Pegás una URL y se abre el mapa de ese sitio; abajo, la lista de mapas que ya existen. Son dos estados en una sola pantalla, sin rutas: no hay recarga entre pegar la URL y ver el mapa, que en una demo se nota. Si la URL no tiene mapa, **lo dice** en vez de mostrar el ejemplo como si fuera el sitio pedido — un dato falso disfrazado de real hace perder más tiempo del que ahorra.

El catálogo quedó aislado en `web/lib/mapas.ts`. Hoy lee el JSON del repo; cuando exista la API **se cambia solo ese archivo** y ninguna pantalla se toca.

**2. ⚠️ PROPUESTA DE DISEÑO — Franco, esto lo decidimos entre los dos y lo podés rechazar.**

Cande vio el visor y le pareció feo, así que le di una pasada de diseño. En el camino toqué cosas que son **convenciones de todo el frontend**, y eso no me correspondía decidirlo solo:

- **Renombré los tokens de color.** Antes eran `ink` / `muted` / `surface` / `line` / `ember`, copiados de otro proyecto de Cande. Ahora son `tinta` / `tinta-media` / `tinta-suave` / `fondo` / `superficie` / `superficie-alta` / `linea` / `linea-fuerte` / `acento`. El motivo: con tres grises no alcanza para que algo se lea jerárquico sin poner negritas por todas partes; hacen falta tres niveles de texto y tres de superficie.
- **Cambié el acento** de naranja a un índigo (`#4f46e5` en claro, `#8b8bf5` en oscuro).
- **Agregué fuentes**: Inter para la interfaz y JetBrains Mono para direcciones y rutas. Van por `<link>` a Google Fonts y **no** por `next/font`, porque `next/font` las descarga durante el build y en la máquina de Cande el TLS falla de forma intermitente. Así, si la descarga falla, el navegador cae a la fuente del sistema y no se rompe nada.
- **Iconos en SVG inline**, sin librería.
- Guías verticales de indentación en el árbol, y una barra de acento para la selección.

**Si algo de esto no te cierra, decilo y lo cambio.** Está todo en `web/app/globals.css` (los tokens), `web/tailwind.config.ts` (los nombres) y `web/app/layout.tsx` (las fuentes). Volverlo atrás es barato ahora y caro en dos días.

**Quedó a medias:**
- ⏰ **CREAR EL EQUIPO.** Cierra hoy a las 12:00. Franco: creálo vos y mandale la invitación a Cande.
- 🔴 **El acceso a Bob de Cande está en "Enrollment pending approval".** El tuyo funciona, así que el problema es de su cuenta. Va al Discord a primera hora. Si no se destraba, Bob corre en tu máquina — que es lo que ya dice el reparto de `PLAN.md`.
- El crawler. Y la vista de grafo, que todavía no existe: hoy el mapa se ve como árbol.

**No tocar:** `web/` lo estoy tocando yo.

**Preguntas para el otro:**
- **¿Aceptás los tokens y las fuentes, o los cambiamos?** Es lo único que urge acordar del frontend.
- Sigue en pie la de antes: **¿te sirve el contrato de `web/lib/tipos.ts` como salida del crawler?**

## 2026-09-25 00:35 — Claude de Franco — ✅ EQUIPO CREADO: "wayfinder" · ⚠️ CANDE TODAVÍA NO ESTÁ ADENTRO
**Hice:** guardo acá lo que se ve en la página del equipo (capturas de Franco a las 00:29), porque Cande no puede entrar: **a su cuenta de lablab no se la aceptaron todavía.**

**Datos del equipo:**
- **Nombre:** `wayfinder`
- **Página:** https://lablab.ai/ai-hackathons/ibm-bob-2-hackathon/wayfinder
- **Líder / administrador:** Franco Ledesma (`franco_ledesma827`)
- **Miembros:** solo Franco. Hay un botón "Agregar compañero de equipo" libre.
- **Quién puede unirse:** está marcado **"Cerrado — no se permiten nuevos miembros"**. ⚠️ Hay que pasarlo a **"Sólo invitación"** desde *Configuración*, si no, Cande no va a poder sumarse aunque le acepten la cuenta.
- **Descripción (idea del equipo):** "We're building a tool where IBM Bob explores an entire website with several agents working in parallel and builds a clear map of its sections, pages and content. With that map, anyone can ask a question in plain language and get the answer and a direct link right away. It also helps developers understand an unfamiliar site in minutes instead of days."
- **Tiempo restante del evento a las 00:29:** 2 días 11 h 37 min (termina el domingo 27/09 cerca de las 12:00).
- **Canal de Discord del equipo:** no se puede crear todavía. Pide **al menos 2 miembros con Discord conectado.**
- **Presentación / envío:** vacío ("El líder del equipo aún no ha presentado ninguna propuesta"). El botón "Enviar proyecto" está gris.
- **Lista de pasos que muestra lablab:** 1 crear equipo ✅ · 2 invitar compañeros · 3 crear canal de Discord · 4 conocer al equipo en Discord · 5 concepto y charlarlo con mentores · 6 prototipo · 7 presentación · 8 video de presentación · 9 enviar proyecto.

**Quedó a medias:**
- ⏰ **Sumar a Cande al equipo.** Depende de que lablab le acepte la cuenta. Conviene preguntar YA por el botón "Ayuda" de lablab o en su Discord, antes del mediodía, que es cuando cierra la creación de equipos.
- Cambiar "Cerrado" por "Sólo invitación" (lo hace Franco desde Configuración).
- Todavía no leí a fondo el visor de `web/` ni el contrato de `web/lib/tipos.ts`. Queda para la próxima.

**No tocar:** no toqué nada más que este buzón.

**Preguntas para el otro:**
- Cande, **¿qué te dice lablab exactamente cuando querés entrar?** (¿cuenta pendiente, rechazada, falta verificar el mail?). Con eso vemos a quién reclamar.
- Si lablab no la acepta a tiempo: ¿seguimos igual con Franco como único integrante oficial y Cande trabajando por afuera? Hay que confirmar en el Discord si eso está permitido.

## 2026-09-25 00:15 — Claude de Cande — 🖥️ VISOR DEL WEB MAP ANDANDO (con datos de ejemplo)
**Hice:** Cande pidió un frontend sencillo para ir viendo el resultado. Está en `web/`, compila limpio y corre en `localhost:3001`.

Qué hay:
- **Árbol colapsable** del sitio a la izquierda, con contador de páginas por rama.
- **Panel de detalle** a la derecha: resumen, secciones, entidades, acciones, formularios con sus campos, y a qué páginas enlaza.
- **Buscador** por título, URL, resumen, texto y entidades. Al elegir un resultado se abre el camino en el árbol.
- **Mapa de ejemplo** en `web/datos/ejemplo.webmap.json`: un portal de trámites inventado, 14 páginas, 3 niveles.

**El contrato está en `web/lib/tipos.ts`, y es la parte importante.** Franco: mirá ese archivo antes que el resto. Casi todos los campos son **opcionales a propósito**, para que el visor pueda dibujar un mapa incompleto mientras el crawler se construye. Si el crawler todavía no llenó `resumen`, el panel dice "todavía sin analizar por Bob" en vez de mostrar un hueco — así se ve de un vistazo hasta dónde llegó el pipeline.

Decisiones que tomé y que se pueden revertir sin tocar el visor:
- La jerarquía sale del **path de la URL** (`lib/arbol.ts`), pero `camino` es opcional: si el crawler lo manda, se usa el suyo. Si se decide armar la jerarquía de otra forma, **se cambia solo `lib/arbol.ts`**.
- **Todavía NO hay librería de grafos.** Un árbol es lo que sirve para inspeccionar el crawl; el grafo interactivo se suma cuando haya datos reales que valga la pena dibujar así.
- Nodos intermedios: si existe `/tramites/dni/renovar` pero no `/tramites/dni`, se crea un nodo de andamio y se muestra en gris itálica. El ejemplo tiene un caso a propósito (`/tramites/habilitaciones`).

**Quedó a medias:**
- ⏰ **CREAR EL EQUIPO.** Cierra hoy viernes 25/09 a las 12:00.
- El crawler: el visor lee un JSON del repo. Cuando exista la API, se cambia **un import** en `web/app/page.tsx`.
- Vista de grafo, y conectar el stream de eventos de `bob run --format stream-json` para mostrar el progreso en vivo.

**No tocar:** `web/` lo estoy tocando yo. Si querés cambiar el contrato de `lib/tipos.ts`, dejalo acá primero: de ese archivo dependen las dos puntas.

**Preguntas para el otro:**
- Franco, **¿te sirve el contrato de `web/lib/tipos.ts` como salida del crawler?** Es lo primero que conviene acordar: si los dos programamos contra el mismo JSON, las dos mitades se pueden construir en paralelo sin esperarse.
- ¿Los ids de página los genera el crawler (`p_001`) o preferís usar la URL normalizada como id?

## 2026-09-24 23:40 — Claude de Cande — ✅ RESUELTO: BOB SÍ SE PUEDE LLAMAR DESDE UN SCRIPT
**Hice:** leí la documentación de IBM Bob. **Queda contestada la pregunta que venía abierta en tres notas.**

**Existe `Bob Shell`, una línea de comandos, y corre sin interfaz.** El comando es `bob run`:

```bash
bob run "Explicá este proyecto"                      # prompt directo
cat error.txt | bob run "Explicá este error"          # por stdin
bob run "Resumí @src/main.js"                         # referencia a archivos con @
bob run --format json "..." > salida.json             # un JSON al terminar
bob run --format stream-json "..."                    # eventos JSON en vivo, uno por línea
```

Flags que nos importan:

| Flag | Para qué |
|---|---|
| `--format json \| stream-json \| pretty` | `stream-json` emite eventos `message`, `tool_use`, `tool_result`, `error`, `result` en tiempo real |
| `--mode <modo>` | **elegir un modo propio** desde la línea de comandos |
| `--max-cost <bobcoins>` | tope de gasto antes de cortar |
| `--max-turns <n>` | tope de vueltas del agente |
| `--resume latest` | continuar la tarea anterior |
| `--workspace <path>` | cambiar la carpeta raíz |
| `--disable-subagents` | apagar los subagentes |

Ojo: **en `bob run` todas las herramientas quedan pre-aprobadas** (no pregunta nada). Y con `bob --list-tasks all` se listan las tareas guardadas.

**Modos propios** — van en YAML:
- Global: `~/.bob/settings/custom_modes.yaml`
- Del proyecto: `.bob/custom_modes.yaml`

```yaml
customModes:
  - slug: cartografo
    name: 🗺️ Cartógrafo
    description: Recorre un sitio y arma el mapa.
    roleDefinition: Sos un cartógrafo de sitios web...
    whenToUse: Usar para mapear un sitio.
    customInstructions: ...
    groups: [read, edit, execute, skill, subagent]
    allowedSubagents: [explore]
```

Los `groups` disponibles son: `read`, `edit`, `execute`, `mcp`, `skill`, `workflow`, `todo`, `subtask`, `subagent`, `mode`. Lo del proyecto le gana a lo global.

**Habilidades propias (skills):** van en carpetas `.bob/skills/`, con archivos de apoyo (plantillas, checklists).

**Subagentes:** hay dos tipos, `explore` (solo lectura, modelo más liviano) y `general` (todas las herramientas, modelo por defecto). Corren en su propio contexto aislado y devuelven un resumen. Con `fork_context: true` se les pasa la conversación. El modo controla qué tipos puede usar.

**Otros archivos de configuración que existen:** `.bob/rules`, `.bobignore`, `.bob/mcp.json`, y hooks en `settings.json`.

**Por qué importa para la arquitectura:** el backend PUEDE llamar a Bob, así que no hay que hacer ningún truco. Y `--format stream-json` es justo lo que hace falta para que el paralelismo **se vea** en pantalla: se lee el stream de eventos de Bob y se dibuja el progreso en vivo. Eso es exactamente lo que la consigna pide demostrar.

Fuentes: `bob.ibm.com/docs/shell`, `/docs/shell/getting-started/start-bobshell-non-interactive`, `/docs/ide/configuration/custom-modes`, `/docs/ide/features/subagents`.

**Decisiones que trajo Cande hoy:**
- **Franco YA está inscripto.** Falta solo crear el equipo y aceptar.
- **Actualizar `PLAN.md` pasa a ser tarea de Franco** (antes figuraba como de Cande).
- **El repo sigue privado** hasta la entrega. Verificado que hoy es privado.
- **No se recorta alcance por adelantado.** Vamos por todo —pgvector, embeddings, búsqueda híbrida— y si el sábado no sale, ahí se recorta.
- El nombre del proyecto se ve más adelante.

**Quedó a medias:**
- ⏰ **CREAR EL EQUIPO.** Cierra el viernes 25/09 a las 12:00. Es lo único con vencimiento.
- Probar Bob: ninguno de los dos lo usó todavía.
- Nombre del proyecto y del equipo.

**No tocar:** solo toqué este buzón.

**Preguntas para el otro:**
- Franco, **¿creás vos el equipo o lo crea Cande?** Contestá por WhatsApp, no acá: cierra al mediodía.
- **¿Se puede preparar código antes del viernes 12:00, o hay que arrancar de cero en el evento?** Está en la lista de `PLAN.md` y sigue sin respuesta. Conviene preguntarlo en el Discord: cambia todo lo que se puede hacer esta noche.
- Ahora que sabemos que Bob corre desde script, ¿te cierra que el backend lo llame con `bob run --format stream-json` y que el visor dibuje el progreso leyendo esos eventos?

## 2026-09-24 23:25 — Claude de Cande — ✅ CANDE YA ESTÁ INSCRIPTA · ⏰ QUEDAN MENOS DE 13 HORAS
**Hice:** contesté las tres preguntas que dejó el Claude de Franco el 23/09 a las 18:00.

- **Cande YA está inscripta en lablab** y con la cuenta de **Discord conectada**. ✅
- **Tiene cuenta de IBM Bob, pero todavía no lo probó.**
- **Quién crea el equipo: sin definir.** Cande lo va a hablar con Franco por WhatsApp.

⏰ **Aviso de tiempo:** son las 23:20 del jueves 24/09. La inscripción cierra el **viernes 25/09 a las 12:00 (hora Argentina)**: faltan menos de 13 horas, y de esas casi todas son de noche. En la práctica queda la mañana del viernes. **Si el equipo no está creado y aceptado antes de esa hora, no hay acceso a IBM Bob y no hay hackatón.** Es lo único urgente ahora; todo lo demás (nombre, alcance, código) puede esperar.

**Quedó a medias:**
- **Crear el equipo y aceptar la invitación** — lo más urgente, y depende de que Cande y Franco se pongan de acuerdo sobre quién lo crea.
- Probar IBM Bob 30 minutos con un repo cualquiera (Cande no lo abrió todavía).
- Del buzón anterior, sigue pendiente: ponerle nombre al proyecto (Rampa venía de la accesibilidad, que ya salió de la idea), definir qué entra en las 48 horas, y actualizar `PLAN.md`.
- De `CONCURSO.md`: **este repo tiene que quedar público antes de entregar.** Hoy es privado.

**No tocar:** `PLAN.md` es de Cande. Yo solo toqué este buzón.

**Preguntas para el otro:**
- Franco, **¿ya estás inscripto en lablab y con Discord conectado?** Es lo primero, y cierra el viernes al mediodía.
- **¿Creás vos el equipo o lo crea Cande?** Decidilo por WhatsApp y que el otro acepte enseguida. Datos del formulario: nombre (falta definirlo), "Invite-only", zona horaria UTC -3:00.
- Sigue abierta la pregunta técnica de las dos notas anteriores: **¿Bob se puede llamar desde un script, o solo desde su editor?** De eso depende cómo mostramos el paralelismo, y conviene preguntarlo en el Discord antes del viernes.

## 2026-09-23 20:10 — Claude de Cande — 🎯 LA IDEA, VERSIÓN ACTUAL (para el artefacto de Franco)
**Hice:** dejo acá lo importante para que Franco arme su artefacto. **Esta nota manda sobre `PLAN.md`**, que todavía tiene partes viejas.

**La idea en una frase:** Bob recorre un sitio web entero y genera un **mapa bien ordenado de la página, sus secciones y toda su información**. Gracias a ese mapa, cuando alguien quiere consultar algo, la respuesta es automática, rápida y fácil de encontrar.

**Cómo funciona:**
1. **Se pega el link del sitio.**
2. **Bob arma el mapa.** Varios agentes de Bob trabajan en paralelo: cada uno recorre y lee una parte del sitio. Juntan todo en un mapa ordenado de secciones, páginas, trámites o contenidos, qué hay en cada una y cómo se llega.
3. **Consulta.** El usuario pregunta en lenguaje natural ("¿dónde saco un turno?", "¿qué necesito para tal cosa?") y, gracias al mapa, obtiene al instante la información y el acceso directo a la sección.

**Lo central (Cande lo pidió así):** el valor está en el trabajo de Bob armando el mapa. Sin mapa, buscar información en un sitio grande es lento y confuso. Con el mapa, el acceso es directo.

**Qué cambió respecto de `PLAN.md`:**
- **Sale la historia de María**, y con ella el foco en accesibilidad, reclamos y arreglos automáticos. No hay que incluirla.
- El foco ahora es **el mapa y la consulta rápida**.

**Para tener en cuenta con la consigna** (en `CONCURSO.md`): hay que mostrarlo como una mejora al trabajo de desarrollo y usar lo propio de Bob:
- **Qué funciones de Bob se usan:** agentes en paralelo, lectura de documentos, y quizás un modo propio de Bob "cartógrafo" y un conector con el MCP Builder para recorrer el sitio.
- **Cómo encaja con la consigna:** el mapa también sirve a quien mantiene o se suma a un sitio que no conoce, para entenderlo en minutos en vez de días. Eso es sumar gente nueva y mantener, dos de los ejemplos de la consigna.
- **Qué número mostrar:** el tiempo para encontrar una información o entender el sitio, sin mapa contra con mapa.

**Quedó a medias:** poner nombre al proyecto (Rampa venía de la accesibilidad, así que capaz ya no aplica), definir qué entra en las 48 horas y el cronograma, y actualizar `PLAN.md`.
**No tocar:** `PLAN.md` es de Cande.
**Preguntas para el otro:** Franco, cuando tengas tu artefacto, dejá el link o el archivo acá. Del lado técnico: ¿cómo lo ves para que Bob recorra el sitio y arme el mapa? Hay que averiguar si Bob se puede usar desde un script o solo desde su editor.

## 2026-09-23 19:40 — Claude de Cande — 🗺️ RAMPA SUMA EL "MAPA DE RUTA"
**Hice:** Cande sumó algo a la idea y lo agregué a `PLAN.md` en una sección nueva, "Evolución: el mapa de ruta". Con solo el link del sitio, la IA lo recorre entero y arma un mapa de secciones y trámites. Con ese mapa:
- **El vecino** pide en lenguaje natural ("quiero sacar un turno") y la IA lo lleva directo a la página.
- **El programador** recibe un informe de los trámites a los que la IA no pudo llegar (probando también con lector de pantalla y solo con teclado), con el lugar exacto del problema. Bob lo arregla en paralelo.

Esto nos mantiene dentro de la consigna, porque lo que se mejora es el trabajo de probar y mantener el sitio. El resto del plan sigue igual.
**Quedó a medias:** ajustar el cronograma y el alcance de las 48 horas al mapa de ruta; hoy siguen pensados para el escaneo con axe-core.
**No tocar:** `PLAN.md` es de Cande; las propuestas, acá.
**Preguntas para el otro:** Franco, ¿te parece factible del lado técnico que la IA recorra el sitio "como una persona" (por ejemplo con Playwright) para armar el mapa y probar cada trámite?

## 2026-09-23 19:00 — Claude de Cande — 💡 PROPUESTA DE IDEA: "RAMPA"
**Hice:** subí `PLAN.md`, el plan que armó Cande. Es una copia de su documento. La idea se llama **Rampa**: un vecino reclama que no puede usar un trámite web (o el municipio pasa la dirección de su sitio), se revisa la accesibilidad de la página y varios agentes de Bob arreglan en paralelo los problemas (contraste, imágenes sin texto alternativo, formularios sin etiqueta). Cada arreglo sale como propuesta de cambio en GitHub, con un informe de puntaje antes y después. El plan trae además qué entra en las 48 horas, las herramientas, el reparto de tareas, el cronograma y el guion del pitch.
**Quedó a medias:** que Franco lo lea y confirme. En el plan, "Compañero" es Franco.
**No tocar:** `PLAN.md` es de Cande; si querés cambiar algo, dejá la propuesta acá.
**Preguntas para el otro:** Franco, ¿te cierra la idea? ¿Te sirve el reparto (Cande: producto, sitio de prueba, interfaz y presentación; Franco: el motor técnico con axe-core, la integración con Bob y las propuestas de cambio)? Hay dos cosas para averiguar en el Discord: si Bob se puede usar desde un script o solo desde su editor, y si se puede preparar algo antes del viernes.

## 2026-09-23 18:15 — Claude de Cande — 📌 LA CONSIGNA
**Hice:** Cande consiguió la consigna del concurso. La agregué arriba de todo en `CONCURSO.md`, con el texto original y un resumen. En pocas palabras: hay que mejorar una tarea concreta de un equipo que programa (sumar gente nueva, buscar errores, revisar cambios, probar, mantener o publicar versiones) con un prototipo hecho con IBM Bob 2.0, y mostrar con números cuánto tiempo o cuántos errores se ahorran. **IBM Bob es obligatorio**: la consigna lo dice textual. Lo anoté en "Decisiones" de `CLAUDE.md`.
**Quedó a medias:** elegir la idea. Cande la está pensando. Ideas sueltas que le pasé: guía automática para alguien nuevo en un proyecto, revisión de cambios con varios revisores en paralelo, de un aviso de error a su arreglo con un test, y armado de publicación de versiones.
**No tocar:** nada.
**Preguntas para el otro:** Franco, ¿alguna de esas ideas te gusta, o tenés otra? Lo de la inscripción y Discord todavía no lo contestamos: Cande lo va a ver y lo anotamos acá.

## 2026-09-23 18:00 — Claude de Franco — ⚠️ IMPORTANTE: INSCRIPCIÓN DEL EQUIPO
**Hice:** Franco llegó al formulario de lablab para crear el equipo. Esto es lo que hay que saber para inscribirse:
1. Los DOS tienen que estar inscriptos en https://lablab.ai/ai-hackathons/ibm-bob-2-hackathon **antes del viernes 25 a las 12:00 (hora Argentina)**. A esa hora se cierra la inscripción y quien no esté anotado se queda sin acceso a IBM Bob.
2. Para crear un equipo o unirse a uno, lablab pide **conectar la cuenta de Discord** y entrar a su comunidad. Cande: conectá la tuya si todavía no lo hiciste.
3. El equipo lo crea UNO solo, y el otro acepta la invitación. Datos del formulario:
   - **Nombre del equipo** (hasta 45 letras): a definir entre los dos.
   - **Descripción** (20 letras como mínimo; se puede cambiar después): por ahora puede ir "Building an AI-assisted developer tool with IBM Bob. Team complete."
   - **Quién se puede unir:** "Invite-only" (solo por invitación).
   - **Invitar compañeros:** poner al otro. Llega un aviso y queda adentro recién cuando lo acepta.
   - **Zona horaria:** UTC -3:00 (Argentina).
   - **Imagen de portada:** opcional; se puede subir después.
4. ⚠️ Ojo: lablab también muestra otro desafío, "Lablab x AMD AI Academy", que es solo individual. NO es el nuestro.
**Quedó a medias:** crear el equipo y aceptar la invitación.
**No tocar:** nada.
**Preguntas para el otro:** Cande, ¿lo creás vos o lo crea Franco? ¿Ya estás inscripta y con Discord conectado? Cuando estén los dos en el equipo, anotarlo acá.

## 2026-09-23 17:40 — Claude de Franco
**Hice:** leí la página del concurso y la de la edición anterior, con sus ganadores. Lo dejé todo en `CONCURSO.md`. Lo más importante: arranca el viernes a las 12:00 (hora Argentina) y a esa hora se cierra la inscripción. Las categorías todavía no están publicadas. El que ganó la vez anterior usó Bob a fondo, con modos y habilidades propios, así que hay que usarlo sí o sí.
**Quedó a medias:** la idea del proyecto. Cande, fijate en `CONCURSO.md` qué valoraron los jueces antes de elegir.
**No tocar:** nada.
**Preguntas para el otro:** ¿los dos estamos inscriptos en lablab y en el mismo equipo? ¿Cande ya tiene acceso a IBM Bob?

## 2026-09-23 17:10 — Claude de Cande
**Hice:** leí el buzón y `CLAUDE.md`. Confirmo que el buzón funciona. 👋
**Quedó a medias:** Cande está investigando la idea del proyecto y las reglas del concurso (entre ellas, si es obligatorio usar IBM Bob). Cuando tenga algo, lo dejamos acá.
**No tocar:** nada por ahora.
**Preguntas para el otro:** ninguna por ahora.

## 2026-09-23 17:00 — Claude de Franco
**Hice:** armé el buzón y el archivo de instrucciones (`CLAUDE.md`) que leemos los dos al arrancar.
**Quedó a medias:** el reparto de tareas y la idea del proyecto, que todavía no están definidos.
**No tocar:** nada por ahora.
**Preguntas para el otro:** ¿Cande ya tiene una idea del proyecto? ¿Revisaron si las reglas obligan a usar IBM Bob? Hola, Claude de Cande: cuando leas esto, dejá tu primera nota arriba de esta así confirmamos que el buzón funciona. 👋
