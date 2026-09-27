---
name: medir-impacto
description: Mide el antes/después de organizar un catálogo con Bob en una sola tarea contra tareas paralelas, sobre el mismo sitio, y deja la tabla como evidencia. Usar para obtener los números de impacto del pitch.
---

# Medir el impacto de las tareas paralelas de Bob

Requiere `motor/.env` con `BOB_ENTRY` y `BOB_API_KEY`. Cada tarea respeta
`BOB_MAX_COST`: el costo máximo de una corrida es tareas × `BOB_MAX_COST`.

1. Elegí un sitio con muchas páginas de trámites (ej. `https://laeconomica.com.ar/`).
2. **Antes** (una sola tarea con todo), desde `motor/`:
   ```powershell
   $env:BOB_LOTE=40; $env:BOB_PARALELO=1
   node --env-file-if-exists=.env src/catalogo-cli.mjs https://laeconomica.com.ar/ 40
   ```
   Copiá `data/mapas/<id>.json` a `../docs/evidencia/impacto/antes.json`.
3. **Después** (tareas paralelas, valores por defecto):
   ```powershell
   Remove-Item Env:BOB_LOTE, Env:BOB_PARALELO
   node --env-file-if-exists=.env src/catalogo-cli.mjs https://laeconomica.com.ar/ 40
   ```
   Copiá el mapa a `../docs/evidencia/impacto/despues.json`.
4. Desde la raíz: `node .bob/skills/auditar-catalogo/auditar.mjs docs/evidencia/impacto/antes.json docs/evidencia/impacto/despues.json`
5. Guardá la tabla en `docs/evidencia/impacto/README.md` con fecha, sitio y task IDs.
   Es **una** medición: no la presentes como promedio ni como garantía.
6. Dejá la nota en `BUZON.md`.
