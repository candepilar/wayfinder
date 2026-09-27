# Wayfinder con IBM Bob

Lo que Bob hace en este proyecto, con funciones propias de Bob:

| Qué | Dónde | Función de Bob |
| --- | --- | --- |
| Organiza el catálogo de un sitio en **tareas paralelas** con evidencia literal | `motor/src/catalogo.mjs` (Bob Shell) | tareas en paralelo |
| Anota cómo pide cada gestión un vecino (búsqueda instantánea sin llamar a Bob) | `motor/src/catalogo.mjs` | lectura de documentos |
| Conversa con el vecino y elige la ficha del catálogo | `motor/src/asistente.mjs` | modo ask |
| Coordina varios sitios a la vez | `.bob/custom_modes.yaml` → 🧭 Coordinador | modo propio + subtareas |
| Arma y audita un catálogo | 🗺️ Cartógrafo + skill `auditar-catalogo` | modo propio + skill + subagente explore |
| Revisión técnica pasiva | 🔎 Revisor técnico | modo propio + subagentes |
| Mide antes/después | skill `medir-impacto` | skill |

Reglas del proyecto para Bob: `.bob/rules/wayfinder.md`.

## Sesión de Bob IDE para el concurso (capturas en `bob_sessions/`)

1. Abrí la carpeta del repo en Bob IDE. Verificá que aparezcan los modos 🧭, 🗺️ y 🔎
   en el selector de modos y las skills `auditar-catalogo` y `medir-impacto`.
   **Captura 1:** selector de modos con los tres modos.
2. Modo 🧭 **Coordinador de catálogos**, pedido:
   > Armá y auditá en paralelo los catálogos de https://laeconomica.com.ar/ y
   > https://www.gov.uk/renew-driving-licence con 40 páginas cada uno.
   **Captura 2:** la lista de tareas con una subtarea 🗺️ por sitio corriendo a la vez.
3. **Captura 3:** la tabla final por sitio (fichas, accesos, consultas, tiempo, costo).
4. Modo 🔎 **Revisor técnico**, pedido:
   > Revisá motor/src/catalogo.mjs y motor/src/asistente.mjs.
   **Captura 4:** hallazgos con cita, severidad y riesgo (sin parches).
5. Exportá el resumen de cada tarea (task summary) a `bob_sessions/`.

No se fabrican capturas: si algo falla, capturá el error y anotalo en `BUZON.md`.
