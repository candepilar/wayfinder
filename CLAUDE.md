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

- **25/09 — Franco autoriza desplegar Wayfinder en una sección nueva del VPS de Andrómeda:**
  `https://andromedaweb.store/wayfinder/`. Se publica la copia integrada y probada,
  con frontend estático y motor dedicado. `visor/` original sigue reservado para Cande;
  el parche reproducible está en `motor/integracion/visor.patch`.

- **23/09 — Usamos IBM Bob 2.0 sí o sí.** La consigna lo exige. El prototipo se construye
  con Bob y tiene que usar sus funciones propias (modo agente, tareas en paralelo,
  subagentes, lectura de documentos). La consigna completa está en `CONCURSO.md`.
