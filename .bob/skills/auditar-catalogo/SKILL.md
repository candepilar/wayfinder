---
name: auditar-catalogo
description: Audita un catálogo de trámites de Wayfinder y devuelve números verificables (fichas, accesos directos, consultas cotidianas, descartes, tareas de Bob, tiempo y costo), o compara dos catálogos antes/después. Usar después de armar o actualizar un catálogo, o para el informe de impacto.
---

# Auditar un catálogo

1. Ubicá el catálogo: el mapa guardado en `motor/data/mapas/<id>.json` (lo imprime
   `catalogo-cli.mjs` como `id`) o un JSON descargado desde
   `/api/mapas/<id>/catalogo?descargar=1`.
2. Corré desde la raíz del repo:
   ```
   node .bob/skills/auditar-catalogo/auditar.mjs motor/data/mapas/<id>.json
   ```
   Para comparar dos versiones del mismo sitio:
   ```
   node .bob/skills/auditar-catalogo/auditar.mjs antes.json despues.json
   ```
   Con `--json` la salida es JSON.
3. Copiá la tabla tal cual. No redondees ni completes valores que el script muestra
   como «—»: significan que ese dato no se registró.
4. Si hay **alertas** (fuente inválida, destino sin https, consulta con enlace o
   correo), listalas primero: son bloqueantes para mostrar el catálogo.
5. Revisá a mano hasta 5 fichas: el nombre y los requisitos tienen que estar en la
   página de `fuente`. Esto comprueba procedencia, no vigencia.

## Cómo leer los números

- **Páginas omitidas por presupuesto**: páginas leídas que Bob no llegó a organizar.
- **Tareas de Bob (a la vez)**: cuántas tareas paralelas se usaron. Si alguna falló,
  el catálogo queda `parcial` y conserva las fichas de las demás.
- **Consultas cotidianas**: frases con las que un vecino pediría cada gestión. Son
  claves de búsqueda, no información del sitio.
