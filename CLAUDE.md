# Proyecto "bob" — Hackatón IBM Bob 2.0

Hackatón online de lablab.ai con IBM, del 25 al 27 de septiembre de 2026.
Equipo: **Cande** (@candepilar) y **Franco** (@francoledesma12-bit).
Cada uno trabaja con su propio Claude, en su propia computadora. Los dos Claude
no se ven entre sí: se comunican SOLO a través de este proyecto.

## Regla principal: el buzón

`BUZON.md` es el cuaderno de pase de turno entre los dos Claude (y entre Cande y Franco).

**Al empezar una sesión, siempre:**
1. Bajar lo último del proyecto (`git pull`).
2. Leer `BUZON.md` entero, empezando por la nota más reciente.
3. Si hay una pregunta dirigida a tu persona o a vos, contestarla ahí antes de seguir.
4. Contarle a tu persona, en dos o tres líneas, qué dejó el otro.

**Al terminar un trabajo (o antes de subir cambios), siempre:**
1. Agregar una nota nueva ARRIBA de todo en `BUZON.md`, con el formato de abajo.
2. Subir los cambios con una nota corta que diga qué cambió.
3. Recordarle a tu persona que avise al otro por WhatsApp si es algo importante.

Formato de cada nota:

```
## AAAA-MM-DD HH:MM — Claude de <Cande|Franco>
**Hice:** ...
**Quedó a medias:** ...
**No tocar:** (archivos o partes que estoy cambiando yo)
**Preguntas para el otro:** ...
```

Nunca borrar ni reescribir notas viejas del buzón: solo se agregan nuevas.

## Cómo trabajamos

- Antes de cambiar algo, fijarse en el buzón si el otro lo marcó como "No tocar".
- Si los cambios del otro chocan con los tuyos al bajar, NO pisarlos: avisar a tu
  persona y dejar la pregunta en el buzón.
- Las decisiones importantes (qué hacemos, cómo, qué herramientas) se anotan en la
  sección "Decisiones" de este archivo, para que los dos Claude las respeten.
- Nunca subir contraseñas, claves ni datos privados al proyecto.
- Revisar las reglas del concurso: puede ser obligatorio usar IBM Bob.

## Reparto de tareas

(a completar entre los dos)

- Cande: ...
- Franco: ...

## Decisiones

- **26/09 — Cande decide: la respuesta lleva al trámite, no a una página que habla de él.**
  Se hace **sin Bob**. Cuatro partes:
  1. **Dos destinos por trámite:** «Ver requisitos» lleva a la ficha del trámite
     (ej. `/inicio/pagar-tgi`) y «Hacer el trámite» al formulario que está adentro de la
     ficha (ej. `/inicio/node/1875`). En Rosario son dos niveles: la sección lista los
     trámites, cada uno lleva a su ficha, y la ficha tiene el botón del formulario.
  2. **Qué es un trámite: ⚠️ EN REVISIÓN, no construir sobre esto todavía.** La regla
     tiene que funcionar en cualquier sitio. La del verbo al principio del enlace no
     sirve en Villa Gobernador Gálvez (ver buzón, 26/09 17:54). ~~Un enlace cuyo texto
     empieza con un verbo de acción.~~ No se usa la forma del botón (`govuk-button` es
     de Rosario y no sirve en otros sitios).
  3. **Las fichas van primero en la fila:** cuando el recorrido encuentra un trámite, su
     ficha pasa adelante de todo. Mismo límite de páginas; se cubren menos secciones.
  4. **Qué le llega a la pantalla.** Si la respuesta es un trámite, además de lo de hoy:
     ```
     tramite: { nombre, requisitos, formulario, encontrado_en }
     ```
     `nombre` = título de la ficha (no el texto del botón, que se repite, ni el `title`
     que puso el sitio, que a veces está mal). `formulario` puede ser `null` si la ficha
     no se visitó antes del límite: entonces la pantalla muestra solo «Ver requisitos».
     Si la respuesta no es un trámite, no viene `tramite` y la pantalla queda como hoy.
  Quién hace qué: el motor lo hace la conversación **Utilidad** de Cande (toca
  `motor/src/crawler.mjs`, que es de Franco); la pantalla, la conversación **Frontend**.

- **26/09 — Cande decide el rol de Bob: revisión TÉCNICA de sitios web.** Bob no se
  ocupa de decisiones de producto ni de resumir contenido: revisa y mejora lo técnico
  (seguridad frente a ataques, velocidad/optimización y calidad del código) ~~y escribe
  el arreglo de cada problema~~ → **26/09, Franco: la revisión NO devuelve arreglos**,
  solo el diagnóstico (problema, gravedad, prueba textual y riesgo). **Accesibilidad queda descartada** (reemplaza la idea
  "Rampa" de `PLAN.md`). La revisión es **pasiva**: solo lo que ve cualquier visitante;
  nada de pruebas de ataque contra sitios ajenos. Pruebas de ataque reales, solo
  contra un sitio nuestro. Orden: seguridad (hecha el 26/09) → velocidad → código.

- **25/09 — Franco autoriza desplegar Wayfinder en una sección nueva del VPS de Andrómeda:**
  `https://andromedaweb.store/wayfinder/`. Se publica la copia integrada y probada,
  con frontend estático y motor dedicado. `visor/` original sigue reservado para Cande;
  el parche reproducible está en `motor/integracion/visor.patch`.

- **23/09 — Usamos IBM Bob 2.0 sí o sí.** La consigna lo exige. El prototipo se construye
  con Bob y tiene que usar sus funciones propias (modo agente, tareas en paralelo,
  subagentes, lectura de documentos). La consigna completa está en `CONCURSO.md`.
