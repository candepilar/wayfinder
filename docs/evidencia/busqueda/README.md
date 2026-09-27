# Búsqueda instantánea de Wayfinder vs. BM25

**Qué se midió:** si la búsqueda instantánea de Wayfinder (la de la extensión y la
web: raíces de palabra sin palabras vacías, nombre ×3 y resto ×1, sin modelo y en el
navegador) encuentra el documento correcto, comparada con el BM25 que usó Astra
(`entrenamiento/BM25-DIAGNOSTICO.json`), con el **mismo filtro de jurisdicción**.

**Datos:** partición de **validación** de `entrenamiento/paquete-entrenamiento.zip`,
solo consultas y documentos en **español** (es→es): 92 consultas contra 3.512
documentos. El examen final (`test`) queda reservado y no se usó.

| Buscador | Acierta en el 1.º | Entre los 3 primeros |
| --- | --- | --- |
| BM25 (k1=1,2, b=0,75, título+descripción) | 66,3 % | 77,2 % |
| Búsqueda instantánea de Wayfinder | **69,6 %** | **80,4 %** |

Medido el 27/09/2026 con `evaluar.mjs` (reproducible, instrucciones en la primera línea).

**Límites (no ocultar):** 92 consultas es una muestra chica; son consultas
**sintéticas generadas por Bob** con segunda revisión de Bob, no de personas; no
mide consultas que cruzan idioma (ahí esta búsqueda no aplica) ni el aporte de las
«consultas cotidianas» que Bob anota en cada ficha del catálogo (estos documentos no
las tienen). Muestra que la búsqueda instantánea, sin modelo, está a la par de un
buscador clásico; no es una tasa de acierto garantizada.
